import { expect, test } from '@playwright/test';
import { JOURNAL_STORAGE_KEY } from '../../src/storage.js';

const views = [
  { name: 'Home', hash: '#home', id: 'home' },
  { name: 'All Entries', hash: '#entries', id: 'all-entries' },
  { name: 'Settings', hash: '#settings', id: 'settings' },
];

async function expectView(page, view) {
  await expect(page).toHaveURL(new RegExp(`${view.hash}$`));
  await expect(page.locator(`#${view.id}-view`)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('button', { name: view.name, exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.primary-nav [aria-current="page"]')).toHaveCount(1);
}

test('navigation clicks and Back/Forward keep the URL, view and selected navigation together', async ({ page }) => {
  await page.goto('./');
  await expectView(page, views[0]);
  for (const view of [views[1], views[2], views[0]]) {
    await page.getByRole('button', { name: view.name, exact: true }).click();
    await expectView(page, view);
  }
  await page.goBack();
  await expectView(page, views[2]);
  await expect(page.locator('#settings-heading')).toBeFocused();
  await page.goBack();
  await expectView(page, views[1]);
  await expect(page.locator('#all-entries-heading')).toBeFocused();
  await page.goForward();
  await expectView(page, views[2]);
});

for (const view of views) {
  test(`direct ${view.hash} navigation and reload preserve the requested view`, async ({ page }) => {
    await page.goto(`./${view.hash}`);
    await expectView(page, view);
    await page.reload();
    await expectView(page, view);
  });
}

test('missing and unsupported hashes replace the current URL with canonical Home', async ({ page }) => {
  for (const hash of ['', '#unknown', '#constructor']) {
    await page.goto('./?previous=1#settings');
    await page.goto(`./?review=1${hash}`);
    await expectView(page, views[0]);
    expect(new URL(page.url()).search).toBe('?review=1');
    await page.goBack();
    await expect(page).toHaveURL(/\?previous=1#settings$/);
    await expectView(page, views[2]);
  }
  await page.evaluate(() => { location.hash = '#unsupported'; });
  await expectView(page, views[0]);
  await page.goBack();
  await expectView(page, views[2]);
});

test('selecting the active view repeatedly does not add history entries', async ({ page }) => {
  await page.goto('./#home');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const length = await page.evaluate(() => history.length);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
  }
  expect(await page.evaluate(() => history.length)).toBe(length);
  await page.goBack();
  await expectView(page, views[0]);
});

test('hash changes preserve a static-hosting project path and query', async ({ page }) => {
  await page.goto('/mini-journal/?review=1#settings');
  await expectView(page, views[2]);
  await page.getByRole('button', { name: 'All Entries', exact: true }).click();
  await expect(page).toHaveURL(/\/mini-journal\/\?review=1#entries$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/mini-journal\/\?review=1#settings$/);
});

test('mobile navigation updates hashes and history closes the menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#home');
  for (const view of [views[1], views[2]]) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('button', { name: view.name, exact: true }).click();
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(`#${view.id}-view`)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${view.hash}$`));
  }
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.goBack();
  await expect(page).toHaveURL(/#entries$/);
  await expect(page.locator('#all-entries-view')).toBeVisible();
  await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.goForward();
  await expect(page.locator('#settings-view')).toBeVisible();
});

test('browser history clears success feedback while preserving composer writing', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-09T12:00:00Z') });
  await page.goto('./#settings');
  await page.clock.pauseAt(new Date('2026-10-09T12:01:00Z'));
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.locator('#journal-entry').fill('Saved through Home');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await page.clock.runFor(20);
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
  await page.locator('#journal-entry').fill('Keep this draft');
  await page.goBack();
  await expectView(page, views[2]);
  await expect(page.locator('#app-feedback')).toBeEmpty();
  await page.goForward();
  await expectView(page, views[0]);
  await page.clock.runFor(5000);
  await expect(page.locator('#app-feedback')).toBeEmpty();
  await expect(page.locator('#journal-entry')).toHaveValue('Keep this draft');
});

test('history reopening All Entries resets pagination and preserves an edit draft', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify(Array.from({ length: 11 }, (_, i) => ({
      id: `entry-${i}`, content: `Reflection ${i}`, createdAt: new Date(Date.UTC(2026, 9, 9, 12, i)).toISOString(),
    }))));
  }, JOURNAL_STORAGE_KEY);
  await page.goto('./#entries');
  await page.locator('#all-entries-list .entry-card').first().getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Edit journal entry' }).fill('Keep this edit draft');
  await page.getByRole('button', { name: 'Last page' }).click();
  await expect(page.locator('#pagination-page')).toHaveText('Page 2 of 2');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.goBack();
  await expectView(page, views[1]);
  await expect(page.locator('#pagination-page')).toHaveText('Page 1 of 2');
  await expect(page.getByRole('textbox', { name: 'Edit journal entry' })).toHaveValue('Keep this edit draft');
});
