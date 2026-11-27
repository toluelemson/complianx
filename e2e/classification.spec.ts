import { expect, test, type Page } from '@playwright/test';

async function logIn(page: Page) {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('Mia answers simple questions about her AI helper', async ({ page }) => {
  await logIn(page);
  await page.goto('/projects/e2e-project/classification');

  await page
    .getByRole('group', { name: 'Is this actually an AI system?' })
    .getByRole('button', { name: 'Yes' })
    .click();
  await page
    .getByLabel('We build or place the AI system on the market')
    .check();
  await page.getByRole('button', { name: 'Continue' }).click();

  const classify = page.getByRole('button', { name: 'See what applies' });
  await expect(classify).toBeDisabled();
  await page
    .getByRole('group', {
      name: /Is the AI a safety component of, or itself a product covered by/,
    })
    .getByRole('button', { name: 'No' })
    .click();
  await page
    .getByRole('group', {
      name: /For an Annex III use, is the system only performing a narrow/,
    })
    .getByRole('button', { name: 'No' })
    .click();
  await page
    .getByRole('group', {
      name: /Does the system provide, modify, or rely on a general-purpose AI model/,
    })
    .getByRole('button', { name: 'No' })
    .click();
  await expect(classify).toBeEnabled();
  await classify.click();

  await expect(
    page.getByRole('heading', { name: 'Here is what likely applies' }),
  ).toBeVisible();
  await expect(page.getByText('Human review required')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Continue guided setup' }),
  ).toHaveAttribute('href', '/projects/e2e-project/requirements');
});
