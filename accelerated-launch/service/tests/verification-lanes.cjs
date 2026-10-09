'use strict';
// Explicit selection only. The default runner still executes every current product section.
const SOURCE_AUDIT_FILES = ['historical-legacy-source.cjs', 'historical-gb-source.cjs'];
const LANE_IDS = {
  regional: ['n-applicability', 'o-all82-infrastructure', 'bx-all82-factual-verification'],
  formats: ['c-extraction', 'l-au-format-family', 'm-au-journey', 'p-us-consumer-format', 'q-record-applicability', 'r-ca-factual-assessment', 's-gb-consumer-format', 'w-ca-second-bureau-format', 'y-ingest-coverage-matrix', 'z-general-intake', 'bv-admission-and-upload'],
  security: ['a-isolation', 'ax-consumer-privacy', 'b-refusals', 'f-deletion', 'g-privacy', 't-entitlement', 'u-hardening', 'x-b4-pay-001', 'ay-consumer-support', 'az-consumer-support-ui', 'ba-consumer-billing', 'ey-legacy-account-continuity'],
  browser: ['bw-browser-wizzard'],
  consumer: ['k-ui-smoke', 'av-consumer-results', 'aw-consumer-explanations', 'bl-us-ca-correction-packet', 'bm-prime-directive-batch1', 'bn-prime-directive-ui', 'bo-prime-directive-interaction', 'bp-prime-directive-batch2', 'br-qualified-assessment', 'bs-prime-directive-delivery', 'bt-ordinary-field-coverage', 'bu-gb-tu-ca-fields', 'by-packet-reconciliation', 'bz-report-history'],
  'source-audit': ['historical-legacy-source', 'historical-gb-source']
};
module.exports = { SOURCE_AUDIT_FILES, LANE_IDS };
