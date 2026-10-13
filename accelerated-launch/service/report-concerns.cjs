'use strict';

/* Completed, source-linked concerns authorized by the owner's report-review
 * direction. A review concern asks a bounded question about what the report
 * prints. It is never a failed-check diagnostic or a guessed statutory breach. */
const crypto = require('node:crypto');
const { sourceForField, reportReference, reportDateValue } = require('./report-fact-sources.cjs');
const { VERSION, SOURCES, LOCALITY_MAPPINGS } = require('./report-concern-sources.cjs');
const auReviews = require('./au-comparison-concerns.cjs');
const { supportsConsumerIssue, isRetiredDefault } = require('./consumer-issue-materiality.cjs');

const ADDRESS_CHECK = 'COMMON-ERROR-ADDRESS-GEOGRAPHIC-INCONSISTENCY';
const NON_VIOLATION_LABEL = 'NON-VIOLATION CONCERN';
const KINDS = Object.freeze(['ADDRESS_GEOGRAPHIC_INCONSISTENCY', 'PAID_CLAIM',
  'CLOSURE_DATE_REVIEW', 'UNDATED_PAYMENT_HISTORY', 'AU_TFN_HANDLING', 'AU_AMOUNT_CATEGORY_REVIEW', ...auReviews.KINDS]);
const CHECK_BY_KIND = Object.freeze({ ADDRESS_GEOGRAPHIC_INCONSISTENCY: ADDRESS_CHECK,
  PAID_CLAIM: 'COMMON-ERROR-PAID-CLAIM-STATUS-REVIEW',
  CLOSURE_DATE_REVIEW: 'COMMON-ERROR-CLOSURE-DATE-DISCLOSURE-REVIEW',
  UNDATED_PAYMENT_HISTORY: 'COMMON-ERROR-UNDATED-HISTORY-DISCLOSURE-REVIEW',
  AU_TFN_HANDLING: 'COMMON-ERROR-IDENTIFIER-HANDLING-REVIEW',
  AU_AMOUNT_CATEGORY_REVIEW: 'COMMON-ERROR-CREDIT-DATA-CATEGORY-REVIEW', ...auReviews.CHECK_BY_KIND });
const STATES = Object.freeze({ 'AUSTRALIAN CAPITAL TERRITORY': 'ACT', 'NEW SOUTH WALES': 'NSW',
  'NORTHERN TERRITORY': 'NT', QUEENSLAND: 'QLD', 'SOUTH AUSTRALIA': 'SA', TASMANIA: 'TAS',
  VICTORIA: 'VIC', 'WESTERN AUSTRALIA': 'WA' });
