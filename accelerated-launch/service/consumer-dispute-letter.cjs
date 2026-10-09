'use strict';

// One consumer-approved set of facts supplies the letter and the original bureau forms.
// These are requests to check report information, never invented personal experiences.
const { sourceForField } = require('./report-fact-sources.cjs');
const accountDisplay = require('./account-display.cjs');
const VERSION = 'consumer-business-letter-2';

function dateLabel(value) {
  if (/^\d{4}-\d{2}$/.test(String(value || ''))) {
    const date = new Date(value + '-01T00:00:00Z');
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : value;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return String(value || '');
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  }) : value;
}
function sentence(value) {
  const text = String(value || '').trim().replace(/^please\b/, 'Please')
    .replace(/Your report contains an entry older than the ordinary reporting period for this rule/gi,
      'This entry is past the usual credit-report time limit')
    .replace(/more than (\d+) years have passed since the date this rule measures from on [^.)]+/gi,
      'more than $1 years have passed since the starting date shown below')
    .replace(/Whether a recorded exception to that period applies cannot be determined from your report/gi,
      'The report does not say whether an exception allows it to stay on my report')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, dateLabel)
    .replace(/\bverify\b/g, 'check').replace(/\brectify\b/g, 'correct')
    .replace(/correct the inconsistency/g, 'correct anything that is wrong')
    .replace(/the recorded retention period/g, 'the credit-report time limit')
    .replace(/the recorded rule/g, 'the reporting rule');
  return text ? text[0].toUpperCase() + text.slice(1) + (/[.!?]$/.test(text) ? '' : '.') : '';
}
function readingsFor(issue) {
  const facts = [...(issue.source_facts || []), ...(issue.source ? [{ ...issue.source, field: issue.anchor_field }] : [])];
  return facts.filter(fact => !fact.privacy_redacted && fact.location && fact.raw_value != null);
}
function printedReading(issue, fields) {
  return readingsFor(issue).find(fact => fields.includes(fact.field));
}
function dateReading(value, fact) {
  const normalized = fact?.normalized_value || value;
  const raw = fact?.raw_value;
  return dateLabel(normalized) + (typeof raw === 'string' && raw !== normalized
    && /[A-Za-z]/.test(raw.replace(/January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec/gi, ''))
    ? ` (printed as "${raw}")` : '');
}
function requestFor(issue) {
  // A consolidated finding may lead with its statutory support. Its accepted checklist
  // basis still supplies the concrete report problem for the consumer's letter.
  const checklistBasis = !issue.check_id ? (issue.supported_bases || []).find(basis => basis.check_id?.startsWith('COMMON-ERROR-')) : null;
  const checkId = issue.check_id || checklistBasis?.check_id;
  const e = issue.evidence || checklistBasis?.evidence || {};
  const readings = readingsFor(issue);
  const closure = readings.find(fact => fact.source_field === 'Notes');
  const historyReadings = e.first_code != null && e.second_code != null && e.first_meaning && e.second_meaning
    ? ` One entry is "${e.first_code}" (${e.first_meaning}); the other is "${e.second_code}" (${e.second_meaning}).` : '';
  const periodBasis = readings.find(fact => /period to/i.test(fact.source_field || '') && /^\d{4}-\d{2}-\d{2}$/.test(String(fact.normalized_value || '')));
  const publishedOrder = (issue.source_facts || []).some(fact => fact.period_definition);
  const observations = {
    'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY': e.opened && e.closed
      ? `My report shows this account opened on ${dateReading(e.opened, printedReading(issue, ['liability.openedDate', 'reportedAccount.dateOpened']))} and closed on ${dateReading(e.closed, printedReading(issue, ['liability.closedDate']))}. The opening date comes after the closing date.` : '',
    'COMMON-ERROR-STATUS-DATE-CONTRADICTION': `My report says this account is open, but it also shows a closing date${e.closed ? ' of ' + dateLabel(e.closed) : ''}.`,
    'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': e.balance != null && e.past_due != null
      ? `My report shows a balance of ${printedReading(issue, ['account.balance'])?.raw_value || e.balance} and an overdue amount of ${printedReading(issue, ['account.pastDueAmount'])?.raw_value || e.past_due}. The overdue amount is larger than the balance.` : '',
    'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT': `My report shows ${printedReading(issue, ['account.balance'])?.raw_value || 'money'} owed on this credit card or line of credit, but its credit limit is listed as ${printedReading(issue, ['account.creditLimit'])?.raw_value || 'zero'}.`,
    'COMMON-ERROR-DUPLICATE-REPORTING': 'These entries have matching account details and appear to list the same debt twice.',
    'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY': 'My report gives different details about who is responsible for the same account.',
    'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY': e.period
      ? `My report shows two different payment-history entries for ${dateLabel(e.period)}.${historyReadings}${publishedOrder ? ` I used ${periodBasis ? 'the report\'s "' + periodBasis.source_field + '" date (' + dateLabel(periodBasis.normalized_value) + ') and ' : ''}the bureau's published order: the most recent month comes first, with one month for each entry.` : ''}` : 'My report shows conflicting payment-history entries for the same period.',
    'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR': 'The space for the first missed-payment date is blank on this entry.',
    'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE': 'This debt is marked as a loss, but the space for that date is blank.',
    'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE': closure
      ? `My report says "${closure.raw_value}". The space for the closing date is blank.`
      : 'This account is marked closed or cancelled, but the space for the closing date is blank.',
    'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE': 'The original account and its collection both show money owed.',
    'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE': e.value && (e.report_date || e.opened)
      ? `My report lists the ${e.field === 'first_delinquency' ? 'first missed-payment' : 'last-payment'} date as ${dateReading(e.value, printedReading(issue, [e.field === 'first_delinquency' ? 'tradeline.firstDelinquencyDate' : 'tradeline.lastPaymentDate']))}. That is ${e.report_date ? 'after the report date of ' + dateLabel(e.report_date) : 'before the account opened on ' + dateLabel(e.opened)}.` : '',
    'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL': e.earlier_anchor && e.current_anchor
      ? `The first missed-payment date changed from ${dateLabel(e.earlier_anchor)} on my earlier report${e.earlier_report_date ? ' dated ' + dateLabel(e.earlier_report_date) : ''} to ${dateLabel(e.current_anchor)} on this report${e.current_report_date ? ' dated ' + dateLabel(e.current_report_date) : ''}.` : ''
  };
  const observation = observations[checkId] || sentence(issue.explanation);
  const anchorFact = issue.source || readings.find(fact => fact.normalized_value === e.anchor_normalized_value)
    || (issue.retention_review ? readings.find(fact => /^\d{4}-\d{2}-\d{2}$/.test(String(fact.normalized_value || ''))) : null);
  const anchor = !observations[checkId] && anchorFact?.raw_value != null && anchorFact?.location
    ? `The report lists "${anchorFact.source_field || 'the starting date'}" as ${dateReading(anchorFact.normalized_value, anchorFact)}.` : '';
  const startingDate = /debt was incurred/i.test(issue.uncertainty || '')
    ? 'The report does not show when the debt began. Please check the right starting date for this time limit.' : '';
  return [observation, anchor, startingDate, sentence(checklistBasis?.request_wording || issue.request_wording)].filter(Boolean).join(' ');
}
function accountReference(record) {
  for (const field of ['account.masked_identifier', 'tradeline.accountNumber', 'collection.accountNumber',
    'overdue.accountReference', 'liability.accountReference']) {
    const source = sourceForField(record, field);
    if (!source || source.privacy_redacted || source.record_index != null && source.record_index !== record.record_index) continue;
    const value = source.raw_value == null ? record.facts?.[field] : source.raw_value;
    if (typeof value === 'string' && value.trim() && !/^(?:MASK|CREDITOR|MEMBER)-[a-f0-9]+$/i.test(value)) return value.trim();
  }
  return '';
}
function itemsFor(row, selected) {
  return selected.flatMap((issue, index) => {
    const named = issue.account_identity?.entries || [{ ...issue.account_identity, record_index: issue.record_index }];
    const indexes = [issue.record_index,
      ...(issue.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING' ? [issue.evidence?.duplicate_of_record] : []),
      ...(issue.check_id === 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY' ? [issue.evidence?.other_record] : []),
      ...(issue.check_id === 'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE' ? [issue.evidence?.original_record] : [])];
    const entries = [...new Set([...named.map(entry => entry.record_index), ...indexes].filter(index => index != null))]
      .map(record_index => named.find(entry => entry.record_index === record_index) || { record_index });
    return entries.map(entry => {
      const record = row?.extraction?.records?.find(record => record.record_index === entry.record_index);
      const location = entry.location || record?.location || issue.location || {};
      const name = entry.name || accountDisplay.identityFor(record)?.name
        || `${record?.kind_label || issue.record?.kind_label || 'Report entry'} ${entry.record_index}`;
      return { issue_id: issue.issue_id, letter_item: index + 1, record_index: entry.record_index, check_id: issue.check_id,
        kind: record?.kind || issue.record?.kind_label || '', name,
        account_reference: accountReference(record || {}),
        report_reference: location.page ? `Report page ${location.page}${location.line ? ', line ' + location.line : ''}` : '',
        request: requestFor(issue), explanation: issue.explanation || '',
        report_date: issue.report_identity?.reference_date || '',
        source_location: { page: location.page || null, line: location.line || null } };
    });
  });
}
function payloadFor(packet, row, selected) {
  const snapshot = packet.support_snapshot || {};
  return { version: VERSION, profile: snapshot.profile || {},
    settings: { ...(snapshot.settings || {}), document_kinds: (snapshot.documents || []).map(doc => doc.document_kind) },
    correspondence: packet.correspondence || {}, items: itemsFor(row, selected),
    letter_date: String(packet.letter_date || packet.created_at || row?.recorded_at || '').slice(0, 10) };
}
function lines(packet, row, selected) {
  const data = payloadFor(packet, row, selected), c = data.correspondence, p = data.profile;
  const name = c.consumer_name || p.full_name || '(name not supplied yet)';
  const contact = packet.support?.use_account_profile
    ? [p.address_line1, p.address_line2, [p.city, p.region, p.postal_code].filter(Boolean).join(' '),
      p.country, p.contact_email, p.phone].filter(Boolean)
    : String(c.contact || '(reply address not supplied yet)').split(/\r?\n/);
  const bureau = packet.support_snapshot?.requirements;
  const recipient = bureau?.label || 'Credit report team';
  const postal = String(bureau?.postal || '').split(/,\s*/).filter(Boolean);
  const brand = recipient.split(/\s+/)[0];
  const destination = postal[0]?.split(/[\s–—-]+/)[0].toLowerCase() === brand.toLowerCase()
    ? postal : [recipient, ...postal];
  const identity = [];
  if (p.date_of_birth) identity.push('Date of birth: ' + dateLabel(p.date_of_birth));
  if (p.previous_address) identity.push('Previous address: ' + p.previous_address);
  if (data.settings.identity_reference) identity.push((bureau?.country === 'US' ? 'Social Security number: ' : 'Identification reference: ') + data.settings.identity_reference);
  if (data.settings.no_ssn_issued && bureau?.country === 'US') identity.push('I have never been issued a Social Security number.');
  if (data.settings.other_identity_details) identity.push(data.settings.other_identity_details);
  const out = [name, ...contact, '', dateLabel(data.letter_date), '', ...destination, '',
    'Re: Credit report dispute', ...(c.bureau_reference ? ['My bureau file or account number: ' + c.bureau_reference] : []),
    ...(c.account_reference ? ['My reference: ' + c.account_reference] : []),
    ...identity, '', `Dear ${brand} team,`, ''];
  const dates = [...new Set(data.items.map(item => item.report_date).filter(Boolean))];
  out.push(`I am writing about ${dates.length === 1 ? 'my credit report dated ' + dateLabel(dates[0]) : 'the credit reports listed in the attached evidence'}. Please check the following information and correct anything that is wrong.`, '');
  selected.forEach((issue, index) => {
    const accounts = data.items.filter(item => item.letter_item === index + 1);
    const names = accounts.map(item => item.name + (item.account_reference ? ' (account ' + item.account_reference + ')' : '')).join(' and ');
    const references = [...new Set(accounts.map(item => item.report_reference).filter(Boolean))];
    out.push(`${index + 1}. ${names}`, requestFor(issue),
      ...(references.length ? ['Please see ' + references.map(ref => ref.replace(/^Report/, 'report')).join(' and ') + ' in the attached copies.'] : []), '');
  });
  if (packet.wording) out.push(packet.wording, '');
  if (data.settings.document_ids?.length) out.push('I have included copies of my identification and address documents.');
  out.push('Please send me the result of your checks and a copy of my updated report if you make changes.', '',
    'Thank you for your help.', '', 'Sincerely,', '', 'Signature: ________________________', name, '');
  return out;
}

module.exports = { VERSION, dateLabel, requestFor, itemsFor, payloadFor, lines };
