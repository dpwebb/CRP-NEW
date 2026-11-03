'use strict';
// Only immutable plain snapshot graphs are eligible. Unsupported data follows
// the original structuredClone path; no mutator is called twice or proxied.
const {types}=require('node:util');
const indexed=new WeakMap(),UNSUPPORTED=Symbol('unsupported snapshot');let nextId=1;
function entries(value,array){if(types.isProxy(value)||Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))throw UNSUPPORTED;const out=[];for(const key of Reflect.ownKeys(value)){if(array&&key==='length')continue;if(typeof key!=='string')throw UNSUPPORTED;const d=Object.getOwnPropertyDescriptor(value,key);if(!d.enumerable||!('value'in d))throw UNSUPPORTED;out.push([key,d.value]);}return out;}
function primitive(value){if(typeof value==='function'||typeof value==='symbol')throw UNSUPPORTED;return value===null||typeof value!=='object';}
function index(value,active=new Set()){
 if(primitive(value))return null;if(indexed.has(value))return indexed.get(value);
 if(types.isProxy(value))throw UNSUPPORTED;
 if(!Object.isFrozen(value)||active.has(value)||nextId>=Number.MAX_SAFE_INTEGER)throw UNSUPPORTED;
 const array=Array.isArray(value),props=entries(value,array),id=nextId++;active.add(value);let min=id,max=id;
 for(const [,child]of props){const m=index(child,active);if(m){min=Math.min(min,m.min);max=Math.max(max,m.max);}}
 active.delete(value);const m={id,min,max,array,length:array?value.length:0};indexed.set(value,m);return m;
}
function incomingRanges(value,out=[],seen=new Set()){
 if(primitive(value)||seen.has(value))return out;seen.add(value);
 const m=indexed.get(value);if(m){out.push([m.min,m.max]);return out;}
 for(const [,child]of entries(value,Array.isArray(value)))incomingRanges(child,out,seen);return out;
}
function merged(ranges){ranges.sort((a,b)=>a[0]-b[0]);const out=[];for(const r of ranges){const p=out.at(-1);if(p&&r[0]<=p[1]+1)p[1]=Math.max(p[1],r[1]);else out.push(r.slice());}return out;}
function intersects(ranges,min,max){let lo=0,hi=ranges.length;while(lo<hi){const mid=(lo+hi)>>1;if(ranges[mid][1]<min)lo=mid+1;else hi=mid;}return lo<ranges.length&&ranges[lo][0]<=max;}
function define(target,key,value){Object.defineProperty(target,key,{value,writable:true,enumerable:true,configurable:true});}
function shell(value){return Array.isArray(value)?new Array(value.length):{};}
function rewriteIndexedGraph(before,ranges){
 const memo=new WeakMap();
  function rewrite(value){if(primitive(value))return value;const m=indexed.get(value);if(!intersects(ranges,m.min,m.max))return value;if(memo.has(value))return memo.get(value);
   let changed=intersects(ranges,m.id,m.id),values=[];for(const [key,child]of entries(value,m.array)){const result=rewrite(child);if(result!==child)changed=true;values.push([key,result]);}
   if(!changed){memo.set(value,value);return value;}const out=shell(value);for(const [key,v]of values)define(out,key,v);memo.set(value,out);return out;
  }
 return ranges.length?rewrite(before):before;
}
function prepareAppend(before,key,create){
 if(!['cases','files','results'].includes(key))throw Error('PRIVATE_STORE_APPEND_COLLECTION_INVALID');
 let prefix,eligible=true;try{index(before);}catch(error){if(error!==UNSUPPORTED&&!(error instanceof RangeError))throw error;eligible=false;prefix=structuredClone(before);}const base=eligible?before:prefix;if(!Object.hasOwn(base,key)||!Array.isArray(base[key]))throw Error('PRIVATE_STORE_APPEND_COLLECTION_INVALID');const created=create();
 try{
  if(!eligible)return appendResult(prefix,key,created);const selected=indexed.get(before[key]);const ranges=merged(incomingRanges(created).concat([[selected.id,selected.id]]));
  prefix=rewriteIndexedGraph(before,ranges);
 }catch(error){if(error!==UNSUPPORTED&&!(error instanceof RangeError))throw error;prefix=structuredClone(before);}
 return appendResult(prefix,key,created);
}
function appendResult(prefix,key,created){prefix[key].push(created);return{next:prefix,created};}
function appendRecord(store,key,create){if(typeof store.appendRecord==='function')return store.appendRecord(key,create);return store.update(state=>{if(!['cases','files','results'].includes(key)||!Object.hasOwn(state,key)||!Array.isArray(state[key]))throw Error('PRIVATE_STORE_APPEND_COLLECTION_INVALID');const created=create();state[key].push(created);return created;});}

