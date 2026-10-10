import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/tracker.js';
function response() { return { statusCode: 200, headers: {}, status(n) { this.statusCode = n; return this; }, setHeader(k, v) { this.headers[k] = v; }, json(body) { this.body = body; return this; } }; }
test('unconfigured storage fails closed and never serves stale data', async () => {
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_PUBLISHABLE_KEY;
  const res = response(); await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 503); assert.equal(res.body.features, undefined); assert.equal(res.headers['Cache-Control'], 'no-store');
});
test('public API does not accept writes', async () => {
  const res = response(); await handler({ method: 'POST' }, res);
  assert.equal(res.statusCode, 405);
});
test('rejects a non-Supabase storage host', async () => {
  process.env.SUPABASE_URL = 'https://evil.example.com'; process.env.SUPABASE_PUBLISHABLE_KEY = 'k';
  const res = response(); await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 503);
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_PUBLISHABLE_KEY;
});
