# Compliance Workflow Verification

This note covers the production-readiness checks for compliance findings,
actions, audit events, and immutable package snapshots.

## Local database safety

Use a dedicated PostgreSQL database whose name ends in `_test`. The compliance
integration suite and populated migration bootstrap both reject other database
names so they are not accidentally pointed at development or production data.

Example:

```bash
export DATABASE_URL=postgresql://compliance_test@127.0.0.1:55439/neuraldocx_compliance_test
```

## Populated migration bootstrap

From `apps/api`, run:

```bash
pnpm exec bash test/compliance/migrate-populated.sh
```

The script initializes the original migration on an empty test database, inserts
legacy project/document rows, resolves the baseline migration, runs the remaining
migration history with `prisma migrate deploy`, and verifies that the legacy rows
survive.

## Compliance integration suite

From `apps/api`, run:

```bash
pnpm test:compliance
```

The suite exercises the high-risk workflow paths that should stay covered:
tenant isolation, owner validation, finding and action transitions, closure
evidence validation, audit rollback, evidence-expiry findings, immutable package
archives, package completeness, package version concurrency, applicability
snapshot preservation, and published-pack immutability.

Legacy package records created before archived ZIPs existed intentionally return
an unavailable response. The download endpoint must not synthesize a current ZIP
for an old snapshot, because that would make the historical package
non-reproducible.
