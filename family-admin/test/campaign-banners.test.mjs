import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fixtures} from './fixtures.mjs';
const assets=JSON.parse(readFileSync(new URL('../public/approved-banners-2026-10-23/manifest.json',import.meta.url))).assets;
const context={window:{},URL};vm.runInNewContext(readFileSync(new URL('../public/banner-preview.js',import.meta.url),'utf8'),context);
const validate=context.window.CRPAffiliateBannerPreview.validate;
const url='https://affiliates.creditregulatorpro.com/r/fictional-campaign';
const brief=()=>({country:'CA',referralUrl:url,banners:assets.map(a=>({...a,url:'https://affiliates.creditregulatorpro.com'+a.path,referralUrl:url,websiteHtml:'<p>Disclosed campaign copy</p>'}))});
test('admin gallery accepts only exact approved metadata and campaign-bound artwork',()=>{
 assert.equal(validate(brief()).banners.length,10);
 const staged=JSON.parse(JSON.stringify(brief()).replaceAll('https://affiliates.creditregulatorpro.com','https://affiliates-staging.creditregulatorpro.com'));assert.equal(validate(staged).banners.length,10);assert.ok(validate(staged).referralUrl.startsWith('https://affiliates-staging.'));
 for(const change of [b=>b.referralUrl='https://untrusted.example/r/fictional-campaign',b=>b.banners.forEach(a=>a.url+='?pixel=1'),b=>b.banners.forEach(a=>a.width++),b=>b.banners.forEach(a=>a.referralUrl+='-other')]){const b=brief();change(b);assert.equal(validate(b),null);}
});
test('fixed public banner routes retain original bytes while unrelated paths stay refused',async t=>{
 const f=await fixtures();t.after(()=>f.close());
 for(const a of assets){const response=await fetch(f.base+a.path);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);}
 assert.equal((await fetch(f.base+'/approved-banners-2026-10-23/banner-11.png')).status,401);
});

