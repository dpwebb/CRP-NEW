import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function navigation(){
 const events={},history=[],nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{setAttribute(){},classList:{remove(){}}});return nodes.get(id);};
 const c={S:{session:{catalog:{reads:{affiliate:['commissions','report']}},permissions:[]},hasWorkspace:true,locked:false},pages:{overview:{},commissions:{app:'affiliate',resource:'commissions'},report:{app:'affiliate',resource:'report'},studio:{app:'affiliate',resource:'studio'},activity:{}},location:{hash:'#commissions'},history:{pushState(a,b,hash){history.push(['push',hash]);c.location.hash=hash;},replaceState(a,b,hash){history.push(['replace',hash]);c.location.hash=hash;}},window:{addEventListener:(name,fn)=>events[name]=fn,scrollTo(){}},document:{body:{classList:{remove(){}}}},$:node,notice(){},load(){c.loads=(c.loads||0)+1;}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function requestedView()'),source.indexOf('function empty(')),c);return {c,events,history};
}
test('authenticated deep links, normal navigation and browser history retain allowed destinations',()=>{
 const {c,events,history}=navigation();assert.equal(c.requestedView(),'commissions');c.navigate(c.requestedView(),{replace:true});assert.equal(c.S.view,'commissions');
 c.navigate('report');assert.equal(c.location.hash,'#report');assert.deepEqual(history.at(-1),['push','#report']);
 c.location.hash='#commissions';events.hashchange();assert.equal(c.S.view,'commissions');assert.equal(history.length,1,'Back does not push a new entry');
 c.location.hash='#studio';events.hashchange();assert.equal(c.S.view,'overview');assert.deepEqual(history.at(-1),['replace','#overview']);
 c.location.hash='#activity';events.hashchange();assert.equal(c.S.view,'overview','audit permission still required');
 c.location.hash='#%ZZ';assert.equal(c.requestedView(),'overview');
 c.S.locked=true;c.location.hash='#report';const before=c.loads;events.hashchange();assert.equal(c.loads,before,'locked workspace does not load destination');
 c.S.locked=false;c.navigate(c.requestedView(),{replace:true});assert.equal(c.S.view,'report','destination resumes after unlock');
});
test('record date detection formats epoch/ISO facts without changing monetary or missing values',()=>{
 const c={Date,Number,String};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function isDateField('),source.indexOf('function recordFields(')),c);
 for(const value of [1792796400000,'1792796400000','2026-10-24T12:00:00.000Z']){assert.equal(c.isDateField('created_at',value),true);assert.notEqual(c.displayDate(value),String(value));}
 assert.equal(c.isDateField('amount_minor',1792796400000),false);assert.equal(c.isDateField('created_at',null),false);assert.equal(c.isDateField('created_at',42),false);
});
