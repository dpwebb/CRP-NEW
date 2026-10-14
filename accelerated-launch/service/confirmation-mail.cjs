'use strict';
const fs=require('node:fs'),tls=require('node:tls');
const FROM='support@creditregulatorpro.com';
function settings(file){
  if(!file)throw Error('CONFIRMATION_MAIL_NOT_CONFIGURED');const result={};
  for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=/^\s*(?:export\s+)?(SMTP_USER|SMTP_PASSWORD|SMTP_HOST|SMTP_PORT)\s*=\s*(.*)$/.exec(line);if(m){let v=m[2].trim();if(/^(['"]).*\1$/.test(v))v=v.slice(1,-1);result[m[1]]=v;}}
  return result;
}
async function smtp(config,{to,code},authOnly=false){
  if(!config.SMTP_USER||!config.SMTP_PASSWORD||!/^\d{6}$/.test(code)||!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(to))throw Error('CONFIRMATION_MAIL_NOT_CONFIGURED');
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
      const body=['From: Credit Regulator Pro <'+FROM+'>','To: <'+to+'>','Reply-To: '+FROM,'Subject: Confirm your Credit Regulator Pro email','MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8','', 'Your confirmation code is '+code+'.','','Enter this code in the signup window. It expires in 30 minutes.','If you did not create this account, you can ignore this email.','','Credit Regulator Pro'].join('\r\n');await command(body+'\r\n.',250);
    }await command('QUIT',221);return {accepted:true,from:FROM};
  }finally{socket.destroy();}
}
function sender(options={}){return async message=>{
  const config=settings(options.file||process.env.CRP_SIGNUP_MAIL_ENV);
  if(!/^\d{6}$/.test(message.code)||!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(message.to))throw Error('INVALID_CONFIRMATION_MESSAGE');
  return smtp(config,message);
};}
module.exports={sender,settings,smtp,FROM};
