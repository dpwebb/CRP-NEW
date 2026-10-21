import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {Journal} from '../src/journal.mjs';
import {pack,recover} from '../scripts/backup.mjs';

test('authenticated private backup recovers exact config/key/journal and refuses tampering or live writer',()=>{
  const root=mkdtempSync(join(tmpdir(),'crp-family-backup-'));
  try {
    const config=join(root,'config.json'),key=join(root,'recovery.key'),audit=join(root,'audit'),output=join(root,'backup.enc');
    writeFileSync(config,JSON.stringify({clientSecret:'fictional-encrypted-secret-only'}),{mode:0o600});
    writeFileSync(key,randomBytes(32),{mode:0o600});
    const j=new Journal(audit);j.append('ACTION_INTENT',{key:'fictional-uncertain-key',subject:'fictional-owner'});
    assert.throws(()=>pack({config,audit,key,output,release:'crp-family-'+'a'.repeat(20)}),/STOP_FAMILY_ADMIN/);j.close();
    const result=pack({config,audit,key,output,release:'crp-family-'+'a'.repeat(20)});
    assert.equal(readFileSync(output).includes(Buffer.from('fictional-encrypted-secret-only')),false);
    const dest=join(root,'recovered');const receipt=recover({backup:output,key,destination:dest});
    assert.deepEqual(receipt.files,result.files);assert.equal(receipt.journalIntegrityVerified,true);
    for(const [original,restored]of [[config,join(dest,'config.json')],[join(audit,'integrity.key'),join(dest,'audit/integrity.key')],[join(audit,'audit.jsonl'),join(dest,'audit/audit.jsonl')]])assert.deepEqual(readFileSync(original),readFileSync(restored));
    const recovered=new Journal(join(dest,'audit'));assert.equal(recovered.intents.has('fictional-uncertain-key'),true);recovered.close();
    assert.throws(()=>recover({backup:output,key,destination:dest}),/DESTINATION_EXISTS/);
    const changed=readFileSync(output);changed[changed.length-1]^=1;const bad=join(root,'tampered.enc');writeFileSync(bad,changed);
    assert.throws(()=>recover({backup:bad,key,destination:join(root,'bad-recovery')}));
  }finally{rmSync(root,{recursive:true,force:true});}
});
