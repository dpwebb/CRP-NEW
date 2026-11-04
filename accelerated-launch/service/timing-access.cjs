'use strict';
// Access policy for the loopback timing endpoint. Kept separate so the security
// boundary is unit-tested rather than inferred from server.cjs control flow.

function isLoopback(remoteAddress) {
  return remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1';
}

function timingAccess({ remoteAddress, authorization, deploymentEnv, nodeEnv, enabled, token } = {}) {
  const loopback = isLoopback(remoteAddress);
  const production = deploymentEnv === 'production' || nodeEnv === 'production';
  const switchedOn = !production || enabled === '1';
  const bearer = Boolean(token) && authorization === 'Bearer ' + token;
  if (!switchedOn) return { allowed: false, reason: 'DISABLED' };
  if (loopback) return { allowed: true, reason: 'LOOPBACK' };
  if (bearer) return { allowed: true, reason: 'TOKEN' };
  return { allowed: false, reason: 'UNAUTHORISED' };
}

module.exports = { timingAccess, isLoopback };
