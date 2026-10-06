'use strict';

/**
 * OWNER-EVIDENCE-001 — Immutable Reported-Fact Policy (version 1.0)
 *
 * This module is the *enforced* form of the owner-authorized evidence policy.
 * It is NOT documentation or an AI prompt: the policy text and its integrity
 * digest live here, and every reported-fact acceptance decision in the general
 * intake flows through `acceptFact`, so an adapter cannot silently reject a
 * clearly established report fact merely because that fact describes a legal
 * event.
 *
 * Released versions are immutable. To change the policy, the owner must issue
 * an explicit amendment and a new version; this module preserves the released
 * versions and detects any alteration to a released version's stored text.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const POLICY_FILE = path.join(__dirname, 'reported-fact-policy.json');
const APPROVAL_FILE = path.join(__dirname, 'reported-fact-policy.approval.json');

function canonicalize(policy) {
  // Deterministic serialization: stable key order, exact text, no whitespace drift.
  const keys = [
    'policy_id',
    'version',
    'title',
    'text',
    'issued',
    'authority',
    'amendment_rule',
    'released_versions',
  ];
  const parts = [];
  for (const key of keys) {
    if (!(key in policy)) continue;
    const value = policy[key];
    if (Array.isArray(value)) {
      parts.push(`${key}:${value.join(',')}`);
    } else {
      parts.push(`${key}:${value}`);
    }
  }
  return parts.join('|');
}

function digestForPolicy(policy) {
  return crypto.createHash('sha256').update(canonicalize(policy), 'utf8').digest('hex');
}

/**
 * Compare a loaded policy against the owner's release approval record. A computed digest is not, by itself,
 * change prevention: the computed identity, version and digest must each equal the independently recorded
 * approved value, otherwise the policy is treated as unauthorized and the assessment refuses to run.
 */
function verifyApproval(policy, approved) {
  if (!approved || typeof approved !== 'object') {
    throw new Error('POLICY_APPROVAL_RECORD_MISSING: no owner-approved policy identity is recorded');
  }
  if (approved.policy_id !== policy.policy_id) {
    throw new Error(`POLICY_ID_MISMATCH: approved ${approved.policy_id}, loaded ${policy.policy_id}`);
  }
  if (approved.version !== policy.version) {
    throw new Error(`POLICY_VERSION_MISMATCH: approved ${approved.version}, loaded ${policy.version}`);
  }
  const digest = digestForPolicy(policy);
  if (approved.approved_digest !== digest) {
    throw new Error('POLICY_DIGEST_MISMATCH: the policy text changed without an owner-authorized amendment');
  }
  return { approved: true, digest };
}

function loadApproval() {
  if (!fs.existsSync(APPROVAL_FILE)) {
    throw new Error('POLICY_APPROVAL_RECORD_MISSING: no owner-approved policy identity is recorded');
  }
  return JSON.parse(fs.readFileSync(APPROVAL_FILE, 'utf8'));
}

function loadPolicy() {
  const policy = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
  const approved = loadApproval();
  const verification = verifyApproval(policy, approved);
  return {
    policy,
    approved,
    canonical: canonicalize(policy),
    digest: verification.digest,
  };
}

/**
 * Shared assessment interface for reported-fact acceptance.
 *
 * A fact is accepted as the bureau's reported fact for assessment only when it
 * is clearly labelled, readable, associated with the correct record, and free
 * of material contradiction. The fact that it describes a legal event (for
 * example a bankruptcy discharge date) is NOT a reason to reject it.
 *
 * @param {object} reading
 * @param {string} reading.label          Raw label exactly as printed (e.g. "Bankruptcy Discharged").
 * @param {string} reading.raw            Raw value exactly as printed.
 * @param {string} reading.normalized     Canonical value (e.g. an ISO date).
 * @param {boolean} reading.ambiguous     True when the value cannot be read unambiguously.
 * @param {boolean} reading.associated    True when the value belongs to the correct record.
 * @param {Array<{record:string,label:string,value:string}>} [reading.contradictions]
 * @returns {{accepted: boolean, reason: string|null, contradictions?: Array}}
 */
function acceptFact(reading) {
  if (!reading || typeof reading !== 'object') {
    return { accepted: false, reason: 'NO_READING' };
  }
  if (!reading.label || !String(reading.label).trim()) {
    return { accepted: false, reason: 'NOT_CLEARLY_LABELLED' };
  }
  if (!reading.raw || !String(reading.raw).trim()) {
    return { accepted: false, reason: 'UNREADABLE_VALUE' };
  }
  if (!reading.normalized || !String(reading.normalized).trim()) {
    return { accepted: false, reason: 'UNREADABLE_VALUE' };
  }
  if (reading.ambiguous === true) {
    return { accepted: false, reason: 'AMBIGUOUS' };
  }
  if (reading.associated !== true) {
    return { accepted: false, reason: 'NOT_ASSOCIATED_TO_THE_CORRECT_RECORD' };
  }
  if (Array.isArray(reading.contradictions) && reading.contradictions.length > 0) {
    return {
      accepted: false,
      reason: 'CONTRADICTORY',
      contradictions: reading.contradictions,
    };
  }
  // The policy's whole point: a clearly labelled legal-event fact is accepted.
  return { accepted: true, reason: null };
}

module.exports = {
  POLICY_FILE,
  APPROVAL_FILE,
  loadPolicy,
  loadApproval,
  verifyApproval,
  digestForPolicy,
  canonicalize,
  acceptFact,
};
