'use strict';
// Bounded native Canadian and US table/card families. Only measured report
// fields are read; fixture instructions and expected-output sections are fences.
const base=require('./au-disclosure-fields.cjs');
const {physicalRows,location}=require('./account-summary-table.cjs');
const {printedAmount}=require('./report-amount.cjs');
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const upper=v=>clean(v).toUpperCase();
const text=r=>clean(r.words.map(w=>w.text).join(' '));
const chunk=c=>clean((c||[]).map(w=>w.text).join(' '));
const STOP=/^(?:Seeded Parser Errors|Expected Flags|Processing guardrails|Consumer supplied evidence|Detailed account notes as they appear|Consumer statement and dispute history|Alerts, Disclosures|Account Review and Other Inquiries|Public Records|Credit Inquiries|Inquiries|Collection Information|Collections|File Summary|Additional Identification Items|Credit Account Details|Accounts -|Page \d)/i;
function shape(t){return /Canadian Consumer Disclosure/i.test(t)&&/Canada\s*-\s*[A-Za-z ]+\|\s*Report reference:/i.test(t)&&/File Summary/i.test(t)&&/Credit Account Details/i.test(t)&&/Account number/i.test(t)&&/Condition\s+.*Payment status/i.test(t)&&/Credit Inquiries/i.test(t);}
function adminShape(t){return /^\s*Canada\s*-/im.test(t)&&/Source style\s*:/i.test(t)&&/Report locator/i.test(t)&&/Account \/ tradeline section/i.test(t)&&/Account no\./i.test(t)&&/Status as reported/i.test(t)&&/Collections, public records, inquiries/i.test(t);}
function supports(t){return shape(t)||/\bCanada\b|\bJurisdiction:\s*(?:CA|US)\b|United States|SYNTHETIC EQUIFAX-STYLE/i.test(t);}
function fresh(kind,page,words,line){return {kind,kind_label:kind==='GENERAL_COLLECTION'?'collection':kind==='GENERAL_INQUIRY'?'credit enquiry':kind==='GENERAL_PUBLIC_RECORD'?'public record':kind==='GENERAL_FILE_SUMMARY'?'file summary':kind==='GENERAL_IDENTITY'?'personal information':'credit account',status:'EXTRACTION_UNRESOLVED',shared_facts_status:'EXTRACTION_UNRESOLVED',facts:{},printed:{},fact_sources:{},au_fields:{},north_america_source_mapping:true,location:location(page,words,line)};}
function put(r,field,s,value=s?.raw){base.setFact(r,field,s,value);}
function identity(r,s){if(!s?.raw)return;put(r,'account.reported_identity',s,upper(s.raw));put(r,'account.display_name',s,s.raw);}
function locator(r,s){if(!s?.raw||/^(?:-|N\/A)$/i.test(s.raw))return;const safe={...s,raw:'Source account reference [redacted]'};put(r,'account.sourceLocatorToken',safe,base.token(s.raw));put(r,'account.masked_identifier',safe,'ACCOUNT-'+base.token(s.raw));r.fact_sources['account.sourceLocatorToken'].privacy_redacted=true;r.fact_sources['account.masked_identifier'].privacy_redacted=true;}
function date(r,field,s,normalize){if(!s?.raw)return;const value=normalize(s.raw,null);base.setFact(r,field,s,value.normalized,value.precision);r.au_fields[field].interpretations=value.interpretations||(value.alternative?[value.normalized,value.alternative]:value.normalized?[value.normalized]:[]);}
function money(r,field,s){if(!s?.raw)return;put(r,field,s,printedAmount(s.raw));const currency=/\b(CAD|USD|GBP|AUD)\b/i.exec(s.raw)?.[1]?.toUpperCase();if(currency)put(r,'account.currency',{...s,raw:currency,label:'Printed currency'},currency);}
function cells(page,row,cols){return cols.map((c,j)=>base.source(page,row.words.filter(w=>w.x0>=c.x0-1.5&&w.x1<=(cols[j+1]?.x0??Infinity)-1.5),row.line,c.label,c.words));}
const TABLE_FIELDS={'COURT':'identity','COURT OR SOURCE':'identity','TYPE':'type','FILED':'filed','DATE FILED':'filed','STATUS':'status','REFERENCE':'reference','AMOUNT':'amount','AGENCY':'identity','ORIGINAL CREDITOR':'original','ACCOUNT':'locator','ASSIGNED':'assigned','REPORTED':'reported','ORIGINAL AMOUNT':'originalAmount','BALANCE':'balance','REMARKS':'remarks','DATE':'date','REQUESTER':'identity','SUBSCRIBER':'identity','PURPOSE':'purpose','TYPE OF INQUIRY':'inquiryType','TELEPHONE':'phone','DISPLAY':'display','MEMBER NUMBER':'member','MEMBER NAME':'identity','PHONE':'phone','MAY AFFECT SCORES':'scores','AUTHORIZATION':'authorized','AUTHORIZED':'authorized'};
function tables(page,normalize){const rows=physicalRows(page),records=[],fences=[];
 for(let i=0;i<rows.length;i++){
  const head=rows[i],cols=head.chunks.map(words=>({words,label:upper(chunk(words)),x0:words[0].x0}));cols.forEach(c=>c.key=TABLE_FIELDS[c.label]);
  const keys=cols.map(c=>c.key),kind=keys.includes('filed')&&keys.includes('reference')?'GENERAL_PUBLIC_RECORD':keys.includes('original')&&keys.includes('locator')&&keys.includes('assigned')?'GENERAL_COLLECTION':keys.includes('date')&&keys.includes('identity')&&(keys.includes('purpose')||keys.includes('scores'))?'GENERAL_INQUIRY':null;
  if(!kind||cols.some(c=>!c.key))continue;
  const groups=[];let last;
  for(const row of rows.slice(i+1)){
   if(STOP.test(text(row))||row.y-(last?.rows.at(-1).y??head.y)>35)break;
   const sources=cells(page,row,cols),get=k=>sources[keys.indexOf(k)]?.raw||'';
   if(/^No record|^None reported/i.test(get('identity')))break;
   const d=get('filed')||get('assigned')||get('date'),usable=normalize(d,null);
   if(get('identity')&&(usable.normalized||usable.interpretations?.length)){last={rows:[row],sources};groups.push(last);}
   else if(last&&row.y-last.rows.at(-1).y<19&&!sources.some((s,j)=>s.raw&&['filed','assigned','date','locator','balance','amount'].includes(keys[j]))){last.rows.push(row);sources.forEach((s,j)=>{if(s.raw){const words=row.words.filter(w=>w.x0>=cols[j].x0-1.5&&w.x1<=(cols[j+1]?.x0??Infinity)-1.5);const earlier=last.sources[j];last.sources[j]={...earlier,raw:clean(earlier.raw+' '+s.raw),location:location(page,[...last.rows.flatMap(r=>r.words.filter(w=>w.x0>=cols[j].x0-1.5&&w.x1<=(cols[j+1]?.x0??Infinity)-1.5))],last.rows[0].line,{words:cols[j].words,line:head.line,raw:cols[j].label})};}});}
   else break;
  }
  for(const g of groups){const r=fresh(kind,page,g.rows.flatMap(r=>r.words),g.rows[0].line),s=k=>g.sources[keys.indexOf(k)];identity(r,s('identity'));put(r,'account.status',s('status'),upper(s('status')?.raw));put(r,'account.reportRemarks',s('remarks'));locator(r,s('locator'));
   if(kind==='GENERAL_PUBLIC_RECORD'){put(r,'publicRecord.type',s('type'));put(r,'publicRecord.reference',s('reference'));date(r,'publicRecord.filedDate',s('filed'),normalize);money(r,'publicRecord.amount',s('amount'));}
   if(kind==='GENERAL_COLLECTION'){put(r,'collection.originalCreditor',s('original'),upper(s('original')?.raw));date(r,'collection.assignedDate',s('assigned'),normalize);date(r,'collection.lastReportedDate',s('reported'),normalize);money(r,'account.balance',s('balance'));money(r,'account.originalAmount',s('originalAmount'));}
   if(kind==='GENERAL_INQUIRY'){date(r,'enquiry.requestDate',s('date'),normalize);put(r,'enquiry.organisation',s('identity'));put(r,'enquiry.purpose',s('purpose'));put(r,'enquiry.authorized',s('authorized'));put(r,'enquiry.affectsScores',s('scores'));put(r,'enquiry.display',s('display'));put(r,'enquiry.memberNumber',s('member'));}
   records.push(r);
  }
  if(groups.length)fences.push({page:page.page,y0:head.y-1,y1:groups.at(-1).rows.at(-1).y+12});
 }
 return {records,fences};
}
const CARD_FIELDS={'ACCOUNT NUMBER':'locator','TYPE':'account.type','OPENED':'liability.openedDate','REPORTED':'reportedAccount.reportedDate','CONDITION':'account.status','PAYMENT STATUS':'account.paymentStatus','DATE CLOSED':'liability.closedDate','HIGH CREDIT / LIMIT':'account.creditLimit','BALANCE':'account.balance','ORIGINAL AMOUNT':'account.originalAmount','RATING':'account.ratingCode','PAST DUE':'account.pastDueAmount','RESPONSIBILITY':'account.responsibility','LAST PAYMENT':'tradeline.lastPaymentDate','DATE OF FIRST DELINQUENCY':'tradeline.firstDelinquencyDate','CREDIT LIMIT':'account.creditLimit','LAST REPORTED':'reportedAccount.reportedDate','AMOUNT PAST DUE':'account.pastDueAmount','AMOUNT WRITTEN OFF':'account.writtenOffAmount','PAYMENT RESPONSIBILITY':'account.responsibility'};
function detailedCards(pages,normalize){const records=[],fences=[];let active=null;
 for(const page of pages){const rows=physicalRows(page);let fence=null,historyCols=null;
  for(let i=0;i<rows.length;i++){
   const row=rows[i],labels=row.chunks.map(c=>upper(chunk(c))),card=labels[0]==='ACCOUNT NUMBER'&&labels.includes('TYPE'),overview=labels.includes('ACCOUNT NUMBER')&&labels.includes('HIGHEST BALANCE')&&labels.includes('RATING CODE');
   if(card||overview){const title=rows[i-(overview?2:1)];if(!title||title.words[0].x0>row.words[0].x0+10||STOP.test(text(title)))continue;
    if(fence)fences.push(fence);active=fresh('GENERAL_ACCOUNT',page,title.chunks[0],title.line);identity(active,base.source(page,title.chunks[0],title.line,'Creditor / account name'));records.push(active);fence={page:page.page,y0:title.y-2,y1:row.y+12};historyCols=null;
    if(overview){const cols=row.chunks.map(words=>({words,label:upper(chunk(words)),x0:words[0].x0})),value=rows[i+1];if(value){const s=cells(page,value,cols),at=l=>s[cols.findIndex(c=>c.label===l)];locator(active,at('ACCOUNT NUMBER'));
     const notes=cols.find(c=>c.label==='NOTES'),noteWords=value.words.filter(w=>w.x0>=notes.x0-1.5&&!/^\d{3}[A-Z]{2}\d{5}$|^[RIOCM][1-9]$/.test(w.text));
     put(active,'account.reportRemarks',base.source(page,noteWords,value.line,'Notes',notes.words));
     const rating=value.words.filter(w=>/^[RIOCM][1-9]$/.test(w.text));if(rating.length===1)put(active,'account.ratingCode',base.source(page,rating,value.line,'Rating Code',cols.find(c=>c.label==='RATING CODE').words));
     const member=value.words.filter(w=>/^\d{3}[A-Z]{2}\d{5}$/.test(w.text));if(member.length===1)put(active,'account.memberNumber',base.source(page,member,value.line,'Member Number',cols.find(c=>c.label==='MEMBER NUMBER').words));fence.y1=value.y+12;i++;}continue;}
   }
   if(!active)continue;
   if(STOP.test(text(row))&&!card){active=null;historyCols=null;if(fence){fences.push(fence);fence=null;}continue;}
   if(labels.join('|')==='MONTH|BALANCE|CREDIT LIMIT|HIGH CREDIT|PAST DUE|PAYMENT')historyCols=row.chunks.map(words=>({words,label:upper(chunk(words)),x0:words[0].x0}));
   if(historyCols){const s=cells(page,row,historyCols),period=normalize(s[0]?.raw,null).normalized;if(period?.length===7){const payment=s[5];if(payment?.raw&&printedAmount(payment.raw)!=null){const field='account.datedPaymentAmounts',old=active.facts[field]||[],reading={...payment,raw:clean((active.au_fields[field]?.raw||'')+' '+s[0].raw+' '+payment.raw)};put(active,field,reading,[...old,{period,amount:printedAmount(payment.raw),period_location:s[0].location,location:payment.location,trusted:payment.trusted&&s[0].trusted}]);}}
   }
   for(let j=0;j<row.chunks.length-1;j++){
    const label=labels[j],field=CARD_FIELDS[label];if(!field)continue;const s=base.source(page,row.chunks[j+1],row.line,label,row.chunks[j]);if(CARD_FIELDS[upper(s.raw)])continue;
    if(field==='locator')locator(active,s);else if(/Date$/.test(field))date(active,field,s,normalize);else if(/balance|creditLimit|Amount/.test(field))money(active,field,s);else put(active,field,s,field==='account.status'?upper(s.raw):s.raw);j++;
   }
   if(fence)fence.y1=row.y+12;else if(active&&row.words[0].x0<530)fence={page:page.page,y0:row.y-1,y1:row.y+12};
  }
  if(fence)fences.push(fence);
 }
 return {records,fences};
}
const COLLECTION_FIELDS={'DATE ASSIGNED':'collection.assignedDate','MEMBER NAME':'collection.originalCreditor','MEMBER NUMBER':'collection.memberNumber','FIRST DELINQUENCY':'tradeline.firstDelinquencyDate','ACCOUNT NUMBER':'locator','AMOUNT':'account.originalAmount','STATUS':'account.status','BALANCE':'account.balance','DATE PAID/SETTLED':'collection.paidDate','LAST PAYMENT DATE':'tradeline.lastPaymentDate'};
function collectionCards(page,normalize){const rows=physicalRows(page),records=[],fences=[];let active=null,fence=null,inCollections=false;
 for(let i=0;i<rows.length;i++){const row=rows[i],first=upper(chunk(row.chunks[0]));if(first==='COLLECTIONS'&&row.words[0].x0<100){inCollections=true;continue;}if(!inCollections)continue;
  if(STOP.test(first)&&first!=='COLLECTIONS'){if(fence)fences.push(fence);active=null;fence=null;inCollections=false;continue;}
  const field=COLLECTION_FIELDS[first];if(!field)continue;
  if(field==='collection.assignedDate'){if(fence)fences.push(fence);const title=rows.slice(0,i).reverse().find(r=>r.words[0].x0===row.words[0].x0&&!COLLECTION_FIELDS[upper(chunk(r.chunks[0]))]&&!/^(?:Collections|Public Records|Bankruptcy|Judgments|Consolidated|Debt Recovery|Page )/i.test(chunk(r.chunks[0]))&&row.y-r.y<32);if(!title)continue;active=fresh('GENERAL_COLLECTION',page,title.chunks[0],title.line);identity(active,base.source(page,title.chunks[0],title.line,'Collection agency'));records.push(active);fence={page:page.page,y0:title.y-2,y1:row.y+12};}
  if(!active)continue;const value=row.chunks[1];if(!value)continue;let s=base.source(page,value,row.line,first,row.chunks[0]);
  // Rotated watermark words have their own positions and are outside the value
  // column. Never concatenate them or an adjacent field into a scalar date.
  if(/Date$/.test(field)){const m=/^\d{4}\/\d{2}\/\d{2}\b/.exec(s.raw);if(!m)continue;s={...s,raw:m[0]};date(active,field,s,normalize);}
  else if(field==='locator')locator(active,s);else if(/balance|Amount/.test(field))money(active,field,s);else put(active,field,s,field==='collection.originalCreditor'?upper(s.raw):s.raw);fence.y1=row.y+12;
 }if(fence)fences.push(fence);return {records,fences};
}
function personalAndSummary(pages,normalize){const records=[],fences=[];let primary=null,extra=null;
 for(const page of pages){const rows=physicalRows(page);
  for(let i=0;i<rows.length;i++){const row=rows[i],labels=row.chunks.map(c=>upper(chunk(c)));
   if(labels[0]==='DATE OF BIRTH'&&row.chunks[1]){const s=base.source(page,row.chunks[1],row.line,'Date of birth',row.chunks[0]);if(normalize(s.raw,null).normalized)primary=s;}
   if(labels[0]==='BIRTH DATE'&&row.chunks[1]&&/Additional Identification Items/i.test(rows.slice(0,i).map(text).join('\n'))){const s=base.source(page,row.chunks[1],row.line,'Additional birth date',row.chunks[0]);if(normalize(s.raw,null).normalized)extra=s;}
   if(labels[0]==='TOTAL ACCOUNTS'&&labels.includes('OPEN ACCOUNTS')&&labels.includes('CLOSED ACCOUNTS')){const cols=row.chunks.map(words=>({words,label:upper(chunk(words)),x0:words[0].x0})),next=rows[i+1];if(!next)continue;const s=cells(page,next,cols),r=fresh('GENERAL_FILE_SUMMARY',page,next.words,next.line);for(const [label,field]of [['TOTAL ACCOUNTS','summary.totalAccounts'],['OPEN ACCOUNTS','summary.openAccounts'],['CLOSED ACCOUNTS','summary.closedAccounts'],['COLLECTIONS','summary.collections'],['INQUIRIES 3 YRS','summary.inquiries']]){const v=s[cols.findIndex(c=>c.label===label)];if(/^\d+$/.test(v?.raw))put(r,field,v,Number(v.raw));}records.push(r);}
  }
 }
 if(primary&&extra){const r=fresh('GENERAL_IDENTITY',pages.find(p=>p.page===primary.location.page),[],primary.location.line);r.location=primary.location;date(r,'identity.primaryBirthDate',primary,normalize);date(r,'identity.additionalBirthDate',extra,normalize);records.push(r);}
 return {records,fences};
}
function narrative(pages,normalize){const records=[],fences=[],all=[];
 for(const page of pages){const heights=page.words.map(w=>w.y1-w.y0).filter(v=>v>0).sort((a,b)=>a-b),bodyHeight=heights[Math.floor(heights.length/4)];for(const row of physicalRows(page)){const words=row.words.filter(w=>w.y1-w.y0<=bodyHeight*1.3);if(words.length)all.push({page,row,words,text:chunk(words)});}}
 for(let i=0;i<all.length;i++){const start=all[i],m=/^(.+?)\s+(?:\(\d{3}\)\s*[\d-]+\s+)?last reported to us in\s+([\d/]+)\s+rating your\s+(mortgage|revolving|installment)\b/i.exec(start.text);if(!m)continue;let end=i+1;while(end<all.length&&!/last reported to us in|PUBLIC RECORDS AND OTHER/i.test(all[end].text))end++;
  const group=all.slice(i,end),body=group.map(v=>v.text).join(' '),id=/Your account number is\s+([Xx.*\d]+)/i.exec(body);if(!id)continue;
  const idRow=group.find(v=>v.text.includes(id[1]));if(!idRow)continue;
  const r=fresh('GENERAL_ACCOUNT',start.page,start.words,start.row.line);identity(r,{...base.source(start.page,start.words,start.row.line,'Creditor / account name'),raw:clean(m[1])});locator(r,{...base.source(idRow.page,idRow.words,idRow.row.line,'Account number'),raw:id[1]});put(r,'account.type',{...base.source(start.page,start.words,start.row.line,'Account type'),raw:m[3]},upper(m[3]));
  const findReading=needle=>{const hits=group.filter(v=>needle.test(v.text));if(!hits.length)return null;const first=hits[0],same=hits.filter(v=>v.page.page===first.page.page);return base.source(first.page,same.flatMap(v=>v.words),first.row.line,'Payment Profile of Account');};
  const range=/From\s+(\d{4}\/\d{2}\/\d{2})\s+to\s+(\d{4}\/\d{2}\/\d{2})\s+there has been\s+(\d+)\s+reportings/i.exec(body);
  if(range){const s=findReading(/From\s+\d{4}\/|account with a monthly|monthly frequency/);if(s){put(r,'account.historySummaryWindow',s,{from:normalize(range[1],null).normalized,to:normalize(range[2],null).normalized,count:Number(range[3]),frequency:/monthly(?: payment)? frequency/i.test(body)?'MONTHLY':null});}}
  const late=[...body.matchAll(/(\d{4}\/\d{2}\/\d{2}):([2-9])/g)].map(v=>({date:normalize(v[1],null).normalized,code:v[2]}));const lateSource=findReading(/\d{4}\/\d{2}\/\d{2}:[2-9]/);if(late.length&&lateSource)put(r,'account.historyDatedLateCodes',lateSource,late);
  const counters=[...body.matchAll(/has been\s+(2|3|4 or more)\s+payment periods past due\s+(\d+)\s+times?/gi)].map(v=>({periods:v[1],count:Number(v[2])}));const counterSource=findReading(/has been [234].*payment periods past due/);if(counters.length&&counterSource)put(r,'account.historyLateCounters',counterSource,counters);
  records.push(r);for(const p of new Set(group.map(v=>v.page)))fences.push({page:p.page,y0:group.find(v=>v.page===p).row.y-1,y1:group.filter(v=>v.page===p).at(-1).row.y+12});i=end-1;
 }
 return {records,fences};}
