import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyProduction } from './smoke-production.mjs';

const commit = 'a'.repeat(40);
const app = 'https://cinesearch.test';
const api = 'https://cinesearch-api.test';
const repository = 'owner/cinesearch';
const token = 'fixture-token';

function mockProduction(t, { allowedOrigin = app, renderCommit = commit } = {}) {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const { origin, pathname, searchParams } = new URL(url);
    if (origin === 'https://api.github.com') {
      assert.equal(options.headers.Authorization, `Bearer ${token}`);
      if (pathname === `/repos/${repository}/deployments`) {
        assert.equal(searchParams.get('sha'), commit);
        assert.equal(searchParams.get('environment'), 'Production');
        return Response.json([{ id: 1, sha: commit }]);
      }
      assert.equal(pathname, `/repos/${repository}/deployments/1/statuses`);
      return Response.json([{ state: 'success', creator: { login: 'vercel[bot]' } }]);
    }
    assert.notEqual(options.headers?.Authorization, `Bearer ${token}`);
    if (origin === app) {
      assert.ok(pathname === '/' || pathname === '/movie/550');
      return new Response('<div id="root"></div>', { headers: { 'Content-Type': 'text/html' } });
    }

    assert.equal(origin, api);
    if (pathname === '/health') return Response.json({ status: 'Healthy', commit: renderCommit });
    assert.equal(options.headers.Origin, app);
    const headers = { 'Access-Control-Allow-Origin': allowedOrigin };
    if (pathname === '/api/movies/550') return Response.json({ id: 550 }, { headers });
    assert.ok(pathname === '/api/movies/discover' || pathname === '/api/movies/search');
    return Response.json({ results: [{ id: 550, title: 'Clube da Luta' }] }, { headers });
  });
}

test('verifica o commit, o catálogo e o link direto dos detalhes', async (t) => {
  mockProduction(t);
  await verifyProduction({ commit, app, api, repository, token });
  assert.equal(fetch.mock.callCount(), 8);
});

test('reprova o catálogo quando a API não permite a origem de produção', async (t) => {
  mockProduction(t, { allowedOrigin: 'https://outra-origem.test' });
  await assert.rejects(verifyProduction({ commit, app, api, repository, token }), /CORS/);
});

test('reprova um deploy em que o Render ainda serve outro commit', async (t) => {
  let now = 0;
  t.mock.method(Date, 'now', () => (now += 121_000));
  mockProduction(t, { renderCommit: 'b'.repeat(40) });
  await assert.rejects(verifyProduction({ commit, app, api, repository, token }), /commit esperado/);
});
