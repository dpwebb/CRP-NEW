'use strict';

// Source-measured Australian disclosure tables/cards. This reader has no case,
// filename, expected-finding or processing-instruction inputs.
const crypto = require('node:crypto');
const { physicalRows, location } = require('./account-summary-table.cjs');
const { printedAmount } = require('./report-amount.cjs');
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const upper = value => clean(value).toUpperCase();
const token = value => crypto.createHash('sha256').update(upper(value)).digest('hex');
const LABELS = {
  'CREDITOR / ACCOUNT':'identity', 'CREDITOR':'identity', 'CREDIT PROVIDER':'identity',
  'AGENCY':'identity', 'COURT':'identity', 'TYPE':'type', 'ACCOUNT TYPE':'type', 'CREDIT TYPE':'type',
  'ACCOUNT':'identifier', 'ACCOUNT NO.':'identifier', 'ACCOUNT NUMBER':'identifier',
  'OPENED':'opened', 'OPENED DATE':'opened', 'CLOSED':'closed', 'CLOSED DATE':'closed',
  'STATUS':'status', 'STATUS AS REPORTED':'status', 'BALANCE':'balance', 'CURRENT BALANCE':'balance',
  'CREDIT LIMIT':'limit', 'LIMIT':'limit', 'ORIGINAL AMOUNT':'originalAmount',
  'MINIMUM PAYMENT':'payment', 'PAYMENT':'payment', 'LAST UPDATED':'updated', 'REPORTED':'updated',
  'DEFAULT DATE':'defaultDate', 'DEFAULT AMOUNT':'defaultAmount', 'PAID DATE':'paidDate',
  'FILED':'filed', 'REFERENCE':'reference', 'AMOUNT':'amount', 'INDICATOR':'indicator',
  'MONTHS DISPLAYED':'periodRange', 'DATE':'date', 'APPLICATION TYPE':'purpose',
  'AMOUNT REQUESTED':'requestedAmount', 'ROLE':'role', 'SUBSCRIBER':'identity',
  'PURPOSE':'purpose', 'AUTHORIZED':'authorized', 'AUTHORISED':'authorized', 'AUTHORIZATION':'authorized',
  'KEY DATES':'keyDates', 'REMARKS AS SHOWN ON REPORT':'remarks', 'REMARKS':'remarks',
  'RECORD TYPE':'category', 'SOURCE / PARTY':'identity', 'AMOUNT / STATUS':'amountStatus', 'REPORT TEXT':'remarks'
};
const BOUNDARY = /^(?:Identification Information|Credit Rating|Credit Account Information|Credit Enquiries|Financial Hardship Information|Defaults|Serious Credit Infringements|Public Record Information|Access Information|Consumer statement and dispute history|Consumer supplied evidence references|Processing guardrails for this PDF|Detailed account notes as they appear in the synthetic disclosure|Account \/ tradeline section|Collections, public records, inquiries, searches, or markers|PUBLIC RECORDS|COURT AND INSOLVENCY RECORDS|COURT JUDGMENTS AND INSOLVENCY|INQUIRIES|CREDIT ENQUIRIES|PAYMENT HISTORY AND REMARKS|COLLECTIONS|DEFAULT AND COLLECTION INFORMATION|COLLECTION AND DEFAULT LISTINGS)$/i;

function disclosureShape(text) {
  return /\bAUSTRALIA(?:N)?\b|\bJurisdiction:\s*AU\b/i.test(text)
    && /\b(?:CONSUMER CREDIT REPORT|COMPREHENSIVE CREDIT REPORT|CONSUMER DISCLOSURE)\b/i.test(text)
    && /(?:Credit Account Information|Account \/ tradeline section)/i.test(text)
    && /(?:Credit Enquiries|Defaults|Repayment history information)/i.test(text)
    && /(?:Account number|Account no\.)/i.test(text) && /\b(?:Opened|Status)\b/i.test(text);
}

