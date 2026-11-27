import { expect, test } from '@playwright/test';

test('another company cannot access an AI system by direct ID', async ({
  request,
}) => {
  const login = await request.post('/api/auth/login', {
    data: {
      email: 'e2e-other-user@example.invalid',
      password: 'e2e-test-password',
    },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = (await login.json()) as { token: string };
  const response = await request.get(
    '/api/ai-systems/e2e-project/traceability-model',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Company-Id': 'e2e-other-company',
      },
    },
  );

  expect(response.status()).toBe(403);
});
