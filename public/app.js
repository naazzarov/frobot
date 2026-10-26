import { Engine, ROLES, seedState, templateResult } from "./core.js";

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
let token = sessionStorage.getItem("frobot-token") || "";
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
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  if (server) state = (await api("/api/state")).state;
  else state = engine.state;
}
async function mutate(action, input = {}) {
  if (server) {
    await api(`/api/actions/${action}`, input);
    await refresh();
  } else {
    if (action === "run") {
      const ctx = engine.begin(input);
      persistSandbox();
      render();
      await new Promise((r) => setTimeout(r, 700));
      engine.finish({
        ...input,
        runId: ctx.runId,
        artifact: templateResult(ctx),
        provider: "template",
      });
    } else {
      const fn = {
        company: "createCompany",
        mission: "createTask",
        decision: "decide",
        pause: "pause",
        knowledge: "addKnowledge",
        policy: "updatePolicy",
      }[action];
      if (!fn) throw Error("Unknown action.");
      engine[fn](input);
    }
    state = engine.state;
    persistSandbox();
  }
  render();
}
function sidebar() {
  const count = state.approvals.filter((a) => a.status === "pending").length;
  return `<aside class="sidebar ${mobileOpen ? "open" : ""}" aria-label="Main navigation">
 <a href="#overview" class="logo"><span class="logo-mark"><svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M6 5h21v6H13v5h11v6H13v8H6zM19 0h8v3h-8z"/></svg></span>FROBOT</a><div class="logo-sub">THE COMPANY OPERATING SYSTEM</div>
 <div class="workspace"><span class="workspace-icon">${icon("globe", 16)}</span><div><b>Owner workspace</b><small>${state.companies.length} companies · One vision</small></div></div>
 <div class="sidebar-label">Workspace</div><nav>${nav.map(([id, ico, label]) => `<a class="nav-item ${page === id ? "active" : ""}" href="#${id}" ${page === id ? 'aria-current="page"' : ""}>${icon(ico, 17)}${label}${id === "approvals" && count ? `<span class="count">${count}</span>` : ""}</a>`).join("")}</nav>
 <div class="sidebar-label">Manage</div><a class="nav-item ${page === "integrations" ? "active" : ""}" href="#integrations">${icon("plug", 17)}Integrations</a><a class="nav-item ${page === "settings" ? "active" : ""}" href="#settings">${icon("settings", 17)}Settings</a>
 <div class="sidebar-spacer"></div><a class="nav-item" href="${repo}" target="_blank" rel="noopener">${icon("github", 16)}Open source${icon("arrow", 13)}</a>
 <div class="system-status"><b><span class="dot" ${state.paused ? 'style="background:#ccac73"' : ""}></span>${state.paused ? "Execution paused" : "Owner remains in control"}</b><small>${server ? "SQLite workspace · " + (config.aiConfigured ? "AI drafts enabled" : "Template mode") : "Public sandbox · Stored in this browser"}</small></div>
 <div class="owner"><span class="avatar">O</span><div><b>The Owner</b><small>Root authority</small></div>${icon("shield", 15)}</div></aside>`;
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
  };
  app.innerHTML = `${sidebar()}<div class="shell"><header class="topbar"><div class="breadcrumbs"><button class="small-icon mobile-menu" data-action="menu" aria-label="Toggle navigation">${icon("menu")}</button>${icon("globe", 14)}<span>Workspace</span>${icon("chevron", 10)}<b>${labels[page]}</b></div><div class="top-actions"><button class="search-trigger" data-action="search">${icon("search", 16)}<span>Search workspace</span><kbd class="key">/</kbd></button><span class="top-divider"></span><button class="small-icon" data-action="notifications" aria-label="View pending approvals">${icon("bell", 17)}${state.approvals.some((a) => a.status === "pending") ? '<span class="notification-dot"></span>' : ""}</button><span class="avatar" style="width:29px;height:29px;background:#e8eddf;color:#6b8055">O</span></div></header><main class="main" id="main" tabindex="-1">${state.paused ? `<div class="sandbox-banner paused-banner">${icon("pause", 14)}<b>All execution is paused.</b> Queued missions will remain on hold until you resume.${button("global-pause", "Resume", "play", "btn-ghost btn-sm")}</div>` : ""}${views[page]()}<footer class="bottom-note"><span>FROBOT v0.1 · One owner. Every company in view.</span><span>${server ? "Persistent workspace" : "Fictional data · No external actions"} · Open source</span></footer></main></div>`;
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
  return `<div class="sandbox-banner">${icon("spark", 13)}<span><b>${server ? "Your local operating system" : "Explore the public sandbox"}</b> · ${server ? (config.aiConfigured ? "AI generates drafts. You approve decisions. No external tools are connected." : "Template mode is active. Connect an AI provider in server configuration for generated drafts.") : "Fictional companies. Real workflows. Your changes stay in this browser."}</span><a href="${repo}" target="_blank" rel="noopener">View the code ↗</a></div>`;
}
function stats() {
  const tasks = scope(state.tasks),
    agents = scope(state.agents).filter((a) => a.status !== "archived"),
    done = tasks.filter((t) => t.status === "done").length;
  const values = [
    [
      "Companies",
      state.companies.filter(
        (c) => companyFilter === "all" || c.id === companyFilter,
      ).length,
      "building",
      `${state.companies.filter((c) => !c.paused).length} active across your workspace`,
    ],
    [
      "Active agents",
      agents.length,
      "agents",
      "Executive + manager + working staff",
    ],
    [
      "Missions completed",
      done,
      "check",
      `${tasks.filter((t) => t.status === "queued").length} queued for execution`,
    ],
    [
      "Awaiting approval",
      pending().length,
      "shield",
      "Your attention keeps things moving",
    ],
  ];
  return `<div class="stats">${values.map(([label, value, ico, foot]) => `<div class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon(ico, 15)}</span></div><div class="stat-value">${value.toString().padStart(2, "0")}</div><div class="stat-foot"><span class="${ico === "shield" ? "amber" : "green"}">${icon(ico === "shield" ? "clock" : "activity", 10)}</span>${foot}</div></div>`).join("")}</div>`;
}
function companyCard(c, full = false) {
  const tasks = state.tasks.filter((t) => t.companyId === c.id),
    agents = state.agents.filter(
      (a) => a.companyId === c.id && a.status !== "archived",
    );
  const needs = state.approvals.filter(
    (a) => a.companyId === c.id && a.status === "pending",
  ).length;
  return `<article class="company-card" tabindex="0" role="button" aria-label="Open ${esc(c.name)}" data-action="open-company" data-id="${c.id}"><div class="company-card-top"><span class="company-symbol" style="--company-color:${c.color}">${icon(c.sector === "Agriculture" ? "leaf" : c.sector === "Finance" ? "chart" : c.sector === "Brand & Design" ? "spark" : "code", 20)}</span><span class="pill ${c.paused ? "amber" : ""}"><span class="dot"></span>${c.paused ? "Paused" : "Operational"}</span></div><h3>${esc(c.name)}</h3><div class="company-sector">${esc(c.sector)}</div>${full ? `<p class="company-mission">${esc(c.mission)}</p>` : ""}<div class="company-card-stats"><div><strong>${agents.length}</strong><span>ACTIVE AGENTS</span></div><div><strong>${tasks.filter((t) => t.status === "done").length}<span style="display:inline;font-size:12px;color:#bbc3b1">/${tasks.length}</span></strong><span>MISSIONS DONE</span></div></div><div class="company-card-footer">${icon(needs ? "shield" : "check", 11)}${needs ? `${needs} decision${needs > 1 ? "s need" : " needs"} review` : "All decisions up to date"}${icon("arrow", 12)}</div>${full ? `<div class="company-card-actions">${button("company-pause", c.paused ? "Resume" : "Pause", c.paused ? "play" : "pause", "btn-secondary btn-sm", `data-id="${c.id}"`)}${button("company-mission", "New mission", "plus", "btn-ghost btn-sm", `data-id="${c.id}"`)}</div>` : ""}</article>`;
}
function taskRow(t) {
  return `<button class="task-row" data-action="task-detail" data-id="${t.id}"><span class="role-square">${icon(t.department === "CTO" ? "code" : t.department === "CFO" ? "chart" : t.department === "CMO" ? "spark" : "task", 14)}</span><span class="task-title"><b>${esc(t.title)}</b><small>${esc(company(t.companyId)?.name)} <span>·</span> ${t.department} agent <span>·</span> ${relative(t.createdAt)}</small></span>${pill(t.status)}${icon("chevron", 11)}</button>`;
}
function eventRow(e) {
  return `<div class="activity-row"><span class="activity-icon">${icon(e.type.includes("approval") ? "shield" : e.type.includes("completed") ? "check" : e.type.includes("created") ? "plus" : "activity", 11)}</span><div class="activity-copy"><p>${esc(e.summary)}</p><small>${esc(company(e.companyId)?.name || "Owner workspace")} · ${esc(e.actor)} · ${relative(e.at)}</small></div></div>`;
}
function overviewView() {
  const tasks = scope(state.tasks),
    ev = scope(state.events);
  return `${head("Your kingdom, at a glance.", "One owner. A coordinated workforce. Room for your next big idea.", button("new-company", "New company", "plus") + button("new-mission", "Give a directive", "spark", "btn-primary"))}${banner()}${stats()}<section class="company-section"><div class="section-heading"><h2>Your companies <small>${state.companies.length} in your ecosystem</small></h2><a class="text-link" href="#companies">View all companies ${icon("arrow", 12)}</a></div><div class="company-grid">${
    state.companies
      .slice(0, 4)
      .map((c) => companyCard(c))
      .join("") ||
    empty(
      "Your first company starts here.",
      "Create a company to provision its executive and manager workforce.",
      "new-company",
      "Create company",
    )
  }</div></section><div class="lower-grid"><section class="panel"><div class="panel-head"><h2>Mission control <small>Recent directives</small></h2><a class="text-link" href="#missions">View all ${icon("arrow", 11)}</a></div><div class="task-list">${[...tasks].reverse().slice(0, 5).map(taskRow).join("") || empty("No missions yet", "Give your workforce its first directive.", "new-mission", "New directive")}</div><div class="panel-footer"><span class="text-link">${icon("agents", 11)} ${tasks.filter((t) => t.status === "queued").length} missions ready for your workforce</span></div></section><section class="panel"><div class="panel-head"><h2>Live activity</h2><span class="pill"><span class="dot"></span>Workspace events</span></div><div class="activity-list">${[...ev].reverse().slice(0, 4).map(eventRow).join("")}</div><div class="panel-footer"><a class="text-link" href="#activity">Explore the activity log ${icon("arrow", 11)}</a></div></section></div>${pending().length ? `<div class="approval-strip"><span class="approval-icon">${icon("shield", 18)}</span><div><h3>A few decisions need your direction.</h3><p>${pending().length} pending ${pending().length === 1 ? "request" : "requests"} · Review commitments before your agents move forward.</p></div>${button("notifications", "Review decisions", "arrow", "btn-secondary")}</div>` : ""}`;
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
  return `${head("Set the boundaries.", "Your authority is explicit, revocable, and always above the agent hierarchy.", "", "Workspace settings")}<div class="settings-grid"><section class="panel settings-card"><h2>Execution control</h2><p>Pause all companies immediately. Running results are invalidated and their missions return to the queue. You choose when work resumes.</p><div class="settings-fact"><span>Global execution</span><b>${state.paused ? "Paused" : "Enabled"}</b></div><div class="settings-fact"><span>External tool execution</span><b>Unavailable in this release</b></div><div class="settings-fact"><span>Owner review</span><b>Enforced</b></div>${button("global-pause", state.paused ? "Resume all execution" : "Pause all execution", state.paused ? "play" : "pause", state.paused ? "btn-primary" : "btn-danger")}</section><section class="panel settings-card"><h2>Review thresholds</h2><p>Flag proposed spend above a company threshold. All financial commitments still require approval, including those below this threshold.</p><form id="policy-form"><label for="policy-company">Company</label><select id="policy-company" name="companyId">${options(c?.id, false)}</select><label for="spend-limit">Spend review threshold (USD)</label><input id="spend-limit" name="spendLimit" type="number" min="0" max="1000000" required value="${c?.policy.spendLimit || 0}"><div class="form-error" role="alert"></div><button class="btn btn-primary" type="submit">Save threshold</button></form></section><section class="panel settings-card"><h2>Workspace & data</h2><p>${server ? "Your workspace is persisted in a local SQLite database. Export a portable copy or follow the backup guide to preserve the audit database." : "This public demo keeps fictional data in this browser. Export your workspace before clearing browser storage."}</p><div class="settings-fact"><span>Runtime</span><b>${server ? "Node.js + SQLite" : "Browser sandbox"}</b></div><div class="settings-fact"><span>Draft provider</span><b>${config.aiConfigured ? "Anthropic" : "Deterministic templates"}</b></div>${button("export", "Export workspace", "download")}${!server ? button("reset", "Reset demo", "refresh", "btn-ghost") : ""}</section><section class="panel settings-card"><h2>Built in the open</h2><p>FROBOT is an MIT-licensed foundation for owner-controlled companies. Review the architecture, contribute an adapter, or run your own workspace.</p><a class="btn btn-secondary" href="${repo}" target="_blank" rel="noopener">${icon("github", 14)}GitHub repository ${icon("arrow", 12)}</a><div class="policy-note">This release prepares drafts. Real financial, tax, legal, hiring, and physical operations need their own integrations, validation, and deployment controls.</div>${server && config.authRequired ? button("logout", "Lock this session", "lock", "btn-ghost") : ""}</section></div>`;
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
    `<form id="mission-form"><div class="modal-body">${field("Company", "mission-company", `<select id="mission-company" name="companyId">${options(selected, false)}</select>`)}${field("What should we work on?", "title", '<input id="title" name="title" required maxlength="160" placeholder="e.g. Prepare a 30-day product launch plan">')}${field("Direction & expected result", "brief", '<textarea id="brief" name="brief" required maxlength="6000" placeholder="Describe the outcome, constraints, and what a good result looks like."></textarea>')}<div class="form-grid">${field("Lead department", "department", `<select id="department" name="department"><option value="">Auto-route</option>${ROLES.map((r) => `<option value="${r.code}">${r.code} · ${r.area}</option>`).join("")}</select>`)}${field("Action type", "kind", '<select id="kind" name="kind"><option value="draft">Internal draft</option><option value="research">Research plan</option><option value="spend">Financial proposal</option><option value="legal">Legal / tax proposal</option><option value="hiring">Hiring proposal</option><option value="communication">External communication draft</option></select>')}</div><div class="form-grid">${field("Proposed amount (USD)", "amount", '<input id="amount" name="amount" type="number" min="0" max="1000000000" step="0.01" value="0">')}${field("Priority", "priority", '<select id="priority" name="priority"><option value="normal">Normal</option><option value="high">High</option></select>')}</div>${field("Target date (optional)", "deadline", '<input id="deadline" name="deadline" type="date">')}<div class="modal-note">${config.aiConfigured ? "Running sends this brief and this company’s knowledge to Anthropic for a draft." : "This mode produces a planning template without calling an AI service."} Sensitive proposals require your approval before they can run.</div><div class="form-error" role="alert"></div></div><footer class="modal-footer">${button("close-modal", "Cancel", null)}<button class="btn btn-primary" type="submit">${icon("spark", 13)}Create mission</button></footer></form>`,
  );
}
function taskDetail(tid) {
  const t = state.tasks.find((t) => t.id === tid);
  if (!t) return;
  const approval = state.approvals.find((a) => a.taskId === t.id);
  const messages = state.messages.filter((m) => m.taskId === t.id);
  modal(
    "Mission workspace",
    `<div class="modal-body"><div>${miniCompany(t.companyId)}</div><h2 class="detail-title">${esc(t.title)}</h2><div class="detail-meta">${pill(t.status)}<span>${t.department} agent</span><span>Created ${dateLabel(t.createdAt)}</span><span>${esc(t.priority)} priority</span>${t.deadline ? `<span>Target ${dateLabel(t.deadline)}</span>` : ""}</div><div class="message-chain"><b>Owner</b>${icon("arrow", 11)}<b>${t.department}</b>${icon("arrow", 11)}<b>Department manager</b>${icon("arrow", 11)}<b>Task specialist</b></div><section class="detail-section"><h3>Owner directive</h3><p>${esc(t.brief)}</p></section>${t.risk.length ? `<div class="risk-reasons">${icon("shield", 13)} ${t.risk.map(esc).join(" · ")}${t.amount ? `<br>Proposed: $${t.amount.toLocaleString()} USD` : ""}${approval?.note ? `<br>Owner decision: ${esc(approval.note)}` : ""}</div>` : ""}<div class="detail-actions">${["queued", "failed"].includes(t.status) ? button("run-task", busy.has(t.id) ? "Preparing draft…" : "Run mission", busy.has(t.id) ? "refresh" : "play", "btn-primary", `data-id="${t.id}" ${busy.has(t.id) || state.paused ? "disabled" : ""}`) : ""}${approval?.status === "pending" ? button("review", "Review decision", "shield", "btn-primary", `data-id="${approval.id}"`) : ""}${t.artifact ? button("download-result", "Download deliverable", "download", "btn-secondary", `data-id="${t.id}"`) : ""}</div>${t.error ? `<div class="risk-reasons">${esc(t.error)}</div>` : ""}${t.artifact ? `<section class="detail-section"><h3>Deliverable · ${t.provider === "anthropic" ? "AI-generated draft" : "Planning template"}</h3><pre class="detail-artifact">${esc(t.artifact)}</pre></section>` : ""}<section class="detail-section"><h3>Mission history</h3>${state.events
      .filter((e) => e.taskId === t.id)
      .reverse()
      .map(eventRow)
      .join(
        "",
      )}</section><section class="detail-section"><h3>Structured handoffs · ${messages.length}</h3><p>${messages.length} routed messages recorded with sender, recipient, intent, priority, deadline, and company scope.</p></section><div class="modal-note">Completed means the draft is ready. No financial, legal, publishing, or deployment action has been executed.</div></div>`,
    "",
    true,
  );
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
        `<div class="modal-body">${miniCompany(k.companyId)}<section class="detail-section"><pre class="detail-artifact">${esc(k.content)}</pre></section></div>`,
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
      token = "";
      sessionStorage.removeItem("frobot-token");
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
      token = data.token;
      await refresh();
      sessionStorage.setItem("frobot-token", token);
      closeModal();
      render();
      return;
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
    `<form id="login-form"><div class="modal-body"><div class="modal-note">This server requires its configured Owner access token. It is kept only in this tab’s session storage.</div>${field("Owner token", "token", '<input id="token" name="token" type="password" required autocomplete="current-password">')}<div class="form-error" role="alert"></div></div><footer class="modal-footer"><button class="btn btn-primary" type="submit">Unlock workspace</button></footer></form>`,
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
  if (server)
    setInterval(async () => {
      if (
        overlay.firstChild ||
        document.hidden ||
        busy.size ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
      )
        return;
      try {
        await refresh();
        render();
      } catch {
        /* Foreground actions display connection errors. */
      }
    }, 10000);
}
boot();
