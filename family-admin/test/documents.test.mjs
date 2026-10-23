import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from './fixtures.mjs';

test('approved documents retain exact bytes and are withheld if native access is revoked during retrieval',async t=>{
  const f=await fixtures();t.after(()=>f.close());await f.login();await f.connect();
  const normal=f.portal.gateway.fetcher,bytes=Buffer.from('%PDF-1.7\nfictional native exact bytes\n%%EOF');
  let type='application/pdf',revoke=false;
  f.portal.gateway.fetcher=async(url,options)=>{
    if(new URL(url).pathname==='/staff/api/orders/fictional-order/packet'){
      if(revoke)f.state.active=false;
      return new Response(bytes,{headers:{'content-type':type}});
    }return normal(url,options);
  };
  const s=[...f.portal.gateway.sessions.values()][0];
  assert.deepEqual(await f.portal.gateway.document(s,'mail','packet','fictional-order'),bytes);
  assert(f.portal.journal.events.some(e=>e.type==='DOCUMENT_VIEWED'||e.event==='DOCUMENT_VIEWED'));
  type='text/plain';await assert.rejects(f.portal.gateway.document(s,'mail','packet','fictional-order'),/UPSTREAM_INVALID_DOCUMENT/);
  type='application/pdf';revoke=true;await assert.rejects(f.portal.gateway.document(s,'mail','packet','fictional-order'),/PRIMARY_AUTHENTICATION_REQUIRED/);
});

test('document endpoint refuses arbitrary paths, unknown formats, duplicated IDs and anonymous access',async t=>{
  const f=await fixtures();t.after(()=>f.close());
  assert.equal((await f.request('/api/documents/mail/packet?id=x')).status,401);
  await f.login();
  assert.equal((await f.request('/api/documents/mail/packet?id=x&id=y')).status,400);
  assert.equal((await f.request('/api/documents/crp/preview?id=x')).status,404);
  await f.connect();
  assert.equal((await f.request('/api/documents/mail/packet?id=..%2fsecret')).status,400);
  const s=[...f.portal.gateway.sessions.values()][0];
  await assert.rejects(f.portal.gateway.read(s,'mail','packet','x'),/DOCUMENT_ENDPOINT_REQUIRED/);
});
