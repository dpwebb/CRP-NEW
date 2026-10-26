'use strict';
const fs=require('node:fs'),path=require('node:path');
const security=require('../../signup-security.cjs');
const {chromium}=require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
async function run(service,check){
  const prior=service.autoSignup;service.autoSignup=false;
  try{
    check.equal(security.totp(security.base32(Buffer.from('12345678901234567890')),59000,8),'94287082','RFC 6238 independent SHA1 vector');
    check.equal(security.totp(security.base32(Buffer.from('12345678901234567890')),20000000000000,8),'65353130','RFC 6238 supports counters beyond 32 bits');
    const created=await service.request('POST','/api/accounts',{body:{email:'fz-required@example.test',password:'a-long-enough-password'}}),token=/crp_session=([^;]+)/.exec(created.setCookie)[1],id=created.json.account.account_id;
    check.equal(created.status,201,'new signup receives a limited authenticated session');
    check.equal(created.json.signup_complete,false,'signup is incomplete before both required steps');
    check.equal((await service.request('GET','/api/cases',{token})).status,403,'pending signup cannot read report functions');
    check.equal((await service.request('POST','/api/billing/checkout',{token,body:{plan_code:'monthly'}})).status,403,'pending signup cannot purchase access');
    check.equal((await service.request('GET','/api/account/profile',{token})).status,403,'contact details wait until initial security setup');
    check.equal((await service.request('POST','/api/account/finish-signup',{token,body:{}})).status,403,'finish endpoint cannot bypass required security');
    const message=service.confirmationMessages.findLast(m=>m.to==='fz-required@example.test');
    check.equal(message.from,'support@creditregulatorpro.com','confirmation envelope requires the support sender');
    const wrong=message.code==='000000'?'111111':'000000';
    check.equal((await service.request('POST','/api/account/confirm-email',{token,body:{code:wrong}})).status,400,'incorrect email code is refused');
    check.equal(service.service.store.state().accounts.find(a=>a.account_id===id).email_confirmation.failed_attempts,1,'failed code attempts persist');
    check.equal((await service.request('POST','/api/account/resend-confirmation',{token,body:{}})).status,429,'resend cooldown prevents duplicate delivery');
    check.equal((await service.request('POST','/api/account/confirm-email',{token,body:{code:message.code}})).status,200,'email code verifies through its actual endpoint');
    check.equal((await service.request('POST','/api/account/finish-signup',{token,body:{}})).status,403,'email verification alone cannot bypass saved recovery key');
    check.equal((await service.request('POST','/api/account/confirm-recovery-key',{token,body:{recovery_key:'incorrect'}})).status,401,'acknowledgement must match the issued recovery key');
    check.equal((await service.request('POST','/api/account/confirm-recovery-key',{token,body:{recovery_key:created.json.recovery_key}})).status,200,'saved key is acknowledged before contact details');
    check.equal((await service.request('POST','/api/account/finish-signup',{token,body:{enable_two_factor:true}})).status,401,'choosing 2FA requires possession of the authenticator');
    const setup=await service.request('POST','/api/account/2fa/setup',{token,body:{password:'a-long-enough-password'}});
    check.equal(setup.status,200,'optional authenticator setup requires password reauthentication');
    const stored=service.service.store.state().accounts.find(a=>a.account_id===id);
    check.ok(!JSON.stringify(stored).includes(setup.json.secret),'authenticator seed is encrypted in persisted state');
    check.equal((await service.request('POST','/api/account/2fa/confirm',{token,body:{code:security.totp(setup.json.secret)}})).status,200,'2FA is activated only after a valid app code');
    check.equal((await service.request('POST','/api/account/recovery-key',{token,body:{password:'incorrect-current-password'}})).status,401,'a verified MFA login still requires the current password to replace the recovery key');
    check.equal((await service.request('POST','/api/account/finish-signup',{token,body:{enable_two_factor:true}})).status,200,'all selected signup requirements complete');
    check.equal((await service.request('GET','/api/cases',{token})).status,200,'completed signup reaches the ordinary application');
    check.equal((await service.request('POST','/api/sessions',{body:{email:'fz-required@example.test',password:'a-long-enough-password'}})).json.error.code,'TWO_FACTOR_REQUIRED','password alone does not open a 2FA account');
    const code=security.totp(setup.json.secret,Date.now()+30000);
    const restarted=new (require('../../private-store.cjs').PrivateStore)(service.dataDir,{allowMultiWriter:true});
    check.ok(security.verifySignIn(restarted,{...restarted.state().accounts.find(a=>a.account_id===id)},code),'encrypted authenticator remains usable after store restart');
    const keyPath=path.join(service.dataDir,'.account-security-key'),keyBytes=fs.readFileSync(keyPath);fs.unlinkSync(keyPath);let refused=false;try{security.verifySignIn(restarted,{...restarted.state().accounts.find(a=>a.account_id===id)},code);}catch(error){refused=error.code==='ACCOUNT_SECURITY_UNAVAILABLE';}finally{fs.writeFileSync(keyPath,keyBytes,{mode:0o600});}
    check.ok(refused,'lost encryption key fails closed rather than silently disabling 2FA');
    check.equal((await service.request('POST','/api/sessions',{body:{email:'fz-required@example.test',password:'a-long-enough-password',code}})).status,200,'correct password and next authenticator code open a session');
    check.equal((await service.request('POST','/api/sessions',{body:{email:'fz-required@example.test',password:'a-long-enough-password',code}})).status,401,'a used authenticator code cannot be replayed');
    const recovered=await service.request('POST','/api/account/recover',{body:{email:'fz-required@example.test',password:'a-new-long-enough-password',recovery_key:created.json.recovery_key}});
    check.equal(recovered.status,200,'the saved one-use recovery key recovers lost authenticator access');
    check.equal((await service.request('GET','/api/cases',{token})).status,401,'recovery revokes prior sessions');
    check.equal(service.service.store.state().accounts.find(a=>a.account_id===id).two_factor_secret,undefined,'recovery removes the lost authenticator');
    const reopened=await service.request('POST','/api/sessions',{body:{email:'fz-required@example.test',password:'a-new-long-enough-password'}});
    check.equal(reopened.json.signup_complete,false,'rotated recovery key must be saved again');
    const legacy=await service.unpaidAccount('fz-legacy@example.test');
    // Explicit imported/previous-account fixture; no migration weakens the new-signup routes.
    service.service.store.update(s=>{delete s.accounts.find(a=>a.account_id===legacy.account_id).signup_security_required;return true;});
    check.equal((await service.request('GET','/api/cases',{token:legacy.token})).status,200,'existing accounts remain usable with unchanged credentials');
    const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    try{
      const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(15000);
      await page.goto(service.base+'/index.html#create');await page.locator('#email').fill('fz-browser@example.test');await page.locator('#password').fill('a-long-enough-password');await page.locator('#signup-two-factor').check();await page.locator('#create').click();await page.locator('#email-confirmation-code').waitFor();
      check.equal(await page.locator('#account-save').count(),0,'real signup presents security before contact details');
      check.ok(await page.locator('#finish-signup').isDisabled(),'browser cannot continue before confirmation and key acknowledgement');
      const mail=service.confirmationMessages.findLast(m=>m.to==='fz-browser@example.test');let confirms=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/account/confirm-email')confirms++;});
      await page.route('**/api/account/confirm-email',async route=>{await new Promise(resolve=>setTimeout(resolve,1600));await route.continue();});
      await page.locator('#email-confirmation-code').fill(mail.code);await page.locator('#confirm-signup-email').click();await page.locator('#operation-progress').waitFor({state:'visible'});
      check.ok(await page.locator('#confirm-signup-email').isDisabled(),'slow work immediately locks the initiating control');
      check.ok(/Your selection was accepted/.test(await page.locator('#operation-progress').innerText()),'delayed progress explicitly acknowledges accepted work');
      await page.locator('#operation-progress').screenshot({path:path.join(__dirname,'../../out/signup-working-progress.png')});
      await page.locator('#confirm-signup-email').dispatchEvent('click');
      await page.getByText('Email confirmed',{exact:true}).waitFor();check.equal(confirms,1,'repeated activation produces only one confirmation request');
      await page.locator('#saved-recovery-key').click();await page.getByText('Recovery key saved',{exact:true}).waitFor();
      await page.locator('#two-factor-password').fill('a-long-enough-password');await page.locator('#two-factor-start').click();await page.locator('#two-factor-secret').waitFor();const seed=await page.locator('#two-factor-secret').inputValue();await page.locator('#two-factor-code').fill(security.totp(seed));await page.locator('#two-factor-confirm').click();await page.locator('#finish-signup').waitFor();await page.locator('#finish-signup').click();await page.locator('#open').waitFor();
      check.ok(await page.locator('#operation-progress').isHidden(),'progress clears after completion');
      await page.getByRole('button',{name:'Navigation menu',exact:true}).click();await page.locator('[data-step="0"]').click();await page.keyboard.press('Escape');await page.locator('#account-save').waitFor();
      check.equal(await page.locator('#account-country').inputValue(),'CA','IP country is a suggestion for a blank contact country');
      check.equal(await page.locator('#account-contact_email').inputValue(),'fz-browser@example.test','sign-in email pre-populates the reply address');
      check.equal(await page.locator('#account-region').inputValue(),'','unknown IP region is not invented');
      check.ok((await page.locator('#account-country').boundingBox()).y<(await page.locator('#account-full_name').boundingBox()).y,'country and region appear before other contact fields');
      await page.locator('#account-country').selectOption('US');check.equal(await page.locator('#account-region').inputValue(),'','changing country clears the incompatible region');await page.locator('#account-region').selectOption('NY');
      check.ok(/You can add these documents later/.test(await page.locator('#panel').innerText())&&/required before/.test(await page.locator('#panel').innerText()),'document postponement and completion requirement are both explicit');
      check.equal(await page.locator('#create-recovery-key').count(),0,'contact details no longer hold recovery setup');
      await page.screenshot({path:path.join(__dirname,'../../out/signup-contact-mobile.png'),fullPage:true});
      check.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'new security/contact surface has no mobile overflow');
      const ui=fs.readFileSync(path.join(__dirname,'../../ui/app.js'),'utf8');check.ok(!ui.includes('<h2>Common-error checklist</h2>'),'consumer result rendering hides the internal common-error checklist');
    }finally{await browser.close();}
  }finally{service.autoSignup=prior;}
}
module.exports={id:'fz-signup-user-experience',title:'Mandatory signup email/key, optional encrypted authenticator and responsive consumer feedback',run};
