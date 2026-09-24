import { expect, test, type Page } from '@playwright/test';

async function logIn(page: Page) {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('Mia answers simple questions about her AI helper', async ({
  page,
}) => {
  await logIn(page);
  await page.goto('/projects/e2e-project/classification');

  await page.getByLabel('Is this actually an AI system?').setChecked(true);
  await page
    .getByLabel('We build or place the AI system on the market')
    .setChecked(true);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'See what applies' }).click();

  await expect(
    page.getByRole('heading', { name: 'Here is what likely applies' }),
  ).toBeVisible();
  await expect(page.getByText('Human review required')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Continue compliance setup' }),
  ).toHaveAttribute('href', '/projects/e2e-project/requirements');
});
