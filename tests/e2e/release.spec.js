import { expect, test } from '@playwright/test';
import { JOURNAL_STORAGE_KEY } from '../../src/storage.js';

async function navigate(page, name) {
  const menu = page.getByRole('button', { name: 'Open navigation menu' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name, exact: true }).click();
}

test('application assets load under the configured base without external requests or page errors', async ({ page, baseURL }) => {
  const errors = [];
  const requests = [];
  const failed = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  page.on('requestfailed', (request) => failed.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(response.url());
  });
  await page.goto('./#settings');
  await expect(page.locator('#settings-view')).toBeVisible();
  const base = new URL(baseURL);
  const assets = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll((elements) =>
    elements.map((element) => element.src || element.href));
  expect(assets.length).toBeGreaterThan(0);
  for (const asset of assets) {
    expect(new URL(asset).origin).toBe(base.origin);
    expect(new URL(asset).pathname.startsWith(base.pathname)).toBe(true);
  }
  expect(requests.every((url) => new URL(url).origin === base.origin)).toBe(true);
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

test('closing and reopening a page restores entries and preferences', async ({ page, context, baseURL }) => {
  await page.goto('./');
  await page.locator('#journal-entry').fill('A reflection to revisit');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
  const stored = await page.evaluate((key) => localStorage.getItem(key), JOURNAL_STORAGE_KEY);
  await navigate(page, 'Settings');
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await page.getByRole('radio', { name: 'Large', exact: true }).check();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(new URL('./#entries', baseURL).href);
  await expect(reopened.locator('#all-entries-list')).toContainText('A reflection to revisit');
  await expect(reopened.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(reopened.locator('html')).toHaveAttribute('data-text-size', 'large');
  expect(await reopened.evaluate((key) => localStorage.getItem(key), JOURNAL_STORAGE_KEY)).toBe(stored);
});

test('journal and Settings operations make no network requests after initial loading', async ({ page }) => {
  await page.goto('./');
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.locator('#journal-entry').fill('<script>private reflection</script>');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Edit journal entry' }).fill('Private revised reflection');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await navigate(page, 'All Entries');
  await navigate(page, 'Settings');
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await page.getByRole('button', { name: 'Delete all journal entries', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete all entries', exact: true }).click();
  await expect(page.locator('#app-feedback')).toHaveText('All journal entries deleted.');
  expect(requests).toEqual([]);
});

test('keyboard can create, edit and confirm individual deletion', async ({ page }) => {
  await page.goto('./');
  await page.locator('#journal-entry').focus();
  await page.keyboard.type('Keyboard reflection');
  await page.keyboard.press('Tab');
  await expect(page.locator('#save-entry')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#journal-entry')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Edit journal entry' })).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Revised with keyboard');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#recent-entries-list .empty-state')).toBeVisible();
  await expect(page.locator('#recent-entries-heading')).toBeFocused();
});

for (const width of [320, 390, 1440]) {
  test(`all views fit at ${width}px with long text in both appearances`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1100 : 844 });
    await page.goto('./');
    await page.locator('#journal-entry').fill('W'.repeat(1000));
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
    for (const appearance of ['Light', 'Dark']) {
      await navigate(page, 'Settings');
      await page.getByRole('radio', { name: appearance, exact: true }).check();
      await page.getByRole('radio', { name: 'Large', exact: true }).check();
      for (const view of ['Settings', 'Home', 'All Entries']) {
        await navigate(page, view);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      }
    }
  });
}
