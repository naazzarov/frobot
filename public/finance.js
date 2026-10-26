// Exact, source-backed cash movement analysis. No model computes these figures.
export const SAMPLE_LEDGER = `date,description,amount,currency,category
2026-09-01,Opening customer project,4200.00,USD,Services
2026-09-03,Cloud hosting,-180.25,USD,Infrastructure
2026-09-07,Research engagement,1750.50,USD,Services
2026-09-10,Design contractor,-640.00,USD,Contractors
2026-09-16,Software subscriptions,-125.75,USD,Software
2026-09-22,Advisory engagement,950.00,USD,Services
2026-10-02,Customer project milestone,3800.00,USD,Services
2026-10-04,Cloud hosting,-195.10,USD,Infrastructure
2026-10-08,Design contractor,-720.00,USD,Contractors
2026-10-12,Software subscriptions,-125.75,USD,Software
2026-10-18,Workshop engagement,1200.00,USD,Services
2026-10-22,Uncategorized expense,-84.30,USD,
`;
export class LedgerError extends Error {}
const invalid = (message) => {
  throw new LedgerError(message);
};
export function readCSV(source) {
  if (typeof source !== "string" || !source.trim() || source.length > 250000)
    invalid("CSV must contain 1–250,000 characters.");
  source = source.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [],
    cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
      continue;
    }
    if (c === '"') {
      if (cell || closed) invalid("Unexpected quote in CSV.");
      quoted = true;
      continue;
    }
    if (c === "," || c === "\n" || c === "\r") {
      row.push(cell);
      cell = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && source[i + 1] === "\n") i++;
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
      }
    } else {
      if (closed) invalid("Unexpected content after a quoted CSV field.");
      cell += c;
    }
    if (rows.length > 1001)
      invalid("A source may contain at most 1,000 transaction rows.");
  }
  if (quoted) invalid("Unclosed CSV quote.");
  if (cell || row.length) {
    row.push(cell);
    if (row.some((v) => v.trim())) rows.push(row);
  }
  return rows;
}
export function parseAmount(value) {
  if (
    typeof value !== "string" ||
    !/^-?\d{1,10}(?:\.\d{1,2})?$/.test(value.trim())
  )
    invalid(
      "Amounts must be signed decimals with up to two decimal places, without currency symbols or grouping separators.",
    );
  const v = value.trim(),
    negative = v.startsWith("-"),
    [whole, fraction = ""] = v.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents > 100000000000) invalid("Amount exceeds the supported limit.");
  return negative ? -cents : cents;
}
export function parseLedger(source) {
  const table = readCSV(source);
  const headers = table.shift()?.map((v) => v.trim().toLowerCase());
  if (
    !headers ||
    new Set(headers).size !== headers.length ||
    !["date", "description", "amount", "currency"].every((h) =>
      headers.includes(h),
    )
  )
    invalid(
      "Required unique CSV columns: date, description, amount, currency. Optional: category.",
    );
  if (
    headers.some(
      (h) =>
        !["date", "description", "amount", "currency", "category"].includes(h),
    )
  )
    invalid("Unsupported CSV column. Use the documented five-column format.");
  if (!table.length || table.length > 1000)
    invalid("Provide 1–1,000 transactions.");
  const seen = new Map();
  const currencies = new Set();
  const rows = table.map((cells, index) => {
    if (cells.length !== headers.length)
      invalid(`Row ${index + 2} has the wrong number of columns.`);
    const record = Object.fromEntries(
      headers.map((h, i) => [h, cells[i].trim()]),
    );
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
      !Number.isFinite(Date.parse(record.date)) ||
      new Date(record.date).toISOString().slice(0, 10) !== record.date
    )
      invalid(`Row ${index + 2} has an invalid ISO date.`);
    if (
      !record.description ||
      record.description.length > 200 ||
      (record.category || "").length > 60
    )
      invalid(`Row ${index + 2} has an invalid description or category.`);
    if (
      ![
        "USD",
        "EUR",
        "GBP",
        "CNY",
        "IDR",
        "AED",
        "SGD",
        "AUD",
        "CAD",
        "JPY",
        "INR",
        "MYR",
      ].includes(record.currency)
    )
      invalid(`Row ${index + 2} has an unsupported currency code.`);
    if (
      ["JPY", "IDR"].includes(record.currency) &&
      /\.\d*[1-9]/.test(record.amount)
    )
      invalid(
        `Row ${index + 2}: ${record.currency} requires whole currency units in this import format.`,
      );
    currencies.add(record.currency);
    const row = {
      id: `row_${String(index + 1).padStart(4, "0")}`,
      sourceRecord: index + 2,
      date: record.date,
      description: record.description,
      amountCents: parseAmount(record.amount),
      currency: record.currency,
      category: record.category || "Uncategorized",
    };
    const key = JSON.stringify([
      row.date,
      row.description,
      row.amountCents,
      row.currency,
      row.category,
    ]);
    row.duplicateOf = seen.get(key) || null;
    if (!row.duplicateOf) seen.set(key, row.id);
    return row;
  });
  if (currencies.size !== 1)
    invalid(
      "Use one currency per source. Currency conversion is not performed.",
    );
  return { rows, currency: rows[0].currency };
}
export function summarizeLedger(dataset) {
  const rows = dataset.rows;
  let inflowCents = 0,
    outflowCents = 0;
  const months = new Map(),
    categories = new Map();
  for (const row of rows) {
    if (!Number.isSafeInteger(row.amountCents))
      invalid("Source contains an unsafe amount.");
    if (row.amountCents >= 0) inflowCents += row.amountCents;
    else outflowCents -= row.amountCents;
    const month = row.date.slice(0, 7),
      m = months.get(month) || {
        month,
        inflowCents: 0,
        outflowCents: 0,
        netCents: 0,
      };
    if (row.amountCents >= 0) m.inflowCents += row.amountCents;
    else m.outflowCents -= row.amountCents;
    m.netCents += row.amountCents;
    months.set(month, m);
    if (row.amountCents < 0)
      categories.set(
        row.category,
        (categories.get(row.category) || 0) - row.amountCents,
      );
  }
  if (!Number.isSafeInteger(inflowCents) || !Number.isSafeInteger(outflowCents))
    invalid("Source totals exceed safe integer limits.");
  return {
    datasetId: dataset.id,
    currency: dataset.currency,
    rowCount: rows.length,
    inflowCents,
    outflowCents,
    netCents: inflowCents - outflowCents,
    start: rows.map((r) => r.date).sort()[0],
    end: rows
      .map((r) => r.date)
      .sort()
      .at(-1),
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    categories: [...categories]
      .map(([category, outflowCents]) => ({ category, outflowCents }))
      .sort((a, b) => b.outflowCents - a.outflowCents),
    uncategorized: rows
      .filter((r) => r.category === "Uncategorized")
      .map((r) => r.id),
    duplicates: rows
      .filter((r) => r.duplicateOf)
      .map((r) => ({ id: r.id, duplicateOf: r.duplicateOf })),
    evidenceIds: rows.map((r) => r.id),
  };
}
export const money = (cents, currency) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
const markdownText = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\r\n\t]/g, " ")
    .replace(/([\\`*_{}\[\]#!|])/g, "\\$1");
export function ledgerReport(dataset) {
  const s = summarizeLedger(dataset),
    fmt = (c) => money(c, s.currency);
  return `# Source-backed cash movement report\n\nSource: ${markdownText(dataset.name)}\nSource ID: ${dataset.id}\nCurrency: ${s.currency}\nPeriod: ${s.start} to ${s.end}\nTransactions: ${s.rowCount}\n\n## Verified totals\n- Cash inflows: ${fmt(s.inflowCents)}\n- Cash outflows: ${fmt(s.outflowCents)}\n- Net cash movement: ${fmt(s.netCents)}\n\n## Monthly movements (latest 24 source months)\n${s.months
    .slice(-24)
    .map(
      (m) =>
        `- ${m.month}: inflows ${fmt(m.inflowCents)}, outflows ${fmt(m.outflowCents)}, net ${fmt(m.netCents)}`,
    )
    .join("\n")}\n\n## Expense categories (largest 20)\n${
    s.categories
      .slice(0, 20)
      .map((c) => `- ${markdownText(c.category)}: ${fmt(c.outflowCents)}`)
      .join("\n") || "No outgoing transactions."
  }\n\n## Review flags\n- Uncategorized rows: ${s.uncategorized.slice(0, 50).join(", ") || "none"}\n- Potential duplicates: ${
    s.duplicates
      .slice(0, 50)
      .map((d) => `${d.id} resembles ${d.duplicateOf}`)
      .join("; ") || "none"
  }\n- Duplicate rows are included in totals; no source row was silently discarded.\n\n## Row-level evidence (first 80 rows; export source JSON for the full ledger)\n${dataset.rows
    .slice(0, 80)
    .map(
      (r) =>
        `- [${r.id}] record ${r.sourceRecord || r.sourceLine} | ${r.date} | ${markdownText(r.description)} | ${fmt(r.amountCents)} | ${markdownText(r.category)}`,
    )
    .join(
      "\n",
    )}\n\n## Limits\nCalculated using integer minor units from every imported row. This is cash movement, not profit, a bank balance, a reconciliation, a tax return, or verified accounting advice. No opening balance, invoice accruals, or currency conversion is inferred. ${dataset.synthetic ? "This source is fictional demo data." : "Validate imported records against the original source before operational use."}\n`;
}
