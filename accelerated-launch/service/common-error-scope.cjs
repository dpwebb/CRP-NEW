'use strict';

// The owner made the common-error checklist the active version 1 violation
// boundary. Only accuracy mappings and reporting-period rules for tradelines
// or collections support a listed item; other admitted source records remain
// historical material, not active assessment adapters.
const adapterDefinitions = require('../adapters/rule-adapters.cjs').ADAPTERS;
/* These are optional statutory support for the checklist, never a prerequisite
 * for a source-linked report-data-rule violation. Keep the relation explicit so
 * an unrelated historical adapter cannot become active by accident. */
const CHECKLIST_STATUTORY_SUPPORT = Object.freeze({
  'CA-NS-CRA-S10-3-C-LIMB-1': 'TRADELINE_REPORTING_PERIOD',
  'CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS': 'REPORT_DATA_ACCURACY',
  'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY': 'REPORT_DATA_ACCURACY',
  'FCRA-605A-4-US-NATIONAL-7Y': 'COLLECTION_REPORTING_PERIOD',
  'FCRA-605A-5-US-NATIONAL-7Y': 'TRADELINE_REPORTING_PERIOD',
  'US-CA-CCRAA-1785-13-A-5-COLLECTION-7Y': 'COLLECTION_REPORTING_PERIOD',
  'US-CA-CCRAA-1785-13-A-8-ADVERSE-7Y': 'TRADELINE_REPORTING_PERIOD',
  'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y': 'COLLECTION_REPORTING_PERIOD',
  'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y': 'TRADELINE_REPORTING_PERIOD',
  'CA-AB-CPA-CPRR-S4-B-DEBT-LAST-PAYMENT-6Y': 'TRADELINE_REPORTING_PERIOD',
  'CA-NT-PIPEDA-SCH1-4-6-ACCURACY': 'REPORT_DATA_ACCURACY',
  'CA-NU-PIPEDA-SCH1-4-6-ACCURACY': 'REPORT_DATA_ACCURACY',
  'CA-YT-PIPEDA-SCH1-4-6-ACCURACY': 'REPORT_DATA_ACCURACY',
  'CA-BC-BPCPA-S109-1-B-MOST-RELIABLE-EVIDENCE': 'REPORT_DATA_ACCURACY',
  'CA-QC-P-39-1-S11-ACCURACY': 'REPORT_DATA_ACCURACY',
  'CA-SK-CRA-S18-B-MOST-RELIABLE-EVIDENCE': 'REPORT_DATA_ACCURACY'
});
const CHECKLIST_ADAPTER_IDS = Object.keys(CHECKLIST_STATUTORY_SUPPORT);
const known = new Set(adapterDefinitions.map((adapter) => adapter.adapter_id));
if (CHECKLIST_ADAPTER_IDS.some((id) => !known.has(id))) throw new Error('Unknown checklist adapter');
const ACTIVE_STATUTORY_ADAPTERS = new Set(CHECKLIST_ADAPTER_IDS);

function activeAdapter(adapterId) { return ACTIVE_STATUTORY_ADAPTERS.has(adapterId); }

const ACTIVE_RULE_REFS = new Set(adapterDefinitions.filter((adapter) => activeAdapter(adapter.adapter_id))
  .flatMap((adapter) => [adapter.adapter_id, adapter.legacy_rule_id].filter(Boolean)));
function activeRuleRef(rule) { return ACTIVE_RULE_REFS.has(rule); }

module.exports = { CHECKLIST_STATUTORY_SUPPORT, ACTIVE_STATUTORY_ADAPTERS, activeAdapter, activeRuleRef };
