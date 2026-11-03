'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

test('a burst of eight requests preserves responses without flushing storage probes per request', async () => {
  const parentPort = new EventEmitter();
  const messages = [];
  parentPort.postMessage = message => messages.push(message);
  let probeCount = 0;
  let writable = true;
  let scheduledProbe;
  const service = {
    startup: () => ({}),
    store: {
      dataDir: 'synthetic',
      readiness() {
        probeCount++;
        return { readable: true, writable };
      }
    },
    async handle(req, res) {
      await new Promise(resolve => req.once('end', resolve));
      res.end('response');
    }
  };
  runInNewContext(readFileSync(require.resolve('../processing-worker.cjs'), 'utf8'), {
    Buffer,
    process: { env: {} },
    require(name) {
      if (name === 'node:worker_threads') return { parentPort };
      if (name === './app.cjs') return { createService: () => service };
      return require(name);
    },
    setInterval(callback, delay) {
      assert.equal(delay, 30000);
      scheduledProbe = callback;
      return { unref() {} };
    }
  });
  assert.equal(probeCount, 1);
  for (let id = 0; id < 8; id++) parentPort.emit('message', { id, request: {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(messages.filter(message => message.type === 'response' && message.status === 200).length, 8);
  assert.equal(probeCount, 1);
  writable = false;
  scheduledProbe();
  assert.equal(probeCount, 2);
  assert.equal(messages.at(-1).proof.writable, false);
});
