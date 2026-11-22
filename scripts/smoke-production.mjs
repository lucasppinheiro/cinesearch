import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

async function request(url, headers) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  assert.ok(response.ok, `${url}: HTTP ${response.status}`);
  return response;
}

async function readJson(response) {
  assert.match(response.headers.get('content-type') ?? '', /^application\/json\b/i,
    `${response.url}: resposta JSON esperada`);
  return response.json();
}

async function waitForRender(api, commit) {
  // O plano gratuito pode levar cerca de um minuto para iniciar após um período ocioso.
  const deadline = Date.now() + 120_000;
  while (true) {
    try {
      const health = await readJson(await request(`${api}/health`));
      assert.equal(health.status, 'Healthy', 'Render ainda sem saúde');
      assert.equal(health.commit, commit, 'O Render ainda não serve o commit esperado');
      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await delay(5_000);
    }
  }
}

export async function verifyProduction({ commit, app, api, repository, token }) {
  assert.match(commit ?? '', /^[a-f\d]{40}$/i, 'Informe o SHA completo do commit publicado');

  const deploymentsUrl = `https://api.github.com/repos/${repository}/deployments`;
  const githubHeaders = { Accept: 'application/vnd.github+json' };
  if (token) githubHeaders.Authorization = `Bearer ${token}`;
  const deployments = await readJson(await request(
    `${deploymentsUrl}?sha=${commit}&environment=Production`, githubHeaders));
  let vercelReady = false;
  for (const deployment of deployments) {
    const statuses = await readJson(await request(`${deploymentsUrl}/${deployment.id}/statuses`, githubHeaders));
    const latestVercelStatus = statuses.find((status) => status.creator?.login === 'vercel[bot]');
    if (latestVercelStatus?.state === 'success') {
      vercelReady = true;
      break;
    }
  }
  assert.ok(vercelReady, 'O GitHub ainda não registra o deploy de produção da Vercel para este commit');

  await waitForRender(api, commit);

  async function readCatalog(path) {
    const response = await request(`${api}/api/movies/${path}`, { Origin: app });
    assert.equal(response.headers.get('access-control-allow-origin'), app, `CORS inválido em ${path}`);
    return readJson(response);
  }

  const discovery = await readCatalog('discover?type=movie&page=1');
  const movie = discovery.results?.find((result) => Number.isInteger(result.id) && result.id > 0);
  assert.ok(movie, 'O catálogo não retornou filmes');
  const search = await readCatalog('search?query=Duna&type=movie&page=1');
  assert.ok(search.results?.length > 0, 'A busca por Duna não retornou filmes');
  const details = await readCatalog(`${movie.id}?type=movie`);
  assert.equal(details.id, movie.id, 'Detalhes retornaram outro filme');

  for (const path of ['/', `/movie/${movie.id}?type=movie`]) {
    const response = await request(`${app}${path}`);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/i, `HTML esperado em ${path}`);
    assert.match(await response.text(), /<div id="root">/, `A página ${path} não contém o CineSearch`);
  }
}

if (import.meta.main) {
  const commit = process.argv[2];
  await verifyProduction({
    commit,
    app: 'https://cinesearch-jet.vercel.app',
    api: 'https://cinesearch-api-61a5.onrender.com',
    repository: process.env.GITHUB_REPOSITORY ?? 'lucasppinheiro/cinesearch',
    token: process.env.GITHUB_TOKEN,
  });
  console.log(`Deploys, catálogo e link direto verificados para ${commit}.`);
}
