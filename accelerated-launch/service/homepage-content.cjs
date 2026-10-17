'use strict';
// Public illustrations and report-access resources only. These examples never
// choose assessment rules, account addresses, payment currency or entitlements.
const REPORT_DATE='2026-10-16';
const COUNTRIES=Object.freeze({US:'United States',CA:'Canada',GB:'United Kingdom',AU:'Australia'});
const REPORTS=Object.freeze({
  US:[{bureau:'Equifax, Experian and TransUnion',title:'AnnualCreditReport.com',url:'https://www.annualcreditreport.com/index.action',note:'The official joint route for your free credit reports.'}],
  CA:[{bureau:'Equifax',title:'Equifax free report',url:'https://www.consumer.equifax.ca/personal/products/credit-score-report/',note:'Choose the free credit report and score offering.'},{bureau:'TransUnion',title:'TransUnion Consumer Disclosure',url:'https://www.transunion.ca/product/consumer-disclosure',note:'Choose the free Consumer Disclosure.'}],
  GB:[{bureau:'Equifax',title:'Equifax statutory report',url:'https://www.equifax.co.uk/products/credit/statutory-report',note:'Use the free statutory report route.'},{bureau:'Experian',title:'Experian statutory report',url:'https://www.experian.co.uk/consumer/statutory-report.html',note:'Use the free statutory report route.'},{bureau:'TransUnion',title:'TransUnion statutory report',url:'https://www.transunion.co.uk/consumer/statutory-credit-report',note:'Use the free statutory report route.'}],
  AU:[{bureau:'Equifax',title:'Equifax free credit report',url:'https://www.equifax.com.au/personal/products/equifax-free-credit-report',note:'Get your free credit report directly from Equifax.'},{bureau:'Experian',title:'Experian free credit report',url:'https://www.experian.com.au/consumer/order-credit-report',note:'Includes information previously held by illion.'}]
});
const row=(label,value)=>({label,value});
// This shared fictional scenario illustrates a finding, not a location-derived
// legal assessment. The example assumes its applicable reporting limit expired.
function example(){
  return {consumer:'John Doe',report_date:REPORT_DATE,fictional:true,qualified:false,
    badge:'Violation found',headline:'Past its limit. Still on your report.',
    explanation:'The legal reporting period has expired.',
    caption:'Fictional example · John Doe’s sample report',source:null,
    fields:[row('Account status','Default'),row('First delinquency','January 2018'),row('Still reported','October 2026')]};
}
function model(value,regions=[]){
  const rawCountry=typeof value==='string'?value:value&&typeof value==='object'?value.country:null;
  const country=Object.hasOwn(COUNTRIES,rawCountry)?rawCountry:null;
  const rawRegion=value&&typeof value==='object'&&typeof value.region==='string'?value.region:null;
  const matched=country&&rawRegion?regions.find(item=>item.country===country&&(item.value===rawRegion||item.value===country+'-'+rawRegion)):null;
  const region=matched?.value||null;
  return {ok:true,country,region,scope:country?COUNTRIES[country]:'All four countries',example:example(),free_reports:(country?REPORTS[country]:Object.entries(REPORTS).flatMap(([key,reports])=>reports.map(report=>({...report,country:key})))).map(report=>({...report,country:report.country||country})),report_access_note:country==='AU'?'A free report is available every three months. The reporting body will check your identity. Experian’s report now includes information previously held by illion.':country==='GB'?'Use the free statutory report options. The credit bureau will check your identity; some routes involve a posted access code.':country==='CA'?'Use the free report or Consumer Disclosure options. The credit bureau will check your identity.':country==='US'?'Request each bureau’s report through the official joint service. Identity checks are completed there.':'Use the official free-report route for the country your report comes from. Report access and assessment coverage are separate.'};
}
module.exports={COUNTRIES,REPORTS,REPORT_DATE,example,model};
