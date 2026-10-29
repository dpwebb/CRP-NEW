'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const moduleFile=require.resolve('../confirmation-mail.cjs');
function render(sender,kind){const env={...process.env};delete env.MAIL_FROM;if(sender!==undefined)env.MAIL_FROM=sender;
 return spawnSync(process.execPath,['-e',`const m=require(${JSON.stringify(moduleFile)});process.stdout.write(m.messageBody(${JSON.stringify({to:'fictional@example.test',...(kind?{kind}:{code:'123456'})})}));`],{env,encoding:'utf8'});}
test('unconfigured sender retains support address',()=>{const r=render();assert.equal(r.status,0);assert.match(r.stdout,/From: Credit Regulator Pro <support@creditregulatorpro.com>/);});
test('configured admin sender is used for confirmation and reset notice while support remains reachable',()=>{for(const kind of [undefined,'password-reset-complete']){const r=render('admin@creditregulatorpro.com',kind);assert.equal(r.status,0);assert.match(r.stdout,/From: Credit Regulator Pro <admin@creditregulatorpro.com>/);assert.match(r.stdout,/Reply-To: admin@creditregulatorpro.com/);if(kind)assert.match(r.stdout,/contact support@creditregulatorpro.com/);}});
test('sender header injection and malformed addresses fail before transport',()=>{for(const sender of ['admin@example.test\r\nBcc: outsider@example.test','bad address','<admin@example.test>']){const r=render(sender);assert.notEqual(r.status,0);assert.match(r.stderr,/INVALID_MAIL_FROM/);assert.equal(r.stdout,'');}});
