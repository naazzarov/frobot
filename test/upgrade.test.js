import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Engine, emptyState } from "../public/core.js";
import {
  SAMPLE_LEDGER,
  parseLedger,
  parseAmount,
  summarizeLedger,
  ledgerReport,
} from "../public/finance.js";
import { executeWorkflow, deterministicStage } from "../public/workflow.js";
import { createAuth } from "../src/auth.js";
import { createProvider } from "../src/providers.js";
import { createApp } from "../src/server.js";
import { openStore } from "../src/store.js";
const owner = "test-owner-credential-at-least-32-characters";
function domain() {
  const e = new Engine(emptyState());
  const c = e.createCompany({ name: "Example" });
  return { e, c };
}
async function apiFixture(t, options = {}) {
  const store = openStore(":memory:");
  const app = createApp({ store, worker: false, ...options });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const url = `http://127.0.0.1:${app.server.address().port}`;
  t.after(async () => {
    await app.runner.stop();
    app.server.closeAllConnections();
    await new Promise((r) => app.server.close(r));
    store.close();
  });
  const request = async (path, input, headers = {}) => {
    const response = await fetch(url + path, {
      method: input ? "POST" : "GET",
      headers: {
        ...(input ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  };
  return { ...app, store, request };
}
async function until(fn) {
  const end = Date.now() + 3000;
  while (!fn()) {
    if (Date.now() > end) throw Error("Timed out waiting for workflow");
    await new Promise((r) => setTimeout(r, 5));
  }
}

test("cash report reconciles known source totals using exact minor units", () => {
  const d = {
    id: "source",
    name: "Fictional",
    synthetic: true,
    ...parseLedger(SAMPLE_LEDGER),
  };
  const s = summarizeLedger(d);
  assert.equal(s.rowCount, 12);
  assert.equal(s.inflowCents, 1190050);
  assert.equal(s.outflowCents, 207115);
  assert.equal(s.netCents, 982935);
  assert.deepEqual(s.uncategorized, ["row_0012"]);
  assert.equal(
    s.months.reduce((n, m) => n + m.netCents, 0),
    s.netCents,
  );
  assert.match(ledgerReport(d), /\$9,829\.35/);
  assert.equal(parseAmount("0.10") + parseAmount("0.20"), 30);
});
test("CSV parser supports BOM, CRLF, escaped quotes, and multiline descriptions", () => {
  const csv =
    '\uFEFFdate,description,amount,currency,category\r\n2026-01-01,"A, ""quoted""\nentry",-10.25,USD,Ops\r\n';
  const { rows } = parseLedger(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].description, 'A, "quoted"\nentry');
  assert.equal(rows[0].amountCents, -1025);
  assert.equal(rows[0].sourceRecord, 2);
});
test("invalid and ambiguous financial inputs fail closed", () => {
  for (const value of [
    "NaN",
    "1e3",
    "1,000",
    "USD 12",
    "0.001",
    "Infinity",
    "-",
    "1000000001",
  ])
    assert.throws(() => parseAmount(value));
  for (const csv of [
    "date,description,amount,currency\n2026-02-31,Invalid,1,USD",
    "date,description,amount,currency\n2026-01-01,A,1,USD\n2026-01-02,B,1,EUR",
    "date,description,amount,currency\n2026-01-01,A,1.25,JPY",
    'date,description,amount,currency\n2026-01-01,"A,1,USD',
    "date,date,amount,currency\n2026-01-01,A,1,USD",
  ])
    assert.throws(() => parseLedger(csv));
});
test("potential duplicates remain in totals and are explicitly flagged", () => {
  const d = {
    id: "d",
    ...parseLedger(
      "date,description,amount,currency\n2026-01-01,A,0.10,USD\n2026-01-01,A,0.10,USD",
    ),
  };
  const s = summarizeLedger(d);
  assert.equal(s.netCents, 20);
  assert.deepEqual(s.duplicates, [{ id: "row_0002", duplicateOf: "row_0001" }]);
});
test("source import is bounded, immutable, duplicate-aware, and company scoped", () => {
  const { e, c } = domain();
  const other = e.createCompany({ name: "Other" });
  const d = e.importLedger({
    companyId: c.id,
    name: "Source",
    csv: SAMPLE_LEDGER,
  });
  assert.throws(
    () =>
      e.importLedger({ companyId: c.id, name: "Again", csv: SAMPLE_LEDGER }),
    /already been imported/,
  );
  assert.throws(
    () =>
      e.createTask({
        companyId: other.id,
        title: "Cash report",
        department: "CFO",
        ledgerId: d.id,
      }),
    /Source not found/,
  );
  const tooMany =
    "date,description,amount,currency\n" +
    Array.from({ length: 1001 }, (_, i) => `2026-01-01,${i},1,USD`).join("\n");
  assert.throws(() => parseLedger(tooMany), /1,000/);
});
test("knowledge edits preserve history, reject stale versions, and enforce company scope", () => {
  const { e, c } = domain();
  const other = e.createCompany({ name: "Other" });
  const k = e.addKnowledge({
    companyId: c.id,
    title: "Policy",
    content: "Original",
  });
  e.updateKnowledge({
    companyId: c.id,
    knowledgeId: k.id,
    expectedVersion: 1,
    title: "Policy",
    content: "Revised",
  });
  assert.equal(k.version, 2);
  assert.equal(k.revisions[0].content, "Original");
  assert.throws(
    () =>
      e.updateKnowledge({
        companyId: c.id,
        knowledgeId: k.id,
        expectedVersion: 1,
        title: "Wrong",
        content: "Wrong",
      }),
    /changed/,
  );
  assert.throws(
    () =>
      e.updateKnowledge({
        companyId: other.id,
        knowledgeId: k.id,
        expectedVersion: 2,
        title: "Wrong",
        content: "Wrong",
      }),
    /not found/,
  );
});
test("approval is invalid if the exact approved payload is altered", () => {
  const { e, c } = domain();
  const task = e.createTask({
    companyId: c.id,
    title: "Financial proposal",
    kind: "spend",
    amount: 5,
  });
  e.decide({
    companyId: c.id,
    approvalId: e.state.approvals[0].id,
    decision: "approve",
    note: "Draft only",
  });
  task.amount = 500;
  assert.throws(
    () => e.begin({ companyId: c.id, taskId: task.id }),
    /exact mission payload/,
  );
});
test("CFO workflow executes all four stages and carries independently calculated evidence", async () => {
  const { e, c } = domain();
  const d = e.importLedger({
    companyId: c.id,
    name: "Sample",
    csv: SAMPLE_LEDGER,
    synthetic: true,
  });
  const task = e.createTask({
    companyId: c.id,
    title: "Cash report",
    department: "CFO",
    ledgerId: d.id,
  });
  const context = e.begin({ companyId: c.id, taskId: task.id });
  const result = await executeWorkflow(context, null, {
    checkpoint: async (entry) =>
      e.checkpoint({
        companyId: c.id,
        taskId: task.id,
        runId: context.runId,
        entry,
      }),
  });
  e.finish({
    companyId: c.id,
    taskId: task.id,
    runId: context.runId,
    ...result,
  });
  assert.equal(task.status, "done");
  assert.equal(task.trace.length, 4);
  assert.equal(task.verification.netCents, 982935);
  assert.match(task.artifact, /row_0012/);
  assert.match(task.artifact, /No AI request was made/);
});
test("unknown evidence IDs prevent a model result from being completed", async (t) => {
  const provider = {
    name: "injected",
    generateStage: async (stage, ctx, out) =>
      stage === "specialist"
        ? { artifact: "Unsupported", evidenceIds: ["another-company-secret"] }
        : deterministicStage(stage, ctx, out),
  };
  const { request, engine } = await apiFixture(t, { provider });
  const task = engine.state.tasks.find((t) => t.status === "queued");
  const run = await request("/api/actions/run", {
    companyId: task.companyId,
    taskId: task.id,
  });
  assert.equal(run.status, 502);
  assert.equal(engine.task(task.companyId, task.id).status, "failed");
  assert.equal(engine.task(task.companyId, task.id).artifact, null);
  assert.equal(engine.task(task.companyId, task.id).trace.length, 2);
});
test("reviewer rejection retains trace and withholds the final artifact", async (t) => {
  const provider = {
    name: "injected",
    generateStage: async (stage, ctx, out) =>
      stage === "reviewer"
        ? {
            passed: false,
            issues: ["Acceptance not met"],
            summary: "Needs revision",
          }
        : deterministicStage(stage, ctx, out),
  };
  const { request, engine } = await apiFixture(t, { provider });
  const task = engine.state.tasks.find((t) => t.status === "queued");
  assert.equal(
    (
      await request("/api/actions/run", {
        companyId: task.companyId,
        taskId: task.id,
      })
    ).status,
    502,
  );
  const after = engine.task(task.companyId, task.id);
  assert.equal(after.status, "failed");
  assert.equal(after.trace.length, 4);
  assert.equal(after.artifact, null);
});
test("session cookie is HttpOnly, mutations need CSRF, and logout revokes access", async (t) => {
  const { request } = await apiFixture(t, {
    ownerToken: owner,
    secureCookie: true,
  });
  const login = await request("/api/session", { token: owner });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.ok(!cookie.includes(owner));
  const Cookie = cookie.split(";")[0];
  assert.equal((await request("/api/state", null, { Cookie })).status, 200);
  assert.equal(
    (await request("/api/actions/company", { name: "No CSRF" }, { Cookie }))
      .status,
    401,
  );
  assert.equal(
    (
      await request(
        "/api/actions/company",
        { name: "With CSRF" },
        { Cookie, "X-Frobot-CSRF": login.data.csrf },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "/api/logout",
        {},
        { Cookie, "X-Frobot-CSRF": login.data.csrf },
      )
    ).status,
    200,
  );
  assert.equal((await request("/api/state", null, { Cookie })).status, 401);
});
test("Owner login attempts are rate limited", async (t) => {
  const { request } = await apiFixture(t, { ownerToken: owner });
  for (let i = 0; i < 8; i++)
    assert.equal(
      (await request("/api/session", { token: "wrong" })).status,
      401,
    );
  assert.equal((await request("/api/session", { token: owner })).status, 429);
});
test("session expiry and credential rotation invalidate prior sessions", () => {
  let now = 1000;
  const auth = createAuth(owner, { now: () => now, ttl: 100 });
  const req = { headers: {}, socket: { remoteAddress: "local" } };
  const login = auth.login(req, owner);
  const cookie = login.cookie.split(";")[0];
  assert.ok(auth.allowed({ method: "GET", headers: { cookie } }));
  now = 1101;
  assert.ok(!auth.allowed({ method: "GET", headers: { cookie } }));
  const rotated = createAuth(owner + "rotated");
  assert.ok(!rotated.allowed({ method: "GET", headers: { cookie } }));
});
test("durable queue deduplicates active jobs and completes without an open browser request", async (t) => {
  const { request, runner, store, engine } = await apiFixture(t);
  const task = engine.state.tasks.find((t) => t.status === "queued"),
    input = { companyId: task.companyId, taskId: task.id };
  const first = await request("/api/actions/enqueue", input),
    second = await request("/api/actions/enqueue", input);
  assert.equal(first.status, 202);
  assert.equal(first.data.job.id, second.data.job.id);
  assert.equal(store.jobs.list().length, 1);
  await runner.tick();
  await until(() => store.jobs.list()[0].status === "done");
  assert.equal(engine.task(task.companyId, task.id).trace.length, 4);
  assert.equal(engine.task(task.companyId, task.id).status, "done");
});
test("paused or unapproved jobs cannot start and cancelled jobs cannot execute", async (t) => {
  const { request, runner, store, engine } = await apiFixture(t);
  const pending = engine.state.tasks.find(
    (t) => t.status === "awaiting_approval",
  );
  assert.equal(
    (
      await request("/api/actions/enqueue", {
        companyId: pending.companyId,
        taskId: pending.id,
      })
    ).status,
    409,
  );
  const task = engine.state.tasks.find((t) => t.status === "queued"),
    input = { companyId: task.companyId, taskId: task.id };
  await request("/api/actions/enqueue", input);
  await request("/api/actions/pause", { paused: true });
  await runner.tick();
  assert.equal(store.jobs.list()[0].status, "queued");
  await request("/api/actions/cancel", input);
  await request("/api/actions/pause", { paused: false });
  await runner.tick();
  assert.equal(store.jobs.list()[0].status, "cancelled");
  assert.equal(engine.task(task.companyId, task.id).status, "cancelled");
});
test("cancelled approval requests cannot be replayed", () => {
  const { e, c } = domain();
  const task = e.createTask({
    companyId: c.id,
    title: "Purchase proposal",
    kind: "spend",
  });
  e.cancel({ companyId: c.id, taskId: task.id });
  assert.equal(e.state.approvals[0].status, "withdrawn");
  assert.throws(
    () =>
      e.decide({
        companyId: c.id,
        approvalId: e.state.approvals[0].id,
        decision: "approve",
        note: "Too late",
      }),
    /already been decided/,
  );
});
test("request budgets fail closed and do not reset on explicit retries", async (t) => {
  const provider = {
    name: "anthropic",
    generateStage: async (stage, ctx, out) =>
      deterministicStage(stage, ctx, out),
  };
  const { request, engine } = await apiFixture(t, {
    provider,
    maxDailyCalls: 2,
    maxCompanyDailyCalls: 2,
  });
  const task = engine.state.tasks.find((t) => t.status === "queued"),
    input = { companyId: task.companyId, taskId: task.id };
  assert.equal((await request("/api/actions/run", input)).status, 429);
  assert.equal(engine.state.modelCalls.length, 2);
  assert.equal(engine.task(task.companyId, task.id).trace.length, 2);
  assert.equal((await request("/api/actions/run", input)).status, 429);
  assert.equal(engine.state.modelCalls.length, 2);
});
test("schedules survive restart and interrupted work is held for inspection", async () => {
  const dir = mkdtempSync(join(tmpdir(), "frobot-queue-"));
  try {
    const path = join(dir, "state.sqlite");
    let store = openStore(path),
      app = createApp({ store, worker: false });
    const task = app.engine.state.tasks.find((t) => t.status === "queued");
    const job = app.runner.enqueue({
      companyId: task.companyId,
      taskId: task.id,
      runAt: new Date(Date.now() + 60000).toISOString(),
    });
    store.close();
    store = openStore(path);
    app = createApp({ store, worker: false });
    assert.equal(store.jobs.list()[0].id, job.id);
    await app.runner.tick();
    assert.equal(store.jobs.list()[0].status, "queued");
    const claimed = store.jobs.claim(job.id);
    assert.equal(claimed, undefined);
    const queuedNow = app.engine.state.tasks.find(
      (t) => t.status === "queued" && t.id !== task.id,
    );
    const immediate = app.runner.enqueue({
      companyId: queuedNow.companyId,
      taskId: queuedNow.id,
    });
    store.jobs.claim(immediate.id);
    app.engine.begin({ companyId: queuedNow.companyId, taskId: queuedNow.id });
    store.save(app.engine.state);
    store.close();
    store = openStore(path);
    app = createApp({ store, worker: false });
    assert.equal(
      store.jobs.list().find((j) => j.id === immediate.id).status,
      "failed",
    );
    assert.equal(
      app.engine.task(queuedNow.companyId, queuedNow.id).status,
      "queued",
    );
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("provider contract bounds context and rejects malformed or truncated JSON", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const { e, c } = domain();
  const task = e.createTask({ companyId: c.id, title: "Explore operations" }),
    ctx = e.begin({ companyId: c.id, taskId: task.id });
  const provider = createProvider({
    ANTHROPIC_API_KEY: "test-only-not-a-real-key",
  });
  let sent;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    sent = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        stop_reason: "end_turn",
        content: [
          {
            type: "text",
            text: JSON.stringify(deterministicStage("executive", ctx, {})),
          },
        ],
        usage: { input_tokens: 123, output_tokens: 45 },
      }),
    };
  };
  const out = await provider.generateStage("executive", ctx, {});
  assert.equal(sent.max_tokens, 1800);
  assert.match(sent.system, /No tools are available/);
  assert.equal(out.usage.outputTokens, 45);
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ stop_reason: "max_tokens", content: [] }),
  });
  await assert.rejects(
    provider.generateStage("executive", ctx, {}),
    /truncated/,
  );
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "not JSON" }],
    }),
  });
  await assert.rejects(provider.generateStage("executive", ctx, {}), /JSON/);
});

