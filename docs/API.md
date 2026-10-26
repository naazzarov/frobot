# HTTP API

All state and mutation endpoints require `Authorization: Bearer <owner-token>` when `FROBOT_OWNER_TOKEN` is set. `GET /api/health` is public. Mutations require a JSON object and `Content-Type: application/json`, with a maximum 64 KiB body. This is an Owner API, not an API exposed to untrusted agents.

## Read endpoints

- `GET /api/health`: application name, version, authentication requirement, provider configuration flag. No secrets.
- `GET /api/state`: `{ "state": { ...workspace } }`, including all companies visible to the Owner.
- `GET /api/audit`: chain verification, sequential hash records, and structured handoff messages.

## Actions

All actions are `POST /api/actions/<action>`.

### company

```json
{"name":"Example Labs","sector":"Technology","mission":"Build useful tools for small teams."}
```

Creates an independent roster of executive and manager records. Company names must be unique in the workspace. Up to 30 companies are supported by this pilot.

### mission

```json
{"companyId":"<company-id>","title":"Outline onboarding improvements","brief":"Prepare a practical acceptance checklist.","department":"CTO","kind":"draft","amount":0,"priority":"normal","deadline":"2026-12-01","idempotencyKey":"<client-request-id>"}
```

Department is optional; a deterministic router selects a role. Action kind is one of `draft`, `research`, `spend`, `legal`, `hiring`, or `communication`. Priority is `normal` or `high`. Deadline and idempotency key are optional. Sensitive proposals create an approval and enter `awaiting_approval`.

### decision

```json
{"companyId":"<company-id>","approvalId":"<approval-id>","decision":"approve","note":"Prepare a draft recommendation only."}
```

The alternative decision is `reject`. A non-empty note is required. Decisions cannot be replayed.

### run

```json
{"companyId":"<company-id>","taskId":"<task-id>"}
```

Runs a queued or failed mission. The HTTP response waits for the provider, up to its 60-second timeout. Check state after a disconnected response before retrying; a task may already have completed. The result is a draft artifact only.

### pause

```json
{"paused":true}
```

Add `companyId` to pause one company. Add both `companyId` and `agentId` to pause an executive or manager. Use `false` to resume. Global pause still applies to resumed companies/agents. Pausing invalidates in-flight work in that scope and returns it to the queue.

### knowledge

```json
{"companyId":"<company-id>","title":"Operating principles","content":"Use small, reversible experiments."}
```

Creates an immutable v1 text entry in the company knowledge collection. Editing/version history and file uploads are not implemented yet.

### policy

```json
{"companyId":"<company-id>","spendLimit":250}
```

Updates the review severity threshold. It does not disable approvals for financial commitments below the threshold.

## Error behavior

- `400`: invalid input or malformed JSON.
- `401`: missing or invalid Owner token.
- `403`: unexpected origin/host.
- `404`: missing record, cross-company record lookup, or unknown endpoint.
- `409`: incompatible task state, duplicate decision, or paused execution.
- `413`: body too large.
- `415`: unsupported body content type.
- `502`: provider error, with sanitized error text.

Non-run actions return `{ "ok": true, "result": ... }`. A run returns `{ "task": ... }`. Errors return `{ "error": "..." }`. Refresh state after an action for the current workspace.
