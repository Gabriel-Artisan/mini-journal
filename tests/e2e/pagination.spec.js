import { expect, test } from '@playwright/test';
import { JOURNAL_STORAGE_KEY } from '../../src/storage.js';

const composer = (page) => page.getByLabel('How was your day? What’s on your mind?');

async function createEntry(page, content) {
  await composer(page).fill(content);
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
}

async function openAllEntries(page) {
  await page.getByRole('button', { name: 'All Entries' }).click();
  await expect(page.getByRole('heading', { name: 'All Entries', level: 1 })).toBeFocused();
}

test('represents an empty journal with disabled pagination controls', async ({ page }) => {
  await page.goto('./');
  await openAllEntries(page);

  await expect(page.locator('#all-entries-list .empty-state')).toBeVisible();
  await expect(page.locator('#pagination-page')).toHaveText('Page 1 of 1');
  await expect(page.locator('#pagination-range')).toHaveText('Showing 0 of 0 entries');
  await expect(page.locator('#entries-pagination button')).toHaveCount(4);
  for (const button of await page.locator('#entries-pagination button').all()) {
    await expect(button).toBeDisabled();
  }
});

test('navigates journal pages and clamps the page after deletion', async ({ page }) => {
  await page.goto('./');
  for (let number = 1; number <= 12; number += 1) {
    await createEntry(page, `Pagination entry ${String(number).padStart(2, '0')}`);
  }

  await openAllEntries(page);
  const list = page.locator('#all-entries-list');
  const firstPage = page.getByRole('button', { name: 'First page' });
  const previousPage = page.getByRole('button', { name: 'Previous page' });
  const nextPage = page.getByRole('button', { name: 'Next page' });
  const lastPage = page.getByRole('button', { name: 'Last page' });

  await expect(list.locator('.entry-card')).toHaveCount(10);
  await expect(list.locator('.entry-card').first()).toContainText('Pagination entry 12');
  await expect(page.locator('#pagination-page')).toHaveText('Page 1 of 2');
  await expect(page.locator('#pagination-range')).toHaveText('Showing 1–10 of 12 entries');
  await expect(firstPage).toBeDisabled();
  await expect(previousPage).toBeDisabled();
  await expect(nextPage).toBeEnabled();
  await expect(lastPage).toBeEnabled();

  await nextPage.click();
  await expect(page.locator('#pagination-page')).toHaveText('Page 2 of 2');
  await expect(page.locator('#pagination-range')).toHaveText('Showing 11–12 of 12 entries');
  await expect(list.locator('.entry-card')).toHaveCount(2);
  await expect(list.locator('.entry-card').first()).toContainText('Pagination entry 02');
  await expect(nextPage).toBeDisabled();
  await expect(lastPage).toBeDisabled();

  await firstPage.click();
  await expect(page.locator('#pagination-page')).toHaveText('Page 1 of 2');
  await lastPage.click();
  await expect(page.locator('#pagination-page')).toHaveText('Page 2 of 2');
  await previousPage.click();
  await expect(page.locator('#pagination-page')).toHaveText('Page 1 of 2');
  await lastPage.click();

  const deleteCurrentFirstEntry = async () => {
    await list.locator('.entry-card').first().getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog', { name: 'Remove this journal entry?' })
      .getByRole('button', { name: 'Delete entry' })
      .click();
    await expect(page.locator('#app-feedback')).toHaveText('Entry deleted.');
  };

  await deleteCurrentFirstEntry();
  await expect(page.locator('#pagination-page')).toHaveText('Page 2 of 2');
  await expect(page.locator('#pagination-range')).toHaveText('Showing 11–11 of 11 entries');
  await expect(list.locator('.entry-card')).toHaveCount(1);

  await deleteCurrentFirstEntry();
  await expect(page.locator('#pagination-page')).toHaveText('Page 1 of 1');
  await expect(page.locator('#pagination-range')).toHaveText('Showing 1–10 of 10 entries');
  await expect(list.locator('.entry-card')).toHaveCount(10);
  await expect(firstPage).toBeDisabled();
  await expect(previousPage).toBeDisabled();
  await expect(nextPage).toBeDisabled();
  await expect(lastPage).toBeDisabled();
});

test('starts on page one each time All Entries is opened', async ({ page }) => {
  await page.goto('./');
  for (let number = 1; number <= 11; number += 1) {
    await createEntry(page, `Reopen entry ${number}`);
  }

  await openAllEntries(page);
  await page.getByRole('button', { name: 'Last page' }).click();
  await expect(page.locator('#pagination-page')).toHaveText('Page 2 of 2');

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await openAllEntries(page);
  await expect(page.locator('#pagination-page')).toHaveText('Page 1 of 2');
  await expect(page.locator('#pagination-range')).toHaveText('Showing 1–10 of 11 entries');
});

test('keeps pagination comfortable at a mobile viewport', async ({ page }) => {
  const entries = Array.from({ length: 11 }, (_, index) => ({
    id: `mobile-${index + 1}`,
    content: `Mobile pagination entry ${index + 1}`,
    createdAt: new Date(Date.UTC(2026, 9, 8, 12, index)).toISOString(),
  })).reverse();

  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, value);
  }, { key: JOURNAL_STORAGE_KEY, value: JSON.stringify(entries) });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');

  const menuButton = page.locator('.menu-toggle');
  await menuButton.click();
  await page.getByRole('button', { name: 'All Entries' }).click();

  await expect(page.locator('#pagination-page')).toHaveText('Page 1 of 2');
  await expect(page.locator('#pagination-range')).toHaveText('Showing 1–10 of 11 entries');
  await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
