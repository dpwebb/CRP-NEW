'use strict';
// Native UK presentation adapters. No filename, answer key or case-profile input.
const base=require('./au-disclosure-fields.cjs');
const {physicalRows,location}=require('./account-summary-table.cjs');
const {printedAmount}=require('./report-amount.cjs');
const clean=v=>String(v||'').replace(/\s+/g,' ').trim(),upper=v=>clean(v).toUpperCase();
const textOf=r=>clean(r.words.map(w=>w.text).join(' '));
function shape(text){return /United Kingdom|Jurisdiction:\s*UK\b/i.test(text)&&/Statutory Credit Report/i.test(text)&&/Account (?:number|no\.)/i.test(text)&&/Credit Account Information|Account \/ tradeline section/i.test(text)&&/Search Footprints|Collections, public records|Public Information/i.test(text);}
function fresh(kind,page,words,line){return {kind,kind_label:kind==='GENERAL_PUBLIC_RECORD'?'public record':kind==='GENERAL_INQUIRY'?'credit enquiry':kind==='GENERAL_ASSOCIATION'?'financial association':'credit account',status:'EXTRACTION_UNRESOLVED',shared_facts_status:'EXTRACTION_UNRESOLVED',facts:{},printed:{},fact_sources:{},au_fields:{},uk_source_mapping:true,location:location(page,words,line)};}
function put(record,field,reading,value=reading?.raw){base.setFact(record,field,reading,value);}
function date(record,field,reading,normalize,convention){if(!reading?.raw)return;const d=normalize(reading.raw,convention);put(record,field,reading,d.normalized);record.au_fields[field].interpretations=d.interpretations||(d.alternative?[d.normalized,d.alternative]:d.normalized?[d.normalized]:[]);}
function identity(record,reading){if(!reading?.raw)return;put(record,'account.reported_identity',reading,upper(reading.raw));put(record,'account.display_name',reading,reading.raw);}
function locator(record,reading){if(!reading?.raw)return;const safe={...reading,raw:'Source account reference [redacted]'};put(record,'account.sourceLocatorToken',safe,base.token(reading.raw));put(record,'account.masked_identifier',safe,'ACCOUNT-'+base.token(reading.raw));for(const field of ['account.sourceLocatorToken','account.masked_identifier'])record.fact_sources[field].privacy_redacted=true;}
function cardRecords(page,normalize){const rows=physicalRows(page),out=[],fences=[];
 for(let i=0;i<rows.length;i++){
  const header=rows[i];if(!/^Account number\b/i.test(textOf(header))||!/Account type/i.test(textOf(header)))continue;
  const title=rows[i-1];if(!title||header.y-title.y>25)continue;const r=fresh('GENERAL_ACCOUNT',page,title.words,title.line);identity(r,base.source(page,title.words,title.line,'Account name'));
  const keys={'ACCOUNT NUMBER':'identifier','ACCOUNT TYPE':'account.type','START DATE':'liability.openedDate','CLOSED DATE':'liability.closedDate','LAST UPDATED':'reportedAccount.reportedDate','STATUS':'account.status','DEFAULT DATE':'default.defaultDate','SETTLEMENT DATE':'account.settlementDate','CURRENT BALANCE':'account.balance','CREDIT LIMIT':'account.creditLimit','ORIGINAL AMOUNT':'account.originalAmount','ORIGINAL LENDER':'collection.originalCreditor','PAYMENT AMOUNT':'account.paymentAmount'};
  let last=header;
  for(const row of rows.slice(i,i+8)){if(/^Acct\b/i.test(textOf(row))||row!==header&&/^Account number\b/i.test(textOf(row)))break;last=row;
   for(let j=0;j<row.chunks.length-1;j+=2){const label=upper(row.chunks[j].map(w=>w.text).join(' ')),field=keys[label];if(!field)continue;
    const reading=base.source(page,row.chunks[j+1],row.line,label,row.chunks[j]);
    if(field==='identifier')locator(r,reading);else if(/Date$/.test(field))date(r,field,reading,normalize,null);else if(/balance|creditLimit|originalAmount|paymentAmount/.test(field))put(r,field,reading,printedAmount(reading.raw.replace(/\s+monthly$/i,'')));else put(r,field,reading,/status|originalCreditor/.test(field)?upper(reading.raw):reading.raw);
   }
  }
  put(r,'account.currency',{...base.source(page,title.words,title.line,'Report currency'),raw:'GBP'},'GBP');out.push(r);fences.push({page:page.page,y0:title.y-2,y1:last.y+12});
 }return {records:out,fences};}
