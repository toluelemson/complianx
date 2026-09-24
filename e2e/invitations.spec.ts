import { expect, test, type Page } from '@playwright/test';

async function logIn(page: Page) {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('Mia invites a friend to help', async ({ page }) => {
  await logIn(page);
  await page.goto('/company');

  await expect(page.getByText('Invite a teammate')).toBeVisible();
  const email = `invite-${Date.now()}@example.invalid`;
  await page.getByPlaceholder('new.member@example.com').fill(email);
  await page.getByRole('button', { name: 'Invite' }).click();

  await expect(page.getByText(email)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Copy Link' }).last(),
  ).toBeVisible();
});
