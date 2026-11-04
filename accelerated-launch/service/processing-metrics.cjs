'use strict';
// Bounded, privacy-safe timing metrics for the single-worker request path.
// Only route labels, status codes and millisecond durations are retained.
// Request bodies, headers, tokens, case identifiers and customer values are never recorded.

const DEFAULT_SAMPLE_LIMIT = 1024;
const DEFAULT_ROUTE_LIMIT = 48;
const OTHER_ROUTE = 'OTHER';

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function distribution(values) {
  if (!values.length) return { count: 0, p50: null, p95: null, p99: null, max: null };
  const sorted = Array.from(values).sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1]
  };
}

// Collapse identifiers so labels stay low-cardinality: /api/cases/<uuid>/files -> /api/cases/:id/files.
function routeLabel(method, rawUrl) {
  let pathname;
  try {
    pathname = new URL(rawUrl || '/', 'http://localhost').pathname;
  } catch {
    pathname = '/invalid';
  }
  const parts = pathname.split('/').filter(Boolean);
  const safe = [];
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (index >= 2 && (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(part) || /^[0-9a-f]{16,}$/i.test(part) || /^\d{3,}$/.test(part) || /^[A-Za-z]{1,12}[-_][0-9a-f]{8,}$/.test(part))) {
      safe.push(':id');
      continue;
    }
    safe.push(/^[A-Za-z0-9._-]{1,64}$/.test(part) ? part : ':value');
  }
  const route = '/' + safe.join('/');
  return (method || 'GET').toUpperCase() + ' ' + (route.length > 160 ? route.slice(0, 160) : route);
}

function bounded(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 1000) / 1000 : 0;
}

class TimingMetrics {
  constructor(options = {}) {
    this.sampleLimit = options.sampleLimit ?? DEFAULT_SAMPLE_LIMIT;
    this.routeLimit = options.routeLimit ?? DEFAULT_ROUTE_LIMIT;
    this.routes = new Map();
    this.total = 0;
    this.errors = 0;
    this.createdAt = Date.now();
  }

  series() {
    return { queue: new Float64Array(this.sampleLimit), run: new Float64Array(this.sampleLimit),
      total: new Float64Array(this.sampleLimit), index: 0, filled: 0 };
  }

  record({ method, url, status, queueMs, runMs, totalMs } = {}) {
    const label = routeLabel(method, url);
    const key = this.routes.has(label) ? label : (this.routes.size < this.routeLimit ? label : (method || 'GET').toUpperCase() + ' ' + OTHER_ROUTE);
    if (!this.routes.has(key)) this.routes.set(key, { series: this.series(), count: 0, errors: 0 });
    const route = this.routes.get(key);
    const series = route.series;
    series.queue[series.index] = bounded(queueMs);
    series.run[series.index] = bounded(runMs);
    series.total[series.index] = bounded(totalMs);
    series.index = (series.index + 1) % this.sampleLimit;
    if (series.filled < this.sampleLimit) series.filled++;
    route.count++;
    this.total++;
    if (Number(status) >= 500) {
      route.errors++;
      this.errors++;
    }
    return key;
  }

  sample(series, key) {
    const length = series.filled;
    const offset = series.index;
    const ring = series[key];
    if (length < this.sampleLimit) return ring.slice(0, length);
    return Array.from(ring.slice(offset)).concat(Array.from(ring.slice(0, offset)));
  }

  snapshot(options = {}) {
    const routes = {};
    const queue = [];
    const run = [];
    const total = [];
    let errors = 0;
    let count = 0;
    for (const [label, route] of this.routes) {
      const q = this.sample(route.series, 'queue');
      const r = this.sample(route.series, 'run');
      const t = this.sample(route.series, 'total');
      routes[label] = {
        count: route.count,
        errors: route.errors,
        queueMs: distribution(q),
        runMs: distribution(r),
        totalMs: distribution(t)
      };
      for (const value of q) queue.push(value);
      for (const value of r) run.push(value);
      for (const value of t) total.push(value);
      errors += route.errors;
      count += route.count;
    }
    const snapshot = {
      generatedAt: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - this.createdAt) / 1000),
      sampleLimitPerRoute: this.sampleLimit,
      routeLimit: this.routeLimit,
      count,
      errors,
      queueMs: distribution(queue),
      runMs: distribution(run),
      totalMs: distribution(total),
      routes
    };
    if (options.reset) {
      this.routes.clear();
      this.total = 0;
      this.errors = 0;
      this.createdAt = Date.now();
    }
    return snapshot;
  }
}

function createMetrics(options) {
  return new TimingMetrics(options);
}

module.exports = { createMetrics, routeLabel, percentile, distribution, TimingMetrics, DEFAULT_SAMPLE_LIMIT, DEFAULT_ROUTE_LIMIT };
