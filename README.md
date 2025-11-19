## AI Compliance DocGen

Monorepo that hosts a NestJS backend (`/backend`) and a Vite/React frontend (`/frontend`). The backend exposes billing, Stripe, Prisma, and APIs for projects/review workflows; the frontend provides an AppShell, dashboard, billing modal, and profile/settings pages.

For local development:

- `cd backend && npm install && npm run start:dev`
- `cd frontend && npm install && npm run dev`
- Use `stripe listen --forward-to http://localhost:3000/billing/webhook` and update `.env` with the signing secret.

Deployment guidance lives in `DEPLOYMENT_DIGITAL_OCEAN.md`; follow the steps there for DigitalOcean App Platform (two services, env vars, webhook, migrations).

See each subdirectory’s README for more details:

- `backend/README.md`
- `frontend/README.md`
