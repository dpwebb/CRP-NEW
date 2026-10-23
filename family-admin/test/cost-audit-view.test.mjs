import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {nativePath,reads} from '../src/catalog.mjs';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const view=source.slice(source.indexOf('async function appView('),source.indexOf('function numeric('));
function element(tag,text){return {tag,text:text??'',children:[],append(...nodes){this.children.push(...nodes);},prepend(...nodes){this.children.unshift(...nodes);},setAttribute(){}};}
function all(node){return [node,...node.children.flatMap(all)];}
async function render(resource,{role='owner',included=false,data={items:[]},app='affiliate'}={}){
 const root=element('main'),requests=[],state={generation:1,includeSimulation:included,market:'CA',session:{role,applications:{[app]:{linked:true}}}};
 let loads=0;const context=vm.createContext({S:state,URLSearchParams,el:element,btn:()=>element('button'),actionButtons:()=>element('actions'),items:d=>d.items??[],table:()=>element('table'),$:()=>element('observed'),load:()=>loads++,api:async url=>{requests.push(url);return {observedAt:'2026-10-23T14:00:00Z',data};}});
 vm.runInContext(view,context);await context.appView(app,resource,root,1);return {root,requests,state,loads:()=>loads};
}
test('owner cost audit view exposes explicit inclusion and limits query to cost/report resources',async()=>{
 for(const resource of ['costs','report']){
  const v=await render(resource);assert.equal(v.requests[0],'/api/apps/affiliate/'+resource);
  const checkbox=all(v.root).find(n=>n.type==='checkbox');assert(checkbox,'owner must be able to include hidden simulation audit entries');assert.equal(checkbox.checked,false);
  checkbox.checked=true;checkbox.onchange();assert.equal(v.state.includeSimulation,true);assert.equal(v.loads(),1);
  const included=await render(resource,{included:true});assert.equal(included.requests[0],'/api/apps/affiliate/'+resource+'?includeSimulation=1');
 }
 const staff=await render('report',{role:'staff'});assert(!all(staff.root).some(n=>n.type==='checkbox'));
 const other=await render('contacts',{included:true});assert.equal(other.requests[0],'/api/apps/affiliate/contacts');
 assert.equal(nativePath(reads.affiliate.costs,undefined,{includeSimulation:'1'}),'/api/operating-costs?includeSimulation=1');
 assert.throws(()=>nativePath(reads.affiliate.costs,undefined,{arbitrary:'1'}),/INVALID_QUERY/);
});
test('cost totals use exact recorded-cost strings and entry counts while billing totals retain their own contract',async()=>{
 const cost=await render('costs',{data:{items:[],totals:[{currency:'CAD',recorded_cost_minor:'9007199254740993',entries:2},{currency:'GBP',recorded_cost_minor:'0',entries:4}]}});
 const text=all(cost.root).map(n=>n.text).join(' ');assert.match(text,/Recorded cost totals/);assert.match(text,/CAD 9007199254740993 minor units \(2 entries\)/);assert.match(text,/GBP 0 minor units \(4 entries\)/);assert(!text.includes('undefined'));assert(!text.includes('profit'));
 const billing=await render('billing',{app:'crp',data:{items:[],totals:[{currency:'CAD',verified_paid_minor:123,purchase_count:2}]}});
 assert.match(all(billing.root).map(n=>n.text).join(' '),/Verified totals by currency: CAD 123 minor units \(2 purchases\)/);
});
