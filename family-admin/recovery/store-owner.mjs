import fs from 'node:fs';
import path from 'node:path';
// Root verifies the operation first, then permanently drops privilege before
// native atomic writers run. Even interrupted writes retain service ownership.
export function dropToStoreOwner(dataDirectory) {
  if(process.platform!=='linux'||process.getuid()!==0)throw Error('ROOT_LINUX_REQUIRED');
  const parent=fs.lstatSync(dataDirectory),admin=fs.lstatSync(path.join(dataDirectory,'admin'));
  if(!parent.isDirectory()||parent.isSymbolicLink()||!admin.isDirectory()||admin.isSymbolicLink()||parent.uid===0||parent.gid===0||admin.uid!==parent.uid||admin.gid!==parent.gid||(parent.mode&0o077)||(admin.mode&0o077))throw Error('PRIVATE_NATIVE_SERVICE_OWNER_REQUIRED');
  process.setgroups([]);process.setgid(parent.gid);process.setuid(parent.uid);
  if(process.getuid()!==parent.uid||process.getgid()!==parent.gid)throw Error('SERVICE_PRIVILEGE_DROP_FAILED');
}
