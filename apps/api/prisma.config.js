const { defineConfig } = require('prisma/config');

// Use process.env directly to avoid throwing when DATABASE_URL is not set
// during build-time (CI or container builds). Prisma CLI only needs the
// datasource URL at runtime for migrations; generating the client does not
// require an active DB connection.
module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: process.env.DATABASE_URL || undefined,
  },
});
