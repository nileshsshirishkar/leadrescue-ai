# LeadRescue AI Proof & Claims Register

**Status:** Milestone 13 control source. This register separates verified technical evidence from claims that are not yet supportable. It is not marketing copy.

## 1. Rules

- A claim may be used publicly only when the evidence listed here still applies to the environment and wording being claimed.
- Dev, Preview and `develop` evidence must never be described as Production proof.
- Technical capability evidence is not customer-result, revenue, ROI, SLA or commercial-proof evidence.
- A plan, draft, schema, code path or vendor feature is not evidence that the feature is configured and working in LeadRescue Production.
- Reverify time-sensitive vendor facts before publishing them.

## 2. Currently supportable internal technical statements

| Statement | Evidence state | Public/commercial wording boundary |
| --- | --- | --- |
| LeadRescue is a focused lead follow-up operating system | APPROVED PRODUCT DIRECTION | May describe product direction; do not imply full CRM capability |
| Supabase is the approved Auth/shared-persistence foundation | IMPLEMENTED / VERIFIED IN DEV-PREVIEW | Do not say Production database/auth is live until Milestone 14 passes |
| Tenant access is derived from authenticated membership and protected by RLS plus server checks | IMPLEMENTED / VERIFIED IN DEV-PREVIEW | Do not claim formal certification or absolute security |
| Two independent tenant users were blocked from cross-tenant reads/writes/tasks | RUNTIME VERIFIED IN PREVIEW | May be used as internal acceptance evidence, not as a security guarantee |
| Expired access-token refresh and malformed-session rejection were runtime tested | VERIFIED IN PREVIEW | Do not call Production auth verified until repeated in Production |
| Founder can activate/pause an organization with server/database enforcement | IMPLEMENTED / VERIFIED IN DEV-PREVIEW | Do not imply automated subscription lifecycle |
| Manual/CSV lead persistence is tenant-scoped and retry-safe at the tested boundaries | IMPLEMENTED / VERIFIED IN DEV-PREVIEW | Do not claim unlimited bulk capacity or provider-native ingestion |
| Dashboard operational lead state is Supabase-backed on `develop` | IMPLEMENTED / VERIFIED IN DEV-PREVIEW | Production still follows `main`; do not claim Production promotion |
| Status/notes/follow-up task workflow is server-backed | IMPLEMENTED / VERIFIED IN DEV-PREVIEW | Human review remains required |
| Due/overdue/upcoming reminders are server-backed in-app reminders | IMPLEMENTED / VERIFIED IN DEV-PREVIEW | Do not imply email/SMS/WhatsApp/push reminders |
| Optional AI enhancement is bounded and human-reviewed | IMPLEMENTED / VERIFIED IN DEV-PREVIEW | Deterministic logic remains authoritative; do not claim autonomous outreach |
| AI enhancement uses OpenAI API with `store: false` | CODE VERIFIED | Must not be described as Zero Data Retention |

## 3. Claims that are currently prohibited

Until direct evidence exists, LeadRescue must not say or imply:

- Production-ready, enterprise-ready, battle-tested or customer-proven;
- a specific number of paying customers;
- generated revenue, recovered revenue, conversion uplift, close-rate uplift or ROI;
- guaranteed sales, appointments, conversions or response rates;
- an uptime, response-time or recovery SLA;
- 24/7 support;
- legal or regulatory certification/compliance that has not been established;
- Zero Data Retention for OpenAI;
- native Meta, Google, WhatsApp, booking, Voice AI, Stripe or Zoho integrations are live;
- provider feedback is live;
- automated ad optimization is live;
- Production backup/restore has passed before the actual Production restore test;
- Production tenant isolation/auth has passed before the Production acceptance run;
- leaked-password protection is enabled before Supabase Pro is purchased and the Security Advisor is rechecked;
- Vercel Hobby is suitable for Client #1 commercial hosting;
- repository privacy/security posture is final while the commercial visibility decision remains open.

## 4. Claims requiring evidence before use

### Customer/result claims

Required evidence should include the identified customer or controlled anonymized record, measurement period, baseline, methodology, exclusions and permission to use the claim. A testimonial alone does not prove causal ROI.

### Revenue claims

Require actual collected/invoiced commercial evidence and a defined period. Do not treat a proposed price or signed pilot as revenue already earned.

### Performance claims

Require repeatable measured data from the relevant environment. A single fast request does not establish a service-level commitment.

### Security claims

Use factual control descriptions such as "tenant-scoped access with Row Level Security and server-side membership checks" rather than absolute wording such as "fully secure" or "cannot be breached".

### Backup/recovery claims

Require an actual restore test in the Production environment or an approved Production-equivalent restore target, with timestamps, data verification and recorded recovery outcome.

## 5. Current external/vendor facts that must be reverified before public use

- Supabase plan/security/backup features.
- Vercel commercial-plan, firewall/rate-limit, rollback, monitoring and data-use terms.
- OpenAI API retention/training/data-control terms.
- Meta and Google API availability, permissions, matching, consent and customer-data policies.
- GitHub plan/ruleset/private-repository capabilities.

## 6. Client #1 proof package required before launch claims expand

Before LeadRescue is described as live for Client #1, capture and retain:

1. exact Production Git commit and deployment;
2. Production Supabase project/migration state;
3. Production Auth sign-in/sign-out/refresh/failure evidence;
4. Production two-tenant isolation acceptance using fictional records;
5. Production import/write/task/reminder acceptance;
6. Production pause/reactivate acceptance;
7. Production backup and restore evidence;
8. monitoring and rate-limit evidence;
9. rollback evidence;
10. commercial plan evidence for Vercel and Supabase;
11. approved customer privacy/commercial terms;
12. no unresolved Client #1 blocking security-advisor findings.

## 7. Current maturity statement

The safest current statement is:

> LeadRescue AI has a working, multi-tenant Dev/Preview implementation of its core lead follow-up workflow. Production commercial readiness and Client #1 onboarding remain gated by Production environment validation, commercial hosting/database plans, backup/restore, monitoring/rate limiting, privacy/commercial terms and final security checks.

Do not shorten this into a stronger maturity claim without new evidence.
