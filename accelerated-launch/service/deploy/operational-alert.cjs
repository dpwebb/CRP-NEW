'use strict';
const fs=require('node:fs'),tls=require('node:tls'),crypto=require('node:crypto');
function settings(file) {
  const values={};
  for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)) {
    const match=/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if(!match || !['SMTP_USER','SMTP_PASSWORD','SMTP_HOST','SMTP_PORT','HOSTINGER_MAIL_TOKEN','HOSTINGER_MAIL_ACCOUNT','HOSTINGER_MAILBOX_RESOURCE_ID'].includes(match[1]))continue;
    let value=match[2].trim();if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
    values[match[1]]=value;
  }
  if(values.HOSTINGER_MAIL_TOKEN){
    if(values.HOSTINGER_MAIL_ACCOUNT!=='admin@creditregulatorpro.com')throw Error('ALERT_MAILBOX_INVALID');
    if(/\s/.test(values.HOSTINGER_MAIL_TOKEN))throw Error('ALERT_CREDENTIALS_INVALID');
    if(values.HOSTINGER_MAILBOX_RESOURCE_ID&&!/^AC[A-Za-z0-9]+$/.test(values.HOSTINGER_MAILBOX_RESOURCE_ID))throw Error('ALERT_MAILBOX_INVALID');
    return values;
  }
  if(!values.SMTP_USER || !values.SMTP_PASSWORD)throw Error('ALERT_CREDENTIALS_UNAVAILABLE');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.SMTP_USER))throw Error('ALERT_MAILBOX_INVALID');
  if(Number(values.SMTP_PORT||465)!==465)throw Error('ALERT_IMPLICIT_TLS_REQUIRED');
  if(values.SMTP_HOST&&!/^[A-Za-z0-9.-]+$/.test(values.SMTP_HOST))throw Error('ALERT_HOST_INVALID');
  return values;
}
async function send(config,subject,body,dependencies={}) {
  if(config.HOSTINGER_MAIL_TOKEN)return sendApi(config,subject,body,dependencies.fetch||fetch);
  const recipient='admin@creditregulatorpro.com';
  if(/[\r\n<>]/.test(config.SMTP_USER)||/[\r\n]/.test(subject))throw Error('ALERT_HEADER_INVALID');
  if(Number(config.SMTP_PORT||465)!==465)throw Error('ALERT_IMPLICIT_TLS_REQUIRED');
  const socket=tls.connect({host:config.SMTP_HOST||'smtp.hostinger.com',port:465,servername:config.SMTP_HOST||'smtp.hostinger.com',minVersion:'TLSv1.2',rejectUnauthorized:true});
  socket.setTimeout(15000,()=>socket.destroy(Error('ALERT_TIMEOUT')));
  let pending=[],buffer='',terminal;
  socket.on('data',chunk=>{buffer+=chunk.toString('utf8');let end;while((end=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+2);if(/^\d{3} /.test(line)){const waiter=pending.shift();if(waiter)waiter.resolve(Number(line.slice(0,3)));else terminal=Number(line.slice(0,3));}}});
  socket.on('error',()=>{for(const waiter of pending.splice(0))waiter.reject(Error('ALERT_TRANSPORT_FAILED'));});
  socket.on('close',()=>{for(const waiter of pending.splice(0))waiter.reject(Error('ALERT_TRANSPORT_CLOSED'));});
  function reply(){if(terminal!==undefined){const code=terminal;terminal=undefined;return Promise.resolve(code);}return new Promise((resolve,reject)=>pending.push({resolve,reject}));}
  async function command(line,expected){const result=reply();if(line!==null)socket.write(line+'\r\n');const code=await result;if(!(Array.isArray(expected)?expected:[expected]).includes(code)){const error=Error('ALERT_SMTP_REJECTED');error.smtpCode=code;error.expected=expected;throw error;}}
  try {
    await command(null,220);await command('EHLO crp-monitor.local',250);
    await command('AUTH LOGIN',334);await command(Buffer.from(config.SMTP_USER).toString('base64'),334);await command(Buffer.from(config.SMTP_PASSWORD).toString('base64'),235);
    await command('MAIL FROM:<'+config.SMTP_USER+'>',250);await command('RCPT TO:<'+recipient+'>',[250,251]);await command('DATA',354);
    const message=['From: '+config.SMTP_USER,'To: '+recipient,'Subject: '+subject,'Date: '+new Date().toUTCString(),'Message-ID: <'+crypto.randomUUID()+'@creditregulatorpro.com>','MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8','',''+body].join('\r\n').replace(/\r?\n/g,'\r\n').replace(/^\./gm,'..');
    await command(message+'\r\n.',250);await command('QUIT',221);return {accepted:true,recipient};
  } finally {socket.destroy();}
}
async function sendApi(config,subject,text,get) {
  const recipient='admin@creditregulatorpro.com',headers={Authorization:'Bearer '+config.HOSTINGER_MAIL_TOKEN,'Content-Type':'application/json'};
  if(config.HOSTINGER_MAIL_ACCOUNT!==recipient)throw Error('ALERT_MAILBOX_INVALID');
  const me=await get('https://api.mail.hostinger.com/api/v1/me',{headers,signal:AbortSignal.timeout(15000)});
  if(!me.ok)throw Error('ALERT_ACCOUNT_REJECTED');
  const account=await me.json(),mailbox=account.data?.mailboxes?.find(x=>x.address===recipient);
  if(!mailbox || !/^AC[A-Za-z0-9]+$/.test(mailbox.resourceId))throw Error('ALERT_MAILBOX_UNAVAILABLE');
  const response=await get('https://api.mail.hostinger.com/api/v1/mailboxes/'+mailbox.resourceId+'/send',{method:'POST',headers,body:JSON.stringify({to:[recipient],subject,text}),signal:AbortSignal.timeout(15000)});
  if(response.status!==204)throw Error('ALERT_SEND_REJECTED');
  return {accepted:true,recipient};
}
async function notify(record,previous,deliver) {
  const signature=record.results.filter(r=>!r.passed).map(r=>r.target+':'+[...r.failures].sort().join(',')).sort().join('|');
  const prior=previous?.delivered_signature||'';
  if(signature===prior)return {delivered_signature:prior,changed:false};
  await deliver(signature?'CRP operational alert':'CRP operational recovery',JSON.stringify({checked_at:record.checked_at,results:record.results}));
  return {delivered_signature:signature,changed:true,delivered_at:new Date().toISOString()};
}
module.exports={settings,send,notify};
