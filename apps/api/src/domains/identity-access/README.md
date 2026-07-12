# Identity and access domain

Owns account registration, login, verification, password reset, profiles, and user roles. Existing `/auth` and `/users` routes and Prisma models remain unchanged.

- `application`: authentication and user orchestration
- `presentation`: controllers and validation DTOs
- `platform/auth`: Passport/JWT strategy and guard
- email remains a platform adapter
- invitations remain behind their existing application service until organizations migrate

Authentication and user consumers import this domain or `platform/auth` directly.
