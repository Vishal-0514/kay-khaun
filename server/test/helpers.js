// Shared test setup: no real keys, no database, no network.
process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = '';
process.env.SENTRY_DSN = '';
process.env.JWT_SECRET ??= 'test-secret';

// Replace fetch for one test: routes(url, init) returns { status, body }.
export function mockFetch(routes) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const { status = 200, body = {} } = (await routes(String(url), init)) ?? {};
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { calls, restore: () => (globalThis.fetch = real) };
}
