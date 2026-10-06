'use strict';
const fs = require('node:fs');
const path = require('node:path');
const fixtures = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');

async function run(t, check) {
  const a = await t.account('privacy-dashboard-a@example.test');
  const b = await t.account('privacy-dashboard-b@example.test');
  async function create(owner, name) {
    const id = (await t.request('POST','/api/cases',{token:owner.token,body:{country:'CA',region:'CA-NS'}})).json.case.case_id;
    const upload = await t.request('POST',`/api/cases/${id}/files`,{token:owner.token,body:{originalFilename:name,declaredBytes:1,mimeType:'application/pdf',contentBase64:fs.readFileSync(fixtures.pdfFixtures().unpinned).toString('base64')}});
    check.equal(upload.status,201,'owned document stored');
    await t.request('POST',`/api/cases/${id}/demonstration`,{token:owner.token,body:{scenario:'TWO_ACCOUNTS'}});
    return id;
  }
  const ac = await create(a,'owner-a.pdf'), bc = await create(b,'owner-b.pdf');
  const before = t.blobFiles();
  const inventory = await t.request('GET','/api/privacy',{token:a.token});
  check.equal(inventory.status,200,'authenticated dashboard available');
  check.equal((await t.request('GET','/api/privacy')).status,401,'inventory requires authentication');
  check.deepEqual(inventory.json.cases.map(c=>c.case_id),[ac],'inventory contains only own cases');
  check.equal(inventory.json.cases[0].documents.length,1,'own stored document listed');
  check.equal(inventory.json.cases[0].result_count,1,'own result inventory listed');
  check.ok(!inventory.text.includes(bc)&&!inventory.text.includes('owner-b.pdf'),'no other-account metadata');
  check.ok(!/sha256|absolute_path|stored_path/.test(inventory.text),'no private storage metadata');
  check.equal(inventory.json.retention.mode,'UNTIL_DELETED','truthful retention default');
  check.equal(inventory.json.retention.adjustable,false,'no nonfunctional retention setting promised');
  check.ok(/not been verified/.test(inventory.json.deletion.backups),'backup erasure is not promised');
  check.equal((await t.request('DELETE',`/api/cases/${bc}`,{token:a.token})).status,403,'other-account deletion refused');
  check.equal(t.blobFiles().length,before.length,'refused deletion preserves bytes');
  const ownBlob = t.blobFiles().find(file=>file.includes(inventory.json.cases[0].documents[0].file_id));
  check.ok(ownBlob,'own bytes identified before deletion');
  check.equal((await t.request('DELETE',`/api/cases/${ac}`,{token:a.token})).status,200,'own case deletion succeeds');
  check.ok(!fs.existsSync(path.join(t.dataDir,'blobs',ownBlob)),'own bytes removed from disk');
  check.equal((await t.request('GET',`/api/cases/${ac}/results`,{token:a.token})).status,404,'deleted results unavailable');
  check.equal((await t.request('GET','/api/privacy',{token:a.token})).json.cases.length,0,'inventory updates after deletion');
  check.equal((await t.request('GET',`/api/cases/${bc}`,{token:b.token})).status,200,'other account remains usable');
  check.equal(t.blobFiles().length,1,'other account bytes remain');
  await create(a,'owner-a-again.pdf');
  check.equal((await t.request('DELETE','/api/account',{token:a.token})).status,200,'account deletion succeeds');
  check.equal((await t.request('GET','/api/privacy',{token:a.token})).status,401,'deleted account loses inventory access');
  check.equal(t.blobFiles().length,1,'account deletion preserves other-account bytes');
  return { inventory:true, retention:true, deletion:true, isolation:true, backup_erasure_verified:false };
}
module.exports = {run,id:'ax-consumer-privacy',title:'Account-owned privacy inventory, retention and controlled deletion'};
