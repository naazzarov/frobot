# Contributing to FROBOT

1. Open an issue describing the workflow, expected behavior, and acceptance criteria. For security findings, follow SECURITY.md instead.
2. Fork the repository and create a focused branch.
3. Run Node 22.13+ and start the application with `npm start`. No dependencies need installation.
4. Add regression coverage for changes to company scoping, approval enforcement, persistence, or task lifecycle. Do not add tests that only repeat view implementation details.
5. Run `npm run check` and `npm test`. Check the affected browser workflow with keyboard and narrow-screen layouts.
6. Submit a pull request describing the problem, resulting behavior, validation, and limitations.

Keep domain, finance, and stage behavior in the shared `public/core.js`, `finance.js`, and `workflow.js` modules. Providers receive cloned, bounded company context and return typed stage objects; they must not execute tools or modify trusted source state. Future real tool adapters need their own review-bound, payload-specific authorization.

Use synthetic examples. Never attach the internal project brief, a live database, `.env`, customer records, credentials, or logs containing private material. Avoid new dependencies unless their benefit and maintenance cost justify them.
