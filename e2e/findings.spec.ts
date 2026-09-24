import { expect, test, type Page } from '@playwright/test';

async function logIn(page: Page) {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('Mia writes down a problem that needs fixing', async ({ page }) => {
  await logIn(page);
  await page.goto('/projects/e2e-project/findings');

  const finding = 'E2E: document a human-oversight escalation path.';
  await page.getByPlaceholder('Describe the gap or review issue').fill(finding);
  await page.getByRole('button', { name: 'Add finding' }).click();

  await expect(page.getByText(finding).last()).toBeVisible();
  await expect(page.getByText('MANUAL REVIEW').last()).toBeVisible();
});
