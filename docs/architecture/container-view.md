# Container view

| Container | Responsibility | Current state |
| --- | --- | --- |
| `apps/web` | Browser UI, routing, client-side workflows | Production application |
| `apps/api` | Modular monolith, business workflows, persistence orchestration | Production application |
| PostgreSQL | Transactional persistence | External runtime dependency |
| `apps/worker` | Future asynchronous workloads | Documentation-only placeholder |

The API remains one deployable process. No queues or microservices were introduced.
