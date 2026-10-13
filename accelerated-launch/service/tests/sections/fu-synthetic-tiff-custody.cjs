'use strict';
const tiff=require('../../ocr/bounded-tiff.cjs'), crypto=require('node:crypto');
function fixture(){
  const b=Buffer.alloc(264);b.write('II');b.writeUInt16LE(42,2);b.writeUInt32LE(8,4);
  for(let page=0;page<2;page++){
    const o=8+page*126;b.writeUInt16LE(10,o);
    const entries=[[256,3,1,2],[257,3,1,2],[258,3,1,8],[259,3,1,1],[262,3,1,1],[273,4,1,260+page*2],[277,3,1,1],[278,3,1,2],[279,4,1,4],[284,3,1,1]];
    // Separate strip allocations after both physical directories.
    entries[5][3]=260+page*4;
    entries.forEach(([tag,type,count,value],i)=>{let x=o+2+i*12;b.writeUInt16LE(tag,x);b.writeUInt16LE(type,x+2);b.writeUInt32LE(count,x+4);b.writeUInt32LE(value,x+8);});
    b.writeUInt32LE(page?0:134,o+122);
  }
  const out=Buffer.alloc(268);b.copy(out);out.fill(0,260,264);out.fill(255,264,268);return out;
}
function single(data,compression=1,predictor=1,sampleFormat=1,fillOrder=1){
  const tags=[[256,2],[257,2],[258,8],[259,compression],[262,1],[266,fillOrder],[273,170],[277,1],[278,2],[279,data.length],[284,1],[317,predictor],[339,sampleFormat]];
  const b=Buffer.alloc(170+data.length);b.write('II');b.writeUInt16LE(42,2);b.writeUInt32LE(8,4);b.writeUInt16LE(tags.length,8);
  tags.forEach(([tag,value],i)=>{const e=10+i*12;b.writeUInt16LE(tag,e);b.writeUInt16LE([273,279].includes(tag)?4:3,e+2);b.writeUInt32LE(1,e+4);b.writeUInt32LE(value,e+8);});data.copy(b,170);return b;
}
function literalLzw(values){const bits=[256,...values,257].map(v=>v.toString(2).padStart(9,'0')).join('');const b=Buffer.alloc(Math.ceil(bits.length/8));for(let i=0;i<bits.length;i++)if(bits[i]==='1')b[i>>3]|=1<<(7-(i&7));return b;}
async function run(t,check){
  const b=fixture(),hash=crypto.createHash('sha256').update(b).digest('hex'),pages=tiff.validate(b);
  check.equal(pages.length,2,'two physical IFDs retained');check.equal(pages[1].width,2,'page two own dimensions');
  check.ok(!tiff.png(b,pages[0]).equals(tiff.png(b,pages[1])),'page two is not page one duplicated');
  check.equal(crypto.createHash('sha256').update(b).digest('hex'),hash,'derivative rendering preserves original bytes');
  const rejects=value=>{try{tiff.validate(value);return false;}catch{return true;}};
  check.ok(rejects(b.subarray(0,265)),'truncated second page refused');
  const cycle=Buffer.from(b);cycle.writeUInt32LE(8,256);check.ok(rejects(cycle),'cyclic IFD refused');
  const huge=Buffer.from(b);huge.writeUInt32LE(65535,18);check.ok(rejects(huge),'excessive dimensions refused');
  const compression=Buffer.from(b);compression.writeUInt32LE(7,54);check.ok(rejects(compression),'unsupported compression refused');
  const badstrip=Buffer.from(b);badstrip.writeUInt32LE(9999999,78);check.ok(rejects(badstrip),'out-of-range strip refused');
  const amplification=Buffer.alloc(270000); amplification.write('II'); amplification.writeUInt16LE(42,2); amplification.writeUInt32LE(8,4); amplification.writeUInt16LE(256,8);
  for(let i=0;i<256;i++){const e=10+i*12;amplification.writeUInt16LE(40000+i,e);amplification.writeUInt16LE(4,e+2);amplification.writeUInt32LE(65536,e+4);amplification.writeUInt32LE(4000,e+8);}
  check.ok(rejects(amplification),'overlapping unknown metadata amplification is rejected without materializing values');
  const wrongType=Buffer.from(b);wrongType.writeUInt16LE(2,12);check.ok(rejects(wrongType),'required structural tag with nonnumeric type refused');
  const scalar=Buffer.from(b);scalar.writeUInt32LE(65536,14);check.ok(rejects(scalar),'required scalar value amplification refused before allocation');
  const raw=Buffer.from([1,3,5,7]),reference=single(raw),rp=tiff.validate(reference)[0];
  check.ok(rejects(single(raw,1,1,2)),'signed sample format refused rather than rendered as unsigned');
  check.ok(rejects(single(raw,1,1,1,2)),'unsupported fill order refused');
  for(const [label,input] of [['LZW',single(literalLzw([...raw]),5)],['deflate predictor',single(require('node:zlib').deflateSync(Buffer.from([1,2,5,2])),8,2)]]){
    const p=tiff.validate(input)[0];check.ok(tiff.png(input,p).equals(tiff.png(reference,rp)),label+' restores exact original pixel values');
  }
  // Valid report with 240 unknown tags sharing one huge metadata range: none may allocate.
  const base=single(raw),unknownCount=240,totalTags=13+unknownCount,dataStart=10+totalTags*12+4;
  const metadata=Buffer.alloc(dataStart+262144+4);base.subarray(0,166).copy(metadata);metadata.writeUInt16LE(totalTags,8);
  metadata.writeUInt32LE(dataStart+262144,10+6*12+8);
  for(let i=0;i<unknownCount;i++){const e=10+(13+i)*12;metadata.writeUInt16LE(40000+i,e);metadata.writeUInt16LE(4,e+2);metadata.writeUInt32LE(65536,e+4);metadata.writeUInt32LE(dataStart,e+8);}
  raw.copy(metadata,dataStart+262144);
  const originalFrom=Array.from;let largestAllocation=0;
  try {
    Array.from=function(value,...args){if(value&&Number.isInteger(value.length))largestAllocation=Math.max(largestAllocation,value.length);return originalFrom.call(this,value,...args);};
    const safe=tiff.validate(metadata);check.ok(tiff.png(metadata,safe[0]).equals(tiff.png(reference,rp)),'valid TIFF with overlapping unknown metadata retains exact pixels');
    check.ok(largestAllocation<=1,'unknown tag arrays are never materialized');
    largestAllocation=0;check.ok(rejects(scalar),'required oversized scalar rejected');check.equal(largestAllocation,0,'oversized required scalar rejected before any Array.from allocation');
  } finally {Array.from=originalFrom;}
  const worker=require('../../packet-composer-worker.cjs');
  const entry={bytes:b,content_type:'image/tiff',relevant_pages:[2],label:'Original report page two'};
  const packet=await worker.compose({letter_text:'Please verify the selected report information.',reports:[entry],documents:[],version:'tiff-test'});
  check.equal(packet.sections.find(s=>s.kind==='report').source_pages.join(','),'2','packet copies selected physical page two');
  check.equal(packet.sections.find(s=>s.kind==='report').page_count,1,'unselected page one excluded');
  const lib=require('../../pdf-vendor/pdf-lib-1.17.1.min.js'), pdf=await lib.PDFDocument.load(Buffer.from(packet.bytes,'base64'));
  const images=pdf.context.enumerateIndirectObjects().map(([,o])=>o).filter(o=>o.dict?.get(lib.PDFName.of('Subtype'))?.toString()==='/Image');
  check.equal(images.length,1,'packet embeds only selected physical-page image');
  const actual=Buffer.from(lib.decodePDFRawStream(images[0]).decode());
  check.ok(actual.length===12&&actual.every(v=>v===255),'selected page two actual embedded pixels are white rather than page one black');
  let invalid=false;try{await worker.compose({letter_text:'Verify',reports:[{...entry,relevant_pages:[3]}]});}catch(e){invalid=e.code==='INVALID_REQUEST';}
  check.ok(invalid,'out-of-range packet page refused');
  return {outcome:'bounded original-byte multipage TIFF custody and page-specific packet rendering'};
}
module.exports={id:'fu-synthetic-tiff-custody',title:'Multipage TIFF validation, original custody and selected packet pages',run,fixture};
