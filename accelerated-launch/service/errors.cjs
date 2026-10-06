'use strict';
/**
 * errors.cjs — the service's typed refusals. Every refusal names a stable machine code and the HTTP status
 * it maps to, so the consumer surface can translate it into plain language without the transport layer
 * inventing wording of its own. REUSE LEDGER: the 404-for-unknown / 403-for-someone-else's split is the
 * legacy `ownership()` semantics (`packages/backend/src/middleware/auth.ts`).
 */

const STATUS_BY_CODE = Object.freeze({
  INVALID_REQUEST: 400,
  EXPLICIT_COUNTRY_AND_REGION_REQUIRED: 400,
  UNSUPPORTED_OR_MISMATCHED_JURISDICTION: 400,
  INVALID_ACCOUNT_DETAILS: 400,
  UNKNOWN_PLAN: 400,
  REPORT_UNLOCK_CASE_REQUIRED: 400,
  REPORT_ASSESSMENT_NOT_COMPLETED: 409,
  REPORT_ALREADY_UNLOCKED: 409,
  BILLING_EVENT_SIGNATURE_INVALID: 400,
  BILLING_EVENT_TYPE_UNSUPPORTED: 400,
  BILLING_EVENT_REJECTED: 400,
  UNSUPPORTED_FILE_TYPE: 400,
  UNSUPPORTED_FILE_EXTENSION: 400,
  EMPTY_FILE: 400,
  FILE_TOO_LARGE: 400,
  IMAGE_DIMENSIONS_TOO_LARGE: 400,
  MALFORMED_UPLOAD_BODY: 400,
  NOT_A_PDF_CONTAINER: 400,
  PRESENTATION_NOT_AVAILABLE_FOR_SELECTED_JURISDICTION: 400,
  AUTHENTICATION_REQUIRED: 401,
  INVALID_CREDENTIALS: 401,
  ENTITLEMENT_REQUIRED: 402,
  DOWNLOAD_NOT_ENTITLED: 402,
  ASSESSMENT_ACCESS_REQUIRED: 402,
  SUBSCRIPTION_REQUIRED: 402,
  CHECKOUT_OPEN_FAILED: 502,
  NOT_AUTHORIZED: 403,
  NOT_FOUND: 404,
  CHECKOUT_NOT_FOUND: 404,
  EMAIL_ALREADY_REGISTERED: 409,
  NO_ADMITTED_FILE: 409,
  RESULT_NOT_ELIGIBLE_FOR_DRAFT: 409,
  REVIEW_REQUIRED_BEFORE_DRAFT: 409,
  NO_RESULT_TO_DOWNLOAD: 409,
  INVALID_FINDING_SELECTION: 400,
  NO_PACKET_ELIGIBLE_FINDING: 409,
  PACKET_NO_SELECTION: 409,
  PACKET_CORRESPONDENCE_REQUIRED: 409,
  PACKET_NOT_APPROVED: 409,
  PACKET_APPROVAL_STALE: 409,
  TWO_RESULTS_REQUIRED: 400,
  SAME_RESULT_SELECTED: 400,
  CHECKOUT_NOT_CONFIRMED_BY_PROVIDER: 409,
  NO_ACTIVE_PURCHASE_TO_CANCEL: 409,
  ACCOUNT_STORAGE_QUOTA_EXCEEDED: 409,
  FILE_COUNT_LIMIT_REACHED: 409,
  TOO_MANY_FAILED_SIGN_INS: 429,
  PAYMENT_PROVIDER_NOT_CONFIGURED: 503,
  SERVICE_STATE_UNAVAILABLE: 503
});

