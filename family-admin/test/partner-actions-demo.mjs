import {fixtures} from './fixtures.mjs';
const f=await fixtures({port:4507,singleSignIn:true});
f.state.data.affiliate.onboarding=[{id:'77777777-7777-4777-8777-777777777777',partner_id:'11111111-1111-4111-8111-111111111111',organization:'Fictional onboarding publisher',state:'OWNER_REVIEW',version:7}];
f.state.data.affiliate.contacts=[{id:'88888888-8888-4888-8888-888888888888',name:'Fictional QA contact'}];
f.state.data.affiliate.partners[0].status='ACTIVE';
console.log('LOCAL FICTIONAL PARTNER PREVIEW '+f.base);
process.stdin.setEncoding('utf8');process.stdin.on('data',line=>{
 if(line.trim()==='observe')console.log(JSON.stringify({writes:f.state.writes.map(({app,path,body})=>({app,path,body}))}));
 if(line.trim()==='version8')f.state.data.affiliate.onboarding[0].version=8;
 if(line.trim()==='stop')f.close().then(()=>process.exit(0));
});
