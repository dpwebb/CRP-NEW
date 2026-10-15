'use strict';
// Curated reporting, not assessment rules. Dates are publication/decision dates;
// reviewed_at records the source review and never advances with the age filter.
const REVIEWED_AT = '2026-10-14';
const ITEMS = Object.freeze([
  {id:'us-equifax-settlement-2026',country:'US',date:'2026-08-26',type:'Media report',bureau:'Equifax',source:'Kiplinger',title:'Proposed settlement over inaccurate credit scores',summary:'Reporting describes a proposed $100 million settlement over a coding error that allegedly affected borrowing costs and credit decisions.',status:'Preliminary approval only; final approval remains pending. Equifax denies wrongdoing.',url:'https://www.kiplinger.com/personal-finance/credit-score/equifax-100-million-settlement-over-credit-score-error',status_url:'https://www.equifaxfaircreditreportingsettlement.com/'},
  {id:'us-propublica-2026',country:'US',date:'2026-03-10',type:'Media report',bureau:'Credit bureaus',source:'ProPublica',title:'Wrong debt threatened home plans',summary:'An accountant reported disputed student debt threatening a home purchase despite repeated disputes.',status:'Consumer account.',url:'https://www.propublica.org/article/credit-report-mistakes-cfpb-experian-transunion'},
  // CBC blocks automated reads. Text/date were cross-checked against its credited
  // Yahoo syndication and Atin Ito republication; the card links to original CBC.
  {id:'ca-cbc-2026',country:'CA',date:'2026-02-23',type:'Media report',bureau:'Equifax and TransUnion',source:'CBC Go Public',title:'Consumers faced long fights to correct bureau records',summary:'Consumers described mixed files and fraudulent debts that returned after disputes. One reported a mortgage denial and estimated an $11,000 loss after an 11-month correction delay.',status:'The $11,000 is a consumer estimate, not a court award. CBC reported corrections after its inquiries.',url:'https://www.cbc.ca/news/gopublic/credit-ratings-fraud-9.7099030',verification_url:'https://www.atinitonews.com/2026/02/edmonton-woman-frustrated-by-18-month-battle-with-equifax-and-transunion-to-fix-credit-rating/'},
  {id:'us-equifax-2025',country:'US',date:'2025-01-17',type:'Regulatory action',bureau:'Equifax',source:'Consumer Financial Protection Bureau',title:'Equifax ordered to pay $15 million over dispute investigations',summary:'The CFPB found ignored evidence, errors returning to files and inaccurate scores shared with lenders. Incorrect records can affect credit, housing and employment decisions.',status:'Regulatory consent order. The civil penalty is not an individual consumer damages award.',url:'https://www.consumerfinance.gov/enforcement/actions/equifax-inc-and-equifax-information-services-llc/'},
  {id:'au-savings-2024',country:'AU',date:'2024-09-11',type:'Media report',bureau:'illion',source:'Savings.com.au',title:'Outdated entries and repeated disputes burdened a consumer',summary:'Savings.com.au inspected an illion report containing an account that should have expired. The consumer described years of disputes and stress; the article illustrates possible extra refinancing costs.',status:'Reported experience. The refinancing costs are examples, not the consumer’s proven loss or a court award.',url:'https://www.savings.com.au/news/credit-reporting-errors-preventing-home-ownership-dreams'},
  {id:'us-transunion-2023',country:'US',date:'2023-10-18',type:'Court settlement order',bureau:'TransUnion Rental Screening',source:'CFPB · US District Court, Colorado',title:'Settlement addressed misleading tenant records',summary:'Regulators alleged inaccurate eviction records led to housing denials, extra fees and higher rent. A court order required $11 million in consumer relief and a $4 million penalty.',status:'Entered settlement order; the companies neither admitted nor denied the allegations.',url:'https://www.consumerfinance.gov/enforcement/actions/transunion-rental-screening-solutions-inc-and-trans-union-llc/'},
  {id:'us-sessa-2023',country:'US',date:'2023-07-17',type:'Court decision',bureau:'TransUnion',source:'US Court of Appeals, Second Circuit',title:'Sessa: a lease option appeared as a debt',summary:'The court described a $19,444 payment on a TransUnion report that the lease did not require. It overturned dismissal and returned the case for further proceedings.',status:'The 2023 appeal returned the case for further proceedings; it did not decide liability or damages.',url:'https://www.govinfo.gov/content/pkg/USCOURTS-ca2-22-00087/pdf/USCOURTS-ca2-22-00087-0.pdf'},
  {id:'gb-guardian-2022',country:'GB',date:'2022-04-27',type:'Media report',bureau:'TransUnion and Equifax',source:'The Guardian',title:'Mixed files cut borrowing access',summary:'A stranger’s records caused a 98% credit-limit cut. Equifax paid £350.',status:'Consumer account.',url:'https://www.theguardian.com/money/2022/apr/27/a-mysterious-stranger-has-trashed-my-credit-rating'}
].map(item => Object.freeze({...item,reviewed_at:REVIEWED_AT})));
const COUNTRIES=Object.freeze({US:'United States',GB:'United Kingdom',CA:'Canada',AU:'Australia'});
function select(country, now = new Date()) {
  const end=new Date(now); if(!Number.isFinite(end.getTime()))throw Error('Invalid news date');
  const cutoff=new Date(end);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-5);
  const day=end.toISOString().slice(0,10), first=cutoff.toISOString().slice(0,10);
  const eligible=ITEMS.filter(item=>item.date>=first&&item.date<=day);
  const resolved=Object.hasOwn(COUNTRIES,country)?country:null;
  const rows=eligible.filter(item=>!resolved||item.country===resolved).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  const coverage=Object.entries(COUNTRIES).map(([key,name])=>{
    const entries=eligible.filter(item=>item.country===key);
    return {country:key,name,items:entries.length,court_decisions:entries.filter(item=>item.type.startsWith('Court')).length,media_reports:entries.filter(item=>item.type==='Media report').length};
  });
  return {ok:true,country:resolved,scope:resolved?COUNTRIES[resolved]:'All four countries',as_of:day,reviewed_at:REVIEWED_AT,items:rows,coverage};
}
module.exports={ITEMS,COUNTRIES,REVIEWED_AT,select};
