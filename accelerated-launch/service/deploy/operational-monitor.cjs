'use strict';
// Public probes and file metadata only. No account data or secret configuration.
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
async function inspect(target, dependencies={}) {
  const get=dependencies.fetch || fetch, command=dependencies.command || ((args)=>execFileSync('systemctl',args,{encoding:'utf8',timeout:5000}).trim());
  const files=dependencies.backups || (()=>fs.readdirSync(target.backup_directory).filter(n=>/\.tar\.gz\.age$/.test(n)).map(n=>({mtime:fs.statSync(path.join(target.backup_directory,n)).mtimeMs,verified:fs.existsSync(path.join(target.backup_directory,n+'.sha256'))})));
  const failed=[];
  let maintenance=dependencies.maintenance === true;
  if(target.release_base && dependencies.maintenance===undefined) {
    let fd;
    try {fd=fs.openSync(target.backup_directory+'/backup.lock','r');execFileSync('flock',['-n','-x','-E','75','3'],{timeout:3000,stdio:['ignore','ignore','ignore',fd]});}
    catch(error){if(error.status===75)maintenance=true;else failed.push('OPERATION_LOCK_PROBE');}
    finally{if(fd!==undefined)fs.closeSync(fd);}
  }
  let expected=target.build_id;
  if(target.release_base) {
    try {
      const current=fs.realpathSync(target.release_base+'/current');
      if(!current.startsWith(target.release_base+'/releases/crp-v1-'))throw Error();
      const provenance=JSON.parse(fs.readFileSync(current+'/deployment-provenance.json'));
      const manifest=JSON.parse(fs.readFileSync(current+'/release-manifest.json'));
      expected='crp-v1-'+manifest.manifest_digest.slice(0,16).toLowerCase();
      if(path.basename(current)!==expected || provenance.build_id!==expected || provenance.manifest_digest!==manifest.manifest_digest)failed.push('RELEASE_PROVENANCE');
      const crypto=require('node:crypto');
      for(const row of manifest.groups.flatMap(g=>g.files)) {
        const file=path.resolve(current,row.file);
        if(!file.startsWith(current+path.sep) || crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase()!==row.sha256.toUpperCase()) {failed.push('RELEASE_BYTES');break;}
      }
    }catch{failed.push('RELEASE_UNAVAILABLE');}
  }
  if(!maintenance)try {
    const response=await get(target.url+'/api/health',{signal:AbortSignal.timeout(10000)}),body=await response.json();
    if(!response.ok || body.ok!==true || body.build_id!==expected || body.deployment!==target.name || body.billing_mode!==(target.name==='production'?'live':'test'))failed.push('PUBLIC_HEALTH_IDENTITY');
  } catch {failed.push('PUBLIC_HEALTH_UNREACHABLE');}
  if(!maintenance && target.require_readiness)try {
    const response=await get(target.url+'/api/ready',{signal:AbortSignal.timeout(10000)}),body=await response.json();
    if(!response.ok || body.storage_ready!==true || body.build_id!==expected)failed.push('SERVICE_NOT_READY');
    if(body.storage_recovered===true)failed.push('STORE_BACKUP_RECOVERY');
  }catch{failed.push('READINESS_UNREACHABLE');}
  for(const [args,expected,code] of [[['is-active',target.service],'active','SERVICE_NOT_ACTIVE'],[['is-enabled',target.service],'enabled','SERVICE_NOT_ENABLED'],[['show',target.backup_service,'--property=Result','--value'],'success','BACKUP_JOB_FAILED']]) {
    if(maintenance && code==='SERVICE_NOT_ACTIVE')continue;
    try {if(command(args)!==expected)failed.push(code);}catch{failed.push(code);}
  }
  try {const latest=files().filter(f=>f.verified).sort((a,b)=>b.mtime-a.mtime)[0];if(!latest || Date.now()-latest.mtime>36*60*60*1000)failed.push('BACKUP_STALE');}catch{failed.push('BACKUP_UNAVAILABLE');}
  try {const stats=(dependencies.disk || (()=>fs.statfsSync('/')))();if(Number(stats.bavail)/Number(stats.blocks)<0.1)failed.push('DISK_LOW');}catch{failed.push('DISK_PROBE_FAILED');}
  return {target:target.name,passed:!failed.length,maintenance,failures:failed};
}
async function main() {
  const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const results=await Promise.all(config.targets.map(target=>inspect(target)));
  const record={checked_at:new Date().toISOString(),passed:results.every(r=>r.passed),results};
  const directory=config.status_directory||'/var/lib/crp-v1-monitor';fs.mkdirSync(directory,{recursive:true,mode:0o700});
  if(config.alert_environment_file) {
    const alert=require('./operational-alert.cjs'),file=directory+'/alert-delivery.json';let previous;
    try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
    try{
      const delivery=await alert.notify(record,previous,(subject,body)=>alert.send(alert.settings(config.alert_environment_file),subject,body));
      fs.writeFileSync(file+'.tmp',JSON.stringify(delivery)+'\n',{mode:0o600});fs.renameSync(file+'.tmp',file);
      record.alert_delivery='OK';
    }catch{record.alert_delivery='FAILED';record.passed=false;}
  } else if(config.require_alerts) {record.alert_delivery='NOT_CONFIGURED';record.passed=false;}
  fs.writeFileSync(directory+'/status.json.tmp',JSON.stringify(record)+'\n',{mode:0o600});fs.renameSync(directory+'/status.json.tmp',directory+'/status.json');
  process.stdout.write(JSON.stringify(record)+'\n');
  if(!record.passed)process.exitCode=1;
}
module.exports={inspect};
if(require.main===module)main().catch(()=>{console.error('CRP_MONITOR_FAILED');process.exitCode=1;});
