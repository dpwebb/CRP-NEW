'use strict';
// Unit test for the timing endpoint access policy.
//   node accelerated-launch/service/tests/timing-access.test.cjs

const assert = require('node:assert/strict');
const { timingAccess, isLoopback } = require('../timing-access.cjs');

function main() {
  assert.equal(isLoopback('127.0.0.1'), true);
  assert.equal(isLoopback('::1'), true);
  assert.equal(isLoopback('::ffff:127.0.0.1'), true);
  assert.equal(isLoopback('10.0.0.5'), false);
  assert.equal(isLoopback(undefined), false);

  assert.deepEqual(timingAccess({ remoteAddress: '127.0.0.1', deploymentEnv: 'local' }), { allowed: true, reason: 'LOOPBACK' });
  assert.deepEqual(timingAccess({ remoteAddress: '10.0.0.5', deploymentEnv: 'local' }), { allowed: false, reason: 'UNAUTHORISED' });
  assert.deepEqual(timingAccess({ remoteAddress: '127.0.0.1', deploymentEnv: 'production' }), { allowed: false, reason: 'DISABLED' });
  assert.deepEqual(timingAccess({ remoteAddress: '10.0.0.5', deploymentEnv: 'production', enabled: '1' }), { allowed: false, reason: 'UNAUTHORISED' });
  assert.deepEqual(timingAccess({ remoteAddress: '127.0.0.1', deploymentEnv: 'production', enabled: '1' }), { allowed: true, reason: 'LOOPBACK' });
  assert.deepEqual(timingAccess({ remoteAddress: '10.0.0.5', deploymentEnv: 'production', enabled: '1', token: 'synthetic', authorization: 'Bearer synthetic' }), { allowed: true, reason: 'TOKEN' });
  assert.deepEqual(timingAccess({ remoteAddress: '10.0.0.5', deploymentEnv: 'production', enabled: '1', token: 'synthetic', authorization: 'Bearer other' }), { allowed: false, reason: 'UNAUTHORISED' });
  assert.deepEqual(timingAccess({ remoteAddress: '10.0.0.5', nodeEnv: 'production' }), { allowed: false, reason: 'DISABLED' });

  console.log(JSON.stringify({ passed: true, cases: 10 }));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
