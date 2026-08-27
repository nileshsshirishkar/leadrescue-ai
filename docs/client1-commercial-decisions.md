# LeadRescue AI Client #1 Commercial Decision Sheet

**Status:** Milestone 13 decision draft. Approved first-10-client operating decisions are separated from terms that still require explicit approval. This file is not a customer contract and does not invent pricing, trial, refund or SLA terms.

## 1. Already approved for clients 1-10

- Founder-managed client provisioning.
- Public self-signup remains disabled.
- Founder controls active/paused organization access.
- Billing is handled outside LeadRescue.
- Do not build Stripe or in-app subscriptions before 10 clients unless the decision is explicitly reversed.
- LeadRescue remains a focused lead follow-up operating system, not a full CRM.
- Zoho CRM sync remains excluded.
- WhatsApp, booking and Voice AI remain later layers unless priority changes.
- Meta/Google native connectors and provider feedback are not part of Client #1 unless separately approved and implemented.
- No customer result, ROI, revenue, uptime SLA or integration claim may be made without evidence.
- **Supabase Pro / leaked-password-protection sequencing:** this may remain pending while the product is completed and validated in Dev/Preview. At Client #1 onboarding, before LeadRescue accepts that client's real commercial lead data, purchase the appropriate Supabase Pro plan, enable leaked-password protection, re-run the Supabase Security Advisor, and verify the control is active. This is an approved timing decision, not a waiver of the Production security gate.

## 2. Terms that still require explicit approval

| Decision | Current status | Why it matters |
| --- | --- | --- |
| Target Client #1 profile | REQUIRES APPROVAL | Determines permitted data, onboarding and support burden |
| Price and billing period | REQUIRES APPROVAL | No current authoritative Client #1 price is established |
| Trial or pilot period | REQUIRES APPROVAL | Older public trial claims are not controlling evidence |
| Minimum commitment | REQUIRES APPROVAL | Must not be invented |
| Cancellation notice | REQUIRES APPROVAL | Needed before payment begins |
| Refund/credit policy | REQUIRES APPROVAL | Needed for disputes and service failures |
| Taxes / invoice responsibility | REQUIRES VERIFICATION | Depends on seller entity, client location and tax position |
| Support channel | REQUIRES APPROVAL | Founder needs one controlled contact path |
| Support hours | REQUIRES APPROVAL | Avoid implied 24/7 support |
| Response target | REQUIRES APPROVAL | Should not become an accidental SLA |
| Data retention after termination | REQUIRES APPROVAL | Must align with privacy/deletion and backups |
| Export window before deletion | REQUIRES APPROVAL | Must be operationally achievable |
| Permitted data categories | REQUIRES APPROVAL | Controls privacy/security risk |
| Optional OpenAI enhancement for Client #1 | REQUIRES APPROVAL | Affects processor disclosure and data flow |
| Governing contract / DPA jurisdiction | REQUIRES LEGAL REVIEW | Depends on actual contracting entity/client jurisdiction |

## 3. Recommended Client #1 commercial shape for approval

The safest first-client arrangement is a **controlled paid pilot**, not an automated SaaS subscription launch.

Recommended characteristics:

- one manually provisioned organization;
- a small, named set of authorized users;
- CSV/manual lead workflow only unless a separate native-source milestone has shipped;
- founder-observed onboarding and first import;
- external invoice/payment rather than Stripe;
- no guaranteed conversion outcome;
- no guaranteed uptime or 24/7 support;
- a defined pilot review point before expansion;
- explicit permitted-data guidance;
- client agrees that human review is required before outreach;
- optional AI enhancement can be disabled without disabling the deterministic LeadRescue workflow.

This shape reduces operational uncertainty, but the price, duration and contractual language still require the user's approval.

## 4. Proposed customer-facing scope boundary

### Included in the pilot, once Production gates pass

- secure sign-in for founder-provisioned authorized users;
- tenant-specific lead workspace;
- manual/CSV lead import within the tested product limits;
- deterministic scoring and Rescue Queue;
- lead contact details inside the authorized tenant;
- status, notes and follow-up workflow;
- server-backed due/overdue/upcoming reminders;
- founder active/paused access control;
- optional human-reviewed AI language enhancement if separately enabled and disclosed.

### Explicitly excluded unless later approved and implemented

- public self-signup;
- in-app billing or Stripe subscriptions;
- Meta/Google native ingestion or ad-platform feedback;
- WhatsApp API automation;
- booking automation;
- Voice AI;
- Zoho CRM sync;
- guaranteed sales or ROI;
- medical/clinical record management;
- payment-card storage;
- a formal uptime SLA.

## 5. Support model recommendation

**PROPOSED:** For the first 10 clients, support remains founder-managed through one agreed written channel so requests are traceable. Avoid informal commitments across multiple channels until real support volume is known.

A customer-facing support promise should state only what is operationally supportable. It should not promise 24/7 availability, guaranteed response times, guaranteed restoration times or provider availability unless those commitments are separately costed and approved.

## 6. Cancellation and offboarding principles

Before Client #1 payment begins, the final commercial terms should specify:

- how a client cancels;
- when billing stops;
- whether any prepaid amount is refundable or non-refundable;
- whether access pauses immediately or at the end of a paid period;
- the export period, if any;
- the live-data deletion timeline;
- how historical backups age out;
- what happens to user accounts after tenant deletion.

The operational offboarding procedure must match the contract. Do not promise a deletion timeline that the approved backup retention model cannot meet.

## 7. No-claim boundary

Until directly evidenced, sales and onboarding material must not say or imply that LeadRescue has:

- a particular number of paying customers;
- proven revenue recovery or conversion uplift;
- a guaranteed ROI;
- native Meta, Google, WhatsApp, Voice AI, booking or Stripe integrations;
- Production-grade backup/restore before Milestones 14-15 pass;
- an uptime SLA;
- legal/compliance certifications that have not been obtained;
- Zero Data Retention for OpenAI merely because the request uses `store: false`.

OpenAI's current API documentation states API inputs/outputs are not used to train models by default unless the API organization opts in. Default abuse-monitoring logs can retain customer content for up to 30 days, while approved Zero Data Retention is a separate account-level control. That distinction must be preserved in customer wording.

## 8. Commercial go/no-go gate

Client #1 must remain **NO-GO for real commercial data** until:

1. this decision sheet's substantive terms are approved;
2. data/security/privacy architecture is approved;
3. incident, deletion, monitoring, rate-limit and rollback processes are accepted;
4. Milestone 14 creates and validates a separate Production Supabase environment;
5. at Client #1 onboarding, before real client data is accepted, the approved Supabase Pro plan is purchased and leaked-password protection is enabled and verified;
6. Vercel is on an approved commercial plan before commercial hosting;
7. Production Auth/tenant acceptance, backup restore and rollback tests pass;
8. repository visibility is re-decided for commercial expansion;
9. the client-facing privacy/contract wording is reviewed for the actual jurisdiction.

## 9. Approval checklist

The user should explicitly approve or replace these items before this file becomes authoritative commercial policy:

- [ ] Client #1 target profile
- [ ] Price and billing period
- [ ] Pilot/trial duration
- [ ] Cancellation notice
- [ ] Refund/credit policy
- [ ] Support channel
- [ ] Support hours / response wording
- [ ] Permitted-data boundary
- [ ] Retention after termination
- [ ] Export window
- [ ] OpenAI enhancement enabled or disabled for Client #1
- [ ] Contract/DPA legal review path

**Approved timing decision:** Supabase Pro purchase and leaked-password protection may remain pending through Dev/Preview completion, but must be completed and verified before Client #1 real lead data is accepted.
