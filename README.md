# FROBOT

**An owner-controlled operating system for one-person companies.**

[Public sandbox](https://frobot-company-os.mintybook4.chatgpt.site) · [Finance workflow](https://frobot-company-os.mintybook4.chatgpt.site/#finance) · [Architecture](docs/ARCHITECTURE.md) · [Run locally](docs/DEPLOYMENT.md)

![FROBOT company operating system](docs/images/dashboard.png)

FROBOT v0.2 combines a multi-company workspace with evidence-backed finance reports, bounded role-specific workflows, durable jobs, Owner approvals, and an inspectable audit history. It is a working single-owner pilot, not a certified autonomous company or multi-tenant production service.

## Run it

Install Node.js **22.13+** (Node 24 LTS recommended):

```sh
git clone https://github.com/naazzarov/frobot.git
cd frobot
npm start
```

Open **http://127.0.0.1:3000**. No `npm install` or paid AI account is required. Node 22 may print an experimental warning for its built-in SQLite module.

## Try a useful end-to-end workflow

Click **Try the workflow** on Overview, or open **Finance workspace → Try a CFO workflow**.

1. Import a fictional ledger of 12 transactions into the selected company.
2. Calculate inflows, outflows, net movement, monthly movements, categories, and source-quality flags using integer amounts.
3. Execute executive planning, manager breakdown, specialist delivery, and review.
4. Inspect each stage, the exact source ID and row references, and the downloadable report.

The sample produces **$11,900.50 inflows, $2,071.15 outflows, and $9,829.35 net movement**. These are calculations from fictional source rows, not invented business-performance metrics. Cash movement is not profit or a reconciled bank balance.

You can import a CSV in the documented format instead. The public sandbox stores data in your browser; use fictional records there. Run your private backend for operational data.

## What changed in v0.2

- **Source-backed finance:** strict CSV validation, exact minor-unit calculations, duplicate/uncategorized flags, immutable sources, and row-level evidence.
- **Four-stage workflows:** separate typed contracts for executive, manager, specialist, and reviewer outputs. Without a key they run deterministically; with Anthropic configured they use up to four bounded model requests.
- **Output checks:** unknown evidence IDs, malformed stage JSON, rejected reviews, and numeric claims in finance commentary prevent completion. Financial figures come from trusted calculation code.
- **Durable jobs:** queue immediately or schedule within 30 days. Jobs persist in SQLite, execute while the server is online, and appear in Operations. No silent paid-call retries after interruptions.
- **Execution control:** bounded concurrency, daily global/per-company model-request caps, cancellation, explicit retry, and stale-result rejection.
- **Owner sessions:** an Owner credential is exchanged for an expiring HttpOnly/SameSite cookie. Browser mutations require a CSRF token. The Owner credential is not saved in browser storage.
- **Knowledge versions:** edit with optimistic version checks and inspect earlier content.
- **Operations and recovery:** actual job/usage counts, audit verification, and a tested SQLite backup/restore command.

The original dashboard, six executive roles, fourteen managers per company, task-scoped specialists, approval notes, global/company/supervisor pause controls, and audit exports remain available.

## Enable role-specific AI calls

```sh
cp .env.example .env
```

Set `ANTHROPIC_API_KEY` in the local `.env` and restart. Never commit a real credential. Configure an Owner token as well before handling operational data.

A model-enabled run sends the directive, company mission, bounded company knowledge, trusted finance summaries, selected source rows, and prior stage outputs to Anthropic. The server never sends the API key in prompts or returns it to the browser. Understand that disclosure before using private records.

The provider calls the [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages/create). Model requests are validated, bounded to 1,800 output tokens per stage, and capped per UTC day. These are **request-count controls, not a dollar billing guarantee**. Failed and uncertain requests count against the cap. No automatic retries are made.

No live Anthropic request was made during this build because no provider credential was supplied. Contract, failure, context, usage, and budget behavior are tested with injected responses; real provider quality and availability still need credentialed evaluation.

## Two distinct runtimes

**Public sandbox:** static hosting; fictional examples; browser-local storage; deterministic calculations and stages. No shared server database, API key, background worker, or live service connection. Work stops when the browser closes.

**Private backend:** the same interface and domain engine, SQLite persistence, HttpOnly Owner sessions when configured, optional AI stages, durable jobs, schedules, request budgets, and backup tooling. It binds to loopback by default. Jobs continue when the browser closes, as long as the Node process remains online.

## Validation

```sh
npm run check
npm test
npm run build
npm run backup -- /your/private/backup/frobot.sqlite
```

The regression suite covers source arithmetic/validation, context isolation, evidence rejection, exact approval scope, reviewer failure, session/CSRF/expiry, job recovery/deduplication, concurrency, budgets, cancellation races, and a real online backup/restore. CI runs checks, tests, and the static build on Node 22 and 24.

Docker and Compose configuration is supplied, but it was not executed during this build. Validate it in your deployment environment.

## Source layout

```text
public/
  core.js       Company/agent/task/approval state machine
  finance.js    CSV validation, exact calculations, source report
  workflow.js   Four-stage contracts, validation, checkpoints
  panels.js     Finance, stage trace, and operations views
  app.js        Dashboard, sandbox adapter, authenticated API client
src/
  auth.js       Owner sessions, CSRF, login throttling
  runner.js     Bounded workflow execution and job dispatch
  providers.js  Deterministic and Anthropic stage adapters
  store.js      SQLite workspace, normalized jobs, audit chain
  server.js     HTTP API and startup/recovery lifecycle
scripts/        Checks, static build, verified online backup
```

## Boundaries that still matter

This is a bounded sequential workflow, not independently autonomous executives or an unrestricted recursive agent swarm. It has no bank, accounting-service, CRM, email, government, HR, or robotic connection. It cannot move money, contact people, file taxes, sign documents, hire people, or execute generated code. Completion means a deliverable is ready.

Application-level company scoping lives inside a trusted single-owner workspace. Transactional workspace state is still a JSON snapshot. Run **one server process per database**; the queue is not a distributed-worker system. Audit hashes provide local tamper evidence, not protection against a host administrator replacing the database.

Production identity, encrypted storage/vaults, hard tenant isolation, retention/deletion policy, independent audit anchoring, live-provider evaluations, and service-specific tool authorization remain necessary. See [SECURITY.md](SECURITY.md), [Deployment](docs/DEPLOYMENT.md), and [Roadmap](docs/ROADMAP.md).

## Public-source hygiene and contributions

The original internal brief, personal assignments, private business data, runtime databases, logs, environment secrets, and local exports are excluded. `.gitignore` protects common runtime paths, but review files before committing. Backups and exports from a real instance are private even though this source is public.

See [CONTRIBUTING.md](CONTRIBUTING.md). Source code is [MIT-licensed](LICENSE). Manrope is bundled under the [SIL Open Font License](docs/fonts/Manrope-OFL.txt) and served locally.