function reference(pages,normalize){const candidates=[];for(const page of pages)for(const row of physicalRows(page)){const value=text(row),m=/\b(?:Report date|Prepared date|Date prepared|Request Date)\s*:?\s*(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/i.exec(value);if(!m)continue;const d=normalize(m[1],null),s=base.source(page,row.words,row.line,'Report date');candidates.push({raw:m[1],normalized:d.normalized||null,normalized_value:d.normalized||null,status:d.normalized?'RESOLVED':'EXTRACTION_UNRESOLVED',reason:d.reason||null,precision:d.precision,interpretations:d.interpretations||(d.normalized?[d.normalized]:[]),location:s.location});}
 if(candidates.length&&new Set(candidates.map(v=>v.raw)).size===1)return candidates[0];return null;}
function narrativeReference(pages){for(const page of pages){const rows=physicalRows(page);for(let i=0;i<rows.length;i++){const heading=rows[i];if(!/disclosure of your personal credit file as of\s*$/i.test(text(heading)))continue;const value=rows[i+1],m=/^(\d{1,2}\/\d{1,2}\/\d{2})\s+follows\b/i.exec(value?text(value):'');if(!m||value.y-heading.y>24)continue;const s=base.source(page,value.words,value.line,'Personal credit file as of',heading.words);return {raw:m[1],raw_value:m[1],normalized:null,normalized_value:null,status:'EXTRACTION_UNRESOLVED',reason:'NARRATIVE_COVER_DATE_REQUIRES_YEAR_CONVENTION',interpretations:[],location:s.location};}}return null;}
function enrichPinned(extraction,model,normalize){const pages=bodyPages((model.pages||[]).filter(p=>p.has_native_text&&p.word_boxes?.length).map(p=>({page:p.page,source:'NATIVE_TEXT',words:p.word_boxes,text:p.text}))),ref=reference(pages,normalize),records=extraction.records||[];
 let active=null,columns=[];
 for(const page of pages){const rows=physicalRows(page);columns=[];for(const row of rows){const hits=records.filter(r=>r.facts['account.display_name']&&row.chunks.some(c=>upper(chunk(c))===upper(r.facts['account.display_name'])));if(hits.length===1){active=hits[0];columns=[];}
   const month=row.words.filter(w=>/^Month$/i.test(w.text)),payments=row.words.filter(w=>/^Payment$/i.test(w.text));if(month.length&&month.length===payments.length)columns=month.map((m,i)=>({month:m,payment:payments[i],end:month[i+1]?.x0??Infinity}));
   if(active&&columns.length)for(const c of columns){const periodWords=row.words.filter(w=>w.x0>=c.month.x0-1&&w.x0<c.month.x0+35&&/^\d{2}\/\d{4}$/.test(w.text)),amountWords=row.words.filter(w=>w.x0>=c.payment.x0-1&&w.x1<c.end-1&&/^\$[\d,.]+$/.test(w.text));if(periodWords.length!==1||amountWords.length!==1)continue;const period=normalize(periodWords[0].text,null).normalized,amount=printedAmount(amountWords[0].text),s=base.source(page,amountWords,row.line,'Payment history amount',[c.payment]),ps=base.source(page,periodWords,row.line,'Payment history month',[c.month]);if(period&&amount!=null){if(!active.au_fields)active.au_fields={};const old=active.facts['account.datedPaymentAmounts']||[];put(active,'account.datedPaymentAmounts',s,[...old,{period,amount,trusted:s.trusted&&ps.trusted,location:s.location,period_location:ps.location}]);}}
  }
 }
 const mapped=extract(pages,normalize),inquiries=mapped.records.filter(r=>r.kind==='GENERAL_INQUIRY');for(const r of inquiries){r.record_index=Math.max(0,...records.map(r=>r.record_index))+1;r.bureau=extraction.bureau||'Equifax';r.report_segment_id='segment-1';r.report_reference_date=ref||extraction.reference_date;records.push(r);}
 // Continue only the same printed inquiry schema across its contiguous pages.
 let inquiryCols=null,inInquiry=false;for(const page of pages){for(const row of physicalRows(page)){const labels=row.chunks.map(c=>upper(chunk(c)));if(labels.includes('DATE')&&labels.includes('MEMBER NUMBER')&&labels.includes('MEMBER NAME')&&labels.includes('MAY AFFECT SCORES')){inInquiry=true;inquiryCols=row.chunks.map(words=>({words,label:upper(chunk(words)),x0:words[0].x0,page:page.page}));continue;}
   if(inInquiry&&/^Public Records|^Collections$/i.test(chunk(row.chunks[0]))){inInquiry=false;inquiryCols=null;}
   if(!inquiryCols||!/^\d{4}\/\d{2}\/\d{2}$/.test(row.words[0]?.text||''))continue;if(inquiries.some(r=>r.location.page===page.page&&Math.abs(r.location.bbox.y0-row.y)<2))continue;
   const s=cells(page,row,inquiryCols),at=l=>s[inquiryCols.findIndex(c=>c.label===l)];if(!/^\d{3}[A-Z]{2}\d{5}$/.test(at('MEMBER NUMBER')?.raw))continue;const r=fresh('GENERAL_INQUIRY',page,row.words,row.line);identity(r,at('MEMBER NAME'));date(r,'enquiry.requestDate',at('DATE'),normalize);put(r,'enquiry.memberNumber',at('MEMBER NUMBER'));put(r,'enquiry.affectsScores',at('MAY AFFECT SCORES'));r.record_index=Math.max(0,...records.map(r=>r.record_index))+1;r.bureau=extraction.bureau||'Equifax';r.report_segment_id='segment-1';r.report_reference_date=ref||extraction.reference_date;records.push(r);
  }}
 if(ref)for(const r of records){if(r.report_reference_date?.normalized_value===ref.normalized_value)r.report_reference_date=ref;}
 return extraction;}
function bodyPages(pages){return pages.map(p=>{
 const heights=(p.words||[]).map(w=>w.y1-w.y0).filter(h=>h>0).sort((a,b)=>a-b),maximum=heights.at(-1),bands=new Map();
 for(const height of heights.filter(h=>h<=maximum/1.8)){const band=Math.round(height*2)/2;bands.set(band,(bands.get(band)||0)+1);}
 const body=[...bands].sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0]?.[0]||heights[Math.floor(heights.length/2)];
 // Native watermark glyphs can outnumber the actual report words. Use the
 // smaller measured text band in these explicit table/card families, retaining
 // original coordinates and bytes. This is neither OCR nor edited-upload input.
 return body&&heights.at(-1)>body*2?{...p,words:p.words.filter(w=>w.y1-w.y0<=body*1.8)}:p;
});}
function mixed(page,normalize){const rows=physicalRows(page),records=[],fences=[];for(let i=0;i<rows.length;i++){const head=rows[i],cols=head.chunks.map(words=>({words,label:upper(chunk(words)),x0:words[0].x0}));if(cols.map(c=>c.label).join('|')!=='RECORD TYPE|SOURCE / PARTY|DATE|AMOUNT / STATUS|REPORT TEXT')continue;let last=head;const groups=[];let group;
 for(const row of rows.slice(i+1)){if(STOP.test(text(row))||row.y-last.y>35)break;const s=cells(page,row,cols),category=upper(s[0].raw);if(/^(?:Inquiry|Identity \/ alias|Collection note|Public record)$/i.test(category)){group={rows:[row],sources:s};groups.push(group);}else if(group&&row.y-last.y<19&&!s[0].raw){group.rows.push(row);s.forEach((value,j)=>{if(value.raw){group.sources[j].raw=clean(group.sources[j].raw+' '+value.raw);group.sources[j].location=location(page,group.rows.flatMap(r=>r.words.filter(w=>w.x0>=cols[j].x0-1.5&&w.x1<=(cols[j+1]?.x0??Infinity)-1.5)),group.rows[0].line,{words:cols[j].words,line:head.line,raw:cols[j].label});}});}else break;last=row;}
 for(const g of groups){const s=g.sources,category=upper(s[0].raw);if(/^NONE REPORTED$/i.test(s[1].raw)||category==='COLLECTION NOTE')continue;const r=fresh(category==='INQUIRY'?'GENERAL_INQUIRY':category==='IDENTITY / ALIAS'?'GENERAL_IDENTITY':'GENERAL_PUBLIC_RECORD',page,g.rows.flatMap(r=>r.words),g.rows[0].line);identity(r,s[1]);put(r,'account.reportRemarks',s[4]);put(r,'account.status',s[3]);if(r.kind==='GENERAL_INQUIRY'){date(r,'enquiry.requestDate',s[2],normalize);put(r,'enquiry.organisation',s[1]);put(r,'enquiry.purpose',s[3]);}records.push(r);}if(groups.length)fences.push({page:page.page,y0:head.y-1,y1:last.y+12});
 }return {records,fences};}
