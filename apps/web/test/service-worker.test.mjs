import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const ORIGIN = 'https://formflow.test';

function response(body) {
  return {
    ok: true,
    status: 200,
    type: 'basic',
    body,
    clone() { return response(body); },
    async text() { return body; },
    async json() { return JSON.parse(body); }
  };
}

function request(url, mode = 'cors') {
  return { method: 'GET', url: new URL(url, ORIGIN).href, mode };
}

test('pre-caches entry, lazy PDF chunks, fonts and serves the app offline', async () => {
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const handlers = new Map();
  const stored = new Map();
  let offline = false;
  let ignoredVaryForStaticAssets = false;
  const manifest = {
    'index.html': {
      file: 'assets/index.js',
      css: ['assets/app.css'],
      assets: ['assets/arabic-font.woff']
    },
    'inspection.js': {
      file: 'assets/inspection.js',
      assets: ['assets/pdf.worker.mjs']
    },
    'export.js': { file: 'assets/export.js' }
  };

  const keyOf = (value) => new URL(typeof value === 'string' ? value : value.url, ORIGIN).href;
  const fetchMock = async (value) => {
    if (offline) throw new Error('Network unavailable');
    const url = keyOf(value);
    if (url.endsWith('/formflow-manifest.json')) return response(JSON.stringify(manifest));
    return response(url);
  };

  const cache = {
    async addAll(urls) {
      for (const url of urls) {
        const item = await fetchMock(url);
        if (!item.ok) throw new Error('Failed to cache ' + url);
        stored.set(keyOf(url), item.clone());
      }
    },
    async put(key, item) { stored.set(keyOf(key), item.clone()); },
    async match(key) { return stored.get(keyOf(key)) ?? null; },
    async keys() { return [...stored.keys()].map((url) => ({ url })); }
  };
  const caches = {
    async open() { return cache; },
    async keys() { return ['formflow-shell-v4']; },
    async delete() { return true; },
    async match(key, options) {
      ignoredVaryForStaticAssets = options?.ignoreVary === true;
      return cache.match(key);
    }
  };
  const self = {
    location: { origin: ORIGIN },
    clients: { claim: async () => undefined },
    skipWaiting: async () => undefined,
    addEventListener(name, handler) { handlers.set(name, handler); }
  };

  runInNewContext(source, { self, caches, fetch: fetchMock, URL, Promise, Set, Object, Response });

  const installTasks = [];
  handlers.get('install')({ waitUntil(task) { installTasks.push(task); } });
  await Promise.all(installTasks);

  for (const asset of [
    '/',
    '/formflow-manifest.json',
    '/assets/index.js',
    '/assets/app.css',
    '/assets/arabic-font.woff',
    '/assets/inspection.js',
    '/assets/pdf.worker.mjs',
    '/assets/export.js'
  ]) {
    assert.ok(stored.has(new URL(asset, ORIGIN).href), `expected ${asset} in the precache`);
  }

  offline = true;
  let navigationResponse;
  handlers.get('fetch')({
    request: request('/', 'navigate'),
    respondWith(value) { navigationResponse = value; }
  });
  const shell = await navigationResponse;
  assert.equal(await shell.text(), new URL('/', ORIGIN).href);

  let assetResponse;
  handlers.get('fetch')({
    request: request('/assets/export.js'),
    respondWith(value) { assetResponse = value; }
  });
  const lazyChunk = await assetResponse;
  assert.equal(await lazyChunk.text(), new URL('/assets/export.js', ORIGIN).href);
  assert.equal(ignoredVaryForStaticAssets, true, 'static asset cache lookups must ignore response Vary headers so pre-cached no-cors files are reusable by the browser');

  let pdfWasIntercepted = false;
  handlers.get('fetch')({
    request: request('/private/user-document.pdf'),
    respondWith() { pdfWasIntercepted = true; }
  });
  assert.equal(pdfWasIntercepted, false, 'user PDF requests must bypass the service-worker cache');
});
