# Domain map

| Target domain | Current capabilities |
| --- | --- |
| Identity and access | auth, users — migrated to `apps/api/src/domains/identity-access` |
| Organizations | company, invitations, membership — migrated to `apps/api/src/domains/organizations` |
| AI systems | projects — migrated to `apps/api/src/domains/ai-systems`; Prisma `Project` remains unchanged |
| Assessments | sections, trust, suggestions — migrated to `apps/api/src/domains/assessments` |
| Regulatory frameworks | compliance templates — migrated to `apps/api/src/domains/regulatory-frameworks` |
| Evidence | documents, artifacts, uploads — migrated to `apps/api/src/domains/evidence` |
| Review and approval | project/section statuses, reviewers, approvers |
| Reporting | generators, reports, exports — migrated to `apps/api/src/domains/reporting` |
| Notifications | notifications and reminders — migrated to `apps/api/src/domains/notifications` |
| Subscriptions | billing, plans, usage, monetization — migrated to `apps/api/src/domains/subscriptions` |

All mapped backend business capabilities now have explicit domain ownership, and legacy compatibility exports have been removed.
