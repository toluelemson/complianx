# Threat model

Protect JWTs, organization boundaries, uploaded evidence, generated reports, payment events, and provider credentials. Primary risks include broken tenant authorization, insecure object access, malicious uploads, prompt injection through documents, forged Stripe webhooks, leaked secrets, and excessive report data exposure.

Controls currently relied on include authenticated routes, company context checks, server-side validation, Stripe signature verification, and environment-managed secrets. Follow-up security work should add automated cross-tenant authorization tests, upload scanning/limits, provider egress controls, audit-event coverage, and documented retention policies.
