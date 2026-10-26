# Security model and reporting

FROBOT v0.1 is a single-owner pilot. Do not expose a real workspace to anonymous users. The published sandbox is a separate static app with fictional data, no server database, and no credentials.

## Boundaries enforced in this release

- The server binds to `127.0.0.1` by default. Non-loopback binding requires an Owner token of at least 32 characters.
- When configured, the token protects all state, audit, and mutation API endpoints. Health and static assets are public. Use HTTPS when crossing a network.
- Authentication is a single bearer token, not an identity provider. Whoever has the token has Owner access to every company. The browser holds it in session storage; an XSS in the trusted origin could access it.
- Loopback requests reject unexpected Host headers; supplied Origin headers must match the request host. There are no permissive CORS headers. These checks are defense in depth, not authentication.
- The server serves only an explicit static-file allowlist. It does not expose `.env`, source directories, or SQLite files.
- All user/model text is escaped or rendered as text; Markdown results are shown as plain preformatted text.
- Knowledge and task lookup paths are scoped by company. The Owner API intentionally sees all companies. No untrusted agent principal can call a tool API because tool execution is not implemented.
- Financial, legal, hiring, and external-communication proposals require review. Structured action type, amount, and conservative keyword checks drive draft gating. Keyword matching is not a reliable classifier and must never be the authorization boundary for future external tools.
- A pause invalidates running task IDs, discards stale results, and attempts to cancel provider requests. It cannot undo a provider charge or a request already received upstream.
- SQLite commits the workspace and its new audit entries in one transaction. Update/delete triggers and chained hashes resist accidental edits. A host administrator can alter the file, remove triggers, or rebuild a chain. External signed anchoring and restricted backup storage are needed for stronger guarantees.
- Runtime data is private by filesystem permissions, but the SQLite file is not encrypted at rest. Use encrypted storage and an external secrets manager for a real deployment.

## Before a production deployment

Add a reviewed identity/session layer, rate and model-spend limits, a real secret vault, tenant database policies, resource quotas, retention and deletion controls, monitored workers, encrypted backups, independent audit anchoring, and action-specific tool authorization. Test restoration. Evaluate model output quality and prompt-injection exposure. Validate jurisdiction-specific legal/tax workflows with qualified people.

The initial source excludes the internal brief, personal assignments, real business records, API keys, and runtime exports. Keep that separation when contributing. Exports and backups from a real instance are confidential even though this repository is public.

## Report a vulnerability

Use GitHub’s private vulnerability reporting when enabled on this repository. If it is unavailable, contact the maintainer through a public profile contact channel and ask for a private reporting destination before sending details. Do not publish credentials, personal data, or an exploitable report in a public issue.
