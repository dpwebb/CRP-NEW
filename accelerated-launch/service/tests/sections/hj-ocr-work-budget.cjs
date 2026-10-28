'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
async function run(t,check){
  const output=path.join(__dirname,'../../out','governed-ocr-work-'+Date.now()+'-'+process.pid);fs.mkdirSync(output,{recursive:true});
  const result=spawnSync(process.execPath,['--test','--test-reporter=tap',path.join(__dirname,'../ocr-region-work.test.cjs')],{windowsHide:true,timeout:120000,maxBuffer:4*1024*1024,encoding:'utf8'});
  fs.writeFileSync(path.join(output,'native.tap'),(result.stdout||'')+(result.stderr||''));
  check.equal(result.status,0,'native physical OCR batch custody, invalid-page and deadline controls pass');
  check.ok(/# tests 5\b/.test(result.stdout||''),'all five physical OCR work controls ran');
  check.ok(/# fail 0\b/.test(result.stdout||'')&&/# skipped 0\b/.test(result.stdout||''),'no control failed or skipped');
  return {native_cases:5,scope:'fictional local source pixels and actual installed OCR, including injected malformed batch page identities',receipt:path.relative(path.join(__dirname,'../../../..'),path.join(output,'native.tap'))};
}
module.exports={id:'hj-ocr-work-budget',title:'Bounded physical OCR batches source views within the unchanged deadline',run};
