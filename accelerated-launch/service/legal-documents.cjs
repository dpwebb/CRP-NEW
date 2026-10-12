'use strict';
const fs=require('node:fs'),path=require('node:path');
const location=require('./pricing-location.cjs');
const rows=require('../launch-matrix.json').regions.map(({country,region,name})=>({country,region,name}));
const CONFIG=require('./legal-documents/owner-config.json');
const COUNTRIES=Object.freeze({US:'United States',CA:'Canada',GB:'United Kingdom',AU:'Australia'});
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function regionFor(country,value){const token=normalize(value);return rows.find(r=>r.country===country&&(normalize(r.region)===token||normalize(r.region.split('-')[1])===token||normalize(r.name)===token))?.region||null;}
function adultAge(country,region){
 if(country==='GB'||country==='AU')return 18;
 if(!rows.some(r=>r.country===country&&r.region===region))return null;
 if(country==='CA')return ['CA-AB','CA-MB','CA-ON','CA-PE','CA-QC','CA-SK'].includes(region)?18:19;
 if(country==='US')return region==='US-MS'?21:['US-AL','US-NE'].includes(region)?19:18;
 return null;
}
async function jurisdictionFromIp(ip,{countryLookup=location.countryFromIp,fetcher=fetch}={}){
 if(!ip||!location.publicIp(ip))return{country:null,region:null};
 let country;try{country=await countryLookup(ip);}catch{return{country:null,region:null};}
 if(!COUNTRIES[country])return{country:null,region:null};
 let region=null;
 if(['CA','US'].includes(country))try{
  const response=await fetcher('https://get.geojs.io/v1/ip/geo/'+encodeURIComponent(ip)+'.json',{signal:AbortSignal.timeout(1500),redirect:'error'});
  if(response.ok){const geo=await response.json();if(geo.ip===ip&&geo.country_code===country)region=regionFor(country,geo.region);}
 }catch{}
 return{country,region};
}
function resolver(lookup=jurisdictionFromIp){return async req=>{try{const found=await lookup(location.visitorIp(req));const country=COUNTRIES[found?.country]?found.country:null;const region=country?regionFor(country,found?.region):null;return{country,region,adult_age:adultAge(country,region)};}catch{return{country:null,region:null,adult_age:null};}};}
function addressReady(address){return Boolean(address&&address.status==='ACTIVE_VERIFIED'&&typeof address.address==='string'&&address.address.trim().length>10&&typeof address.verification_reference==='string'&&address.verification_reference.trim());}
function document(kind,jurisdiction,config=CONFIG){
 if(!['privacy','terms'].includes(kind))return{status:404,json:{ok:false,error:{code:'NOT_FOUND',message:'That document does not exist.'}}};
 const country=jurisdiction.country;if(!COUNTRIES[country])return{status:503,json:{ok:false,error:{code:'LEGAL_LOCATION_UNAVAILABLE',message:'We could not determine the regional document. Contact support@creditregulatorpro.com.'}}};
 const address=config.mailing_addresses[country];if(!addressReady(address))return{status:503,json:{ok:false,error:{code:'LEGAL_DOCUMENT_NOT_PUBLISHED',message:'This regional document is not yet published. Contact support@creditregulatorpro.com.'}}};
 const content=JSON.parse(fs.readFileSync(path.join(__dirname,'legal-documents',country.toLowerCase()+'-'+kind+'.json'),'utf8'));
 const age=adultAge(country,jurisdiction.region);const ageText=age===null?'CRP is for adults. You must have reached the age of majority in your province or state.':'CRP is for adults. The general age of majority for the location identified by your IP is '+age+' years.';
 return{status:200,json:{ok:true,document:{...content,business_name:config.business_name,support_email:config.support_email,effective_date:config.effective_date,country_name:COUNTRIES[country],region:jurisdiction.region,adult_age:age,mailing_address:address.address,sections:[...content.sections,{title:'Adults using CRP',text:ageText},{title:'Contact',text:config.business_name+'. '+address.address+'. Email: '+config.support_email+'.'}].map(s=>Array.isArray(s)?{title:s[0],text:s[1]}:s)}}};
}
module.exports={COUNTRIES,CONFIG,regionFor,adultAge,jurisdictionFromIp,resolver,addressReady,document};
