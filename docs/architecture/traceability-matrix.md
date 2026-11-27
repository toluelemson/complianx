# Workflow traceability matrix

| Workflow question | Persisted evidence | Owning domain/API | Primary user view | Verification expectation |
| --- | --- | --- | --- | --- |
| What system is being assessed? | `Project` profile and company association | projects / AI-systems | Register/profile | Cannot access from another company. |
| Why is a requirement applicable? | assessment answers, classification result, regulatory content/version | assessments | Assess | Human reviewer can inspect inputs and decision. |
| What must be done? | `AiSystemObligation`, `ComplianceAction` | obligations | Requirements | Applicable/not-applicable and owner/status are explicit. |
| What proves it? | document/evidence version, hash, provenance, expiry, `ObligationEvidence` link | evidence/obligations | Evidence | Link is requirement-specific and reviewable. |
| What is unresolved? | `Finding`, action, rejected/expired/pending evidence | obligations/workflow | Comply and overview | Next action links to the owning task. |
| Who approved or requested changes? | review/workflow event and approval state | workflow/review | Review | Actor and timestamp are audit-derived. |
| What did the report represent? | readiness report, generated document, `CompliancePackage` | reporting | Report/package | Package can be verified as an immutable snapshot. |

## Gaps to validate before changing schema

- Whether all classification-review decisions have a first-class durable
  reviewer/audit relation in the same way as project workflow decisions.
- Whether every package inclusion can be queried directly back to the evidence
  version used at generation time.
- Whether regulatory-content updates and evidence expiry consistently mark
  dependent obligations/documents/packages for re-evaluation.

These are validation questions, not a claim that the current schema lacks the
relations. Resolve them by writing representative project-level traceability
queries and tenant-isolation tests before adding models or migrations.
