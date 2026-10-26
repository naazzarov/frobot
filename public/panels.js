import { summarizeLedger, money } from "./finance.js";
export function financePanel({
  state,
  selected,
  esc,
  icon,
  button,
  head,
  options,
  ledgerId,
}) {
  const cid =
    selected === "all"
      ? (
          state.companies.find((c) => c.sector === "Finance") ||
          state.companies[0]
        )?.id
      : selected;
  const sources = (state.ledgers || []).filter((d) => d.companyId === cid);
  const dataset = sources.find((d) => d.id === ledgerId) || sources.at(-1),
    s = dataset ? summarizeLedger(dataset) : null;
  const company = state.companies.find((c) => c.id === cid);
  const fmt = (v) => money(v, s.currency);
  const max = s
    ? Math.max(1, ...s.months.flatMap((m) => [m.inflowCents, m.outflowCents]))
    : 1;
  return `${head("Numbers you can trace.", "Cash movements calculated from source rows. Every figure has a trail.", button("sample-cfo", "Try a CFO workflow", "spark", "btn-primary") + button("import-source", "Import CSV", "plus"), "The finance workspace")}<div class="filterbar"><select id="finance-company" aria-label="Select finance company">${options(cid, false)}</select>${sources.length ? `<select id="ledger-filter" aria-label="Select source">${sources.map((d) => `<option value="${d.id}" ${d.id === dataset.id ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select>` : ""}<span class="shortcut-hint">${company ? esc(company.name) : "Create a company to begin"} · ${sources.length} immutable sources</span></div>
 ${
   !s
     ? `<section class="panel finance-welcome"><div class="finance-welcome-symbol">${icon("chart", 44)}</div><span class="eyebrow">FROM RECORDS TO A REVIEWABLE RESULT</span><h2>Give your CFO something real to work with.</h2><p>Import a transaction CSV or try the fictional sample. FROBOT calculates cash movement, surfaces source-quality flags, and builds a report through four inspectable stages.</p><div class="detail-actions">${button("sample-cfo", "Run the sample workflow", "play", "btn-primary")}${button("sample-csv", "Download sample CSV", "download")}</div><div class="policy-note">No bank is connected. The public sandbox keeps data in this browser; use fictional records here. The private backend stores sources in SQLite.</div></section>`
     : `<div class="finance-source-banner"><span>${icon("book", 16)}<b>${esc(dataset.name)}</b><span>${s.rowCount} rows · ${s.start} → ${s.end}</span></span><span class="pill ${dataset.synthetic ? "purple" : "gray"}">${dataset.synthetic ? "Fictional sample" : "Owner-imported source"}</span></div><div class="finance-metrics">${[
         ["Cash inflows", s.inflowCents, "mint"],
         ["Cash outflows", s.outflowCents, "peach"],
         ["Net movement", s.netCents, "violet"],
       ]
         .map(
           ([label, value, tone]) =>
             `<article class="stat stat-${tone}"><div class="stat-top">${label}</div><div class="finance-number">${esc(fmt(value))}</div><div class="stat-foot">${s.currency} · integer calculation · all ${s.rowCount} rows</div></article>`,
         )
         .join(
           "",
         )}</div><div class="finance-layout"><section class="panel"><header class="panel-head"><h2>Monthly cash movement</h2><span class="chart-legend"><i></i>Inflow <i></i>Outflow</span></header><div class="cash-chart" role="img" aria-label="${esc(
         s.months
           .slice(-12)
           .map(
             (m) =>
               `${m.month}: inflow ${fmt(m.inflowCents)}, outflow ${fmt(m.outflowCents)}`,
           )
           .join("; "),
       )}">${s.months
         .slice(-12)
         .map(
           (m) =>
             `<div class="cash-month"><div class="cash-bars"><span style="height:${(m.inflowCents / max) * 100}%" title="${esc(fmt(m.inflowCents))}"></span><span style="height:${(m.outflowCents / max) * 100}%" title="${esc(fmt(m.outflowCents))}"></span></div><small>${m.month}</small></div>`,
         )
         .join(
           "",
         )}</div><div class="panel-footer"><span class="text-link">Exact monthly figures are included in the generated report. Showing up to 12 months.</span></div></section><aside class="panel source-quality"><span class="eyebrow">SOURCE QUALITY</span><h2>Keep the judgment human.</h2><div><b>${s.uncategorized.length}</b><span>Uncategorized rows</span></div><div><b>${s.duplicates.length}</b><span>Potential duplicates</span></div><p>Duplicates remain in totals. No row is silently removed. Cash movement is neither profit nor a bank balance.</p>${button("ledger-mission", "Prepare CFO report", "spark", "btn-primary", `data-id="${dataset.id}"`)}</aside></div><section class="panel"><header class="panel-head"><h2>Source evidence <small>First 60 rows</small></h2>${button("export-source", "Export full source JSON", "download", "btn-secondary btn-sm", `data-id="${dataset.id}"`)}</header><div class="table-wrap"><table class="mission-table"><thead><tr><th>EVIDENCE</th><th>DATE</th><th>DESCRIPTION</th><th>CATEGORY</th><th>AMOUNT</th><th>FLAGS</th></tr></thead><tbody>${dataset.rows
         .slice(0, 60)
         .map(
           (r) =>
             `<tr><td><code>${r.id}</code></td><td>${r.date}</td><td class="mission-name">${esc(r.description)}</td><td>${esc(r.category)}</td><td>${esc(money(r.amountCents, r.currency))}</td><td>${r.duplicateOf ? `Duplicate of ${r.duplicateOf}` : r.category === "Uncategorized" ? "Needs category" : "—"}</td></tr>`,
         )
         .join(
           "",
         )}</tbody></table></div></section><div class="policy-note">The calculator uses all ${s.rowCount} rows. Sources are immutable and company-scoped. Reports carry source IDs and row references. Source completeness and accounting validity still require Owner review.</div>`
 }`;
}
export function tracePanel(task, esc) {
  const trace = task.trace || [],
    v = task.verification;
  const proof = v
    ? `<section class="verified-proof"><span class="pill">CALCULATED FROM SOURCE</span><h3>${esc(money(v.netCents, v.currency))} net cash movement</h3><p>${v.rowCount} rows · ${v.currency} · ${esc(v.datasetId)}<br>Source totals are computed with integer amounts; the model cannot replace them.</p></section>`
    : "";
  const empty =
    task.status === "done"
      ? "This legacy result has no four-stage trace. Create a new mission to inspect the new workflow."
      : "Run this mission to inspect executive planning, manager breakdown, specialist execution, and review.";
  const stages = trace.length
    ? trace
        .map((step, i) => {
          const rejected =
            step.stage === "reviewer" && step.output?.passed === false;
          return `<details class="trace-step"><summary><span class="trace-index">0${i + 1}</span><span><b>${esc(step.label)}</b><small>${step.provider === "anthropic" ? "Bounded AI stage" : "Deterministic stage"} · ${esc(step.role)}</small></span><span class="pill ${rejected ? "amber" : ""}">${rejected ? "Changes requested" : "Complete"}</span></summary><pre class="detail-artifact">${esc(JSON.stringify(step.output, null, 2))}</pre></details>`;
        })
        .join("")
    : `<p>${empty}</p>`;
  return `${proof}<section class="detail-section workflow-trace"><h3>Workflow stages · ${trace.length}/4 complete</h3>${stages}</section>`;
}
export function operationsPanel({
  state,
  server,
  operations,
  esc,
  button,
  head,
}) {
  const counts = { queued: 0, running: 0, done: 0, failed: 0 };
  for (const t of state.tasks) if (t.status in counts) counts[t.status]++;
  const jobs = operations?.jobs || [],
    w = operations?.worker;
  return `${head("See what is actually happening.", "Queue state, execution capacity, source evidence, and model-request budgets.", button("refresh-operations", "Refresh", "refresh"), "Operations")}<div class="finance-metrics">${[
    ["Queued missions", counts.queued],
    ["Running missions", counts.running],
    ["Failed missions", counts.failed],
  ]
    .map(
      ([label, value]) =>
        `<article class="stat"><div class="stat-top">${label}</div><div class="stat-value">${value}</div></article>`,
    )
    .join(
      "",
    )}</div><div class="settings-grid"><section class="panel settings-card"><h2>${server ? "Background worker" : "Browser sandbox"}</h2><p>${server ? "Queued jobs persist in SQLite and run while the Node process is online. Interrupted runs need explicit inspection and retry; paid calls are never silently replayed." : "The public demo runs deterministic workflows only while this browser is open. It has no background server, shared database, or API key."}</p>${w ? `<div class="settings-fact"><span>Running / capacity</span><b>${w.running} / ${w.concurrency}</b></div><div class="settings-fact"><span>Requests reserved today (UTC)</span><b>${w.modelRequestsToday} / ${w.maxDailyCalls}</b></div><div class="settings-fact"><span>Reported input / output tokens</span><b>${w.reportedInputTokens} / ${w.reportedOutputTokens}</b></div><div class="settings-fact"><span>Uncertain requests</span><b>${w.uncertainModelRequests}</b></div>` : ""}</section><section class="panel settings-card"><h2>Evidence & integrity</h2><p>Only observed workspace counts appear here. No revenue, time-saved, or accuracy scores are invented.</p><div class="settings-fact"><span>Company sources</span><b>${state.ledgers?.length || 0}</b></div><div class="settings-fact"><span>Completed stage records</span><b>${state.tasks.reduce((n, t) => n + (t.trace?.length || 0), 0)}</b></div><div class="settings-fact"><span>Audit events</span><b>${state.events.length}</b></div><div class="settings-fact"><span>Audit chain</span><b>${server && operations?.audit?.valid ? "Verified locally" : "Browser history only"}</b></div></section></div><section class="panel" style="margin-top:20px"><header class="panel-head"><h2>Durable job history</h2><small>${server ? `${jobs.length} jobs` : "Available in the backend"}</small></header>${
    jobs.length
      ? `<div class="table-wrap"><table class="mission-table"><thead><tr><th>MISSION</th><th>STATUS</th><th>SCHEDULED</th><th>ATTEMPTS</th><th>OUTCOME</th></tr></thead><tbody>${jobs
          .slice(0, 100)
          .map(
            (j) =>
              `<tr data-action="task-detail" data-id="${j.taskId}"><td class="mission-name">${esc(state.tasks.find((t) => t.id === j.taskId)?.title || j.taskId)}</td><td>${esc(j.status)}</td><td>${esc(new Date(j.runAt).toLocaleString())}</td><td>${j.attempts}</td><td>${esc(j.error || "—")}</td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : '<div class="empty"><p>Queue a mission from its detail panel to create a durable job.</p></div>'
  }</section>`;
}
