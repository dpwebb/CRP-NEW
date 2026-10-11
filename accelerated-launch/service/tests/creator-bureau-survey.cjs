'use strict';

// Supplemental survey of the older synthetic bureau-layout corpus. It does not score a seeded violation.
const fs = require('node:fs');
const path = require('node:path');
const formats = require('../formats.cjs');
const evaluation = require('../evaluation.cjs');
const issues = require('../issues.cjs');

const corpus = process.env.CRP_SYNTHETIC_V2_ROOT ||
  'C:\\Users\\webbd\\CREDIT REPORTS\\CRP_SYNTHETIC_CREDIT_REPORT_CORPUS_V2';
const output = process.env.CRP_CREATOR_TEST_ROOT ||
  'C:\\Users\\webbd\\CREDIT REPORTS\\CRP_CREATOR_VIOLATION_TESTS';
const cells = [
  ['CA_EFX_ON', 'CA', 'CA-ON'], ['CA_TU_NS', 'CA', 'CA-NS'],
  ['US_EFX_CA', 'US', 'US-CA'], ['US_EXP_NY', 'US', 'US-NY'], ['US_TU_TX', 'US', 'US-TX'],
  ['UK_EFX_ENG', 'GB', 'GB-ENG'], ['UK_EXP_WLS', 'GB', 'GB-WLS'], ['UK_TU_SCT', 'GB', 'GB-SCT'],
  ['AU_EFX_NSW', 'AU', 'AU-NSW'], ['AU_EXP_VIC', 'AU', 'AU-VIC']
];
const results = [];
for (const [cell, country, region] of cells) {
  for (const variant of ['B0', 'V1']) {
    const name = `${cell}_${variant}.pdf`;
    const file = path.join(corpus, 'reports', 'pdf', name);
    try {
      const extraction = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(file),
        { mode: 'REPORT', country });
      const assessed = evaluation.evaluateCase({ country, region, extraction });
      const found = issues.issuesFor({ evaluation: assessed, extraction }).filter(issue => issue.eligible);
      results.push({ name, country, region, presentation: extraction.presentation_id || null,
        records_read: extraction.records?.length || 0, eligible_issues: found.length,
        retention_issues: found.filter(issue => issue.basis_type === 'STATUTORY_RETENTION').length,
        check_ids: [...new Set(found.map(issue => issue.check_id).filter(Boolean))] });
    } catch (error) {
      results.push({ name, country, region, error: error.message });
    }
  }
}
const out = path.join(output, 'activity-logs', 'supplemental-bureau-survey.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ source: corpus, purpose: 'format survey only, not a seeded-violation pass',
  created_at: new Date().toISOString(), results }, null, 2) + '\n');
process.stdout.write(JSON.stringify({ output: out, results }) + '\n');
