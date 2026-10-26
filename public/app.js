import { Engine, ROLES, seedState } from "./core.js";
import { SAMPLE_LEDGER } from "./finance.js";
import { executeWorkflow } from "./workflow.js";
import { financePanel, operationsPanel, tracePanel } from "./panels.js";

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  building:
    '<path d="M4 21V7l8-4 8 4v14M2 21h20M8 9v2m4-2v2m4-2v2M8 14v2m8-2v2m-6 5v-5h4v5"/>',
  agents:
    '<circle cx="12" cy="7" r="3"/><circle cx="4" cy="14" r="2"/><circle cx="20" cy="14" r="2"/><path d="M6 21v-2a6 6 0 0 1 12 0v2M1 21v-1a3 3 0 0 1 3-3m19 4v-1a3 3 0 0 0-3-3"/>',
  task: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM9 12h6m-6 4h4"/>',
  shield: '<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6zM8 12l3 3 5-6"/>',
  book: '<path d="M12 6c-3-3-7-3-10-1v15c3-2 7-2 10 1 3-3 7-3 10-1V5c-3-2-7-2-10 1zm0 0v15"/>',
  activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  plug: '<path d="m9 3 1 5m5-5 1 5M6 9l13-2 1 6a5 5 0 0 1-10 2L9 9m5 11 1 3"/>',
  settings:
    '<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  leaf: '<path d="M20 3C7 1 2 9 6 16s17 4 14-13zM4 21 16 8"/>',
  chart: '<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
  spark:
    '<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  github:
    '<path d="M9 19c-5 2-5-2-7-2m14 5v-4c0-1 .3-2 1-3 4-.5 5-2 5-5 0-2-1-3-2-4 0-1 0-2-.5-3-2 0-3 1-4 2a14 14 0 0 0-7 0C7 4 6 3 4 3c-.5 1-.5 2-.5 3C2 7 2 8 2 10c0 3 1 4.5 5 5 .7 1 1 2 1 3v4"/>',
  refresh:
    '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
};
const icon = (name, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const repo = "https://github.com/naazzarov/frobot";
const nav = [
  ["overview", "grid", "Overview"],
  ["companies", "building", "Companies"],
  ["workforce", "agents", "AI workforce"],
  ["missions", "task", "Mission control"],
  ["finance", "chart", "Finance workspace"],
  ["operations", "activity", "Operations"],
  ["approvals", "shield", "Approvals"],
  ["knowledge", "book", "Knowledge base"],
  ["activity", "activity", "Activity log"],
];
const labels = Object.fromEntries(
  [
    ...nav,
    ["integrations", "plug", "Integrations"],
    ["settings", "settings", "Settings"],
  ].map(([id, , label]) => [id, label]),
);
let state,
  engine,
  server = false,
  config = {},
  page = "overview",
  companyFilter = "all",
  statusFilter = "all",
  query = "",
  mobileOpen = false,
  busy = new Set(),
  toastTimer,
  returnFocus;
let csrf = null,
  operations = null,
  ledgerFilter = null,
  pollTimer;
sessionStorage.removeItem("frobot-token");
const KEY = "frobot-sandbox-v1";
const app = document.querySelector("#app");
const overlay = document.querySelector("#overlay");
const company = (cid) => state.companies.find((c) => c.id === cid);
const scope = (values) =>
  values.filter(
    (v) => companyFilter === "all" || v.companyId === companyFilter,
  );
const relative = (date) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(date)) / 60000));
  return min < 1
    ? "just now"
    : min < 60
      ? `${min}m ago`
      : min < 1440
        ? `${Math.floor(min / 60)}h ago`
        : `${Math.floor(min / 1440)}d ago`;
};
const dateLabel = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
const pending = () =>
  scope(state.approvals).filter((a) => a.status === "pending");
