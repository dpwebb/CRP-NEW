// Explicitly fictional loopback upstreams; no hosted access or email transport.
import {fixtures} from './fixtures.mjs';
const f=await fixtures({port:4499,singleSignIn:true});
f.state.data.mail.overview={...f.state.data.mail.overview,monitoring:{configured:true,checkedAt:Date.now(),ok:false,alerts:[{code:'LOCAL_BACKUP_STALE',severity:'critical'},{code:'RECOVERY_EXPORT_STALE_OR_UNVERIFIED',severity:'critical'}],emailState:'CAPTURED'}};
console.log('FICTIONAL_MAIL_ALERT_PREVIEW '+f.base);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>f.close().then(()=>process.exit(0)));
