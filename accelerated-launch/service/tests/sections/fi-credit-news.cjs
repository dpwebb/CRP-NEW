'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const news=require('../../credit-news.cjs'),{createService}=require('../../app.cjs');
async function run(t,check){
 const now=new Date('2026-10-14T12:00:00Z');
 for(const country of Object.keys(news.COUNTRIES)){
  const result=news.select(country,now);check.ok(result.items.length>0,country+' has researched reporting');
  check.ok(result.items.every(item=>item.country===country),country+' never receives another country');
 }
 for(const country of [null,undefined,'ZZ','DE','UK','usd'])check.equal(news.select(country,now).items.length,news.ITEMS.length,'unknown/unsupported location uses all four: '+country);
 check.equal(new Set(news.ITEMS.map(item=>item.id)).size,news.ITEMS.length,'unique story identifiers');
 for(const item of news.ITEMS){check.ok(new URL(item.url).protocol==='https:','HTTPS source '+item.id);check.ok(item.date>='2021-10-14'&&item.date<='2026-10-14','eligible verified date '+item.id);}
 check.ok(!news.ITEMS.some(item=>item.id==='au-7news-2024'),'unrelated bank-error story removed');
 check.ok(news.ITEMS.every(item=>item.bureau&&item.status&&item.reviewed_at===news.REVIEWED_AT),'each story identifies bureau, outcome and source-review date');
 check.ok(news.ITEMS.some(item=>item.country==='US'&&item.type==='Media report'&&item.date.startsWith('2026')),'recent original US media reporting included');
 const mixed=news.select('ALL',now);check.ok(mixed.items.every((item,i)=>i===0||mixed.items[i-1].date>=item.date),'all-country stories ordered newest first');
 check.equal(mixed.coverage.length,4,'coverage honestly names all four countries');
 for(const country of ['CA','GB','AU'])check.equal(mixed.coverage.find(row=>row.country===country).court_decisions,0,'court-story shortfall remains explicit for '+country);
 check.equal(news.select(null,new Date('2032-01-01')).reviewed_at,news.REVIEWED_AT,'source-review date does not advance with filtering date');
 check.ok(news.select(null,new Date('2022-04-26T12:00:00Z')).items.length===0,'future publications excluded');
 check.ok(news.select('GB',new Date('2027-04-27T23:00:00Z')).items.length===1,'five-year boundary included through anniversary day');
 check.equal(news.select('GB',new Date('2027-04-28T00:00:00Z')).items.length,0,'past five-year boundary removed automatically');
 check.equal(news.select(null,new Date('2032-01-01')).items.length,0,'expired inventory never displayed');
 for(const country of ['CA','US','GB','AU',null,'DE','THROW']){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'crp-news-test-'));const service=createService({dataDir:directory,geoLocate:async()=>{if(country==='THROW')throw Error('provider unavailable');return country;},logSink:()=>{}});
  const server=http.createServer((req,res)=>service.handle(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{const base='http://127.0.0.1:'+server.address().port+'/api/credit-news';const response=await fetch(base+'?currency=usd');const data=await response.json();
   check.equal(response.status,200,'public news available '+country);check.equal(data.country,news.COUNTRIES[country]?country:null,'IP sets initial content; currency cannot override '+country);
   check.ok(data.items.every(item=>!data.country||item.country===data.country),'HTTP content scoped '+country);check.ok(!JSON.stringify(data).includes('127.0.0.1'),'response contains no visitor IP '+country);
   for(const selection of ['ALL','US','GB','CA','AU']){const selected=await(await fetch(base+'?country='+selection)).json();check.equal(selected.country,selection==='ALL'?null:selection,'consumer can choose '+selection+' from '+country);check.ok(selected.items.every(item=>selection==='ALL'||item.country===selection),'explicit country scope '+selection);}
   check.equal((await fetch(base+'?country=INVALID')).status,400,'invalid country rejected '+country);
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
 }
 for(const file of ['/credit-news.js','/credit-news.css'])check.equal((await t.request('GET',file)).status,200,'new public asset served '+file);
 const landing=await t.request('GET','/landing.html');check.ok(landing.text.includes('data-news-pause')&&landing.text.includes('data-news-window')&&landing.text.includes('data-news-country')&&landing.text.includes('aria-roledescription="carousel"'),'landing has whole-story carousel and country controls');
 const auth=(await t.request('GET','/index.html')).text;check.ok(auth.includes('id="credit-news"')&&auth.includes('data-news-auth-only'),'public auth entries include banner with workspace visibility guard');
 check.ok(auth.indexOf('src="packet-review.js"')<auth.indexOf('src="app.js"'),'packet renderer loads before application');
 return{countries:4,unknown_location:'MIXED',rolling_five_years:true,source_items:news.ITEMS.length};
}
module.exports={id:'fi-credit-news',title:'Country-selected, dated credit reporting news and public endpoint',run};
