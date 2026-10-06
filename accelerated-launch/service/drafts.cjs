'use strict';
/**
 * drafts.cjs — the review / download boundary.
 *
 * OWNER-ALL82-001 / B2. The plan's acceptance item is "Review and downloadable response draft only where
 * eligibility permits", and the CA-NS restriction is explicit: "No packet or response draft for the
 * packet-ineligible CA-NS unit."
 *
 * The response draft (a letter addressed to a bureau) is NOT implemented in this build, so this module still
 * refuses a response draft — and it still exercises the DOWNLOAD INTERFACE with content that says, on its
 * face, that it is a demonstration and not a response draft.
 *
 * The consumer's correction packet is a SEPARATE, entitlement-gated flow (OWNER-CA-CORRECTION-PACKET-001,
 * `packets.cjs`); `packet_eligible` on a rule is that packet's permission, not a response-draft permission,
 * so it never flips this module's `draft_eligible`.
 */

const { ServiceError } = require('./errors.cjs');

const DEMONSTRATION_LABEL = 'DEMONSTRATION OUTPUT — FICTIONAL CONTENT — NOT A RESPONSE DRAFT';

/** The draft refusal, carrying the recorded reason. Never returns content. */
function responseDraft(resultSet) {
  const eligible = resultSet && resultSet.eligibility ? resultSet.eligibility.draft_eligible === true : false;
  if (!eligible) {
    throw new ServiceError('RESULT_NOT_ELIGIBLE_FOR_DRAFT', {
      reason: (resultSet && resultSet.eligibility && resultSet.eligibility.reason) || 'NO_ELIGIBLE_RESULT_IN_THIS_BATCH',
      recorded_permission: 'response drafts are not implemented in this build; correction packets are a separate entitlement-gated flow'
    });
  }
  /* Unreachable in this batch. Kept so that a future eligible adapter has one call site, not two. */
  throw new ServiceError('RESULT_NOT_ELIGIBLE_FOR_DRAFT', { reason: 'DRAFT_ASSEMBLY_NOT_IMPLEMENTED' });
}

/**
 * The file the download interface actually serves. It is fictional, it says so, and it contains no report
 * content, no case content and no account data.
 */
function demonstrationDownload(resultSet, caseRow) {
  const region = caseRow ? `${caseRow.region}` : 'your selection';
  const checks = resultSet && resultSet.observations ? resultSet.observations.length : 0;
  const lines = [
    DEMONSTRATION_LABEL,
    '',
    'This file exists to exercise the download interface of the local service.',
    'It is NOT a response draft, it is NOT a letter and it must not be sent to anyone.',
    'It carries no information about any credit report and no information about any account.',
    '',
    `Your selection: ${region}`,
    `Checks performed in this result set: ${checks}`,
    'Eligibility: no result in this build is eligible for a response draft.',
    '',
    'Why: the recorded output permission for every applicable check caps its conclusion at an observation',
    'and records that it may not be used to assemble a packet or a response draft. A demonstration file is',
    'served in its place so the download path itself can be reviewed.',
    '',
    'Placeholder response text, deliberately generic and fictional:',
    '  "To: Sample Bureau — I am reviewing the entries printed in a fictional report. Please explain the',
    '   source and basis of the entries named above and reply in writing."',
    '',
    'Consumer signature: ____________________     Date: ____________________',
    ''
  ];
  return {
    filename: 'CRP-demonstration-download-NOT-a-response-draft.txt',
    content_type: 'text/plain; charset=utf-8',
    body: lines.join('\n'),
    is_a_response_draft: false,
    is_fictional: true
  };
}

module.exports = { responseDraft, demonstrationDownload, DEMONSTRATION_LABEL };
