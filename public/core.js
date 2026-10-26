import { parseLedger } from "./finance.js";
// Shared domain engine: used unchanged by the browser sandbox and Node server.
export const ROLES = [
  {
    code: "CEO",
    name: "Chief Executive",
    area: "Leadership",
    color: "#a892ee",
    managers: ["Chief of Staff"],
    purpose: "Turn owner direction into a coordinated operating plan.",
  },
  {
    code: "CTO",
    name: "Chief Technology",
    area: "Technology",
    color: "#73a6e9",
    managers: ["Engineering", "Infrastructure & DevOps", "Data & AI"],
    purpose: "Design, build, test, and maintain the company’s technology.",
  },
  {
    code: "CFO",
    name: "Chief Financial",
    area: "Finance",
    color: "#e8b36b",
    managers: ["Accounting", "Treasury & Payments", "Compliance & Tax"],
    purpose: "Prepare budgets, reconcile records, and surface financial risks.",
  },
  {
    code: "CMO",
    name: "Chief Marketing",
    area: "Marketing",
    color: "#d88fbd",
    managers: ["Brand & Content", "Growth & Performance"],
    purpose: "Develop the brand, content, and measurable growth experiments.",
  },
  {
    code: "CBO",
    name: "Chief Business",
    area: "Business",
    color: "#76c5bd",
    managers: ["Partnerships", "Sales Pipeline", "New Ventures"],
    purpose: "Research opportunities and prepare partnership and sales plans.",
  },
  {
    code: "CSO",
    name: "Chief Strategy",
    area: "Strategy",
    color: "#a9bd77",
    managers: ["Strategic Planning", "Risk & Legal"],
    purpose:
      "Track objectives, evaluate markets, and maintain the risk register.",
  },
];
export const KINDS = [
  "research",
  "draft",
  "spend",
  "legal",
  "hiring",
  "communication",
];
export class DomainError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status) => {
  throw new DomainError(message, status);
};
const id = (prefix) => `${prefix}_${globalThis.crypto.randomUUID()}`;
const now = () => new Date().toISOString();
const text = (value, label, max = 4000) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail(`${label} must be 1–${max} characters.`);
  return value.trim();
};
export function emptyState() {
  return {
    version: 1,
    paused: false,
    companies: [],
    agents: [],
    tasks: [],
    approvals: [],
    events: [],
    messages: [],
    knowledge: [],
  };
}
export class Engine {
  constructor(state = emptyState()) {
    this.state = state;
    this.state.ledgers ||= [];
    this.state.modelCalls ||= [];
  }
  company(companyId) {
    return (
      this.state.companies.find((c) => c.id === companyId) ||
      fail("Company not found.", 404)
    );
  }
  task(companyId, taskId) {
    this.company(companyId);
    return (
      this.state.tasks.find(
        (t) => t.id === taskId && t.companyId === companyId,
      ) || fail("Task not found in this company.", 404)
    );
  }
  event(companyId, type, summary, actor = "Owner", taskId = null) {
    const event = {
      id: id("evt"),
      companyId,
      type,
      summary,
      actor,
      taskId,
      at: now(),
    };
    this.state.events.push(event);
    return event;
  }
  message(task, sender, recipient, intent, payload) {
    this.state.messages.push({
      id: id("msg"),
      companyId: task.companyId,
      taskId: task.id,
      sender,
      recipient,
      intent,
      payload,
      priority: task.priority,
      deadline: task.deadline,
      at: now(),
    });
  }
  createCompany(input) {
    const name = text(input.name, "Company name", 60);
    const sector = text(input.sector || "Technology", "Sector", 60);
    const mission = text(
      input.mission || "Build a sustainable, owner-led business.",
      "Mission",
      1000,
    );
    if (this.state.companies.length >= 30)
      fail("This workspace supports up to 30 companies.");
    if (
      this.state.companies.some(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      )
    )
      fail("A company with this name already exists.", 409);
    const company = {
      id: id("co"),
      name,
      sector,
      mission,
      color: ["#9db1fe", "#a7c49c", "#e2bc80", "#ceabdc"][
        this.state.companies.length % 4
      ],
      paused: false,
      createdAt: now(),
      policy: { spendLimit: 250, requireApproval: true },
    };
    this.state.companies.push(company);
    for (const role of ROLES) {
      const exec = {
        id: id("agent"),
        companyId: company.id,
        code: role.code,
        name: role.name,
        tier: "executive",
        parentId: "owner",
        status: "idle",
        paused: false,
        purpose: role.purpose,
      };
      this.state.agents.push(exec);
      for (const name of role.managers)
        this.state.agents.push({
          id: id("agent"),
          companyId: company.id,
          code: role.code,
          name: `${name} Manager`,
          tier: "manager",
          parentId: exec.id,
          status: "idle",
          paused: false,
          purpose: `Manage ${name.toLowerCase()} deliverables within ${company.name}.`,
        });
    }
    this.event(
      company.id,
      "company.created",
      `${name} launched with 6 executives and 14 managers.`,
    );
    return company;
  }
  createTask(input) {
    const company = this.company(input.companyId);
    const title = text(input.title, "Mission title", 160);
    const brief = text(input.brief || title, "Mission brief", 6000);
    const code = input.department || this.route(title + " " + brief);
    if (!ROLES.some((r) => r.code === code)) fail("Unknown department.");
    const kind = input.kind || "draft";
    if (!KINDS.includes(kind)) fail("Unknown action type.");
    const amount = Number(input.amount || 0);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1e9)
      fail("Amount must be between 0 and 1,000,000,000 USD.");
    const deadline = input.deadline || null;
    if (deadline && !Number.isFinite(Date.parse(deadline)))
      fail("Invalid deadline.");
    if (input.priority && !["normal", "high"].includes(input.priority))
      fail("Invalid priority.");
    if (
      input.idempotencyKey &&
      (typeof input.idempotencyKey !== "string" ||
        input.idempotencyKey.length > 100)
    )
      fail("Invalid idempotency key.");
    if (input.idempotencyKey) {
      const existing = this.state.tasks.find(
        (t) =>
          t.companyId === company.id &&
          t.idempotencyKey === input.idempotencyKey,
      );
      if (existing) return existing;
    }
    const ledgerId = input.ledgerId || null;
    if (
      ledgerId &&
      !this.state.ledgers.some(
        (d) => d.id === ledgerId && d.companyId === company.id,
      )
    )
      fail("Source not found in this company.", 404);
    if (ledgerId && code !== "CFO")
      fail("Ledger workflows must be led by the CFO.");
    const risk = this.risk({ kind, title, brief, amount }, company);
    const task = {
      id: id("task"),
      companyId: company.id,
      title,
      brief,
      department: code,
      kind,
      amount,
      deadline,
      priority: input.priority || "normal",
      risk,
      status: risk.length ? "awaiting_approval" : "queued",
      createdAt: now(),
      updatedAt: now(),
      idempotencyKey: input.idempotencyKey || null,
      artifact: null,
      provider: null,
      runId: null,
      staffId: null,
      ledgerId,
      trace: [],
      attempts: 0,
      verification: null,
    };
    this.state.tasks.push(task);
    const exec = this.state.agents.find(
      (a) =>
        a.companyId === company.id && a.code === code && a.tier === "executive",
    );
    this.message(task, "owner", exec.id, "directive", { title, brief });
    this.event(
      company.id,
      "task.created",
      `Mission received: ${title}`,
      "Owner",
      task.id,
    );
    if (risk.length) {
      this.state.approvals.push({
        id: id("approval"),
        companyId: company.id,
        taskId: task.id,
        reasons: risk,
        scope: this.authorizationScope(task),
        status: "pending",
        createdAt: now(),
        decidedAt: null,
        note: null,
      });
      this.event(
        company.id,
        "approval.requested",
        `Owner review required: ${risk.join("; ")}`,
        code,
        task.id,
      );
    }
    return task;
  }
  route(input) {
    if (
      /budget|cash|invoice|financ|spend|bookkeep|payroll|expense/i.test(input)
    )
      return "CFO";
    if (/code|build|engineer|software|deploy|test|website|product/i.test(input))
      return "CTO";
    if (/brand|content|campaign|marketin|social|growth/i.test(input))
      return "CMO";
    if (/partner|sales|pipeline|lead|venture/i.test(input)) return "CBO";
    if (/strategy|risk|competitor|market|okr|legal/i.test(input)) return "CSO";
    return "CEO";
  }
  risk(task, company) {
    const reasons = [];
    const corpus = `${task.title} ${task.brief}`;
    if (task.kind === "spend" || task.amount > 0)
      reasons.push(
        task.amount > company.policy.spendLimit
          ? `Proposed spend exceeds $${company.policy.spendLimit} review threshold`
          : "Financial commitment",
      );
    if (
      task.kind === "legal" ||
      /\b(contract|legal|tax|filing|signature|agreement)\b/i.test(corpus)
    )
      reasons.push("Legal or regulatory exposure");
    if (
      task.kind === "hiring" ||
      /\b(hire|hiring|payroll|terminate|dismiss)\b/i.test(corpus)
    )
      reasons.push("Employment decision");
    if (
      task.kind === "communication" ||
      /\b(send|publish|post|email|whatsapp|announce|contact)\b/i.test(corpus)
    )
      reasons.push("External communication");
    if (
      /\b(buy|purchase|payment|transfer|spend|bank)\b|[$€£¥]\s*\d/i.test(
        corpus,
      ) &&
      !reasons.some((r) => /commitment|spend/.test(r))
    )
      reasons.push("Potential financial commitment");
    return reasons;
  }
  decide(input) {
    const company = this.company(input.companyId);
    const approval =
      this.state.approvals.find(
        (a) => a.id === input.approvalId && a.companyId === company.id,
      ) || fail("Approval not found.", 404);
    if (approval.status !== "pending")
      fail("This approval has already been decided.", 409);
    if (!["approve", "reject"].includes(input.decision))
      fail("Decision must be approve or reject.");
    const note = text(input.note, "Decision note", 1000);
    const task = this.task(company.id, approval.taskId);
    if (task.status !== "awaiting_approval")
      fail("Mission no longer awaits this decision.", 409);
    approval.scope = this.authorizationScope(task);
    approval.status = input.decision === "approve" ? "approved" : "rejected";
    approval.note = note;
    approval.decidedAt = now();
    task.status = approval.status === "approved" ? "queued" : "rejected";
    task.updatedAt = now();
    this.event(
      company.id,
      `approval.${approval.status}`,
      `${approval.status === "approved" ? "Approved" : "Rejected"}: ${task.title}. Note: ${note}`,
      "Owner",
      task.id,
    );
    return approval;
  }
  authorizationScope(task) {
    return JSON.stringify({
      companyId: task.companyId,
      title: task.title,
      brief: task.brief,
      department: task.department,
      kind: task.kind,
      amount: task.amount,
      ledgerId: task.ledgerId || null,
    });
  }
  assertRunnable(input) {
    const company = this.company(input.companyId);
    const task = this.task(company.id, input.taskId);
    if (this.state.paused || company.paused)
      fail("Execution is paused by the Owner.", 409);
    if (task.status !== "queued" && task.status !== "failed")
      fail("Only queued or failed missions can run.", 409);
    if (
      this.state.approvals.some(
        (a) => a.taskId === task.id && a.status !== "approved",
      )
    )
      fail("Owner approval is required.", 409);
    if (
      task.risk.length &&
      !this.state.approvals.some(
        (a) =>
          a.taskId === task.id &&
          a.status === "approved" &&
          a.scope === this.authorizationScope(task),
      )
    )
      fail(
        "Approval does not match the exact mission payload. Create a new mission for changed scope.",
        409,
      );
    const exec = this.state.agents.find(
      (a) =>
        a.companyId === company.id &&
        a.tier === "executive" &&
        a.code === task.department,
    );
    const manager = this.state.agents.find(
      (a) =>
        a.companyId === company.id &&
        a.parentId === exec.id &&
        (task.ledgerId ? a.name === "Accounting Manager" : true),
    );
    if (exec.paused || manager.paused)
      fail("A supervising agent is paused.", 409);
    return { company, task, exec, manager };
  }
  begin(input) {
    const { company, task, exec, manager } = this.assertRunnable(input);
    task.status = "running";
    task.runId = id("run");
    task.updatedAt = now();
    task.error = null;
    task.trace = [];
    task.verification = null;
    task.attempts = (task.attempts || 0) + 1;
    const staff = {
      id: id("agent"),
      companyId: company.id,
      code: task.department,
      name: `${ROLES.find((r) => r.code === task.department).area} Specialist`,
      tier: "staff",
      parentId: manager.id,
      status: "working",
      paused: false,
      purpose: task.title,
      taskId: task.id,
    };
    this.state.agents.push(staff);
    task.staffId = staff.id;
    this.message(task, exec.id, manager.id, "delegate", {
      deliverable: task.title,
    });
    this.message(task, manager.id, staff.id, "execute_draft", {
      brief: task.brief,
    });
    this.event(
      company.id,
      "task.started",
      `${task.department} → ${manager.name} → ${staff.name}`,
      task.department,
      task.id,
    );
    return {
      task: structuredClone(task),
      company: structuredClone(company),
      runId: task.runId,
      knowledge: this.state.knowledge
        .filter((k) => k.companyId === company.id)
        .map((k) => ({
          id: k.id,
          version: k.version,
          title: k.title,
          content: k.content,
        }))
        .slice(0, 30),
      finance: task.ledgerId
        ? structuredClone(
            this.state.ledgers.find(
              (d) => d.id === task.ledgerId && d.companyId === company.id,
            ),
          )
        : null,
    };
  }
  finish(input) {
    const task = this.task(input.companyId, input.taskId);
    if (task.status !== "running" || task.runId !== input.runId)
      fail("Run was interrupted. Its result has been discarded.", 409);
    const artifact = text(input.artifact, "Result", 30000);
    task.status = "done";
    task.artifact = artifact;
    task.provider = input.provider || "template";
    task.updatedAt = now();
    task.verification = input.verification || null;
    const staff = this.state.agents.find((a) => a.id === task.staffId);
    staff.status = "archived";
    this.message(task, staff.id, staff.parentId, "result", {
      artifact: "Stored on task",
      provider: task.provider,
    });
    const exec = this.state.agents.find(
      (a) =>
        a.companyId === task.companyId &&
        a.code === task.department &&
        a.tier === "executive",
    );
    this.message(task, exec.id, "owner", "report", {
      title: task.title,
      status: "done",
    });
    this.event(
      task.companyId,
      "task.completed",
      `Deliverable ready: ${task.title}`,
      task.department,
      task.id,
    );
    return task;
  }
  failRun(input) {
    const task = this.task(input.companyId, input.taskId);
    if (task.status !== "running" || task.runId !== input.runId) return;
    task.status = "failed";
    task.error =
      input.message ||
      "The workflow could not complete. Inspect the stage trace and configuration before retrying.";
    task.updatedAt = now();
    const staff = this.state.agents.find((a) => a.id === task.staffId);
    if (staff) staff.status = "archived";
    this.event(
      task.companyId,
      "task.failed",
      `Run failed: ${task.title}`,
      task.department,
      task.id,
    );
  }
  pause(input) {
    if (typeof input.paused !== "boolean") fail("paused must be a boolean.");
    let companyId = null,
      label = "All companies";
    if (input.agentId) {
      const c = this.company(input.companyId);
      const agent =
        this.state.agents.find(
          (a) =>
            a.id === input.agentId &&
            a.companyId === c.id &&
            a.tier !== "staff",
        ) || fail("Agent not found.", 404);
      agent.paused = input.paused;
      companyId = c.id;
      label = agent.name;
    } else if (input.companyId) {
      const c = this.company(input.companyId);
      c.paused = input.paused;
      companyId = c.id;
      label = c.name;
    } else this.state.paused = input.paused;
    if (input.paused) {
      for (const task of this.state.tasks.filter(
        (t) =>
          t.status === "running" && (!companyId || t.companyId === companyId),
      )) {
        if (input.agentId) {
          const staff = this.state.agents.find((a) => a.id === task.staffId);
          const manager = this.state.agents.find(
            (a) => a.id === staff?.parentId,
          );
          if (![staff?.parentId, manager?.parentId].includes(input.agentId))
            continue;
        }
        task.status = "queued";
        task.runId = null;
        task.updatedAt = now();
        const staff = this.state.agents.find((a) => a.id === task.staffId);
        if (staff) staff.status = "archived";
        this.event(
          task.companyId,
          "task.interrupted",
          `Interrupted: ${task.title}. Returned to queue.`,
          "Owner",
          task.id,
        );
      }
    }
    this.event(
      companyId,
      input.paused ? "execution.paused" : "execution.resumed",
      `${label} ${input.paused ? "paused" : "resumed"} by Owner.`,
    );
  }
  checkpoint(input) {
    const task = this.task(input.companyId, input.taskId);
    if (task.status !== "running" || task.runId !== input.runId)
      fail("Run was interrupted.", 409);
    task.trace ||= [];
    task.trace.push(structuredClone(input.entry));
    task.updatedAt = now();
    this.event(
      task.companyId,
      "workflow.stage",
      `${input.entry.label} completed.`,
      input.entry.role,
      task.id,
    );
  }
  cancel(input) {
    const task = this.task(input.companyId, input.taskId);
    if (
      !["queued", "running", "failed", "awaiting_approval"].includes(
        task.status,
      )
    )
      fail("This mission cannot be cancelled.", 409);
    task.status = "cancelled";
    task.runId = null;
    task.updatedAt = now();
    const staff = this.state.agents.find((a) => a.id === task.staffId);
    if (staff) staff.status = "archived";
    for (const a of this.state.approvals.filter(
      (a) => a.taskId === task.id && a.status === "pending",
    ))
      a.status = "withdrawn";
    this.event(
      task.companyId,
      "task.cancelled",
      `Cancelled: ${task.title}`,
      "Owner",
      task.id,
    );
    return task;
  }
  importLedger(input) {
    this.company(input.companyId);
    if (
      this.state.ledgers.filter((d) => d.companyId === input.companyId)
        .length >= 8
    )
      fail(
        "Up to eight immutable sources per company are supported in this pilot.",
      );
    let parsed;
    try {
      parsed = parseLedger(input.csv);
    } catch (error) {
      fail(error.message);
    }
    const canonical = JSON.stringify(
      parsed.rows.map(
        ({ id, sourceLine, sourceRecord, duplicateOf, ...row }) => row,
      ),
    );
    if (
      this.state.ledgers.some(
        (d) => d.companyId === input.companyId && d.canonical === canonical,
      )
    )
      fail("This source has already been imported.", 409);
    const dataset = {
      id: id("ledger"),
      companyId: input.companyId,
      name: text(input.name, "Source name", 100),
      ...parsed,
      canonical,
      synthetic: input.synthetic === true,
      createdAt: now(),
    };
    this.state.ledgers.push(dataset);
    this.event(
      input.companyId,
      "source.imported",
      `Imported ${dataset.rows.length} ${dataset.currency} source rows: ${dataset.name}`,
    );
    return dataset;
  }
  updateKnowledge(input) {
    this.company(input.companyId);
    const entry =
      this.state.knowledge.find(
        (k) => k.companyId === input.companyId && k.id === input.knowledgeId,
      ) || fail("Knowledge not found.", 404);
    if (Number(input.expectedVersion) !== entry.version)
      fail("Knowledge changed. Reload before editing.", 409);
    const title = text(input.title, "Knowledge title", 120),
      content = text(input.content, "Knowledge content", 12000);
    entry.revisions ||= [];
    entry.revisions.push({
      title: entry.title,
      content: entry.content,
      version: entry.version,
      at: entry.updatedAt || entry.createdAt,
    });
    entry.title = title;
    entry.content = content;
    entry.version++;
    entry.updatedAt = now();
    this.event(
      input.companyId,
      "knowledge.updated",
      `Knowledge updated: ${entry.title} (v${entry.version})`,
    );
    return entry;
  }
  addKnowledge(input) {
    this.company(input.companyId);
    const entry = {
      id: id("kb"),
      companyId: input.companyId,
      title: text(input.title, "Knowledge title", 120),
      content: text(input.content, "Knowledge content", 12000),
      version: 1,
      createdAt: now(),
    };
    this.state.knowledge.push(entry);
    this.event(
      input.companyId,
      "knowledge.created",
      `Knowledge added: ${entry.title}`,
    );
    return entry;
  }
  updatePolicy(input) {
    const company = this.company(input.companyId);
    const limit = Number(input.spendLimit);
    if (!Number.isFinite(limit) || limit < 0 || limit > 1e6)
      fail("Spend review threshold must be 0–1,000,000 USD.");
    company.policy.spendLimit = limit;
    this.event(
      company.id,
      "policy.updated",
      `Spend review threshold set to $${limit}. Financial, legal, hiring, and external communications still require review.`,
    );
  }
}
export function templateResult({ task, company, knowledge }) {
  const role = ROLES.find((r) => r.code === task.department);
  const focus = {
    CEO: [
      "Define one measurable outcome and an owner for each workstream.",
      "Sequence dependencies and review capacity before setting dates.",
      "Prepare a weekly operating review covering progress, blockers, and decisions.",
    ],
    CTO: [
      "Write acceptance criteria and identify dependencies.",
      "Implement a small vertical slice with input validation and access controls.",
      "Test the critical path, document setup, and prepare a rollback plan.",
    ],
    CFO: [
      "Gather source records and reconcile opening balances.",
      "Separate actual figures, assumptions, and scenarios.",
      "Prepare a variance review and flag missing documentation for the Owner.",
    ],
    CMO: [
      "Define the audience, problem, and primary message.",
      "Draft one focused creative concept and a measurable experiment.",
      "Review brand fit and route all publication through Owner approval.",
    ],
    CBO: [
      "Define the partner or customer qualification criteria.",
      "Prepare a research shortlist and a discovery conversation outline.",
      "Document deal assumptions; route commitments through Owner review.",
    ],
    CSO: [
      "State the decision, time horizon, and success metric.",
      "Compare scenarios with assumptions and a risk register.",
      "Propose a reversible next step with a clear review checkpoint.",
    ],
  }[task.department];
  return `# ${task.title}\n\nPlanning template · ${role.name} · ${company.name}\n\n## Owner directive\n${task.brief}\n\n## Company context\n${company.mission}\n\n## Proposed work plan\n${focus.map((v, i) => `${i + 1}. ${v}`).join("\n")}\n\n## Available knowledge\n${knowledge.length ? knowledge.map((k) => `- ${k.title}: ${k.content.slice(0, 400)}`).join("\n") : "No company documents have been added. Validate assumptions with the Owner."}\n\n## Acceptance criteria\n- Deliverable addresses the directive and identifies remaining assumptions.\n- Sources and figures are verified before operational use.\n- Financial, legal, hiring, and external actions receive separate Owner review.\n\n## Execution boundary\nThis is a deterministic planning template, not an AI-generated or externally executed result. Configure the server-side Anthropic adapter for model-generated drafts. No money moved, message sent, contract signed, or code deployed.\n`;
}
export function seedState() {
  const e = new Engine();
  const companies = [
    ["Nova Labs", "Technology", "Build useful software for independent teams."],
    [
      "Verdant",
      "Agriculture",
      "Make resilient growing practices accessible to small farms.",
    ],
    [
      "Aster Capital",
      "Finance",
      "Develop tools for clearer financial operations.",
    ],
    [
      "Forma Studio",
      "Brand & Design",
      "Create considered identities for ambitious small businesses.",
    ],
  ].map(([name, sector, mission]) =>
    e.createCompany({ name, sector, mission }),
  );
  const definitions = [
    [
      0,
      "Map the product launch workstreams",
      "Create a concise launch readiness plan with engineering, positioning, and operational checkpoints.",
      "CEO",
      "draft",
    ],
    [
      0,
      "Review the onboarding experience",
      "Identify friction in a self-service onboarding flow and define a testable improvement plan.",
      "CTO",
      "research",
    ],
    [
      1,
      "Explore a pilot growing program",
      "Prepare an outline for a small regenerative agriculture pilot, including assumptions to validate.",
      "CSO",
      "research",
    ],
    [
      2,
      "Prepare the monthly cash review",
      "Outline a cash review. Use no invented figures and list the source records required.",
      "CFO",
      "draft",
    ],
    [
      3,
      "Develop the studio positioning",
      "Draft a positioning framework for a design studio serving independent founders.",
      "CMO",
      "draft",
    ],
    [
      0,
      "Review the infrastructure budget",
      "Evaluate a proposed $480 infrastructure allocation. Prepare a recommendation only.",
      "CFO",
      "spend",
      480,
    ],
    [
      3,
      "Review a partnership announcement",
      "Draft an external announcement for a fictional studio partnership. Owner review is required.",
      "CBO",
      "communication",
    ],
    [
      1,
      "Research regional distribution",
      "Develop qualification criteria for potential regional distribution partners.",
      "CBO",
      "research",
    ],
  ];
  definitions.forEach(([index, title, brief, department, kind, amount], i) => {
    const task = e.createTask({
      companyId: companies[index].id,
      title,
      brief,
      department,
      kind,
      amount,
    });
    if ([0, 4].includes(i)) {
      const ctx = e.begin({ companyId: task.companyId, taskId: task.id });
      e.finish({
        ...ctx,
        companyId: task.companyId,
        taskId: task.id,
        artifact: templateResult(ctx),
        provider: "template",
      });
    }
  });
  for (const company of companies)
    e.addKnowledge({
      companyId: company.id,
      title: "Operating principles",
      content:
        "Fictional demonstration company. Favor reversible experiments. Label assumptions. Prepare drafts for Owner review. Never invent financial figures or claim that an external action has been performed.",
    });
  return e.state;
}
