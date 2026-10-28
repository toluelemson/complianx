# Tenant authorization matrix

This inventory records automated cross-tenant coverage as of 2026-09-13. It distinguishes tested behavior from authorization that exists in code but has no cross-tenant automated test.

| Marker | Meaning |
| --- | --- |
| tested | An automated test attempts access from another company. |
| indirect | The operation is protected through a tested parent-resource authorization check, but the exact route is not tested. |
| missing | The operation exists without an automated cross-tenant test. |
| n/a | The resource does not expose that operation. |

| Tenant-owned resource | Read | Create | Update | Delete | Download/export | Review/approve | Automated evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Project / AI system | tested | tested | tested | n/a | n/a | tested | `test/app.e2e-spec.ts`; `projects.service.spec.ts` |
| Section | tested | indirect | tested | n/a | n/a | tested | `test/app.e2e-spec.ts` |
| Section comment | indirect | indirect | missing | n/a | n/a | n/a | Parent project checks only |
| Section autosave | tested | tested | tested | tested | n/a | n/a | `test/app.e2e-spec.ts` |
| Assessment and answers | tested | indirect | tested | n/a | n/a | tested | `test/app.e2e-spec.ts`; `assessments.service.spec.ts` |
| Classification result | tested | indirect | n/a | n/a | n/a | tested | `test/app.e2e-spec.ts`; `assessments.service.spec.ts` |
| Regulatory requirement definition | n/a | n/a | n/a | n/a | n/a | n/a | Shared published regulatory data, not tenant-owned |
| AI-system obligation / applied requirement | tested | indirect | tested | n/a | n/a | tested | `test/app.e2e-spec.ts`; `workflow.integration-spec.ts` |
| Compliance action / control implementation | indirect | tested | tested | n/a | n/a | tested | `workflow.integration-spec.ts`; parent obligation authorization |
| Finding / compliance gap | tested | tested | tested | n/a | n/a | tested | `workflow.integration-spec.ts`; `assessments.service.spec.ts` |
| Evidence artifact and file | tested | indirect | tested | tested | tested | tested | `test/app.e2e-spec.ts` |
| Obligation-evidence link | tested | tested | n/a | tested | n/a | n/a | `test/app.e2e-spec.ts`; `workflow.integration-spec.ts` |
| Generated document | tested | indirect | n/a | n/a | tested | indirect | `test/app.e2e-spec.ts`; parent project checks |
| Project review / approval | tested | n/a | tested | n/a | n/a | tested | `test/app.e2e-spec.ts`; workflow unit specs |
| Readiness report | tested | indirect | n/a | n/a | missing | n/a | `test/app.e2e-spec.ts` list route; parent project checks |
| Compliance package | tested | tested | n/a | n/a | tested | n/a | `test/app.e2e-spec.ts`; `workflow.integration-spec.ts` |
| Reminder | tested | indirect | tested | n/a | n/a | n/a | `test/app.e2e-spec.ts` |
| Audit record | tested | n/a | n/a | n/a | n/a | n/a | `test/app.e2e-spec.ts` |
| Organization membership/profile | tested | indirect | missing | missing | n/a | n/a | `test/app.e2e-spec.ts`; `company-context.service.spec.ts` |
| Notification | tested | n/a | tested | n/a | n/a | n/a | `notifications.service.spec.ts` proves user-scoped list and read operations |
| Trust metric and sample | missing | missing | n/a | missing | n/a | n/a | No cross-tenant automated test |
| Suggestion feedback | tested | tested | n/a | n/a | n/a | n/a | `test/app.e2e-spec.ts` |
| Invitation | missing | missing | n/a | n/a | n/a | n/a | Token and company scoped; no cross-tenant automated test |
| Section template | missing | missing | missing | missing | n/a | n/a | Company templates lack a cross-tenant automated test |

The E2E suite exercises direct IDs belonging to company A while authenticated as an administrator of company B. It covers project reads and updates; assessment reads and answer updates; section reads, updates, and autosave operations; obligation reads, traceability, updates, and evidence links; artifact reads, reviews, deletion, and download; generated-document reads and download; workflow, report, package, reminder, and audit reads; and package verification/download. Package tests also assert unauthenticated access is rejected.

The remaining `missing` cells are the next authorization-test backlog. They must not be treated as evidence that the routes are unprotected; they mean the repository does not currently prove the boundary with an automated cross-tenant attempt. Notification tests use separate user IDs; since notifications are user-owned rather than company-owned, this directly proves the relevant isolation boundary.
