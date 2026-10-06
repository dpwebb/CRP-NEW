'use strict';
/* OWNER-CA-ORDINARY-REPORT-001 — keep the served availability row for Ontario truthful after the Ontario
   ordinary-report reliability rule is configured. The row's classes are what the region can actually run; the
   fictional-fixture journey is NOT counted as real-evidence performance, so only the executable classification
   moves. Idempotent. */
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.resolve(__dirname, '..', '..', 'accelerated-launch', 'launch-matrix.json');
const matrix = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const row = matrix.regions.find((r) => r.region === 'CA-ON');
if (!row) throw new Error('CA-ON row not found');

row.adapter_coverage = ['CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS@EXACT_MATCH'];
row.executable_checks = 1;
row.assessment_kinds = ['STATUTORY_RULE_COMPARISON', 'REPORT_FACT_CONSISTENCY'];
row.applicability_state = 'MEANINGFUL_ASSESSMENT_WITH_RECORDED_STATUTORY_LIMB';
row.evaluation_support = 'EXERCISED_LOCALLY:1_CHECKS';
row.report_format_support = 'EXERCISED_LOCALLY:PR-01+GENERAL-BUREAU-REPORT';
fs.writeFileSync(FILE, `${JSON.stringify(matrix, null, 2)}\n`);
console.log('launch-matrix CA-ON row updated: executable_checks=1, assessment_kinds=' + JSON.stringify(row.assessment_kinds));