function columnWords(row, columns, index) {
  const start = columns[index].x0 - 1.5, end = (columns[index + 1]?.x0 ?? Infinity) - 1.5;
  return row.words.filter(word => word.x0 >= start && word.x1 <= end);
}
function source(page, words, line, label, headerWords = []) {
  const loc = location(page, words, line, headerWords.length ? { words:headerWords, line, raw:label } : null);
  return { raw:clean(words.map(word => word.text).join(' ')), label, location:loc,
    trusted:loc.trusted && headerWords.every(word => word.trusted !== false) };
}
function record(kind, page, words, line) {
  return { kind, kind_label:kind === 'GENERAL_PUBLIC_RECORD' ? 'public record' : kind === 'GENERAL_INQUIRY' ? 'credit enquiry' : 'credit account',
    status:'EXTRACTION_UNRESOLVED', shared_facts_status:'EXTRACTION_UNRESOLVED', facts:{}, printed:{}, fact_sources:{},
    location:location(page,words,line), au_source_mapping:true, au_fields:{} };
}
function setFact(record, field, reading, value, precision) {
  if (!reading || !reading.raw) return;
  const trusted = reading.trusted === true;
  const resolved = trusted && value != null;
  record.au_fields[field] = { ...reading, normalized:value, precision:precision || null };
  record.printed[field] = { raw:reading.raw, label:reading.label, normalized:resolved ? value : null,
    status:resolved ? 'RESOLVED':'EXTRACTION_UNRESOLVED', state:resolved ? 'VALUE':'UNRESOLVED',
    location:reading.location, trusted, precision:precision || null };
  record.fact_sources[field] = { raw_value:reading.raw, normalized_value:resolved ? value:null,
    source_field:reading.label, location:reading.location, trusted:resolved, caption_count:1,
    status:resolved ? 'RESOLVED':'EXTRACTION_UNRESOLVED', ...(precision ? { precision }: {}) };
  if (resolved) {record.facts[field] = value;record.status='RESOLVED';record.shared_facts_status='RESOLVED';}
}
function readIdentifier(record, reading) {
  if (!reading?.raw || /^(?:N\/A|NONE|NOT REPORTED|-)$/i.test(reading.raw)) return;
  const key = token(reading.raw);
  // The original stays in the owned upload. Only a stable exact-source token and
  // a redacted locator are retained in derived facts and public evidence.
  const safe = {...reading,raw:'Source account reference [redacted]'};
  setFact(record,'account.sourceLocatorToken',safe,key);
  record.fact_sources['account.sourceLocatorToken'].privacy_redacted=true;
  setFact(record,'account.masked_identifier',safe,'ACCOUNT-'+key);
  record.fact_sources['account.masked_identifier'].privacy_redacted = true;
}
function setDate(record, field, reading, normalize, convention) {
  if (!reading?.raw) return;
  const date = normalize(reading.raw, convention);
  setFact(record,field,reading,date.normalized,date.precision);
  record.au_fields[field].interpretations = date.interpretations || (date.alternative ? [date.normalized,date.alternative] : date.normalized ? [date.normalized]:[]);
  record.au_fields[field].reason = date.reason || null;
}
function datesIn(reading, normalize, convention) {
  const values = [];
  const re = /\b(Closed|Sold|Default listed|Paid|Last updated|Updated|Enquiry)\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/gi;
  for (const match of reading.raw.matchAll(re)) values.push({label:match[1],reading:{...reading,raw:match[2],label:match[1]},date:normalize(match[2],convention)});
  return values;
}
function populate(target, cells, normalize, convention) {
  const identity = cells.identity || cells.type;
  if (identity) {
    setFact(target,'account.reported_identity', {...identity,label:'Creditor / record name'},upper(identity.raw));
    setFact(target,'account.display_name', {...identity,label:'Creditor / record name'},identity.raw);
  }
  if (cells.identifier) readIdentifier(target,cells.identifier);
  for (const [name, field] of Object.entries({status:'account.status',type:'account.type',purpose:'enquiry.purpose',authorized:'enquiry.authorized',remarks:'account.reportRemarks',category:'report.category',indicator:'hardship.indicator',role:'account.role'})) {
    if (cells[name]) setFact(target,field,cells[name],name === 'status' ? upper(cells[name].raw):cells[name].raw);
  }
  for (const [name,field] of Object.entries({balance:'account.balance',limit:'account.creditLimit',payment:'account.paymentAmount',originalAmount:'account.originalAmount',defaultAmount:'default.originalAmount',requestedAmount:'enquiry.requestedAmount',amount:'publicRecord.amount'})) {
    if (!cells[name]) continue;
    setFact(target,field,cells[name],printedAmount(cells[name].raw));
    if (target.facts[field] != null) {
      const currency=/\b(AUD|CAD|USD|GBP)\b/i.exec(cells[name].raw)?.[1].toUpperCase()||(/£/.test(cells[name].raw)?'GBP':/€/.test(cells[name].raw)?'EUR':'AUD');
      setFact(target,'account.currency',{...cells[name],raw:/\b(AUD|CAD|USD|GBP)\b|[£€]/i.test(cells[name].raw)?currency:'$ (Australian report)',label:'Printed currency and source country'},currency);
    }
  }
  for (const [name,field] of Object.entries({opened:'liability.openedDate',closed:'liability.closedDate',updated:'reportedAccount.reportedDate',defaultDate:'default.defaultDate',paidDate:'default.paidDate',filed:'publicRecord.filedDate',date:'enquiry.requestDate'})) setDate(target,field,cells[name],normalize,convention);
  if (cells.periodRange) {
    setFact(target,'hardship.periodRange',cells.periodRange,cells.periodRange.raw);
    const months = [...cells.periodRange.raw.matchAll(/([A-Za-z]{3,9}\s+\d{4})/g)].map(match=>normalize(match[1],null).normalized).filter(Boolean);
    if (months.length === 2) setFact(target,'hardship.periods',cells.periodRange,months);
  }
  if(cells.keyDates)setFact(target,'account.keyDates',cells.keyDates,cells.keyDates.raw);
  if (cells.keyDates) for (const item of datesIn(cells.keyDates,normalize,convention)) {
    const field = /^Closed$/i.test(item.label) ? 'liability.closedDate' : /^Sold$/i.test(item.label) ? 'account.soldDate' : /Default/i.test(item.label) ? 'default.defaultDate' : /^Paid$/i.test(item.label) ? 'default.paidDate' : /^Enquiry$/i.test(item.label) ? 'enquiry.requestDate':'reportedAccount.reportedDate';
    setDate(target,field,item.reading,normalize,convention);
  }
}

