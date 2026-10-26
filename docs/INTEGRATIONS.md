# Model and tool integration boundaries

## Existing model provider interface

`src/providers.js` exports `createProvider(env)`, which returns:

```js
{
  name: 'provider-name',
  async generate(context, signal) {
    // Return a plain-text/Markdown draft, 1–30,000 characters.
  }
}
```

The context contains a cloned mission, its company, the current run ID, and only that company’s knowledge entries. The default template provider requires no key and performs no network calls. The Anthropic provider sends a bounded context to the Messages API, has a 60-second timeout, accepts cancellation, and returns text. Each run makes one model request, not a recursive multi-agent loop. Live research, citations, and retrieved documents are not available unless supplied by the Owner.

Providers must never execute code, contact people, alter workspace state, or call financial/legal tools. They must not receive secrets, the full cross-company workspace, or the Owner token. A model response is untrusted text and never becomes an API action. Do not log raw upstream errors or headers.

To test a provider, inject it into `createApp({store, provider})`. Existing HTTP tests demonstrate success, failure, concurrency, and cancellation behavior without a real provider key.

## External tools: not implemented

The UI lists accounting, banking/payments, CRM, communications, documents/calendar, and related integration categories as unconnected. No OAuth flow, live account, background sync, or tool executor exists in this release. Do not mark a card connected just because a key is present.

Before adding an adapter:

1. Define the exact operation, supported tenant/company scope, input schema, and least-privilege credential scope.
2. Keep credentials in a dedicated server-side secret manager. Store only non-secret credential references with a company.
3. Separate read operations from external side effects. Bind Owner approval to the exact normalized action payload, destination, amount/currency, expiry, and operation type.
4. Revalidate that payload, company boundary, grant, pause state, and approval immediately before execution. Models cannot mint their own approval or authorize a new operation by paraphrasing it.
5. Use upstream idempotency and reconciliation. A timeout means the result is unknown; query upstream state before retrying a transaction.
6. Log redacted operation metadata, upstream correlation IDs, approval references, and outcomes. Never log secrets, full bank records, personal identifiers, or unnecessary message content.
7. Add contract, cross-company, duplicate-action, pause-race, expired-approval, and provider-outage tests before enabling the adapter.
8. Review compliance, data processing, retention, and permission scopes for the actual jurisdiction and service. Tax and legal workflows need qualified human validation.

Approval in v0.1 authorizes **draft preparation only**. It must not be reused as transaction approval in a future adapter.

## Candidate adapters

- Accounting: read-only financial records before invoices or other write operations.
- Communications: draft-only before payload-specific outgoing message approval.
- CRM: scoped read-only pipeline context before contact creation or outreach.
- Documents: company-scoped retrieval with provenance and access validation.
- Banking: read-only reconciliation first; transactions require a separate risk review.
- Tax/government: jurisdiction-specific draft checklists before any submission capability.

The repository contains no real service credentials or organization account details.
