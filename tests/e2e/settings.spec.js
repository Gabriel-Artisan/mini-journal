import { expect, test } from '@playwright/test';
import { JOURNAL_STORAGE_KEY, PREFERENCES_STORAGE_KEY } from '../../src/storage.js';

async function navigate(page, name) {
  const menu = page.getByRole('button', { name: 'Open navigation menu' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name, exact: true }).click();
}

async function createEntries(page, count = 2) {
  for (let i = 0; i < count; i++) {
    await page.locator('#journal-entry').fill(`Reflection ${i + 1}`);
    await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await expect(page.locator('#save-entry')).toBeEnabled();
    await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
  }
}

const read = (page, key) => page.evaluate((key) => localStorage.getItem(key), key);
const dialog = (page) => page.getByRole('dialog', { name: 'Delete all journal entries?' });
const beginDelete = (page) => page.getByRole('button', { name: 'Delete all journal entries', exact: true }).click();

test('restores appearance and text size after reload, applying sizes only to journal text', async ({ page }) => {
  await page.goto('./');
  await createEntries(page, 1);
  const headingSize = await page.locator('#composer-heading').evaluate((el) => getComputedStyle(el).fontSize);
  const buttonSize = await page.locator('#save-entry').evaluate((el) => getComputedStyle(el).fontSize);
  let previousWriting = 0;
  let previousReading = 0;
  for (const size of ['Small', 'Medium', 'Large']) {
    await navigate(page, 'Settings');
    await page.getByRole('radio', { name: size, exact: true }).check();
    await page.getByRole('radio', { name: 'Dark', exact: true }).check();
    await navigate(page, 'Home');
    const writing = await page.locator('#journal-entry').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const reading = await page.locator('#recent-entries-list .entry-card__content').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(writing).toBeGreaterThan(previousWriting);
    expect(reading).toBeGreaterThan(previousReading);
    previousWriting = writing;
    previousReading = reading;
    expect(await page.locator('#composer-heading').evaluate((el) => getComputedStyle(el).fontSize)).toBe(headingSize);
    expect(await page.locator('#save-entry').evaluate((el) => getComputedStyle(el).fontSize)).toBe(buttonSize);
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await navigate(page, 'Settings');
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Large', exact: true })).toBeChecked();
  await navigate(page, 'All Entries');
  expect(await page.locator('#all-entries-list .entry-card__content').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBe(previousReading);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  expect(await page.getByRole('textbox', { name: 'Edit journal entry' }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBe(previousWriting);
});

test('System follows live OS changes while explicit appearance overrides them', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  await navigate(page, 'Settings');
  await expect(page.getByRole('radio', { name: 'System', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeChecked();
  for (const explicit of ['Light', 'Dark']) {
    await page.getByRole('radio', { name: explicit, exact: true }).check();
    for (const scheme of ['dark', 'light']) {
      await page.emulateMedia({ colorScheme: scheme });
      await expect(page.locator('html')).toHaveAttribute('data-theme', explicit.toLowerCase());
    }
  }
  await page.getByRole('radio', { name: 'System', exact: true }).check();
  for (const scheme of ['dark', 'light']) {
    await page.emulateMedia({ colorScheme: scheme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
    await expect(page.getByRole('radio', { name: 'System', exact: true })).toBeChecked();
    expect(JSON.parse(await read(page, PREFERENCES_STORAGE_KEY)).appearance).toBe('system');
  }
  await page.reload();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('keyboard radio choices and destructive cancellation preserve entries and restore focus', async ({ page }) => {
  await page.goto('./');
  await createEntries(page);
  const original = await read(page, JOURNAL_STORAGE_KEY);
  await navigate(page, 'Settings');
  await expect(page.locator('#settings-heading')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio', { name: 'System', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();
  const preferences = await read(page, PREFERENCES_STORAGE_KEY);
  for (const method of ['Cancel', 'Escape']) {
    const deleteAll = page.getByRole('button', { name: 'Delete all journal entries', exact: true });
    await expect(deleteAll).toHaveAccessibleName('Delete all journal entries');
    await expect(deleteAll.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await deleteAll.focus();
    await expect(deleteAll).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toContainText('permanently deleted');
    const cancel = dialog(page).getByRole('button', { name: 'Cancel' });
    const confirm = dialog(page).getByRole('button', { name: 'Delete all entries', exact: true });
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(confirm).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cancel).toBeFocused();
    if (method === 'Escape') await page.keyboard.press('Escape');
    else await cancel.click();
    await expect(dialog(page)).toBeHidden();
    await expect(page.locator('#delete-all')).toBeFocused();
    expect(await read(page, JOURNAL_STORAGE_KEY)).toBe(original);
    expect(await read(page, PREFERENCES_STORAGE_KEY)).toBe(preferences);
  }
  await navigate(page, 'Home');
  await expect(page.locator('#recent-entries-list .entry-card')).toHaveCount(2);
});

test('bulk deletion clears every page and stale edits, persisting only the collection change', async ({ page }) => {
  await page.goto('./');
  await createEntries(page, 11);
  await page.locator('#journal-entry').fill('Unsaved composer draft');
  await navigate(page, 'All Entries');
  await page.getByRole('button', { name: 'Last page' }).click();
  await expect(page.locator('#pagination-page')).toHaveText('Page 2 of 2');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Edit journal entry' }).fill('Stale edit draft');
  await navigate(page, 'Settings');
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await page.getByRole('radio', { name: 'Large', exact: true }).check();
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  const preferences = await read(page, PREFERENCES_STORAGE_KEY);
  await beginDelete(page);
  await dialog(page).getByRole('button', { name: 'Delete all entries', exact: true }).click();
  await expect(page.locator('#app-feedback')).toHaveText('All journal entries deleted.');
  await expect(page.locator('#settings-heading')).toBeFocused();
  await expect(page.locator('#delete-all')).toBeDisabled();
  expect(await read(page, JOURNAL_STORAGE_KEY)).toBe('[]');
  expect(await read(page, PREFERENCES_STORAGE_KEY)).toBe(preferences);
  expect(await read(page, 'unrelated')).toBe('keep');
  await expect(page.locator('[data-entry-edit]')).toHaveCount(0);
  await navigate(page, 'Home');
  await expect(page.locator('#recent-entries-list .empty-state')).toBeVisible();
  await expect(page.locator('#journal-entry')).toHaveValue('Unsaved composer draft');
  await navigate(page, 'All Entries');
  await expect(page.locator('#all-entries-list .empty-state')).toBeVisible();
  await expect(page.locator('#pagination-page')).toHaveText('Page 1 of 1');
  await expect(page.locator('#pagination-range')).toHaveText('Showing 0 of 0 entries');
  await page.reload();
  await expect(page.locator('#all-entries-list .empty-state')).toBeVisible();
  await navigate(page, 'Home');
  await expect(page.locator('#recent-entries-list .empty-state')).toBeVisible();
  await navigate(page, 'Settings');
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Large', exact: true })).toBeChecked();
  // A subsequent edit works; deleted edit IDs cannot interfere with new entries.
  await navigate(page, 'Home');
  await createEntries(page, 1);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Edit journal entry' })).toBeFocused();
});

test('failed deletion preserves stored and visible entries and permits retry', async ({ page }) => {
  await page.goto('./');
  await createEntries(page);
  const original = await read(page, JOURNAL_STORAGE_KEY);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    window.restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, JOURNAL_STORAGE_KEY);
  await navigate(page, 'Settings');
  await beginDelete(page);
  await dialog(page).getByRole('button', { name: 'Delete all entries', exact: true }).click();
  await expect(page.locator('#app-feedback')).toContainText('couldn’t delete your entries');
  await expect(page.locator('#delete-all')).toBeFocused();
  expect(await read(page, JOURNAL_STORAGE_KEY)).toBe(original);
  await navigate(page, 'Home');
  await expect(page.locator('#recent-entries-list .entry-card')).toHaveCount(2);
  await page.evaluate(() => window.restoreStorage());
  await navigate(page, 'Settings');
  await beginDelete(page);
  await dialog(page).getByRole('button', { name: 'Delete all entries', exact: true }).click();
  await expect(page.locator('#app-feedback')).toHaveText('All journal entries deleted.');
});

test('failed preference writes apply temporarily, give feedback, and support retry', async ({ page }) => {
  await page.goto('./');
  await createEntries(page, 1);
  const journal = await read(page, JOURNAL_STORAGE_KEY);
  await navigate(page, 'Settings');
  await page.getByRole('radio', { name: 'Light', exact: true }).check();
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    window.restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new Error('Write blocked');
      return original.call(this, name, value);
    };
  }, PREFERENCES_STORAGE_KEY);
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await page.getByRole('radio', { name: 'Large', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#preferences-feedback')).toContainText('couldn’t be saved');
  expect(JSON.parse(await read(page, PREFERENCES_STORAGE_KEY))).toEqual({ appearance: 'light', textSize: 'medium' });
  expect(await read(page, JOURNAL_STORAGE_KEY)).toBe(journal);
  await page.evaluate(() => window.restoreStorage());
  await page.getByRole('button', { name: 'Retry saving preferences' }).click();
  await expect(page.locator('#preferences-feedback')).toBeEmpty();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
});

for (const raw of ['{broken', '[{"id":"invalid"}]']) {
  test(`Settings cannot overwrite unreadable journal data: ${raw}`, async ({ page }) => {
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: JOURNAL_STORAGE_KEY, raw });
    await page.goto('./');
    await navigate(page, 'All Entries');
    await navigate(page, 'Settings');
    await expect(page.locator('#delete-all')).toBeDisabled();
    await expect(page.locator('#delete-all-hint')).toContainText('cannot be read');
    await page.getByRole('radio', { name: 'Dark', exact: true }).check();
    expect(await read(page, JOURNAL_STORAGE_KEY)).toBe(raw);
  });
}

test('unavailable storage leaves settings usable and reports persistence limitations', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('./');
  await navigate(page, 'Settings');
  await expect(page.locator('#preferences-feedback')).toContainText('couldn’t read');
  await expect(page.locator('#delete-all')).toBeDisabled();
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#preferences-feedback')).toContainText('couldn’t be saved');
});

test('mobile Settings, large journal text and confirmation remain within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  await createEntries(page);
  await navigate(page, 'Settings');
  for (const appearance of ['Light', 'Dark']) {
    await page.getByRole('radio', { name: appearance, exact: true }).check();
    await page.getByRole('radio', { name: 'Large', exact: true }).check();
    for (const control of await page.locator('.segmented label, #delete-all').all()) {
      const box = await control.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await beginDelete(page);
    const box = await dialog(page).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    await page.keyboard.press('Escape');
  }
  await navigate(page, 'Home');
  await page.locator('#journal-entry').fill('A long reflection '.repeat(40));
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await navigate(page, 'All Entries');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
