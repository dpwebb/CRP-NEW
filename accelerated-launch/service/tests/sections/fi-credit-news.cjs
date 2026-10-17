'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const news=require('../../credit-news.cjs'),{createService}=require('../../app.cjs');
async function run(t,check){
 const now=new Date('2026-10-14T12:00:00Z');
 for(const country of Object.keys(news.COUNTRIES)){
  const result=news.select(country,now);check.ok(result.items.length>0,country+' has researched reporting');
  check.ok(result.items.every(item=>item.country===country),country+' never receives another country');
  check.ok(result.items.length>=3&&result.items.length<=10,country+' supplies three or more verified stories within the ten-story ceiling');
 }
 const injected=Object.keys(news.COUNTRIES).flatMap(country=>Array.from({length:15},(_,i)=>({id:'fictional-'+country+'-'+i,country,date:'2026-09-'+String(i+1).padStart(2,'0'),type:'Fictional test only',url:'https://example.test/'+country+'/'+i,title:'Fictional cap fixture',summary:'Isolated fictional catalogue data.'})));
 injected.push({...injected[14],id:'fictional-duplicate-url'}, {...injected[13],url:'https://example.test/duplicate-id'}, {...injected[12],id:'fictional-future',date:'2099-01-01'}, {...injected[11],id:'fictional-expired',date:'2000-01-01'});
 const source=fs.readFileSync(require.resolve('../../credit-news.cjs'),'utf8');
 const sandbox={module:{exports:{}}};vm.runInNewContext(source.replace('const ITEMS = Object.freeze([','const ITEMS = Object.freeze(['+injected.map(row=>JSON.stringify(row)).join(',')+','),sandbox);
 const bounded=sandbox.module.exports;
 for(const country of Object.keys(news.COUNTRIES)){
  const items=bounded.select(country,now).items;
  check.equal(items.length,10,country+' more than three rotates through ten unique stories');
  check.equal(new Set(items.map(row=>row.id)).size,10,country+' cap has no repeated IDs');
  check.equal(new Set(items.map(row=>row.url)).size,10,country+' cap has no repeated source URLs');
  check.ok(items.every(row=>row.country===country),country+' larger catalogue remains country isolated');
  check.ok(items.every(row=>!['fictional-future','fictional-expired'].includes(row.id)),country+' expired and future stories never fill the carousel');
 }
 const fallback=bounded.select(null,now);for(const country of Object.keys(news.COUNTRIES))check.equal(fallback.items.filter(row=>row.country===country).length,10,'unknown-IP fallback still caps each country independently: '+country);
 for(const country of [null,undefined,'ZZ','DE','UK','usd'])check.equal(news.select(country,now).items.length,news.ITEMS.length,'unknown/unsupported location uses all four: '+country);
 check.equal(new Set(news.ITEMS.map(item=>item.id)).size,news.ITEMS.length,'unique story identifiers');
 for(const item of news.ITEMS){check.ok(new URL(item.url).protocol==='https:','HTTPS source '+item.id);check.ok(item.date>='2021-10-14'&&item.date<='2026-10-14','eligible verified date '+item.id);}
 check.ok(!news.ITEMS.some(item=>item.id==='au-7news-2024'),'unrelated bank-error story removed');
 check.ok(news.ITEMS.every(item=>item.bureau&&item.status&&/^\d{4}-\d{2}-\d{2}$/.test(item.reviewed_at)&&Number.isFinite(Date.parse(item.reviewed_at+'T00:00:00Z'))&&new Date(item.reviewed_at+'T00:00:00Z').toISOString().slice(0,10)===item.reviewed_at&&item.reviewed_at<=news.REVIEWED_AT),'each story identifies bureau, outcome and its valid source-review date no later than the catalogue review');
 const replacement=news.ITEMS.find(item=>item.id==='ca-cpbc-transunion-2026');
 check.ok(!news.ITEMS.some(item=>item.id==='ca-cbc-2026'||item.url.includes('credit-ratings-fraud-9.7099030')),'inaccessible CBC card is replaced rather than duplicated');
 check.equal(replacement?.url,'https://www.consumerprotectionbc.ca/news/news-release-consumer-protection-bc-enforcement-transunion-disputed-credit-information/','Canadian replacement links directly to the verified regulator source');
 check.equal(replacement?.date,'2026-05-12','replacement uses the source publication date');
 check.equal(replacement?.reviewed_at,'2026-10-17','replacement retains its actual source-review date');
 check.equal(replacement?.type,'Regulatory action','regulator findings are not represented as a court award');
 check.ok(replacement?.status.includes('not compensation'),'administrative penalties are not portrayed as consumer compensation');
 check.ok(replacement?.summary.includes('all six cases were corrected only after it intervened')&&replacement.summary.includes('$16,500 in penalties'),'approved summary preserves the correction outcome and penalty attribution');
 check.ok(replacement?.summary.split(/\s+/).length<=100,'replacement fits the existing one-hundred-word excerpt limit');
 check.equal(news.select('CA',now).items[0]?.id,replacement?.id,'new Canadian regulator story is first under unchanged newest-first ordering');
 const retained=['us-equifax-settlement-2026','us-propublica-2026','us-equifax-2025','au-savings-2024','us-transunion-2023','us-sessa-2023','gb-guardian-2022'];
 for(const id of retained)check.equal(news.ITEMS.find(item=>item.id===id)?.reviewed_at,'2026-10-14','retained story keeps its actual earlier source review: '+id);
 for(const id of ['au-choice-2024','au-oaic-review-2022'])check.equal(news.ITEMS.find(item=>item.id===id)?.reviewed_at,'2026-10-16','new Australian reference story binds its new source review: '+id);
 check.ok(news.ITEMS.some(item=>item.country==='US'&&item.type==='Media report'&&item.date.startsWith('2026')),'recent original US media reporting included');
 const mixed=news.select('ALL',now);check.ok(mixed.items.every((item,i)=>i===0||mixed.items[i-1].date>=item.date),'all-country stories ordered newest first');
 check.equal(mixed.coverage.length,4,'coverage honestly names all four countries');
 for(const country of ['CA','GB','AU'])check.equal(mixed.coverage.find(row=>row.country===country).court_decisions,0,'court-story shortfall remains explicit for '+country);
 check.equal(news.select(null,new Date('2032-01-01')).reviewed_at,news.REVIEWED_AT,'source-review date does not advance with filtering date');
 check.ok(news.select(null,new Date('2022-04-26T12:00:00Z')).items.length===0,'future publications excluded');
 check.ok(news.select('GB',new Date('2027-04-27T23:00:00Z')).items.some(row=>row.id==='gb-guardian-2022'),'five-year boundary included through anniversary day');
 check.ok(!news.select('GB',new Date('2027-04-28T00:00:00Z')).items.some(row=>row.id==='gb-guardian-2022'),'past five-year boundary removed automatically without removing newer stories');
 for(const item of news.ITEMS.filter(row=>row.date_precision==='year'))check.equal(item.date_label,item.date.slice(0,4),'year-only decision never claims an invented publication day: '+item.id);
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
 const landing=await t.request('GET','/landing.html');check.ok(landing.text.includes('data-news-window')&&landing.text.includes('aria-roledescription="carousel"'),'landing retains accessible whole-story carousel');
 check.ok(!landing.text.includes('data-news-pause')&&!landing.text.includes('data-news-country'),'public carousel uses manual navigation and IP localization without visible overrides');
 const auth=(await t.request('GET','/index.html')).text;check.ok(auth.includes('id="credit-news"')&&auth.includes('data-news-auth-only'),'public auth entries include banner with workspace visibility guard');
 check.ok(auth.indexOf('src="packet-review.js"')<auth.indexOf('src="app.js"'),'packet renderer loads before application');
 return{countries:4,unknown_location:'MIXED',rolling_five_years:true,source_items:news.ITEMS.length};
}
module.exports={id:'fi-credit-news',title:'Country-selected, dated credit reporting news and public endpoint',run};
