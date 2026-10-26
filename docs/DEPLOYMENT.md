# Running FROBOT v0.2

## Local pilot

Use Node 22.13+ (Node 24 LTS recommended). `npm start` needs no package installation. First start creates a SQLite database and four fictional companies in `data/`. Copy `.env.example` to `.env` for local configuration; both runtime state and real environment files are ignored by Git.

- `HOST`, `PORT`: default `127.0.0.1:3000`.
- `FROBOT_DATA_DIR`: defaults to `./data` relative to the working directory.
- `FROBOT_OWNER_TOKEN`: optional for a fictional loopback pilot; use a strong credential for operational data. Non-loopback binding requires at least 32 characters.
- `FROBOT_SECURE_COOKIE`: set `true` behind HTTPS. `false` is for loopback HTTP development only.
- `FROBOT_CONCURRENCY`: 1–8 concurrent runs; default 2.
- `FROBOT_DAILY_MODEL_CALLS`: global UTC-day reservation cap; default 80.
- `FROBOT_COMPANY_DAILY_MODEL_CALLS`: per-company cap; default 40.
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`: optional; without a key, deterministic workflows and source calculations still work.

Generate an Owner credential locally using `openssl rand -hex 32`. Put it only in your private `.env` or deployment secret manager. Restart and enter it into the Owner unlock dialog. It is exchanged for an HttpOnly session, not saved in browser storage. Do not put a credential in a URL or public source.

## Background jobs

Open a queued/failed mission and choose **Queue in background**. Leave the time blank for the next available worker slot, or schedule within 30 days. The browser can close; the Node process must remain online.

Queued jobs survive restart. Interrupted running jobs are marked failed for inspection, while their task returns to queued. Inspect the trace/outcome before explicitly queuing again; upstream billing or an uncertain provider response cannot be rolled back. Failed reviews do not automatically retry. Pause holds unstarted jobs; interrupted active jobs require a fresh explicit run.

Run **one server process per database**. Normalized job records and lease tokens do not make the whole-workspace JSON snapshot safe for distributed workers or horizontal scaling.

## HTTPS and network access

Place a real workspace behind a trusted TLS reverse proxy with authentication and restricted network access. Preserve the public Host header, enable Secure cookies, and do not pass arbitrary client identity headers as authorization. The app has no TLS terminator, SSO provider, encrypted vault, or dollar spending quota. Request-count caps cannot guarantee provider bills.

The rate limiter uses the remote socket IP, not forwarded client headers. Users behind one proxy share that proxy bucket. Session memory is process-local and restart signs browsers out.

Serve the public static sandbox separately. Never attach private runtime credentials or a real Owner database to an anonymous public demo.

## Docker

```sh
cp .env.example .env
# Set a strong FROBOT_OWNER_TOKEN. Configure HTTPS/Secure cookies as applicable.
docker compose up --build -d
```

Compose publishes only `127.0.0.1:3000` on the host. Inside the container, the server binds `0.0.0.0`, requires the strong token, runs as non-root, and persists `/app/data` in a named volume. There is no `npm install` step.

The Docker path was source-reviewed, not executed during this build. Validate it in your target environment.

## Static sandbox

`npm run build` copies `public/` into `dist/`. Serve from HTTPS or loopback for native modules and `crypto.randomUUID()`. For local preview:

```sh
python3 -m http.server 3001 --bind 127.0.0.1 --directory public
```

The sandbox runs exact finance calculations and deterministic stages locally, stores fictional data per browser, and has no background worker or provider key. Import only fictional records into the public demonstration. No workspace import endpoint exists; JSON exports are for inspection/portability, not automatic restoration.

The tracked `.openai/hosting.json` declares the original Site identity and `dist`. A fork must register its own Site. Root-relative assets require root/custom-domain hosting; a GitHub Pages project subpath needs asset-path adjustments.

## Backup and restoration

Use the built-in consistent online backup:

```sh
npm run backup -- /your/private/backup/location/frobot.sqlite
```

The command opens the source read-only, uses SQLite `VACUUM INTO`, refuses to overwrite a target, applies private filesystem permissions, and verifies the restored audit chain. It copies workspace and job tables together. The regression suite restores a backup and checks its audit head, companies, and queued schedule.

Keep backups in encrypted, restricted storage outside the repository. Never copy only the main database while WAL writes are active. A JSON workspace export is not a database backup and omits the normalized job queue.

To restore: stop the process, preserve the failed data directory for investigation, install a trusted backup as the workspace database, and start once. Startup validates the event chain and snapshot agreement and recovers interrupted work. Inspect pending jobs and previous results before running work again.

Define backup cadence, retention, RTO/RPO, and restore drills for your deployment. Automated offsite snapshots, point-in-time recovery, and encryption are not supplied by this pilot.

## Upgrade from v0.1

Back up first. Tables and in-memory defaults migrate additively. Existing completed artifacts remain. Browsers sign in again because stored Owner credentials are removed. Previously approved tasks without an exact-scope grant cannot run; create and approve a new mission. There is no destructive schema migration.

## Verification

Run `npm run check`, `npm test`, and `npm run build`. `GET /api/health` verifies the process, not live provider credentials. The authenticated Operations page shows actual jobs, request reservations, reported tokens, and audit-chain checks. Logs intentionally avoid credentials, request bodies, and raw upstream error text. Add external monitoring before a real operational deployment.
