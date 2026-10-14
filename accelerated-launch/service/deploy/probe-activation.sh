#!/usr/bin/env bash
set -euo pipefail
target=$1
build=$2
test "$#" = 7
[[ "$target" = staging || "$target" = production ]]
[[ "$build" =~ ^crp-v1-[a-f0-9]{16}$ ]]
[[ "$3" =~ ^[A-F0-9]{64}$ ]]
[[ "$4" =~ ^[A-F0-9]{64}$ ]]
[[ "$5" =~ ^[0-9]+$ ]]
[[ "$6" =~ ^[a-f0-9]{40}$ ]]
[[ "$7" =~ ^crp-v1-[a-f0-9]{16}$ ]]
base="/opt/crp-wizard-$target"
release="$base/releases/$build"
test -L "$base/current"
if [ "$(readlink -f "$base/current")" != "$release" ]; then exit 3; fi
test ! -L "$base/offsite-backups/backup.lock"
exec 9<"$base/offsite-backups/backup.lock"
flock -s -w 60 9
if [ "$(readlink -f "$base/current")" != "$release" ]; then exit 3; fi
systemctl is-active --quiet "crp-wizard-$target.service"
/opt/crp-node/bin/node - "$target" "$build" "$3" "$4" "$5" "$6" "$7" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [target,build,archive,digest,count,head,previous]=process.argv.slice(2),base='/opt/crp-wizard-'+target,root=base+'/releases/'+build;
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),rowsHash=rows=>hash(rows.map(r=>r.file+'\n'+r.sha256+'\n').join(''));
const m=JSON.parse(fs.readFileSync(root+'/release-manifest.json')),rows=m.groups.flatMap(g=>g.files);
assert.equal(m.manifest_digest,digest);assert.equal(rows.length,Number(count));assert.equal(m.total_file_count,Number(count));assert.equal(new Set(rows.map(r=>r.file)).size,rows.length);
for(const g of m.groups)assert.equal(rowsHash(g.files),g.digest);
assert.equal(rowsHash(m.groups.filter(g=>g.files.length).map(g=>({file:'group:'+g.id,sha256:g.digest}))),digest);
for(const r of rows){const file=path.resolve(root,r.file);assert.ok(file.startsWith(root+'/'));assert.equal(fs.realpathSync(file),file);assert.equal(hash(fs.readFileSync(file)),r.sha256);}
const provenance=JSON.parse(fs.readFileSync(root+'/deployment-provenance.json')),record=JSON.parse(fs.readFileSync(base+'/candidate-activation.json'));
for(const value of [provenance,record]){assert.equal(value.build_id,build);assert.equal(value.git_head,head);assert.equal(value.manifest_digest,digest);assert.equal(value.files,Number(count));}
assert.equal(record.archive_sha256,archive);assert.equal(record.release_directory,root);
assert.equal(record.previous_release,base+'/releases/'+previous);
const text=fs.readFileSync(base+'/'+target+'.env','utf8'),get=key=>{const row=text.split(/\r?\n/).find(l=>l.startsWith(key+'='));let value=row?row.slice(key.length+1).trim():'';if(/^(['"]).*\1$/.test(value))value=value.slice(1,-1);return value;};
assert.equal(get('CRP_BUILD_ID'),build);assert.equal(get('CRP_DEPLOYMENT_ENV'),target);
assert.ok(get('STRIPE_SECRET_KEY').startsWith(target==='production'?'sk_live_':'sk_test_'));assert.ok(get('STRIPE_PUBLISHABLE_KEY').startsWith(target==='production'?'pk_live_':'pk_test_'));
(async()=>{const response=await fetch('http://127.0.0.1:'+(target==='production'?8794:8792)+'/api/health',{signal:AbortSignal.timeout(15000)});assert.ok(response.ok);const h=await response.json();assert.equal(h.ok,true);assert.equal(h.build_id,build);assert.equal(h.deployment,target);assert.equal(h.billing_mode,target==='production'?'live':'test');console.log(JSON.stringify({passed:true,build_id:build,manifest_digest:digest,files:rows.length,source_commit:head,scope:'Fresh actual current release, bytes, service, environment modes and health'}));})().catch(e=>{console.error(e.message);process.exitCode=1;});
NODE
