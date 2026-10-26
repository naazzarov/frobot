# Running and deploying

## Local pilot

Use Node 22.13+ (Node 24 LTS recommended). Run `npm start` from the repository root. No package installation is required. The first start creates `data/frobot.sqlite` and fictional seed records. The directory, database, WAL, and environment files are ignored by Git.

Configuration is loaded from a local `.env` by the npm scripts:

- `HOST`: default `127.0.0.1`.
- `PORT`: default `3000`.
- `FROBOT_DATA_DIR`: default `./data`, relative to the current working directory.
- `FROBOT_OWNER_TOKEN`: optional on loopback; required for all other bind addresses, with at least 32 characters.
- `ANTHROPIC_API_KEY`: optional server-side provider credential.
- `ANTHROPIC_MODEL`: optional model override.

Generate an Owner token locally with `openssl rand -hex 32` and put it in `.env`. Never paste it into GitHub issues, source files, a URL, or a public deployment manifest. Restart the app and enter that token into the Owner unlock dialog.

The token grants access to the entire Owner workspace, including all companies. This is not a multi-user permission system.

## Docker

```sh
cp .env.example .env
# Edit .env and set a strong FROBOT_OWNER_TOKEN.
docker compose up --build -d
```

The supplied Compose file publishes only `127.0.0.1:3000` on the host, persists `/app/data` in a named volume, and runs the process as the non-root Node user. Inside the container, `HOST=0.0.0.0` is required for port forwarding, so the strong token is mandatory. The image has no npm install step and no application runtime dependencies.

The Docker configuration was source-reviewed but not exercised during the initial build. Run the tests and verify the container in your environment before relying on it.

## Network access

Use a trusted TLS reverse proxy with authentication, rate limits, and restricted network access. The app has no built-in TLS, identity provider, IP throttling, or provider spending quota. Do not expose its port directly to the public Internet with real operational data. Origin checks use the request Host header; preserve the public host when proxying. Do not forward arbitrary client-controlled identity headers as authorization.

Serve the public sandbox separately from any private backend so anonymous visitors cannot access the Owner workspace. Never configure a real provider key into the static sandbox or client JavaScript.

## Static sandbox hosting

Serve the contents of `public/` from an HTTPS origin, or run `npm run build` to copy them into `dist/` for hosts that expect a build directory. Native browser modules and `crypto.randomUUID()` require HTTPS or loopback. No bundler or dependency installation is needed. For local static testing:

```sh
python3 -m http.server 3001 --bind 127.0.0.1 --directory public
```

The sandbox uses local storage. Each browser has its own fictional workspace. It does not synchronize across devices or visitors. It cannot use the backend AI provider. Its history is not a secure audit store.

The tracked `.openai/hosting.json` identifies the demonstration Site and declares `dist` as the static directory. It contains no credential. A fork should register its own Site rather than reusing the original deployment identity. GitHub Pages users may need a custom domain/root deployment because assets currently use root-relative paths.

## Backup and recovery

For a consistent online SQLite backup, use the SQLite backup API or the `sqlite3` CLI `.backup` command. Do not copy only the main `.sqlite` file while WAL writes are active.

```sh
# sqlite3 must be installed separately if you use this command.
sqlite3 data/frobot.sqlite '.backup /your/private/backup/location/frobot.sqlite'
```

Backups must stay outside this public repository, in encrypted, access-restricted storage. Define retention and test restores. For a cold backup, stop the process cleanly, preserve the data directory, and restart. Workspace JSON exports are useful for inspection, but there is no supported import endpoint yet; they are not a replacement for a database backup.

To restore, stop the application, preserve the failed data directory for investigation, and replace the database with a trusted backup. Start the application. Startup verifies its audit chain and event-list agreement; corrupt history stops startup. In-flight missions in a restored snapshot return to queued. Inspect task outcomes before explicitly running them again.

RTO and RPO depend on your backup cadence and restore practice; this release does not promise production recovery targets, automated snapshots, or point-in-time recovery.

## Operations

`GET /api/health` provides process readiness and provider configuration metadata. It does not check provider credentials or perform a paid model call. Inspect the activity log and export the audit chain for review. Logs intentionally avoid request bodies, tokens, and raw provider error content. Add external monitoring and authenticated metrics before operating a real service.

Run one server process per database. Snapshot persistence does not support independent processes writing the same workspace, distributed workers, or horizontal scaling.
