'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const {checkConfiguration,readEnv} = require('./affiliate-release-preflight.cjs');
function fixture(mode='activation', environment='staging') {
  const input={mode,environment,record:{version:1,deploymentOrder:['affiliate','crp','verify','enable'],releases:{}}};
  for(const [env,host,symbol] of [['staging','staging.creditregulatorpro.com','s'],['production','creditregulatorpro.com','p']]) {
    const affiliate='https://'+(env==='staging'?'affiliates-staging':'affiliates')+'.creditregulatorpro.com';
    input[env]={crp:{CRP_DEPLOYMENT_ENV:env,CRP_AFFILIATE_ORIGIN:affiliate,CRP_AFFILIATE_BINDING_ENABLED:mode==='activation'&&env===environment?'1':'0',CRP_AFFILIATE_BINDING_KEY:symbol.repeat(40),CRP_LOCAL_SERVICE_SECURE_COOKIE:'1'},affiliate:{APP_ENV:'production',PUBLIC_ORIGIN:affiliate,CONSUMER_ORIGIN:'https://'+host,CONSUMER_BINDING_ENABLED:mode==='activation'&&env===environment?'true':'false',BINDING_SECRET:symbol.repeat(40),REFERRAL_SECRET:(symbol+'r').repeat(20),STRIPE_MODE:env==='staging'?'test':'live'}};
    Object.assign(input[env].affiliate,{STRIPE_ACCOUNT_ID:'acct_fictional',STRIPE_READ_KEY:'rk_'+input[env].affiliate.STRIPE_MODE+'_fictional',STRIPE_WEBHOOK_SECRET:'whsec_'+symbol.repeat(32)});
    input.record.releases[env]={crp:{sourceCommit:'a'.repeat(40),buildId:'crp-v1-'+symbol.replace('s','a').replace('p','b').repeat(16),expectedPreviousBuildId:'crp-v1-'+'c'.repeat(16)},affiliate:{sourceCommit:'b'.repeat(40),imageDigest:'sha256:'+'d'.repeat(64),expectedPreviousImageDigest:'sha256:'+'e'.repeat(64)}};
  }
  return input;
}
test('exact pairs and source versions validate without claiming hosted readiness',()=>{
 for(const env of ['staging','production']) {
  const r=checkConfiguration(fixture('activation',env));
  assert.equal(r.configurationValid,true);assert.equal(r.productionReady,false);assert.equal(r.hostedAcceptanceVerified,false);assert.equal(r.pairs[env].enabled,true);
 }
 const dormant=fixture('dormant');
 for(const env of ['staging','production']) { dormant[env].crp.CRP_AFFILIATE_BINDING_KEY='';dormant[env].affiliate.BINDING_SECRET=''; }
 assert.equal(checkConfiguration(dormant).pairs.staging.keysInstalled,false);
 const stageFirst=fixture();stageFirst.production.crp.CRP_AFFILIATE_BINDING_KEY='';stageFirst.production.affiliate.BINDING_SECRET='';
 assert.equal(checkConfiguration(stageFirst).pairs.production.keysInstalled,false,'staging acceptance does not require installing a production key');
});
test('mismatched origins, switches, keys, billing and secret reuse are rejected',()=>{
 const changes=[
  x=>x.staging.affiliate.CONSUMER_ORIGIN=x.production.affiliate.CONSUMER_ORIGIN,
  x=>x.production.crp.CRP_AFFILIATE_ORIGIN=x.staging.crp.CRP_AFFILIATE_ORIGIN,
  x=>x.staging.affiliate.CONSUMER_BINDING_ENABLED='false',
  x=>x.staging.crp.CRP_AFFILIATE_BINDING_ENABLED='true',
  x=>x.staging.affiliate.BINDING_SECRET='wrong'.repeat(10),
  x=>{x.production.crp.CRP_AFFILIATE_BINDING_KEY=x.staging.crp.CRP_AFFILIATE_BINDING_KEY;x.production.affiliate.BINDING_SECRET=x.staging.affiliate.BINDING_SECRET;},
  x=>x.production.affiliate.REFERRAL_SECRET=x.staging.affiliate.BINDING_SECRET,
  x=>x.staging.affiliate.STRIPE_MODE='live',
  x=>x.staging.affiliate.STRIPE_READ_KEY='sk_'+'test_'+'fictional',
  x=>delete x.staging.affiliate.STRIPE_WEBHOOK_SECRET,
  x=>x.production.affiliate.STRIPE_SECRET_KEY='forbidden-fictional',
  x=>x.staging.crp.CRP_LOCAL_SERVICE_SECURE_COOKIE='0',
  x=>x.staging.affiliate.REFERRAL_SECRET=x.staging.affiliate.BINDING_SECRET,
  x=>delete x.production,
  x=>x.record.releases.staging.crp.sourceCommit='UNSET',
  x=>x.record.releases.staging.affiliate.imageDigest='latest',
  x=>x.record.releases.production.affiliate.secret='must-not-be-returned',
  x=>x.record.deploymentOrder.reverse()
 ];
 for(const mutate of changes) { const x=fixture();mutate(x);assert.throws(()=>checkConfiguration(x),/INTEGRATION_/); }
 assert.throws(()=>checkConfiguration({...fixture(),mode:'dormant'}),/DORMANT_SWITCH/);
 assert.throws(()=>checkConfiguration({...fixture('dormant'),mode:'activation'}),/ACTIVATION_SWITCH/);
});
test('CLI reads separate env files, refuses duplicates and never emits secret contents',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'crp-integration-config-'));
 try {
  const x=fixture(),args=['--environment','staging','--mode','activation'];
  for(const env of ['staging','production']) for(const app of ['crp','affiliate']) {
   const file=path.join(dir,env+'-'+app+'.env');fs.writeFileSync(file,Object.entries(x[env][app]).map(([k,v])=>k+'='+v).join('\n'));args.push('--'+env+'-'+app,file);
  }
  const record=path.join(dir,'release.json');fs.writeFileSync(record,JSON.stringify(x.record));args.push('--record',record);
  const run=()=>spawnSync(process.execPath,[path.join(__dirname,'affiliate-release-preflight.cjs'),...args],{encoding:'utf8'});
  const good=run();assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).productionReady,false);assert(!good.stdout.includes(x.staging.affiliate.BINDING_SECRET));
  const file=path.join(dir,'staging-affiliate.env');fs.appendFileSync(file,'\nBINDING_SECRET=private-duplicate-value');assert.throws(()=>readEnv(file),/DUPLICATE_KEY/);
  const bad=run();assert.equal(bad.status,1);assert.equal(bad.stdout,'');assert.equal(bad.stderr.trim(),'INTEGRATION_ENV_DUPLICATE_KEY');assert(!bad.stderr.includes('private-duplicate-value'));
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
