import { expect, test } from '@playwright/test';

const composer = (page) => page.getByLabel('How was your day? What’s on your mind?');

async function createEntry(page, content) {
  await composer(page).fill(content);
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
}

test('validates creation and renders journal content as text', async ({ page }) => {
  await page.goto('/');

  await composer(page).fill('   ');
  await expect(page.locator('#character-count')).toHaveText('3 / 1,000');
  await page.getByRole('button', { name: 'Save entry' }).click();
  await expect(page.locator('#composer-feedback')).toHaveText('Write something before saving your entry.');
  await expect(composer(page)).toHaveValue('   ');

  const plainText = '<img src=x onerror=alert(1)> A safe reflection';
  await createEntry(page, plainText);

  const recentEntries = page.locator('#recent-entries-list');
  await expect(recentEntries.locator('.entry-card')).toHaveCount(1);
  await expect(recentEntries.locator('.entry-card__content')).toHaveText(plainText);
  await expect(recentEntries.locator('img')).toHaveCount(0);
  await expect(composer(page)).toHaveValue('');
  await expect(page.locator('#character-count')).toHaveText('0 / 1,000');
});

test('shows a recent subset and supports inline edit save and cancel across views', async ({ page }) => {
  await page.goto('/');
  for (const entry of ['First reflection', 'Second reflection', 'Third reflection', 'Fourth reflection']) {
    await createEntry(page, entry);
  }

  await expect(page.locator('#recent-entries-list .entry-card')).toHaveCount(3);
  await expect(page.locator('#recent-entries-list .entry-card').first()).toContainText('Fourth reflection');

  await page.getByRole('button', { name: 'All Entries' }).click();
  await expect(page.getByRole('heading', { name: 'All Entries', level: 1 })).toBeFocused();
  await expect(page.locator('#all-entries-list .entry-card')).toHaveCount(4);

  const card = page.locator('#all-entries-list .entry-card').first();
  const originalTimestamp = await card.locator('time').getAttribute('datetime');
  const editButton = card.getByRole('button', { name: 'Edit' });
  await editButton.focus();
  await page.keyboard.press('Enter');

  const editField = card.getByLabel('Edit journal entry');
  await expect(editField).toBeFocused();
  await editField.fill('   ');
  await expect(card.locator('[data-edit-count]')).toHaveText('3 / 1,000');
  await card.getByRole('button', { name: 'Save changes' }).click();
  await expect(card.locator('.entry-edit__feedback')).toHaveText('Write something before saving your entry.');
  await expect(editField).toHaveValue('   ');

  await editField.fill('A change I chose not to keep');
  await card.getByRole('button', { name: 'Cancel' }).click();
  await expect(card).toContainText('Fourth reflection');
  await expect(card).not.toContainText('A change I chose not to keep');

  await card.getByRole('button', { name: 'Edit' }).click();
  await card.getByLabel('Edit journal entry').fill('Fourth reflection, thoughtfully revised');
  await card.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('#app-feedback')).toHaveText('Entry updated.');
  await expect(card).toContainText('Fourth reflection, thoughtfully revised');
  await expect(card.locator('time')).toHaveAttribute('datetime', originalTimestamp);

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('#recent-entries-list')).toContainText('Fourth reflection, thoughtfully revised');
});

test('requires confirmation before deleting one entry', async ({ page }) => {
  await page.goto('/');
  await createEntry(page, 'Keep this reflection');
  await createEntry(page, 'Delete this reflection');

  const recentEntries = page.locator('#recent-entries-list');
  const deleteCard = recentEntries.locator('.entry-card').filter({ hasText: 'Delete this reflection' });

  await deleteCard.getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('dialog', { name: 'Remove this journal entry?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(deleteCard).toBeVisible();

  await deleteCard.getByRole('button', { name: 'Delete' }).click();
  await dialog.getByRole('button', { name: 'Delete entry' }).click();
  await expect(page.locator('#app-feedback')).toHaveText('Entry deleted.');
  await expect(recentEntries).not.toContainText('Delete this reflection');
  await expect(recentEntries).toContainText('Keep this reflection');
  await expect(recentEntries.locator('.entry-card')).toHaveCount(1);
});

test('dismisses deletion from the backdrop without removing the entry', async ({ page }) => {
  await page.goto('/');
  await createEntry(page, 'Keep this after backdrop dismissal');

  const entryCard = page.locator('#recent-entries-list .entry-card');
  const deleteButton = entryCard.getByRole('button', { name: 'Delete' });
  const dialog = page.getByRole('dialog', { name: 'Remove this journal entry?' });

  await deleteButton.click();
  await expect(dialog).toBeVisible();

  const dialogBounds = await dialog.boundingBox();
  await page.mouse.click(
    dialogBounds.x + dialogBounds.width / 2,
    dialogBounds.y + dialogBounds.height / 2,
  );
  await expect(dialog).toBeVisible();

  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await expect(entryCard).toContainText('Keep this after backdrop dismissal');
  await expect(deleteButton).toBeFocused();
  await expect(page.locator('#app-feedback')).toHaveText('Deletion cancelled. The entry was not changed.');
});

test('keeps navigation and journal operations usable at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await createEntry(page, 'A mobile reflection');

  const menuButton = page.locator('.menu-toggle');
  await menuButton.focus();
  await page.keyboard.press('Enter');
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'All Entries' })).toBeVisible();

  await page.getByRole('button', { name: 'All Entries' }).click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#all-entries-list')).toContainText('A mobile reflection');

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
