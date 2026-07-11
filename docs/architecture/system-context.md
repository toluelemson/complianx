# System context

Complianx is a web application used by organization members, reviewers, and approvers to document AI systems and produce compliance evidence and reports. The React web app calls the NestJS API. The API persists data in PostgreSQL through Prisma and integrates with external LLM, SMTP, Stripe, and browser-based PDF tooling. These integrations are platform adapters, not business domains.
