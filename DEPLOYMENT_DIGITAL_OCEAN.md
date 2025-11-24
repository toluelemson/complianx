## Deploying to DigitalOcean App Platform

This project runs as two apps (backend Nest.js API and frontend Vite/React SPA). The App Platform can host them side-by-side:

### Quick Deploy Checklist (DigitalOcean App Platform)

1. **Prep repo**
   - Keep current root `Dockerfile` (builds backend from `/backend`, outputs `dist/src/main`).
   - Frontend stays under `/frontend` (deploy separately if needed).

2. **Create App**
   - In DigitalOcean, “Create App” → pick your GitHub repo → region `fra`.
   - Choose the Dockerfile service (source dir `/`, Dockerfile `/Dockerfile`).

3. **Add environment variables (backend service)**
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/db
   JWT_SECRET=...
   LLM_BASE_URL=...
   LLM_API_KEY=...
   LLM_MODEL=...
   FRONTEND_URL=https://<frontend-app>.ondigitalocean.app
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_ENTERPRISE=price_...
   ```
   - For the frontend (static site) set `VITE_API_URL=https://<backend-app>.ondigitalocean.app/api`.

4. **Deploy**
   - App Platform runs the Docker build (installs deps, `prisma generate`, `npm run build`, `node dist/src/main`).
   - Health check auto-routes traffic once ready.

5. **Stripe webhook**
   - At https://dashboard.stripe.com → Developers → Webhooks → add endpoint `https://<backend-app>.ondigitalocean.app/billing/webhook`.
   - Subscribe to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`.
   - Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.

6. **Database migrations**
   - Locally: `cd backend && DATABASE_URL=... npm run prisma:migrate`.
   - In staging/prod, run `prisma migrate deploy` against your managed Postgres.

7. **Spec (copy/paste into App Platform or use `doctl apps create --spec`)**

```yaml
name: complianx
region: fra
build:
  buildpacks:
    - buildpack: dockerfile
      stack: ubuntu-22
alerts:
  rules:
    - rule: DEPLOYMENT_FAILED
    - rule: DOMAIN_FAILED
ingress:
  rules:
    - component:
        name: complianx
      match:
        authority:
          exact: ""
        path:
          prefix: /
services:
  - name: complianx
    github:
      repo: toluelemson/complianx
      branch: main
      deploy_on_push: true
    dockerfile_path: /Dockerfile
    source_dir: /
    http_port: 8080
    instance_count: 2
    instance_size_slug: apps-s-1vcpu-1gb
```

That’s it—deploy, point Stripe to the new webhook URL, and your DigitalOcean app is live.***
