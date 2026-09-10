# Shared contract instructions

`packages/contracts` is the source of truth for API data exchanged by the frontend and backend.

- Define status unions once where practical; do not duplicate union members.
- When a payload changes, update both API producers and web consumers in the same change.
- Serialize dates consistently and make nullable/optional fields intentional.
- Do not add unsafe casts that hide frontend/backend drift.
- Contract changes must trigger affected builds and tests.

Keep these concepts distinct:

- Project workflow status: the project-level lifecycle and review state.
- Section workflow status: progress/state for one compliance section.
- Evidence review status: reviewer decision on one evidence artifact.
- Document lifecycle status: current, superseded, or failed generated artifact.
- Approval status: approval decision for a requirement, document, or project workflow.