/** Plain-language copy for every machine code. The consumer UI renders these and nothing rawer. */
const MESSAGE_BY_CODE = Object.freeze({
  INVALID_REQUEST: 'That request could not be understood.',
  EXPLICIT_COUNTRY_AND_REGION_REQUIRED: 'Choose a country and a region before continuing.',
  UNSUPPORTED_OR_MISMATCHED_JURISDICTION: 'That country and region pair is not one of the supported selections.',
  INVALID_ACCOUNT_DETAILS: 'Enter a valid email address and a password of at least 12 characters.',
  UNKNOWN_PLAN: 'That plan is not one this service records.',
  REPORT_UNLOCK_CASE_REQUIRED: 'Choose the report you want to unlock.',
  REPORT_ASSESSMENT_NOT_COMPLETED: 'Check your report before buying the full results.',
  REPORT_ALREADY_UNLOCKED: 'This report is already unlocked. View your results.',
  BILLING_EVENT_SIGNATURE_INVALID: 'That payment event could not be verified, so it was refused and nothing changed.',
  BILLING_EVENT_TYPE_UNSUPPORTED: 'That payment event type is not one this service implements, so nothing changed.',
  BILLING_EVENT_REJECTED: 'That payment event was verified but did not match the configured plan, so nothing changed.',
  UNSUPPORTED_FILE_TYPE: 'That file type is not supported. Upload PDF, PNG or JPEG. Convert HEIC or TIFF to PNG/JPEG or PDF first.',
  UNSUPPORTED_FILE_EXTENSION: 'That file extension is not supported. Upload .pdf, .png, .jpg or .jpeg. Convert HEIC/TIFF first; ZIP archives are not accepted.',
  EMPTY_FILE: 'That file is empty.',
  IMAGE_DIMENSIONS_TOO_LARGE: 'This image exceeds 25 million pixels or 12,000 pixels on one side. Export a smaller clear PNG/JPEG or split the report into readable pages.',
  FILE_TOO_LARGE: 'That file is larger than the 10MB limit. Export a smaller readable PDF or split at page boundaries into parts under 10MB; retain every page and its report context.',
  MALFORMED_UPLOAD_BODY: 'The upload could not be read.',
  NOT_A_PDF_CONTAINER: 'That file is not a PDF, PNG or JPEG container. Convert HEIC, HEIF or TIFF images to PNG/JPEG first, or upload a valid PDF.',
  PRESENTATION_NOT_AVAILABLE_FOR_SELECTED_JURISDICTION: 'No supported report format is registered for the country you selected, so an uploaded report could not be read for it.',
  AUTHENTICATION_REQUIRED: 'Sign in to continue.',
  INVALID_CREDENTIALS: 'That email address and password did not match an account.',
  ENTITLEMENT_REQUIRED: 'No active purchase is recorded for this account, so this step cannot start. Reading what you already have, and deleting it, stay available.',
  ASSESSMENT_ACCESS_REQUIRED: 'This report complete assessment is not unlocked. Unlock this report or take a subscription to read it in full.',
  SUBSCRIPTION_REQUIRED: 'This is a subscriber feature. A subscription unlocks it; a one-time report unlock does not.',
  DOWNLOAD_NOT_ENTITLED: 'This report download is not covered. A one-time purchase covers exactly one case, and a subscription covers downloads while it is active.',
  CHECKOUT_OPEN_FAILED: 'The payment provider could not open this checkout, so nothing was charged and no access was granted.',
  NOT_AUTHORIZED: 'That case belongs to a different account.',
  NOT_FOUND: 'That case was not found.',
  CHECKOUT_NOT_FOUND: 'That purchase could not be found for this account.',
  EMAIL_ALREADY_REGISTERED: 'An account already exists for that email address.',
  NO_ADMITTED_FILE: 'No supported report is attached to this case yet.',
  RESULT_NOT_ELIGIBLE_FOR_DRAFT: 'No response draft can be produced for this result.',
  REVIEW_REQUIRED_BEFORE_DRAFT: 'Review the result before requesting a draft.',
  NO_RESULT_TO_DOWNLOAD: 'No assessment result is recorded for this case yet, so there is nothing to download.',
  INVALID_FINDING_SELECTION: 'One of the selected findings is not available for this correction packet.',
  NO_PACKET_ELIGIBLE_FINDING: 'No eligible finding is available for a correction packet on this case.',
  PACKET_NO_SELECTION: 'Select at least one finding before approving the packet.',
  PACKET_CORRESPONDENCE_REQUIRED: 'Add your name and a reply contact before approving the packet: correspondence without them cannot be sent.',
  PACKET_NOT_APPROVED: 'Approve the packet before downloading it.',
  PACKET_APPROVAL_STALE: 'The packet changed since it was approved. Review and approve the current version to download it.',
  TWO_RESULTS_REQUIRED: 'Choose two of your own reports to compare.',
  SAME_RESULT_SELECTED: 'Choose two different reports to compare.',
  CHECKOUT_NOT_CONFIRMED_BY_PROVIDER: 'The payment provider has not confirmed this purchase, so no access was granted.',
  NO_ACTIVE_PURCHASE_TO_CANCEL: 'There is no purchase recorded for this account to cancel.',
  ACCOUNT_STORAGE_QUOTA_EXCEEDED: 'This account is already holding as much report data as it may. Delete a case to free the space.',
  FILE_COUNT_LIMIT_REACHED: 'This case already holds the maximum number of files. Combine pages into a PDF under 10 MiB, or remove an unneeded case. Do not split one report across cases.',
  TOO_MANY_FAILED_SIGN_INS: 'Too many failed sign-in attempts. Wait and try again.',
  PAYMENT_PROVIDER_NOT_CONFIGURED: 'No payment provider is connected to this service, so nothing can be purchased and no access can be activated.',
  SERVICE_STATE_UNAVAILABLE: 'The service could not read its private state, so it refused the request rather than guess.'
});

class ServiceError extends Error {
  constructor(code, detail) {
    const status = STATUS_BY_CODE[code];
    if (!status) throw new Error(`UNKNOWN_SERVICE_ERROR_CODE: ${code}`);
    super(MESSAGE_BY_CODE[code]);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
    this.detail = detail === undefined ? null : detail;
  }
}

/** A plain-language body the transport may return as-is. `detail` is audit data, never consumer copy. */
function toBody(error) {
  if (error instanceof ServiceError) {
    return { ok: false, error: { code: error.code, message: error.message, detail: error.detail } };
  }
  return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Nothing was sent anywhere.', detail: null } };
}

module.exports = { ServiceError, toBody, STATUS_BY_CODE, MESSAGE_BY_CODE };