function mixedRecords(page,normalize,convention){const rows=physicalRows(page),out=[],fences=[];
 for(let i=0;i<rows.length;i++){
  const head=rows[i],labels=head.chunks.map(c=>upper(c.map(w=>w.text).join(' ')));if(labels.join('|')!=='RECORD TYPE|SOURCE / PARTY|DATE|AMOUNT / STATUS|REPORT TEXT')continue;
  const cols=head.chunks.map(w=>({words:w,x0:w[0].x0})),groups=[];let group;
  for(const row of rows.slice(i+1)){
   if(row.y-(group?.rows.at(-1).y??head.y)>35||/^(?:Consumer statement|CIFAS|CRP-|Collections,|Detailed|Processing)/i.test(textOf(row)))break;
   const vals=cols.map((c,j)=>row.words.filter(w=>w.x0>=c.x0-1.5&&w.x1<(cols[j+1]?.x0??Infinity)-1.5));
   const category=clean(vals[0].map(w=>w.text).join(' '));
   if(/^(?:Public record|Financial association|Search|Electoral roll|CIFAS marker)$/i.test(category)){group={rows:[row],vals};groups.push(group);}else if(group&&row.y-group.rows.at(-1).y<20){group.rows.push(row);vals.forEach((v,j)=>group.vals[j].push(...v));}else break;
  }
  for(const g of groups){const src=j=>base.source(page,g.vals[j],g.rows[0].line,labels[j],cols[j].words),category=upper(src(0).raw);if(!['PUBLIC RECORD','FINANCIAL ASSOCIATION','SEARCH'].includes(category)||/^NONE REPORTED$/i.test(src(1).raw))continue;
   const kind=category==='SEARCH'?'GENERAL_INQUIRY':category==='PUBLIC RECORD'?'GENERAL_PUBLIC_RECORD':'GENERAL_ASSOCIATION',r=fresh(kind,page,g.vals.flat(),g.rows[0].line);identity(r,src(1));put(r,'account.reportRemarks',src(4));put(r,'account.status',src(3));
   if(kind==='GENERAL_INQUIRY'){date(r,'enquiry.requestDate',src(2),normalize,convention);put(r,'enquiry.purpose',src(3));}
   if(kind==='GENERAL_PUBLIC_RECORD'){date(r,'publicRecord.filedDate',src(2),normalize,convention);put(r,'publicRecord.type',{...src(1),raw:src(1).raw},src(1).raw);}
   out.push(r);
  }
  if(groups.length)fences.push({page:page.page,y0:head.y,y1:groups.at(-1).rows.at(-1).y+12});
 }return {records:out,fences};}
function publicRecords(page,normalize){const rows=physicalRows(page),out=[],fences=[];
 for(let i=0;i<rows.length;i++){
  const head=rows[i],cols=head.chunks.map(words=>({words,label:upper(words.map(w=>w.text).join(' ')),x0:words[0].x0}));
  if(!cols.some(c=>c.label==='COURT REFERENCE')||!cols.some(c=>c.label==='DATE')||!cols.some(c=>c.label==='AMOUNT'))continue;
  let last=head;
  for(const row of rows.slice(i+1)){if(row.y-last.y>40||/^(Financial Associates|Search Footprints|CIFAS|No public)/i.test(textOf(row)))break;if(/^updated$/i.test(textOf(row)))continue;
   const src=label=>{const j=cols.findIndex(c=>c.label===label);return j<0?null:base.source(page,row.words.filter(w=>w.x0>=cols[j].x0-1.5&&w.x1<(cols[j+1]?.x0??Infinity)-1.5),row.line,label,cols[j].words);};
   const type=src('TYPE'),day=src('DATE'),ref=src('COURT REFERENCE');if(!type?.raw||!day?.raw||!ref?.raw)break;
   const r=fresh('GENERAL_PUBLIC_RECORD',page,row.words,row.line);identity(r,src('COURT'));put(r,'publicRecord.type',type);date(r,'publicRecord.filedDate',day,normalize,null);put(r,'publicRecord.reference',ref);put(r,'publicRecord.amount',src('AMOUNT'),printedAmount(src('AMOUNT')?.raw));put(r,'account.status',src('STATUS'));date(r,'reportedAccount.reportedDate',src('LAST')||src('LAST UPDATED'),normalize,null);out.push(r);last=row;
  }if(last!==head)fences.push({page:page.page,y0:head.y,y1:last.y+12});
 }return {records:out,fences};}
function extract(pages,normalize){const records=[],fences=[],all=pages.map(p=>p.text||p.lines?.map(l=>l.text).join('\n')||'').join('\n'),convention=/DD\/MM\/YYYY/i.test(all)?'DDMM':null;
 for(const page of pages){if(page.source!=='NATIVE_TEXT'||!page.words?.length)continue;
  const table=base.tableRecords(page,normalize,convention),cards=cardRecords(page,normalize),mixed=mixedRecords(page,normalize,convention),pub=publicRecords(page,normalize);
  for(const r of table.records){r.uk_source_mapping=true;delete r.au_source_mapping;
   const key=r.au_fields?.['account.keyDates'];if(key){const settled=/\bSettled\s+(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(key.raw);if(settled)date(r,'account.settlementDate',{...key,label:'Settled',raw:settled[1]},normalize,convention);const def=/\bdefault date\s+(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(key.raw);if(def)date(r,'default.defaultDate',{...key,label:'Default date',raw:def[1]},normalize,convention);}
  }
  records.push(...table.records,...cards.records,...mixed.records,...pub.records);fences.push(...table.fences,...cards.fences,...mixed.fences,...pub.fences);
 }
 // Source-owned original-lender names link only to a unique same-report account.
 for(const r of records){const key=r.au_fields?.['account.keyDates'],explicit=r.au_fields?.['collection.originalCreditor'];const name=explicit?.raw||/Original creditor\s+(.+)$/i.exec(key?.raw||'')?.[1];if(!name)continue;
  const candidates=records.filter(other=>other!==r&&other.kind==='GENERAL_ACCOUNT'&&upper(other.facts['account.reported_identity'])===upper(name));if(candidates.length!==1)continue;const original=candidates[0];
  put(r,'collection.originalCreditor',explicit||{...key,label:'Original creditor',raw:name},upper(name));if(original.au_fields?.['account.sourceLocatorToken']){put(r,'collection.sourceOriginalLocator',original.au_fields['account.sourceLocatorToken'],original.facts['account.sourceLocatorToken']);r.fact_sources['collection.sourceOriginalLocator'].privacy_redacted=true;}
 }
 return {records,fences,convention};}
module.exports={shape,extract};
