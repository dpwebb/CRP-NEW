'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {campaignDecision,validateProgram,sha}=require('./governance.cjs');
const claims=require('../../docs/implementation/claims.json'),program=require('../../docs/implementation/program.json');
test('all program dependencies valid and deployment remains unauthorized',()=>assert.equal(validateProgram(program).items,13));
test('all current markets and offers need actual decisions',()=>{for(const m of claims.markets)for(const o of m.offers)for(const c of m.channels)assert.equal(campaignDecision(claims,{country:m.country,offer:o.offer,channel:c.channel,copy:'A clear review'}).cleared,false);});
test('decisions bind exact copy and never activate a campaign',()=>{const x=structuredClone(claims),m=x.markets[0],copy='Understand supported issues';
 const approved={decision:'CLEARED',reviewer:'Fictional qualified reviewer',evidence:'fictional-review-only',reviewedAt:'2026-10-28T00:00:00Z'};
 Object.assign(m.offers[0],approved);Object.assign(m.channels[0],approved,{approvedCopyHash:sha(copy)});
 assert.equal(campaignDecision(x,{country:'US',offer:'assessment_once',channel:'google',copy}).cleared,true);
 assert.equal(campaignDecision(x,{country:'US',offer:'assessment_once',channel:'google',copy:copy+' changed'}).cleared,false);
 assert.equal(campaignDecision(x,{country:'US',offer:'assessment_once',channel:'google',copy}).activationAuthorized,false);
 delete m.channels[0].evidence;assert.equal(campaignDecision(x,{country:'US',offer:'assessment_once',channel:'google',copy}).cleared,false);
});
test('unsupported scope and forbidden promises fail and cycles refused',()=>{assert.equal(campaignDecision(claims,{country:'NZ',offer:'loan',channel:'google',copy:'guaranteed correction'}).eligibleForReview,false);const p=structuredClone(program);p.items[0].dependencies=['IP-02'];assert.throws(()=>validateProgram(p),/CYCLIC/);});

