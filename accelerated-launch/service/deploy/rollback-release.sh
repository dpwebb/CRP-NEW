#!/usr/bin/env bash
set -euo pipefail
target=$1
expected=$2
[[ "$target" = staging || "$target" = production ]]
[[ "$expected" =~ ^crp-v1-[a-f0-9]{16}$ ]]
base=/opt/crp-wizard-$target
node=/opt/crp-node/bin/node
test "$(readlink -f "$base/current")" = "$base/releases/$expected"
mapfile -t values < <("$node" - "$base" "$expected" <<'NODE'
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=process.argv[2],expected=process.argv[3],r=JSON.parse(fs.readFileSync(path.join(base,'candidate-activation.json')));
assert.equal(r.build_id,expected);
assert.ok(r.previous_release.startsWith(base+'/releases/crp-v1-'));
assert.ok(/^crp-v1-[a-f0-9]{16}$/.test(path.basename(r.previous_release)));
assert.equal(fs.realpathSync(r.previous_release),r.previous_release);
assert.ok(r.backup.startsWith(base+'/backups/before-'+expected+'-'));
assert.equal(fs.realpathSync(r.backup),r.backup);
const m=JSON.parse(fs.readFileSync(path.join(r.previous_release,'release-manifest.json')));
for(const f of m.groups.flatMap(g=>g.files)){const p=path.resolve(r.previous_release,f.file);assert.ok(p.startsWith(r.previous_release+'/'));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase(),f.sha256);}
assert.equal(path.basename(r.previous_release),'crp-v1-'+m.manifest_digest.slice(0,16).toLowerCase());
console.log(r.previous_release);console.log(r.backup);
NODE
)
test "${#values[@]}" = 2
previous=${values[0]}
backup=${values[1]}
test -f "$backup/$target.env"
test -d "$previous"
safety=$(mktemp -d "$base/backups/rollback-safety.XXXXXX")
chmod 700 "$safety"
cp -a "$base/$target.env" "$safety/$target.env"
recover() {
  rc=$?
  trap - ERR
  systemctl stop "crp-wizard-$target.service" || true
  cp -a "$safety/$target.env" "$base/$target.env"
  ln -sfn "$base/releases/$expected" "$base/current"
  systemctl start "crp-wizard-$target.service"
  exit "$rc"
}
trap recover ERR
systemctl stop "crp-wizard-$target.service"
cp -a "$backup/$target.env" "$base/$target.env"
ln -sfn "$previous" "$base/current"
systemctl start "crp-wizard-$target.service"
port=8792
if [ "$target" = production ]; then port=8794; fi
healthy=0
for attempt in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$port/api/health" > "$safety/health.json" && "$node" - "$safety/health.json" "$(basename "$previous")" "$target" <<'NODE'
const fs=require('node:fs'),assert=require('node:assert/strict');const h=JSON.parse(fs.readFileSync(process.argv[2]));assert.equal(h.ok,true);assert.equal(h.build_id,process.argv[3]);assert.equal(h.deployment,process.argv[4]);assert.equal(h.billing_mode,process.argv[4]==='production'?'live':'test');
NODE
  then healthy=1;break;fi
  sleep 1
done
test "$healthy" = 1
systemctl is-active --quiet "crp-wizard-$target.service"
trap - ERR
echo "Rollback verified: $(basename "$previous"); consumer data retained; environment safety copy $safety"
