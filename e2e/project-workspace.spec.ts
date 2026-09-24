import { expect, test, type Page } from '@playwright/test';

async function logIn(page: Page) {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('Mia adds a few helpful details about her AI helper', async ({ page }) => {
  await logIn(page);
  await page.goto('/projects/e2e-project/ai-system-profile');

  await expect(
    page.getByRole('heading', { name: 'AI system profile' }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Intended use' })
    .fill('Answers routine customer-support questions with human escalation.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toHaveText('Profile saved.');
});

test('Mia adds a file and leaves a note for her team', async ({
  page,
}) => {
  await logIn(page);
  await page.goto('/projects/e2e-project/evidence');

  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toHaveCount(1);
  await fileInput.setInputFiles({
    name: 'evaluation-summary.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('E2E evaluation evidence.'),
  });
  await page.getByRole('button', { name: 'Upload evidence' }).click();
  await expect(page.getByText('evaluation-summary.txt').last()).toBeVisible();

  await page.goto('/projects/e2e-project/messages');
  await page
    .getByPlaceholder('Add a project message…')
    .fill('E2E: evidence is ready for review.');
  await page.getByRole('button', { name: 'Post message' }).click();
  await expect(
    page.getByText('E2E: evidence is ready for review.').last(),
  ).toBeVisible();
});
