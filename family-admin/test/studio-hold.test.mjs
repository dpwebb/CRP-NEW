import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixtures } from './fixtures.mjs';
import { configuration } from '../src/config.mjs';
import { reads, actions } from '../src/catalog.mjs';

test('Studio withdrawal removes its catalog and refuses every retained read, export and action before native dispatch',async t=>{
  const f=await fixtures({singleSignIn:true});t.after(()=>f.close());
  f.portal.gateway.config.creativeStudio=false;
  await f.login();
  const session=await f.request('/api/session');
  assert.equal(session.status,200);
  assert(!session.json.catalog.reads.affiliate.some(n=>n==='studio'||n.startsWith('studio.')));
  assert(!Object.keys(session.json.catalog.actions.affiliate).some(n=>n.startsWith('studio.')));
  const s=[...f.portal.gateway.sessions.values()][0];
  for(const [name,op]of Object.entries(reads.affiliate).filter(([,op])=>op.path.startsWith('/api/studio/'))){
    if(op.format)await assert.rejects(f.portal.gateway.document(s,'affiliate',name,'fictional'),/FEATURE_UNAVAILABLE/);
    else await assert.rejects(f.portal.gateway.read(s,'affiliate',name,'fictional',{}),/FEATURE_UNAVAILABLE/);
  }
  for(const name of Object.keys(actions.affiliate).filter(n=>n.startsWith('studio.')))
    await assert.rejects(f.portal.gateway.execute(s,'affiliate',name,{body:{},requestId:randomUUID(),confirmation:'local:affiliate:'+name}),/FEATURE_UNAVAILABLE/);
  assert(!f.state.calls.some(c=>JSON.stringify(c).includes('/api/studio/')));
  assert.equal(f.state.writes.length,0);
  for(const [app,resource]of [['crp','accounts'],['affiliate','partners'],['mail','orders']])
    assert.equal((await f.request('/api/apps/'+app+'/'+resource)).status,200,app);
  assert.equal((await f.request('/api/documents/affiliate/studio.export?id=fictional')).status,404);
});

test('Studio setting rejects ambiguous values and preserves existing environment defaults',()=>{
  const raw={environment:'local',origin:'http://127.0.0.1:4395'};
  assert.equal(configuration(raw).creativeStudio,true);
  assert.equal(configuration({...raw,creativeStudio:false}).creativeStudio,false);
  assert.equal(configuration({...raw,creativeStudio:true}).creativeStudio,true);
  for(const value of ['false',0,null,{}])assert.throws(()=>configuration({...raw,creativeStudio:value}),/INVALID_CREATIVE_STUDIO_CONFIGURATION/);
});
