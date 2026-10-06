'use strict';
// Shared routing for every canonical region. Coverage is evidence, never admission.
const matrix = require('./launch-matrix.json');
function selectJurisdiction(country, region) {
  if (typeof country !== 'string' || typeof region !== 'string') throw Error('EXPLICIT_COUNTRY_AND_REGION_REQUIRED');
  const row = matrix.regions.find(r => r.country === country && r.region === region);
  if (!row) throw Error('UNSUPPORTED_OR_MISMATCHED_JURISDICTION');
  return Object.freeze({country, region, batch:row.batch,
    acceptedSourceIds:Object.freeze([...row.source_ids]),
    ruleFamilies:Object.freeze([...row.rule_families]),
    launchReady:row.launch_ready, evaluationAvailable:false});
}
module.exports = {selectJurisdiction};
