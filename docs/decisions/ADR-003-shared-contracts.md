# ADR-003: Shared contracts

Status: Accepted

`@complianx/contracts` contains stable request/response shapes and enums already useful to more than one app. It must not export Prisma types, backend entities, or framework decorators. Contracts are added incrementally rather than mirroring every internal type.
