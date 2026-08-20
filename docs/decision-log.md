# LeadRescue AI Decision Log

This file records implemented or explicitly approved decisions that materially affect release, security, architecture, or commercial readiness. It does not replace the Project MASTER CURRENT STATE.

## 2026-08-21 - Security baseline and release governance

**Status:** IMPLEMENTED and VERIFIED CURRENT

### Decision

Adopt a controlled GitHub release path for LeadRescue AI:

1. Work is prepared and validated away from `main`.
2. Changes are promoted through pull requests.
3. GitHub Actions CI runs the repository verification suite.
4. `main` is protected against direct unsafe release changes.
5. Production remains tied to Vercel deployments from `main`.

### Implemented state

- Repository: `nileshsshirishkar/leadrescue-ai`.
- Production branch: `main`.
- Development branch: `develop`.
- Vercel Production tracks `main`.
- Security dependency baseline promoted to Production in merge commit `3b78d8a669b9177f41177d0e62f8dcd4d9701ade`.
- Next.js updated from `16.2.10` to `16.3.1`.
- `eslint-config-next` updated from `16.2.10` to `16.3.1`.
- Patched transitive dependencies are captured in `package-lock.json`.
- GitHub Actions workflow exists at `.github/workflows/ci.yml`.
- CI job name: `Verify`.
- CI runs `npm ci`, lint, typecheck, tests, and build.
- CI smoke-test PR #3 completed successfully. GitHub Actions run `32410390488` passed every `Verify` step.
- `main` is protected by the active ruleset `Protect main`.
- The ruleset requires a pull request before merging, conversation resolution before merging, blocks force pushes, restricts branch deletion, and requires the GitHub Actions `Verify` status check.
- Required approvals remain `0` at the current solo-development stage.
- Vercel deployment for production commit `3b78d8a669b9177f41177d0e62f8dcd4d9701ade` completed successfully.
- Production smoke check passed on `https://leadrescue-ai-eosin.vercel.app`.

### Verification evidence

Before production promotion, the security branch passed:

- `npm run lint`
- `npm run typecheck`
- `npm test` with 43 passing tests
- `npm run build`
- `npm audit --omit=dev` with 0 vulnerabilities at validation time
- `npm audit` with 0 vulnerabilities at validation time
- Vercel Preview deployment
- Visual preview smoke check

After production promotion:

- GitHub confirmed `main` at commit `3b78d8a669b9177f41177d0e62f8dcd4d9701ade`.
- Vercel status for that commit returned success.
- Visual Production smoke check passed.
- GitHub confirmed `main` is protected.
- The required `Verify` check was selected in the saved `Protect main` ruleset.

### Scope limits

This decision does **not** upgrade LeadRescue AI to production-ready multi-user SaaS status. The current application remains the controlled Phase 2 prototype unless later verified evidence changes that classification.

The following remain unimplemented or unverified as production capabilities unless separately proven:

- user authentication and authorization
- tenant isolation
- production database and shared persistence
- server-side rate limiting and shared idempotency
- billing and payments
- Meta or Google lead ingestion
- CRM synchronization
- WhatsApp automation
- voice AI
- booking integrations
- background workers or infrastructure queues
- application monitoring and alerting
- backup and recovery for lead data

Zoho CRM sync remains excluded unless explicitly reversed by an approved decision.

### Superseded audit findings

The earlier production architecture audit correctly described the code prototype at the time, but the following findings are now superseded by direct current evidence:

- GitHub repository identity and accessibility are now verified.
- `main` and `develop` branches are verified.
- Vercel linkage and Production branch mapping are verified.
- GitHub Actions CI is now implemented and verified working.
- `main` branch protection is now implemented.
- Production deployment commit mapping is now verified.
- The current verified production hostname is `leadrescue-ai-eosin.vercel.app`.

The earlier audit findings about browser-local application architecture, absence of database/authentication/integrations, and controlled prototype maturity remain current unless later implementation evidence supersedes them.

### Master Current State delta

The Project MASTER CURRENT STATE should be updated to record this release-governance and security change and to remove or supersede any statement that says GitHub identity, Vercel linkage, CI, branch protection, or Production deployment SHA are unknown.

It should also continue to state that `leadrescue.online` is not a verified user-owned or attached LeadRescue production domain.

## 2026-08-21 - Keep repository public while on GitHub Free

**Status:** APPROVED CURRENT DECISION

### Decision

Keep `nileshsshirishkar/leadrescue-ai` public while the repository is operated on GitHub Free. Reconsider private visibility before commercial code, proprietary assets, or real client data materially expand, and only after a protection path for a private repository is confirmed.

### Reason

Current GitHub documentation states that repository rulesets are available for public repositories on GitHub Free, while rulesets for private repositories require GitHub Pro, GitHub Team, or GitHub Enterprise Cloud. Protected branches have the same public-Free versus private-paid plan boundary. The current `Protect main` ruleset and required `Verify` workflow are material release controls, so making the repository private now could remove or weaken the protection model unless the GitHub plan is upgraded first.

### Current controls and constraints

- Repository visibility remains public.
- `Protect main` remains the controlling release ruleset.
- Pull requests and the `Verify` status check remain required for `main`.
- No secrets, credentials, private client data, proprietary datasets, or sensitive configuration may be committed to the public repository.
- Repository visibility must be reviewed again before real client data or materially sensitive commercial code/assets are introduced.
- A future switch to private should be preceded by verification that the selected GitHub plan supports the required ruleset/protected-branch controls.

### Evidence

- GitHub repository state is currently public.
- User confirmed the account is on GitHub Free.
- GitHub official documentation checked 21 August 2026 states that rulesets are available on public repositories with GitHub Free and on public/private repositories with GitHub Pro, Team, or Enterprise Cloud.
- GitHub official protected-branch documentation checked 21 August 2026 states that protected branches are available on public repositories with GitHub Free and on private repositories with GitHub Pro, Team, Enterprise Cloud, or Enterprise Server.

### Master Current State delta

The Master item asking whether the repository should remain public is now resolved for the current stage: **KEEP PUBLIC WHILE ON GITHUB FREE**. This is a temporary governance decision, not a permanent commitment to public source. Re-open the decision before commercial sensitivity or real client data increases, or when the GitHub plan changes.
