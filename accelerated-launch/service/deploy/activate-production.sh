#!/usr/bin/env bash
set -euo pipefail
base=/opt/crp-wizard-production
build=$1
release="$base/releases/$build"
node=/opt/crp-node/bin/node
test "$#" = 9 || { echo 'Production activation requires a verified acceptance proof bundle' >&2; exit 2; }
proof_archive=$8
proof_sha=$9
[[ "$proof_sha" =~ ^[A-F0-9]{64}$ ]]
archive=$2
expected_archive=$3
export CRP_EXPECTED_DIGEST=$5 CRP_EXPECTED_FILES=$6 CRP_EXPECTED_HEAD=$7
[[ "$build" =~ ^crp-v1-[a-f0-9]{16}$ ]]
[[ "$4" =~ ^crp-v1-[a-f0-9]{16}$ ]]
[[ "$expected_archive" =~ ^[A-F0-9]{64}$ ]]
[[ "$CRP_EXPECTED_DIGEST" =~ ^[A-F0-9]{64}$ ]]
[[ "$CRP_EXPECTED_FILES" =~ ^[0-9]+$ ]]
[[ "$CRP_EXPECTED_HEAD" =~ ^[a-f0-9]{40}$ ]]

# All release, rollback and backup operations share one persistent inode.
install -d -m 700 "$base/offsite-backups"
test ! -L "$base/offsite-backups/backup.lock"
exec 9>"$base/offsite-backups/backup.lock"
flock -w 60 9 || { echo "Another CRP operation holds the lock" >&2; exit 75; }
previous=$(readlink -f "$base/current")
test "$previous" = "$base/releases/$4"
test -L "$base/current"
test "$(sha256sum "$archive" | cut -d ' ' -f1 | tr '[:lower:]' '[:upper:]')" = "$expected_archive"
test "$(sha256sum "$proof_archive" | cut -d ' ' -f1 | tr '[:lower:]' '[:upper:]')" = "$proof_sha"
install -d -m 700 "$base/release-proofs"
proof="$base/release-proofs/$build"
test ! -e "$proof"
mkdir -m 700 "$proof"
tar -xzf "$proof_archive" -C "$proof"
"$node" - "$proof" "$build" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const proof=process.argv[2],build=process.argv[3],source=path.join(proof,'source');
const pkg=JSON.parse(fs.readFileSync(path.join(proof,'package-identity.json')));
assert.equal(pkg.build_id,build);assert.equal(pkg.manifest_digest,process.env.CRP_EXPECTED_DIGEST);assert.equal(pkg.git_head,process.env.CRP_EXPECTED_HEAD);assert.equal(pkg.files,Number(process.env.CRP_EXPECTED_FILES));
require(path.join(proof,'verifier/deploy/release-workflow.cjs')).acceptance(JSON.parse(fs.readFileSync(path.join(proof,'acceptance.json'))),build,{measurementFile:path.join(proof,'evidence',pkg.measurement_ref),evidenceRoot:path.join(proof,'evidence'),sourceRoot:source,packageReceipt:pkg});
console.log('Server-side exact-build source, measurement and 30/123 proof verified before service stop.');
NODE
test ! -e "$release"
mkdir -m 755 "$release"
tar -xzf "$archive" -C "$release"
"$node" - "$release" "$base/production.env" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=process.argv[2],envfile=process.argv[3],m=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json')));
const digest=rows=>{const h=crypto.createHash('sha256');for(const r of rows){h.update(r.file);h.update('\n');h.update(r.sha256);h.update('\n');}return h.digest('hex').toUpperCase();};
let count=0;
for(const group of m.groups){assert.equal(digest(group.files),group.digest);for(const f of group.files){const file=path.resolve(root,f.file);assert.ok(file.startsWith(root+'/'));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase(),f.sha256);count++;}}
assert.equal(digest(m.groups.filter(g=>g.files.length).map(g=>({file:'group:'+g.id,sha256:g.digest}))),m.manifest_digest);
assert.equal(m.manifest_digest,process.env.CRP_EXPECTED_DIGEST);assert.equal(count,Number(process.env.CRP_EXPECTED_FILES));
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'deployment-provenance.json'))).git_head,process.env.CRP_EXPECTED_HEAD);
assert.ok(fs.existsSync(path.join(root,'consumer-wizard/dist/jurisdiction-data.js')));
const text=fs.readFileSync(envfile,'utf8');
const get=key=>{const line=text.split(/\r?\n/).find(l=>l.startsWith(key+'='));let v=line?line.slice(key.length+1).trim():'';if(/^(['"]).*\1$/.test(v))v=v.slice(1,-1);return v;};
assert.equal(get('CRP_DEPLOYMENT_ENV'),'production');
assert.ok(get('STRIPE_SECRET_KEY').startsWith('sk_live_'),'Production secret-key mode must be live');
assert.ok(get('STRIPE_PUBLISHABLE_KEY').startsWith('pk_live_'),'Production publishable-key mode must be live');
assert.equal(text.split(/\r?\n/).filter(l=>l.startsWith('CRP_BUILD_ID=')).length,1);
console.log('Manifest files and digest verified; billing keys remain live mode.');
NODE
chown -R root:root "$release"
find "$release" -type d -exec chmod 755 {} +
find "$release" -type f -exec chmod 444 {} +
for tool in pdfinfo pdftotext pdftoppm pdftohtml tesseract; do command -v "$tool" >/dev/null; done
data_dir=$(readlink -f /var/lib/crp-wizard-production)
test "$data_dir" = /var/lib/private/crp-wizard-production
test -d "$data_dir"
backup="$base/backups/before-$build-$(date +%s)"
mkdir -m 700 "$backup"
cp -a "$base/production.env" "$backup/production.env"
chmod 600 "$backup/production.env"
stopped=0
rollback() {
  rc=$?
  trap - ERR
  if [ "$stopped" = 1 ]; then
    systemctl stop crp-wizard-production.service || true
    cp -a "$backup/production.env" "$base/production.env"
    ln -sfn "$previous" "$base/current"
    systemctl start crp-wizard-production.service
    echo "Activation failed; previous production release restored."
  fi
  exit "$rc"
}
trap rollback ERR
systemctl stop crp-wizard-production.service
stopped=1
mkdir -m 700 "$backup/data"
cp -a "$data_dir/." "$backup/data/"
"$node" - "$data_dir" "$backup/data" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
function list(root){let out=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(entry.isFile())out.push([path.relative(root,p),crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]);else throw Error('Unexpected data entry type');}}walk(root);return out.sort((a,b)=>a[0].localeCompare(b[0]));}
const original=list(process.argv[2]),copy=list(process.argv[3]);assert.deepEqual(copy,original);console.log('Stopped-service data snapshot verified: '+copy.length+' files.');
NODE
"$node" - "$base/production.env" "$build" <<'NODE'
const fs=require('node:fs'),file=process.argv[2],build=process.argv[3];
const text=fs.readFileSync(file,'utf8');fs.writeFileSync(file,text.replace(/^CRP_BUILD_ID=.*$/m,'CRP_BUILD_ID='+build));fs.chmodSync(file,0o600);
NODE
ln -sfn "$release" "$base/current"
systemctl start crp-wizard-production.service
verify_health() {
  "$node" - "$release/activation-health.json" "$build" <<'NODE'
const fs=require('node:fs'),assert=require('node:assert/strict');const h=JSON.parse(fs.readFileSync(process.argv[2]));
assert.equal(h.ok,true);assert.equal(h.build_id,process.argv[3]);assert.equal(h.deployment,'production');assert.equal(h.billing_mode,'live');assert.equal(h.launch_ready,false);
NODE
}
healthy=0
for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:8794/api/health > "$release/activation-health.json" 2>/dev/null && verify_health 2>/dev/null; then healthy=1; break; fi
  sleep 1
done
test "$healthy" = 1
systemctl is-active --quiet crp-wizard-production.service
"$node" - "$base" "$release" "$previous" "$backup" "$expected_archive" <<'NODE'
const fs=require('node:fs'),path=require('node:path');const [base,release,previous,backup,archive]=process.argv.slice(2);
const source=JSON.parse(fs.readFileSync(path.join(release,'deployment-provenance.json')));
const record={...source,deployment:'production',host:'creditregulatorpro.com',owner_authorization:'Owner-authorized release workflow with server-verified exact-build acceptance receipt',source_kind:'Exact frozen tested committed shipped files; unrelated dirty work preserved',archive_sha256:archive,release_directory:release,release_proof:path.join(base,'release-proofs',path.basename(release)),previous_release:previous,backup,billing_mode:'live',activated_at:new Date().toISOString()};
fs.writeFileSync(path.join(base,'candidate-activation.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));
NODE
stopped=0
trap - ERR
echo 'Production candidate activated; prior release and restricted snapshot retained.'
