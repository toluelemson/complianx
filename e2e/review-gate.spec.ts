import { expect, test, type Page } from '@playwright/test';

async function logIn(page: Page) {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('Mia sees what needs fixing before asking for a review', async ({
  page,
}) => {
  await logIn(page);
  await page.goto('/projects/e2e-project/review-approval');
  await expect(
    page.getByRole('heading', { name: 'Review and approval flow' }),
  ).toBeVisible();
  await expect(page.getByText('Resolve the release gate')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send for review' }),
  ).toBeDisabled();
});

test('legacy bookmarks preserve project context and documentation remains editable', async ({
  page,
}) => {
  await page.goto('/ai-systems/e2e-project?companyId=e2e-company#workflow');
  await expect(page).toHaveURL(
    /\/projects\/e2e-project\?companyId=e2e-company#workflow$/,
  );
  await expect(
    page.getByRole('heading', { name: 'Your 5-stage plan' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Your 5-stage plan' }),
  ).toBeVisible();
  await page.goto('/projects/e2e-project/documents');
  await expect(page).toHaveURL(/\/projects\/e2e-project\/compliance-package/);
  await page.getByRole('link', { name: 'Prepare technical documents' }).click();
  await expect(page).toHaveURL(
    /compliance-workspace\?section=review_generate#documents/,
  );
  await expect(
    page.getByRole('heading', { name: 'Review and approval flow' }),
  ).toBeVisible();
});
