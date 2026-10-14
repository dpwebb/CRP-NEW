'use strict';
// Offline only. Existing private-store writer protection refuses a running service.
// Authenticator code arrives on stdin and is never included in command arguments/output.
const fs=require('node:fs');
const {PrivateStore}=require('../private-store.cjs');
const {AdminStore}=require('../admin-store.cjs');
const {bootstrapOwner}=require('../admin-access.cjs');
function main(args=process.argv.slice(2)){
  if(args.length!==4||args[0]!=='--data-dir'||args[2]!=='--account-id')throw Error('Usage: node admin-bootstrap.cjs --data-dir PRIVATE_DIRECTORY --account-id EXISTING_ACCOUNT_ID (authenticator code on stdin)');
  const consumer=new PrivateStore(args[1]);let admin;
  try{admin=new AdminStore(consumer.dataDir,{consumerStore:consumer});const member=bootstrapOwner(admin,{account_id:args[3],code:fs.readFileSync(0,'utf8').trim()});console.log(JSON.stringify({created:true,admin_id:member.admin_id,account_id:member.account_id,role:member.role,scope:'Offline owner registration only; administration remains controlled by its feature flag and fresh session unlock'}));return member;}
  // PrivateStore has no close export. On process exit its existing stale-PID
  // recovery releases the offline consumer writer registration on next startup.
  finally{admin?.close();}
}
if(require.main===module)try{main();}catch(e){console.error(e.code||e.message);process.exitCode=1;}
module.exports={main};
