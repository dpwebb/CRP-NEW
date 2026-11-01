// Fictional loopback preview only. Never loads hosted credentials or sends mail.
import {fixtures} from './fixtures.mjs';
const f=await fixtures({port:4519,singleSignIn:true});
console.log('Fictional Family readiness preview: '+f.base);
console.log('Use owner@example.test / fictional-password / 123456; unlock 654321.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>f.close().then(()=>process.exit(0)));
