# Deploying Complianx to DigitalOcean App Platform

Complianx deploys as an API service and a web static site. The architecture refactor changes source paths only; routes and runtime behavior are unchanged.

## API service

- Source directory: `/` (the build needs the workspace lockfile and shared packages)
- Dockerfile: `/apps/api/Dockerfile`
- HTTP port: `8080`
- Health/runtime command is provided by the Dockerfile.

Configure at least `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, and `CORS_ORIGINS`, plus the LLM, SMTP, and Stripe variables required by enabled capabilities. Run `prisma migrate deploy` from `apps/api` before serving a release that contains migrations.

## Web static site

- Source directory: `/` (the build needs the workspace lockfile and shared packages)
- Dockerfile: `/apps/web/Dockerfile`
- HTTP port: `8080`
- Build argument: `VITE_API_URL=https://<api-host>/api`

## Stripe

Keep the existing webhook route: `https://<api-host>/billing/webhook`. Configure `STRIPE_WEBHOOK_SECRET` with the endpoint signing secret and retain the currently subscribed event types.

## Required dashboard change

Use the repository root as the build context and set each component's Dockerfile path to `/apps/api/Dockerfile` or `/apps/web/Dockerfile`. Existing components that point to `/backend` or `/frontend` must be updated. No public URL or API route change is required.
