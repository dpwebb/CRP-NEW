'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { inspectStateReadOnly } = require('../store-diagnostic.cjs');
const { EMPTY_STATE } = require('../private-store.cjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'crp-diagnostic-test-'));
function snapshot(dir) {
  return fs.readdirSync(dir).sort().map(name=>{
    const p=path.join(dir,name),stat=fs.statSync(p);
    return [name,stat.mtimeMs,stat.mode,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')];
  });
}
try {
  const missing = path.join(temp,'missing');
  assert.equal(inspectStateReadOnly(missing).passed,true);
  assert.equal(fs.existsSync(missing),false);
  assert.equal(inspectStateReadOnly(temp).passed,true);
  fs.mkdirSync(path.join(temp,'blobs'));
  fs.writeFileSync(path.join(temp,'store.lock'),JSON.stringify({pid:process.pid}));
  assert.equal(inspectStateReadOnly(temp).passed,true);
  fs.rmdirSync(path.join(temp,'blobs'));
  fs.writeFileSync(path.join(temp,'state.json'),JSON.stringify(EMPTY_STATE));
  fs.writeFileSync(path.join(temp,'state.json.bak'),JSON.stringify(EMPTY_STATE));
  fs.writeFileSync(path.join(temp,'store.lock'),JSON.stringify({pid:process.pid}));
  let before=snapshot(temp);
  assert.equal(inspectStateReadOnly(temp).passed,true);
  assert.deepEqual(snapshot(temp),before);
  fs.writeFileSync(path.join(temp,'state.json'),'{CORRUPT_PRIVATE_CONTENT');
  before=snapshot(temp);
  const corrupt=inspectStateReadOnly(temp);
  assert.equal(corrupt.passed,false);
  assert(!corrupt.detail.includes('PRIVATE_CONTENT'));
  assert.deepEqual(snapshot(temp),before); // valid backup must not be restored
  for(const state of [{version:999},{version:2,accounts:{}},null,[]]) {
    fs.writeFileSync(path.join(temp,'state.json'),JSON.stringify(state));
    before=snapshot(temp);
    assert.equal(inspectStateReadOnly(temp).passed,false);
    assert.deepEqual(snapshot(temp),before);
  }
  fs.unlinkSync(path.join(temp,'state.json'));
  before=snapshot(temp);
  assert.equal(inspectStateReadOnly(temp).passed,false);
  assert.deepEqual(snapshot(temp),before);
  console.log('PASS: read-only diagnostic; live lock untouched; corrupt primary not recovered; sensitive errors suppressed; missing index and invalid state refused');
} finally {
  fs.rmSync(temp,{recursive:true,force:true}); // only the explicitly created isolated test directory
}
