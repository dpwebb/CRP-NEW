import { constants, openSync, fstatSync, closeSync, writeSync, ftruncateSync, fsyncSync, lstatSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// Linux flock is attached to the open file description inherited by the helper.
// The parent retains that description: exit/SIGKILL/reboot releases ownership.
// Never unlink the kernel lock inode, including on normal shutdown.
export function acquireProcessLock(directory) {
  const legacy = join(directory, 'process.lock');
  if (process.platform !== 'linux') {
    const fd = openSync(legacy, 'wx', 0o600);
    try { writeSync(fd, String(process.pid)); fsyncSync(fd); }
    catch (error) { closeSync(fd); unlinkSync(legacy); throw error; }
    return () => { closeSync(fd); unlinkSync(legacy); };
  }
  const file = join(directory, 'process.kernel.lock');
  const fd = openSync(file, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 || stat.uid !== process.getuid())
      throw Error('AUDIT_LOCK_PRIVATE_ORDINARY_FILE_REQUIRED');
    const result = spawnSync('/usr/bin/flock', ['--exclusive', '--nonblock', '3'], {
      stdio: ['ignore', 'ignore', 'pipe', fd], timeout: 5000,
    });
    if (result.error || result.signal || result.status !== 0)
      throw Error(result.status === 1 ? 'AUDIT_LOCK_BUSY_EEXIST' : 'AUDIT_KERNEL_LOCK_UNAVAILABLE');
    // Old releases did not take flock. Upgrade only after a stopped, verified
    // migration quarantines their legacy file; never guess from a stale PID.
    if (lstatSync(legacy, {throwIfNoEntry:false})) throw Error('AUDIT_LEGACY_LOCK_REQUIRES_STOPPED_MIGRATION');
    ftruncateSync(fd, 0);
    writeSync(fd, `kernel-flock-v1\n${process.pid}\n`);
    fsyncSync(fd);
    return () => closeSync(fd);
  } catch (error) { closeSync(fd); throw error; }
}
