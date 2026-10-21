import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,symlinkSync,unlinkSync,rmSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

test('actual service entrypoint starts through the current release symlink',async()=>{
  const root=mkdtempSync(join(tmpdir(),'crp-family-entrypoint-'));
  const target=fileURLToPath(new URL('../',import.meta.url)),link=join(root,'current');
  let child;
  try {
    symlinkSync(target,link,process.platform==='win32'?'junction':'dir');
    const config=join(root,'config.json');
    writeFileSync(config,JSON.stringify({environment:'local',origin:'http://127.0.0.1:4395',listenPort:0,auditDirectory:join(root,'audit'),upstreams:{},bindings:{}}));
    child=spawn(process.execPath,[join(link,'src/server.mjs')],{cwd:root,env:{...process.env,CRP_FAMILY_CONFIG:config},stdio:['ignore','pipe','pipe'],windowsHide:true});
    let output='',errors='';child.stderr.on('data',b=>{errors+=b.toString();});
    await new Promise((done,fail)=>{
      const timer=setTimeout(()=>fail(Error('Symlink service did not start: '+errors.slice(-500))),7000);
      child.stdout.on('data',b=>{output+=b.toString();if(output.includes('CRP Family Admin listening on ')){clearTimeout(timer);done();}});
      child.once('error',e=>{clearTimeout(timer);fail(e);});
      child.once('exit',code=>{clearTimeout(timer);if(!output.includes('CRP Family Admin listening on '))fail(Error('Service exited before listening: '+code+' '+errors.slice(-500)));});
    });
    assert.match(output,/CRP Family Admin listening on http:\/\/127\.0\.0\.1:4395/);
  }finally{
    if(child&&child.exitCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exited;}
    unlinkSync(link); // Remove the owned junction before deleting the private test directory.
    assert.ok(realpathSync(root).startsWith(realpathSync(tmpdir())));
    rmSync(root,{recursive:true,force:true});
  }
});
