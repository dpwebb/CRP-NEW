'use strict';
const fs = require('node:fs');
const path = require('node:path');
const comparison = require('../accelerated-launch/service/comparison.cjs');
const commonErrors = require('../accelerated-launch/service/common-errors.cjs');
function record(index, opened, closed) {
  return {record_index:index,kind:'GENERAL_ACCOUNT',kind_label:'credit account',source_bureau:'Equifax',facts:{
    'account.masked_identifier':'****1234','account.reported_identity':'FICTIONAL BANK',
    'liability.openedDate':opened,'liability.closedDate':closed
  }};
}
function result(id, date, records) {
  const extraction={presentation_id:'GENERAL-BUREAU-REPORT',bureau:'Equifax',reference_date:{normalized_value:date},records};
  return {result_id:id,case_id:id,account_id:'audit-fictional-owner',extraction,evaluation:{results:[],common_errors:commonErrors.runCommonErrorChecks({extraction})}};
}
const first=result('old','2025-01-01',[record(1,'2020-01-01','2019-01-01')]);
const clean=record(1,'2018-01-01','2019-01-01');
const still=record(2,'2020-01-01','2019-01-01');
const actor={account_id:'audit-fictional-owner'};
function run(order) {
  const next=result('new','2026-01-01',order);
  const state={cases:[{case_id:'old',account_id:actor.account_id},{case_id:'new',account_id:actor.account_id}],results:[first,next]};
  return comparison.comparisonView({state:()=>state},actor,'old','new').outcomes.map(o=>({category:o.category,outcome:o.outcome,match:o.match.state}));
}
const evidence={fictional_only:true,clean_candidate_first:run([clean,still]),issue_candidate_first:run([still,clean])};
fs.writeFileSync(path.join(__dirname,'comparison-ambiguity.json'),JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence));
