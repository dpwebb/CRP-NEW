'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {transfer,activateObserved}=require('./release-transfer.cjs');
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'crp-transfer-test-')),source=path.join(dir,'source');fs.writeFileSync(source,'fictional archive');
  const digest=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex').toUpperCase(),destination='/tmp/crp-v1-'+'a'.repeat(16)+'-staging.tar.gz';let remote=null,uploads=0,records=[];
  const options={source,destination,expectedSha:digest,probe:async()=>remote,upload:async()=>{uploads++;remote=digest;},record:async r=>records.push(r)};
  try{
    assert.equal((await transfer(options)).reused,false);assert.equal(uploads,1);
    assert.equal((await transfer(options)).reused,true);assert.equal(uploads,1);
    remote='B'.repeat(64);await transfer(options);assert.equal(uploads,2);
    await assert.rejects(()=>transfer({...options,destination:'/tmp/unsafe;touch secret'}),/identity/);
    await assert.rejects(()=>transfer({...options,expectedSha:'B'.repeat(64)}),/identity/);
    remote=null;await assert.rejects(()=>transfer({...options,upload:async()=>{remote='B'.repeat(64);}}),/bytes mismatch/);
    await assert.rejects(()=>transfer({...options,probe:async()=>{throw Error('Host unavailable');}}),/Host unavailable/);
    let actual=false,activations=0;
    const activation={probe:async()=>actual,activate:async()=>{activations++;actual=true;},record:async r=>records.push(r)};
    assert.equal((await activateObserved(activation)).reused,false);assert.equal(activations,1);
    assert.equal((await activateObserved(activation)).reused,true);assert.equal(activations,1);
    actual=false;const adopted=await activateObserved({...activation,activate:async()=>{actual=true;throw Error('SSH disconnected after activation');}});assert.equal(adopted.adopted_after_uncertain_exit,true);
    actual=false;await assert.rejects(()=>activateObserved({...activation,activate:async()=>{throw Error('Failed before activation');}}),/Failed before/);
    await assert.rejects(()=>activateObserved({...activation,activate:async()=>{}}),/exact hosted/);
    await assert.rejects(()=>activateObserved({...activation,probe:async()=>{throw Error('Unknown actual host state');}}),/Unknown actual/);
    assert.ok(records.every(r=>r.fresh_remote_hash || r.fresh_exact_host));
    console.log('PASS: fresh remote hashes, failed-transfer retry, immutable bytes and ambiguous activation adoption/refusal');
  }finally{if(!dir.startsWith(path.join(os.tmpdir(),'crp-transfer-test-')))throw Error('Unsafe fixture cleanup');fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
