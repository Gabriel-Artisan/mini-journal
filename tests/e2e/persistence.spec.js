import { expect, test } from '@playwright/test';
import { JOURNAL_STORAGE_KEY } from '../../src/storage.js';

const composer = (page) => page.getByLabel('How was your day? What’s on your mind?');

async function createEntry(page, content) {
  await composer(page).fill(content);
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
}

async function readStoredEntries(page) {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), JOURNAL_STORAGE_KEY);
}

test('restores multiple entries after reload with their data and ordering intact', async ({ page }) => {
  await page.goto('./');
  await createEntry(page, 'First persisted reflection');
  await createEntry(page, 'Second persisted reflection');
  await createEntry(page, 'Third persisted reflection');

  const storedBeforeReload = await readStoredEntries(page);
  expect(storedBeforeReload).toHaveLength(3);
  expect(storedBeforeReload.map(({ content }) => content)).toEqual([
    'Third persisted reflection',
    'Second persisted reflection',
    'First persisted reflection',
  ]);
  for (const entry of storedBeforeReload) {
    expect(Object.keys(entry)).toEqual(['id', 'content', 'createdAt']);
  }

  await page.reload();

  const cards = page.locator('#recent-entries-list .entry-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('Third persisted reflection');
  await expect(cards.nth(1)).toContainText('Second persisted reflection');
  await expect(cards.nth(2)).toContainText('First persisted reflection');
  expect(await readStoredEntries(page)).toEqual(storedBeforeReload);
});

test('persists edited content without changing the entry ID or timestamp', async ({ page }) => {
  await page.goto('./');
  await createEntry(page, 'Original persisted reflection');
  const [originalEntry] = await readStoredEntries(page);

  const card = page.locator('#recent-entries-list .entry-card');
  await card.getByRole('button', { name: 'Edit' }).click();
  await card.getByLabel('Edit journal entry').fill('Updated persisted reflection');
  await card.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('#app-feedback')).toHaveText('Entry updated.');

  await page.reload();

  await expect(page.locator('#recent-entries-list')).toContainText('Updated persisted reflection');
  const [updatedEntry] = await readStoredEntries(page);
  expect(updatedEntry).toEqual({
    id: originalEntry.id,
    content: 'Updated persisted reflection',
    createdAt: originalEntry.createdAt,
  });
});

test('persists individual deletion without affecting other entries', async ({ page }) => {
  await page.goto('./');
  await createEntry(page, 'Keep persisted reflection');
  await createEntry(page, 'Delete persisted reflection');

  const deleteCard = page.locator('#recent-entries-list .entry-card')
    .filter({ hasText: 'Delete persisted reflection' });
  await deleteCard.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog', { name: 'Remove this journal entry?' })
    .getByRole('button', { name: 'Delete entry' })
    .click();
  await expect(page.locator('#app-feedback')).toHaveText('Entry deleted.');

  await page.reload();

  await expect(page.locator('#recent-entries-list')).toContainText('Keep persisted reflection');
  await expect(page.locator('#recent-entries-list')).not.toContainText('Delete persisted reflection');
  const storedEntries = await readStoredEntries(page);
  expect(storedEntries).toHaveLength(1);
  expect(storedEntries[0].content).toBe('Keep persisted reflection');
});

