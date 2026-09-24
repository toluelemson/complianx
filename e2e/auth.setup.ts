import { expect, test } from '@playwright/test';

test('Mia signs in to her compliance workspace', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('e2e-user@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('e2e-test-password');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().storageState({ path: 'test-results/.auth/e2e-user.json' });
});
