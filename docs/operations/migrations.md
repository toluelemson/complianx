# Production migration process

Neuraldocx keeps the complete Prisma migration history. Production and CI use:

```bash
pnpm --filter api exec prisma migrate deploy
```

Before release:

1. Run `pnpm db:validate` and `pnpm db:generate`.
2. Test the migration against a populated PostgreSQL database.
3. Review indexes, foreign keys, enum changes, and nullable-to-required changes.
4. Take a database backup and confirm rollback or forward-fix options.

Do not use `prisma migrate dev`, `prisma migrate reset`, or migration edits against production. Schema corrections must be new migrations. Data backfills should be explicit, idempotent, and safe for existing rows.