test('preserves unsaved creation and edit text when storage writes fail', async ({ page }) => {
  await page.goto('./');
  await createEntry(page, 'Persisted before storage failure');
  const storedBeforeFailure = await readStoredEntries(page);

  await page.evaluate((key) => {
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(storageKey, value) {
      if (storageKey === key) {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return nativeSetItem.call(this, storageKey, value);
    };
  }, JOURNAL_STORAGE_KEY);

  const card = page.locator('#recent-entries-list .entry-card');
  await card.getByRole('button', { name: 'Edit' }).click();
  const editField = card.getByLabel('Edit journal entry');
  await editField.fill('Unsaved edit after storage failure');
  await card.getByRole('button', { name: 'Save changes' }).click();
  await expect(card.locator('.entry-edit__feedback')).toContainText('couldn’t save these edits');
  await expect(editField).toHaveValue('Unsaved edit after storage failure');

  await composer(page).fill('Unsaved new entry after storage failure');
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await expect(page.locator('#composer-feedback')).toContainText('couldn’t save this entry');
  await expect(composer(page)).toHaveValue('Unsaved new entry after storage failure');

  await card.getByRole('button', { name: 'Cancel' }).click();
  const deleteButton = card.getByRole('button', { name: 'Delete' });
  await deleteButton.click();
  await page.getByRole('dialog', { name: 'Remove this journal entry?' })
    .getByRole('button', { name: 'Delete entry' })
    .click();
  await expect(page.locator('#app-feedback')).toContainText('couldn’t delete this entry');
  await expect(card).toContainText('Persisted before storage failure');
  await expect(deleteButton).toBeFocused();
  await expect(composer(page)).toHaveValue('Unsaved new entry after storage failure');
  expect(await readStoredEntries(page)).toEqual(storedBeforeFailure);
});

test('preserves a failed edit draft through pagination and supports retry and cancel', async ({ page }) => {
  const originalEntries = Array.from({ length: 11 }, (_, index) => ({
    id: `draft-${index + 1}`,
    content: index === 10 ? 'Draft target entry' : `Supporting entry ${index + 1}`,
    createdAt: new Date(Date.UTC(2026, 9, 8, 12, index)).toISOString(),
  }));
  const targetEntry = originalEntries.at(-1);

  await page.goto('./');
  await page.evaluate(({ key, value }) => {
    window.localStorage.setItem(key, value);
  }, { key: JOURNAL_STORAGE_KEY, value: JSON.stringify(originalEntries) });
  await page.reload();
  await page.getByRole('button', { name: 'All Entries' }).click();

  const targetCard = page.locator(
    `#all-entries-list .entry-card[data-entry-id="${targetEntry.id}"]`,
  );
  await targetCard.getByRole('button', { name: 'Edit' }).click();

  await page.evaluate((key) => {
    const nativeSetItem = Storage.prototype.setItem;
    window.restoreMiniJournalStorage = () => {
      Storage.prototype.setItem = nativeSetItem;
      delete window.restoreMiniJournalStorage;
    };
    Storage.prototype.setItem = function setItem(storageKey, value) {
      if (storageKey === key) {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return nativeSetItem.call(this, storageKey, value);
    };
  }, JOURNAL_STORAGE_KEY);

  const draft = 'Draft preserved after a failed save';
  await targetCard.getByLabel('Edit journal entry').fill(draft);
  await targetCard.getByRole('button', { name: 'Save changes' }).click();
  await expect(targetCard.locator('.entry-edit__feedback')).toContainText('couldn’t save these edits');

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  const homeTargetCard = page.locator(
    `#recent-entries-list .entry-card[data-entry-id="${targetEntry.id}"]`,
  );
  await expect(homeTargetCard.getByLabel('Edit journal entry')).toHaveValue(draft);

  await page.getByRole('button', { name: 'All Entries' }).click();
  await expect(targetCard.getByLabel('Edit journal entry')).toHaveValue(draft);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.locator('#pagination-page')).toHaveText('Page 2 of 2');
  await page.getByRole('button', { name: 'Previous page' }).click();
  await expect(targetCard.getByLabel('Edit journal entry')).toHaveValue(draft);
  await expect(targetCard.locator('[data-edit-count]')).toHaveText(`${draft.length} / 1,000`);

  await page.evaluate(() => window.restoreMiniJournalStorage());
  await targetCard.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('#app-feedback')).toHaveText('Entry updated.');

  await page.reload();
  await expect(page.locator('#all-entries-view')).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  const reloadedCard = page.locator(
    `#recent-entries-list .entry-card[data-entry-id="${targetEntry.id}"]`,
  );
  await expect(reloadedCard).toBeVisible();
  await expect(reloadedCard).toContainText(draft);
  expect(await readStoredEntries(page)).toContainEqual({
    ...targetEntry,
    content: draft,
  });

  await reloadedCard.getByRole('button', { name: 'Edit' }).click();
  await reloadedCard.getByLabel('Edit journal entry').fill('Discard this draft');
  await reloadedCard.getByRole('button', { name: 'Cancel' }).click();
  await expect(reloadedCard).toContainText(draft);
  await expect(reloadedCard).not.toContainText('Discard this draft');
});

test('protects malformed stored data from ordinary writes', async ({ page }) => {
  const malformedData = '{not valid json';
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, value);
  }, { key: JOURNAL_STORAGE_KEY, value: malformedData });

  await page.goto('./');

  await expect(page.locator('#storage-feedback')).toContainText('stored data was left unchanged');
  await expect(page.locator('#recent-entries-list .empty-state')).toBeVisible();

  await composer(page).fill('Do not overwrite malformed data');
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await expect(page.locator('#composer-feedback')).toContainText('couldn’t save this entry');
  await expect(composer(page)).toHaveValue('Do not overwrite malformed data');

  const storedValue = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    JOURNAL_STORAGE_KEY,
  );
  expect(storedValue).toBe(malformedData);
});
