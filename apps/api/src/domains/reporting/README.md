# Reporting domain

Owns report readiness, generation orchestration, evidence appendix composition, and HTML rendering. Existing generation routes and document types remain unchanged.

- `application`: generation, readiness, and renderer ports
- `infrastructure/rendering`: Markdown-to-HTML adapter
- `presentation`: Nest generation controller
- AI, PDF, and file storage remain platform adapters
- generated document records are created through the evidence application service

Report consumers import the reporting application and rendering surfaces directly.
