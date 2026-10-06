const fs=require('fs'),vm=require('vm'),assert=require('assert');
// The jurisdiction surface is generated into consumer-wizard/dist/jurisdiction-data.js (PROD-002), so the
// self-check loads that file first. Selections are canonical codes from CRP-JURISDICTION-ENUM-1: the
// demonstration no longer carries display names as stored values.
const nodes={};const element=id=>nodes[id]??(nodes[id]={style:{},scrollIntoView(){}});
const context={window:{},document:{getElementById:element,querySelectorAll:()=>[]},URL,Blob,setTimeout};
vm.createContext(context);
vm.runInContext(fs.readFileSync('consumer-wizard/dist/jurisdiction-data.js','utf8'),context);
vm.runInContext(fs.readFileSync('consumer-wizard/dist/app.js','utf8'),context);
assert.throws(()=>vm.runInContext('go(1)',context),/Select country/);
vm.runInContext(`state.country='CA';state.region='CA-NS';go(1);`,context);
assert.throws(()=>vm.runInContext('go(2)',context),/Load/);
vm.runInContext('state.loaded=true;go(2)',context);
assert.throws(()=>vm.runInContext('go(3)',context),/Review/);
vm.runInContext('state.reviewed=true;go(3)',context);
assert.throws(()=>vm.runInContext('go(4)',context),/Approve/);
vm.runInContext('state.approved=true;go(4)',context);
assert(nodes.panel.innerHTML.includes('Delivery has not occurred'));
nodes.reset.onclick();assert(nodes.panel.innerHTML.includes('choose your jurisdiction'));
console.log('PASS: jurisdiction, sample, review and approval gates; full flow; reset');
