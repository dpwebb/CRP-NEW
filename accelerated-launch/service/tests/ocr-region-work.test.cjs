'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const fixture=require('./sections/dw-us-history-completion.cjs').fixtures;
function exercise(callback,{corruptBatch=false,failBatch=false}={}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'crp-fictional-ocr-reuse-'));
  const pixels=fixture.coloredUnknown(false,null),pdf=fixture.pixelPdf(pixels.rgb,pixels.width,pixels.height),file=path.join(dir,'fictional.pdf');fs.writeFileSync(file,pdf.bytes);
  const original=cp.execFileSync, calls=[];let rejected=0;
  cp.execFileSync=function(program,args,options) {
    if(args?.[1]==='stdout'&&args.includes('tsv')) {
      const key=args[args.indexOf('--psm')+1]+':'+crypto.createHash('sha256').update(fs.readFileSync(args[0])).digest('hex');calls.push(key);

    }
    if(failBatch && args?.[1]==='stdout'&&args[0].endsWith('.txt'))throw Object.assign(new Error('fictional failed batch'),{code:'EIO'});
    const value=original(program,args,options);
    if(args?.[1]==='stdout'&&args[0].endsWith('.txt')) {
      assert.ok(args.includes('classify_enable_learning=0'));
      if(corruptBatch){rejected++;const lines=String(value).split(/\r?\n/),index=lines[0].split('\t').indexOf('page_num');return lines.map((line,i)=>{if(!i||!line)return line;const fields=line.split('\t');fields[index]='999';return fields.join('\t');}).join('\n');}
    }
    return value;
  };
  const modulePath=require.resolve('../ocr/local-ocr.cjs'),previous=require.cache[modulePath];delete require.cache[modulePath];
  try {callback({reader:require(modulePath),file,region:pdf.region,calls,get rejected(){return rejected;}});}
  finally {cp.execFileSync=original;if(previous)require.cache[modulePath]=previous;else delete require.cache[modulePath];fs.rmSync(dir,{recursive:true,force:true});}
}
test('batched physical views retain source geometry, confidence and per-band custody',()=>exercise(({reader,file,region,calls})=>{
  const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),first=reader.readPdfRegions(file,[region]);
  assert.equal(first.regions[0].word.text.toUpperCase(),'OK');assert.equal(first.source_sha256,hash);assert.equal(first.band_time_budget_ms,45000);
  assert.equal(first.regions[0].variants.length,7);assert.equal(first.ocr_executions,2);assert.equal(first.ocr_batch_views,7);assert.equal(calls.length,2);
  assert.equal(new Set(calls).size,2);assert.equal(first.regions[0].word.recovery.confidence_floor,70);
  assert.ok(first.regions[0].variants.some(v=>v.polarity.startsWith('RED_')));assert.ok(first.regions[0].variants.some(v=>v.polarity.startsWith('BLUE_')));
  const second=reader.readPdfRegions(file,[region]);assert.equal(second.ocr_executions,2);assert.equal(calls.length,4);
  assert.deepEqual(second.regions,first.regions);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash);
}));
test('malformed batch page identities cannot supply source readings',()=>exercise(control=>{
  const result=control.reader.readPdfRegions(control.file,[control.region]);assert.equal(result.regions[0].word,null);
  assert.equal(control.rejected,1);assert.equal(result.regions[0].reason,'PHYSICAL_OCR_BATCH_OUTPUT_INVALID');assert.ok(result.regions[0].variants.every(v=>!v.words.length));
},{corruptBatch:true}));
test('batching cannot bypass the fixed deadline or supply a reading after exhaustion',()=>exercise(({reader,file,region})=>{
  const result=reader.readPdfRegions(file,[region],{timeBudgetMs:1});assert.equal(result.regions[0].word,null);
  assert.equal(result.regions[0].reason,'PHYSICAL_OCR_BAND_TIME_BUDGET_EXCEEDED');assert.equal(result.band_time_budget_ms,45000);
}));

test('a bounded high-cost schedule completes repeated views without discarding any source view',()=>exercise(({reader,file,region,calls})=>{
  const now=Date.now,started=now();Date.now=()=>started+calls.length*7000;
  let result;try {result=reader.readPdfRegions(file,[{...region,id:'first'},{...region,id:'second'}]);}finally {Date.now=now;}
  assert.equal(result.elapsed_ms,28000);assert.equal(result.band_time_budget_ms,45000);assert.equal(result.ocr_executions,4);assert.equal(result.ocr_batch_views,14);
  assert.deepEqual(result.regions.map(row=>row.word?.text.toUpperCase()),['OK','OK']);
  assert.deepEqual(result.regions.map(row=>row.id),['first','second']);assert.ok(result.regions.every(row=>row.variants.length===7));
}));

test('failed batch execution cannot contribute partial trusted readings',()=>exercise(({reader,file,region})=>{
  const result=reader.readPdfRegions(file,[region]);assert.equal(result.regions[0].word,null);
  assert.equal(result.regions[0].reason,'PHYSICAL_OCR_BATCH_FAILED');assert.equal(result.regions[0].variants.length,0);
},{failBatch:true}));