function tableSchema(columns) {
  const keys = columns.map(column=>column.key);
  if (keys.includes('category') && keys.includes('identity') && keys.includes('amountStatus')) return 'MIXED';
  if (keys.includes('defaultDate') && keys.includes('defaultAmount')) return 'DEFAULT';
  if (keys.includes('indicator') && keys.includes('periodRange')) return 'HARDSHIP';
  if (keys.includes('filed') && keys.includes('reference')) return 'PUBLIC';
  if (keys.includes('identity') && keys.includes('date') && (keys.includes('purpose') || keys.includes('role'))) return 'INQUIRY';
  if (keys.includes('keyDates') && keys.includes('balance') && keys.includes('identifier')) return 'ACCOUNT';
  return null;
}
function tableRecords(page, normalize, convention) {
  const rows = physicalRows(page), records = [], fences=[];
  for (let index=0;index<rows.length;index++) {
    const header=rows[index];
    const columns=header.chunks.map(words=>({words,label:clean(words.map(word=>word.text).join(' ')),x0:words[0].x0}));
    columns.forEach(column=>column.key=LABELS[upper(column.label)]);
    const schema=tableSchema(columns);
    if (!schema || columns.some(column=>!column.key)) continue;
    // The existing summary-table reader already owns these standard enquiry
    // rows and their report-segment fences. Do not replace its measured rows.
    if(schema==='INQUIRY' && columns.some(column=>upper(column.label)==='SUBSCRIBER'))continue;
    const groups=[]; let last=null;
    for (let next=index+1;next<rows.length;next++) {
      const row=rows[next],text=clean(row.words.map(word=>word.text).join(' '));
      if (BOUNDARY.test(text) || row.y-(last?.rows.at(-1).y??header.y)>35 || /Page\s+\d|consumer file copy/i.test(text)) break;
      const values=columns.map((_,i)=>columnWords(row,columns,i));
      const get=key=>clean(values[columns.findIndex(column=>column.key===key)]?.map(word=>word.text).join(' ')||'');
      const id=get('identifier'), name=get('identity'), day=get('date')||get('defaultDate')||get('filed');
      const dayReading=normalize(day,convention),usableDay=Boolean(dayReading.normalized||dayReading.interpretations?.length);
      const start = schema === 'ACCOUNT' ? Boolean(id && name)
        : schema === 'HARDSHIP' ? Boolean(id && name)
          : schema === 'MIXED' ? /^(?:Enquiry|Default information|RHI)$/i.test(get('category')) && Boolean(name)
            : schema === 'PUBLIC' ? Boolean(get('type') && usableDay && !/^No /i.test(get('type')))
              : Boolean(name && (id || usableDay) && !/^No /i.test(name));
      if (start) { last={rows:[row],values};groups.push(last);continue; }
      if (!last || /^No\b/i.test(text) || row.y-last.rows.at(-1).y>19) break;
      // A wrap may extend text cells, never provide another row's identifier/date.
      if (values.some((words,i)=>words.length && ['identifier','date','defaultDate','filed','opened','balance','defaultAmount'].includes(columns[i].key))) break;
      last.rows.push(row);values.forEach((words,i)=>last.values[i].push(...words));
    }
    for (const group of groups) {
      const cells=Object.fromEntries(columns.map((column,i)=>[column.key,source(page,group.values[i],group.rows[0].line,column.label,column.words)]));
      const category=upper(cells.category?.raw),kind=schema==='PUBLIC'?'GENERAL_PUBLIC_RECORD':schema==='DEFAULT'?'AU_DEFAULT_INFORMATION':schema==='HARDSHIP'?'AU_HARDSHIP_INFORMATION':schema==='INQUIRY'||category==='ENQUIRY'?'GENERAL_INQUIRY':category==='RHI'?'AU_REPAYMENT_INFORMATION':category==='DEFAULT INFORMATION'?'AU_DEFAULT_INFORMATION':'GENERAL_ACCOUNT';
      const target=record(kind,page,group.values.flat(),group.rows[0].line);
      populate(target,cells,normalize,convention);
      if (schema==='PUBLIC') setFact(target,'publicRecord.type',cells.type,cells.type.raw);
      if (schema==='MIXED' && category==='DEFAULT INFORMATION') {
        const raw=cells.amountStatus.raw, match=/^(AUD\s+\d[\d,.]*)\s+(unpaid|paid)\b/i.exec(raw);
        if (match) {setFact(target,'default.originalAmount',{...cells.amountStatus,raw:match[1]},printedAmount(match[1]));setFact(target,'account.status',{...cells.amountStatus,raw:match[2],label:'Default status'},upper(match[2]));}
        setDate(target,'default.defaultDate',cells.date,normalize,convention);
      }
      if (schema==='MIXED' && category==='RHI') {setFact(target,'account.rhiRating',cells.amountStatus,cells.amountStatus.raw);setDate(target,'account.rhiPeriod',cells.date,normalize,convention);}
      target.au_table_schema=schema;
      records.push(target);
    }
    if (groups.length) fences.push({page:page.page,y0:header.y,y1:Math.max(...groups.flatMap(group=>group.rows.map(row=>Math.max(...row.words.map(word=>word.y1))))),schema});
  }
  return {records,fences};
}

