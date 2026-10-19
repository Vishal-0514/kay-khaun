import './helpers.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { default: app } = await import('../src/app.js');
let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

test('old policy links move to the website', async () => {
  const res = await fetch(`${base}/privacy`, { redirect: 'manual' });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://www.karisglobalretail.com/apps/kya-khaun/privacy');
});

test('unknown routes answer with JSON 404', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).success, false);
});

test('private routes need sign-in', async () => {
  const routes = [
    ['POST', '/api/chat/messages'],
    ['POST', '/api/mood/snap'],
    ['POST', '/api/songs'],
    ['POST', '/api/cook/swap'],
    ['GET', '/api/me/saved'],
  ];
  for (const [method, path] of routes) {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: method === 'POST' ? '{}' : undefined });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test('a bad token is reported as expired so the app can refresh it', async () => {
  const res = await fetch(`${base}/api/me/saved`, { headers: { authorization: 'Bearer not-a-token' } });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).code, 'TOKEN_EXPIRED');
});
