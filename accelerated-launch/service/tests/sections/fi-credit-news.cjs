'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const news=require('../../credit-news.cjs'),{createService}=require('../../app.cjs');
async function run(t,check){
 const now=new Date('2026-10-11T12:00:00Z');
 for(const country of Object.keys(news.COUNTRIES)){
  const result=news.select(country,now);check.ok(result.items.length>0,country+' has researched reporting');
  check.ok(result.items.every(item=>item.country===country),country+' never receives another country');
 }
 for(const country of [null,undefined,'ZZ','DE','UK','usd'])check.equal(news.select(country,now).items.length,news.ITEMS.length,'unknown/unsupported location uses all four: '+country);
 check.equal(new Set(news.ITEMS.map(item=>item.id)).size,news.ITEMS.length,'unique story identifiers');
 for(const item of news.ITEMS){check.ok(new URL(item.url).protocol==='https:','HTTPS source '+item.id);check.ok(item.date>='2021-10-11'&&item.date<='2026-10-11','eligible verified date '+item.id);}
 check.ok(news.select(null,new Date('2022-04-26T12:00:00Z')).items.length===0,'future publications excluded');
 check.ok(news.select('GB',new Date('2027-04-27T23:00:00Z')).items.length===1,'five-year boundary included through anniversary day');
 check.equal(news.select('GB',new Date('2027-04-28T00:00:00Z')).items.length,0,'past five-year boundary removed automatically');
 check.equal(news.select(null,new Date('2032-01-01')).items.length,0,'expired inventory never displayed');
 for(const country of ['CA','US','GB','AU',null,'DE','THROW']){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'crp-news-test-'));const service=createService({dataDir:directory,geoLocate:async()=>{if(country==='THROW')throw Error('provider unavailable');return country;},logSink:()=>{}});
  const server=http.createServer((req,res)=>service.handle(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/credit-news?currency=usd&country=US');const data=await response.json();
   check.equal(response.status,200,'public news available '+country);check.equal(data.country,news.COUNTRIES[country]?country:null,'IP country controls content; query/currency cannot override '+country);
   check.ok(data.items.every(item=>!data.country||item.country===data.country),'HTTP content scoped '+country);check.ok(!JSON.stringify(data).includes('127.0.0.1'),'response contains no visitor IP '+country);
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
 }
 for(const file of ['/credit-news.js','/credit-news.css'])check.equal((await t.request('GET',file)).status,200,'new public asset served '+file);
 const landing=await t.request('GET','/landing.html');check.ok(landing.text.includes('data-news-pause')&&landing.text.includes('data-news-window'),'landing has scroll and pause controls');
 check.ok(!(await t.request('GET','/index.html')).text.includes('id="credit-news"'),'authenticated/auth workspace excludes news');
 return{countries:4,unknown_location:'MIXED',rolling_five_years:true,source_items:news.ITEMS.length};
}
module.exports={id:'fi-credit-news',title:'Country-selected, dated credit reporting news and public endpoint',run};
