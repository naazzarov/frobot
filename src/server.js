import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { timingSafeEqual } from "node:crypto";
import { Engine, DomainError } from "../public/core.js";
import { openStore } from "./store.js";
import { createProvider } from "./providers.js";

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const mime = {
  "/": "text/html; charset=utf-8",
  "/index.html": "text/html; charset=utf-8",
  "/app.js": "text/javascript; charset=utf-8",
  "/core.js": "text/javascript; charset=utf-8",
  "/styles.css": "text/css; charset=utf-8",
  "/favicon.svg": "image/svg+xml",
};
const equal = (a, b) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
const methods = {
  company: "createCompany",
  mission: "createTask",
  decision: "decide",
  pause: "pause",
  knowledge: "addKnowledge",
  policy: "updatePolicy",
};
export function createApp({
  store,
  provider = createProvider(),
  ownerToken = "",
  host = "127.0.0.1",
} = {}) {
  const loopback = ["127.0.0.1", "localhost", "::1"].includes(host);
  if (!loopback && ownerToken.length < 32)
    throw Error(
      "Non-loopback binding requires FROBOT_OWNER_TOKEN of at least 32 characters.",
    );
  if (ownerToken && ownerToken.length < 32)
    throw Error("FROBOT_OWNER_TOKEN must be at least 32 characters.");
  const engine = new Engine(store.load()),
    controllers = new Map();
  // Recover durable work after process termination. Stale provider results cannot complete these runs.
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
      store.save(engine.state);
      return value;
    } catch (e) {
      engine.state = before;
      throw e;
    }
  }
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
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
          version: "0.1.0",
          authRequired: !!ownerToken,
          aiConfigured: provider.name !== "template",
          mode: "server",
        });
      if (path.startsWith("/api/")) {
        if (
          ownerToken &&
          !equal(req.headers.authorization || "", `Bearer ${ownerToken}`)
        )
          throw new DomainError("Owner authentication required.", 401);
        if (path === "/api/state" && req.method === "GET")
          return json(200, { state: engine.state });
        if (path === "/api/audit" && req.method === "GET")
          return json(200, {
            verification: store.verify(),
            records: store.audit(),
            messages: engine.state.messages,
          });
        if (req.method !== "POST" || !path.startsWith("/api/actions/"))
          throw new DomainError("Endpoint not found.", 404);
        if (!req.headers["content-type"]?.startsWith("application/json"))
          throw new DomainError("Content-Type must be application/json.", 415);
        let chunks = [],
          size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 65536)
            throw new DomainError("Request body exceeds 64 KiB.", 413);
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
        const action = path.slice("/api/actions/".length);
        if (action === "run") {
          // begin is persisted synchronously before awaiting a provider: concurrent duplicates fail closed.
          const context = change(() => engine.begin(input));
          const controller = new AbortController();
          controllers.set(context.runId, controller);
          try {
            const artifact = await provider.generate(
              context,
              controller.signal,
            );
            const task = change(() =>
              engine.finish({
                ...input,
                runId: context.runId,
                artifact,
                provider: provider.name,
              }),
            );
            return json(200, { task });
          } catch (error) {
            const current = engine.task(input.companyId, input.taskId);
            if (current.status !== "running" || current.runId !== context.runId)
              throw new DomainError(
                "Run was interrupted. Its result has been discarded.",
                409,
              );
            change(() => engine.failRun({ ...input, runId: context.runId }));
            if (error instanceof DomainError) throw error;
            throw new DomainError(
              "Draft provider could not complete this run. Check server configuration and retry.",
              502,
            );
          } finally {
            controllers.delete(context.runId);
          }
        }
        if (!Object.hasOwn(methods, action))
          throw new DomainError("Unknown action.", 404);
        const value = change(() => engine[methods[action]](input));
        if (action === "pause" && input.paused)
          for (const [runId, controller] of controllers) {
            if (
              !engine.state.tasks.some(
                (t) => t.runId === runId && t.status === "running",
              )
            )
              controller.abort();
          }
        return json(200, { ok: true, result: value ?? null });
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
  server.on("close", () => {
    for (const controller of controllers.values()) controller.abort();
  });
  return { server, engine };
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
  const { server } = createApp({
    store,
    host,
    ownerToken: process.env.FROBOT_OWNER_TOKEN || "",
  });
  server.listen(port, host, () =>
    console.log(
      `FROBOT ready at http://${host.includes(":") ? "[" + host + "]" : host}:${port}\n${process.env.ANTHROPIC_API_KEY ? "AI-generated drafts enabled" : "Template mode · No AI key required"}\n${process.env.FROBOT_OWNER_TOKEN ? "Owner authentication enabled" : "Local demo · Fictional data · Loopback only"}`,
    ),
  );
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    server.close(() => {
      store.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
