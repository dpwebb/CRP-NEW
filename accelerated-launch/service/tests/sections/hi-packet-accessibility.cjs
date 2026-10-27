'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
async function run(t,check){
  const output=path.join(__dirname,'../../out','governed-packet-accessibility-'+Date.now()+'-'+process.pid);
  fs.mkdirSync(output,{recursive:true});
  const result=spawnSync(process.execPath,['--test','--test-reporter=tap',path.join(__dirname,'../packet-accessibility.test.cjs')],{
    env:{...process.env,CRP_PACKET_ACCESSIBILITY_TEST_OUTPUT:output,CRP_FICTIONAL_REGRESSION:'1'},windowsHide:true,timeout:120000,maxBuffer:4*1024*1024,encoding:'utf8'});
  fs.writeFileSync(path.join(output,'native.tap'),(result.stdout||'')+(result.stderr||''));
  check.equal(result.status,0,'all native accessibility cases pass in a separate owned fictional process');
  check.ok(/# tests 3\b/.test(result.stdout||''),'all three declared native cases actually ran');
  check.ok(/# fail 0\b/.test(result.stdout||'')&&/# skipped 0\b/.test(result.stdout||''),'native cases have no failed or skipped case');
  return {scope:'native API/store/PDF/HTML assertions, not browser or actual assistive technology',native_cases:3,receipt:path.relative(path.join(__dirname,'../../../..'),path.join(output,'native.tap'))};
}
module.exports={id:'hi-packet-accessibility',title:'Complete packet reading, confirmed alternatives, version/approval/ownership and persisted reopen',run};
