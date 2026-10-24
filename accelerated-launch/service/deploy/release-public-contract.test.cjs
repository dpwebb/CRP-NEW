'use strict';
const assert=require('node:assert/strict');
const {familyEntryContract,renderedHomepage}=require('./release-workflow.cjs');
const {windowsPathPreflight}=require('./release-artifact.cjs');
const root=require('node:path').resolve(__dirname,'../../..');
(async()=>{
 const wf=require('./release-workflow.cjs'),nonce=process.env.CODEX_TOOL_CALL_ID,sentinel=process.env.CRP_BINDING_FIXTURE_SENTINEL;const fingerprint=wf.environmentIdentity();try{process.env.CODEX_TOOL_CALL_ID='fictional-other-dispatch';assert.equal(wf.environmentIdentity(),fingerprint);wf.verifyBinding({environment_sha256:fingerprint,files:[],external_files:[],binaries:[]});process.env.CRP_BINDING_FIXTURE_SENTINEL='fictional-runtime-change';assert.notEqual(wf.environmentIdentity(),fingerprint);assert.throws(()=>wf.verifyBinding({environment_sha256:fingerprint,files:[],external_files:[],binaries:[]}),/environment changed/);}finally{if(nonce===undefined)delete process.env.CODEX_TOOL_CALL_ID;else process.env.CODEX_TOOL_CALL_ID=nonce;if(sentinel===undefined)delete process.env.CRP_BINDING_FIXTURE_SENTINEL;else process.env.CRP_BINDING_FIXTURE_SENTINEL=sentinel;}
 const origin=new URL('https://staging.creditregulatorpro.com'),health={ok:true,application:'crp-family-admin',environment:'staging',build:{release:'crp-family-0123456789abcdef'}};
 const fetcher=async url=>String(url).endsWith('/admin')?new Response(null,{status:303,headers:{location:'https://admin-staging.creditregulatorpro.com/'}}):Response.json(health);
 assert.equal((await familyEntryContract(origin,fetcher)).retired.join(','),'admin.js,admin.css');
 await assert.rejects(familyEntryContract(origin,async()=>new Response(null,{status:303,headers:{location:'https://untrusted.example.test/'}})),/entry contract/);
 await assert.rejects(familyEntryContract(origin,async url=>String(url).endsWith('/admin')?fetcher(url):Response.json({...health,environment:'production'})),/identity mismatch/);
 assert.equal(await familyEntryContract(new URL('http://127.0.0.1:1234'),()=>{throw Error('unexpected external request');}),null);
 assert.throws(()=>windowsPathPreflight('C:/'+('deep/'.repeat(60)),['app.js'],'win32'),/shorter dedicated/);
 assert.doesNotThrow(()=>windowsPathPreflight('C:/crp-pkg',['accelerated-launch/service/ui/app.js'],'win32'));
 assert.doesNotThrow(()=>windowsPathPreflight('/'+('deep/'.repeat(60)),['app.js'],'linux'));
 const groups=require('./build-release-manifest.cjs').collectGroups(),seo=require('../public-seo.cjs'),home=seo.regionalModel('CA');
 const text=renderedHomepage(root,{groups},home);assert.match(text,/canonical/);assert.match(text,/data-public-styles/);
 const bad=structuredClone(groups);bad[0].files[0].sha256='0'.repeat(64);assert.throws(()=>renderedHomepage(root,{groups:bad},home),/mismatch/);
 console.log('Public routing, frozen SSR, strict hashes and Windows path preflight: passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
