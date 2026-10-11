import { expect, test } from '@playwright/test';
import { JOURNAL_STORAGE_KEY } from '../../src/storage.js';

const read = (page) => page.evaluate((key) => localStorage.getItem(key), JOURNAL_STORAGE_KEY);
async function create(page, text) {
  await page.locator('#journal-entry').fill(text);
  await page.locator('#save-entry').click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
}

for (const action of ['create', 'edit', 'delete', 'delete-all']) {
  test(`stale ${action} cannot overwrite another tab and preserves unsaved writing`, async ({ page, context, baseURL }) => {
    await page.goto('./');
    await create(page, 'Original saved reflection');
    const stale = await context.newPage();
    await stale.goto(baseURL);
    await stale.locator('#journal-entry').fill('Keep this composer draft');
    if (action === 'edit') {
      await stale.getByRole('button', { name: 'Edit', exact: true }).click();
      await stale.getByRole('textbox', { name: 'Edit journal entry' }).fill('Keep this unsaved edit');
    }
    await create(page, 'Newer reflection from another tab');
    const newer = await read(page);
    if (action === 'create') {
      await stale.locator('#save-entry').click();
      await expect(stale.locator('#composer-feedback')).toContainText('changed in another tab');
    } else if (action === 'edit') {
      await stale.getByRole('button', { name: 'Save changes' }).click();
      await expect(stale.locator('#recent-entries-list .entry-edit__feedback')).toContainText('changed in another tab');
      await expect(stale.getByRole('textbox', { name: 'Edit journal entry' })).toHaveValue('Keep this unsaved edit');
    } else {
      if (action === 'delete-all') {
        await stale.getByRole('button', { name: 'Settings', exact: true }).click();
        await stale.locator('#delete-all').click();
      } else await stale.getByRole('button', { name: 'Delete', exact: true }).click();
      await stale.locator('#confirm-delete').click();
      await expect(stale.locator('#app-feedback')).toContainText('changed in another tab');
    }
    await expect(stale.locator('#journal-entry')).toHaveValue('Keep this composer draft');
    expect(await read(stale)).toBe(newer);
    await stale.reload();
    await stale.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(stale.locator('#recent-entries-list .entry-card')).toHaveCount(2);
    await create(stale, 'Saved after reviewing the latest journal');
    expect(JSON.parse(await read(stale))).toHaveLength(3);
  });
}

test('simultaneous saves serialize their checks so exactly one can commit', async ({ page, context, baseURL }) => {
  await page.goto('./');
  const other = await context.newPage();
  await other.goto(baseURL);
  await page.locator('#journal-entry').fill('First simultaneous draft');
  await other.locator('#journal-entry').fill('Second simultaneous draft');
  // Hold the real origin-wide lock to force both writes to queue before either
  // comparison happens, then release it. A check outside the lock would fail.
  await page.evaluate(async (key) => {
    await new Promise((resolve) => {
      navigator.locks.request(key, () => new Promise((release) => {
        window.releaseJournalLock = release;
        resolve();
      }));
    });
  }, JOURNAL_STORAGE_KEY);
  await Promise.all([
    page.evaluate(() => document.querySelector('#save-entry').click()),
    other.evaluate(() => document.querySelector('#save-entry').click()),
  ]);
  await expect.poll(() => page.evaluate(async () => (await navigator.locks.query()).pending.length)).toBe(2);
  await page.evaluate(() => window.releaseJournalLock());
  await expect.poll(async () => Number(await page.locator('#save-entry').isEnabled())
    + Number(await other.locator('#save-entry').isEnabled())).toBe(2);
  const saved = JSON.parse(await read(page));
  expect(saved).toHaveLength(1);
  const loser = saved[0].content === 'First simultaneous draft' ? other : page;
  await expect(loser.locator('#composer-feedback')).toContainText('changed in another tab');
  await expect(loser.locator('#journal-entry')).toHaveValue(
    loser === other ? 'Second simultaneous draft' : 'First simultaneous draft');
});

test('a stale tab cannot resurrect an entry deleted elsewhere', async ({ page, context, baseURL }) => {
  await page.goto('./');
  await create(page, 'Entry to remove');
  const stale = await context.newPage();
  await stale.goto(baseURL);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.locator('#confirm-delete').click();
  await expect(page.locator('#app-feedback')).toHaveText('Entry deleted.');
  await stale.locator('#journal-entry').fill('Do not resurrect the deleted entry');
  await stale.locator('#save-entry').click();
  await expect(stale.locator('#composer-feedback')).toContainText('changed in another tab');
  expect(await read(stale)).toBe('[]');
  await expect(stale.locator('#journal-entry')).toHaveValue('Do not resurrect the deleted entry');
});

test('writing typed while a save is waiting is retained after it completes', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(async (key) => {
    await new Promise((resolve) => {
      navigator.locks.request(key, () => new Promise((release) => {
        window.releaseJournalLock = release;
        resolve();
      }));
    });
  }, JOURNAL_STORAGE_KEY);
  await page.locator('#journal-entry').fill('Snapshot sent to storage');
  await page.locator('#save-entry').click();
  await expect(page.locator('#save-entry')).toBeDisabled();
  await page.locator('#journal-entry').fill('More writing while waiting');
  await page.evaluate(() => window.releaseJournalLock());
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
  await expect(page.locator('#journal-entry')).toHaveValue('More writing while waiting');
  expect(JSON.parse(await read(page))[0].content).toBe('Snapshot sent to storage');
});

test('browsers without Web Locks retain reading and refuse unsafe writes', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify([{ id: 'existing', content: 'Readable saved entry', createdAt: '2026-10-10T00:00:00Z' }]));
    Object.defineProperty(navigator, 'locks', { value: undefined });
  }, JOURNAL_STORAGE_KEY);
  await page.goto('./');
  await expect(page.locator('#recent-entries-list')).toContainText('Readable saved entry');
  const original = await read(page);
  await page.locator('#journal-entry').fill('Keep this unsupported-browser draft');
  await page.locator('#save-entry').click();
  await expect(page.locator('#composer-feedback')).toContainText('cannot safely coordinate');
  await expect(page.locator('#journal-entry')).toHaveValue('Keep this unsupported-browser draft');
  expect(await read(page)).toBe(original);
});

test('edit writing survives navigation while persistence is waiting', async ({ page }) => {
  await page.goto('./');
  await create(page, 'Original entry');
  await page.evaluate(async (key) => {
    await new Promise((resolve) => {
      navigator.locks.request(key, () => new Promise((release) => {
        window.releaseJournalLock = release;
        resolve();
      }));
    });
  }, JOURNAL_STORAGE_KEY);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Edit journal entry' }).fill('Edit sent to storage');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('textbox', { name: 'Edit journal entry' }).fill('More edit writing while waiting');
  await page.evaluate(() => window.releaseJournalLock());
  await expect(page.locator('#app-feedback')).toHaveText('Entry updated.');
  await expect(page.getByRole('textbox', { name: 'Edit journal entry' })).toHaveValue('More edit writing while waiting');
  expect(JSON.parse(await read(page))[0].content).toBe('Edit sent to storage');
});
