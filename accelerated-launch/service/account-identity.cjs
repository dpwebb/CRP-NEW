'use strict';

/* Existing owned-history identity contract; neither balance nor record index is identity. */
const MATCH = Object.freeze({ CONFIDENT: 'CONFIDENT', QUALIFIED: 'QUALIFIED', NONE: 'NONE' });

function factsOf(record) {
  return (record && record.facts) || {};
}

/* Supported identity evidence: the report-masked account identifier AND the printed creditor/account identity.
   Either alone is insufficient (masked trailing digits can collide), so a one-sided match is QUALIFIED. */
function normMask(value) {
  if (value == null) return null;
  const t = String(value).toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
  return t || null;
}

function normIdentity(value) {
  if (value == null) return null;
  const t = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  return t || null;
}

function identityEvidence(record) {
  const f = factsOf(record);
  return { mask: normMask(f['account.masked_identifier']), identity: normIdentity(f['account.reported_identity']) };
}

function recordBureau(record) {
  return (record && (record.bureau || record.source_bureau)) || null;
}

function recordReportDate(record) {
  const r = record && record.report_reference_date;
  if (!r) return null;
  return r.normalized_value || r.normalized || null;
}

/** Match one record in an earlier report to one record in a later report, using supported identity evidence only. */
function matchRecords(a, b) {
  if (!a || !b) return { state: MATCH.NONE, reason: 'MISSING_RECORD' };
  if (a.kind !== b.kind) return { state: MATCH.NONE, reason: 'DIFFERENT_RECORD_KIND', earlier_kind: a.kind_label || a.kind, later_kind: b.kind_label || b.kind };
  const ea = identityEvidence(a);
  const eb = identityEvidence(b);
  const crossBureau = Boolean(recordBureau(a) && recordBureau(b) && String(recordBureau(a)).toUpperCase() !== String(recordBureau(b)).toUpperCase());
  const evidence = { earlier_masked_identifier: factsOf(a)['account.masked_identifier'] || null, later_masked_identifier: factsOf(b)['account.masked_identifier'] || null, earlier_identity: factsOf(a)['account.reported_identity'] || null, later_identity: factsOf(b)['account.reported_identity'] || null };
  if (!ea.mask && !ea.identity) return { state: MATCH.NONE, reason: 'EARLIER_RECORD_HAS_NO_SUPPORTED_IDENTITY', cross_bureau: crossBureau, evidence };
  if (!eb.mask && !eb.identity) return { state: MATCH.NONE, reason: 'LATER_RECORD_HAS_NO_SUPPORTED_IDENTITY', cross_bureau: crossBureau, evidence };
  const maskMatch = Boolean(ea.mask && eb.mask && ea.mask === eb.mask);
  const identityMatch = Boolean(ea.identity && eb.identity && ea.identity === eb.identity);
  if (maskMatch && identityMatch) return { state: MATCH.CONFIDENT, reason: crossBureau ? 'MASK_AND_IDENTITY_MATCH_ACROSS_BUREAUS' : 'MASK_AND_IDENTITY_MATCH', cross_bureau: crossBureau, evidence };
  if (maskMatch || identityMatch) return { state: MATCH.QUALIFIED, reason: maskMatch ? 'MASKED_IDENTIFIER_MATCHES_ALONE' : 'CREDITOR_IDENTITY_MATCHES_ALONE', cross_bureau: crossBureau, evidence };
  return { state: MATCH.NONE, reason: 'NO_SUPPORTED_IDENTITY_OVERLAP', cross_bureau: crossBureau, evidence };
}

module.exports = { MATCH, matchRecords, recordBureau, identityEvidence };
