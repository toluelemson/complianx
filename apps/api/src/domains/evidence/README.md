# Evidence domain

Owns generated documents, uploaded artifacts, evidence versioning, downloads, and reviews. Existing routes and Prisma models remain unchanged.

- `application`: document and artifact orchestration
- `presentation`: controllers and validation DTOs
- `infrastructure`: reserved for evidence persistence adapters
- `platform/files`: file-system port and local storage implementation

Legacy `src/documents` and `src/artifacts` paths remain compatibility re-exports.
