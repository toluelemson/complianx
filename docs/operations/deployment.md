# Deployment

The active deployment target is Hetzner managed through Coolify. The API and web applications use Coolify's Docker Image build pack with an exact release tag. GitHub runs CI for pull requests and updates to `main`. A production release uses a prebuilt image staged on the deployment host.

## Prebuilt production images

Build from the reviewed release commit on a workstation or CI runner. Set the image names from the two Coolify resources and use the existing SSH destination for `NEURALDOCX_DEPLOY_HOST`. The frontend build gets its public API origin through `VITE_API_URL`. Keep application secrets in Coolify's runtime environment settings.

The example builds both applications for the current Linux amd64 host. Build and stage the services included in the release.

```bash
release="$(git rev-parse HEAD)"
api_image="${NEURALDOCX_API_IMAGE_NAME}:$release"
web_image="${NEURALDOCX_WEB_IMAGE_NAME}:$release"

git archive "$release" |
  docker buildx build --platform linux/amd64 --load \
    -f apps/api/Dockerfile -t "$api_image" -

git archive "$release" |
  docker buildx build --platform linux/amd64 --load \
    --build-arg "VITE_API_URL=$NEURALDOCX_API_ORIGIN" \
    -f apps/web/Dockerfile -t "$web_image" -

docker image save "$api_image" "$web_image" |
  ssh "$NEURALDOCX_DEPLOY_HOST" docker image load
```

Apply any required database migrations using the release image and the production database environment. Select the staged tag in Coolify and deploy one application at a time. The API readiness check uses `/api/health` on port 3000. The frontend checks `/` on port 8080. Verify the public endpoints and confirm that the worker and API can reach each other. Keep the previous image available until the release is verified so Coolify can roll back to its tag.

The host uses a persistent 4 GiB swap file to absorb short runtime memory spikes. Check it with `swapon --show` after a host restart. Build release images off-host so build memory and service memory have separate capacity.

## Aiki report-generation worker

The API can run without Aiki. Leave `AIKI_WORKER_URL` and `AIKI_SERVICE_TOKEN` unset to disable background document generation. If either is missing, requests to queue a document generation job return HTTP 503 and the worker callback rejects requests.

To enable generation, build the image from `apps/worker/Dockerfile` off-host and deploy it as a private service on the same network as the API. Keep port 9850 private. Give the worker a dedicated PostgreSQL database for Aiki workflow state, then run its migration before starting the service:

```bash
DATABASE_PROVIDER=pg DATABASE_URL="$AIKI_DATABASE_URL" pnpm --filter worker aiki:migrate
```

Generate a secret from 32 cryptographically random bytes and set the same `AIKI_SERVICE_TOKEN` in both services' runtime secret settings. Set `AIKI_WORKER_URL=http://<private-worker-host>:9850` on the API. Set `API_INTERNAL_URL=http://<private-api-host>:3000` and `AIKI_DATABASE_URL` on the worker. The worker uses the token to authenticate to the API callback at `/api/internal/aiki/report-generation`.

## Production environment

The API validates production configuration before opening its HTTP port. Set real values in Coolify; never commit them or copy them into build arguments.

```text
NODE_ENV=production
DATABASE_URL=postgresql://<user>:<password>@<private-host>:5432/<database>
JWT_SECRET=<random value with at least 32 characters>

FRONTEND_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com
STORAGE_ROOT=/data/neuraldocx

LLM_BASE_URL=https://<provider-api>
LLM_API_KEY=<provider secret>
LLM_MODEL=<reviewed production model>

SMTP_HOST=<smtp host>
SMTP_PORT=587
SMTP_USER=<smtp user>
SMTP_PASS=<smtp secret>
EMAIL_FROM=Neuraldocx <no-reply@example.com>

MONETIZATION_ENABLED=true
STRIPE_SECRET_KEY=<live secret key>
STRIPE_WEBHOOK_SECRET=<endpoint signing secret>
STRIPE_PRICE_PRO=<live price id>
STRIPE_PRICE_ENTERPRISE=<live price id>
```

