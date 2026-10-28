# Web agent instructions

The web app uses React, TypeScript, Vite, React Router, and React Query.

- Prefer route-level pages with focused responsibilities and reusable components/hooks.
- Include the active company in project API query keys and preserve company context when invalidating queries.
- Use existing design tokens and shared components; do not hard-code a color when a token exists.
- Forms need typed values, validation, clear save/saving/saved/error states, and safe retry behavior.
- Every project workflow needs a clear title, project context, next action, loading state, empty state, error/retry state, success feedback, accessible labels, keyboard navigation, visible focus, and responsive layout.
- Permission-aware controls improve UX but never replace API authorization.
- Avoid monolithic pages, duplicated API calls, unsafe `any`, color-only status communication, and production mock data.
- Add/update Vitest tests for changed behavior and critical user journeys.

Use `pnpm --filter web test`, `pnpm --filter web lint`, and `pnpm --filter web build` before handoff.
