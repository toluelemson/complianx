# AI systems domain

Owns the current project-backed AI-system workspace, creation, cloning, access checks, reviewer selection, and lifecycle entry points. The Prisma model remains named `Project`, and every `/projects` route remains unchanged.

- `application/projects`: AI-system orchestration and access enforcement
- `domain/access`: framework-neutral access roles and options
- `domain/lifecycle`: public lifecycle status types
- `presentation`: Nest controller and validation DTOs
- workflow transitions remain owned by review approval

Project consumers import the AI systems domain directly.