function extract(pages,normalize){const records=[],fences=[],usable=bodyPages(pages.filter(p=>p.source==='NATIVE_TEXT'&&p.words?.length));
 for(const page of usable){const native=tables(page,normalize),admin=base.tableRecords(page,normalize,null),cards=collectionCards(page,normalize),other=mixed(page,normalize);
  for(const r of admin.records){delete r.au_source_mapping;r.north_america_source_mapping=true;const amounts=Object.entries(r.au_fields).filter(([f])=>/balance|Amount/.test(f));delete r.facts['account.currency'];delete r.fact_sources['account.currency'];delete r.printed['account.currency'];delete r.au_fields['account.currency'];for(const [,s]of amounts){const currency=/\b(CAD|USD|GBP|AUD)\b/i.exec(s.raw)?.[1]?.toUpperCase();if(currency)put(r,'account.currency',{...s,raw:currency,label:'Printed currency'},currency);}
   const key=r.au_fields['account.keyDates'];if(key){for(const [label,field]of [['DOFD','tradeline.firstDelinquencyDate'],['last payment','tradeline.lastPaymentDate'],['last reported','reportedAccount.reportedDate'],['Assigned','collection.assignedDate']]){const m=new RegExp('\\b'+label+'\\s+(\\d{4}-\\d{2}-\\d{2})','i').exec(key.raw);if(m)date(r,field,{...key,raw:m[1],label},normalize);}const orig=/\boriginal\s+(.+)$/i.exec(key.raw);if(orig){r.kind='GENERAL_COLLECTION';put(r,'collection.originalCreditor',{...key,raw:orig[1],label:'Original creditor'},upper(orig[1]));}}
  }
  // Tables are admitted by distinct schemas, so one native public row is read once.
  const owned=admin.records.filter(r=>![...native.fences,...other.fences].some(f=>r.location.bbox.y0>=f.y0&&r.location.bbox.y0<=f.y1));records.push(...native.records,...owned,...cards.records,...other.records);fences.push(...native.fences,...admin.fences,...cards.fences,...other.fences);
 }
 const details=detailedCards(usable,normalize),personal=personalAndSummary(usable,normalize),prose=narrative(usable,normalize);records.push(...details.records,...personal.records,...prose.records);fences.push(...details.fences,...personal.fences,...prose.fences);
 // A unique, explicit original-creditor name is a qualified relationship, never
 // an exact account identity assertion or a licence to merge/delete records.
 for(const r of records.filter(r=>r.kind==='GENERAL_COLLECTION')){const original=r.au_fields['collection.originalCreditor'];if(!original)continue;const matches=records.filter(o=>o.kind==='GENERAL_ACCOUNT'&&upper(o.facts['account.reported_identity'])===upper(original.raw));if(matches.length===1){put(r,'collection.linkedOriginalName',original,upper(original.raw));}}
 return {records,fences};
}
module.exports={shape,adminShape,supports,extract,fresh,put,identity,locator,date,money,bodyPages,reference,narrativeReference,enrichPinned};
