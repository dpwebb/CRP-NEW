'use strict';
const {ServiceError}=require('./errors.cjs');
const MAX_RESULT_BYTES=16*1024*1024;
// Count JSON bytes without materializing a giant JSON string. Shared provenance
// is counted at every serialized occurrence; memoization only avoids rewalking it.
function inspect(value,limit=MAX_RESULT_BYTES){
 if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_RESULT_BYTES)throw Error('INVALID_ASSESSMENT_BUDGET');
 const memo=new WeakMap(),active=new WeakSet(),over={};
 const add=(a,b)=>{if(a+b>limit)throw over;return a+b;};
 function visit(v,depth=0){
  if(depth>100)throw over;
  if(v===null)return 4;
  if(typeof v==='string'){if(v.length>limit)throw over;const bytes=Buffer.byteLength(JSON.stringify(v));if(bytes>limit)throw over;return bytes;}
  if(typeof v==='number')return Number.isFinite(v)?String(v).length:4;
  if(typeof v==='boolean')return v?4:5;
  if(typeof v!=='object')throw over;
  if(active.has(v))throw over;if(memo.has(v))return memo.get(v);
  if(v instanceof Date)return visit(v.toJSON(),depth+1);
  active.add(v);let total=2,count=0;
  if(Array.isArray(v)){for(const item of v){if(count++)total=add(total,1);total=add(total,item===undefined?4:visit(item,depth+1));}}
  else for(const [key,item]of Object.entries(v)){if(item===undefined)continue;if(count++)total=add(total,1);total=add(total,visit(key,depth+1)+1);total=add(total,visit(item,depth+1));}
  active.delete(v);memo.set(v,total);return total;
 }
 try{return {within:true,bytes:visit(value),limitBytes:limit};}catch(e){if(e!==over)throw e;return {within:false,bytes:null,limitBytes:limit};}
}
function requireBudget(value){const result=inspect(value);if(!result.within)throw new ServiceError('ASSESSMENT_REVIEW_LIMIT',{limit_bytes:MAX_RESULT_BYTES,source_preserved:true,partial_result_saved:false});return result;}
module.exports={inspect,requireBudget,MAX_RESULT_BYTES};
