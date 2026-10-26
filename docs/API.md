# FROBOT v0.2 Owner API

This is a trusted Owner API, not an API for untrusted agent principals. State endpoints intentionally expose all companies to the Owner. The public sandbox has no backend API.

## Authentication

When `FROBOT_OWNER_TOKEN` is configured, every private endpoint requires either a valid browser session or `Authorization: Bearer <owner-token>` for CLI clients.

- `POST /api/session` with `{ "token": "<owner-token>" }`: sets an expiring HttpOnly/SameSite cookie and returns `csrf` and `expires`. Login is throttled after eight failed attempts per IP over 15 minutes.
- `GET /api/session`: returns session metadata and CSRF for an authenticated session.
- `POST /api/logout`: revokes the session and clears its cookie. Requires the session’s CSRF header.
- Browser mutations send `X-Frobot-CSRF: <csrf>` with the cookie. The Owner credential is not saved in browser storage.
- `FROBOT_SECURE_COOKIE=true` adds the Secure flag. Use this behind HTTPS; the server itself does not terminate TLS.

## Read endpoints

- `GET /api/health` and `/runtime.json`: public non-secret runtime metadata. This does not validate live provider access.
- `GET /api/state`: `{ "state": ... }`, including company sources, workflow traces, knowledge versions, and safe request-usage metadata.
- `GET /api/audit`: local hash-chain verification, event records, and handoff messages.
- `GET /api/operations`: worker capacity, UTC-day request reservations and reported tokens, chain verification, and job history. Internal lease tokens are omitted.

## Actions

All actions use `POST /api/actions/<action>` and a JSON object. The default body limit is 64 KiB; `source` allows 400,000 bytes. Source CSV text itself is capped at 250,000 characters and 1,000 rows. API mutations are limited to 120 requests per remote IP per minute. Reverse-proxy clients share the proxy’s remote-IP bucket; forwarded IP headers are not trusted.

- `company`: `{ "name": "Example", "sector": "Technology", "mission": "Build useful tools." }`.
- `mission`: `{ "companyId": "...", "title": "Cash report", "brief": "...", "department": "CFO", "kind": "research", "ledgerId": "...", "priority": "normal", "idempotencyKey": "..." }`. Department, source, deadline, and idempotency key are optional. A source-backed task must use CFO and a source from the same company. Action types remain draft/research/spend/legal/hiring/communication.
- `decision`: `{ "companyId": "...", "approvalId": "...", "decision": "approve", "note": "Prepare a draft only." }`. The alternative is reject. Notes are required. Decisions cannot be replayed; scope binds to the exact task payload.
- `run`: `{ "companyId": "...", "taskId": "..." }`. Executes a queued/failed task synchronously and returns `{ "task": ... }`. Four provider stages may take several minutes. After a disconnected response, inspect task state before retrying.
- `enqueue`: `{ "companyId": "...", "taskId": "...", "runAt": "2026-12-01T09:00:00Z" }`. Omit `runAt` for as-soon-as-capacity-allows. A valid future schedule is limited to 30 days. Returns HTTP 202 and `{ "job": ... }`. Duplicate active jobs return the existing job. Schedules require the Node process to remain online.
- `cancel`: `{ "companyId": "...", "taskId": "..." }`. Cancels a queued/running/failed/awaiting-review task and invalidates in-flight results. Pending approvals become withdrawn. Rejected and completed tasks cannot be cancelled. Create a new mission to revisit a cancelled proposal.
- `pause`: `{ "paused": true }` globally; add `companyId` for one company, or `companyId` and `agentId` for one supervisor. Resume with false. Unstarted queued jobs wait. Interrupted active jobs are held for inspection, not silently restarted.
- `source`: `{ "companyId": "...", "name": "Cash export", "csv": "date,description,amount,currency,category\n...", "synthetic": false }`. Sources are immutable; at most eight per company. Re-importing the same normalized rows into the same company is rejected. The `synthetic` label is Owner-supplied metadata, not a verification of provenance.
- `knowledge`: `{ "companyId": "...", "title": "Policy", "content": "..." }`.
- `knowledgeUpdate`: `{ "companyId": "...", "knowledgeId": "...", "expectedVersion": 1, "title": "Policy", "content": "Updated..." }`. Rejects stale versions; stores prior content in revision history.
- `policy`: `{ "companyId": "...", "spendLimit": 250 }`. Changes the review severity threshold; it does not disable approvals below that threshold.

Non-run/non-enqueue actions return `{ "ok": true, "result": ... }`. Errors return `{ "error": "..." }`.

## Error statuses

400 invalid input; 401 missing authentication/invalid session CSRF; 403 untrusted origin/host or cross-site API call; 404 missing/cross-company record or unknown action; 409 invalid state, stale approval/version, pause, cancellation, or active queue conflict; 413 oversized body; 415 unsupported content type; 429 login/API/provider budget/capacity limit; 502 provider/stage/review validation failure; 503 stopping worker/session capacity.

## Migration from v0.1

Existing workspace snapshots migrate additively when loaded. New job tables are created automatically. Browser-stored Owner tokens are removed; sign in again for a cookie session. Old approved tasks that lack exact-scope authorization cannot run under the new gate; create and approve a fresh mission. Existing completed artifacts remain inspectable. Back up your database before upgrading.
