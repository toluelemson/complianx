# ADR-004: Platform adapters

Status: Accepted

Database, AI, PDF, email, payments, files, events, and observability are technical capabilities under `apps/api/src/platform`. Low-risk adapters move first behind compatibility exports. Mixed business/vendor services, notably current billing code, remain until ports can be extracted without changing behavior.
