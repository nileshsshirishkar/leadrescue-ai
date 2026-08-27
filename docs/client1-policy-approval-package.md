# LeadRescue AI Client #1 Policy Package

**Status:** APPROVED DEFAULT OPERATING POLICY on 28 August 2026. This approval closes the Milestone 13 policy architecture. It does not authorize Production, paid-plan purchase today, repository visibility change, real client data, or `main` promotion. Jurisdiction-specific legal wording and the separate Production acceptance gates still require verification.

## 1. Client #1 profile

Approved default: start with one small, non-regulated service business that has a straightforward lead-follow-up workflow, a small named user set, and ordinary business lead/contact data.

Preferred characteristics:

- one organization;
- approximately 1-5 named users;
- manual/CSV lead import for the first pilot unless a native connector is separately completed;
- lead volume inside the tested product limits;
- no requirement for healthcare/clinical records, payment-card storage, government-ID processing or other highly sensitive data;
- founder-assisted onboarding and rapid defect reporting.

## 2. Permitted-data boundary

Permit only information necessary for business lead follow-up:

- lead/contact name;
- business phone/email;
- business/service interest;
- ordinary enquiry text;
- lead source and supported attribution identifiers;
- follow-up status, notes and tasks;
- appointment status;
- quoted price or budget signal when relevant.

Exclude unless a later assessment explicitly approves them:

- passwords, access tokens, API keys or security answers;
- payment-card or banking credentials;
- government identity-document numbers;
- medical records, diagnosis/treatment details or clinical notes;
- highly sensitive personal data unnecessary for lead follow-up.

## 3. Retention and deletion

Approved first-pilot model:

- while the account is active, retain operational data needed to deliver the service;
- on termination, pause access first;
- offer a 14-day export window;
- delete live tenant application data within 30 days of a verified termination/deletion request after the export window and request verification;
- historical backup copies age out according to the actual approved Production backup retention;
- user/Auth identity deletion is reviewed separately when needed.

Do not promise instant erasure from historical backups.

## 4. Backup and recovery objective

Approved Client #1 baseline:

- purchase Supabase Pro at the Client #1 onboarding/Production gate before real commercial lead data is accepted;
- use Pro daily backups initially rather than PITR by default;
- internal RPO target: up to 24 hours;
- do not publish an RTO or recovery SLA before the Production restore test records actual recovery evidence;
- perform a fictional-data restore test during Production acceptance;
- reassess PITR only if real usage/value later justifies a tighter RPO.

Current official Supabase documentation states Pro projects receive daily backups with the last seven days accessible, and PITR is an additional option for finer recovery granularity.

## 5. Monitoring and incident ownership

Approved architecture:

- founder is primary incident owner for clients 1-10;
- Vercel Production observability/runtime logs are the primary application visibility layer after the commercial plan is active;
- Supabase health, Security Advisor, database health and backup status are reviewed as the database/Auth layer;
- monitor repeated 5xx/unavailability, authentication failures, import failures, database unavailability, reminder failures and unusual traffic/rate-limit signals;
- identify one secondary human escalation contact before Client #1 goes live;
- customer incident updates state verified facts only and do not invent recovery times.

The exact alert destination and secondary person are deferred onboarding details.

## 6. Rate limiting

Approved architecture:

- use a durable platform/distributed limiter, not an in-memory serverless counter;
- use Vercel Firewall/WAF rate limiting where supported by the selected commercial plan, or another approved distributed mechanism;
- authenticated limits should use trusted user/server-resolved organization context where practical;
- stricter limits should protect expensive/high-abuse routes such as AI enhancement and imports;
- return sanitized HTTP 429 responses;
- set numeric thresholds only after commercial-plan selection and a small load/abuse test.

Current Vercel documentation states Firewall rate limiting is available on Pro or Enterprise.

## 7. Support model

Approved first-pilot model:

- founder-managed support;
- one written, traceable support channel selected before onboarding;
- reasonable-efforts support during stated business hours;
- no 24/7 promise;
- no guaranteed response-time or restoration SLA;
- emergency security incidents are prioritized when discovered without inventing contractual resolution times;
- support covers LeadRescue access, imports, workspace behavior, reminders and product defects, not general CRM/ad-management/legal/medical consulting.

Exact support channel and business hours are deferred until Client #1 onboarding.

## 8. OpenAI enhancement

Approved default: optional OpenAI enhancement remains disabled for the first live Client #1 onboarding.

It may be enabled later only after:

- customer-facing privacy/processor wording is approved;
- current OpenAI API data controls are reverified;
- Production configuration is tested separately;
- the client is informed that the feature is optional and human-reviewed.

The deterministic LeadRescue workflow must remain fully usable without AI enhancement.

## 9. Repository timing

Approved timing: keep the repository visibility unchanged while finishing Dev/Preview. Resolve the private-repository/paid-GitHub-plan decision before real Client #1 data or materially sensitive commercial assets are introduced.

No client data, secrets, credentials or proprietary customer datasets may be committed regardless of repository visibility.

## 10. Vercel commercial-plan timing

Approved timing: keep current Hobby infrastructure for Dev/Preview only. Activate an approved commercial Vercel plan at the Production/Client #1 gate before commercial hosting or real client content begins.

## 11. Commercial-offer terms

Price, billing amount/period, pilot duration, cancellation notice and refund/credit terms remain intentionally deferred until the actual target Client #1 is selected.

Existing approved boundaries remain:

- controlled paid pilot rather than public self-serve SaaS;
- external/manual billing for clients 1-10;
- no Stripe/in-app subscription before 10 clients unless explicitly reversed;
- no ROI, revenue-recovery, uptime or conversion guarantee.

These terms must be completed before a commercial offer is sent.

## 12. Legal/privacy review path

Before Client #1 contract/privacy wording is finalized:

- identify the actual seller/contracting entity and Client #1 jurisdiction;
- identify controller/processor responsibilities for the real use case;
- review customer-facing privacy notice and DPA/contract terms for that context;
- accurately disclose only processors actually enabled in Production;
- do not list future integrations as live processors.

No jurisdiction-specific legal compliance conclusion is made by this policy package.

## 13. Separate gates still required

This approval does not close or bypass:

1. Production Supabase creation and clean migration/configuration;
2. commercial Vercel plan purchase;
3. Supabase Pro purchase before Client #1 real lead data;
4. leaked-password protection enablement and Security Advisor recheck;
5. Production tenant-isolation/auth/write/reminder acceptance;
6. Production deletion and restore testing;
7. Production monitoring/rate-limit/rollback verification;
8. repository visibility decision before commercial expansion;
9. actual Client #1 pricing/cancellation/refund terms;
10. jurisdiction-specific privacy/contract review;
11. explicit `main`/Production promotion approval.

## Official references reverified during this milestone

- Supabase Production Checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase Database Backups: https://supabase.com/docs/guides/platform/backups
- Supabase Password Security: https://supabase.com/docs/guides/auth/password-security
- Vercel Firewall rate-limit template/docs: https://vercel.com/templates/other/rate-limit-api-requests-firewall-rule
