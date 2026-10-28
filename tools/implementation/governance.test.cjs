'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateProgram}=require('./governance.cjs'),program=require('../../docs/implementation/program.json');
test('operational program dependencies remain valid and deployment unauthorized',()=>assert.deepEqual(validateProgram(program),{valid:true,items:12,deploymentAuthorized:false}));
test('removed scope cannot leave dangling dependencies',()=>{const p=structuredClone(program);p.items[0].dependencies=['IP-02'];assert.throws(()=>validateProgram(p),/INVALID_ITEM/);});
test('cyclic operational dependencies refuse',()=>{const p=structuredClone(program);p.items[0].dependencies=['IP-03'];assert.throws(()=>validateProgram(p),/CYCLIC/);});
