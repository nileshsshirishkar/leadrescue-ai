# LeadRescue AI Client #1 Policy Approval Package

**Status:** RECOMMENDATIONS ONLY. Nothing in this file becomes a commercial promise, Production setting or customer policy until explicitly approved by the user and, where applicable, verified in Production.

This package reduces the remaining Milestone 13 decisions to one controlled approval set. The goal is to avoid inventing terms piecemeal while keeping the first commercial pilot operationally simple and low-risk.

## 1. Recommended Client #1 profile

**Recommendation:** Start with one non-regulated service business that has a straightforward lead-follow-up workflow, a small number of authorized users, and ordinary business lead/contact data.

Preferred characteristics:

- 1 organization;
- approximately 1-5 named users;
- manual/CSV lead import for the first pilot unless a native connector is separately completed;
- lead volume inside the currently tested product limits;
- no requirement for healthcare/clinical records, payment-card storage, government-ID processing or other highly sensitive data;
- willingness to use a controlled founder-assisted onboarding and report defects quickly.

Avoid using the first commercial pilot to prove a regulated-data use case and a new product launch at the same time.

**Approval required:** accept / modify / reject.

## 2. Recommended permitted-data boundary

**Recommendation:** Permit only the information necessary for business lead follow-up:

- lead/contact name;
- business phone/email;
- business/service interest;
- ordinary enquiry text;
- lead source and attribution identifiers when properly supported;
- follow-up status, notes and tasks;
- appointment status;
- quoted price or budget signal when relevant to the sales enquiry.

Explicitly prohibit clients from storing in LeadRescue unless a later assessment approves them:

- passwords, access tokens, API keys or security answers;
- payment-card or banking credentials;
- government identity-document numbers;
- medical records, diagnosis/treatment details or clinical notes;
- highly sensitive personal data unnecessary for lead follow-up.

**Approval required:** accept / modify / reject.

## 3. Recommended retention and deletion model

The exact period is a commercial/privacy policy, not a technical fact.

**Recommended first-pilot model:**

- while the account is active, retain operational data needed to deliver the service;
- on termination, pause access first;
- offer a **14-day export window** before final live-data deletion;
- delete the tenant's live application data **within 30 days of confirmed termination/deletion request**, after the export window and identity/request verification;
- historical backup copies age out according to the actual Production backup retention window rather than an invented instant-deletion promise;
- user/Auth identity deletion is reviewed separately from tenant data when needed.

Why this is recommended: it gives a small client a practical recovery/export window while keeping indefinite terminated-client storage out of the operating model. It must still be reviewed against the actual contracting/privacy jurisdiction.

**Approval required:** accept / modify / reject.

## 4. Recommended backup and recovery objective

The user has already approved deferring Supabase Pro purchase until Client #1 onboarding, before real commercial data is accepted.

Supabase currently documents automatic daily backups for Pro projects, with the last seven days of daily backups accessible. A daily-backup-only design can lose up to roughly one day's changes after a disaster, while PITR is an additional paid control.

**Recommendation for Client #1:**

- start with Supabase Pro daily backups rather than PITR;
- adopt an internal **RPO target of up to 24 hours** for the first pilot;
- do **not** publish an RTO or recovery SLA before the Production restore test;
- perform a fictional-data restore test during the Production acceptance milestone and record the actual recovery time;
- reassess PITR only after real client volume/value shows that a sub-24-hour RPO is economically justified.

**Approval required:** accept / modify / reject.

## 5. Recommended monitoring and incident ownership

**Recommendation:**

- founder is primary incident owner for clients 1-10;
- Vercel Production observability/runtime error monitoring is the primary application visibility layer after the commercial plan is active;
- Supabase health, Security Advisor, database health and backup status are reviewed as the database/Auth layer;
- monitor repeated 5xx, authentication failures, import failures, database unavailability, reminder failures and unusual traffic/rate-limit events;
- identify one secondary human escalation contact before Client #1 goes live;
- customer incident updates state facts only and do not invent recovery times.

The exact alert destination and secondary person remain user-specific operating details.

**Approval required:** approve architecture now; identify secondary contact before Client #1.

## 6. Recommended rate-limit architecture

**Recommendation:** Use a durable platform/distributed limiter, not an in-memory serverless counter.

For the commercial Vercel deployment:

- use Vercel Firewall/WAF rate limiting where supported by the selected paid plan;
- authenticated limits should use trusted user/organization context where practical;
- stricter limits should protect expensive/high-abuse routes such as AI enhancement and imports;
- return 429 without exposing tenant data;
- choose numeric thresholds only after the commercial plan is selected and a small load/abuse test is run.

