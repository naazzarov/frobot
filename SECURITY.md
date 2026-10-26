# Security model and reporting

FROBOT v0.2 is a trusted single-owner pilot. Do not expose a real operational workspace anonymously. The public sandbox is a separate static deployment with fictional examples, browser-local storage, and no server credentials or external tools.

## Enforced boundaries

- Loopback binding is the default. Other bind addresses require an Owner credential of at least 32 characters. Use HTTPS and `FROBOT_SECURE_COOKIE=true` across a network; Node does not terminate TLS.
- Browser login exchanges that credential for an eight-hour HttpOnly/SameSite=Strict cookie. Server memory keeps a session digest and CSRF secret, not the session token. Mutations require CSRF. Sessions expire, logout revokes them, and server restart invalidates them. The browser removes legacy stored Owner tokens and keeps only CSRF in memory. CLI bearer access remains available for trusted Owner scripts.
- The Owner credential grants all-company authority. This is not an identity provider, multi-user RBAC, or per-agent authentication system. An XSS in the trusted origin could still act through a session even though it cannot read an HttpOnly cookie.
- Login attempts and API mutations are throttled. Host/Origin and Fetch Metadata checks are defense in depth. Forwarded IP headers are not trusted; reverse-proxy users share a remote-IP rate bucket.
- Static serving uses an explicit allowlist, so `.env`, source directories, backups, and databases are not served.
- User/model content is escaped or shown as text. Model artifacts are not executed or rendered as arbitrary HTML.
- Source imports are validated, bounded, immutable, and company-scoped. Sources contain financial data even when their original files were discarded; protect the entire runtime store and its exports.
- Task lookup, source selection, knowledge revisions, and execution context are company-scoped within a trusted Owner workspace. This is not a hard database tenant boundary.
- Approval decisions bind to the exact task payload. Changed scope cannot reuse approval. Financial, legal, employment, and external-communication proposals require review. Structured kinds/amounts and conservative keywords gate draft preparation; keywords must never authorize future external operations.
- Four typed workflow stages bound model delegation. No external tools are registered. Stage validation rejects malformed output, unknown evidence, rejected reviews, and numeric claims in finance commentary. Trusted integer code supplies finance figures. This does not certify source authenticity, accounting completeness, or semantic model correctness.
- Provider contexts are cloned. Only bounded, company-scoped context is sent upstream. Prompts and raw provider errors do not contain or expose Owner/API credentials.
- A provider-request reservation is persisted before each Anthropic stage. Concurrency and global/per-company daily request counts are capped; failed/uncertain requests still count. Caps are not dollar billing limits. No silent retries occur.
- Pause/cancel invalidates run IDs before attempting cancellation. Stale checkpoints and artifacts cannot commit. A remote request may already have incurred a charge; cancellation cannot undo it.
- Active jobs interrupted by restart are held for inspection. Queued schedules survive restart. Run one server process per database; startup recovery and JSON snapshot writes are not safe for independent concurrent servers.
- Snapshot changes and new audit events commit together. SQL triggers and a SHA-256 chain provide local tamper evidence. A host administrator can still remove triggers, rebuild a chain, or replace the database. Jobs themselves are not cryptographically anchored.
- Online backups refuse overwrite and verify their restored audit head. SQLite storage is not encrypted at rest. Backups and real workspace exports are private; keep them outside the public repository.

## Production work still required

Add reviewed identity and session policy, independent tenant isolation, encrypted storage, a real credential vault, retention/deletion controls, offsite encrypted backups, monitored workers and incident response, independent signed audit anchors, live-provider evaluations, and service-specific action authorization.

Future financial or outgoing-message tools must bind approval to the exact external payload, destination, amount/currency, expiry, and upstream idempotency key. Existing v0.2 approvals authorize preparation of a deliverable only. Model review and keyword matching cannot authorize external commitments.

The repository excludes the original internal brief, personal assignments, real customer records, live credentials, runtime databases, and exports. Keep that boundary when contributing.

## Reporting

Use private vulnerability reporting on GitHub when available. Otherwise contact the maintainer through a public profile channel to establish a private reporting destination before sending details. Do not publish secrets or an exploitable report in a public issue.
