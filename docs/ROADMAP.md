# Delivery roadmap

The long-term vision is a reusable, owner-governed workforce for multiple companies. This roadmap distinguishes implemented pilot behavior from future work. A polished dashboard does not imply that the full autonomous company system is deployed.

## v0.1 — Implemented foundation

- Owner dashboard and cross-company overview.
- Six executive and fourteen manager templates per company.
- Deterministic role routing and structured hierarchy handoffs.
- On-demand specialist records with archival.
- Persisted missions, review gates, decision notes, and explicit run requests.
- Template artifacts and an optional Anthropic draft adapter.
- Company-scoped knowledge context.
- Global/company/supervisor pauses with stale-result rejection.
- SQLite persistence, crash recovery, and hash-chained audit events.
- Static public sandbox, tests, CI, open-source licensing, and operations documentation.

## Next — Validate the pilot

- Run the CEO and CFO workflows against Owner-provided, non-sensitive pilot examples.
- Evaluate generated drafts for correctness, source grounding, unsupported claims, cost, and useful outcomes.
- Add provider contract tests in a private credentialed environment; no live API call was made for the initial build.
- Add login/session hardening, request throttling, model-spend caps, retention policies, and backup restore drills.
- Normalize transactional storage before adding multiple workers or large volumes.
- Add knowledge editing with real version history and retrieval provenance.
- Add task cancellation, explicit retry attempts, structured deliverable schemas, and dependency-aware projects.

Exit criteria: critical approval/isolation tests remain green, restores succeed, pilot quality is measured, and the Owner signs off on limits.

## Then — Real orchestration and read-only integrations

- Persistent worker queue with leases, heartbeats, deadlines, retries, and per-company quotas.
- Independent executive planning and manager decomposition with typed contracts and bounded delegation depth.
- Department-specific manager selection rather than the initial first-manager rule.
- Read-only accounting and document connectors with OAuth and scoped vault references.
- Vector retrieval, relational tenant policies, object storage, encrypted backups, and independent audit anchoring.
- Objective tracking and metrics drawn from actual execution data. Do not fabricate financial savings or accuracy scores.

Exit criteria: adversarial prompt and tenant tests pass, jobs survive worker failure, and tool scopes are independently reviewed.

## Later — Approved external operations

- Exact-payload approval tokens for outgoing communication and financial commitments.
- Upstream idempotency, reconciliation, and compensation strategies.
- Validated CRM, communications, calendar, and accounting write adapters.
- Jurisdiction-specific legal and tax workflows with qualified human review.
- Operational monitoring, service objectives, incident runbooks, identity, and fine-grained access controls.

Exit criteria: action-specific authorization, failure/retry behavior, monitoring, and rollback are proven in service sandboxes before real commitments.

## Future — Physical AI

Embodied AI is outside the initial software build. It requires sustained reliability measurements, simulated office testing, a narrow certified role, physical safety controls, and a supervised pilot. Software approval gates alone do not certify a robot for physical operation.

## Measurement

Measure task completion/automation rate, median decision latency, provider/tool cost per company, reporting error rate, availability, handoff success, and time to provision a company. Define baselines and sampling methods before claiming Owner time saved. The current dashboard shows real counts from its workspace, not invented revenue or efficiency metrics.
