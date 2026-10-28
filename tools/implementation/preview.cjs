'use strict';
const {TestService}=require('../../accelerated-launch/service/tests/harness.cjs');
(async()=>{
 const t=await new TestService('international-browser-fictional').listen();
 await t.unpaidAccount('support.qa@example.test');
 console.log(JSON.stringify({origin:t.base,fixture:'support.qa@example.test',payment:'none',externalMessages:0}));
 const stop=async()=>{await t.close();process.exit(0);};process.on('SIGTERM',stop);process.on('SIGINT',stop);
})().catch(()=>{console.error('LOCAL_PREVIEW_FAILED');process.exitCode=1;});
