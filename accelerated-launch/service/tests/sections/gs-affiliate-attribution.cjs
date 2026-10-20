'use strict';
const assert = require('node:assert/strict'), crypto = require('node:crypto'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { PrivateStore } = require('../../private-store.cjs');
const { create } = require('../../affiliate-attribution.cjs');
async function run(unused, check) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-affiliate-fictional-'));
  const store = new PrivateStore(root), key = 'fictional-binding-key-'.repeat(3);
  let time = Date.now(), mode = 503;
  const env = { CRP_DEPLOYMENT_ENV: 'production', CRP_AFFILIATE_BINDING_ENABLED: '1', CRP_AFFILIATE_BINDING_KEY: key };
  const calls = [], fetcher = async (url, options) => { calls.push({ url, ...options }); if (mode === 0) throw Error('fictional network loss'); return { status: mode }; };
  const sign = value => { const b = Buffer.from(JSON.stringify(value)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', key).update(b).digest('base64url'); };
  const token = (extra = {}) => sign({ v: 1, origin: 'https://affiliates.creditregulatorpro.com', referralHandle: 'eyJ2IjoxfQ.fictionalSignature', consentRef: 'consent:fictional-explicit', issuedAt: time, expiresAt: time + 86400000, ...extra });
  const request = t => ({ method: 'GET', url: '/affiliate/referral?t=' + encodeURIComponent(t), headers: { cookie: 'crp_aff_ref=' + t } });
  const adapter = create(store, { env, now: () => time, fetcher });
  try {
    store.update(s => { s.accounts.push({ account_id: 'acc_fictional_a' }, { account_id: 'acc_fictional_b' }, { account_id: 'acc_fictional_paid' }); s.checkout_sessions.push({ account_id: 'acc_fictional_paid', state: 'COMPLETED' }); });
    check.equal(create(store, { env: {} }).capture(request(token())), null, 'default disabled captures nothing');
    assert.throws(() => create(store, { env: { ...env, CRP_AFFILIATE_ORIGIN: 'https://attacker.test' } }), /CONFIGURATION_INVALID/); check.ok(true, 'arbitrary dispatch origin refused');
    assert.throws(() => create(store, { env: { ...env, CRP_DEPLOYMENT_ENV:'staging', CRP_AFFILIATE_ORIGIN:'https://affiliates.creditregulatorpro.com' } }), /CONFIGURATION_INVALID/);check.ok(true,'staging cannot send to production');
    const valid = token(), captured = adapter.capture(request(valid));
    check.equal(captured.status, 303, 'signed consent handoff redirects without query');
    check.equal(captured.headers.Location, '/', 'no external/open redirect');
    check.ok(captured.headers['Set-Cookie'].includes('HttpOnly') && captured.headers['Set-Cookie'].includes('Secure') && !captured.headers['Set-Cookie'].includes('Domain='), 'first-party host-only secure cookie');
    for (const bad of [valid + 'x', token({ expiresAt: time - 1 }), token({ origin: 'https://attacker.test' }), token({ issuedAt: time + 400000 }), token({ expiresAt: time + 91 * 86400000 }), token({ consentRef: '' }), token({ email: 'forbidden@example.test' })]) check.equal(adapter.capture(request(bad)).headers['Set-Cookie'], undefined, 'invalid/expired/nonminimal handoff cannot set cookie');
    adapter.bind(request(valid), { account_id: 'acc_fictional_a' });
    check.equal(calls.length, 0, 'binding persists without waiting for network');
    const original = store.state().accounts[0].affiliate_binding;
    check.equal(original.body.binding.consumerRef, 'acc_fictional_a', 'account reference comes from server actor');
    check.equal(Object.keys(original.body.binding).sort().join(','), 'boundAt,consentRef,consumerRef,referralHandle', 'minimal binding only');
    adapter.bind(request(token({ consentRef: 'consent:replacement' })), { account_id: 'acc_fictional_a' });
    check.equal(store.state().accounts[0].affiliate_binding.body.eventId, original.body.eventId, 'fixed binding cannot be overwritten');
    adapter.bind(request(valid), { account_id: 'acc_fictional_paid' });
    check.equal(store.state().accounts[2].affiliate_binding, undefined, 'already paid account cannot acquire initial binding');
    check.equal(store.state().accounts[1].affiliate_binding, undefined, 'unrelated account unchanged');
    await adapter.drain();
    check.equal(store.state().accounts[0].affiliate_binding.state, 'READY', 'outage retained for retry');
    check.equal(calls[0].redirect, 'error', 'delivery cannot forward key across redirect');
    const [t, signature] = calls[0].headers['X-Affiliate-Signature'].split(',v1=');
    check.equal(signature, crypto.createHmac('sha256', key).update(t.slice(2) + '.').update(calls[0].body).digest('hex'), 'signature covers exact delivered raw body');
    check.equal(await adapter.drain(), false, 'backoff prevents immediate replay');
    adapter.close(); time += 120000; mode = 200;
    const restartedStore = new PrivateStore(root), restarted = create(restartedStore, { env, now: () => time, fetcher });
    await restarted.drain();
    check.equal(calls[1].body, calls[0].body, 'restart uses same event ID, binding time and body');
    check.ok(calls[1].headers['X-Affiliate-Signature'] !== calls[0].headers['X-Affiliate-Signature'], 'retry refreshes transport timestamp signature');
    check.equal(restartedStore.state().accounts[0].affiliate_binding.state, 'SENT', 'receiver acceptance recorded');
    const before = fs.readFileSync(restartedStore.stateFile, 'utf8');
    check.equal(await restarted.drain(), false, 'accepted event not resent');
    check.equal(fs.readFileSync(restartedStore.stateFile, 'utf8'), before, 'idle drain does not rewrite consumer store');
    mode = 401; restarted.bind(request(token()), { account_id: 'acc_fictional_b' }); await restarted.drain();
    check.equal(restartedStore.state().accounts[1].affiliate_binding.state, 'DEAD', 'bad integration credentials require reconciliation instead of retry loop');
    restartedStore.update(s => { s.accounts = s.accounts.filter(a => a.account_id !== 'acc_fictional_b'); });
    check.equal(restartedStore.state().accounts.some(a => a.account_id === 'acc_fictional_b'), false, 'account deletion removes its attached outbox');
    restarted.close();
    const {createService}=require('../../app.cjs'),http=require('node:http');
    const service=createService({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'crp-affiliate-http-fictional-')),registrationMailer:async()=>{},affiliate:{env,now:()=>time,fetcher}});
    const server=http.createServer((req,res)=>{void service.handle(req,res);});
    try {
      await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
      const capturedHttp=await fetch(base+'/affiliate/referral?t='+encodeURIComponent(token()),{redirect:'manual'});
      check.equal(capturedHttp.status,303,'actual consumer HTTP route accepts signed handoff');
      const tracking=capturedHttp.headers.get('set-cookie').split(';')[0];
      const registered=await fetch(base+'/api/accounts',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:tracking},body:JSON.stringify({email:'fictional-affiliate-http@example.test',password:'fictional-affiliate-passphrase'})});
      check.equal(registered.status,201,'signup succeeds while affiliate receiver is unavailable');
      const publicAccount=await registered.json(), row=service.store.state().accounts[0];
      check.equal(row.affiliate_binding.body.binding.consumerRef,publicAccount.account.account_id,'real signup hook binds server-created account');
      check.equal(publicAccount.account.affiliate_binding,undefined,'outbox is not exposed in consumer account response');
      check.ok(registered.headers.get('set-cookie').includes('crp_session=')&&registered.headers.get('set-cookie').includes('crp_aff_ref='),'signup session survives clearing tracking cookie');
    } finally {service.close();await new Promise(r=>server.close(r));}
    // Exercise the actual hosted entry point and its worker, not only createService.
    const {spawn}=require('node:child_process');
    const native=spawn(process.execPath,[path.join(__dirname,'../../server.cjs')],{env:{...process.env,...env,CRP_DEPLOYMENT_ENV:'staging',CRP_AFFILIATE_ORIGIN:'https://affiliates-staging.creditregulatorpro.com',CRP_LOCAL_SERVICE_HOST:'127.0.0.1',CRP_LOCAL_SERVICE_PORT:'0',CRP_LOCAL_SERVICE_DATA:fs.mkdtempSync(path.join(os.tmpdir(),'crp-affiliate-native-fictional-')),CRP_LOCAL_SERVICE_SECURE_COOKIE:'1',CRP_LOCAL_SERVICE_LOG:'silent'},stdio:['ignore','pipe','pipe']});
    try {
      const base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('FICTIONAL_NATIVE_SERVER_TIMEOUT')),20000);native.once('error',reject);native.once('exit',()=>reject(Error('FICTIONAL_NATIVE_SERVER_EXIT')));native.stdout.on('data',b=>{output+=b;const found=output.match(/listening on (http:\/\/127\.0\.0\.1:\d+)\//);if(found){clearTimeout(timer);resolve(found[1]);}});});
      const issued=Date.now(),handoff=token({origin:'https://affiliates-staging.creditregulatorpro.com',issuedAt:issued,expiresAt:issued+60000});
      const accepted=await fetch(base+'/affiliate/referral?t='+encodeURIComponent(handoff),{redirect:'manual'});
      check.equal(accepted.status,303,'actual server entry forwards signed handoff to sole worker');
      const cookie=accepted.headers.get('set-cookie')||'';
      check.ok(cookie.includes('HttpOnly')&&cookie.includes('Secure')&&cookie.includes('SameSite=Lax')&&!cookie.includes('Domain='),'actual dispatcher preserves host-only secure tracking cookie');
      const rejected=await fetch(base+'/affiliate/referral?t=invalid.invalid',{redirect:'manual'});
      check.equal(rejected.status,303,'actual hosted entry handles invalid handoff without exposing token');
      check.equal(rejected.headers.get('set-cookie'),null,'actual hosted entry cannot set tracking cookie for invalid signature');
    } finally {native.kill();}
  } finally { adapter.close(); /* Retain fixture on failure for diagnosis. */ }
}
module.exports = { id: 'gs-affiliate-attribution', title: 'Consented first-party referral capture and durable asynchronous binding', run };
if (require.main === module) run(null, { equal: assert.equal, ok: assert.ok }).then(() => console.log('Affiliate attribution focused behavioral checks passed'), error => { console.error(error); process.exitCode = 1; });
