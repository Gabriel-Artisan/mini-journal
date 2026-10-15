import { chromium, expect, test } from '@playwright/test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JOURNAL_STORAGE_KEY } from '../../src/storage.js';

async function ready(page) {
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect(page.locator('#offline-status')).toBeHidden();
  await expect(page.locator('#offline-status')).toBeEmpty();
}
async function create(page, text) {
  await page.locator('#journal-entry').fill(text);
  await page.locator('#save-entry').click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
}

test.describe('production offline support', () => {
  test.skip(({ baseURL }) => new URL(baseURL).pathname !== '/mini-journal/', 'Offline caching is production-only');

  for (const width of [320, 390, 1440]) {
    test(`successful offline preparation leaves no status or layout space on any view at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1440 ? 1100 : 844 });
      await page.goto('./');
      await ready(page);
      for (const view of ['Home', 'All Entries', 'Settings']) {
        const menu = page.getByRole('button', { name: 'Open navigation menu' });
        if (await menu.isVisible()) await menu.click();
        await page.getByRole('button', { name: view, exact: true }).click();
        await expect(page.getByText('Ready for offline use in this browser.', { exact: true })).toHaveCount(0);
        await expect(page.locator('#offline-status')).toBeHidden();
        expect(await page.locator('#offline-status').boundingBox()).toBeNull();
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      }
      await expect(page.getByRole('heading', { name: 'Privacy & storage', exact: true })).toBeVisible();
      await expect(page.locator('.settings-card--privacy')).toContainText('stored only in this browser on this device');
      await expect(page.locator('.storage-callout')).toContainText('Browser storage is not a cloud backup.');
    });
  }

  test('reopens offline and supports create, edit, individual and bulk deletion with Settings intact', async ({ page, context, baseURL }) => {
    await page.goto('./');
    await ready(page);
    await create(page, 'Reflection before disconnecting');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('radio', { name: 'Dark', exact: true }).check();
    await page.getByRole('radio', { name: 'Large', exact: true }).check();
    await context.setOffline(true);
    await page.close();
    const offline = await context.newPage();
    await offline.goto(baseURL);
    await expect(offline.locator('#recent-entries-list')).toContainText('Reflection before disconnecting');
    await expect(offline.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(offline.locator('html')).toHaveAttribute('data-text-size', 'large');
    await create(offline, 'Reflection created offline');
    const card = offline.locator('#recent-entries-list .entry-card').first();
    const original = await offline.evaluate((key) => JSON.parse(localStorage.getItem(key))[0], JOURNAL_STORAGE_KEY);
    await card.getByRole('button', { name: 'Edit', exact: true }).click();
    await card.getByRole('textbox', { name: 'Edit journal entry' }).fill('Reflection edited offline');
    await card.getByRole('button', { name: 'Save changes' }).click();
    await expect(card).toContainText('Reflection edited offline');
    const edited = await offline.evaluate((key) => JSON.parse(localStorage.getItem(key))[0], JOURNAL_STORAGE_KEY);
    expect(edited).toEqual({ ...original, content: 'Reflection edited offline' });
    await card.getByRole('button', { name: 'Delete', exact: true }).click();
    await offline.locator('#confirm-delete').click();
    await expect(offline.locator('#app-feedback')).toHaveText('Entry deleted.');
    await offline.reload();
    await expect(offline.locator('#recent-entries-list .entry-card')).toHaveCount(1);
    await offline.goto(new URL('./?offline=1#settings', baseURL).href);
    await expect(offline.locator('#settings-view')).toBeVisible();
    await offline.locator('#delete-all').click();
    await offline.locator('#confirm-delete').click();
    await expect(offline.locator('#app-feedback')).toHaveText('All journal entries deleted.');
    await offline.reload();
    await expect(offline.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();
    await expect(offline.getByRole('radio', { name: 'Large', exact: true })).toBeChecked();
    expect(await offline.evaluate((key) => localStorage.getItem(key), JOURNAL_STORAGE_KEY)).toBe('[]');
    const cached = await offline.evaluate(async () => {
      const names = (await caches.keys()).filter((name) => name.startsWith('mini-journal-shell:'));
      const cache = await caches.open(names[0]);
      const resources = await cache.keys();
      return Promise.all(resources.map(async (request) => ({ url: request.url, body: await (await cache.match(request)).text() })));
    });
    expect(cached).toHaveLength(3);
    expect(cached.map(({ url }) => new URL(url).pathname)).toEqual(expect.arrayContaining([
      expect.stringMatching(/^\/mini-journal\/assets\/.*\.css$/),
      expect.stringMatching(/^\/mini-journal\/assets\/.*\.js$/),
      '/mini-journal/index.html',
    ]));
    expect(cached.some(({ body }) => body.includes('Reflection created offline'))).toBe(false);
  });

  test('saved entries and preferences survive a full offline browser restart', async ({ baseURL }) => {
    // Keep Chromium CacheStorage paths short on Windows; the deeply nested
    // test-output path can exceed its filesystem path limit.
    const profile = await mkdtemp(join(tmpdir(), 'mini-journal-'));
    let context = await chromium.launchPersistentContext(profile);
    try {
      let page = context.pages()[0];
      await page.goto(baseURL);
      await ready(page);
      await context.setOffline(true);
      await create(page, 'Saved offline before browser restart');
      const saved = await page.evaluate((key) => localStorage.getItem(key), JOURNAL_STORAGE_KEY);
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByRole('radio', { name: 'Dark', exact: true }).check();
      await context.close();
      context = await chromium.launchPersistentContext(profile, { offline: true });
      page = context.pages()[0];
      await page.goto(baseURL);
      await expect(page.locator('#recent-entries-list')).toContainText('Saved offline before browser restart');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      expect(await page.evaluate((key) => localStorage.getItem(key), JOURNAL_STORAGE_KEY)).toBe(saved);
      await create(page, 'Another entry after offline restart');
      await page.reload();
      await expect(page.locator('#recent-entries-list .entry-card')).toHaveCount(2);
    } finally {
      await context.close();
      expect(profile.startsWith(join(tmpdir(), 'mini-journal-'))).toBe(true);
      await rm(profile, { recursive: true, force: true });
    }
  });

  test('reports initial cache installation failure without losing journal usability', async ({ page, context }) => {
    // BrowserContext routes include the worker's asset fetches.
    await context.route('**/assets/*.css', (route) => {
      if (route.request().serviceWorker()) return route.abort();
      return route.continue();
    });
    await page.goto('./');
    await expect(page.locator('#offline-status')).toContainText('couldn’t be prepared');
    await create(page, 'Saved despite failed offline preparation');
    expect(await page.evaluate(() => caches.keys())).toEqual([]);
  });

  test('an update waits for open tabs, then replaces only its own obsolete caches', async ({ page, context }) => {
    // Playwright cannot intercept worker-update script requests. Serve the
    // actual bundle from a disposable HTTP server that changes only sw.js.
    let source = await readFile('dist/sw.js', 'utf8');
    const resources = new Map([
      ['/mini-journal/', await readFile('dist/index.html')],
      ['/mini-journal/index.html', await readFile('dist/index.html')],
      ['/observer.html', '<html><title>Update observer</title></html>'],
    ]);
    for (const name of await readdir('dist/assets')) {
      resources.set(`/mini-journal/assets/${name}`, await readFile(`dist/assets/${name}`));
    }
    const server = createServer((request, response) => {
      const path = new URL(request.url, 'http://localhost').pathname;
      const body = path === '/mini-journal/sw.js' ? source : resources.get(path);
      response.writeHead(body === undefined ? 404 : 200, {
        'Content-Type': path.endsWith('.js') ? 'application/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html',
        'Cache-Control': 'no-store',
      });
      response.end(body ?? 'Not found');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const baseURL = `${origin}/mini-journal/`;
    try {
      await page.goto(baseURL);
      await ready(page);
      await create(page, 'Journal preserved through a worker update');
      await page.locator('#journal-entry').fill('Unsaved draft kept while update waits');
      const oldNames = await page.evaluate(() => caches.keys());
      await page.evaluate(async () => {
        await caches.open('another-application-cache');
        await caches.open('mini-journal-shell:/mini-journal/:obsolete-test');
      });
      source = source.replace(/const CACHE_NAME = CACHE_PREFIX \+ [^;]+;/,
        'const CACHE_NAME = CACHE_PREFIX + "update-test";');
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
      await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting?.state)).toBe('installed');
      await expect(page.locator('#journal-entry')).toHaveValue('Unsaved draft kept while update waits');
      const waitingCaches = await page.evaluate(() => caches.keys());
      expect(waitingCaches).toContain(oldNames[0]);
      expect(waitingCaches).toContain('mini-journal-shell:/mini-journal/:update-test');
      const observer = await context.newPage();
      await observer.goto(`${origin}/observer.html`);
      await page.close();
      await expect.poll(() => observer.evaluate(async () => (await caches.keys())
        .filter((name) => name.startsWith('mini-journal-shell:')))).toEqual(['mini-journal-shell:/mini-journal/:update-test']);
      expect(await observer.evaluate(() => caches.keys())).toContain('another-application-cache');
      await context.setOffline(true);
      const reopened = await context.newPage();
      await reopened.goto(baseURL);
      await expect(reopened.locator('#recent-entries-list')).toContainText('Journal preserved through a worker update');
      await create(reopened, 'Saved offline after the update');
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

test('development does not register a service worker or show offline status', async ({ page, baseURL }) => {
  test.skip(new URL(baseURL).pathname !== '/', 'Development-only check');
  await page.goto('./');
  await expect(page.locator('#offline-status')).toBeHidden();
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});
