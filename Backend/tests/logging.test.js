const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const logger = require('../utils/logger');

test('diagnostics redact credentials and private fields recursively', () => {
  const result = logger.redact({ password: 'private', nested: { otp: '123456', email: 'person@example.com' }, error: new Error('Failed https://user:password@example.com token=private') });
  const text = JSON.stringify(result);
  assert.equal(text.includes('private'), false);
  assert.equal(text.includes('123456'), false);
  assert.equal(text.includes('person@example.com'), false);
  assert.equal(result.password, '[REDACTED]');
});

test('request logs correlate status and timing without query strings', async () => {
  const lines = [];
  const original = console.log;
  const oldLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = 'debug';
  console.log = line => lines.push(line);
  try {
    const app = express();
    app.use(require('../middlewares/requestLog.middleware'));
    app.get('/health', (req, res) => res.json({ ok: true }));
    const response = await request(app).get('/health?password=private');
    assert.equal(response.status, 200);
    assert.match(response.headers['x-request-id'], /^[a-f0-9-]{36}$/);
    assert(lines.some(line => line.includes('http.request.complete') && line.includes('durationMs') && line.includes(response.headers['x-request-id'])));
    assert.equal(lines.join('').includes('private'), false);
  } finally {
    console.log = original;
    if (oldLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = oldLevel;
  }
});
