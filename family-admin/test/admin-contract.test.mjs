import test from 'node:test';
import assert from 'node:assert/strict';
import { actionBody,operation } from '../src/catalog.mjs';

test('bureau address form builds only the native postal fields; native actor and provider flags cannot be supplied',()=>{
  const op=operation('mail','recipient.verify',true),key='11111111-1111-4111-8111-111111111111';
  const fields={country:'CA',bureau:'EQUIFAX',address:'Fictional published bureau address',addressLine1:'123 Fictional Street',city:'Halifax',provinceOrState:'NS',postalOrZip:'B3J 1A1'};
  assert.deepEqual(actionBody(op,fields,key),{country:'CA',bureau:'EQUIFAX',address:fields.address,postalFields:{addressLine1:fields.addressLine1,city:'Halifax',provinceOrState:'NS',postalOrZip:'B3J 1A1',addressLine2:''},requestId:key});
  for(const extra of [{actor:'forged'},{verified:true},{postalFields:{addressLine1:'arbitrary nested input'}},{requestId:'caller-native-id'}])assert.throws(()=>actionBody(op,{...fields,...extra},key),/INVALID_FIELDS/);
});
test('native organization creation and partner activation retain native contract and assent boundary',()=>{
  const org=operation('crp','organization.add',true),activate=operation('affiliate','partner.activate',true);
  assert.deepEqual(actionBody(org,{name:'Fictional organization'}),{name:'Fictional organization'});
  assert.throws(()=>actionBody(org,{name:'Fictional organization',status:'ACTIVE'}),/INVALID_FIELDS/);
  assert.throws(()=>actionBody(activate,{}),/REQUIRED_FIELD/);
  assert.deepEqual(actionBody(activate,{termsVersion:'native-current-version'}),{termsVersion:'native-current-version'});
  assert.throws(()=>actionBody(activate,{termsVersion:'native-current-version',accepted:true}),/INVALID_FIELDS/);
});
