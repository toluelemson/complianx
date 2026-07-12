# Organizations domain

Owns companies, memberships, active company context, invitations, and organization-level roles. Existing `/company` and `/invitations` routes and Prisma models remain unchanged.

- `application/companies`: company membership lifecycle
- `application/invitations`: invitation lifecycle
- `application/membership`: active organization context resolution
- `domain/membership`: framework-neutral actor, membership, and role types
- `presentation`: Nest controllers

Company and invitation consumers import the organizations domain directly.
