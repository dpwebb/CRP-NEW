'use strict';
const fs=require('node:fs'),tls=require('node:tls');
const FROM=process.env.MAIL_FROM||'support@creditregulatorpro.com';
if(!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(FROM))throw Error('INVALID_MAIL_FROM');
function messageBody(message) {
  const {to,code,kind,url}=message;
  if(!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(to))throw Error('INVALID_CONFIRMATION_MESSAGE');
  let subject,lines;
  if(kind==='password-reset'){
    let link;try{link=new URL(url);}catch{throw Error('INVALID_PASSWORD_RESET_MESSAGE');}
    const hosted=['https://creditregulatorpro.com','https://staging.creditregulatorpro.com'].includes(link.origin);
    const local=link.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(link.hostname);
    if(!(hosted||local)||link.username||link.password||link.pathname!=='/index.html'||link.search||!/^#reset-password=[A-Za-z0-9_-]{43}$/.test(link.hash))throw Error('INVALID_PASSWORD_RESET_MESSAGE');
    subject='Reset your Credit Regulator Pro password';
    lines=['Use this link to choose a new password:',link.href,'','This link expires in 30 minutes and works once. You do not need your recovery key.','Your authenticator stays on if you use one. You will still need its code when you log in.','','If you did not request this email, ignore it. Your password has not changed.'];
  }else if(kind==='password-reset-complete'){
    subject='Your Credit Regulator Pro password was reset';
    lines=['Your password was reset. Your previous sign-ins have been signed out.','','Your saved recovery key still works. Your authenticator stays on if you use one.','','If you did not make this change, contact support@creditregulatorpro.com.'];
  }else{
    if(kind||!/^\d{6}$/.test(code))throw Error('INVALID_CONFIRMATION_MESSAGE');
    subject='Confirm your Credit Regulator Pro email';
    lines=['Your confirmation code is '+code+'.','','Enter this code in the signup window. It expires in 30 minutes.','If you did not create this account, you can ignore this email.'];
  }
  return ['From: Credit Regulator Pro <'+FROM+'>','To: <'+to+'>','Reply-To: '+FROM,'Subject: '+subject,'MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8','',...lines,'','Credit Regulator Pro'].join('\r\n');
}
function settings(file){
  if(!file)throw Error('CONFIRMATION_MAIL_NOT_CONFIGURED');const result={};
  for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=/^\s*(?:export\s+)?(SMTP_USER|SMTP_PASSWORD|SMTP_HOST|SMTP_PORT)\s*=\s*(.*)$/.exec(line);if(m){let v=m[2].trim();if(/^(['"]).*\1$/.test(v))v=v.slice(1,-1);result[m[1]]=v;}}
  return result;
}
async function smtp(config,message,authOnly=false){
  const body=messageBody(message),{to}=message;
  if(!config.SMTP_USER||!config.SMTP_PASSWORD)throw Error('CONFIRMATION_MAIL_NOT_CONFIGURED');
  const socket=tls.connect({host:config.SMTP_HOST||'smtp.hostinger.com',port:Number(config.SMTP_PORT||465),servername:config.SMTP_HOST||'smtp.hostinger.com',rejectUnauthorized:true});
  socket.setTimeout(15000,()=>socket.destroy(Error('SMTP_TIMEOUT')));
  let buffer='',waiting=[],completed=[],failure;
  const drain=()=>{while(waiting.length&&(completed.length||failure)){const p=waiting.shift();if(failure)p.reject(failure);else p.resolve(completed.shift());}};
  socket.on('data',b=>{buffer+=b.toString();let i;while((i=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+2);if(/^\d{3} /.test(line))completed.push(Number(line.slice(0,3)));}drain();});
  socket.on('error',()=>{failure=Error('SMTP_CONNECTION_FAILED');drain();});socket.on('close',()=>{failure=Error('SMTP_CONNECTION_CLOSED');drain();});
  const reply=()=>new Promise((resolve,reject)=>{waiting.push({resolve,reject});drain();});
  const command=async(line,expected)=>{const p=reply();if(line!==null)socket.write(line+'\r\n');const status=await p;if(status!==expected){const e=Error('CONFIRMATION_SMTP_REJECTED');e.smtpCode=status;throw e;}};
  try{await command(null,220);await command('EHLO creditregulatorpro.com',250);await command('AUTH LOGIN',334);await command(Buffer.from(config.SMTP_USER).toString('base64'),334);await command(Buffer.from(config.SMTP_PASSWORD).toString('base64'),235);
    if(!authOnly){await command('MAIL FROM:<'+FROM+'>',250);await command('RCPT TO:<'+to+'>',250);await command('DATA',354);
      await command(body+'\r\n.',250);
    }
    // DATA 250 already acknowledges delivery. A disconnect during QUIT cannot
    // invalidate a reset link which the mail server has accepted.
    try{await command('QUIT',221);}catch{}
    return {accepted:true,from:FROM};
  }finally{socket.destroy();}
}
function sender(options={}){return async message=>{
  const config=settings(options.file||process.env.CRP_SIGNUP_MAIL_ENV);
  messageBody(message);
  return smtp(config,message);
};}
module.exports={sender,settings,smtp,FROM,messageBody};