function cardRecords(page,normalize,convention) {
  const rows=physicalRows(page),records=[];
  for(let index=0;index<rows.length;index++) {
    const row=rows[index];
    if (!/^Account number\b/i.test(clean(row.words.map(word=>word.text).join(' '))) || !/Credit type/i.test(clean(row.words.map(word=>word.text).join(' ')))) continue;
    const title=rows[index-1];
    if (!title || row.y-title.y>22) continue;
    const target=record('GENERAL_ACCOUNT',page,title.words,title.line),cells={identity:source(page,title.words,title.line,'Account name')};
    for(const detail of rows.slice(index,index+5)) {
      const chunks=detail.chunks;
      for(let c=0;c<chunks.length-1;c+=2) {
        const label=clean(chunks[c].map(word=>word.text).join(' ')),key=LABELS[upper(label)];
        if (key) cells[key]=source(page,chunks[c+1],detail.line,label,chunks[c]);
      }
    }
    populate(target,cells,normalize,convention);
    const gridHead=rows.slice(index+1,index+9).find(head=>head.chunks.some(chunk=>/^Acct$/i.test(clean(chunk.map(word=>word.text).join(' ')))));
    if(gridHead) {
      const names=page.words.filter(word=>word.y0>=gridHead.y-6&&word.y0<=gridHead.y+2&&/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{1,2}$/i.test(word.text)).sort((a,b)=>a.x0-b.x0).map(word=>[word]);
      const cells=[];
      for(let c=0;c<names.length;c++) {
        const words=names[c], x0=words[0].x0-2,x1=(names[c+1]?.[0].x0??Infinity)-2;
        const tail=/\d{2}$/.test(words[0].text)?[]:page.words.filter(word=>word.y0>gridHead.y+1&&word.y0<gridHead.y+9&&word.x0>=x0&&word.x1<x1&&/^\d$/.test(word.text));
        const raw=clean(words.map(word=>word.text).join(' '))+clean(tail.map(word=>word.text).join(' '));
        const match=/^([A-Za-z]{3})(\d{2})$/.exec(raw.replace(/\s/g,''));
        if(!match) continue;
        const date=normalize(match[1]+' 20'+match[2],null);
        const rating=page.words.filter(word=>word.y0>gridHead.y+10&&word.y0<gridHead.y+24&&word.x0>=x0&&word.x1<x1&&/^(?:[0-6ARUVX])$/i.test(word.text));
        if(date.normalized&&rating.length===1&&/^(?:[0-6ARUVX])$/i.test(rating[0].text)) cells.push({period:date.normalized,raw_period:raw,code:rating[0].text,
          location:source(page,rating,gridHead.line+2,'Repayment history').location,
          period_location:source(page,[...words,...tail],gridHead.line,'Printed repayment month').location,
          trusted:[...words,...tail,...rating].every(word=>word.trusted!==false)});
      }
      if(cells.length===names.length&&cells.length>=2) {
        const evidenceWords=page.words.filter(word=>word.y0>=gridHead.y-6&&word.y0<gridHead.y+24&&word.x0>=names[0][0].x0-2);
        setFact(target,'account.datedRepaymentHistory',source(page,evidenceWords,gridHead.line,'Dated repayment history'),cells);
      }
    }
    records.push(target);
  }
  return records;
}

