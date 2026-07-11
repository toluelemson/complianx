# Assessments domain

Owns compliance sections, suggestion feedback, and trust analysis. Existing API routes and Prisma models are unchanged.

- `application`: assessment orchestration services
- `presentation`: Nest controllers and transport DTOs
- `domain`: reserved for framework-neutral assessment rules as they are extracted
- `infrastructure`: reserved for persistence adapters when repository ports are justified

Legacy `src/sections`, `src/suggestions`, and `src/trust` paths are compatibility re-exports during incremental migration.
