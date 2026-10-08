'use strict';

// A collection placement date and its current balance do not identify the original
// debt. Match the owner-defined own member/account references, or an own account
// reference and two fixed debt dates. Ordinary matching stays in common-errors.cjs.
const { sourceForField, reportSnapshotKey } = require('./report-fact-sources.cjs');
const { calendar: { parseIso } } = require('../adapters/evaluation-primitives.cjs');

const COLLECTION_KINDS = new Set(['COLLECTION_ACCOUNT', 'GENERAL_COLLECTION']);
const COLLECTION_PAIR_BASIS = 'COLLECTION_REFERENCE_AND_FIXED_DATES';
const COLLECTION_MEMBER_PAIR_BASIS = 'COLLECTION_MEMBER_AND_ACCOUNT_REFERENCE';
const COLLECTION_PAIR_FIELDS = Object.freeze(['account.masked_identifier', 'account.reported_identity',
  'tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate']);
const COLLECTION_PAIR_FIELD_SETS = Object.freeze([COLLECTION_PAIR_FIELDS,
  Object.freeze(['account.masked_identifier', 'account.member_reference'])]);

function ownSource(record, field) {
  const direct = record.fact_sources && record.fact_sources[field];
  if (direct && direct.record_index != null && direct.record_index !== record.record_index) return null;
  return sourceForField(record, field);
}

function isCollection(record) { return Boolean(record && COLLECTION_KINDS.has(record.kind)); }

function collectionPair(record, other, expected) {
  if (!isCollection(record) || !isCollection(other) || record.record_index === other.record_index
    || record.source_bureau !== other.source_bureau) return null;
  for (const entry of [record, other]) {
    if (entry.kind === 'GENERAL_COLLECTION' && (!entry.location || entry.location.trusted === false
      || entry.fact_sources && Object.hasOwn(entry.fact_sources, 'collection.entryContext')
        && !ownSource(entry, 'collection.entryContext'))) return null;
  }
  const snapshot = reportSnapshotKey(record);
  if (snapshot === '|' || snapshot !== reportSnapshotKey(other)) return null;
  // A date shared by two uploaded reports is not proof that they are one report.
  for (const field of ['source_file_id', 'source_report_segment_id']) {
    if ((record[field] || other[field]) && record[field] !== other[field]) return null;
  }
  const same = (first, second) => first && second && String(first.normalized_value) === String(second.normalized_value);
  const mask = ownSource(record, 'account.masked_identifier'), otherMask = ownSource(other, 'account.masked_identifier');
  if (!same(mask, otherMask) || !String(mask.normalized_value).trim()) return null;
  const member = ownSource(record, 'account.member_reference'), otherMember = ownSource(other, 'account.member_reference');
  if (member && otherMember && !same(member, otherMember)) return null;
  const facts = record.facts || {}, strong = same(member, otherMember) && Boolean(String(member.normalized_value).trim());
  const sourceRows = (strong ? ['account.masked_identifier', 'account.member_reference'] : COLLECTION_PAIR_FIELDS)
    .map(field => ({ field, first: ownSource(record, field), second: ownSource(other, field) }));
  if (sourceRows.some(row => !same(row.first, row.second))) return null;
  if (!strong && !String(facts['account.reported_identity']).trim()) return null;
  if (!strong && (!parseIso(facts['tradeline.firstDelinquencyDate']) || !parseIso(facts['tradeline.lastPaymentDate']))) return null;
  // A separately printed original opening date can refute an otherwise matching
  // short account reference. Assignment dates are deliberately not this field.
  const opened = ownSource(record, 'liability.openedDate'), otherOpened = ownSource(other, 'liability.openedDate');
  if (!strong && opened && otherOpened && String(opened.normalized_value) !== String(otherOpened.normalized_value)) return null;
  const amountFor = entry => ownSource(entry, 'account.balance') || ownSource(entry, 'account.amount');
  const paidZero = entry => {
    const status = ownSource(entry, 'account.status'), balance = ownSource(entry, 'account.balance');
    return status && balance && /^(?:PAID|SETTLED)(?: IN FULL)?$/i.test(String(status.normalized_value))
      && Number(balance.normalized_value) === 0;
  };
  if (paidZero(record) && Number(amountFor(other)?.normalized_value) > 0
    || paidZero(other) && Number(amountFor(record)?.normalized_value) > 0) return null;
  const evidence = {
    pairing_basis: strong ? COLLECTION_MEMBER_PAIR_BASIS : COLLECTION_PAIR_BASIS,
    corroborated_identity: strong ? `${member.normalized_value}|${mask.normalized_value}`
      : `${facts['account.reported_identity']}|${mask.normalized_value}`,
    ...(!strong ? { first_delinquency: facts['tradeline.firstDelinquencyDate'], last_payment: facts['tradeline.lastPaymentDate'] } : {})
  };
  if (expected && (expected.pairing_basis !== evidence.pairing_basis
    || expected.corroborated_identity !== evidence.corroborated_identity
    || !strong && (expected.first_delinquency !== evidence.first_delinquency || expected.last_payment !== evidence.last_payment))) return null;
  const required = sourceRows.flatMap(row => [
    { field: row.field, source: row.first, record_index: record.record_index },
    { field: row.field, source: row.second, record_index: other.record_index }
  ]);
  // Retain each amount with its own meaning and source; differing amounts do not
  // erase the fixed-date match or get turned into a second balance allegation.
  for (const entry of [record, other]) {
    const balance = ownSource(entry, 'account.balance'), amount = amountFor(entry);
    if (amount) required.push({ field: balance ? 'account.balance' : 'account.amount', source: amount, record_index: entry.record_index });
    const assignment = ownSource(entry, 'collection.assignedDate');
    if (assignment) required.push({ field: 'collection.assignedDate', source: assignment, record_index: entry.record_index });
    for (const field of ['collection.agency', 'account.reported_identity', 'account.status', 'tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate']) {
      if (required.some(fact => fact.field === field && fact.record_index === entry.record_index)) continue;
      const source = ownSource(entry, field);
      if (source) required.push({ field, source, record_index: entry.record_index });
    }
  }
  for (const [entry, source] of [[record, opened], [other, otherOpened]]) {
    if (source) required.push({ field: 'liability.openedDate', source, record_index: entry.record_index });
  }
  return { evidence, required };
}

module.exports = { COLLECTION_PAIR_BASIS, COLLECTION_MEMBER_PAIR_BASIS, COLLECTION_PAIR_FIELDS,
  COLLECTION_PAIR_FIELD_SETS, isCollection, collectionPair };
