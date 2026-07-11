# Local development

Install Node.js 20+, pnpm 10+, and PostgreSQL. Run `pnpm install`, configure `apps/api/.env`, generate Prisma with `pnpm --filter api prisma:generate`, then start apps with `pnpm dev` or the app-specific root scripts. The web dev server proxies `/api` to `http://localhost:3000` unless `VITE_API_URL` overrides it.