const REGION_CODES = Object.freeze({ AU: new Set(Object.values(STATES)),
  CA: new Set('AB BC MB NB NL NS NT NU ON PE QC SK YT'.split(' ')),
  US: new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ')) });
const clean = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const upper = (value) => clean(value).toUpperCase();
const digest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function trustedLocation(location) {
  if (!location || location.trusted !== true || !Number.isInteger(location.page) || location.page < 1) return false;
  const bounds = location.bbox && typeof location.bbox === 'object' ? location.bbox : location;
  const box = Array.isArray(location.bbox) ? location.bbox
    : [bounds.x0, bounds.y0, bounds.x1, bounds.y1];
  return box.length === 4 && box.every(Number.isFinite) && box[2] > box[0] && box[3] > box[1];
}

// Coordinates and file custody are useful evidence; a location's private raw
// line or word text is not needed in these issue descriptors.
function safeLocation(location) {
  const result = {};
  for (const key of ['page', 'line', 'section', 'source', 'source_kind', 'file_id',
    'trusted', 'confidence', 'min_confidence', 'x0', 'y0', 'x1', 'y1', 'bbox', 'url']) {
    if (location && location[key] !== undefined) result[key] = location[key];
  }
  return result;
}

function sameSourceFile(location, record) {
  return !(record?.source_file_id && location?.file_id && record.source_file_id !== location.file_id);
}

function snapshot(record, extraction) {
  const date = record ? reportReference(record) : null;
  const topDate = reportDateValue(extraction?.reference_date);
  const bureau = clean(record?.source_bureau || record?.bureau || extraction?.source_bureau || extraction?.bureau);
  const fileId = record?.source_file_id || extraction?.source_file_id || null;
  const referenceDate = date?.normalized_value || (!record ? topDate : null);
  const segment = record?.source_report_segment_id || record?.report_segment_id || null;
  // A report date or a file/segment custody identity binds this concern to the
  // reviewed report; jurisdiction and the creditor's name alone do not.
  if (!bureau || !referenceDate && !fileId && !segment) return null;
  return { bureau, reference_date: referenceDate, file_id: fileId, segment_id: segment };
}

function ownSource(record, field) {
  const source = sourceForField(record, field);
  const direct = record?.fact_sources?.[field];
  if (!source || !trustedLocation(source.location) || !sameSourceFile(source.location, record)
    || direct && direct.trusted !== true
    || direct?.record_index != null && direct.record_index !== record.record_index
    || source.record_index !== record.record_index
    || direct && typeof record.facts?.[field] === 'object'
      && digest(direct.normalized_value) !== digest(record.facts[field])
    || ['account.reportRemarks', 'account.closureStatement'].includes(field)
      && clean(source.raw_value) !== clean(source.normalized_value)) return null;
  return { field, source_field: source.source_field, raw_value: source.raw_value,
    normalized_value: source.normalized_value, record_index: record.record_index,
    trusted: true, location: safeLocation(source.location),
    ...(source.privacy_redacted ? { privacy_redacted: true } : {}) };
}

function ownAccount(record, extraction) {
  if (!record || !Number.isInteger(record.record_index)
    || !['RESOLVED'].includes(record.shared_facts_status || record.status)) return null;
  const identity = ownSource(record, 'account.reported_identity');
  const report = snapshot(record, extraction);
  return identity && report ? { identity, report } : null;
}

function coverage(record) {
  const row = record?.table_row_coverage;
  return row?.complete === true && typeof row.row_id === 'string' && row.row_id
    && ['ACCOUNT_SUMMARY', 'COLLECTIONS'].includes(row.section)
    && trustedLocation(row.location) && sameSourceFile(row.location, record) ? row : null;
}

function concernFingerprint(issue) {
  return digest({ kind: issue.concern_kind, classification: issue.classification,
    confidence: issue.confidence, explanation: issue.explanation, uncertainty: issue.uncertainty,
    request_wording: issue.request_wording,
    check_id: issue.check_id || null, record_index: issue.record_index,
    report: issue.report_identity, evidence: issue.evidence,
    sources: (issue.source_facts || []).filter((fact) => fact.supporting_evidence !== true),
    source_version: issue.source_version, request_type: issue.request_type });
}

function groupAustralianAddresses(issues) {
  const grouped=new Map(),others=[];
  for(const issue of issues) {
    if(issue.concern_kind!=='ADDRESS_GEOGRAPHIC_INCONSISTENCY'||issue.evidence.country!=='AU') {others.push(issue);continue;}
    const key=digest(issue.report_identity);
    if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(issue);
  }
  for(const entries of grouped.values()) {
    if(entries.length===1){others.push(entries[0]);continue;}
    const issue=JSON.parse(JSON.stringify(entries[0]));
    issue.source_facts=entries.flatMap(entry=>entry.source_facts);
    issue.evidence={country:'AU',addresses:entries.map(entry=>entry.evidence),postcode_only_determination:false};
    issue.explanation='These printed address details do not match: '+entries.map(entry=>`${entry.evidence.locality} is shown in ${entry.evidence.reported_state}; the supported locality mapping places it in ${entry.evidence.expected_state}`).join('. ')+'.';
    issue.request_wording='please verify the locality, state and postcode for each listed address and correct any inaccurate location details';
    issue.rule_assessment.required_facts=issue.source_facts.map(source=>({field:source.field,source}));
    const fingerprint=concernFingerprint(issue);issue.issue_id=digest(['report-concern',issue.concern_kind,fingerprint]).slice(0,16);
    issue.concern_assessment.fingerprint=fingerprint;issue.eligible=isGovernedIssue(issue);others.push(issue);
  }
  return others;
}

function finish({ kind, record, report, sources, title, explanation, uncertainty,
  request, evidence, contextSources = [], violation = false }) {
  const sourceFacts = sources.map((source) => ({ ...source }));
  const issue = {
    report_concern: true, concern_kind: kind, title,
    non_violation: !violation,
    confidence: violation ? 'PROBABLE' : 'POTENTIAL',
    classification: violation ? 'PROBABLE_VIOLATION' : 'NON_VIOLATION',
    check_id: CHECK_BY_KIND[kind],
    basis_type: violation ? 'FACTUAL_CONSISTENCY' : 'REPORT_CONCERN',
    consumer_label: violation ? 'VIOLATION' : NON_VIOLATION_LABEL,
    request_type: 'VERIFICATION', request_wording: request,
    explanation, uncertainty, source_version: VERSION,
    concern_sources: contextSources,
    record_index: record?.record_index ?? null,
    record: record ? { kind: record.kind, kind_label: record.kind_label || 'account',
      record_index: record.record_index } : { kind: 'REPORT_PERSONAL_DETAILS', kind_label: 'personal details' },
    report_identity: report,
    account_identity: record ? { name: clean(record.facts?.['account.reported_identity']),
      raw_value: clean(record.facts?.['account.reported_identity']), source_field: 'Creditor',
      location: sourceFacts.find((fact) => fact.field === 'account.reported_identity')?.location || null } : null,
    location: sourceFacts[0]?.location || null,
    source_facts: sourceFacts, evidence
  };
  if (violation) {
    issue.check_id = ADDRESS_CHECK;
    issue.label = 'Address details do not match';
    issue.rule_assessment = { classification: issue.classification, rule_id: ADDRESS_CHECK,
      requirement: 'A reported locality and state or province must identify a consistent location within the mapped country.',
      jurisdiction: report.jurisdiction, supporting_statutes: [],
      source_version: VERSION, required_facts: sourceFacts.map((source) => ({ field: source.field,
        source: { ...source } })),
      unresolved: uncertainty };
  }
  const fingerprint = concernFingerprint(issue);
  issue.issue_id = digest(['report-concern', kind, fingerprint]).slice(0, 16);
  issue.concern_assessment = { schema_version: 1, source_version: VERSION,
    kind, fingerprint, assessment_basis: violation ? 'SOURCE_LINKED_REPORT_DATA_RULE' : 'COMPLETED_SOURCE_LINKED_REVIEW' };
  issue.eligible = isGovernedIssue(issue);
  return issue;
}

/* A persisted descriptor must retain its governed kind, its original trusted
 * report association and its decisive evidence. A confidence flag or manually
 * invented REPORT_CONCERN object is never enough to enable correspondence. */
function isGovernedIssue(issue) {
  if (!supportsConsumerIssue(issue)) return false;
  if (issue?.au_comparison_concern === true) return auReviews.isGovernedIssue(issue);
  if (!issue || issue.report_concern !== true || !KINDS.includes(issue.concern_kind)
    || issue.source_version !== VERSION || issue.request_type !== 'VERIFICATION'
    || !issue.request_wording || !issue.report_identity?.bureau
    || !issue.report_identity.reference_date && !issue.report_identity.file_id && !issue.report_identity.segment_id
    || issue.concern_assessment?.schema_version !== 1 || issue.concern_assessment.kind !== issue.concern_kind
    || issue.concern_assessment.source_version !== VERSION || !Array.isArray(issue.source_facts)
    || !issue.source_facts.length) return false;
  const geographic = issue.concern_kind === 'ADDRESS_GEOGRAPHIC_INCONSISTENCY';
  if (issue.check_id !== CHECK_BY_KIND[issue.concern_kind]) return false;
  if (geographic ? issue.basis_type !== 'FACTUAL_CONSISTENCY' || issue.check_id !== ADDRESS_CHECK
    || issue.classification !== 'PROBABLE_VIOLATION' || issue.rule_assessment?.rule_id !== ADDRESS_CHECK
    : issue.basis_type !== 'REPORT_CONCERN' || issue.classification !== 'NON_VIOLATION'
      || issue.non_violation !== true || issue.rule_assessment) return false;
  const decisive = issue.source_facts.filter((fact) => fact.supporting_evidence !== true);
  if (decisive.some((fact) => {
    if (fact.trusted !== true || fact.raw_value == null || !fact.source_field) return true;
    if (fact.location?.source_kind === 'AUTHORITATIVE_LOCALITY_MAPPING') return !fact.location.url || !geographic;
    return !trustedLocation(fact.location)
      || Boolean(issue.report_identity.file_id && fact.location.file_id && issue.report_identity.file_id !== fact.location.file_id)
      || issue.record_index != null && fact.record_index !== issue.record_index;
  })) return false;
  const fingerprint = concernFingerprint(issue);
  return fingerprint === issue.concern_assessment.fingerprint
    && issue.issue_id === digest(['report-concern', issue.concern_kind, fingerprint]).slice(0, 16);
}

function consumerPaidClaim(value) {
  const text = clean(value);
  // Preserve who made the statement. Creditor "paid" wording belongs to the
  // existing paid-status violation predicate, not this consumer-claim path.
  const attribution = /\bconsumer\s+(?:states|says|reports|claims|advises|asserts)\b/i.exec(text);
  if (!attribution) return false;
  const claim = text.slice(attribution.index + attribution[0].length);
  if (/\b(?:not|never|unpaid|part(?:ly|ially)?|partial|instalments?|installments?|payment plan|minimum|interest|fee)\b/i.test(claim)
    || /paid\s+as\s+agreed|paid\s+on\s+time/i.test(claim)) return false;
  if (/\b(?:will|would|may|might|could|should|can|expects?|expected|plans?|planned|intends?|promises?|scheduled)\b(?:\s+\w+){0,6}\s+(?:paid|settled)\b/i.test(claim)
    || /\b(?:if|when|unless)\b(?:\s+\w+){0,12}\s+(?:paid|settled)\b/i.test(claim)) return false;
  return /\b(?:paid(?:\s+in\s+full)?|settled\s+in\s+full|fully\s+settled)\b/i.test(claim);
}

function paidClaim(record, account) {
  const remark = ownSource(record, 'account.reportRemarks');
  const balance = ownSource(record, 'account.balance');
  const status = ownSource(record, 'account.status');
  if (!remark || !consumerPaidClaim(remark.normalized_value) || !balance
    || typeof balance.normalized_value !== 'number' || balance.normalized_value <= 0 || !status
    || /original|historical|default.*amount/i.test(String(balance.source_field))
    || !['OPEN', 'CLOSED', 'OUTSTANDING', 'UNPAID', 'IN COLLECTION', 'PAST DUE', 'DELINQUENT', 'CHARGED OFF', 'WRITTEN OFF'].includes(upper(status.normalized_value))) return null;
  return finish({ kind: 'PAID_CLAIM', record, report: account.report,
    sources: [remark, status, balance, account.identity], title: 'Payment status needs checking',
    explanation: `The report records a claim that the debt was paid, but shows ${clean(status.raw_value)} and a balance of ${clean(balance.raw_value)}.`,
    uncertainty: 'The consumer statement is a payment claim. The report does not establish that payment cleared or that a settlement discharged the balance. A valid historical default may remain after payment.',
    request: 'please check the consumer payment statement against the payment or settlement records, confirm whether any amount remains due, and update any inaccurate payment status or balance. Please preserve any valid historical information',
    evidence: { claim_attribution: 'CONSUMER', statement: remark.normalized_value,
      status: status.normalized_value, balance: balance.normalized_value } });
}

function closureReview(record, account) {
  const row = coverage(record);
  const statement = ownSource(record, 'account.closureStatement');
  if (!row || row.field_presence?.closed_date !== false || !statement
    || /\b(?:not|never|may|might|will|pending)\s+(?:be\s+)?(?:closed|cancelled|canceled)\b/i.test(String(statement.normalized_value))
    || !/\b(?:closed|cancelled|canceled)\b/i.test(String(statement.normalized_value))
    || ['liability.closedDate', 'reportedAccount.closedDate', 'tradeline.closedDate'].some((field) => record.facts?.[field] != null)
    || record.printed?.['Closed Date']?.state === 'LABEL_PRINTED_WITHOUT_VALUE') return null;
  const omission = { field: 'account.closedDatePresence', source_field: 'Account table columns',
    raw_value: 'No closing-date column in this complete account row', normalized_value: false,
    record_index: record.record_index, trusted: true, location: safeLocation(row.location) };
  return finish({ kind: 'CLOSURE_DATE_REVIEW', record, report: account.report,
    sources: [statement, omission, account.identity], title: 'Closing date needs checking',
    explanation: 'The report says this account was closed, but its account table gives no closing date.',
    uncertainty: 'This report does not establish when the closure occurred or that a reporting deadline was missed. The account may have been closed recently.',
    request: 'please confirm the closing date for this account and whether the date should be included or corrected in my report',
    evidence: { closure_statement: statement.normalized_value, complete_row: true, closed_date_column_printed: false } });
}

const historyToken = (value) => upper(value).replace(/\s/g, '');

function usableHistorySource(record) {
  const source = ownSource(record, 'account.undatedPaymentHistory'), value = source?.normalized_value;
  if (!value || typeof value.periods_printed !== 'boolean' || !Array.isArray(value.tokens) || !value.tokens.length
    || value.tokens.length > 120 || value.count !== value.tokens.length
    || value.tokens.some((token) => !/^[A-Z0-9*#.-]{1,8}$/.test(historyToken(token)))) return null;
  return source;
}

function undatedHistory(record, account, country) {
  const source = usableHistorySource(record), value = source?.normalized_value;
  if (!value || value.periods_printed !== false
    // Owner direction: undated histories made entirely of OK codes are benign.
    // Normalize only for this comparison; keep the original source tokens.
    || value.tokens.every((token) => historyToken(token) === 'OK')
    || (record.facts?.['account.paymentHistoryCells'] || []).some((cell) => cell?.period)) return null;
  const nonOkTokens = value.tokens.filter((token) => historyToken(token) !== 'OK');
  return finish({ kind: 'UNDATED_PAYMENT_HISTORY', record, report: account.report,
    sources: [source, account.identity], title: 'Payment history dates need checking',
    explanation: `The report shows ${nonOkTokens.length} non-OK payment-history ${nonOkTokens.length === 1 ? 'code' : 'codes'} for this account without month or year labels.${value.legend_printed === false ? ' It also gives no key explaining these codes.' : ''}`,
    uncertainty: 'The codes have not been interpreted as payments or missed payments. The report does not establish which months they describe or that a disclosure rule was breached.',
    request: 'please identify the month and year for the non-OK payment-history entries and explain their codes, correcting any incomplete or inaccurate information',
    evidence: { count: value.count, tokens: value.tokens.slice(), non_ok_count: nonOkTokens.length,
      review_tokens: nonOkTokens, periods_printed: false,
      legend_printed: value.legend_printed === true }, contextSources: country === 'AU' ? [SOURCES.AU_ACCESS] : [] });
}

function amountCategory(record, account, country) {
  if (country !== 'AU' || !account.report.reference_date
    || account.report.reference_date < SOURCES.AU_CREDIT_CATEGORIES.effective_from
    || coverage(record)?.section !== 'ACCOUNT_SUMMARY'
    || /COLLECTION|OVERDUE|DEFAULT|PUBLIC_RECORD/.test(String(record.kind))) return null;
  const amounts = ['account.balance', 'account.paymentAmount'].map((field) => ownSource(record, field))
    .filter((source) => source && typeof source.normalized_value === 'number' && source.normalized_value >= 0);
  if (!amounts.length) return null;
  return finish({ kind: 'AU_AMOUNT_CATEGORY_REVIEW', record, report: account.report,
    sources: [...amounts, account.identity], title: 'Reported money amounts need checking',
    explanation: `This report lists ${amounts.map((source) => `${clean(source.source_field)} (${clean(source.raw_value)})`).join(' and ')} for this account. Please check what these amounts mean.`,
    uncertainty: 'The report may show the permitted maximum-credit amount rather than money currently owed. The figures alone do not establish that prohibited information was collected or disclosed.',
    request: 'please explain what each amount represents. Check whether it is allowed in this credit report, and correct or remove any wrong information',
    evidence: { review_fields: amounts.map((source) => source.field), permitted_category_unresolved: true,
      regulations_effective_from: SOURCES.AU_CREDIT_CATEGORIES.effective_from }, contextSources: [SOURCES.AU_CREDIT_CATEGORIES] });
}

function topEvidence(item, extraction) {
  if (item?.trusted !== true || !trustedLocation(item.location)
    || !sameSourceFile(item.location, { source_file_id: item.source_file_id || extraction?.source_file_id })) return null;
  const report = snapshot({ source_bureau: item.source_bureau || extraction?.source_bureau || extraction?.bureau,
    source_file_id: item.source_file_id || item.location?.file_id || extraction?.source_file_id,
    report_segment_id: item.report_segment_id,
    report_reference_date: item.report_reference_date || extraction?.reference_date }, extraction);
  return report ? { report, location: safeLocation(item.location) } : null;
}

function addressResult(item, extraction, evaluation) {
  if (!LOCALITY_MAPPINGS[evaluation.country] || item.kind !== 'ADDRESS_COMPONENTS'
    || !['CURRENT', 'PREVIOUS', 'HISTORICAL'].includes(item.role)
    || item.postal_exception === true || item.components?.postal_exception === true
    || item.components?.country && item.components.country !== evaluation.country) return null;
  const bound = topEvidence(item, extraction);
  const locality = upper(item.components?.locality), rawState = upper(item.components?.state);
  const state = evaluation.country === 'AU' ? STATES[rawState] || rawState : rawState;
  const printedCode = clean(item.components?.postcode), normalizedCode = upper(printedCode).replace(/\s/g, '');
  const mapping = LOCALITY_MAPPINGS[evaluation.country].find((entry) => entry.locality === locality
    && (!entry.postcode || entry.postcode === normalizedCode));
  if (!bound || !mapping || !REGION_CODES[evaluation.country].has(state)) return null;
  if (mapping.state === state) return { performed: true, issue: null };
  const postcode = printedCode || null;
  const raw = item.raw_value;
  const componentReading = [item.components.locality, item.components.state, postcode].filter(Boolean).join(' ');
  const geographicalTokens = (value) => upper(value).replace(/[^A-Z0-9]/g, '');
  // The reader supplies a privacy-minimized component reading. Reject a source
  // containing extra street/name/identifier text rather than displaying it.
  if (typeof raw !== 'string' || geographicalTokens(raw) !== geographicalTokens(componentReading)) return null;
  const source = { field: 'report.addressLocalityState', source_field: item.source_field || 'Address locality and state',
    raw_value: raw, normalized_value: { locality, state, postcode }, trusted: true, location: bound.location,
    privacy_minimized: true, record_index: null };
  const requirement = { field: 'address.authoritativeLocalityState', source_field: mapping.source.title,
    raw_value: `${locality} ${mapping.state}`, normalized_value: mapping.state, trusted: true, record_index: null,
    location: { source_kind: 'AUTHORITATIVE_LOCALITY_MAPPING', url: mapping.source.url, section: mapping.source.title,
      trusted: true } };
  return { performed: true, issue: finish({ kind: 'ADDRESS_GEOGRAPHIC_INCONSISTENCY',
    report: { ...bound.report, jurisdiction: evaluation.region }, sources: [source, requirement],
    title: 'Address details do not match',
    explanation: `The report places ${locality} in ${state}. ${mapping.source.publisher} identifies this ${mapping.postcode ? 'locality and postal-code pair' : 'locality'} in ${mapping.state}.`,
    uncertainty: 'This is a mismatch in the printed location details. Postal-address exceptions or a different locality spelling may need checking; the finding does not establish a breach of a privacy statute.',
    request: 'please verify the locality, state and postcode for this address and correct the location details if inaccurate',
    evidence: { locality, reported_state: state, expected_state: mapping.state, postcode, country: evaluation.country,
      address_role: item.role, postcode_only_determination: false }, contextSources: [mapping.source], violation: true }) };
}

function tfnReview(item, extraction, evaluation) {
  if (evaluation.country !== 'AU' || item.kind !== 'IDENTIFIER_FIELD' || item.identifier_type !== 'TFN'
    || typeof item.masked !== 'boolean' || !/^(?:tax\s+file\s+number|TFN)$/i.test(clean(item.source_field))) return null;
  const bound = topEvidence(item, extraction);
  if (!bound) return null;
  if (item.raw_value !== (item.masked ? 'Tax file number shown (masked)' : 'Tax file number shown (unmasked)')) return null;
  const source = { field: 'report.maskedTfnPresence', source_field: item.source_field,
    raw_value: item.raw_value, normalized_value: item.masked ? 'MASKED_TFN_PRESENT' : 'UNMASKED_TFN_PRESENT',
    trusted: true, record_index: null, location: bound.location };
  return finish({ kind: 'AU_TFN_HANDLING', report: bound.report, sources: [source],
    title: 'Tax file number information needs review',
    explanation: `The identification section of this credit report includes ${item.masked ? 'a masked' : 'an unmasked'} tax file number field.`,
    uncertainty: item.masked ? 'A masked field does not establish that a full tax file number was collected, used or disclosed unlawfully. Returning tax file number information to its owner is permitted.'
      : 'The number is omitted from this concern to protect your privacy. Its presence does not establish unlawful handling; returning tax file number information to its owner is permitted.',
    request: 'please explain what tax file number information is held, its source and permitted purpose, and remove or correct any information that should not be held or used for this credit report',
    evidence: { identifier_type: 'TFN', masked: item.masked, unlawful_handling_established: false }, contextSources: [SOURCES.AU_TFN] });
}

function review(extraction, evaluation) {
  const issues = [], address = [], performed = new Map();
  if (!extraction || !evaluation || !['AU', 'CA', 'US', 'GB'].includes(evaluation.country)
    || !String(evaluation.region || '').startsWith(evaluation.country + '-')
    || extraction.support !== 'ACTUAL_REPORT_EVIDENCE') return { issues, address, performed: [] };
  const mark = (kind, issue, ready) => {
    if (isRetiredDefault(kind)) return;
    if (issue && !supportsConsumerIssue(issue)) return;
    if (!issue && !ready) return;
    const checkId = CHECK_BY_KIND[kind], prior = performed.get(checkId);
    const row = prior || { check_id: checkId,
      action_type: kind === 'ADDRESS_GEOGRAPHIC_INCONSISTENCY' ? 'VIOLATION_ASSESSMENT' : 'NON_VIOLATION_REVIEW',
      state: 'NOT_DETECTED', source_records: [] };
    if (issue) {
      row.state = kind === 'ADDRESS_GEOGRAPHIC_INCONSISTENCY' ? 'POTENTIAL_ISSUE' : 'SUPPORTED_REVIEW_CONCERN';
      row.source_records.push({ record_index: issue.record_index, location: issue.location, evidence: issue.evidence });
      issues.push(issue);
    }
    performed.set(checkId, row);
  };
  for (const record of extraction.records || []) {
    const account = ownAccount(record, extraction);
    if (!account) continue;
    mark('PAID_CLAIM', paidClaim(record, account), Boolean(ownSource(record, 'account.reportRemarks')
      && ownSource(record, 'account.status') && ownSource(record, 'account.balance')));
    mark('CLOSURE_DATE_REVIEW', closureReview(record, account), Boolean(coverage(record)
      && ownSource(record, 'account.closureStatement') && typeof coverage(record).field_presence?.closed_date === 'boolean'));
    mark('UNDATED_PAYMENT_HISTORY', undatedHistory(record, account, evaluation.country),
      Boolean(usableHistorySource(record)
        || (record.facts?.['account.paymentHistoryCells'] || []).some((cell) => cell?.period && trustedLocation(cell.location))));
    const category = amountCategory(record, account, evaluation.country);
    mark('AU_AMOUNT_CATEGORY_REVIEW', category, false);
  }
  for (const item of extraction.report_concern_evidence || []) {
    const result = addressResult(item, extraction, evaluation);
    if (result) { address.push(result); mark('ADDRESS_GEOGRAPHIC_INCONSISTENCY', result.issue, true); }
    const tfn = tfnReview(item, extraction, evaluation);
    mark('AU_TFN_HANDLING', tfn, false);
  }
  for (const issue of auReviews.concernsFor(extraction,evaluation)) mark(issue.concern_kind,issue,false);
  return { issues: groupAustralianAddresses([...new Map(issues.map((issue) => [issue.issue_id, issue])).values()]),
    address, performed: [...performed.values()] };
}

function concernsFor(extraction, evaluation) { return review(extraction, evaluation).issues; }
function measure(extraction, evaluation) {
  const checked = review(extraction, evaluation);
  return { version: VERSION, performed: checked.performed, issues: checked.issues,
    completed_review_concerns: checked.issues.filter((issue) => issue.non_violation).length };
}

module.exports = { VERSION, ADDRESS_CHECK, CHECK_BY_KIND, KINDS, NON_VIOLATION_LABEL,
  concernsFor, measure, isGovernedIssue, trustedLocation, consumerPaidClaim };
