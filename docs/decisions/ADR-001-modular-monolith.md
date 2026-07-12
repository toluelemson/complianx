# ADR-001: Modular monolith

Status: Accepted

Complianx remains a single deployable NestJS API. Domain boundaries are expressed in code rather than network calls. This preserves transactions and operational simplicity while allowing later extraction only when justified by real scaling or ownership needs.