function extract(pages, normalize) {
  const text=pages.map(page=>page.words?.map(word=>word.text).join(' ')||'').join('\n');
  const convention=pages.some(page=>physicalRows(page).some(row=>
    /^(?:Local date format|Date format)\s*:?[\s]+DD\/MM\/YYYY\b/i.test(clean(row.words.map(word=>word.text).join(' ')))
    && row.words.every(word=>word.trusted!==false)))?'DDMM':null;
  const records=[],fences=[];
  for(const page of pages) {
    if(page.source!=='NATIVE_TEXT'||!page.words?.length) continue;
    const mapped=tableRecords(page,normalize,convention);
    const cards=cardRecords(page,normalize,convention);
    records.push(...mapped.records,...cards);fences.push(...mapped.fences);
    for(const card of cards) {
      const locations=Object.values(card.au_fields).map(field=>field.location).filter(loc=>loc?.bbox);
      const cells=card.facts['account.datedRepaymentHistory']||[];
      locations.push(...cells.map(cell=>cell.location));
      const y1=Math.max(card.location.bbox.y1,...locations.map(loc=>loc.bbox?.y1||0));
      fences.push({page:page.page,y0:card.location.bbox.y0,y1,schema:'ACCOUNT_CARD'});
    }
    // Source narratives and processing instructions are not extra account rows.
    // Their attributable consumer statements are retained by attachStatements.
    const rows=physicalRows(page);
    for(let i=0;i<rows.length;i++) {
      if(!/^(?:Consumer statement and dispute history|Detailed account notes as they appear in the synthetic disclosure|Processing guardrails for this PDF)$/i.test(clean(rows[i].words.map(word=>word.text).join(' '))))continue;
      const next=rows.slice(i+1).find(row=>BOUNDARY.test(clean(row.words.map(word=>word.text).join(' '))));
      fences.push({page:page.page,y0:rows[i].y,y1:next?.y??Infinity,schema:'NARRATIVE_NOT_AN_ACCOUNT_ROW'});
    }
  }
  return {records,fences,convention,full_account_mapping:records.some(record=>record.au_table_schema==='ACCOUNT'||record.facts['account.sourceLocatorToken']&&record.kind==='GENERAL_ACCOUNT')};
}
function attachStatements(records,pages) {
  const accounts=records.filter(record=>record.kind==='GENERAL_ACCOUNT'&&record.au_source_mapping);
  for(const page of pages) {
    const rows=physicalRows(page); let inStatements=false;
    for(const row of rows) {
      const text=clean(row.words.map(word=>word.text).join(' '));
      if(/^Consumer statement and dispute history$/i.test(text)) {inStatements=true;continue;}
      if(inStatements&&BOUNDARY.test(text)) {inStatements=false;continue;}
      if(!inStatements||!/^[-\u2022]?\s*I dispute\b/i.test(text))continue;
      const claim=upper(text.replace(/^[-\u2022]?\s*I dispute\s+/i,''));
      const candidates=accounts.filter(record=>claim.startsWith(record.facts['account.reported_identity'].replace(/\s+(?:PTY\.?\s+)?LTD\.?$/i,'')));
      if(candidates.length!==1)continue;
      const target=candidates[0],reading=source(page,row.words,row.line,'Consumer statement');
      setFact(target,'account.consumerStatement',reading,text);
      if (/repayment history/i.test(text)) setFact(target,'account.consumerStatusDispute',reading,text);
      if(/default/i.test(text)) {
        const defaults=records.filter(record=>record.kind==='AU_DEFAULT_INFORMATION'&&record.facts['account.reported_identity']===target.facts['account.reported_identity']);
        if(defaults.length===1)setFact(defaults[0],'account.consumerStatement',reading,text);
      }
    }
  }
  for(const account of accounts) {
    const statement=account.au_fields['account.consumerStatement'];
    if(!statement)continue;
    const rhi=records.filter(record=>record.kind==='AU_REPAYMENT_INFORMATION'&&record.facts['account.reported_identity']===account.facts['account.reported_identity']);
    if(rhi.length===1&&/repayment history/i.test(statement.raw)) for(const field of ['account.rhiPeriod','account.rhiRating']) {
      const own=rhi[0].au_fields[field];if(own)setFact(account,field,own,own.normalized,own.precision);
    }
  }
  for(const purchaser of accounts) {
    const key=purchaser.au_fields['account.keyDates'];if(!key)continue;
    const match=/Original creditor\s+(.+)$/i.exec(key.raw);if(!match)continue;
    const originals=accounts.filter(record=>record!==purchaser&&record.facts['account.reported_identity']===upper(match[1]));
    if(originals.length===1) {
      setFact(purchaser,'collection.originalCreditor',{...key,label:'Original creditor',raw:match[1]},upper(match[1]));
      setFact(purchaser,'collection.sourceOriginalLocator',originals[0].au_fields['account.sourceLocatorToken'],originals[0].facts['account.sourceLocatorToken']);
      purchaser.fact_sources['collection.sourceOriginalLocator'].privacy_redacted=true;
    }
  }
}
function referenceCandidates(pages,normalize) {
  const candidates=[];
  const dateToken='(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4}|\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{4})';
  for(const page of pages) {
    if(page.source!=='NATIVE_TEXT'||!page.words?.length||page.multi_bureau_same_page===true)continue;
    for(const row of physicalRows(page)) {
      const text=clean(row.words.map(word=>word.text).join(' '));
      const match=new RegExp('\\b(Report date|Prepared date|File date|Date of report)\\s*:?\\s*'+dateToken,'i').exec(text);if(!match)continue;
      const offsets=[];let start=0;
      for(const word of row.words){offsets.push({word,start,end:start+String(word.text).length});start+=String(word.text).length+1;}
      const valueStart=match.index+match[0].lastIndexOf(match[2]);
      const words=offsets.filter(item=>item.start>=match.index&&item.end<=valueStart+match[2].length).map(item=>item.word);
      if(!words.length||words.some(word=>word.trusted===false))continue;
      const reading=source(page,words,row.line,match[1]),date=normalize(match[2],null);
      if(!date.normalized&&!date.interpretations?.length)continue;
      candidates.push({d:{raw:match[2],...date},location:reading.location,strong:true});
    }
  }
  return candidates;
}
module.exports={extract,disclosureShape,token,setFact,source,tableRecords,cardRecords,attachStatements,referenceCandidates};
