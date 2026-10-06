'use strict';
/**
 * case-status.cjs — the consumer-recorded status of a case, and the transitions between them.
 *
 * OWNER-ALL82-001 / B2. The plan asks for "a simple case record for the report, reviewed results, draft and
 * consumer-recorded response status". The consumer records this; nothing here is computed and nothing here
 * implies that anything was sent.
 */

const { ServiceError } = require('./errors.cjs');

const CASE_STATUSES = Object.freeze({
  OPEN: 'OPEN',
  REVIEWED: 'REVIEWED',
  RESPONSE_RECORDED: 'RESPONSE_RECORDED',
  CLOSED: 'CLOSED'
});

/** Consumer-facing wording. The status tokens above never reach the UI. */
const CASE_STATUS_LABELS = Object.freeze({
  OPEN: 'Open — you have not recorded a next step yet',
  REVIEWED: 'Reviewed — you have read the observations for this case',
  RESPONSE_RECORDED: 'Response recorded — you recorded what you did next',
  CLOSED: 'Closed — you are finished with this case'
});

const TRANSITIONS = Object.freeze({
  OPEN: ['REVIEWED', 'CLOSED'],
  REVIEWED: ['RESPONSE_RECORDED', 'CLOSED'],
  RESPONSE_RECORDED: ['CLOSED', 'REVIEWED'],
  CLOSED: ['OPEN']
});

function adjustStatus(current, next) {
  if (!Object.prototype.hasOwnProperty.call(CASE_STATUSES, String(next))) {
    throw new ServiceError('INVALID_REQUEST', 'UNSUPPORTED_CASE_STATUS');
  }
  const allowed = TRANSITIONS[String(current)] || [];
  if (!allowed.includes(String(next))) {
    throw new ServiceError('INVALID_REQUEST', `UNSUPPORTED_CASE_STATUS_TRANSITION:${String(current)}->${String(next)}`);
  }
  return String(next);
}

function labelFor(status) {
  return CASE_STATUS_LABELS[String(status)] || null;
}

module.exports = { CASE_STATUSES, CASE_STATUS_LABELS, TRANSITIONS, adjustStatus, labelFor };
