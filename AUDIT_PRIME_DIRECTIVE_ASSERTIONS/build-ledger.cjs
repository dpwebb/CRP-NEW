const fs=require('fs'),path=require('path');
const dir=__dirname, root=path.resolve(dir,'..');
const run=JSON.parse(fs.readFileSync(path.join(dir,'executed-assertions.json'),'utf8'));
const rows=[], sites=new Map(), sections=[];
const archiveV=new Set([189,190,205,207,209,210,211,212]);
const keepH=new Set([56,65,74,75,77,78,80,87,91,92]);
for(const s of run.sections){
 const source=fs.readFileSync(path.join(root,'accelerated-launch/service/tests/sections',s.file),'utf8').split(/\r?\n/);
 const sectionRows=[];
 for(const a of s.assertion_calls||[]){
  const m=a.stack.match(/([^()]+\.cjs):(\d+):(\d+)\)?/); const line=m?Number(m[2]):null;
  const failed=(s.failures||[]).some(f=>f.startsWith(a.label+' —'));
  let disposition='KEEP',reason='Current behavior, evidence, isolation, source admission, or consumer contract.';
  if(['n-applicability','o-all82-infrastructure'].includes(s.id)){disposition='CONSOLIDATE';reason='Relevant jurisdiction coverage; repeated shared contracts should be separated from per-region routing checks. Not authorization to delete the matrix.';}
  if(s.id==='h-legacy-parity'&&!keepH.has(line)){disposition='ARCHIVE';reason='Historical legacy parity/source-text assertion, separate from current product behavior.';}
  if(s.id==='v-presentation-and-release'&&archiveV.has(line)){disposition='ARCHIVE';reason='Historical retrieval/marketing-capture reproducibility; retain in source custody verification, outside routine product regression.';}
  if(s.id==='e-qualifications'&&[67,69].includes(line)){disposition='REMOVE_DUPLICATE';reason='Exact duplicate of checks at lines 63/65 on the same result.';}
  let rewrite=null;
  if(failed)rewrite='Relevant UI requirement; stale numeric step targets after history insertion. Repair, do not delete.';
  if(s.id==='bl-us-ca-correction-packet'&&[97,98,99,100].includes(line))rewrite='Deprecated packetEligibility helper is not the unified issue selection gate. Test the active Issue eligibility path instead.';
  if(s.id==='i-shared-regressions'&&line===38)rewrite='SHA-256 length demonstrates readability, not catalog identity or correctness. Add a meaningful catalog consistency oracle.';
  if(s.id==='av-consumer-results'&&line===71)rewrite='Nonempty string does not prove allowed scope wording or absence of a legal-advice disclaimer; stale label.';
  if(s.id==='v-presentation-and-release'&&line===328)rewrite='Frozen historical next-action priority is not the current Prime Directive build priority.';
  if(s.id==='al-common-errors'&&[95,124].includes(line))rewrite='Expected internal potential signal does not establish a contradiction; test benign interpretation and current Issue filtering explicitly.';
  if(s.id==='bx-all82-factual-verification'&&line===67)rewrite='Identical report/date in all cases cannot prove own-case packet association. Use distinct per-case facts and identity controls.';
  if(rewrite){disposition='REWRITE';reason=rewrite;}
  const row={section:s.id,file:'accelerated-launch/service/tests/sections/'+s.file,line,label:a.label,result:failed?'FAIL':'PASS',disposition,reason};
  rows.push(row);sectionRows.push(row);const key=row.file+':'+line;
  if(!sites.has(key))sites.set(key,{file:row.file,line,section:s.id,executions:0,disposition,reason,source:source[(line||1)-1]?.trim()||''});sites.get(key).executions++;
 }
 const counts={};for(const r of sectionRows)counts[r.disposition]=(counts[r.disposition]||0)+1;
 const lexicalSites=source.reduce((sum,l)=>sum+(l.match(/\bcheck\.(?:ok|equal|deepEqual|notDeepEqual|match|skip)\s*\(/g)||[]).length,0);
 sections.push({section:s.id,title:s.title,executed_assertions:sectionRows.length,passed:s.passed,failed_checks:sectionRows.filter(r=>r.result==='FAIL').length,section_exceptions:(s.failures||[]).filter(f=>f.startsWith('section threw:')).length,duration_ms:s.audit_duration_ms,lexical_check_sites:lexicalSites,...counts});
}
const counts={};for(const r of rows)counts[r.disposition]=(counts[r.disposition]||0)+1;
const stats={captured_at:run.captured_at,sections:sections.length,runner_totals:run.totals,executed_check_assertions:rows.length,failed_check_assertions:rows.filter(r=>r.result==='FAIL').length,section_exceptions:sections.reduce((n,s)=>n+s.section_exceptions,0),unique_executed_sites:sites.size,duration_ms:run.duration_ms,dispositions:counts,relevant_contract_assertions:rows.filter(r=>!['ARCHIVE','REMOVE_DUPLICATE'].includes(r.disposition)).length};
function csv(data){const keys=[...new Set(data.flatMap(Object.keys))];return keys.join(',')+'\n'+data.map(r=>keys.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n';}
fs.writeFileSync(path.join(dir,'assertion-ledger.csv'),csv(rows));fs.writeFileSync(path.join(dir,'assertion-sites.csv'),csv([...sites.values()]));fs.writeFileSync(path.join(dir,'section-review.csv'),csv(sections));fs.writeFileSync(path.join(dir,'audit-counts.json'),JSON.stringify(stats,null,2));console.log(JSON.stringify(stats,null,2));
