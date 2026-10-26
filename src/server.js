import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Engine, DomainError } from "../public/core.js";
import { openStore } from "./store.js";
import { createProvider } from "./providers.js";
import { createAuth } from "./auth.js";
import { createRunner } from "./runner.js";
const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const mime = {
  "/": "text/html; charset=utf-8",
  "/index.html": "text/html; charset=utf-8",
  "/app.js": "text/javascript; charset=utf-8",
  "/core.js": "text/javascript; charset=utf-8",
  "/finance.js": "text/javascript; charset=utf-8",
  "/workflow.js": "text/javascript; charset=utf-8",
  "/panels.js": "text/javascript; charset=utf-8",
  "/styles.css": "text/css; charset=utf-8",
  "/favicon.svg": "image/svg+xml",
  "/fonts/manrope.ttf": "font/ttf",
};
const methods = {
  company: "createCompany",
  mission: "createTask",
  decision: "decide",
  pause: "pause",
  knowledge: "addKnowledge",
  knowledgeUpdate: "updateKnowledge",
  source: "importLedger",
  cancel: "cancel",
  policy: "updatePolicy",
};
async function body(req, limit = 65536) {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    throw new DomainError("Content-Type must be application/json.", 415);
  let chunks = [],
    size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit)
      throw new DomainError(`Request body exceeds ${limit} bytes.`, 413);
    chunks.push(chunk);
  }
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new DomainError("Invalid JSON.", 400);
  }
  if (!input || Array.isArray(input) || typeof input !== "object")
    throw new DomainError("JSON object required.", 400);
  return input;
}
export function createApp({
  store,
  provider = createProvider(),
  ownerToken = "",
  host = "127.0.0.1",
  secureCookie = false,
  concurrency = 2,
  maxDailyCalls = 80,
  maxCompanyDailyCalls = 40,
  worker = true,
} = {}) {
  const loopback = ["127.0.0.1", "localhost", "::1"].includes(host);
  if (!loopback && ownerToken.length < 32)
    throw Error(
      "Non-loopback binding requires FROBOT_OWNER_TOKEN of at least 32 characters.",
    );
  if (ownerToken && ownerToken.length < 32)
    throw Error("FROBOT_OWNER_TOKEN must be at least 32 characters.");
  const engine = new Engine(store.load()),
    auth = createAuth(ownerToken, { secure: secureCookie }),
    limits = new Map();
  for (const task of engine.state.tasks.filter((t) => t.status === "running")) {
    task.status = "queued";
    task.runId = null;
    task.updatedAt = new Date().toISOString();
    const staff = engine.state.agents.find((a) => a.id === task.staffId);
    if (staff) staff.status = "archived";
    engine.event(
      task.companyId,
      "task.recovered",
      `Recovered interrupted mission: ${task.title}`,
      "System",
      task.id,
    );
  }
  store.save(engine.state);
  function change(fn) {
    const before = structuredClone(engine.state);
    try {
      const value = fn();
      engine.state.revision = (engine.state.revision || 0) + 1;
      store.save(engine.state);
      return value;
    } catch (e) {
      engine.state = before;
      throw e;
    }
  }
  const runner = createRunner({
    engine,
    store,
    change,
    provider,
    concurrency,
    maxDailyCalls,
    maxCompanyDailyCalls,
  });
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    res.setHeader("Cache-Control", "no-store");
    const json = (status, value) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(value));
    };
    try {
      let authority;
      try {
        authority = new URL(`http://${req.headers.host}`).hostname;
      } catch {
        throw new DomainError("Invalid host.", 400);
      }
      if (loopback && !["localhost", "127.0.0.1", "[::1]"].includes(authority))
        throw new DomainError("Untrusted host.", 403);
      if (req.headers.origin) {
        let origin;
        try {
          origin = new URL(req.headers.origin);
        } catch {
          throw new DomainError("Untrusted origin.", 403);
        }
        if (
          origin.host !== req.headers.host ||
          !["http:", "https:"].includes(origin.protocol)
        )
          throw new DomainError("Untrusted origin.", 403);
      }
      const path = new URL(req.url, "http://localhost").pathname;
      if (
        ["/api/health", "/runtime.json"].includes(path) &&
        req.method === "GET"
      )
        return json(200, {
          app: "frobot",
          version: "0.2.0",
          authRequired: auth.required,
          aiConfigured: provider.name === "anthropic",
          provider: provider.name,
          mode: "server",
          backgroundJobs: true,
        });
      if (path.startsWith("/api/")) {
        if (req.headers["sec-fetch-site"] === "cross-site")
          throw new DomainError(
            "Cross-site API requests are not allowed.",
            403,
          );
        if (req.method === "POST") {
          const at = Date.now();
          for (const [key, l] of limits) if (l.until <= at) limits.delete(key);
          const key = req.socket.remoteAddress || "unknown";
          const l = limits.get(key) || { count: 0, until: at + 60000 };
          if (limits.size > 2000 || ++l.count > 120)
            throw new DomainError(
              "API mutation rate limit reached. Try again in one minute.",
              429,
            );
          limits.set(key, l);
        }
        if (path === "/api/session" && req.method === "POST") {
          const input = await body(req, 4096);
          if (!auth.required)
            throw new DomainError(
              "Owner authentication is not configured.",
              400,
            );
          const result = auth.login(req, input.token);
          if (result.cookie) res.setHeader("Set-Cookie", result.cookie);
          return json(
            result.status,
            result.error
              ? { error: result.error }
              : { csrf: result.csrf, expires: result.expires },
          );
        }
        if (!auth.allowed(req))
          throw new DomainError(
            "Owner authentication or a valid session CSRF token is required.",
            401,
          );
        if (path === "/api/session" && req.method === "GET") {
          const session = auth.session(req);
          return json(200, {
            csrf: session?.csrf || null,
            expires: session?.expires || null,
            authenticated: true,
          });
        }
        if (path === "/api/logout" && req.method === "POST") {
          res.setHeader("Set-Cookie", auth.logout(req));
          return json(200, { ok: true });
        }
        if (path === "/api/state" && req.method === "GET")
          return json(200, { state: engine.state });
        if (path === "/api/audit" && req.method === "GET")
          return json(200, {
            verification: store.verify(),
            records: store.audit(),
            messages: engine.state.messages,
          });
        if (path === "/api/operations" && req.method === "GET")
          return json(200, {
            worker: runner.metrics(),
            audit: store.verify(),
            jobs: store.jobs
              .list()
              .map(({ leaseToken, leaseUntil, ...job }) => job),
          });
        if (req.method !== "POST" || !path.startsWith("/api/actions/"))
          throw new DomainError("Endpoint not found.", 404);
        const action = path.slice("/api/actions/".length),
          input = await body(req, action === "source" ? 400000 : 65536);
        if (action === "run")
          return json(200, { task: await runner.execute(input) });
        if (action === "enqueue")
          return json(202, { job: runner.enqueue(input) });
        if (!Object.hasOwn(methods, action))
          throw new DomainError("Unknown action.", 404);
        const result = change(() => engine[methods[action]](input));
        if (action === "pause" || action === "cancel") {
          runner.interruptInvalid();
          if (action === "cancel")
            store.jobs.cancelQueued(input.companyId, input.taskId);
        }
        return json(200, { ok: true, result: result ?? null });
      }
      if (!["GET", "HEAD"].includes(req.method))
        throw new DomainError("Method not allowed.", 405);
      if (!Object.hasOwn(mime, path))
        throw new DomainError("File not found.", 404);
      const data = await readFile(
        resolve(publicDir, path === "/" ? "index.html" : path.slice(1)),
      );
      res.writeHead(200, { "Content-Type": mime[path] });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (error) {
      if (!res.headersSent)
        json(error instanceof DomainError ? error.status : 500, {
          error:
            error instanceof DomainError
              ? error.message
              : "Internal server error.",
        });
      else res.end();
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  if (worker) server.on("listening", () => runner.start());
  server.on("close", () => void runner.stop());
  return { server, engine, runner, change };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.umask(0o077);
  const host = process.env.HOST || "127.0.0.1",
    port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("PORT must be between 1 and 65535.");
  const store = openStore(
    resolve(process.env.FROBOT_DATA_DIR || "data", "frobot.sqlite"),
  );
  const { server, runner } = createApp({
    store,
    host,
    ownerToken: process.env.FROBOT_OWNER_TOKEN || "",
    secureCookie: process.env.FROBOT_SECURE_COOKIE === "true",
    concurrency: Number(process.env.FROBOT_CONCURRENCY || 2),
    maxDailyCalls: Number(process.env.FROBOT_DAILY_MODEL_CALLS || 80),
    maxCompanyDailyCalls: Number(
      process.env.FROBOT_COMPANY_DAILY_MODEL_CALLS || 40,
    ),
  });
  server.listen(port, host, () =>
    console.log(
      `FROBOT v0.2 ready at http://${host.includes(":") ? "[" + host + "]" : host}:${port}\n${process.env.ANTHROPIC_API_KEY ? "Bounded four-stage AI workflows enabled" : "Deterministic workflows · Source-backed ledger calculations available"}\n${process.env.FROBOT_OWNER_TOKEN ? "Owner sessions enabled" : "Local fictional pilot · Loopback only"}`,
    ),
  );
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    const timeout = setTimeout(() => process.exit(1), 5000);
    timeout.unref();
    await runner.stop();
    server.close(() => {
      store.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