test("online backup restores the workspace, job schedule, and verified audit head", async () => {
  const { createBackup } = await import("../scripts/backup.js");
  const dir = mkdtempSync(join(tmpdir(), "frobot-backup-"));
  try {
    const source = join(dir, "source.sqlite"),
      target = join(dir, "restored.sqlite");
    const store = openStore(source);
    const app = createApp({ store, worker: false });
    const task = app.engine.state.tasks.find((t) => t.status === "queued");
    app.runner.enqueue({
      companyId: task.companyId,
      taskId: task.id,
      runAt: new Date(Date.now() + 60000).toISOString(),
    });
    const head = store.verify().head;
    const result = createBackup(source, target);
    assert.equal(result.auditHead, head);
    assert.throws(() => createBackup(source, target), /EEXIST/);
    store.close();
    const restored = openStore(target);
    assert.equal(restored.verify().head, head);
    assert.equal(restored.jobs.list().length, 1);
    assert.equal(restored.load().companies.length, 4);
    restored.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("worker capacity bounds simultaneous provider requests", async (t) => {
  let release;
  const provider = {
    name: "injected",
    generate: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  };
  const { request, engine } = await apiFixture(t, { provider, concurrency: 1 });
  const [a, b] = engine.state.tasks.filter((t) => t.status === "queued");
  const running = request("/api/actions/run", {
    companyId: a.companyId,
    taskId: a.id,
  });
  await until(() => !!release);
  assert.equal(
    (
      await request("/api/actions/run", {
        companyId: b.companyId,
        taskId: b.id,
      })
    ).status,
    429,
  );
  release("Bounded draft");
  assert.equal((await running).status, 200);
});

test("cancellation during a background stage discards its late result", async (t) => {
  let release;
  const provider = {
    name: "injected",
    generate: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  };
  const { request, engine, runner, store } = await apiFixture(t, { provider });
  const task = engine.state.tasks.find((t) => t.status === "queued"),
    input = { companyId: task.companyId, taskId: task.id };
  await request("/api/actions/enqueue", input);
  await runner.tick();
  await until(() => !!release);
  await request("/api/actions/cancel", input);
  release("Late result must not be stored");
  await until(() => store.jobs.list()[0].status === "cancelled");
  assert.equal(engine.task(task.companyId, task.id).status, "cancelled");
  assert.equal(engine.task(task.companyId, task.id).artifact, null);
});

test("finance narratives cannot introduce fabricated numeric claims", async () => {
  const { e, c } = domain();
  const dataset = e.importLedger({
    companyId: c.id,
    name: "Source",
    csv: SAMPLE_LEDGER,
  });
  const task = e.createTask({
    companyId: c.id,
    title: "Cash review",
    department: "CFO",
    ledgerId: dataset.id,
  });
  const context = e.begin({ companyId: c.id, taskId: task.id });
  const provider = {
    name: "test",
    generateStage: async (stage, ctx, out) =>
      stage === "specialist"
        ? { artifact: "Net cash is $999999.", evidenceIds: ["row_0001"] }
        : deterministicStage(stage, ctx, out),
  };
  await assert.rejects(executeWorkflow(context, provider), /numerical claims/);
});
test("provider context mutation cannot alter the trusted ledger calculations", async () => {
  const { e, c } = domain();
  const dataset = e.importLedger({
    companyId: c.id,
    name: "Source",
    csv: SAMPLE_LEDGER,
  });
  const task = e.createTask({
    companyId: c.id,
    title: "Cash review",
    department: "CFO",
    ledgerId: dataset.id,
  });
  const context = e.begin({ companyId: c.id, taskId: task.id });
  const provider = {
    name: "test",
    generateStage: async (stage, ctx, out) => {
      ctx.finance.rows[0].amountCents = 0;
      return deterministicStage(stage, ctx, out);
    },
  };
  const result = await executeWorkflow(context, provider);
  assert.equal(result.verification.netCents, 982935);
  assert.equal(dataset.rows[0].amountCents, 420000);
});

test("source markup is escaped in downloadable reports and model HTML is rejected", async () => {
  const { e, c } = domain();
  const source =
    'date,description,amount,currency\n2026-01-01,"<img src=x> ![remote](https://example.invalid/image)",1,USD';
  const dataset = e.importLedger({
    companyId: c.id,
    name: "<b>Source</b>",
    csv: source,
  });
  const report = ledgerReport(dataset);
  assert.ok(!report.includes("<img"));
  assert.ok(report.includes("&lt;img"));
  assert.ok(!report.includes(" ![remote]"));
  const task = e.createTask({
      companyId: c.id,
      title: "Draft",
      department: "CTO",
    }),
    context = e.begin({ companyId: c.id, taskId: task.id });
  const provider = {
    name: "test",
    generateStage: async (stage, ctx, out) =>
      stage === "specialist"
        ? { artifact: '<img src="https://example.invalid">', evidenceIds: [] }
        : deterministicStage(stage, ctx, out),
  };
  await assert.rejects(executeWorkflow(context, provider), /raw HTML/);
});
