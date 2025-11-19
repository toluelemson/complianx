## Deploying to DigitalOcean App Platform

This project runs as two apps (backend Nest.js API and frontend Vite/React SPA). The App Platform can host them side-by-side:

### 1. Infrastructure Overview

- **Backend**: Node/Nest application running on `backend`.
- **Frontend**: Static Vite build served by App Platform as a static site.
- **Database**: PostgreSQL (managed database recommended).
- **Stripe webhook**: `/billing/webhook` must be reachable from Stripe (HTTPS). App Platform automatically provides TLS.

### 2. Environment Variables

Set the following secrets for the backend service:

```
DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<database>
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

For the frontend app:

```
VITE_API_URL=https://<backend-app>.ondigitalocean.app
```

### 3. Backend App Configuration

1. **Build command**:  
   ```
   cd backend
   npm install
   npm run build
   ```
2. **Run command**:  
   `npm run start:prod` (ensure `NODE_ENV=production` is set in DO App)
3. **Environment**: Set `PORT` (App Platform provides one), `DATABASE_URL`, and other keys above.
4. **HTTP path**: expose `/` for API requests.
5. **Persistent storage**: not required unless you need file uploads; use object storage or S3-compatible bucket instead.

### 4. Frontend App Configuration

1. **Root directory**: `frontend`
2. **Build command**:  
   `npm install && npm run build`
3. **Publish directory**: `frontend/dist`
4. **Environment**: add `VITE_API_URL` pointing at the backend app URL.
5. **Redirects**: If you want SPA routing to work, add a rewrite rule that sends `/*` to `/index.html`.

### 5. Database Migration

Run migrations during deployment or bootstrap:

```
cd backend
DATABASE_URL=... npm run prisma:migrate
```

Or include `prisma migrate deploy` in a release command so the production database stays in sync.

### 6. Stripe Webhook Setup

1. In the Stripe Dashboard, create a webhook endpoint pointing to `https://<backend-app>.ondigitalocean.app/billing/webhook`.
2. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 7. App Platform spec (complianx)

If you prefer to manage the whole stack with a single spec file (used by `doctl apps create --spec` or the App Platform UI), here is a working configuration that builds and runs the backend from the correct directory and includes the alert/ingress settings you asked for:

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

Make sure the environment variables listed earlier are set in the App Platform dashboard, and point your Stripe webhook at `https://<backend-app>.ondigitalocean.app/billing/webhook`. With this spec you can deploy via `doctl apps create --spec` or paste the YAML into the App Platform UI. This Dockerfile builds the backend from `backend/` and exposes port 8080, so the App Platform service can directly use the image without extra build/run scripts.
