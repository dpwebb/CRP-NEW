import test from 'node:test';import assert from 'node:assert/strict';
import {actions,reads,actionBody,nativePath} from '../src/catalog.mjs';
test('support, liability and review navigation stays on native scoped APIs',()=>{
 assert.equal(reads.crp.support.permission,'accounts.read');assert.equal(reads.affiliate.liabilities.path,'/api/liabilities');
 assert.equal(reads.crp.outcomes.path,'/api/admin/outcomes');assert.equal(reads.affiliate.assurance.path,'/api/assurance');
 const key='fictional-unique-key',op=actions.crp['support.review'],at=Date.now()+3600000;
 const body=actionBody(op,{expectedRevision:1,status:'ACKNOWLEDGED',message:'Fictional update',nextUpdateAt:at},key);
 assert.equal(body.nextUpdateAt,at);assert.equal(body.requestId,key);assert.equal(op.owner,true);
 assert.equal(nativePath(op,'help_example'),'/api/admin/support/help_example');
 assert.throws(()=>nativePath(op,'../accounts'),/INVALID_RECORD_ID/);
 assert.throws(()=>actionBody(op,{expectedRevision:1,status:'ACKNOWLEDGED',message:'x',nextUpdateAt:at,executePayment:true},key),/INVALID_FIELDS/);
 const incident=actions.mail['incident.review'];assert.equal(incident.owner,true);assert.equal(incident.permission,'fulfillment.prepare');
 assert.equal(actions.mail['order.review'].requestId,true);
});
