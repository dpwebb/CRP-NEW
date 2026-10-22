// Owned loopback UI fixture with an out-of-band clock; never installed as a service.
import {createInterface} from 'node:readline';
import {fixtures} from './fixtures.mjs';
let clock=Date.now();const f=await fixtures({now:()=>clock,singleSignIn:true});
console.log(JSON.stringify({url:f.base,fictional:true,clockControl:'stdin only'}));
const lines=createInterface({input:process.stdin});
for await(const line of lines){
 if(line==='quit'){await f.close();break;}
 const match=/^advance ([0-9]+)$/.exec(line);if(match){clock+=Number(match[1]);console.log(JSON.stringify({advanced:Number(match[1])}));}
 if(line==='status')console.log(JSON.stringify({writes:f.state.writes.map(x=>({path:x.path,body:x.body})),sessions:f.portal.gateway.sessions.size}));
}
