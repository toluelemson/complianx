import { expect, test } from '@playwright/test';

test('Mia adds her first AI helper', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('button', { name: 'Add an AI system' }).click();
  await page.getByLabel('System name').fill('E2E customer-support assistant');
  await page
    .getByRole('button', { name: 'Continue to EU AI Act questions' })
    .click();

  await expect(page).toHaveURL(/\/projects\/[^/]+\/classification$/);
  await expect(
    page.getByRole('heading', { name: 'Check what applies' }),
  ).toBeVisible();
});
