'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { TestService } = require('./harness.cjs');
const section = require('./sections/gc-admin-service.cjs');
test('fictional local administration and consumer-approved partner fulfillment', async context => {
  const t = await new TestService('admin-business').listen(); let assertions = 0;
  const check = { ok(value, label) { assertions++; assert.ok(value, label); }, equal(actual, expected, label) { assertions++; assert.equal(actual, expected, label); } };
  try { const result = await section.run(t, check); assert.equal(result.fictional_only, true); context.diagnostic(assertions + ' focused behavioral assertions passed; fictional local evidence only.'); }
  finally { await t.close(); }
});
