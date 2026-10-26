'use strict';
const policy=require('./fictional-input-policy.json');
function fictionalEnabled(argv=process.argv){
  if(argv.includes('--captured-regression')) return false;
  return policy.default_profile==='fictional'||argv.includes('--fictional-regression')||argv.includes('--generated-regression');
}
module.exports={policy,fictionalEnabled};
