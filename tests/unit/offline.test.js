import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { offlinePlugin } from '../../scripts/offline-plugin.js';

function buildWorker(html = '<html>Mini Journal</html>') {
  const plugin = offlinePlugin();
  plugin.configResolved({ base: '/mini-journal/' });
  let emitted;
  plugin.generateBundle.handler.call({ emitFile(value) { emitted = value; } }, {}, {
    'index.html': { type: 'asset', source: html },
    'assets/app.js': { type: 'chunk', code: 'console.log("app");' },
    'assets/app.css': { type: 'asset', source: 'body { color: black; }' },
  });
  return emitted;
}

function workerHarness({ installFails = false } = {}) {
  const events = {};
  const names = new Set(['other-cache', 'mini-journal-shell:/different-project/:v1', 'mini-journal-shell:/mini-journal/:old']);
  const added = [];
  const claim = vi.fn();
  const cache = {
    addAll: vi.fn(async (requests) => {
      if (installFails) throw new Error('Network unavailable');
      added.push(...requests.map((request) => request.url));
    }),
    match: vi.fn(async (url) => added.includes(url) ? { cached: url } : undefined),
  };
  const caches = {
    open: async (name) => { names.add(name); return cache; },
    keys: async () => [...names],
    delete: async (name) => names.delete(name),
  };
  const fetch = vi.fn(async () => ({ network: true }));
  runInNewContext(buildWorker().source, {
    self: { addEventListener: (name, handler) => { events[name] = handler; }, clients: { claim }, location: { origin: 'https://example.test' } },
    caches, URL, Request: class { constructor(url) { this.url = url; } }, fetch,
  });
  const lifecycle = async (name) => {
    let completion;
    events[name]({ waitUntil(promise) { completion = promise; } });
    await completion;
  };
  return { events, names, added, claim, fetch, lifecycle };
}

describe('production offline worker', () => {
  it('uses every final bundle resource and invalidates the version when content changes', () => {
    const first = buildWorker();
    expect(first.fileName).toBe('sw.js');
    expect(first.source).toContain('/mini-journal/index.html');
    expect(first.source).toContain('/mini-journal/assets/app.js');
    expect(first.source).toContain('/mini-journal/assets/app.css');
    expect(first.source).not.toContain('__ASSETS__');
    expect(buildWorker().source).toBe(first.source);
    expect(buildWorker('<html>Updated</html>').source).not.toBe(first.source);
    expect(first.source).not.toContain('self.skipWaiting(');
  });

  it('prepares the full shell before activation and cleans only its own old caches', async () => {
    const worker = workerHarness();
    await worker.lifecycle('install');
    expect(worker.added).toHaveLength(3);
    expect(worker.names.has('mini-journal-shell:/mini-journal/:old')).toBe(true);
    expect(worker.claim).not.toHaveBeenCalled();
    await worker.lifecycle('activate');
    expect(worker.names.has('mini-journal-shell:/mini-journal/:old')).toBe(false);
    expect(worker.names.has('other-cache')).toBe(true);
    expect(worker.names.has('mini-journal-shell:/different-project/:v1')).toBe(true);
    expect(worker.claim).toHaveBeenCalledOnce();
  });

  it('removes a failed installation cache while leaving the previous version intact', async () => {
    const worker = workerHarness({ installFails: true });
    await expect(worker.lifecycle('install')).rejects.toThrow('Network unavailable');
    expect([...worker.names]).toEqual(['other-cache', 'mini-journal-shell:/different-project/:v1', 'mini-journal-shell:/mini-journal/:old']);
  });

  it('serves shell queries offline and ignores non-app, cross-origin, and mutation requests', async () => {
    const worker = workerHarness();
    await worker.lifecycle('install');
    let response;
    worker.events.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.test/mini-journal/?review=1' }, respondWith(value) { response = value; } });
    expect(await response).toEqual({ cached: '/mini-journal/index.html' });
    for (const request of [
      { method: 'POST', url: 'https://example.test/mini-journal/index.html' },
      { method: 'GET', url: 'https://another.test/mini-journal/index.html' },
      { method: 'GET', url: 'https://example.test/mini-journal/private-entry' },
    ]) {
      const respondWith = vi.fn();
      worker.events.fetch({ request, respondWith });
      expect(respondWith).not.toHaveBeenCalled();
    }
    expect(worker.fetch).not.toHaveBeenCalled();
  });
});
