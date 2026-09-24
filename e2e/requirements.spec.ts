import { expect, test, type Page } from '@playwright/test';

async function logIn(page: Page) {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('Mia marks the most important job to do first', async ({ page }) => {
  await logIn(page);
  await page.goto('/projects/e2e-project/requirements');

  const requirement = page
    .locator('article')
    .filter({
      has: page.getByRole('heading', { name: 'E2E requirement control' }),
    });
  await expect(requirement).toHaveCount(1);
  const priority = requirement.getByRole('combobox');
  await expect(priority).toHaveValue('MEDIUM');
  await priority.selectOption('HIGH');
  await expect(priority).toHaveValue('HIGH');
});