// This internal fast path is only for the resolver's two timestamp assignments.
// Descriptor reads never invoke a prototype/find getter during eligibility.
const SESSION_OBJECT_PROTO=Object.prototype,SESSION_ARRAY_PROTO=Array.prototype;
const SESSION_GET_PROTO=Object.getPrototypeOf,SESSION_GET_DESC=Object.getOwnPropertyDescriptor;
const SESSION_GET_DESCS=Object.getOwnPropertyDescriptors,SESSION_KEYS=Reflect.ownKeys;
const SESSION_DEFINE=Object.defineProperty,SESSION_IS=Object.is,SESSION_PROXY=types.isProxy;
const SESSION_FIND_DESC=SESSION_GET_DESC(SESSION_ARRAY_PROTO,'find');
const SESSION_DESC_FIELDS=['value','get','set','writable','enumerable','configurable'];
function sessionDescriptorSame(a,b){
 if(!a||!b)return a===b;
 for(let i=0;i<SESSION_DESC_FIELDS.length;i++){
  const key=SESSION_DESC_FIELDS[i],x=SESSION_GET_DESC(a,key),y=SESSION_GET_DESC(b,key);
  if(!x||!y){if(x!==y)return false;}
  else if(!SESSION_IS(x.value,y.value))return false;
 }
 return true;
}
function sessionPrototypeChain(root){
 const chain=[];let node=root;
 while(node!==null){
  for(let i=0;i<chain.length;i++)if(chain[i].node===node)throw Error('PRIVATE_STORE_SESSION_CONTEXT_INVALID');
  const opaque=SESSION_PROXY(node),row={node,opaque};
  if(!opaque){row.parent=SESSION_GET_PROTO(node);row.descriptors=SESSION_GET_DESCS(node);row.keys=SESSION_KEYS(row.descriptors);}
  SESSION_DEFINE(chain,String(chain.length),{value:row,writable:true,enumerable:true,configurable:true});
  if(opaque)break;node=row.parent;
 }
 return chain;
}
function sessionContext(){return{object:sessionPrototypeChain(SESSION_OBJECT_PROTO),array:sessionPrototypeChain(SESSION_ARRAY_PROTO)};}
function sessionContextSame(a,b){
 const names=['object','array'];
 for(let n=0;n<names.length;n++){
  const x=a[names[n]],y=b[names[n]];if(x.length!==y.length)return false;
  for(let i=0;i<x.length;i++){
   const left=x[i],right=y[i];if(left.node!==right.node||left.opaque!==right.opaque||left.parent!==right.parent)return false;
   if(left.opaque)continue;
   if(left.keys.length!==right.keys.length)return false;
   for(let k=0;k<left.keys.length;k++){
    const key=left.keys[k];if(key!==right.keys[k])return false;
    if(!sessionDescriptorSame(SESSION_GET_DESC(left.descriptors,key).value,SESSION_GET_DESC(right.descriptors,key).value))return false;
   }
  }
 }
 return true;
}
function sessionContextEligible(context){
 const object=context.object,array=context.array;
 if(object.length!==1||object[0].node!==SESSION_OBJECT_PROTO||object[0].opaque||object[0].parent!==null)return false;
 if(array.length!==2||array[0].node!==SESSION_ARRAY_PROTO||array[0].opaque||array[0].parent!==SESSION_OBJECT_PROTO||array[1].node!==SESSION_OBJECT_PROTO||array[1].opaque||array[1].parent!==null)return false;
 const chains=[object,array];
 for(let c=0;c<chains.length;c++)for(let i=0;i<chains[c].length;i++)if(SESSION_GET_DESC(chains[c][i].descriptors,'toJSON'))return false;
 const find=SESSION_GET_DESC(SESSION_ARRAY_PROTO,'find');
 return Boolean(find&&SESSION_GET_DESC(find,'value')&&typeof find.value==='function'&&sessionDescriptorSame(find,SESSION_FIND_DESC));
}
function indexedSessionDraft(before,sessionId,context){
 if(!sessionContextEligible(context))throw UNSUPPORTED;
 index(before);
 if(typeof sessionId!=='string'||!sessionId)throw UNSUPPORTED;
 const desc=Object.getOwnPropertyDescriptor(before,'sessions');
 if(!desc||!('value'in desc)||!Array.isArray(desc.value))throw UNSUPPORTED;
 const sessions=desc.value;if(SESSION_GET_DESC(sessions,'find'))throw UNSUPPORTED;let selected;
 for(let i=0;i<sessions.length;i++){
  const own=Object.getOwnPropertyDescriptor(sessions,String(i));
  if(!own||!('value'in own))throw UNSUPPORTED;
  const row=own.value,meta=row&&typeof row==='object'?indexed.get(row):null;
  if(!meta||meta.array)throw UNSUPPORTED;
  const id=Object.getOwnPropertyDescriptor(row,'session_id');
  if(!id||!('value'in id)||typeof id.value!=='string')throw UNSUPPORTED;
  if(!selected&&id.value===sessionId)selected=row;
 }
 if(!selected)throw UNSUPPORTED;
 const meta=indexed.get(selected);
 return rewriteIndexedGraph(before,[[meta.id,meta.id]]);
}
function assertSessionScalars(prior,live){
 const after=SESSION_GET_DESCS(live),beforeKeys=SESSION_KEYS(prior),afterKeys=SESSION_KEYS(after);
 for(let pass=0;pass<2;pass++){
  const keys=pass?afterKeys:beforeKeys;
  for(let i=0;i<keys.length;i++){
   const key=keys[i],a=SESSION_GET_DESC(prior,key)?.value,b=SESSION_GET_DESC(after,key)?.value;
   if(key==='last_seen_at'||key==='idle_expires_at'){
    if(!b||!SESSION_GET_DESC(b,'value')||typeof b.value!=='string'||!b.enumerable||!b.writable||!b.configurable)throw Error('PRIVATE_STORE_SESSION_SCALAR_MUTATOR_INVALID');
   }else if(!sessionDescriptorSame(a,b))throw Error('PRIVATE_STORE_SESSION_SCALAR_MUTATOR_INVALID');
  }
 }
}
function prepareSessionScalars(before,sessionId,mutate){
 let next,fast=true;const eligibilityContext=sessionContext();
 try{next=indexedSessionDraft(before,sessionId,eligibilityContext);}
 catch(error){if(error!==UNSUPPORTED&&!(error instanceof RangeError))throw error;fast=false;next=structuredClone(before);}
 let beforeCallback=sessionContext();
 if(fast&&!sessionContextSame(eligibilityContext,beforeCallback)){fast=false;next=structuredClone(before);beforeCallback=sessionContext();}
 // All fallback decisions occur before this sole invocation. Never replay on an error.
 const live=next.sessions.find(row=>row.session_id===sessionId),prior=fast?SESSION_GET_DESCS(live):null;
 beforeCallback=sessionContext();
 const returned=mutate(live);
 // An internal programmer-error boundary, not an authorization or MFA check.
 if(!sessionContextSame(beforeCallback,sessionContext()))throw Error('PRIVATE_STORE_SESSION_CONTEXT_CHANGED');
 if(fast)assertSessionScalars(prior,live);
 return{next,returned};
}
module.exports={prepareAppend,appendRecord,prepareSessionScalars};
