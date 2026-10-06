'use strict';
const assert = require('node:assert/strict');
const {selectJurisdiction} = require('./jurisdiction-router.cjs');
const {regions} = require('./launch-matrix.json');
assert.equal(regions.length,82);
assert.equal(new Set(regions.map(r=>r.region)).size,82);
for(const row of regions) {
  const result=selectJurisdiction(row.country,row.region);
  assert.equal(result.region,row.region);
  assert.equal(result.evaluationAvailable,false);
  assert(Object.isFrozen(result.acceptedSourceIds));
  assert.throws(()=>selectJurisdiction('INVALID',row.region));
}
for(const pair of [[null,null],['CA',''],['ca','CA-NS'],['US','CA-NS'],['CA','NS']])
  assert.throws(()=>selectJurisdiction(...pair));
console.log(process.argv.includes('--json')
  ? JSON.stringify({ suite: 'router', regions: regions.length, alias_refusals: true, failed: 0 })
  : 'PASS: all 82 routes; mismatch, incomplete and alias refusals; no premature evaluation activation');
