import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Engine,
  emptyState,
  seedState,
  templateResult,
} from "../public/core.js";

function workspace() {
  const e = new Engine(emptyState());
  const a = e.createCompany({ name: "Alpha", sector: "Technology" });
  const b = e.createCompany({ name: "Beta", sector: "Agriculture" });
  return { e, a, b };
}
test("new companies receive six executives and fourteen managers, with isolated IDs", () => {
  const { e, a, b } = workspace();
  for (const company of [a, b]) {
    const roster = e.state.agents.filter((v) => v.companyId === company.id);
    assert.equal(roster.filter((v) => v.tier === "executive").length, 6);
    assert.equal(roster.filter((v) => v.tier === "manager").length, 14);
    assert.ok(
      roster
        .filter((v) => v.tier === "manager")
        .every((m) => roster.some((x) => x.id === m.parentId)),
    );
  }
  assert.equal(new Set(e.state.agents.map((a) => a.id)).size, 40);
});
test("mission workflow scopes context, delegates, stores result, and archives staff", () => {
  const { e, a, b } = workspace();
  e.addKnowledge({
    companyId: a.id,
    title: "Alpha policy",
    content: "Alpha only",
  });
  e.addKnowledge({
    companyId: b.id,
    title: "Beta secret",
    content: "Beta only",
  });
  const t = e.createTask({
    companyId: a.id,
    title: "Design onboarding",
    brief: "Outline acceptance criteria",
    department: "CTO",
  });
  assert.throws(() => e.task(b.id, t.id), /not found/);
  const context = e.begin({ companyId: a.id, taskId: t.id });
  assert.equal(context.knowledge.length, 1);
  assert.equal(context.knowledge[0].content, "Alpha only");
  assert.throws(
    () => e.begin({ companyId: a.id, taskId: t.id }),
    /Only queued/,
  );
  e.finish({
    companyId: a.id,
    taskId: t.id,
    runId: context.runId,
    artifact: templateResult(context),
  });
  assert.equal(t.status, "done");
  assert.equal(
    e.state.agents.find((a) => a.id === t.staffId).status,
    "archived",
  );
  assert.ok(t.artifact.includes("Planning template"));
  assert.equal(e.state.messages.filter((m) => m.taskId === t.id).length, 5);
});
test("sensitive actions fail closed, even when mislabeled as internal drafts", () => {
  for (const title of [
    "Send an announcement",
    "Purchase new equipment",
    "Prepare a legal contract",
    "Hire a designer",
    "Review a $1 expense",
  ]) {
    const { e, a } = workspace();
    const t = e.createTask({ companyId: a.id, title, kind: "draft" });
    assert.equal(t.status, "awaiting_approval", title);
    assert.throws(
      () => e.begin({ companyId: a.id, taskId: t.id }),
      /Only queued/,
    );
  }
});
test("approval is company-scoped, requires a note, and cannot be replayed", () => {
  const { e, a, b } = workspace();
  const t = e.createTask({
    companyId: a.id,
    title: "Budget proposal",
    kind: "spend",
    amount: 10,
  });
  const approval = e.state.approvals[0];
  assert.throws(
    () =>
      e.decide({
        companyId: b.id,
        approvalId: approval.id,
        decision: "approve",
        note: "Okay",
      }),
    /not found/,
  );
  assert.throws(
    () =>
      e.decide({
        companyId: a.id,
        approvalId: approval.id,
        decision: "approve",
        note: "",
      }),
    /Decision note/,
  );
  assert.equal(t.status, "awaiting_approval");
  e.decide({
    companyId: a.id,
    approvalId: approval.id,
    decision: "approve",
    note: "Prepare a recommendation only.",
  });
  assert.equal(t.status, "queued");
  assert.throws(
    () =>
      e.decide({
        companyId: a.id,
        approvalId: approval.id,
        decision: "reject",
        note: "Again",
      }),
    /already been decided/,
  );
  assert.doesNotThrow(() => e.begin({ companyId: a.id, taskId: t.id }));
});
test("rejected proposals can never run", () => {
  const { e, a } = workspace();
  const t = e.createTask({
    companyId: a.id,
    title: "Financial proposal",
    kind: "spend",
  });
  e.decide({
    companyId: a.id,
    approvalId: e.state.approvals[0].id,
    decision: "reject",
    note: "Outside current strategy.",
  });
  assert.throws(
    () => e.begin({ companyId: a.id, taskId: t.id }),
    /Only queued/,
  );
});
test("kill switch invalidates in-flight results and permits controlled resumption", () => {
  const { e, a } = workspace();
  const t = e.createTask({ companyId: a.id, title: "Explore onboarding" });
  const context = e.begin({ companyId: a.id, taskId: t.id });
  e.pause({ paused: true });
  assert.equal(t.status, "queued");
  assert.throws(
    () =>
      e.finish({
        companyId: a.id,
        taskId: t.id,
        runId: context.runId,
        artifact: "stale result",
      }),
    /interrupted/,
  );
  assert.throws(() => e.begin({ companyId: a.id, taskId: t.id }), /paused/);
  e.pause({ paused: false });
  const retry = e.begin({ companyId: a.id, taskId: t.id });
  assert.notEqual(context.runId, retry.runId);
});
test("pausing a supervisor affects their tasks but leaves other companies running", () => {
  const { e, a, b } = workspace();
  const ta = e.createTask({
      companyId: a.id,
      title: "Research a workflow",
      department: "CTO",
    }),
    tb = e.createTask({
      companyId: b.id,
      title: "Research soil",
      department: "CSO",
    });
  e.begin({ companyId: a.id, taskId: ta.id });
  e.begin({ companyId: b.id, taskId: tb.id });
  const exec = e.state.agents.find(
    (x) => x.companyId === a.id && x.code === "CTO" && x.tier === "executive",
  );
  e.pause({ companyId: a.id, agentId: exec.id, paused: true });
  assert.equal(ta.status, "queued");
  assert.equal(tb.status, "running");
  assert.throws(
    () => e.begin({ companyId: a.id, taskId: ta.id }),
    /supervising agent/,
  );
});
test("idempotency is scoped per company and prevents duplicate missions", () => {
  const { e, a, b } = workspace();
  const input = {
    companyId: a.id,
    title: "Explore workflow",
    idempotencyKey: "request-123",
  };
  assert.equal(e.createTask(input).id, e.createTask(input).id);
  e.createTask({ ...input, companyId: b.id });
  assert.equal(e.state.tasks.length, 2);
});
test("demo data is usable and contains both approved templates and pending reviews", () => {
  const state = seedState();
  assert.equal(state.companies.length, 4);
  assert.equal(state.tasks.filter((t) => t.status === "done").length, 2);
  assert.equal(state.approvals.filter((t) => t.status === "pending").length, 2);
});
