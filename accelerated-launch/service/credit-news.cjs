'use strict';
// Curated reporting, not assessment rules. Dates refer to the linked publication/decision.
const ITEMS = Object.freeze([
  {id:'au-savings-2024',country:'AU',date:'2024-09-11',type:'Media report',source:'Savings.com.au',title:'Disputed bureau entries can delay home borrowing',summary:'Savings.com.au examined an illion report with an account that should have expired, and a consumer’s repeated correction disputes. Its refinancing examples illustrate possible financial costs of delays, rather than damages awarded to that consumer.',url:'https://www.savings.com.au/news/credit-reporting-errors-preventing-home-ownership-dreams'},
  {id:'ca-cbc-2026',country:'CA',date:'2026-02-24',type:'Media report',source:'CBC Go Public, republished by Atin Ito',title:'Consumers describe long fights to correct bureau records',summary:'Reporting describes disputed debts returning to Equifax and TransUnion files. One consumer estimated an $11,000 mortgage-rate loss after an 11-month correction delay; this is his estimate, not a court award.',url:'https://www.atinitonews.com/2026/02/edmonton-woman-frustrated-by-18-month-battle-with-equifax-and-transunion-to-fix-credit-rating/'},
  {id:'gb-guardian-2022',country:'GB',date:'2022-04-27',type:'Media report',source:'The Guardian',title:'Mixed records affected borrowing',summary:'Reporting linked TransUnion and Equifax file confusion to a sharp credit-limit reduction.',url:'https://www.theguardian.com/money/2022/apr/27/a-mysterious-stranger-has-trashed-my-credit-rating'},
  {id:'au-7news-2024',country:'AU',date:'2024-06-02',type:'Media report',source:'7NEWS',title:'A small card balance put a home-loan application at risk',summary:'7NEWS reported missed-payment entries and distress following a bank oversight. NAB apologised and asked credit bureaus to restore the file. The report attributes the original error to the bank, not a court finding against a bureau.',url:'https://7news.com.au/news/sam-was-told-he-could-be-denied-a-home-loan-because-he-owed-2-on-his-citibank-credit-card-c-14823501'},
  {id:'us-equifax-2025',country:'US',date:'2025-01-17',type:'Regulatory action',source:'Consumer Financial Protection Bureau',title:'Equifax ordered to pay $15 million over dispute investigations',summary:'The CFPB found failures including ignored evidence and errors returning to files. Its order describes possible higher borrowing costs and denial of credit, housing or employment. The penalty is not an individual consumer damages award.',url:'https://www.consumerfinance.gov/enforcement/actions/equifax-inc-and-equifax-information-services-llc/'},
  {id:'us-sessa-2023',country:'US',date:'2023-07-17',type:'Court decision',source:'US Court of Appeals, Second Circuit',title:'Sessa: a lease option appeared as a debt',summary:'The court described a $19,444 balloon payment on a TransUnion report that the lease did not require. It overturned dismissal and returned the case for further proceedings; this decision did not award damages or decide final liability.',url:'https://www.govinfo.gov/content/pkg/USCOURTS-ca2-22-00087/pdf/USCOURTS-ca2-22-00087-0.pdf'},
  {id:'us-transunion-2023',country:'US',date:'2023-10-18',type:'Court settlement order',source:'Federal Trade Commission · US District Court, Colorado',title:'TransUnion tenant-screening accuracy settlement',summary:'The settlement required $11 million for consumer relief and a $4 million penalty. Regulators alleged misleading eviction records caused housing denials and additional costs. The companies neither admitted nor denied the allegations.',url:'https://www.ftc.gov/legal-library/browse/cases-proceedings/182-3204-transunion-rental-screening-solutions-inc-trans-union-llc-ftc-cfpb-v'}
].map(Object.freeze));
const COUNTRIES={CA:'Canada',US:'United States',GB:'United Kingdom',AU:'Australia'};
function select(country, now = new Date()) {
  const end=new Date(now); if(!Number.isFinite(end.getTime()))throw Error('Invalid news date');
  const cutoff=new Date(end);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-5);
  const day=end.toISOString().slice(0,10), first=cutoff.toISOString().slice(0,10);
  const eligible=ITEMS.filter(item=>item.date>=first&&item.date<=day);
  const resolved=Object.hasOwn(COUNTRIES,country)?country:null;
  const rows=eligible.filter(item=>!resolved||item.country===resolved).sort((a,b)=>b.date.localeCompare(a.date));
  // Interleave countries for the mixed fallback instead of showing a US block.
  const buckets=Object.keys(COUNTRIES).map(key=>rows.filter(item=>item.country===key)), mixed=[];
  while(buckets.some(bucket=>bucket.length))for(const bucket of buckets)if(bucket.length)mixed.push(bucket.shift());
  return {ok:true,country:resolved,scope:resolved?COUNTRIES[resolved]:'All four countries',as_of:day,items:resolved?rows:mixed};
}
module.exports={ITEMS,COUNTRIES,select};
