# Domain map

| Target domain | Current capabilities |
| --- | --- |
| Identity and access | auth, users — migrated to `apps/api/src/domains/identity-access` |
| Organizations | company, invitations, membership — migrated to `apps/api/src/domains/organizations` |
| AI systems | projects; Prisma `Project` remains unchanged |
| Assessments | sections, trust, suggestions — migrated to `apps/api/src/domains/assessments` |
| Regulatory frameworks | compliance templates |
| Evidence | documents, artifacts, uploads — migrated to `apps/api/src/domains/evidence` |
| Review and approval | project/section statuses, reviewers, approvers |
| Reporting | generators, reports, exports — migrated to `apps/api/src/domains/reporting` |
| Notifications | notifications and reminders |
| Subscriptions | billing, plans, usage, monetization |

Review approval and assessments now use explicit domain boundaries. Remaining business modules continue at compatibility paths and migrate incrementally.
