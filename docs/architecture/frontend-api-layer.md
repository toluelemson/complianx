# Frontend API layer

The web app calls the Neuraldocx API through a shared Axios client and small, domain-owned adapter modules. UI components should call named adapter functions rather than construct endpoint URLs or HTTP requests themselves.

This is an internal integration guide, not a public API specification. The NestJS controllers and DTOs are the source of truth for HTTP routes and request validation; shared cross-application types live in `packages/contracts`.

## OpenAPI reference

When `SWAGGER_ENABLED=true`, the API serves Swagger UI at `/api/docs`, with machine-readable specifications at `/api/docs/openapi.json` and `/api/docs/openapi.yaml`. Swagger is enabled by default outside production and disabled by default in production; explicitly enable it only in a controlled environment.

Use the **Authorize** control to supply a JWT bearer token and, when required, the `X-Company-Id` workspace header. The server remains the authority for authentication and tenant/project authorization.

## Layout

| Responsibility | Location |
| --- | --- |
| Base URL, authentication header, active-company header, and global response handling | `apps/web/src/platform/api/client.ts` |
| AI-system, document, evidence, and package endpoints | `apps/web/src/domains/ai-systems/api.ts` |
| Assessment endpoints | `apps/web/src/domains/assessments/api.ts` |
| Regulatory framework endpoints | `apps/web/src/domains/regulatory-frameworks/api.ts` |
| Authentication and current-user endpoints | `apps/web/src/domains/auth/api.ts` |
| Organization, memberships, invitations, and roles | `apps/web/src/domains/organizations/api.ts` |
| Plan, usage, checkout, and customer portal | `apps/web/src/domains/billing/api.ts` |
| Contact form submission | `apps/web/src/domains/marketing/api.ts` |
| In-app notification endpoints | `apps/web/src/domains/notifications/api.ts` |

## Using an adapter

Pages, hooks, and components import a function from their domain API module. They own loading, error, and UI state; the adapter owns the endpoint and HTTP configuration.

```ts
import { getCurrentUser, updateCurrentUser } from '@/domains/auth/api';

const profileQuery = useQuery({
  queryKey: ['profile'],
  queryFn: getCurrentUser,
});

const updateMutation = useMutation({
  mutationFn: updateCurrentUser,
});
```

Add a new endpoint by creating a named function in the owning domain's `api.ts`, using the shared `api` client. Prefer input and result types from `@complianx/contracts`; create a narrowly scoped local type only when no shared contract is appropriate.

```ts
import api from '@/platform/api/client';

export async function archiveExample(id: string) {
  const { data } = await api.post(`/examples/${id}/archive`);
  return data;
}
```

Do not import `@/platform/api/client` into a page or component solely to call `get`, `post`, `put`, `patch`, or `delete`.

## Authentication and tenant context

`AuthContext` calls `setAuthToken` and `setCompanyId` on the shared client. Consequently, normal adapter calls automatically send:

- `Authorization: Bearer <token>` for authenticated users.
- `X-Company-Id` for the currently selected workspace.

The API must still derive actor identity and enforce company/project isolation server-side. A client header selects context; it is not authorization.

The client dispatches `auth:expired` for an authenticated `401` response and emits the existing paywall event for applicable responses. Domain adapters should let these shared behaviors run rather than recreate them.

## File downloads

Download functions remain in their owning domain adapter and request `responseType: 'blob'`. UI code can create an object URL and trigger the browser download, but must not build authenticated download URLs or manually repeat authorization headers.

Examples include `downloadDocument`, `downloadArtifact`, `downloadProjectDocuments`, and `downloadCompliancePackage` in `ai-systems/api.ts`.

## Tests

Test UI behavior by mocking the domain adapter function, not `fetch` or a hard-coded URL. Adapter tests or API-level tests should cover request method, path, payload, and response handling when an endpoint's transport behavior changes.

Before completing an API-layer change, run the relevant web tests and build. For endpoint or authorization changes, also add server-side controller/service tests that cover tenant and project isolation.
