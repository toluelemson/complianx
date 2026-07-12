# Dependency rules

1. Shared code depends on neither domains nor platform implementations.
2. Presentation calls application code; application depends on domain code.
3. Infrastructure implements domain or application ports.
4. Domain code does not import Prisma, Nest controllers, Axios, Stripe, LLM SDKs, or Puppeteer.
5. Domains never import another domain's infrastructure internals.
6. Cross-domain behavior uses public application services, contracts, or events.
7. Frontend domains expose public entry points and do not import one another's internals.
8. Platform folders contain technical integration code only.

Legacy compatibility re-exports have been removed; consumers use domain public modules or platform adapters directly.
