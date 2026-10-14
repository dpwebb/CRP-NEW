'use strict';
async function run(t, check) {
  return require('../admin-access.test.cjs').run((passed, name, error) => check.ok(passed, error ? name + ': ' + error.message : name));
}
module.exports = { run, id: 'gb-admin-access', title: 'Real MFA/session permissions, partner isolation, owner continuity and durable private admin metadata' };
