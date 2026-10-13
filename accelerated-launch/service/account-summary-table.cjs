'use strict';

// Measure source columns, then carry their own captions and cells. A country,
// bureau brand, filename or neighbouring account never supplies a missing field.
const norm = text => String(text || '').replace(/\s+/g, ' ').trim();
const upper = text => norm(text).toUpperCase().replace(/:\s*$/, '');
let countryNames;
const countryKey=value=>upper(value).normalize('NFKD').replace(/\p{M}/gu,'').replace(/[-'’.,]/g,' ').replace(/\s+/g,' ').trim();
function printedCountry(value){
  if(!countryNames){const names=new Map([['UK','GB'],['USA','US'],['CAN','CA'],['GBR','GB'],['AUS','AU']]);
    for(const language of ['en','fr']){const display=new Intl.DisplayNames([language],{type:'region'});for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){const code=String.fromCharCode(a,b),name=display.of(code);if(name&&name!==code)names.set(countryKey(name),code);}}
    countryNames=[...names].sort((a,b)=>b[0].length-a[0].length);
  }
  const key=countryKey(value),country=countryNames.find(([name])=>key===name||key.startsWith(name+' '))?.[1];
  return country==='UK'?'GB':['AS','GU','MP','PR','VI','UM','FM','MH','PW'].includes(country)?'US':country;
}
const box = words => words.length ? { x0:Math.min(...words.map(w=>w.x0)), y0:Math.min(...words.map(w=>w.y0)),
  x1:Math.max(...words.map(w=>w.x1)), y1:Math.max(...words.map(w=>w.y1)) } : null;
const caption = Object.freeze({
  'ACCOUNT / CREDITOR':['identity','Creditor'], CREDITOR:['identity','Creditor'],
  'CREDITOR NAME':['identity','Creditor'], 'ACCOUNT NAME':['identity','Creditor'],
  ACCOUNT:['identifier','Account Number'], 'ACCOUNT NUMBER':['identifier','Account Number'],
  TYPE:['type','Account Type'], 'ACCOUNT TYPE':['type','Account Type'],
  STATUS:['status','Status'], 'ACCOUNT STATUS':['status','Status'],
  BALANCE:['money','Balance'], 'CURRENT BALANCE':['money','Balance'],
  LIMIT:['money','Credit Limit'], 'CREDIT LIMIT':['money','Credit Limit'],
  PAYMENT:['money','Payment Amount'], 'MONTHLY PAYMENT':['money','Payment Amount'],
  'PAYMENT AMOUNT':['money','Payment Amount'], 'PAST DUE':['money','Past Due'],
  OPENED:['date','Opened Date'], 'OPENED DATE':['date','Opened Date'],
  CLOSED:['date','Closed Date'], 'CLOSED DATE':['date','Closed Date'],
  REPORTED:['date','Reported Date'], 'REPORTED DATE':['date','Reported Date'],
  'LAST REPORTED':['date','Last Reported'], LAST:['date','Last Reported'],
  ASSIGNED:['date','Assigned Date'], 'ASSIGNED DATE':['date','Assigned Date'],
  AGENCY:['collection_identity','Collection Agency'], 'COLLECTION AGENCY':['collection_identity','Collection Agency'],
  ORIGINAL:['original_creditor','Original Creditor'], 'ORIGINAL CREDITOR':['original_creditor','Original Creditor'],
  SUBSCRIBER:['inquiry_identity','Enquiry Organisation'], DATE:['date','Enquiry Date'],
  PURPOSE:['text','Enquiry Purpose'], AUTHORIZED:['text','Enquiry Authorized'],
  AUTHORISED:['text','Enquiry Authorized'], AUTHORIZATION:['text','Enquiry Authorized'], REMARKS:['remarks','Remarks'],
  'RECENT PAYMENT HISTORY':['history','Recent Payment History'], 'RECENT 12 MONTH HISTORY':['history','Recent Payment History'], 'PAYMENT HISTORY':['history','Recent Payment History']
});
const SECTION = /^(?:CONSUMER IDENTIFICATION|PERSONAL INFORMATION|IDENTIFICATION DETAILS|CREDIT ACCOUNT INFORMATION|CREDIT ACCOUNTS AND DEFAULTS|ACCOUNT SUMMARY|ACCOUNT DETAIL|PAYMENT HISTORY AND REMARKS|COLLECTIONS|COLLECTION AND DEFAULT LISTINGS|DEFAULT AND COLLECTION INFORMATION|PUBLIC RECORDS|COURT AND INSOLVENCY RECORDS|COURT JUDGMENTS AND INSOLVENCY|CREDIT ENQUIRIES|INQUIRIES|ENQUIRIES)\s*$/i;

function physicalRows(page) {
  const heights=page.words.map(w=>w.y1-w.y0).filter(h=>h>0).sort((a,b)=>a-b), height=heights[Math.floor(heights.length/2)];
  const rows=[];
  for(const word of page.words.slice().sort((a,b)=>a.y0-b.y0||a.x0-b.x0)) {
    if(![word.x0,word.x1,word.y0,word.y1].every(Number.isFinite)||word.y1-word.y0>height*1.8) continue;
    let row=rows.find(r=>Math.abs(r.y-word.y0)<2);
    if(!row) rows.push(row={y:word.y0,words:[]});
    row.words.push(word);
  }
  rows.forEach((row,index)=>{
    row.line=index+1; row.words.sort((a,b)=>a.x0-b.x0); row.chunks=[];
    for(const word of row.words) {
      let chunk=row.chunks.at(-1);
      if(!chunk||word.x0-chunk.at(-1).x1>12) row.chunks.push(chunk=[]);
      chunk.push(word);
    }
  });
  return rows;
}
function location(page, words, line, heading) {
  return {page:page.page,line,source:'NATIVE_TEXT',trusted:words.length>0&&words.every(w=>w.trusted!==false),bbox:box(words),
    ...(heading?{caption_location:{page:page.page,line:heading.line,source:'NATIVE_TEXT',
      trusted:heading.words.every(w=>w.trusted!==false),bbox:box(heading.words),printed_caption:heading.raw}}:{})};
}
function cellsOf(row, columns) {
  return columns.map((c,i)=>row.words.filter(w=>w.x0>=c.x0-2&&w.x1<(columns[i+1]?.x0??Infinity)-2));
}
function schemaOf(columns) {
  const names=columns.map(c=>c.kind), labels=columns.map(c=>c.label);
  if(names.includes('inquiry_identity')&&labels.includes('Enquiry Date')&&labels.includes('Enquiry Purpose')) return 'INQUIRIES';
  if(names.includes('collection_identity')&&labels.includes('Balance')&&labels.includes('Status')) return 'COLLECTIONS';
  if(names.includes('identity')&&names.includes('history')&&names.includes('remarks')) return 'HISTORY_REMARKS';
  if(names.includes('identity')&&labels.includes('Balance')&&labels.includes('Status')
    &&(labels.includes('Opened Date')||labels.includes('Reported Date'))) return 'ACCOUNT_SUMMARY';
  return null;
}
function headerColumns(row, followingRows = []) {
  const parts=[];
  for(const chunk of row.chunks) for(let i=0;i<chunk.length;) {
    let count=0;
    for(let n=Math.min(5,chunk.length-i);n>0;n--) if(caption[upper(chunk.slice(i,i+n).map(w=>w.text).join(' '))]) {count=n;break;}
    const words=chunk.slice(i,i+(count||1)), raw=norm(words.map(w=>w.text).join(' ')), reading=caption[upper(raw)];
    parts.push({words,raw,x0:words[0].x0,line:row.line,kind:reading?.[0]||'ignored',label:reading?.[1]||raw});
    i+=count||1;
  }
  // Close independent Account/Type headings can share a physical chunk.
  // Split only with their own aligned masked-reference and type cells.
  return parts.flatMap((column,index)=>{
    if(column.words.length!==2||upper(column.words[0].text)!=='ACCOUNT'||upper(column.words[1].text)!=='TYPE')return [column];
    const typeX=column.words[1].x0,nextX=parts[index+1]?.x0??Infinity;
    const end=followingRows.findIndex(data=>data.y-row.y>100||SECTION.test(norm(data.words.map(word=>word.text).join(' '))));
    const supported=(end<0?followingRows:followingRows.slice(0,end)).some(data=>{
      const identifier=data.words.filter(word=>word.x0>=column.x0-2&&word.x1<typeX-2);
      const type=data.words.filter(word=>word.x0>=typeX-2&&word.x1<nextX-2);
      return column.words.every(word=>word.trusted!==false)&&identifier.every(word=>word.trusted!==false)&&type.every(word=>word.trusted!==false)
        &&/^[*#Xx·•]{2,}[\s-]?\d{3,4}$/.test(norm(identifier.map(word=>word.text).join(' ')))
        &&type[0]?.x0<=typeX+8&&/^(?:credit card|personal loan|student loan|auto loan|mortgage|line of credit|consumer loan)$/i.test(norm(type.map(word=>word.text).join(' ')));
    });
    return supported?column.words.map((word,i)=>({words:[word],raw:word.text,x0:word.x0,line:row.line,kind:i?'type':'identifier',label:i?'Account Type':'Account Number'})):[column];
  });
}
function rowIsStart(cells, columns, schema) {
  const identity=cells[columns.findIndex(c=>['identity','collection_identity','inquiry_identity'].includes(c.kind))];
  const values=cells.map((words,i)=>({text:norm(words.map(w=>w.text).join(' ')),kind:columns[i].kind}));
  if(schema==='HISTORY_REMARKS') return Boolean(identity?.length)&&values.some(v=>v.kind==='history'&&/^(?:[A-Z0-9*#.-]{1,4}\s*)+$/i.test(v.text));
  const decisive=values.filter(v=>v.text&&['date','money','identifier'].includes(v.kind));
  return decisive.length>=(schema==='INQUIRIES'?1:2);
}
function rowLine(page, group, column, index, rowId, coverage) {
  const words=group.cells[index], raw=norm(words.map(w=>w.text).join(' '));
  const own=location(page,words,group.rows[0].line,column);
  return {text:column.label+': '+raw,...own,confidence:null,measured_words:true,
    trusted:own.trusted&&column.words.every(w=>w.trusted!==false),
    words:words.map((w,j)=>({...w,start:column.label.length+2+words.slice(0,j).reduce((n,v)=>n+String(v.text).length+1,0),
      end:column.label.length+2+words.slice(0,j+1).reduce((n,v)=>n+String(v.text).length+1,0)-1})),
    caption_label:column.label,column_field:column.kind,column_raw:raw,column_missing:!words.length,
    table_row_id:rowId,table_kind:coverage.section==='COLLECTIONS'?'GENERAL_COLLECTION':coverage.section==='INQUIRIES'?'GENERAL_INQUIRY':'GENERAL_ACCOUNT',
    table_row_coverage:coverage,table_boundary:['identity','collection_identity','inquiry_identity'].includes(column.kind)};
}

function summaryTableLines(page) {
  if(page.source!=='NATIVE_TEXT'||!page.words?.length) return page.lines;
  const rows=physicalRows(page), replacements=new Map(), census=[], noteRows=[], accountNames=[];
  for(let h=0;h<rows.length;h++) {
    const header=rows[h];
    if(header.chunks.length<3) continue;
    const columns=headerColumns(header,rows.slice(h+1));
    const schema=schemaOf(columns);
    if(!schema||columns.some(c=>/[\d$]/.test(c.raw)&&c.kind!=='history')||new Set(columns.filter(c=>c.kind!=='ignored').map(c=>c.label)).size!==columns.filter(c=>c.kind!=='ignored').length) continue;
    // "Original / Creditor" and "Last / Reported" may occupy two header rows.
    const headerRows=[header];
    if(rows[h+1]&&rows[h+1].y-header.y<20) {
      const tails=cellsOf(rows[h+1],columns);
      if(tails.some(w=>w.length)&&tails.every((words,i)=>!words.length||caption[upper(columns[i].raw+' '+words.map(w=>w.text).join(' '))])) {
        columns.forEach((column,i)=>{if(tails[i].length){column.words.push(...tails[i]);column.raw=norm(column.words.map(w=>w.text).join(' '));}});
        headerRows.push(rows[++h]);
      }
    }
    const groups=[]; let last=null, end=h;
    for(let j=h+1;j<rows.length;j++) {
      const row=rows[j], text=norm(row.words.map(w=>w.text).join(' '));
      if(SECTION.test(text)||row.y-(last?.rows.at(-1).y??headerRows.at(-1).y)>35) break;
      const cells=cellsOf(row,columns);
      const identity=norm(cells[columns.findIndex(c=>c.kind==='identity')]?.map(w=>w.text).join(' ')||'').toUpperCase();
      const starts=rowIsStart(cells,columns,schema)&&(schema!=='HISTORY_REMARKS'||!accountNames.length
        ||accountNames.some(name=>name===identity||name.startsWith(identity+' ')));
      if(starts) {last={rows:[row],cells};groups.push(last);end=j;continue;}
      if(!last||row.y-last.rows.at(-1).y>19||cells.filter(w=>w.length).length===0
        ||cells.some((words,i)=>words.length&&['date','money','identifier'].includes(columns[i].kind))) break;
      last.rows.push(row);cells.forEach((words,i)=>last.cells[i].push(...words));end=j;
    }
    if(!groups.length) continue;
    headerRows.forEach(row=>replacements.set(row,[]));
    const tableId=`table-${page.page}-${header.line}`;
    groups.forEach((group,index)=>{
      const rowId=tableId+'-'+(index+1), values=group.cells.flat(), own=location(page,values,group.rows[0].line);
      const field_presence=Object.fromEntries(columns.filter(c=>c.kind!=='ignored').map(c=>[c.label.replace(/ /g,'_').toLowerCase(),true]));
      field_presence.closed_date=columns.some(c=>c.label==='Closed Date');
      const complete=columns.every((c,i)=>c.kind==='ignored'||group.cells[i].length>0)
        &&columns.every(c=>c.words.every(w=>w.trusted!==false))&&values.every(w=>w.trusted!==false);
      const coverage={complete,section:schema,row_id:rowId,field_presence,location:own};
      group.rows.forEach(row=>replacements.set(row,[]));
      if(schema==='HISTORY_REMARKS') {
        const read=kind=>{const i=columns.findIndex(c=>c.kind===kind);return {raw:norm(group.cells[i].map(w=>w.text).join(' ')),
          location:location(page,group.cells[i],group.rows[0].line,columns[i]),trusted:group.cells[i].length>0&&group.cells[i].every(w=>w.trusted!==false)&&columns[i].words.every(w=>w.trusted!==false)};};
        noteRows.push({identity:read('identity'),history:read('history'),remarks:read('remarks'),coverage});
      } else {
        if(schema==='ACCOUNT_SUMMARY') accountNames.push(norm(group.cells[columns.findIndex(c=>c.kind==='identity')].map(w=>w.text).join(' ')).toUpperCase());
        const ordered=columns.map((c,i)=>({c,i})).filter(({c})=>c.kind!=='ignored')
          .sort((a,b)=>Number(['identity','collection_identity','inquiry_identity'].includes(b.c.kind))-Number(['identity','collection_identity','inquiry_identity'].includes(a.c.kind)));
        replacements.set(group.rows[0],ordered.map(({c,i})=>rowLine(page,group,c,i,rowId,coverage)));
      }
    });
    const lastRow=groups.at(-1).rows.at(-1);
    replacements.get(lastRow).push({text:'',page:page.page,line:lastRow.line,column_reset:true});
    census.push({table_id:tableId,section:schema,visible_rows:groups.length,row_ids:groups.map((g,i)=>tableId+'-'+(i+1)),
      location:location(page,headerRows.flatMap(r=>r.words),header.line),complete:groups.every(g=>g.rows.length>0)});
    h=end;
  }
  if(!replacements.size) return page.lines;
  const lines=rows.flatMap(row=>replacements.get(row)??[{text:norm(row.words.map(w=>w.text).join(' ')),
    ...location(page,row.words,row.line),confidence:null,measured_words:true,
    words:row.words.map((w,j)=>({...w,start:row.words.slice(0,j).reduce((n,v)=>n+String(v.text).length+1,0),
      end:row.words.slice(0,j+1).reduce((n,v)=>n+String(v.text).length+1,0)-1}))}]);
  lines.table_row_census=census;lines.report_note_rows=noteRows;
  return lines;
}

// This new structure retains locality/state/postcode and identifier-field presence
// only. Street addresses, names and TFN digits are never copied into it.
function reportConcernEvidence(page) {
  if(page.source!=='NATIVE_TEXT'||!page.words?.length) return [];
  const rows=physicalRows(page), result=[], headings=[];
  rows.forEach((row,index)=>row.chunks.forEach(words=>{
    const label=upper(words.map(w=>w.text).join(' '));
    if(/^(?:CURRENT ADDRESS|PREVIOUS ADDRESS|TAX FILE NUMBER)$/.test(label)) {
      const at=row.chunks.indexOf(words),inline=row.chunks[at+1];
      headings.push({label,words,index,x0:words[0].x0,inline: inline&&/^\d|^P\.?\s*O\.?\s*BOX/i.test(norm(inline.map(w=>w.text).join(' ')))?inline:null});
    }
  }));
  for(const heading of headings) {
    const next=heading.inline?rows[heading.index]:rows.slice(heading.index+1).find(row=>row.words.some(w=>w.x0>=heading.x0-2&&w.x0<=heading.x0+8));
    if(!next||next.y-rows[heading.index].y>24) continue;
    const right=heading.inline?Infinity:rows[heading.index].chunks.find(words=>words[0].x0>heading.x0+12)?.[0].x0??Infinity;
    const values=[];
    for(const row of rows.slice(rows.indexOf(next))) {
      if(row.y-(values.length?values.at(-1).y:next.y)>20) break;
      const words=heading.inline?row===next?heading.inline:[]:row.words.filter(w=>w.x0>=heading.x0-2&&w.x1<right-2);
      if(heading.inline&&row!==next)break;
      // In the observed two-column disclosures the CONTACT caption overlaps a
      // wrapped address vertically. Skip only that caption; a phone/email value
      // still fences the address. Keep the following own postcode/country line.
      if(heading.label==='PREVIOUS ADDRESS'&&upper(words.map(w=>w.text).join(' '))==='CONTACT')continue;
      if(heading.label==='PREVIOUS ADDRESS'&&/^(?:\+\d|PHONE|EMAIL)|@/i.test(norm(words.map(w=>w.text).join(' '))))break;
      if(SECTION.test(norm(row.words.map(word=>word.text).join(' '))))break;
      // An intervening caption in the other column does not end a wrap.
      if(!words.length)continue;
      if(row!==next&&row.chunks.some(chunk=>chunk[0].x0>=heading.x0-2&&/^(?:CONTACT|DATE OF BIRTH|TAX FILE NUMBER|PREVIOUS ADDRESS|CURRENT ADDRESS|ALIASES|NAME|ACCOUNT SUMMARY)$/.test(upper(chunk.map(w=>w.text).join(' '))))) break;
      values.push({words,y:row.y,line:row.line});
      if(heading.label==='TAX FILE NUMBER') break;
    }
    const words=values.flatMap(v=>v.words), text=norm(words.map(w=>w.text).join(' '));
    const own=location(page,words,next.line,{words:heading.words,line:rows[heading.index].line,raw:heading.label});
    const trusted=own.trusted&&heading.words.every(w=>w.trusted!==false);
    if(!trusted) continue;
    if(heading.label==='TAX FILE NUMBER') {
      const masked=/^[X*#\s.-]+\d{0,4}$/i.test(text);
      const unmasked=/^[\d\s.-]+$/.test(text)&&text.replace(/\D/g,'').length>=8&&text.replace(/\D/g,'').length<=9;
      if(masked||unmasked) result.push({kind:'IDENTIFIER_FIELD',identifier_type:'TFN',masked,
        raw_value:masked?'Tax file number shown (masked)':'Tax file number shown (unmasked)',source_field:'Tax File Number',location:own,trusted:true});
      continue;
    }
    const patterns = [
      ['GB', /,\s*([A-Za-z][A-Za-z .'-]{1,50}?),?\s+(UK)\s+([A-Z0-9]{2,4}\s*[A-Z0-9]{2,4})(?=,|;|$)/gi],
      ['AU', /,\s*([A-Za-z][A-Za-z .'-]{1,50}?),?\s+(ACT|NSW|NT|QLD|SA|TAS|VIC|WA|AU)\s+([A-Z0-9]{4,8})\b/gi],
      ['CA', page.source_country==='CA'
        ? /,\s*([\p{L}][\p{L} .'-]{1,50}?),?\s+([A-Z]{2})\s+([A-Z0-9*#]{1,12}(?:\s[A-Z0-9*#]{3})?(?:-[A-Z0-9*#]{1,6})?)(?![A-Z0-9*#])/giu
        : /,\s*([A-Za-z][A-Za-z .'-]{1,50}?),?\s+(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\s+([ABCEGHJKLMNPRSTVXY]\d[A-Z]\s?\d[A-Z]\d)\b/gi],
      ['US', page.source_country==='US'
        ? /,\s*([\p{L}][\p{L} .'-]{1,50}?),?\s+([A-Z]{2})\s+([A-Z0-9*#]{1,12}(?:\s[A-Z0-9*#]{3})?(?:-[A-Z0-9*#]{1,6})?)(?![A-Z0-9*#])/giu
        : /,\s*([A-Za-z][A-Za-z .'-]{1,50}?),?\s+(AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s+(\d{5}(?:-\d{4})?)\b/gi]
    ];
    for (const [country, re] of patterns) {
      if(['CA','US'].includes(country)&&page.source_country&&page.source_country!==country) continue;
      let match;
      while((match=re.exec(text))) {
        const suffix=text.slice(match.index+match[0].length).split(';')[0];
        let code=match[3].toUpperCase(),inlineCountry=/\s+(USA|CAN|GBR|AUS)$/.exec(code)?.[1];if(inlineCountry)code=code.slice(0,-inlineCountry.length).trim();
        const explicit=printedCountry(suffix.replace(/^\s*,?\s*/,''))||printedCountry(inlineCountry||'');
        const addressCountry=explicit||(/^UK$/i.test(match[2])?'GB':country);
        const compact=code.replace(/\s/g,''),masked=/[\*#]/.test(compact)||/^X+$/.test(compact)||/^[A-Z0-9]{3}X{2,3}$/.test(compact);
        const components={country:addressCountry,locality:norm(match[1]),state:match[2].toUpperCase(),postcode:code,postcode_masked:masked};
        result.push({kind:'ADDRESS_COMPONENTS',role:heading.label==='CURRENT ADDRESS'?'CURRENT':'PREVIOUS',components,
          postal_exception:/\b(?:P\.?\s*O\.?\s*BOX|POST OFFICE BOX|GENERAL DELIVERY|RURAL ROUTE)\b/i.test(text),
          raw_value:`${components.locality}, ${components.state} ${components.postcode}`,source_field:heading.label==='CURRENT ADDRESS'?'Current Address':'Previous Address',location:own,trusted:true});
      }
    }
  }
  return result;
}
module.exports={summaryTableLines,reportConcernEvidence,physicalRows,cellsOf,location};