No numeric limits are recommended yet because choosing arbitrary numbers before expected traffic is known creates false confidence.

**Approval required:** architecture approve / modify. Numeric thresholds remain a later evidence-based setting.

## 7. Recommended support model

**Recommendation for the first pilot:**

- founder-managed support;
- one written support channel selected during onboarding so issues are traceable;
- support is provided on a reasonable-efforts basis during stated business hours;
- no 24/7 promise;
- no guaranteed response-time or restoration SLA;
- emergency security incidents are prioritized immediately when discovered, without promising a contractual resolution time;
- support covers LeadRescue access, imports, workspace behavior, reminders and product defects, not general CRM/ad-management/legal/medical consulting.

Exact channel and business hours must be chosen before signing Client #1.

**Approval required:** architecture approve / modify; exact channel/hours can be completed before onboarding.

## 8. Recommended OpenAI enhancement decision for Client #1

**Recommendation:** Keep optional OpenAI enhancement **disabled for the first live Client #1 onboarding**, then enable it only after:

- the customer-facing privacy/processor wording is approved;
- the Client #1 is informed that the feature is optional and human-reviewed;
- current OpenAI API data controls are reverified;
- the Production configuration is tested separately.

The deterministic LeadRescue workflow should remain fully usable without AI enhancement.

This reduces the number of external data-processing dependencies during the highest-risk first onboarding.

**Approval required:** accept / modify / reject.

## 9. Recommended repository timing

Current repository visibility is public under the earlier GitHub-Free stage decision.

**Recommendation:** Keep it unchanged while finishing Dev/Preview, then resolve the private-repository/paid-GitHub-plan decision before Client #1 real commercial data or materially sensitive commercial assets are introduced.

No client data, secrets, credentials or proprietary customer datasets should ever be committed regardless of repository visibility.

**Approval required before commercial expansion, not required to continue current Dev/Preview work.**

## 10. Vercel commercial-plan timing

The current Vercel Hobby environment should continue to be treated as non-commercial Dev/Preview infrastructure only.

**Recommendation:** Purchase/activate an approved commercial Vercel plan at the Production/Client #1 readiness gate, before real commercial hosting begins. Do not buy it merely to continue current Dev/Preview work.

**Approval required at paid-plan purchase gate.**

## 11. Price, billing, pilot duration, cancellation and refunds

These are intentionally **not filled with invented numbers**.

They should be decided after the target Client #1 profile is approved because support burden, expected lead volume, onboarding work and commercial value materially affect the correct terms.

For now, preserve these already-approved boundaries:

- controlled paid pilot rather than public self-serve SaaS;
- external/manual billing for clients 1-10;
- no Stripe/in-app subscription before 10 clients unless explicitly reversed;
- no ROI, revenue-recovery, uptime or conversion guarantee.

**Approval required later in Milestone 13 before a commercial offer is sent.**

## 12. Legal/privacy review path

No jurisdiction-specific compliance conclusion is made here.

Before Client #1 contract/privacy wording is finalized:

- identify the actual seller/contracting entity and Client #1 jurisdiction;
- identify controller/processor responsibilities for the actual use case;
- review customer-facing privacy notice and DPA/contract terms accordingly;
- accurately disclose the Production processors actually enabled;
- do not list future integrations as live processors.

**Requires verification/legal review once the actual Client #1 and contracting jurisdiction are known.**

## 13. Recommended approval bundle

The cleanest next decision is to approve the following as the default Client #1 operating policy, subject to the later legal/Production tests:

1. non-regulated small service-business pilot;
2. ordinary business lead/contact data only, sensitive categories excluded;
3. 14-day export window and live deletion within 30 days after verified termination/deletion request;
4. Supabase Pro daily backups with initial internal RPO up to 24 hours, no RTO/SLA until restore testing;
5. founder primary incident owner, one secondary contact before launch;
6. durable Vercel/platform rate-limiting architecture, thresholds after load test;
7. founder-managed written-channel support without 24/7 or response-time SLA;
8. OpenAI enhancement off for the first live onboarding, enabled later only after disclosure/configuration approval;
9. defer GitHub private-plan change and Vercel/Supabase paid-plan purchases until the Client #1/Production gate, while keeping them mandatory before real commercial use;
10. leave price/pilot/cancellation/refund details for the next commercial-offer decision after the target client is selected.

Until explicitly approved, this remains a recommendation package rather than LeadRescue policy.

## Official references reverified during this milestone

- Supabase Production Checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase Database Backups: https://supabase.com/docs/guides/platform/backups
- Vercel Observability: https://vercel.com/products/observability
- Vercel Firewall rate-limit template/docs: https://vercel.com/templates/other/rate-limit-api-requests-firewall-rule
