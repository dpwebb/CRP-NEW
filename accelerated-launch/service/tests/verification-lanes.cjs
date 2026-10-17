'use strict';
// Explicit selection only. The default runner still executes every current product section.
const SOURCE_AUDIT_FILES = ['historical-legacy-source.cjs', 'historical-gb-source.cjs'];
const LANE_IDS = {
  regional: ['n-applicability', 'o-all82-infrastructure', 'bx-all82-factual-verification'],
  formats: ['c-extraction', 'l-au-format-family', 'm-au-journey', 'p-us-consumer-format', 'q-record-applicability', 'r-ca-factual-assessment', 's-gb-consumer-format', 'w-ca-second-bureau-format', 'y-ingest-coverage-matrix', 'z-general-intake', 'bv-admission-and-upload'],
  security: ['gf-email-password-reset', 'ge-email-reset-browser', 'gb-admin-access', 'gc-admin-service', 'gd-admin-http-browser', 'fz-signup-user-experience', 'a-isolation', 'ax-consumer-privacy', 'b-refusals', 'f-deletion', 'g-privacy', 't-entitlement', 'u-hardening', 'x-b4-pay-001', 'ay-consumer-support', 'az-consumer-support-ui', 'ba-consumer-billing', 'ey-legacy-account-continuity'],
  browser: ['ge-email-reset-browser', 'gd-admin-http-browser', 'ga-packet-review-mailing', 'fz-signup-user-experience', 'ed-account-browser', 'bw-browser-wizzard'],
  consumer: ['k-ui-smoke', 'av-consumer-results', 'aw-consumer-explanations', 'bl-us-ca-correction-packet', 'bm-prime-directive-batch1', 'bn-prime-directive-ui', 'bo-prime-directive-interaction', 'bp-prime-directive-batch2', 'br-qualified-assessment', 'bs-prime-directive-delivery', 'bt-ordinary-field-coverage', 'bu-gb-tu-ca-fields', 'by-packet-reconciliation', 'bz-report-history'],
  'source-audit': ['historical-legacy-source', 'historical-gb-source']
};
LANE_IDS.security.unshift('gh-audit-billing-lifecycle', 'gj-audit-maintenance', 'gk-audit-api-correctness', 'gl-remaining-consumer-flow');
LANE_IDS.browser.unshift('gi-audit-consumer-flow');
LANE_IDS.consumer.unshift('gi-audit-consumer-flow', 'gk-audit-api-correctness', 'gl-remaining-consumer-flow');
LANE_IDS.security.unshift('gl-inline-packet-pages');
LANE_IDS.consumer.unshift('gl-inline-packet-pages');
LANE_IDS.security.unshift('gn-wizard-deletion-corrections');
LANE_IDS.security.unshift('go-homepage-signin-localization');
LANE_IDS.browser.unshift('go-homepage-signin-localization');
LANE_IDS.consumer.unshift('go-homepage-signin-localization');
LANE_IDS.consumer.unshift('gn-wizard-deletion-corrections');
LANE_IDS.consumer.unshift('gp-public-seo');
LANE_IDS.security.unshift('gp-public-seo');
LANE_IDS.consumer.unshift('gq-public-analytics');
LANE_IDS.security.unshift('gq-public-analytics');
module.exports = { SOURCE_AUDIT_FILES, LANE_IDS };
