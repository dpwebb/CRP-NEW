'use strict';

// Source-owned summary rows. A brand or a synthetic filename is never admission evidence.
// Read only measured native words under this explicit header; detail cards without
// an account identity cannot be attached to whichever summary row happened to be last.
const COLUMNS = ['ACCOUNT / CREDITOR', 'TYPE', 'STATUS', 'BALANCE', 'OPENED', 'REPORTED'];
const LABELS = ['Creditor', 'Account Type', 'Status', 'Balance', 'Opened', 'Last Reported'];
const norm = text => String(text || '').replace(/\s+/g, ' ').trim();
function summaryTableLines(page) {
  if (page.source !== 'NATIVE_TEXT' || !page.words?.length) return page.lines;
  const heights = page.words.map(w => w.y1 - w.y0).filter(h => h > 0).sort((a,b) => a-b);
  const height = heights[Math.floor(heights.length / 2)];
  const rows = [];
  for (const word of page.words.slice().sort((a,b) => a.y0-b.y0 || a.x0-b.x0)) {
    if (![word.x0,word.x1,word.y0,word.y1].every(Number.isFinite) || word.y1-word.y0 > height*1.8) continue;
    let row = rows.find(r => Math.abs(r.y-word.y0)<2);
    if (!row) rows.push(row={y:word.y0, words:[]});
    row.words.push(word);
  }
  const box = words => words.length ? {x0:Math.min(...words.map(w=>w.x0)),y0:Math.min(...words.map(w=>w.y0)),
    x1:Math.max(...words.map(w=>w.x1)),y1:Math.max(...words.map(w=>w.y1))} : null;
  for (const row of rows) {
    row.words.sort((a,b)=>a.x0-b.x0);
    row.chunks=[];
    for (const word of row.words) {
      let chunk=row.chunks.at(-1);
      if (!chunk || word.x0-chunk.at(-1).x1>12) row.chunks.push(chunk=[]);
      chunk.push(word);
    }
  }
  const headers=rows.filter(r=>r.chunks.length===6 && r.chunks.every((c,i)=>norm(c.map(w=>w.text).join(' ')).toUpperCase()===COLUMNS[i]));
  if (!headers.length) return page.lines;
  const replacements=new Map();
  for (const header of headers) {
    const columns=header.chunks.map(box);
    const values=[];
    for (const row of rows.filter(r=>r.y>header.y)) {
      // Stop at the first non-account row, including a detail/section heading or wrapped identity.
      const cells=columns.map((c,i)=>row.words.filter(w=>w.x0>=c.x0-2 && w.x1<(columns[i+1]?.x0 ?? c.x0+100)-2));
      if (!cells[0].length || Math.abs(cells[0][0].x0-columns[0].x0)>5
        || cells.slice(1).filter(c=>c.length).length<3 || row.y-(values.at(-1)?.y ?? header.y)>30) break;
      values.push(row);
      replacements.set(row,cells.map((words,i)=>({text:LABELS[i]+': '+norm(words.map(w=>w.text).join(' ')),
        page:page.page,line:rows.indexOf(row)+1,source:'NATIVE_TEXT',confidence:null,
        trusted:words.length>0 && words.every(w=>w.trusted!==false) && header.chunks[i].every(w=>w.trusted!==false),
        measured_words:true,words:words.map((w,j)=>({...w,start:LABELS[i].length+2+words.slice(0,j).reduce((n,v)=>n+String(v.text).length+1,0),
          end:LABELS[i].length+2+words.slice(0,j+1).reduce((n,v)=>n+String(v.text).length+1,0)-1})),bbox:box(words),
        caption_label:LABELS[i],caption_location:{page:page.page,line:rows.indexOf(header)+1,source:'NATIVE_TEXT',
          trusted:header.chunks[i].every(w=>w.trusted!==false),bbox:columns[i]},
        column_field:i===0?'identity':i===1?'type':i===2?'status':i===3?'money':'date',
        column_raw:norm(words.map(w=>w.text).join(' ')),column_missing:!words.length,...(i===0?{column_boundary:true}:{})})));
    }
    if (values.length) {
      replacements.set(header,[]);
      replacements.get(values.at(-1)).push({text:'',page:page.page,line:rows.indexOf(values.at(-1))+1,column_reset:true});
    }
  }
  if (!replacements.size) return page.lines;
  // Native physical rows are the source for this page, including all unrelated sections.
  // This avoids fragmented pdftotext rows and diagonal watermark characters changing association.
  return rows.flatMap((row,index)=>replacements.get(row) ?? [{text:norm(row.words.map(w=>w.text).join(' ')),
    page:page.page,line:index+1,source:'NATIVE_TEXT',confidence:null,trusted:row.words.every(w=>w.trusted!==false),
    measured_words:true,bbox:box(row.words),words:row.words.map((w,j)=>({...w,
      start:row.words.slice(0,j).reduce((n,v)=>n+String(v.text).length+1,0),
      end:row.words.slice(0,j+1).reduce((n,v)=>n+String(v.text).length+1,0)-1}))}]);
}
module.exports={summaryTableLines};
