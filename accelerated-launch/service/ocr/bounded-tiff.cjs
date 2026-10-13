'use strict';
// Classic TIFF, bounded physical IFDs. Original bytes remain the custody artifact.
const zlib = require('node:zlib');
const MAX_PAGES = 40, MAX_PIXELS = 25000000, MAX_TOTAL_PIXELS = 100000000;
function isTiff(b) { return Buffer.isBuffer(b) && b.length >= 8 && (b.subarray(0,4).equals(Buffer.from([73,73,42,0])) || b.subarray(0,4).equals(Buffer.from([77,77,0,42]))); }
function fail() { throw new Error('UNSUPPORTED_OR_CORRUPT_TIFF'); }
function inspect(b) {
  if (!isTiff(b)) fail();
  const le = b[0] === 73;
  const range = (o,n) => { if (!Number.isSafeInteger(o) || !Number.isSafeInteger(n) || o < 0 || n < 0 || o+n > b.length) fail(); };
  const u16 = o => { range(o,2); return le ? b.readUInt16LE(o) : b.readUInt16BE(o); };
  const u32 = o => { range(o,4); return le ? b.readUInt32LE(o) : b.readUInt32BE(o); };
  const pages = [], seen = new Set(); let o = u32(4), total = 0, entries = 0, values = 0;
  const required = new Set([256,257,258,259,262,266,273,274,277,278,279,284,317,339]);
  while (o) {
    if (pages.length >= MAX_PAGES || seen.has(o)) fail(); seen.add(o);
    const n = u16(o); if (n > 256 || (entries += n) > 1024) fail(); range(o,2+n*12+4);
    const tags = new Map();
    for (let i=0;i<n;i++) {
      const e=o+2+i*12, tag=u16(e), type=u16(e+2), count=u32(e+4);
      // Never allocate unknown metadata; repeated external offsets cannot amplify arrays.
      if (!required.has(tag)) continue;
      if (tags.has(tag) || ![1,3,4].includes(type)) fail();
      const cap = tag === 273 || tag === 279 ? 12000 : tag === 258 || tag === 339 ? 3 : 1;
      if (!count || count > cap || (values += count) > 100000) fail();
      const size=type===1?1:type===3?2:4, start=count*size<=4?e+8:u32(e+8); range(start,count*size);
      tags.set(tag,Array.from({length:count},(_,j)=>type===1?b[start+j]:type===3?u16(start+j*2):u32(start+j*4)));
    }
    const one=(tag,def)=>tags.has(tag)?(tags.get(tag).length===1?tags.get(tag)[0]:fail()):def;
    const width=one(256),height=one(257),samples=one(277,1),bits=tags.get(258)||[1],compression=one(259,1),photo=one(262,0),rows=one(278,height),predictor=one(317,1);
    if (!width || !height || width>12000 || height>12000 || width*height>MAX_PIXELS || (total+=width*height)>MAX_TOTAL_PIXELS) fail();
    if (![1,3].includes(samples) || bits.length!==samples || bits.some(x=>x!==8) || ![1,5,8,32946].includes(compression) || ![0,1,2].includes(photo) || (samples===3)!==(photo===2) || one(284,1)!==1 || one(274,1)!==1 || ![1,2].includes(predictor) || !rows || rows>height) fail();
    const sampleFormat = tags.get(339);
    if (one(266,1) !== 1 || (sampleFormat && (sampleFormat.length !== samples || sampleFormat.some(v=>v!==1)))) fail();
    const offsets=tags.get(273),lengths=tags.get(279),strips=Math.ceil(height/rows);
    if (!offsets || !lengths || offsets.length!==strips || lengths.length!==strips) fail();
    offsets.forEach((v,i)=>{if (!lengths[i]) fail();range(v,lengths[i]);});
    pages.push({width,height,samples,compression,photo,rows,predictor,offsets,lengths}); o=u32(o+2+n*12);
  }
  if (!pages.length) fail(); return pages;
}
function lzw(input,expected) {
  const output=Buffer.alloc(expected); let out=0,bit=0,width=9,next=258,prev=null,table=[];
  const reset=()=>{table=Array.from({length:256},(_,i)=>Buffer.from([i]));width=9;next=258;prev=null;}; reset();
  const code=()=>{if(bit+width>input.length*8)fail();let v=0;for(let i=0;i<width;i++,bit++)v=(v<<1)|((input[bit>>3]>>(7-(bit&7)))&1);return v;};
  let ended=false;
  while(bit+width<=input.length*8){const c=code();if(c===256){reset();continue;}if(c===257){ended=true;break;}
    const entry=table[c]||(c===next&&prev?Buffer.concat([prev,prev.subarray(0,1)]):null);if(!entry||out+entry.length>expected)fail();entry.copy(output,out);out+=entry.length;
    if(prev&&next<4096){table[next++]=Buffer.concat([prev,entry.subarray(0,1)]);if(next===(1<<width)-1&&width<12)width++;}prev=entry;
  }
  if(!ended||out!==expected)fail();return output;
}
function decode(b,p) {
  const stride=p.width*p.samples,out=Buffer.alloc(stride*p.height);let at=0;
  p.offsets.forEach((offset,i)=>{
    const rows=Math.min(p.rows,p.height-i*p.rows),expected=rows*stride,input=b.subarray(offset,offset+p.lengths[i]);let raw;
    if(p.compression===1)raw=input;else if(p.compression===5)raw=lzw(input,expected);else raw=zlib.inflateSync(input,{maxOutputLength:expected});
    if(raw.length!==expected)fail();raw.copy(out,at);
    if(p.predictor===2)for(let r=0;r<rows;r++)for(let x=p.samples;x<stride;x++)out[at+r*stride+x]=(out[at+r*stride+x]+out[at+r*stride+x-p.samples])&255;
    at+=expected;
  });
  if(p.photo===0)for(let i=0;i<out.length;i++)out[i]=255-out[i];return out;
}
function crc(b){let c=0xffffffff;for(const v of b){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(name,b){const t=Buffer.from(name),o=Buffer.alloc(b.length+12);o.writeUInt32BE(b.length);t.copy(o,4);b.copy(o,8);o.writeUInt32BE(crc(Buffer.concat([t,b])),8+b.length);return o;}
function png(b,p){const pixels=decode(b,p),stride=p.width*p.samples,scan=Buffer.alloc((stride+1)*p.height);for(let r=0;r<p.height;r++)pixels.copy(scan,r*(stride+1)+1,r*stride,(r+1)*stride);const h=Buffer.alloc(13);h.writeUInt32BE(p.width);h.writeUInt32BE(p.height,4);h[8]=8;h[9]=p.samples===3?2:0;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',zlib.deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);}
function validate(b){const pages=inspect(b);for(const p of pages)decode(b,p);return pages;}
module.exports={isTiff,inspect,validate,png,MAX_PAGES,MAX_PIXELS,MAX_TOTAL_PIXELS};
