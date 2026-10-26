# Delivery status and next steps

## v0.2 — Implemented and tested

- Multi-company dashboard with six executive roles, fourteen managers per company, and task specialists.
- Exact-scope Owner approvals, notes, cancellation, explicit retry, and global/company/supervisor pauses.
- Four inspectable stages: executive planning, manager breakdown, specialist delivery, and review.
- Optional separate Anthropic calls per stage, typed output validation, evidence checks, and bounded contexts.
- A working source-backed CFO workflow: CSV import, integer cash calculations, quality flags, source evidence, report, and source export.
- Persistent job queue, schedules, local leases/heartbeats, bounded concurrency, and explicit interrupted-run recovery.
- Persisted global/per-company model-request caps and reported token usage.
- HttpOnly/SameSite browser sessions, CSRF, expiry/logout, and request/login throttling.
- Knowledge edits with version history and stale-edit protection.
- Operations with actual queue/usage/audit data.
- Consistent online backup with verified restore coverage.
- Public fictional sandbox, source/license documentation, and Node 22/24 CI.

The sandbox runs deterministic stages and calculations. The backend supports model-enabled stages and durable jobs. No live provider call, Docker run, external bank/accounting connection, or production operation was performed during this build.

## Next — Validate real usefulness

- Run private, credentialed model evaluations against an Owner-approved set of pilot tasks.
- Measure unsupported claims, source grounding, review rejection quality, cost, latency, and actual time saved.
- Verify operational source completeness with qualified accounting reviewers before using finance outputs in decisions.
- Validate Docker/TLS/backup/monitoring in the target environment and conduct restore drills.
- Add retention and private data deletion/export policies, stronger identity/session requirements, and an incident runbook.

Exit criteria: tested workflows work on real permitted source material; provider quality and cost are measured; restoration succeeds; the Owner accepts the limits.

## Then — Production platform architecture

- Normalize transactional workspace records instead of serializing a full snapshot.
- Enforce hard database tenant policies, fine-grained principals, secret-vault references, and encrypted storage.
- Add a distributed workflow store with strict atomic state/job transitions, scoped workers, and safe retry/reconciliation rules.
- Add bounded department-specific planning and dependency-aware project decomposition with evaluation gates.
- Add versioned retrieval/provenance and semantic search only after demonstrating need and access boundaries.
- Independently sign and anchor audit checkpoints; establish external monitoring and realistic recovery/service targets.

## Later — Real services and approved actions

Start with read-only accounting, documents, and CRM context. Follow with exact-payload-approved communications and other writes, upstream idempotency, reconciliation, and operation-specific authorization. Banking, tax, employment, and legal actions require separate operational and jurisdictional review. Do not turn on side effects merely because a model plan appears plausible.

## Future — Physical AI

Physical operation remains outside the software pilot. It requires sustained reliability measurements, simulated scenarios, a narrow certified role, physical safety controls, and supervised trials.

## Honest measurement

Current UI metrics are observed task/job/source/stage/request counts and deterministic ledger totals. Do not invent revenue, accuracy, uptime, savings, or full autonomy scores. A “10/10” claim requires independent product and operational evidence; passing unit/integration tests alone cannot establish that.
