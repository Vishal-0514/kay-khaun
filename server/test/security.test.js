import './helpers.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { originAllowed } from '../src/middleware/security.js';
import { signAccessToken, verifyAccessToken } from '../src/utils/tokens.js';
import jwt from 'jsonwebtoken';

const { default: app } = await import('../src/app.js');
let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('security headers are sent, and the server does not announce itself', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('strict-transport-security'));
  assert.ok(res.headers.get('x-frame-options'));
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('only the company website may call the API from a browser', async () => {
  assert.equal(originAllowed('https://www.karisglobalretail.com'), true);
  assert.equal(originAllowed(undefined), true); // the phone apps send no Origin
  assert.equal(originAllowed('https://evil.example'), false);
  const res = await fetch(`${base}/api/nope`, { headers: { origin: 'https://evil.example' } });
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  const ok = await fetch(`${base}/api/nope`, { headers: { origin: 'https://www.karisglobalretail.com' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://www.karisglobalretail.com');
});

test('sign-in is rate limited', async () => {
  let last;
  for (let i = 0; i < 32; i++) {
    last = await fetch(`${base}/api/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  }
  assert.equal(last.status, 429);
  assert.equal((await last.json()).code, 'RATE_LIMITED');
});

test('tokens only verify with the right secret and algorithm', () => {
  const token = signAccessToken({ _id: 'abc123' });
  assert.equal(verifyAccessToken(token).sub, 'abc123');
  // A token signed with another secret, or with no signature at all, is refused.
  assert.throws(() => verifyAccessToken(jwt.sign({ sub: 'abc123' }, 'wrong-secret')));
  const unsigned = jwt.sign({ sub: 'abc123' }, '', { algorithm: 'none' });
  assert.throws(() => verifyAccessToken(unsigned));
});

test('oversized bodies are refused', async () => {
  const big = JSON.stringify({ text: 'x'.repeat(200_000) });
  const res = await fetch(`${base}/api/chat/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: big });
  assert.equal(res.status, 413);
});
