#!/usr/bin/env bash
# Root-run staging backup: consistent private-store snapshot, client-side encryption, GCS upload.
set -euo pipefail
umask 077

service=crp-wizard-staging.service
data=/var/lib/private/crp-wizard-staging
environment=/opt/crp-wizard-staging/staging.env
recipient=/etc/crp/v1-staging-backup-recipient.txt
credential=/etc/crp/v1-staging-wif-cred.json
export CLOUDSDK_CONFIG=/etc/crp/v1-staging-gcloud
export GOOGLE_API_CERTIFICATE_CONFIG=$CLOUDSDK_CONFIG/certificate_config.json
remote=gs://crp-v1-staging-offsite-backups-20261009
backup_root=/opt/crp-wizard-staging/offsite-backups
mode=${1:-upload}

test "$(id -u)" -eq 0
case "$mode" in upload|snapshot-only) ;; *) exit 2 ;; esac
test -d "$data" && test -r "$environment" && test -r "$recipient"
if [ "$mode" = upload ]; then
  test -r "$credential" && test -r "$GOOGLE_API_CERTIFICATE_CONFIG"
fi
test "$(realpath -e "$data")" = "$data"
test -z "$(find "$data" -type l -print -quit)"
mkdir -p "$backup_root"
chmod 700 "$backup_root"
test ! -L "$backup_root/backup.lock"
exec 9>"$backup_root/backup.lock"
flock -n 9
systemctl is-active --quiet "$service"

work=$(mktemp -d "$backup_root/.snapshot.XXXXXXXX")
stopped=0
cleanup() {
  status=$?
  trap - EXIT HUP INT TERM
  if [ "$stopped" -eq 1 ]; then systemctl start "$service" || status=1; fi
  rm -rf -- "$work"
  exit "$status"
}
trap cleanup EXIT HUP INT TERM

release=$(realpath -e /opt/crp-wizard-staging/current)
case "$release" in /opt/crp-wizard-staging/releases/crp-v1-*) ;; *) exit 1 ;; esac
test -z "$(find "$release" -type l -print -quit)"
mkdir -m 700 "$work/data" "$work/config" "$work/release"
stopped=1
systemctl stop "$service"
cp -a "$data/." "$work/data/"
cp -p "$environment" "$work/config/staging.env"
cp -a "$release/." "$work/release/"
(cd "$release" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$work/release.source.sha256"
(cd "$work/release" && sha256sum --quiet -c "$work/release.source.sha256")
cp -a /etc/crp "$work/config/crp"
cp -a /opt/crp-operations "$work/config/operations"
systemctl cat "$service" > "$work/config/application-unit.txt"
systemctl cat crp-v1-monitor.service crp-v1-monitor.timer > "$work/config/monitor-units.txt"
cp -p /opt/crp-wizard-staging/offsite-backup.sh "$work/config/backup.sh"
(cd "$data" && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$work/source.sha256"
(cd "$work/data" && sha256sum --quiet -c "$work/source.sha256")
systemctl start "$service"
stopped=0
systemctl is-active --quiet "$service"

(cd "$work" && find data config release -type f -print0 | sort -z | xargs -0 sha256sum > MANIFEST.sha256)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="$backup_root/crp-v1-staging-$stamp.tar.gz.age"
tar -C "$work" -czf - data config release MANIFEST.sha256 | age -R "$recipient" -o "$archive"
sha256sum "$archive" > "$archive.sha256"
if [ "$mode" = snapshot-only ]; then
  printf 'ENCRYPTED_SNAPSHOT_READY %s\n' "$archive"
  exit 0
fi
remote_archive="${remote}/$(basename "$archive")"
gcloud storage cp "$archive" "$remote_archive"
gcloud storage cp "$archive.sha256" "$remote_archive.sha256"
gcloud storage cp "$remote_archive" "$work/upload-verify.age"
cmp -s "$archive" "$work/upload-verify.age"
find "$backup_root" -maxdepth 1 -type f \
  \( -name 'crp-v1-staging-*.tar.gz.age' -o -name 'crp-v1-staging-*.tar.gz.age.sha256' \) \
  -mtime +30 -delete
printf 'OFFSITE_BACKUP_VERIFIED %s\n' "$(basename "$archive")"
