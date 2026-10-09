#!/usr/bin/env bash
# Root-run CRP production backup. Plaintext stays in a fresh restricted host directory.
set -euo pipefail
umask 077

service=crp-wizard-production.service
base=/opt/crp-wizard-production
data=/var/lib/private/crp-wizard-production
environment="$base/production.env"
legacy="$base/legacy-custody"
recipient=/etc/crp/v1-production-backup-recipient.txt
credential=/etc/crp/v1-production-wif-cred.json
export CLOUDSDK_CONFIG=/etc/crp/v1-production-gcloud
export GOOGLE_API_CERTIFICATE_CONFIG="$CLOUDSDK_CONFIG/certificate_config.json"
export CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE="$credential"
remote=gs://crp-v1-staging-offsite-backups-20261009/production
backup_root="$base/offsite-backups"
mode=${1:-upload}

fail() { printf 'CRP production backup refused: %s\n' "$1" >&2; exit 1; }
canonical_directory() {
  test -d "$1" && test "$(realpath -e -- "$1")" = "$1" || fail "noncanonical directory"
}
canonical_file() {
  test -f "$1" && test ! -L "$1" && test "$(realpath -e -- "$1")" = "$1" || fail "noncanonical file"
}
ordinary_tree() {
  local unexpected
  unexpected=$(find "$1" -mindepth 1 ! -type d ! -type f -print -quit) || fail "custody inventory failed"
  test -z "$unexpected" || fail "unexpected custody entry type"
}
inventory() {
  (cd "$1" && find . -type f -print0 | sort -z | xargs -0 -r sha256sum)
}
directories() {
  (cd "$1" && find . -type d -print0 | sort -z)
}
verified_copy() {
  local source=$1 destination=$2 name=$3
  inventory "$source" > "$work/$name.source.sha256"
  directories "$source" > "$work/$name.source.directories"
  cp -a -- "$source/." "$destination/"
  inventory "$destination" > "$work/$name.copy.sha256"
  directories "$destination" > "$work/$name.copy.directories"
  cmp -s "$work/$name.source.sha256" "$work/$name.copy.sha256" || fail "snapshot file mismatch"
  cmp -s "$work/$name.source.directories" "$work/$name.copy.directories" || fail "snapshot directory mismatch"
  inventory "$source" > "$work/$name.rechecked.sha256"
  cmp -s "$work/$name.source.sha256" "$work/$name.rechecked.sha256" || fail "custody changed during snapshot"
}

test "$(id -u)" -eq 0 || fail "root required"
test "$#" -le 1 || fail "unexpected arguments"
case "$mode" in upload|snapshot-only) ;; *) fail "use upload or snapshot-only" ;; esac
for tool in realpath find sort xargs sha256sum cmp cp tar age flock mktemp systemctl; do
  command -v "$tool" >/dev/null || fail "required tool missing"
done
canonical_directory "$base"
canonical_directory "$base/releases"
canonical_directory "$data"
ordinary_tree "$data"
canonical_file "$environment"
canonical_file "$recipient"
if [ "$mode" = upload ]; then
  command -v gcloud >/dev/null || fail "gcloud missing"
  canonical_directory "$CLOUDSDK_CONFIG"
  canonical_file "$credential"
  canonical_file "$GOOGLE_API_CERTIFICATE_CONFIG"
fi
if [ -e "$legacy" ] || [ -L "$legacy" ]; then
  canonical_directory "$legacy"
  ordinary_tree "$legacy"
fi

test -L "$base/current" || fail "current must be a release pointer"
release=$(realpath -e -- "$base/current")
case "$release" in "$base/releases/"*) ;; *) fail "release outside production" ;; esac
release_name=${release##*/}
[[ "$release_name" =~ ^crp-v1-[a-f0-9]{16}$ ]] || fail "unexpected release name"
test "$release" = "$base/releases/$release_name" || fail "nested release path"
canonical_directory "$release"
for name in release-manifest.json deployment-provenance.json; do canonical_file "$release/$name"; done
canonical_file "$base/candidate-activation.json"

if [ ! -e "$backup_root" ] && [ ! -L "$backup_root" ]; then mkdir -m 700 -- "$backup_root"; fi
canonical_directory "$backup_root"
chmod 700 -- "$backup_root"
test ! -L "$backup_root/backup.lock" || fail "symlinked lock"
test ! -e "$backup_root/backup.lock" || test -f "$backup_root/backup.lock" || fail "unexpected lock type"
exec 9>"$backup_root/backup.lock"
flock -n 9 || fail "another backup or release operation holds the lock"

work=$(mktemp -d "$backup_root/.snapshot.XXXXXXXX")
[[ "$work" =~ ^/opt/crp-wizard-production/offsite-backups/\.snapshot\.[A-Za-z0-9]{8}$ ]] || fail "unexpected temporary path"
canonical_directory "$work"
restart_needed=0
cleanup() {
  local status=$?
  trap - EXIT HUP INT TERM
  if [ "$restart_needed" -eq 1 ]; then
    if ! systemctl start "$service" || ! systemctl is-active --quiet "$service"; then
      printf 'CRP production backup: service restart failed.\n' >&2
      status=1
    fi
  fi
  # Delete only the literal fresh directory whose resolved path was checked above.
  if [[ "$work" =~ ^/opt/crp-wizard-production/offsite-backups/\.snapshot\.[A-Za-z0-9]{8}$ ]] &&
      [ -d "$work" ] && [ ! -L "$work" ] && [ "$(realpath -e -- "$work")" = "$work" ]; then
    rm -rf -- "$work" || status=1
  else
    printf 'CRP production backup: temporary cleanup path refused.\n' >&2
    status=1
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

initial_state=$(systemctl show --property=ActiveState --value "$service")
case "$initial_state" in
  active) restart_needed=1; systemctl stop "$service" ;;
  inactive|failed) ;;
  *) fail "service is changing state" ;;
