'use strict';
// Offline only. Existing private-store writer protection refuses a running service.
// Authenticator code arrives on stdin and is never included in command arguments/output.
const fs=require('node:fs');
const {PrivateStore}=require('../private-store.cjs');
const {AdminStore}=require('../admin-store.cjs');
const {bootstrapOwner,recoverOrphanedOwner}=require('../admin-access.cjs');
function main(args=process.argv.slice(2)){
  if(![4,5].includes(args.length)||args[0]!=='--data-dir'||args[2]!=='--account-id'||args.length===5&&args[4]!=='--recover-orphaned-owner')throw Error('Usage: node admin-bootstrap.cjs --data-dir PRIVATE_DIRECTORY --account-id EXISTING_ACCOUNT_ID [--recover-orphaned-owner] (authenticator code on stdin; service must be stopped)');
  const recover=args[4]==='--recover-orphaned-owner';
  const consumer=new PrivateStore(args[1]);let admin;
  try{admin=new AdminStore(consumer.dataDir,{consumerStore:consumer});const input={account_id:args[3],code:fs.readFileSync(0,'utf8').trim()},member=recover?recoverOrphanedOwner(admin,{...input,offline:true}):bootstrapOwner(admin,input);console.log(JSON.stringify({created:!recover,recovered:recover,admin_id:member.admin_id,account_id:member.account_id,role:member.role,scope:'Offline owner registration only; administration remains controlled by its feature flag and fresh session unlock'}));return member;}
  // PrivateStore has no close export. On process exit its existing stale-PID
  // recovery releases the offline consumer writer registration on next startup.
  finally{admin?.close();}
}
if(require.main===module)try{main();}catch(e){console.error(e.code||e.message);process.exitCode=1;}
module.exports={main};
