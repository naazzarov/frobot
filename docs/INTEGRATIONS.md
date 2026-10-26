# Model and service integration boundaries

## Current provider contract

`createProvider(env)` returns a deterministic provider when no key is configured, or an Anthropic provider with:

```js
{
  name: 'anthropic',
  async generateStage(stage, context, priorOutputs, signal) {
    return { value: structuredStageOutput, usage: { inputTokens, outputTokens } };
  }
}
```

The four contracts are defined in `public/workflow.js`: executive objective/acceptance/risks; manager steps/definition of done; specialist artifact/evidence IDs; reviewer passed/issues/summary. Output types and bounds are validated. A failed contract, unknown citation, or rejected review prevents completion. Finance narratives must be qualitative; trusted calculation code supplies all numeric report figures.

The gateway uses one Messages API request per stage, max 1,800 output tokens each, a 60-second request timeout, and cancellation. Context includes the task, company mission, bounded knowledge, computed finance summary, up to 80 source rows, and prior stage outputs. A cloned context prevents providers from altering the trusted ledger calculation inputs. The final exact calculation still uses every imported row.

The runner persists request reservations before Anthropic calls and enforces global/per-company UTC-day caps. Failed/uncertain calls remain counted. Reported token totals are observability data, not verified billing. No automatic provider retry occurs. Legacy injected providers with `generate(context, signal)` are retained for compatibility/testing; they have no four-stage trace.

No real provider key was supplied for this build. Gateway contracts and failure behavior are tested with injected responses, not a live Anthropic request. Real model reliability, latency, cost, and quality require private credentialed evaluation.

## Finance source adapter

The working input adapter is Owner-imported CSV, not a bank or accounting-service connection. Required columns are `date,description,amount,currency`; category is optional. Sources are company-scoped, immutable, and limited to one supported currency and 1,000 rows. Signed decimal amounts use at most two decimal places; JPY/IDR imports require whole units. No grouping symbols, exponent notation, silent date fixes, currency conversion, or inferred opening balance is accepted.

Use the downloadable fictional sample to see the format. Duplicate transactions remain counted and flagged. Duplicate source import into a company is rejected. Source labels are Owner metadata; the software cannot certify an uploaded record’s authenticity or completeness.

## External operations remain unavailable

Accounting platforms, banking, CRM, communications, cloud documents/calendars, tax systems, and physical devices are not connected. The UI must continue to show them as unconnected. There is no OAuth flow, live synchronization, transaction executor, outgoing-message sender, or code execution tool.

Before adding an adapter:

1. Define a typed, allowlisted operation and exact company/credential scope.
2. Keep credentials in a server-side vault; store non-secret references only.
3. Separate read operations from external side effects. Bind approval to the precise payload, destination, amount/currency, expiry, and operation.
4. Revalidate scope, grant, pause state, and unchanged payload immediately before execution. Models cannot approve their own actions.
5. Use upstream idempotency and reconciliation. A timeout is an unknown outcome; inspect upstream state before repeating a commitment.
6. Log redacted correlation IDs, approval references, and outcomes; never secrets or unnecessary private records.
7. Test cross-company access, altered payloads, expired grants, duplicate actions, cancellation races, and outages in service sandboxes.
8. Review jurisdiction-specific handling with qualified people before legal/tax/employment use.

Current approvals authorize a deliverable, not a real-world transaction. Do not reuse them as a future banking or publication grant.
