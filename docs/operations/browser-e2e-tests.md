# Browser end-to-end tests

## The simple story these tests tell

Imagine Mia has a small AI helper at work. The tests walk with her, one step
at a time:

1. Mia signs in.
2. She adds her AI helper.
3. She answers a few simple questions about what it does.
4. She sees the jobs that matter most.
5. She adds a file that helps prove the work was done.
6. She leaves a note and writes down anything that still needs fixing.
7. She invites a friend to help.
8. Before she asks for a review, the app tells her what is still missing.

The tests do not decide whether Mia is legally compliant. They only check that
the app helps people collect information, work together, and ask a human to
review the final result.

Playwright starts an isolated API on port `3334` and web application on port
`4173`. It requires a dedicated PostgreSQL database configured through
`E2E_DATABASE_URL`; the command refuses any database name that does not include
`_test`.

Run the suite with:

```bash
E2E_DATABASE_URL='postgresql://user:password@127.0.0.1:5432/neuraldocx_test' \
  pnpm test:e2e:ui
```

The setup applies migrations, seeds EU AI Act content, and creates only the
test fixture account (`e2e-user@example.invalid`). Do not point this command at
development or production data.

The test API disables SMTP and billing integrations. Invitation tests create
records in the test database but never send email to an external recipient.
Uploaded evidence is stored only in `/tmp/neuraldocx-e2e-storage`.