const pill = (status) => {
  const map = {
    queued: ["Queued", "gray"],
    running: ["Running", "purple"],
    done: ["Completed", ""],
    awaiting_approval: ["Needs approval", "amber"],
    rejected: ["Rejected", "red"],
    failed: ["Failed", "red"],
    pending: ["Pending review", "amber"],
    approved: ["Approved", ""],
    archived: ["Archived", "gray"],
    cancelled: ["Cancelled", "gray"],
    withdrawn: ["Withdrawn", "gray"],
  };
  const [label, cls] = map[status] || [status, "gray"];
  return `<span class="pill ${cls}"><span class="dot"></span>${label}</span>`;
};
const options = (selected = companyFilter, all = true) =>
  `${all ? '<option value="all">All companies</option>' : ""}${state.companies.map((c) => `<option value="${c.id}" ${selected === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}`;
const miniCompany = (cid) => {
  const c = company(cid);
  return c
    ? `<span class="mini-company" style="--company-color:${c.color}"><span class="mini-dot"></span>${esc(c.name)}</span>`
    : "Owner workspace";
};
const button = (action, label, ico, cls = "btn-secondary", extra = "") =>
  `<button class="btn ${cls}" data-action="${action}" ${extra}>${ico ? icon(ico, 13) : ""}${label}</button>`;
function notify(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 4500);
}
async function api(path, body) {
  const response = await fetch(path, {
    credentials: "same-origin",
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(body && csrf ? { "X-Frobot-CSRF": csrf } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}
function persistSandbox() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    notify(
      "Browser storage is full or unavailable. Export your workspace to keep changes.",
    );
  }
}
async function refresh() {
  if (server) {
    const [workspace, ops] = await Promise.all([
      api("/api/state"),
      api("/api/operations"),
    ]);
    state = workspace.state;
    operations = ops;
  } else state = engine.state;
}
async function mutate(action, input = {}) {
  let result;
  if (server) {
    const response = await api(`/api/actions/${action}`, input);
    result = response.result || response.task || response.job;
    await refresh();
  } else {
    if (action === "run") {
      const ctx = engine.begin(input);
      persistSandbox();
      render();
      try {
        const output = await executeWorkflow(ctx, null, {
          checkpoint: async (entry) => {
            engine.checkpoint({ ...input, runId: ctx.runId, entry });
            persistSandbox();
          },
        });
        result = engine.finish({
          ...input,
          runId: ctx.runId,
          artifact: output.artifact,
          verification: output.verification,
          provider: "deterministic",
        });
      } catch (error) {
        engine.failRun({
          ...input,
          runId: ctx.runId,
          message:
            "A workflow stage did not pass validation. Inspect its trace.",
        });
        persistSandbox();
        throw error;
      }
    } else {
      const fn = {
        company: "createCompany",
        mission: "createTask",
        decision: "decide",
        pause: "pause",
        knowledge: "addKnowledge",
        knowledgeUpdate: "updateKnowledge",
        source: "importLedger",
        cancel: "cancel",
        policy: "updatePolicy",
      }[action];
      if (!fn) throw Error("Unknown action.");
      result = engine[fn](input);
    }
    state = engine.state;
    persistSandbox();
  }
  render();
  return result;
}
function financeView() {
  return financePanel({
    state,
    selected: companyFilter,
    esc,
    icon,
    button,
    head,
    options,
    ledgerId: ledgerFilter,
  });
}
function operationsView() {
  return operationsPanel({ state, server, operations, esc, button, head });
}
function financeCompany() {
  return companyFilter === "all"
    ? (
        state.companies.find((c) => c.sector === "Finance") ||
        state.companies[0]
      )?.id
    : companyFilter;
}
async function createLedgerMission(ledgerId, runNow = false) {
  const dataset = state.ledgers.find((d) => d.id === ledgerId);
  if (!dataset) throw Error("Source not found.");
  const task = await mutate("mission", {
    companyId: dataset.companyId,
    title: "Prepare source-backed cash report",
    brief:
      "Summarize source cash movements, identify missing categories and potential duplicates, and show row-level evidence. Prepare an internal report with explicit limitations.",
    department: "CFO",
    kind: "research",
    ledgerId: dataset.id,
    idempotencyKey: crypto.randomUUID(),
  });
  if (runNow) await runTask(task.id);
  else taskDetail(task.id);
}
async function sampleCFO() {
  if (busy.has("sample-cfo")) return;
  busy.add("sample-cfo");
  try {
    const companyId = financeCompany();
    if (!companyId) {
      newCompany();
      return;
    }
    let dataset = state.ledgers.find(
      (d) =>
        d.companyId === companyId &&
        d.synthetic &&
        d.name === "Fictional cash ledger",
    );
    if (!dataset)
      dataset = await mutate("source", {
        companyId,
        name: "Fictional cash ledger",
        csv: SAMPLE_LEDGER,
        synthetic: true,
      });
    companyFilter = companyId;
    ledgerFilter = dataset.id;
    location.hash = "finance";
    render();
    await createLedgerMission(dataset.id, true);
  } finally {
    busy.delete("sample-cfo");
    render();
  }
}

function sourceModal() {
  if (!state.companies.length) {
    newCompany();
    return;
  }
  modal(
    "Import a source you can inspect.",
    `<form id="source-form"><div class="modal-body"><div class="modal-note">${server ? "Sources remain in this private backend. AI-enabled runs send a bounded source summary and selected rows to the configured provider." : "This sandbox stores data in your browser. Use fictional records here; no server or bank is connected."}</div>${field("Company", "source-company", `<select id="source-company" name="companyId">${options(financeCompany(), false)}</select>`)}${field("Source name", "source-name", '<input id="source-name" name="name" required maxlength="100" placeholder="e.g. October cash export">')}${field("Choose CSV (optional)", "source-file", '<input id="source-file" type="file" accept=".csv,text/csv">')}${field("CSV records", "source-csv", '<textarea id="source-csv" name="csv" required rows="9" maxlength="250000" placeholder="date,description,amount,currency,category"></textarea>', "Required: date, description, amount, currency. Optional: category. One currency; up to 1,000 rows. Signed amounts; ISO dates.")}<div class="form-error" role="alert"></div></div><footer class="modal-footer">${button("sample-csv", "Sample format", "download")}<button class="btn btn-primary" type="submit">Validate and import</button></footer></form>`,
  );
}
function queueModal(tid) {
  const t = state.tasks.find((t) => t.id === tid);
  if (!server) {
    notify("Background jobs require the Node.js backend.");
    return;
  }
  modal(
    "Let the worker take it from here.",
    `<form id="queue-form"><input name="companyId" type="hidden" value="${t.companyId}"><input name="taskId" type="hidden" value="${t.id}"><div class="modal-body"><div class="modal-note">The server must stay online. This queues only this mission; approvals and pause controls still apply. AI runs may make up to four paid requests within the configured daily cap.</div>${field("Start time (optional)", "run-at", '<input id="run-at" name="runAt" type="datetime-local">', "Leave blank to run as worker capacity becomes available. Dates use your local time.")}<div class="form-error" role="alert"></div></div><footer class="modal-footer">${button("close-modal", "Cancel", null)}<button class="btn btn-primary" type="submit">Queue mission</button></footer></form>`,
  );
}
function editKnowledge(kid) {
  const k = state.knowledge.find((k) => k.id === kid);
  modal(
    "Update company knowledge.",
    `<form id="knowledge-edit-form"><input name="companyId" type="hidden" value="${k.companyId}"><input name="knowledgeId" type="hidden" value="${k.id}"><input name="expectedVersion" type="hidden" value="${k.version}"><div class="modal-body">${field("Title", "knowledge-title", `<input id="knowledge-title" name="title" required maxlength="120" value="${esc(k.title)}">`)}${field("Knowledge", "knowledge-content", `<textarea id="knowledge-content" name="content" required maxlength="12000" rows="8">${esc(k.content)}</textarea>`)}<div class="modal-note">Saving creates version ${k.version + 1}. Previous content remains inspectable in version history.</div><div class="form-error" role="alert"></div></div><footer class="modal-footer"><button class="btn btn-primary" type="submit">Save new version</button></footer></form>`,
  );
}
function sidebar() {
  const count = state.approvals.filter((a) => a.status === "pending").length;
  return `<aside class="sidebar ${mobileOpen ? "open" : ""}" aria-label="Main navigation">
    <a href="#overview" class="logo"><span class="logo-mark"><svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M6 5h21v6H13v5h11v6H13v8H6zM19 0h8v3h-8z"/></svg></span>frobot<span class="logo-period">OS</span></a>
    <div class="logo-sub">BIG IDEAS. SMALL HEADCOUNT.</div>
    <div class="workspace"><span class="workspace-icon">${icon("globe", 17)}</span><div><b>My ecosystem</b><small>Owner workspace</small></div><span class="workspace-chevron">${icon("down", 13)}</span></div>
    <div class="sidebar-label">Your workspace</div><nav>${nav.map(([id, ico, label]) => `<a class="nav-item ${page === id ? "active" : ""}" href="#${id}" ${page === id ? 'aria-current="page"' : ""}>${icon(ico, 18)}<span>${label}</span>${id === "approvals" && count ? `<span class="count">${count}</span>` : ""}${page === id ? '<span class="nav-active-dot"></span>' : ""}</a>`).join("")}</nav>
    <div class="sidebar-label">Make it yours</div><a class="nav-item ${page === "integrations" ? "active" : ""}" href="#integrations">${icon("plug", 18)}Integrations</a><a class="nav-item ${page === "settings" ? "active" : ""}" href="#settings">${icon("settings", 18)}Settings</a>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-promo"><span class="promo-spark">✳</span><h3>Your next company<br>starts with an idea.</h3><p>The workforce comes with it.</p><button data-action="new-company">Launch something ${icon("arrow", 14)}</button><div class="promo-orbit" aria-hidden="true"></div></div>
    <a class="nav-item source-link" href="${repo}" target="_blank" rel="noopener">${icon("github", 16)}Built in the open ${icon("arrow", 13)}</a>
    <div class="owner"><span class="avatar">O<span class="owner-dot"></span></span><div><b>The Owner</b><small>You set the direction.</small></div>${icon("shield", 17)}</div>
  </aside>`;
}
function render() {
  const views = {
    overview: overviewView,
    companies: companiesView,
    workforce: workforceView,
    missions: missionsView,
    approvals: approvalsView,
    knowledge: knowledgeView,
    activity: activityView,
    integrations: integrationsView,
    settings: settingsView,
    finance: financeView,
    operations: operationsView,
  };
  app.innerHTML = `${sidebar()}<div class="shell page-${page}"><header class="topbar"><div class="breadcrumbs"><button class="small-icon mobile-menu" data-action="menu" aria-label="Toggle navigation">${icon("menu")}</button>${icon("globe", 14)}<span>Workspace</span>${icon("chevron", 10)}<b>${labels[page]}</b></div><div class="top-actions"><button class="search-trigger" data-action="search">${icon("search", 16)}<span>Search workspace</span><kbd class="key">/</kbd></button><span class="top-divider"></span><span class="top-mode"><span class="dot"></span>${server ? "PRIVATE WORKSPACE" : "PLAYGROUND"}</span><button class="small-icon" data-action="notifications" aria-label="View pending approvals">${icon("bell", 17)}${state.approvals.some((a) => a.status === "pending") ? '<span class="notification-dot"></span>' : ""}</button><span class="avatar top-avatar">O</span></div></header><main class="main" id="main" tabindex="-1">${state.paused ? `<div class="sandbox-banner paused-banner">${icon("pause", 14)}<b>All execution is paused.</b> Queued missions will remain on hold until you resume.${button("global-pause", "Resume", "play", "btn-ghost btn-sm")}</div>` : ""}${views[page]()}<footer class="bottom-note"><span>FROBOT v0.2 · One owner. Every company in view.</span><span>${server ? "Persistent workspace" : "Fictional data · No external actions"} · Open source</span></footer></main></div>`;
}
function head(
  title,
  sub,
  actions = "",
  eyebrow = "Your company operating system",
) {
  return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${sub}</p></div><div class="head-actions">${actions}</div></div>`;
}
function banner() {
  return `<div class="sandbox-banner">${icon("spark", 13)}<span><b>${server ? "Your local operating system" : "Explore the public sandbox"}</b> · ${server ? (config.aiConfigured ? "AI generates drafts. You approve decisions. No external tools are connected." : "Deterministic workflows are active. Configure an AI provider for model planning and review.") : "Fictional companies. Real workflows. Your changes stay in this browser."}</span><a href="${repo}" target="_blank" rel="noopener">View the code ↗</a></div>`;
}
function stats() {
  const tasks = scope(state.tasks),
    agents = scope(state.agents).filter((a) => a.status !== "archived");
  const values = [
    [
      "Your companies",
      state.companies.length,
      "building",
      "Ventures in your orbit",
      "blue",
    ],
    [
      "AI workforce",
      agents.length,
      "agents",
      "Ready to turn ideas into work",
      "violet",
    ],
    [
      "Missions delivered",
      tasks.filter((t) => t.status === "done").length,
      "check",
      `${tasks.filter((t) => t.status === "queued").length} more ready for their next move`,
      "mint",
    ],
    [
      "Your attention",
      pending().length,
      "shield",
      "Decisions only you can make",
      "peach",
    ],
  ];
  return `<div class="stats">${values.map(([label, value, ico, foot, tone], i) => `<div class="stat stat-${tone}"><div class="stat-top"><span class="stat-icon">${icon(ico, 19)}</span><span>${label}</span><span class="stat-index">0${i + 1}</span></div><div class="stat-bottom"><div class="stat-value">${String(value).padStart(2, "0")}</div><span class="stat-decoration" aria-hidden="true">${i === 0 ? "↗" : i === 1 ? "✳" : i === 2 ? "✓" : "↗"}</span></div><div class="stat-foot">${foot}</div></div>`).join("")}</div>`;
}
function companyVisual(c) {
  const index = state.companies.findIndex((x) => x.id === c.id);
  return {
    index,
    tone: ["blue", "mint", "peach", "violet"][index % 4],
    ico:
      c.sector === "Agriculture"
        ? "leaf"
        : c.sector === "Finance"
          ? "chart"
          : c.sector === "Brand & Design"
            ? "spark"
            : "code",
  };
}
function companyCard(c, full = false) {
  const tasks = state.tasks.filter((t) => t.companyId === c.id),
    agents = state.agents.filter(
      (a) => a.companyId === c.id && a.status !== "archived",
    );
  const needs = state.approvals.filter(
    (a) => a.companyId === c.id && a.status === "pending",
  ).length;
  const { index, tone, ico } = companyVisual(c);
  const completed = tasks.filter((t) => t.status === "done").length;
  return `<article class="company-card company-${tone} ${full ? "company-full" : ""}">
    <button class="company-open" data-action="open-company" data-id="${c.id}" aria-label="Open ${esc(c.name)}"><div class="company-art"><span class="company-symbol">${icon(ico, 29)}</span><span class="company-number">0${index + 1}</span><span class="company-art-orbit" aria-hidden="true"></span><span class="company-art-dot" aria-hidden="true"></span><span class="company-art-star" aria-hidden="true">✳</span><span class="company-art-caption">${esc(c.sector.toUpperCase())}</span></div><div class="company-content"><div class="company-card-top"><h3>${esc(c.name)}</h3>${icon("arrow", 16)}</div><div class="company-sector"><span class="dot"></span>${c.paused ? "Execution paused" : "Workforce ready"}</div>${full ? `<p class="company-mission">${esc(c.mission)}</p>` : ""}<div class="company-card-stats"><span>${icon("agents", 13)}<strong>${agents.length}</strong> agents</span><span><strong>${completed}/${tasks.length}</strong> delivered</span></div><div class="company-progress" aria-label="${completed} of ${tasks.length} missions completed"><span style="width:${tasks.length ? (completed / tasks.length) * 100 : 0}%"></span></div><div class="company-card-footer"><span>${needs ? icon("shield", 12) : icon("check", 12)}${needs ? `${needs} decision${needs > 1 ? "s" : ""} to review` : "You're all caught up"}</span><span class="company-card-arrow">↗</span></div></div></button>${full ? `<div class="company-card-actions">${button("company-pause", c.paused ? "Resume" : "Pause", c.paused ? "play" : "pause", "btn-secondary btn-sm", `data-id="${c.id}"`)}${button("company-mission", "New mission", "plus", "btn-ghost btn-sm", `data-id="${c.id}"`)}</div>` : ""}
  </article>`;
}
function orbitGraphic() {
  const positions = [
    [66, 9],
    [72, 65],
    [0, 66],
    [3, 8],
  ];
  return `<div class="orbit-map"><div class="orbit-caption"><span class="dot"></span>YOUR CONNECTED ECOSYSTEM</div><svg class="orbital-art" viewBox="0 0 500 350" fill="none" aria-hidden="true"><defs><radialGradient id="core-glow"><stop stop-color="#8eaaff"/><stop offset=".42" stop-color="#576eff"/><stop offset=".8" stop-color="#3b3bcb"/><stop offset="1" stop-color="#19175d"/></radialGradient><radialGradient id="ambient"><stop stop-color="#6772ff" stop-opacity=".35"/><stop offset="1" stop-color="#6772ff" stop-opacity="0"/></radialGradient><linearGradient id="orbit-line" x1="30" y1="30" x2="460" y2="300" gradientUnits="userSpaceOnUse"><stop stop-color="#8e9aff" stop-opacity=".08"/><stop offset=".5" stop-color="#c8d0ff" stop-opacity=".8"/><stop offset="1" stop-color="#8e9aff" stop-opacity=".1"/></linearGradient><linearGradient id="glyph" x1="195" y1="120" x2="270" y2="240" gradientUnits="userSpaceOnUse"><stop stop-color="white"/><stop offset="1" stop-color="#acbfff"/></linearGradient><filter id="orb-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="16" stdDeviation="17" flood-color="#0b0c31" flood-opacity=".65"/></filter><clipPath id="sphere-clip"><circle cx="250" cy="174" r="77"/></clipPath></defs><circle cx="250" cy="174" r="170" fill="url(#ambient)"/><g class="orbital-rings"><ellipse cx="250" cy="174" rx="184" ry="88" transform="rotate(-28 250 174)" stroke="url(#orbit-line)"/><ellipse cx="250" cy="174" rx="184" ry="88" transform="rotate(36 250 174)" stroke="url(#orbit-line)"/><circle cx="250" cy="174" r="125" stroke="#93a5ff" stroke-opacity=".19" stroke-dasharray="3 8"/><circle cx="250" cy="174" r="155" stroke="#93a5ff" stroke-opacity=".1"/><path d="M250 10v328M44 174h412" stroke="#b7c5ff" stroke-opacity=".07" stroke-dasharray="3 6"/></g><g filter="url(#orb-shadow)"><circle cx="250" cy="174" r="79" stroke="#a5b5ff" stroke-opacity=".4"/><circle cx="250" cy="174" r="77" fill="url(#core-glow)"/><g clip-path="url(#sphere-clip)" stroke="#c5d2ff" stroke-opacity=".16"><ellipse cx="250" cy="174" rx="42" ry="77" transform="rotate(27 250 174)"/><ellipse cx="250" cy="174" rx="65" ry="77" transform="rotate(-40 250 174)"/><ellipse cx="250" cy="174" rx="77" ry="30" transform="rotate(-20 250 174)"/></g><path d="M228 138h57v15h-39v20h32v15h-32v28h-18z" fill="#292a9a" transform="translate(3 6)"/><path d="M224 134h57v15h-39v20h32v15h-32v28h-18z" fill="url(#glyph)"/><path d="M262 120h19v6h-19z" fill="white"/></g><g fill="#c8d2ff"><circle cx="102" cy="117" r="3"/><circle cx="393" cy="239" r="3"/><circle cx="334" cy="69" r="2"/><circle cx="179" cy="294" r="2"/><path d="M132 49v10m-5-5h10M390 117v10m-5-5h10" stroke="#b2beff" stroke-opacity=".7"/></g><text x="250" y="293" text-anchor="middle" fill="#d4dbff" font-size="9" font-family="monospace" letter-spacing="3">FROBOT CORE</text><text x="250" y="310" text-anchor="middle" fill="#8c9bdb" font-size="8" font-family="monospace" letter-spacing="1">ONE OWNER. INFINITE POSSIBILITY.</text></svg>${state.companies
    .slice(0, 4)
    .map((c, i) => {
      const v = companyVisual(c);
      return `<button class="orbit-node orbit-${v.tone}" style="--node-x:${positions[i][0]}%;--node-y:${positions[i][1]}%" data-action="open-company" data-id="${c.id}" aria-label="Open ${esc(c.name)}"><span>${icon(v.ico, 15)}</span><div><b>${esc(c.name)}</b><small>${c.paused ? "PAUSED" : "CONNECTED"}</small></div><span class="node-status"></span></button>`;
    })
    .join("")}</div>`;
}
function taskRow(t) {
  return `<button class="task-row" data-action="task-detail" data-id="${t.id}"><span class="role-square">${icon(t.department === "CTO" ? "code" : t.department === "CFO" ? "chart" : t.department === "CMO" ? "spark" : "task", 14)}</span><span class="task-title"><b>${esc(t.title)}</b><small>${esc(company(t.companyId)?.name)} <span>·</span> ${t.department} agent <span>·</span> ${relative(t.createdAt)}</small></span>${pill(t.status)}${icon("chevron", 11)}</button>`;
}
function eventRow(e) {
  return `<div class="activity-row"><span class="activity-icon">${icon(e.type.includes("approval") ? "shield" : e.type.includes("completed") ? "check" : e.type.includes("created") ? "plus" : "activity", 11)}</span><div class="activity-copy"><p>${esc(e.summary)}</p><small>${esc(company(e.companyId)?.name || "Owner workspace")} · ${esc(e.actor)} · ${relative(e.at)}</small></div></div>`;
}
function overviewView() {
  const tasks = scope(state.tasks),
    ev = scope(state.events),
    count = pending().length;
  const day = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  return `<div class="overview-heading"><div><div class="eyebrow">YOUR PERSONAL MISSION CONTROL <span>✳</span></div><h1>Your world. <span>In motion.</span></h1></div><div class="overview-heading-right"><span class="today-label">${esc(day)}</span>${button("new-company", "New company", "plus", "btn-secondary")}</div></div>
  <section class="command-hero"><div class="hero-noise" aria-hidden="true"></div><div class="hero-copy"><span class="hero-kicker"><span class="hero-kicker-line"></span>THE ONE-PERSON COMPANY OS</span><h2>One mind.<br>An entire<br><em>ecosystem.</em></h2><p>You bring the vision. Your AI workforce<br class="hero-break"> helps turn it into the next big thing.</p><div class="hero-actions">${button("new-mission", "Give a directive", "spark", "btn-primary")}<a href="#workforce">Meet your workforce ${icon("arrow", 14)}</a></div><div class="hero-signature"><span class="hero-mini-avatars"><i>C</i><i>T</i><i>F</i><i>+3</i></span><span>Six executive roles. One shared direction.</span></div></div>${orbitGraphic()}<div class="hero-coordinate">F / OS — 001</div></section>
  <div class="workspace-context"><span>${icon("spark", 13)}${server ? (config.aiConfigured ? "AI drafts enabled · Owner approvals enforced" : "Template workspace · Connect AI in server settings") : "Your playground. Fictional data. Real possibilities."}</span><a href="${repo}" target="_blank" rel="noopener">Explore the source ${icon("arrow", 12)}</a></div>
  ${stats()}<section class="finance-launch"><span class="finance-launch-symbol">${icon("chart", 25)}</span><div><span class="eyebrow">GO BEYOND A PLANNING TEMPLATE</span><h3>Meet a CFO workflow with receipts.</h3><p>Source rows → exact calculations → four inspectable stages → a report.</p></div>${button("sample-cfo", "Try the workflow", "arrow", "btn-primary")}</section>
  <section class="company-section"><div class="section-heading"><div><div class="eyebrow">BUILT BY YOU. BACKED BY AI.</div><h2>Your corner of the universe.<small>${state.companies.length} companies</small></h2></div><a class="text-link" href="#companies">Explore ecosystem ${icon("arrow", 14)}</a></div><div class="company-grid">${
    state.companies
      .slice(0, 4)
      .map((c) => companyCard(c))
      .join("") ||
    empty(
      "Your first company starts here.",
      "Create a company to provision its workforce.",
      "new-company",
      "Create company",
    )
  }</div></section>
  <div class="overview-bottom"><div class="lower-grid"><section class="panel mission-panel"><div class="panel-head"><div><span class="panel-kicker">THE WORK IN MOTION</span><h2>Mission control <span class="heading-count">${tasks.length}</span></h2></div><a class="text-link" href="#missions">View queue ${icon("arrow", 13)}</a></div><div class="task-list">${[...tasks].reverse().slice(0, 4).map(taskRow).join("") || empty("Your next idea belongs here.", "Give your workforce its first directive.", "new-mission", "Give a directive")}</div><div class="panel-footer"><span class="text-link">${icon("agents", 13)}${tasks.filter((t) => t.status === "queued").length} missions ready for their next move</span></div></section><section class="panel activity-panel"><div class="panel-head"><div><span class="panel-kicker">NOTHING FALLS THROUGH</span><h2>The latest signals</h2></div><span class="live-dot"><span></span>LIVE</span></div><div class="activity-list">${[...ev].reverse().slice(0, 4).map(eventRow).join("")}</div><div class="panel-footer"><a class="text-link" href="#activity">Follow the full story ${icon("arrow", 13)}</a></div></section></div>
  <aside class="owner-decision"><div class="decision-orb" aria-hidden="true">${icon("shield", 30)}</div><span class="panel-kicker">THE HUMAN ADVANTAGE</span><h2>A little judgment.<br>A big difference.</h2><p>${count ? `${count} decisions are waiting for your direction. Great companies still need your point of view.` : "You’re all caught up. Your next big decision will find its way here."}</p><button data-action="notifications">${count ? "Review decisions" : "View approvals"} ${icon("arrow", 15)}<span>${String(count).padStart(2, "0")}</span></button><span class="decision-decoration" aria-hidden="true">✳</span></aside></div>`;
}
function empty(title, desc, action, label) {
  return `<div class="empty">${icon("spark", 28)}<h3>${title}</h3><p>${desc}</p>${action ? button(action, label, "plus", "btn-secondary") : ""}</div>`;
}
function companySelector() {
  return `<select id="company-filter" aria-label="Filter by company">${options()}</select>`;
}
function companiesView() {
  return `${head("Every venture. One workspace.", "Launch a company with its own workforce, knowledge, and approval boundaries.", button("new-company", "New company", "plus", "btn-primary"), "Your ecosystem")}<div class="filterbar"><input id="company-search" placeholder="Find a company…" value="${esc(query)}" aria-label="Search companies"></div><div class="company-grid page-company-grid">${
    state.companies
      .filter((c) =>
        `${c.name} ${c.sector}`.toLowerCase().includes(query.toLowerCase()),
      )
      .map((c) => companyCard(c, true))
      .join("") ||
    empty(
      "No companies found",
      "Try another search or create your first company.",
      "new-company",
      "New company",
    )
  }</div>`;
}
function missionsView() {
  const tasks = scope(state.tasks)
    .filter(
      (t) =>
        (statusFilter === "all" || t.status === statusFilter) &&
        `${t.title} ${t.department}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return `${head("Turn direction into progress.", "A clear chain of command, from your first directive to the final deliverable.", button("run-next", busy.size ? "Running…" : "Run next mission", busy.size ? "refresh" : "play", "btn-secondary", busy.size ? "disabled" : "") + button("new-mission", "New directive", "plus", "btn-primary"), "Mission control")}<div class="filterbar"><input id="mission-search" placeholder="Search missions…" value="${esc(query)}" aria-label="Search missions">${companySelector()}<select id="status-filter" aria-label="Filter by status">${[
    ["all", "All statuses"],
    ["queued", "Queued"],
    ["awaiting_approval", "Needs approval"],
    ["running", "Running"],
    ["done", "Completed"],
    ["failed", "Failed"],
    ["rejected", "Rejected"],
    ["cancelled", "Cancelled"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${statusFilter === v ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select></div><section class="panel">${tasks.length ? `<div class="table-wrap"><table class="mission-table"><thead><tr><th>MISSION</th><th>COMPANY</th><th>LEAD AGENT</th><th>STATUS</th><th>CREATED</th><th></th></tr></thead><tbody>${tasks.map((t) => `<tr tabindex="0" data-action="task-detail" data-id="${t.id}"><td class="mission-name">${esc(t.title)}</td><td>${miniCompany(t.companyId)}</td><td>${t.department}</td><td>${pill(t.status)}</td><td>${dateLabel(t.createdAt)}</td><td>${icon("chevron", 12)}</td></tr>`).join("")}</tbody></table></div>` : empty("A clear queue. A fresh start.", "Give a directive or adjust the filters to find a mission.", "new-mission", "Give a directive")}</section>`;
}
function workforceView() {
  const selected =
    companyFilter === "all" ? state.companies[0]?.id : companyFilter;
  const c = company(selected);
  return `${head("Meet your AI workforce.", "Six executive roles. Fourteen managers. Specialists created for each mission.", button("new-mission", "Give a directive", "spark", "btn-primary"), "The chain of command")}<div class="filterbar"><select id="company-filter" aria-label="Select company workforce">${options(selected, false)}</select><span class="shortcut-hint">Each company has its own isolated roster and knowledge.</span></div>${
    c
      ? `<div class="org-owner"><small>TIER 0 · HUMAN AUTHORITY</small><b>The Owner · ${esc(c.name)}</b></div><div class="org-grid">${ROLES.map(
          (r) => {
            const exec = state.agents.find(
              (a) =>
                a.companyId === c.id &&
                a.code === r.code &&
                a.tier === "executive",
            );
            const managers = state.agents.filter((a) => a.parentId === exec.id);
            return `<article class="agent-card" style="--role-color:${r.color}"><div class="agent-top"><span class="role-square">${icon(r.code === "CTO" ? "code" : r.code === "CFO" ? "chart" : r.code === "CMO" ? "spark" : "agents", 19)}</span><div><h3>${r.code} Agent</h3><small>${r.name}</small></div><span style="margin-left:auto">${exec.paused ? pill("Paused") : pill("Ready")}</span></div><p>${r.purpose}</p><div class="manager-list">${managers.map((m) => `<div><span>${icon("chevron", 10)}${esc(m.name)}</span><button class="btn btn-ghost btn-sm" data-action="agent-pause" data-id="${m.id}" data-company="${c.id}" aria-label="${m.paused ? "Resume" : "Pause"} ${esc(m.name)}">${icon(m.paused ? "play" : "pause", 10)}</button></div>`).join("")}</div><div class="agent-bottom"><span>TIER 1 → TIER 2 → TASK STAFF</span>${button("agent-pause", exec.paused ? "Resume" : "Pause", exec.paused ? "play" : "pause", "btn-ghost btn-sm", `data-id="${exec.id}" data-company="${c.id}"`)}</div></article>`;
          },
        ).join(
          "",
        )}</div><div class="sandbox-banner" style="margin-top:22px">${icon("agents", 15)}Staff agents are provisioned per run, supervised by a manager, and archived when their work is complete.</div>`
      : empty(
          "No workforce yet",
          "Launch your first company.",
          "new-company",
          "New company",
        )
  }`;
}
function approvalsView() {
  const approvals = pending();
  return `${head("Your judgment. Their next move.", "Review financial commitments, external communications, and sensitive decisions.", `<span class="pill amber">${approvals.length} awaiting your review</span>`, "Owner approvals")}<div class="filterbar">${companySelector()}<span class="shortcut-hint">Approval authorizes draft preparation. No external integrations execute actions.</span></div><div class="approval-grid">${
    approvals
      .map((a) => {
        const t = state.tasks.find((t) => t.id === a.taskId);
        return `<article class="review-card"><div class="review-top">${miniCompany(a.companyId)}${pill("pending")}</div><h3>${esc(t.title)}</h3><p>${esc(t.brief)}</p><div class="risk-reasons">${icon("shield", 12)} ${a.reasons.map(esc).join("<br>")}${t.amount ? `<br>Proposed amount: $${t.amount.toLocaleString()} USD` : ""}</div><div class="review-actions">${button("review", "Review decision", "arrow", "btn-primary", `data-id="${a.id}"`)}${button("task-detail", "View mission", null, "btn-ghost", `data-id="${t.id}"`)}</div></article>`;
      })
      .join("") ||
    empty(
      "All decisions are up to date.",
      "Sensitive missions will appear here before they can run.",
    )
  } </div><div class="section-heading" style="margin-top:30px"><h2>Decision history</h2></div><section class="panel"><div class="task-list">${
    scope(state.approvals)
      .filter((a) => a.status !== "pending")
      .reverse()
      .slice(0, 20)
      .map((a) => {
        const t = state.tasks.find((t) => t.id === a.taskId);
        return `<button class="task-row" data-action="task-detail" data-id="${t.id}"><span class="role-square">${icon("shield", 14)}</span><span class="task-title"><b>${esc(t.title)}</b><small>${esc(a.note)} · ${relative(a.decidedAt)}</small></span>${pill(a.status)}</button>`;
      })
      .join("") || '<div class="empty"><p>No decisions recorded yet.</p></div>'
  }</div></section>`;
}
function knowledgeView() {
  return `${head("A memory for every company.", "Company-scoped context that travels with every agent’s draft.", button("add-knowledge", "Add knowledge", "plus", "btn-primary"), "Knowledge base")}<div class="filterbar">${companySelector()}<span class="shortcut-hint">Add SOPs, brand guidelines, and operating principles. Keep credentials in a secrets manager.</span></div><div class="knowledge-grid">${
    scope(state.knowledge)
      .map(
        (k) =>
          `<button class="knowledge-card" data-action="knowledge-detail" data-id="${k.id}">${icon("book", 22)}<h3>${esc(k.title)}</h3><p>${esc(k.content)}</p><small>${esc(company(k.companyId)?.name)} · Version ${k.version} · ${dateLabel(k.createdAt)}</small></button>`,
      )
      .join("") ||
    empty(
      "Give your agents context.",
      "Add a company operating principle or a working brief.",
      "add-knowledge",
      "Add knowledge",
    )
  }</div>`;
}
function activityView() {
  const events = scope(state.events)
    .filter((e) =>
      `${e.summary} ${e.actor} ${e.type}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .reverse();
  return `${head("Every handoff leaves a trace.", "An inspectable record of directives, delegation, approvals, and results.", button("export-audit", "Export audit log", "download"), "Activity log")}<div class="filterbar"><input id="activity-search" aria-label="Search activity" placeholder="Search events, agents, or decisions…" value="${esc(query)}">${companySelector()}<span class="pill gray">${events.length} events</span></div><section class="panel"><div class="history-list">${events.slice(0, 200).map(eventRow).join("") || empty("No matching activity", "Try changing the search or company filter.")}</div></section><div class="policy-note">${server ? "Server audit events are stored in an append-only SQLite table with a SHA-256 hash chain. A database administrator can still replace the database; use external anchoring for stronger evidence." : "Sandbox history is inspectable and editable in browser storage. Run the backend for a persistent, hash-chained audit log."}</div>`;
}
function integrationsView() {
  const entries = [
    [
      "Anthropic",
      "AI reasoning",
      "Generate role-specific drafts through a server-side model adapter.",
      "spark",
      config.aiConfigured ? "Configured" : "Optional server setup",
    ],
    [
      "Accounting",
      "Xero · QuickBooks · Zoho",
      "A future adapter for source records and reconciled reporting.",
      "chart",
      "Not connected",
    ],
    [
      "Banking & payments",
      "Financial operations",
      "A future adapter with transaction-specific Owner approval.",
      "lock",
      "Not connected",
    ],
    [
      "CRM & sales",
      "HubSpot · Salesforce · Pipedrive",
      "A future adapter for pipeline context and partnership research.",
      "agents",
      "Not connected",
    ],
    [
      "Communications",
      "Email · WhatsApp · Slack",
      "A future adapter for approved outgoing messages.",
      "globe",
      "Not connected",
    ],
    [
      "Documents & scheduling",
      "Workspace · Microsoft 365",
      "A future adapter for company documents and calendar context.",
      "book",
      "Not connected",
    ],
  ];
  return `${head("Connect deliberately.", "Integration boundaries are explicit. Credentials belong on your server.", button("integration-guide", "Read setup guide", "book"), "Tools & integrations")}${banner()}<div class="integration-grid">${entries.map(([name, category, desc, ico, status]) => `<article class="integration-card"><div class="integration-logo">${icon(ico, 21)}</div><h3>${name}</h3><p><b>${category}</b><br>${desc}</p><footer><span class="pill ${status === "Configured" ? "" : "gray"}">${status}</span>${button("integration-info", "Details", "arrow", "btn-ghost btn-sm", `data-name="${name}"`)}</footer></article>`).join("")}</div>`;
}
function settingsView() {
  const c = company(
    companyFilter === "all" ? state.companies[0]?.id : companyFilter,
  );
  return `${head("Set the boundaries.", "Your authority is explicit, revocable, and always above the agent hierarchy.", "", "Workspace settings")}<div class="settings-grid"><section class="panel settings-card"><h2>Execution control</h2><p>Pause all companies immediately. Running results are invalidated and their missions return to the queue. You choose when work resumes.</p><div class="settings-fact"><span>Global execution</span><b>${state.paused ? "Paused" : "Enabled"}</b></div><div class="settings-fact"><span>External tool execution</span><b>Unavailable in this release</b></div><div class="settings-fact"><span>Owner review</span><b>Enforced</b></div>${button("global-pause", state.paused ? "Resume all execution" : "Pause all execution", state.paused ? "play" : "pause", state.paused ? "btn-primary" : "btn-danger")}</section><section class="panel settings-card"><h2>Review thresholds</h2><p>Flag proposed spend above a company threshold. All financial commitments still require approval, including those below this threshold.</p><form id="policy-form"><label for="policy-company">Company</label><select id="policy-company" name="companyId">${options(c?.id, false)}</select><label for="spend-limit">Spend review threshold (USD)</label><input id="spend-limit" name="spendLimit" type="number" min="0" max="1000000" required value="${c?.policy.spendLimit || 0}"><div class="form-error" role="alert"></div><button class="btn btn-primary" type="submit">Save threshold</button></form></section><section class="panel settings-card"><h2>Workspace & data</h2><p>${server ? "Your workspace is persisted in a local SQLite database. Export a portable copy or follow the backup guide to preserve the audit database." : "This public demo keeps fictional data in this browser. Export your workspace before clearing browser storage."}</p><div class="settings-fact"><span>Runtime</span><b>${server ? "Node.js + SQLite" : "Browser sandbox"}</b></div><div class="settings-fact"><span>Draft provider</span><b>${config.aiConfigured ? "Anthropic" : "Deterministic workflows"}</b></div>${button("export", "Export workspace", "download")}${!server ? button("reset", "Reset demo", "refresh", "btn-ghost") : ""}</section><section class="panel settings-card"><h2>Built in the open</h2><p>FROBOT is an MIT-licensed foundation for owner-controlled companies. Review the architecture, contribute an adapter, or run your own workspace.</p><a class="btn btn-secondary" href="${repo}" target="_blank" rel="noopener">${icon("github", 14)}GitHub repository ${icon("arrow", 12)}</a><div class="policy-note">This release prepares drafts. Real financial, tax, legal, hiring, and physical operations need their own integrations, validation, and deployment controls.</div>${server && config.authRequired ? button("logout", "Lock this session", "lock", "btn-ghost") : ""}</section></div>`;
}
function closeModal() {
  overlay.innerHTML = "";
  document.body.style.overflow = "";
  returnFocus?.focus?.();
}
function modal(title, body, footer = "", wide = false) {
  returnFocus = document.activeElement;
  overlay.innerHTML = `<div class="modal-backdrop ${wide ? "drawer-backdrop" : ""}" data-backdrop="true"><section class="${wide ? "drawer" : "modal"}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="modal-header"><h2>${title}</h2><button class="close-btn" data-action="close-modal" aria-label="Close dialog">${icon("close", 18)}</button></header>${body}${footer}</section></div>`;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() =>
    overlay.querySelector("input,textarea,select,button")?.focus(),
  );
}
const field = (label, name, input, help = "") =>
  `<div class="form-field"><label for="${name}">${label}</label>${input}${help ? `<small>${help}</small>` : ""}</div>`;
function newCompany() {
  modal(
    "A new venture starts here.",
    `<form id="company-form"><div class="modal-body"><div class="modal-note">Every company starts with six executive agents, fourteen department managers, its own knowledge base, and Owner approval gates.</div>${field("Company name", "name", '<input id="name" name="name" required maxlength="60" placeholder="e.g. Acorn Ventures">')}${field("Industry", "sector", '<select id="sector" name="sector"><option>Technology</option><option>Agriculture</option><option>Finance</option><option>Brand & Design</option><option>Other</option></select>')}${field("What is this company here to do?", "mission", '<textarea id="mission" name="mission" required maxlength="1000" placeholder="A clear mission gives your workforce a shared direction."></textarea>')}<div class="form-error" role="alert"></div></div><footer class="modal-footer">${button("close-modal", "Cancel", null)}<button class="btn btn-primary" type="submit">${icon("plus", 13)}Launch company</button></footer></form>`,
  );
}
function newMission(cid) {
  if (!state.companies.length) {
    newCompany();
    return;
  }
  const selected =
    cid || (companyFilter === "all" ? state.companies[0].id : companyFilter);
  modal(
    "Give your workforce a directive.",
    `<form id="mission-form"><div class="modal-body">${field("Company", "mission-company", `<select id="mission-company" name="companyId">${options(selected, false)}</select>`)}${field("What should we work on?", "title", '<input id="title" name="title" required maxlength="160" placeholder="e.g. Prepare a 30-day product launch plan">')}${field("Direction & expected result", "brief", '<textarea id="brief" name="brief" required maxlength="6000" placeholder="Describe the outcome, constraints, and what a good result looks like."></textarea>')}<div class="form-grid">${field("Lead department", "department", `<select id="department" name="department"><option value="">Auto-route</option>${ROLES.map((r) => `<option value="${r.code}">${r.code} · ${r.area}</option>`).join("")}</select>`)}${field("Action type", "kind", '<select id="kind" name="kind"><option value="draft">Internal draft</option><option value="research">Research plan</option><option value="spend">Financial proposal</option><option value="legal">Legal / tax proposal</option><option value="hiring">Hiring proposal</option><option value="communication">External communication draft</option></select>')}</div><div class="form-grid">${field("Proposed amount (USD)", "amount", '<input id="amount" name="amount" type="number" min="0" max="1000000000" step="0.01" value="0">')}${field("Priority", "priority", '<select id="priority" name="priority"><option value="normal">Normal</option><option value="high">High</option></select>')}</div>${field("Target date (optional)", "deadline", '<input id="deadline" name="deadline" type="date">')}<div class="modal-note">${config.aiConfigured ? "Running sends this brief and bounded company context to Anthropic for up to four role-specific requests." : "This mode runs deterministic planning and review without calling an AI service."} Sensitive proposals require your approval before they can run.</div><div class="form-error" role="alert"></div></div><footer class="modal-footer">${button("close-modal", "Cancel", null)}<button class="btn btn-primary" type="submit">${icon("spark", 13)}Create mission</button></footer></form>`,
  );
}
function taskDetail(tid) {
  const t = state.tasks.find((t) => t.id === tid);
  if (!t) return;
  const approval = state.approvals.find((a) => a.taskId === t.id);
  const messages = state.messages.filter((m) => m.taskId === t.id);
  modal(
    "Mission workspace",
    `<div class="modal-body"><div>${miniCompany(t.companyId)}</div><h2 class="detail-title">${esc(t.title)}</h2><div class="detail-meta">${pill(t.status)}<span>${t.department} agent</span><span>Created ${dateLabel(t.createdAt)}</span><span>${esc(t.priority)} priority</span>${t.deadline ? `<span>Target ${dateLabel(t.deadline)}</span>` : ""}</div><div class="message-chain"><b>Owner</b>${icon("arrow", 11)}<b>${t.department}</b>${icon("arrow", 11)}<b>Department manager</b>${icon("arrow", 11)}<b>Task specialist</b></div><section class="detail-section"><h3>Owner directive</h3><p>${esc(t.brief)}</p></section>${t.risk.length ? `<div class="risk-reasons">${icon("shield", 13)} ${t.risk.map(esc).join(" · ")}${t.amount ? `<br>Proposed: $${t.amount.toLocaleString()} USD` : ""}${approval?.note ? `<br>Owner decision: ${esc(approval.note)}` : ""}</div>` : ""}<div class="detail-actions">${["queued", "failed"].includes(t.status) ? button("run-task", busy.has(t.id) ? "Preparing draft…" : "Run mission", busy.has(t.id) ? "refresh" : "play", "btn-primary", `data-id="${t.id}" ${busy.has(t.id) || state.paused ? "disabled" : ""}`) : ""}${approval?.status === "pending" ? button("review", "Review decision", "shield", "btn-primary", `data-id="${approval.id}"`) : ""}${t.artifact ? button("download-result", "Download deliverable", "download", "btn-secondary", `data-id="${t.id}"`) : ""}</div>${server && ["queued", "failed"].includes(t.status) ? button("queue-task", "Queue in background", "clock", "btn-secondary", `data-id="${t.id}"`) : ""}${["queued", "running", "failed", "awaiting_approval"].includes(t.status) ? button("cancel-task", "Cancel mission", "close", "btn-danger", `data-id="${t.id}"`) : ""}${button("refresh-task", "Refresh status", "refresh", "btn-ghost", `data-id="${t.id}"`)}${tracePanel(t, esc)}${t.error ? `<div class="risk-reasons">${esc(t.error)}</div>` : ""}${t.artifact ? `<section class="detail-section"><h3>Deliverable · ${t.verification ? "Source-backed cash report" : t.provider === "anthropic" ? "AI-generated draft" : "Deterministic workflow result"}</h3><pre class="detail-artifact">${esc(t.artifact)}</pre></section>` : ""}<section class="detail-section"><h3>Mission history</h3>${state.events
      .filter((e) => e.taskId === t.id)
      .reverse()
      .map(eventRow)
      .join(
        "",
      )}</section><section class="detail-section"><h3>Structured handoffs · ${messages.length}</h3><p>${messages.length} routed messages recorded with sender, recipient, intent, priority, deadline, and company scope.</p></section><div class="modal-note">Completed means the draft is ready. No financial, legal, publishing, or deployment action has been executed.</div></div>`,
    "",
    true,
  );
  overlay.querySelector(".drawer").dataset.taskId = tid;
}
function review(aid) {
  const a = state.approvals.find((a) => a.id === aid);
  if (!a) return;
  const t = state.tasks.find((t) => t.id === a.taskId);
  modal(
    "An Owner decision is required.",
    `<form id="review-form"><input type="hidden" name="companyId" value="${a.companyId}"><input type="hidden" name="approvalId" value="${a.id}"><div class="modal-body">${miniCompany(a.companyId)}<h2 class="detail-title">${esc(t.title)}</h2><div class="detail-section"><p>${esc(t.brief)}</p></div><div class="risk-reasons">${a.reasons.map(esc).join("<br>")}${t.amount ? `<br>Amount: $${t.amount.toLocaleString()} USD` : ""}</div>${field("Decision note", "note", '<textarea id="note" name="note" required maxlength="1000" placeholder="Record the reason, boundaries, or requested changes."></textarea>')}<div class="modal-note">Approval releases this mission to prepare a draft. It does not authorize real transactions or send external messages.</div><div class="form-error" role="alert"></div></div><footer class="modal-footer"><button class="btn btn-danger" type="submit" name="decision" value="reject">Reject proposal</button><button class="btn btn-primary" type="submit" name="decision" value="approve">${icon("check", 13)}Approve draft preparation</button></footer></form>`,
  );
}
function addKnowledge() {
  if (!state.companies.length) {
    newCompany();
    return;
  }
  modal(
    "Give your company useful context.",
    `<form id="knowledge-form"><div class="modal-body">${field("Company", "kb-company", `<select id="kb-company" name="companyId">${options(companyFilter === "all" ? state.companies[0].id : companyFilter, false)}</select>`)}${field("Document title", "kb-title", '<input id="kb-title" name="title" required maxlength="120" placeholder="e.g. Brand voice and operating principles">')}${field("Knowledge", "content", '<textarea id="content" name="content" required maxlength="12000" rows="8" placeholder="Add the context agents should use. Do not paste credentials or sensitive personal data."></textarea>', "Company agents can only receive knowledge from their own company.")}<div class="form-error" role="alert"></div></div><footer class="modal-footer">${button("close-modal", "Cancel", null)}<button class="btn btn-primary" type="submit">Save knowledge</button></footer></form>`,
  );
}
function showSearch() {
  modal(
    "Find something in your workspace.",
    `<div class="modal-body"><div class="form-field"><label for="global-search">Search companies, missions, and knowledge</label><input id="global-search" placeholder="Start typing…" autocomplete="off"></div><div class="search-results" id="search-results"><div class="empty"><p>Your workspace, one search away.</p></div></div></div>`,
  );
}
function integrationInfo(name) {
  const ai = name === "Anthropic";
  modal(
    ai
      ? "Connect an AI reasoning provider"
      : `${esc(name)} integration boundary`,
    `<div class="modal-body"><div class="detail-section"><p>${ai ? "Run the Node.js backend, copy .env.example to .env, and set ANTHROPIC_API_KEY on the server. Restart the app. A run will then send its directive and company-scoped knowledge to Anthropic and save the returned draft. The API key is never sent to the browser." : "This connector is a documented extension point, not a working connection. No account is linked and no external action is available. Implement scoped credentials, an allowlisted adapter, and action-specific approval checks before enabling it."}</p></div><div class="modal-note">${ai ? "No API key is needed for the public sandbox. Templates remain available without any paid service." : "Real tax, banking, and employment operations need jurisdiction-specific validation and operational review."}</div><a class="btn btn-secondary" href="${repo}/blob/main/docs/INTEGRATIONS.md" target="_blank" rel="noopener">${icon("book", 14)}Read integration guide ${icon("arrow", 12)}</a></div>`,
  );
}
function download(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function runTask(tid) {
  const t = state.tasks.find((t) => t.id === tid);
  if (!t || busy.has(t.id)) return;
  busy.add(t.id);
  render();
  if (overlay.querySelector(".drawer")) taskDetail(t.id);
  try {
    await mutate("run", { companyId: t.companyId, taskId: t.id });
    notify("Your deliverable is ready.");
    taskDetail(t.id);
  } catch (e) {
    await refresh();
    render();
    notify(e.message);
    if (overlay.querySelector(".drawer")) taskDetail(t.id);
  } finally {
    busy.delete(t.id);
    render();
    if (overlay.querySelector(".drawer")) taskDetail(t.id);
  }
}
async function action(action, target) {
  switch (action) {
    case "sample-cfo":
      await sampleCFO();
      break;
    case "import-source":
      sourceModal();
      break;
    case "sample-csv":
      download("frobot-fictional-ledger.csv", SAMPLE_LEDGER, "text/csv");
      break;
    case "ledger-mission":
      await createLedgerMission(target.dataset.id);
      break;
    case "export-source": {
      const dataset = state.ledgers.find((d) => d.id === target.dataset.id);
      download("frobot-source.json", JSON.stringify(dataset, null, 2));
      break;
    }
    case "queue-task":
      queueModal(target.dataset.id);
      break;
    case "cancel-task": {
      const t = state.tasks.find((t) => t.id === target.dataset.id);
      await mutate("cancel", { companyId: t.companyId, taskId: t.id });
      taskDetail(t.id);
      notify("Mission cancelled. Stale results cannot complete it.");
      break;
    }
    case "refresh-task":
      await refresh();
      render();
      taskDetail(target.dataset.id);
      break;
    case "refresh-operations":
      await refresh();
      render();
      notify("Observed operations refreshed.");
      break;
    case "edit-knowledge":
      editKnowledge(target.dataset.id);
      break;
    case "menu":
      mobileOpen = !mobileOpen;
      render();
      break;
    case "new-company":
      newCompany();
      break;
    case "new-mission":
      newMission();
      break;
    case "company-mission":
      newMission(target.dataset.id);
      break;
    case "open-company":
      companyFilter = target.dataset.id;
      query = "";
      statusFilter = "all";
      location.hash = "missions";
      if (page === "missions") render();
      break;
    case "notifications":
      location.hash = "approvals";
      break;
    case "close-modal":
      closeModal();
      break;
    case "task-detail":
      taskDetail(target.dataset.id);
      break;
    case "review":
      review(target.dataset.id);
      break;
    case "run-task":
      await runTask(target.dataset.id);
      break;
    case "run-next": {
      const t = scope(state.tasks)
        .filter(
          (t) =>
            ["queued", "failed"].includes(t.status) &&
            !company(t.companyId)?.paused,
        )
        .sort(
          (a, b) =>
            (b.priority === "high") - (a.priority === "high") ||
            a.createdAt.localeCompare(b.createdAt),
        )[0];
      if (t) await runTask(t.id);
      else
        notify(
          "No runnable missions. Give a directive or review pending approvals.",
        );
      break;
    }
    case "company-pause": {
      const c = company(target.dataset.id);
      await mutate("pause", { companyId: c.id, paused: !c.paused });
      notify(`${c.name} ${c.paused ? "paused" : "resumed"}.`);
      break;
    }
    case "agent-pause": {
      const a = state.agents.find((a) => a.id === target.dataset.id);
      await mutate("pause", {
        companyId: a.companyId,
        agentId: a.id,
        paused: !a.paused,
      });
      notify("Agent execution preference updated.");
      break;
    }
    case "global-pause":
      await mutate("pause", { paused: !state.paused });
      notify(
        state.paused
          ? "All execution paused. Running results will be discarded."
          : "Execution resumed.",
      );
      break;
    case "add-knowledge":
      addKnowledge();
      break;
    case "knowledge-detail": {
      const k = state.knowledge.find((k) => k.id === target.dataset.id);
      modal(
        esc(k.title),
        `<div class="modal-body">${miniCompany(k.companyId)}<section class="detail-section"><pre class="detail-artifact">${esc(k.content)}</pre></section>${button("edit-knowledge", "Edit knowledge", "book", "btn-primary", `data-id="${k.id}"`)}${
          k.revisions?.length
            ? `<section class="detail-section"><h3>Version history</h3>${[
                ...k.revisions,
              ]
                .reverse()
                .map(
                  (r) =>
                    `<details class="trace-step"><summary>Version ${r.version} · ${esc(r.title)}</summary><pre class="detail-artifact">${esc(r.content)}</pre></details>`,
                )
                .join("")}</section>`
            : ""
        }</div>`,
      );
      break;
    }
    case "search":
      showSearch();
      break;
    case "integration-info":
      integrationInfo(target.dataset.name);
      break;
    case "integration-guide":
      integrationInfo("Accounting");
      break;
    case "download-result": {
      const t = state.tasks.find((t) => t.id === target.dataset.id);
      download(
        `${t.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`,
        t.artifact,
        "text/markdown",
      );
      notify("Deliverable downloaded.");
      break;
    }
    case "export":
      download("frobot-workspace.json", JSON.stringify(state, null, 2));
      notify("Workspace exported. Treat operational exports as private.");
      break;
    case "export-audit": {
      const audit = server
        ? await api("/api/audit")
        : {
            mode: "browser-sandbox",
            tamperEvident: false,
            events: scope(state.events),
            messages: scope(state.messages),
          };
      download("frobot-audit.json", JSON.stringify(audit, null, 2));
      notify("Audit log exported.");
      break;
    }
    case "reset":
      modal(
        "Reset this browser sandbox?",
        `<div class="modal-body"><div class="detail-section"><p>This replaces the fictional workspace in this browser. Export your workspace first if you want to keep your changes.</p></div></div>`,
        `<footer class="modal-footer">${button("close-modal", "Keep workspace", null)}${button("confirm-reset", "Reset demo", "refresh", "btn-danger")}</footer>`,
      );
      break;
    case "confirm-reset":
      engine = new Engine(seedState());
      state = engine.state;
      companyFilter = "all";
      persistSandbox();
      closeModal();
      render();
      notify("A fresh fictional workspace is ready.");
      break;
    case "logout":
      await api("/api/logout", {});
      csrf = null;
      location.reload();
      break;
  }
}
document.addEventListener("click", async (event) => {
  if (event.target.closest(".skip-link")) {
    event.preventDefault();
    document.querySelector("#main")?.focus();
    return;
  }
  const target = event.target.closest("[data-action]");
  if (target) {
    event.stopPropagation();
    try {
      await action(target.dataset.action, target);
    } catch (e) {
      notify(e.message);
    }
  } else if (event.target.dataset.backdrop) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    if (mobileOpen) {
      mobileOpen = false;
      render();
    }
    return;
  }
  if (event.key === "Tab" && overlay.firstChild) {
    const focus = [
      ...overlay.querySelectorAll(
        "button:not(:disabled),a[href],input:not([type=hidden]),select,textarea",
      ),
    ];
    if (!focus.length) return;
    const first = focus[0],
      last = focus[focus.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  if (
    ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName) ||
    overlay.firstChild
  )
    return;
  if (event.key === "/") {
    event.preventDefault();
    showSearch();
  }
  if (event.key.toLowerCase() === "n") {
    event.preventDefault();
    newMission();
  }
  if (
    event.key === "Enter" &&
    event.target.matches("[data-action]") &&
    event.target.tagName !== "BUTTON"
  ) {
    event.preventDefault();
    action(event.target.dataset.action, event.target).catch((e) =>
      notify(e.message),
    );
  }
});
document.addEventListener("change", (event) => {
  const el = event.target;
  if (el.id === "finance-company") {
    companyFilter = el.value;
    ledgerFilter = null;
    render();
  }
  if (el.id === "ledger-filter") {
    ledgerFilter = el.value;
    render();
  }
  if (el.id === "company-filter") {
    companyFilter = el.value;
    render();
  }
  if (el.id === "status-filter") {
    statusFilter = el.value;
    render();
  }
  if (el.id === "policy-company") {
    document.querySelector("#spend-limit").value = company(
      el.value,
    ).policy.spendLimit;
  }
});
document.addEventListener("input", (event) => {
  const el = event.target;
  if (["company-search", "mission-search", "activity-search"].includes(el.id)) {
    const caret = el.selectionStart;
    query = el.value;
    render();
    const next = document.getElementById(el.id);
    next.focus();
    next.setSelectionRange(caret, caret);
  }
  if (el.id === "global-search") {
    const q = el.value.toLowerCase().trim();
    const results = document.querySelector("#search-results");
    if (!q) {
      results.innerHTML = "";
      return;
    }
    results.innerHTML =
      [
        ...state.companies
          .filter((c) => c.name.toLowerCase().includes(q))
          .map(
            (c) =>
              `<button data-action="search-company" data-id="${c.id}">${esc(c.name)}<small>Company · ${esc(c.sector)}</small></button>`,
          ),
        ...state.tasks
          .filter((t) => t.title.toLowerCase().includes(q))
          .map(
            (t) =>
              `<button data-action="task-detail" data-id="${t.id}">${esc(t.title)}<small>Mission · ${esc(company(t.companyId)?.name)}</small></button>`,
          ),
        ...state.knowledge
          .filter((k) => `${k.title} ${k.content}`.toLowerCase().includes(q))
          .map(
            (k) =>
              `<button data-action="knowledge-detail" data-id="${k.id}">${esc(k.title)}<small>Knowledge · ${esc(company(k.companyId)?.name)}</small></button>`,
          ),
      ]
        .slice(0, 12)
        .join("") || '<div class="empty"><p>No matches found.</p></div>';
  }
});
document.addEventListener("click", (e) => {
  const t = e.target.closest('[data-action="search-company"]');
  if (t) {
    closeModal();
    companyFilter = t.dataset.id;
    location.hash = "missions";
    render();
  }
});
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (
    ![
      "company-form",
      "mission-form",
      "review-form",
      "knowledge-form",
      "policy-form",
      "login-form",
      "source-form",
      "queue-form",
      "knowledge-edit-form",
    ].includes(form.id)
  )
    return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const err = form.querySelector(".form-error");
  const controls = [...form.querySelectorAll('button[type="submit"]')];
  controls.forEach((b) => (b.disabled = true));
  try {
    if (form.id === "login-form") {
      const session = await api("/api/session", { token: data.token });
      csrf = session.csrf;
      await refresh();
      startPolling();
      closeModal();
      render();
      return;
    }
    if (form.id === "source-form") {
      const dataset = await mutate("source", data);
      companyFilter = dataset.companyId;
      ledgerFilter = dataset.id;
      closeModal();
      location.hash = "finance";
      render();
      notify(
        "Source validated and imported. No source row was silently dropped.",
      );
    }
    if (form.id === "queue-form") {
      if (data.runAt) data.runAt = new Date(data.runAt).toISOString();
      await mutate("enqueue", data);
      closeModal();
      location.hash = "operations";
      render();
      notify("Mission persisted in the background queue.");
    }
    if (form.id === "knowledge-edit-form") {
      await mutate("knowledgeUpdate", data);
      closeModal();
      notify("Knowledge version saved with previous content retained.");
    }
    if (form.id === "company-form") {
      await mutate("company", data);
      companyFilter = "all";
      closeModal();
      location.hash = "companies";
      render();
      notify("Company launched with its full executive and manager workforce.");
    }
    if (form.id === "mission-form") {
      data.idempotencyKey = crypto.randomUUID();
      await mutate("mission", data);
      companyFilter = data.companyId;
      closeModal();
      location.hash = "missions";
      render();
      notify("Directive received. Your mission is in the queue.");
    }
    if (form.id === "review-form") {
      data.decision = event.submitter.value;
      await mutate("decision", data);
      closeModal();
      notify(
        data.decision === "approve"
          ? "Draft preparation approved. Mission is queued."
          : "Proposal rejected. No execution will occur.",
      );
    }
    if (form.id === "knowledge-form") {
      await mutate("knowledge", data);
      closeModal();
      location.hash = "knowledge";
      render();
      notify("Knowledge saved to this company.");
    }
    if (form.id === "policy-form") {
      await mutate("policy", data);
      notify("Review threshold updated.");
    }
  } catch (e) {
    if (err) err.textContent = e.message;
    else notify(e.message);
  } finally {
    controls.forEach((b) => (b.disabled = false));
  }
});
function routePage() {
  const next = location.hash.slice(1);
  page = labels[next] ? next : "overview";
  if (page === "overview") companyFilter = "all";
  query = "";
  mobileOpen = false;
  render();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", routePage);
function login() {
  modal(
    "Unlock your Owner workspace.",
    `<form id="login-form"><div class="modal-body"><div class="modal-note">This server requires its configured Owner access token. The credential is exchanged for an expiring HttpOnly session cookie. It is not saved in browser storage.</div>${field("Owner token", "token", '<input id="token" name="token" type="password" required autocomplete="current-password">')}<div class="form-error" role="alert"></div></div><footer class="modal-footer"><button class="btn btn-primary" type="submit">Unlock workspace</button></footer></form>`,
  );
}
async function boot() {
  try {
    const response = await fetch("/runtime.json", {
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    if (data.app !== "frobot" || !["server", "sandbox"].includes(data.mode))
      throw Error("Unrecognized runtime.");
    server = data.mode === "server";
    config = data;
  } catch {
    app.innerHTML =
      '<div class="boot">Workspace unavailable<span>Could not load the runtime configuration. Reload this page to retry.</span></div>';
    return;
  }
  if (server) {
    try {
      const session = await api("/api/session");
      csrf = session.csrf;
      await refresh();
    } catch (e) {
      if (e.status === 401) {
        state = {
          companies: [],
          agents: [],
          tasks: [],
          approvals: [],
          events: [],
          messages: [],
          knowledge: [],
          ledgers: [],
          modelCalls: [],
          paused: false,
        };
        render();
        login();
        return;
      }
      app.innerHTML = `<div class="boot">Workspace unavailable<span>${esc(e.message)}</span></div>`;
      return;
    }
  } else {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      state =
        saved?.version === 1 && Array.isArray(saved.companies)
          ? saved
          : seedState();
    } catch {
      state = seedState();
    }
    engine = new Engine(state);
    for (const task of state.tasks.filter((t) => t.status === "running")) {
      task.status = "queued";
      task.runId = null;
      const staff = state.agents.find((a) => a.id === task.staffId);
      if (staff) staff.status = "archived";
    }
    persistSandbox();
  }
  routePage();
  startPolling();
}
function startPolling() {
  if (!server || pollTimer) return;
  pollTimer = setInterval(async () => {
    if (
      document.hidden ||
      busy.size ||
      overlay.querySelector("form") ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
    )
      return;
    const drawer = overlay.querySelector(".drawer"),
      tid = drawer?.dataset.taskId,
      previousTask = state.tasks.find((t) => t.id === tid)?.updatedAt,
      scroll = drawer?.scrollTop || 0;
    const revision = state.revision,
      previousOps = JSON.stringify(operations);
    try {
      await refresh();
      if (
        state.revision !== revision ||
        JSON.stringify(operations) !== previousOps
      ) {
        render();
        if (
          tid &&
          state.tasks.find((t) => t.id === tid)?.updatedAt !== previousTask
        ) {
          taskDetail(tid);
          overlay.querySelector(".drawer").scrollTop = scroll;
        }
      }
    } catch (e) {
      if (e.status === 401) {
        state = {
          companies: [],
          agents: [],
          tasks: [],
          approvals: [],
          events: [],
          messages: [],
          knowledge: [],
          ledgers: [],
          modelCalls: [],
          paused: false,
        };
        render();
        login();
      }
    }
  }, 3000);
}
document.addEventListener("change", async (event) => {
  if (event.target.id !== "source-file") return;
  const file = event.target.files?.[0];
  if (!file) return;
  const error = event.target.closest("form").querySelector(".form-error");
  if (file.size > 250000) {
    error.textContent = "CSV must be no larger than 250,000 bytes.";
    return;
  }
  try {
    document.querySelector("#source-csv").value = await file.text();
    const name = document.querySelector("#source-name");
    if (!name.value) name.value = file.name.slice(0, 100);
  } catch {
    error.textContent = "Could not read this file.";
  }
});
boot();
