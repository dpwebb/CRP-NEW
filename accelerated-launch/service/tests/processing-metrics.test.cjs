'use strict';
// Standalone unit test for the bounded timing metrics. No service or store is opened.
//   node accelerated-launch/service/tests/processing-metrics.test.cjs

const assert = require('node:assert/strict');
const { createMetrics, routeLabel, percentile } = require('../processing-metrics.cjs');

function main() {
  assert.equal(routeLabel('GET', '/api/cases'), 'GET /api/cases');
  assert.equal(routeLabel('POST', '/api/cases/3f2a1c9e-8b7d-4e6f-9a01-2b3c4d5e6f70/files'), 'POST /api/cases/:id/files');
  assert.equal(routeLabel('POST', '/api/cases/1234567890abcdef1234567890abcdef/evaluate'), 'POST /api/cases/:id/evaluate');
  assert.equal(routeLabel('POST', '/api/cases/case_fb5d2372ddc6322e11020779/evaluate'), 'POST /api/cases/:id/evaluate');
  assert.equal(routeLabel('GET', '/api/health'), 'GET /api/health');
  assert.equal(routeLabel('GET', '/api/cases?limit=20'), 'GET /api/cases');
  assert.equal(routeLabel('GET', 'not a url'), 'GET /:value');
  assert.equal(percentile([1, 2, 3, 4], 50), 2);
  assert.equal(percentile([1, 2, 3, 4], 95), 4);
  assert.equal(percentile([], 95), null);

  const metrics = createMetrics({ sampleLimit: 4, routeLimit: 2 });
  metrics.record({ method: 'GET', url: '/api/cases', status: 200, queueMs: 10, runMs: 20, totalMs: 30 });
  metrics.record({ method: 'GET', url: '/api/cases', status: 200, queueMs: 40, runMs: 50, totalMs: 90 });
  metrics.record({ method: 'GET', url: '/api/cases', status: 503, queueMs: 0, runMs: 0, totalMs: 5 });
  metrics.record({ method: 'GET', url: '/api/cases', status: 500, queueMs: 1, runMs: 2, totalMs: 3 });
  metrics.record({ method: 'GET', url: '/api/cases/abc/other/path', status: 200, queueMs: 7, runMs: 8, totalMs: 15 });

  const snapshot = metrics.snapshot();
  assert.equal(snapshot.count, 5);
  assert.equal(snapshot.errors, 2);
  assert.equal(snapshot.routes['GET /api/cases'].count, 4);
  assert.equal(snapshot.routes['GET /api/cases'].errors, 2);
  assert.equal(snapshot.routes['GET /api/cases'].queueMs.count, 4);
  assert.equal(snapshot.routes['GET /api/cases'].queueMs.max, 40);
  assert.ok(snapshot.routes['GET /api/cases/abc/other/path']);
  const second = createMetrics({ sampleLimit: 4, routeLimit: 1 });
  for (let index = 0; index < 10; index++) {
    second.record({ method: 'GET', url: '/api/route/' + (1000 + index), status: 200, queueMs: index, runMs: index, totalMs: index * 2 });
  }
  const bounded = second.snapshot();
  assert.equal(Object.keys(bounded.routes).length, 1);
  assert.equal(bounded.routes['GET /api/route/:id'].queueMs.count, 4);
  assert.equal(bounded.routes['GET /api/route/:id'].queueMs.max, 9);

  console.log(JSON.stringify({ passed: true, snapshot: snapshot.routes['GET /api/cases'], boundedRoutes: Object.keys(bounded.routes) }));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