Use a dedicated database role and password for the API. Keep PostgreSQL on the private deployment network and require encrypted connections when traffic can leave that network. Back up the database separately from application containers.

`STORAGE_ROOT` must be an absolute path backed by a persistent Coolify volume and writable only by the API service account. Package archives and evidence files are lost if this path uses ephemeral container storage. Back up the volume and test restoration with the matching database backup.

The application uses bearer JWTs and does not issue authentication cookies, so secure-cookie settings do not apply. Generate `JWT_SECRET` from a cryptographically secure source. Rotating it invalidates active sessions; schedule rotation and notify users accordingly.

`FRONTEND_URL` and every `CORS_ORIGINS` entry must be an exact HTTPS origin without a path. Origins are comma-separated when more than one frontend is required. The API no longer enables allow-all CORS when the list is empty and does not infer `www` aliases.

Production requires complete SMTP settings. This prevents verification, invitation, and reset links from falling back to application logs. Restrict access to API logs because operational metadata can still contain personal data.

If monetization is intentionally disabled, set `MONETIZATION_ENABLED=false`; only then may Stripe configuration be omitted. Otherwise all Stripe keys and live price identifiers are required. Configure the webhook endpoint at `/billing/webhook`, retain Stripe signature verification, and rotate its signing secret when the endpoint is recreated.

## HTTP limits and proxy configuration

The API applies a global per-IP request limit and a tighter limit of 10 requests per minute to authentication endpoints. Defaults are:

```text
API_BODY_LIMIT_BYTES=1048576
UPLOAD_MAX_BYTES=26214400
RATE_LIMIT_TTL_MS=60000
RATE_LIMIT_REQUESTS=300
TRUST_PROXY_HOPS=1
```

`API_BODY_LIMIT_BYTES` limits JSON, URL-encoded, and Stripe webhook bodies. `UPLOAD_MAX_BYTES` separately limits evidence multipart files. Keep the API private behind the Coolify proxy and set `TRUST_PROXY_HOPS` to the exact number of trusted proxy hops; an incorrect value can cause clients to share a rate-limit identity or allow spoofed forwarding headers.

The built-in limiter is per API process. For more than one API replica, configure a shared limiter at the Coolify ingress or replace the throttler storage with a shared store before scaling. Apply an ingress connection/request limit as an additional control and exclude only infrastructure health checks if necessary.

The LLM endpoint must use HTTPS, and production requires its URL, credential, and selected model. Scope the provider credential to the smallest available permissions and budget, and rotate it through Coolify. Do not send credentials or sensitive evidence contents to logs.

## Evidence malware scanning

Production API instances require a reachable ClamAV daemon. In Coolify, add a ClamAV service (for example, the maintained `clamav/clamav` container), attach it only to the API's private network, persist its virus-definition directory, and do not publish port 3310 to the internet. Configure the API with:

```text
NODE_ENV=production
FILE_SCANNER_PROVIDER=clamav
CLAMAV_HOST=<Coolify private service hostname>
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=10000
```

Allow the ClamAV health check and initial signature download to complete before starting the API. The API fails during startup if production selects `noop`, omits the provider, or omits the ClamAV host. If ClamAV is unreachable, times out, or returns an invalid response during an upload, the API fails the upload with HTTP 503 and does not store the file. A positive malware result rejects the upload with HTTP 400.

Set `FILE_SCANNER_PROVIDER=noop` only for development and test environments. The development scanner still rejects obvious executable headers, but it is not malware protection.

## Database migrations

Run migrations as part of the API release before accepting traffic:

```bash
pnpm --filter api exec prisma migrate deploy
pnpm --filter api seed:eu-ai-act
```

Run the idempotent EU AI Act seed after migrations so onboarding has a published regulatory pack. The seed leaves an existing published or deprecated version immutable. Use `prisma migrate dev` only for local development. Never reset or edit applied migrations in production. Take a database backup before releases that include schema changes and verify the migration and seed status in the deployment logs.

`DEPLOYMENT_DIGITAL_OCEAN.md` is retained as historical reference; it is not the active deployment procedure.
