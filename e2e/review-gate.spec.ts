import { expect, test, type Page } from '@playwright/test';

async function logIn(page: Page) {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('Mia sees what needs fixing before asking for a review', async ({
  page,
}) => {
  await logIn(page);
  await page.goto('/projects/e2e-project/compliance-workspace');

  await page.getByRole('button', { name: /Review & Generate/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Review and approval flow' }),
  ).toBeVisible();
  await expect(page.getByText('Resolve the release gate')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send for review' }),
  ).toBeDisabled();
});
