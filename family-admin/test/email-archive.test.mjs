import test from 'node:test';import assert from 'node:assert/strict';import {reads,nativePath} from '../src/catalog.mjs';
test('saved email detail uses existing affiliate read permission and a bounded native record id',()=>{
 assert.equal(reads.affiliate.email.permission,'affiliate.read');assert.equal(nativePath(reads.affiliate.email,'fictional-id'),'/api/communications/fictional-id');assert.throws(()=>nativePath(reads.affiliate.email,'../private'));
});
