'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const matrix=require('../coverage-matrix.cjs');
function coverage(){
  const validation=matrix.validation();if(!validation.ok)throw Error('COVERAGE_REGISTRY_INVALID');
  const files=['../coverage-matrix.cjs','../formats.cjs','../../coverage-matrix.json'];
  return {scope:'source-declared format coverage; not empirical accuracy',sourceBindings:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex')})),supportedPresentations:matrix.supportedPresentations(),missingLayouts:matrix.missingRows(),acquisitionQueue:matrix.acquisitionQueue(),accuracy:{sampleCount:0,measured:false,falsePositiveRate:null,missRate:null},universalDetectionClaim:false};
}
function score(rows){
  const result={sampleCount:rows.length,truePositives:0,falsePositives:0,misses:0,trueNegatives:0,unresolved:0,unresolvedElevations:0,invalid:0};
  const ids=new Set();
  for(const r of rows){if(!r.caseRef||!r.issueRef||!r.sourceFactRef||!['PRESENT','ABSENT','UNRESOLVED'].includes(r.expected)||!['VIOLATION','NO_FINDING','UNRESOLVED'].includes(r.actual)){result.invalid++;continue;}const key=JSON.stringify([r.caseRef,r.issueRef]);if(ids.has(key)){result.invalid++;continue;}ids.add(key);
    if(r.expected==='UNRESOLVED'){result.unresolved++;if(r.actual==='VIOLATION')result.unresolvedElevations++;}
    else if(r.expected==='PRESENT'){if(r.actual==='VIOLATION')result.truePositives++;else result.misses++;}
    else if(r.actual==='VIOLATION')result.falsePositives++;else if(r.actual==='UNRESOLVED')result.unresolved++;else result.trueNegatives++;
  }
  return {...result,accepted:rows.length>0&&result.falsePositives===0&&result.misses===0&&result.unresolvedElevations===0&&result.invalid===0,scope:'only the supplied source-labelled cases; no universal accuracy inference'};
}
module.exports={coverage,score};
if(require.main===module)process.stdout.write(JSON.stringify(coverage(),null,2)+'\n');
