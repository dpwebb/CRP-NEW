'use strict';
// Hosted phases are resumed only after a fresh observation of the actual remote bytes.
const fs=require('node:fs'),crypto=require('node:crypto');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
async function transfer({source,destination,expectedSha,probe,upload,record}){
  if(!/^\/tmp\/crp-v1-[a-f0-9]{16}-(?:staging|production)(?:-[a-f0-9]{16})?(?:-proof)?\.(?:tar\.gz|sh)$/.test(destination) || !/^[A-F0-9]{64}$/.test(expectedSha||'') || hash(source)!==expectedSha)throw Error('Transfer identity mismatch');
  const observed=await probe(destination);
  if(observed===expectedSha){const r={phase:'transfer',destination,sha256:expectedSha,reused:true,fresh_remote_hash:true};await record(r);return r;}
  await upload(source,destination);
  if(hash(source)!==expectedSha || await probe(destination)!==expectedSha)throw Error('Transferred bytes mismatch');
  const r={phase:'transfer',destination,sha256:expectedSha,reused:false,fresh_remote_hash:true};await record(r);return r;
}
async function activateObserved({probe,activate,record}){
  if(await probe()){const r={phase:'activation',reused:true,fresh_exact_host:true};await record(r);return r;}
  try{await activate();}
  catch(error){if(!await probe())throw error;const r={phase:'activation',reused:true,adopted_after_uncertain_exit:true,fresh_exact_host:true};await record(r);return r;}
  if(!await probe())throw Error('Activation completed without exact hosted artifact proof');
  const r={phase:'activation',reused:false,fresh_exact_host:true};await record(r);return r;
}
module.exports={transfer,activateObserved};