esac
stopped_state=$(systemctl show --property=ActiveState --value "$service")
case "$stopped_state" in inactive|failed) ;; *) fail "writer did not stop" ;; esac
# Release activation must use this same backup.lock. Refuse an unexpected pointer change.
test "$(realpath -e -- "$base/current")" = "$release" || fail "release changed before snapshot"
mkdir -m 700 "$work/data" "$work/config" "$work/release"
verified_copy "$data" "$work/data" data
cp -p -- "$environment" "$work/config/production.env"
chmod 600 "$work/config/production.env"
cmp -s "$environment" "$work/config/production.env" || fail "configuration copy mismatch"
for name in release-manifest.json deployment-provenance.json; do
  cp -p -- "$release/$name" "$work/release/$name"
  cmp -s "$release/$name" "$work/release/$name" || fail "release metadata copy mismatch"
done
cp -p -- "$base/candidate-activation.json" "$work/release/candidate-activation.json"
cmp -s "$base/candidate-activation.json" "$work/release/candidate-activation.json" || fail "activation metadata copy mismatch"
legacy_included=false
if [ -d "$legacy" ]; then
  mkdir -m 700 "$work/legacy-custody"
  verified_copy "$legacy" "$work/legacy-custody" legacy
  legacy_included=true
fi
stamp=$(date -u +%Y%m%dT%H%M%SZ)
printf '{"snapshot_utc":"%s","service":"%s","initial_state":"%s","release_directory":"%s","legacy_custody_included":%s}\n' \
  "$stamp" "$service" "$initial_state" "$release" "$legacy_included" > "$work/SNAPSHOT.json"
if [ "$restart_needed" -eq 1 ]; then
  systemctl start "$service"
  systemctl is-active --quiet "$service" || fail "service did not restart"
  restart_needed=0
fi

members=(data config release SNAPSHOT.json)
if [ "$legacy_included" = true ]; then members+=(legacy-custody); fi
(cd "$work" && find "${members[@]}" -type f -print0 | sort -z | xargs -0 -r sha256sum > MANIFEST.sha256)
(cd "$work" && sha256sum --quiet -c MANIFEST.sha256)
members+=(MANIFEST.sha256)
suffix=${work##*.snapshot.}
archive_name="crp-v1-production-$stamp-$suffix.tar.gz.age"
archive="$backup_root/$archive_name"
test ! -e "$archive" && test ! -L "$archive" && test ! -e "$archive.sha256" && test ! -L "$archive.sha256" || fail "archive already exists"
tar --hard-dereference -C "$work" -czf - "${members[@]}" | age -R "$recipient" -o "$work/ciphertext.age"
mv -- "$work/ciphertext.age" "$archive"
(cd "$backup_root" && sha256sum "$archive_name" > "$archive_name.sha256")
if [ "$mode" = snapshot-only ]; then
  printf 'ENCRYPTED_PRODUCTION_SNAPSHOT_READY %s\n' "$archive_name"
  exit 0
fi

remote_archive="$remote/$archive_name"
gcloud storage cp "$archive" "$remote_archive"
gcloud storage cp "$archive.sha256" "$remote_archive.sha256"
gcloud storage cp "$remote_archive" "$work/upload-verify.age"
gcloud storage cp "$remote_archive.sha256" "$work/upload-verify.sha256"
cmp -s "$archive" "$work/upload-verify.age" || fail "uploaded ciphertext mismatch"
cmp -s "$archive.sha256" "$work/upload-verify.sha256" || fail "uploaded checksum mismatch"
# Retention touches only our regular archives, after a successful offsite round trip.
while IFS= read -r -d '' old; do
  old_name=${old##*/}
  if [[ "$old_name" =~ ^crp-v1-production-[0-9]{8}T[0-9]{6}Z-[A-Za-z0-9]{8}\.tar\.gz\.age(\.sha256)?$ ]] &&
      [ ! -L "$old" ] && [ "$(realpath -e -- "$old")" = "$backup_root/$old_name" ]; then
    rm -- "$old"
  fi
done < <(find "$backup_root" -maxdepth 1 -type f -mtime +30 -print0)
printf 'PRODUCTION_OFFSITE_BACKUP_VERIFIED %s\n' "$archive_name"
