import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-08T12:00:00Z') });
  await page.goto('./');
  await page.clock.pauseAt(new Date('2026-10-08T12:01:00Z'));
});

async function save(page, text) {
  await page.locator('#journal-entry').fill(text);
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  // Advance the queued live-region announcement, without waiting on real time.
  await page.clock.runFor(20);
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
}

test('success is announced immediately and disappears after 3.5 seconds', async ({ page }) => {
  await save(page, 'A brief reflection');
  const feedback = page.locator('#app-feedback');
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toHaveAttribute('aria-live', 'polite');
  await page.clock.runFor(3400);
  await expect(feedback).toHaveText('Entry saved.');
  await page.clock.runFor(100);
  await expect(feedback).toBeEmpty();
});

test('a newer success receives its own full dismissal interval', async ({ page }) => {
  await save(page, 'First reflection');
  await page.clock.runFor(2000);
  await save(page, 'Second reflection');
  await page.clock.runFor(2000);
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
  await page.clock.runFor(1400);
  await expect(page.locator('#app-feedback')).toHaveText('Entry saved.');
  await page.clock.runFor(100);
  await expect(page.locator('#app-feedback')).toBeEmpty();
});

test('navigation dismisses visible and queued success without later reappearance', async ({ page }) => {
  await save(page, 'Saved before navigating');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('#app-feedback')).toBeEmpty();
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await page.clock.runFor(5000);
  await expect(page.locator('#app-feedback')).toBeEmpty();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.locator('#journal-entry').fill('Saved just before navigating');
  // Both actions in one task exercise navigation before the announcement frame runs.
  await page.evaluate(() => {
    document.querySelector('#save-entry').click();
    document.querySelector('[data-view="all-entries"]').click();
  });
  await page.clock.runFor(20);
  await expect(page.locator('#app-feedback')).toBeEmpty();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.clock.runFor(5000);
  await expect(page.locator('#app-feedback')).toBeEmpty();
  await expect(page.locator('#recent-entries-list .entry-card')).toHaveCount(2);
});

test('validation and storage errors remain visible after success timers and navigation', async ({ page }) => {
  await save(page, 'A saved reflection');
  await page.locator('#journal-entry').fill('   ');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await page.clock.runFor(5000);
  await expect(page.locator('#composer-feedback')).toHaveText('Write something before saving your entry.');
  await expect(page.locator('#journal-entry')).toHaveValue('   ');

  await save(page, 'Another saved reflection');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  });
  await page.locator('#recent-entries-list .entry-card').first().getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.clock.runFor(20);
  await expect(page.locator('#app-feedback')).toContainText('couldn’t delete this entry');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.clock.runFor(5000);
  await expect(page.locator('#app-feedback')).toContainText('couldn’t delete this entry');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('#recent-entries-list .entry-card')).toHaveCount(2);
  await page.locator('#journal-entry').fill('Keep this unsaved writing');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('#save-entry')).toBeEnabled();
  await page.clock.runFor(5000);
  await expect(page.locator('#composer-feedback')).toContainText('couldn’t save this entry');
  await expect(page.locator('#journal-entry')).toHaveValue('Keep this unsaved writing');
});

test('Appearance explanation uses approved wording and wraps within a narrow mobile card', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const description = page.locator('#appearance-description');
  await expect(description).toHaveText("Choose Light or Dark, or let System follow your device's appearance.");
  await expect(description).toBeVisible();
  expect(await description.evaluate((el) => {
    const bounds = el.getBoundingClientRect();
    return el.scrollWidth <= el.clientWidth && bounds.left >= 0 && bounds.right <= innerWidth;
  })).toBe(true);
  await expect(page.getByRole('group', { name: 'Appearance', exact: true }))
    .toHaveAttribute('aria-describedby', 'appearance-description');
});
