# LeadRescue AI Milestone 13 Decision Record

**Status:** Current working decision record for Milestone 13 on PR #27. This supplements the main Decision Log until the milestone is complete and merged. It does not authorize Production or `main` changes.

## Approved decisions

### Client #1 policy package

**APPROVED 2026-08-28**

The Client #1 policy package in `docs/client1-policy-approval-package.md` is approved as the default operating policy for the first controlled commercial pilot, subject to the separate Production, paid-plan and legal-verification gates recorded below.

Approved defaults:

1. **Target profile:** first pilot should be one small, non-regulated service business with a straightforward lead-follow-up workflow and a small named user set.
2. **Permitted data:** ordinary business lead/contact/follow-up data only. Passwords, authentication secrets, payment/banking credentials, government identity-document numbers, medical/clinical records and other highly sensitive data unnecessary for lead follow-up are excluded unless a later assessment explicitly approves them.
3. **Offboarding:** pause access first; offer a 14-day export window; delete the tenant's live application data within 30 days of a verified termination/deletion request after the export window and request verification. Historical backups age out according to the actual approved Production backup retention rather than an instant-erasure promise.
4. **Backup/RPO:** start Client #1 with Supabase Pro daily backups rather than PITR by default. The initial internal RPO target is up to 24 hours. Do not publish an RTO or recovery SLA before the Production restore test records actual recovery evidence. Reassess PITR if real usage/value later justifies a tighter RPO.
5. **Incident ownership:** founder is the primary incident owner for clients 1-10. One secondary human escalation contact must be identified before Client #1 goes live.
6. **Monitoring:** use the approved Production Vercel observability/runtime-log path plus Supabase health/security/backup visibility. Monitor material 5xx/unavailability, authentication failures, import failures, database unavailability, reminder failures and unusual traffic/rate-limit signals. Client communications state verified facts without inventing recovery times.
7. **Rate limiting:** use a durable platform/distributed rate-limit mechanism, not a serverless in-memory counter. Prefer trusted authenticated user/server-resolved organization keys where practical, use stricter controls for expensive or abuse-sensitive routes, and return sanitized HTTP 429 responses. Numeric thresholds remain intentionally deferred until the commercial hosting plan is selected and a load/abuse test is run.
8. **Support model:** founder-managed support through one written, traceable channel on a reasonable-efforts basis during stated business hours. No 24/7 promise, guaranteed response time, restoration SLA or provider-availability guarantee. Exact channel and business hours are selected before Client #1 onboarding.
9. **OpenAI enhancement:** keep optional OpenAI enhancement disabled for the first live Client #1 onboarding. It may be enabled later only after customer-facing processor/privacy wording is approved, current OpenAI data controls are reverified, Production configuration is tested and the client is informed that the feature is optional and human-reviewed. Deterministic LeadRescue operation must remain usable without it.
10. **Repository timing:** keep current repository visibility unchanged while finishing Dev/Preview. Re-resolve the private-repository/paid-GitHub-plan decision before real Client #1 data or materially sensitive commercial assets are introduced. Secrets and client data must never be committed regardless of visibility.
11. **Vercel paid-plan timing:** defer purchase while current work remains Dev/Preview, but activate an approved commercial Vercel plan before Client #1 commercial hosting begins.
12. **Commercial terms timing:** price, billing amount/period, pilot duration, cancellation and refund/credit details remain a separate commercial-offer decision after the actual target client is selected. Existing first-10-client boundaries remain: external/manual billing, no Stripe/in-app subscription before 10 clients unless reversed, and no ROI/revenue/uptime/conversion guarantees.
13. **Legal/privacy review path:** before Client #1 contract/privacy wording is finalized, identify the actual seller/contracting entity and Client #1 jurisdiction, determine controller/processor responsibilities for the real use case, and review privacy/DPA/contract wording for that context. Only processors actually enabled in Production may be represented as live.

### Supabase Pro and leaked-password protection timing

**APPROVED 2026-08-28**

LeadRescue may continue development and Dev/Preview validation on the current Supabase development setup without purchasing Supabase Pro solely to enable leaked-password protection.

Before Client #1 real commercial lead data is accepted:

1. purchase the appropriate Supabase Pro plan;
2. enable leaked-password protection;
3. rerun Supabase Security Advisor;
4. verify the leaked-password-protection warning is cleared;
5. verify the approved Production backup configuration.

This timing decision defers cost during product completion. It does **not** waive the Client #1 security gate.

Current official Supabase documentation states leaked-password protection is available on Pro and above. Current official backup documentation states Pro/Team/Enterprise projects receive daily backups and Pro exposes the last seven days of daily backups.

## Existing approved first-10-client boundaries

- Founder-managed provisioning.
- Public self-signup disabled.
- Founder controls active/paused organization access.
- Billing remains outside LeadRescue.
- No Stripe/in-app subscriptions before 10 clients unless explicitly reversed.
- Zoho CRM sync remains excluded.
- WhatsApp, booking and Voice AI remain later layers unless priority changes.
- Meta/Google native connectors and provider feedback are not Client #1 claims unless separately approved, implemented and validated.
- Human review remains required before customer outreach.

## Intentionally deferred details, not blockers to continue Dev/Preview

These are not unapproved architecture questions. Their timing is explicitly deferred by the approved policy package:

- name/identity of the secondary incident escalation contact;
- exact support channel and business hours;
- numeric rate-limit thresholds after commercial plan selection and load/abuse testing;
- exact Vercel/Supabase paid-plan purchase action at the Client #1/Production gate;
- GitHub private-plan/visibility action at the commercial-expansion gate;
- price, billing amount/period, pilot duration, cancellation notice and refund/credit terms after the actual target client is selected;
- jurisdiction-specific legal/privacy/DPA wording after the actual seller/client jurisdiction is known;
- Production Supabase creation and `main`/Production promotion, which remain separate major gates.

## Safety boundary

No decision in this file authorizes:

- a Production Supabase project creation;
- paid-plan purchase today;
- GitHub repository visibility change today;
- provider integration;
- billing integration;
- merge to `main`;
- Production deployment;
- use of real Client #1 lead data before all applicable Production, plan, security, legal/privacy and acceptance gates pass.
