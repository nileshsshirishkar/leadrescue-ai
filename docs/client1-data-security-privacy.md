# LeadRescue AI Client #1 Data, Security & Privacy Architecture

**Status:** Milestone 13 working draft. Technical facts marked VERIFIED are based on current Dev/Preview evidence. Policy choices marked PROPOSED or REQUIRES APPROVAL are not yet commercial commitments or legal conclusions.

**Scope:** First controlled commercial client readiness. This document does not make LeadRescue Production-ready by itself and is not a substitute for jurisdiction-specific legal review.

## 1. Current verified technical boundary

- Shared persistence and Auth foundation: Supabase Dev project `LeadRescue AI Dev`.
- Tenant authorization: authenticated user context plus organization membership, with Row Level Security as a database authorization boundary.
- The browser does not supply authoritative organization or actor identity.
- Missing or ambiguous membership fails closed.
- Cross-tenant read/write/task behavior and expired/invalid authentication behavior have been verified in controlled Dev/Preview testing before this milestone.
- The dashboard now hydrates operational lead state from the authenticated Supabase tenant workspace in `develop`.
- Public self-signup is disabled. Founder-managed provisioning and active/paused organization access remain the first-10-client operating model.
- Normal application reads/writes do not use a service-role bypass.
- Production Supabase has not been created or validated. Dev and Preview are not Production.

## 2. Data inventory

### Account and tenancy data

- Supabase Auth user identifier and authentication metadata.
- Profile display name.
- Organization name, slug, access status.
- Organization membership and role.

### Lead/contact data

- Contact name.
- Phone number.
- Email address.
- Business type.
- Service interest.
- Lead source and source identity where supplied.
- Enquiry text.
- Lead status.
- Last-contact timestamp.
- Follow-up count.
- Appointment status.
- Quoted price/currency where supplied.
- Budget signal.
- Notes.

### Workflow and audit data

- Follow-up tasks, including `follow_up_tasks.due_at`, status, type, assignee and channel.
- Material lead events with actor, time, event type, direction/channel, summary and metadata.
- Import retry identity used for operational idempotency.

### AI enhancement data

The current optional enhancement route sends a bounded subset of lead/workflow information to the OpenAI API for human-reviewed language enhancement. Current code includes name, business type, service interest, status, enquiry text, last-contact date, follow-up count, appointment status, quoted price when present, budget signal, notes, and deterministic recovery-analysis fields.

The current API call uses `store: false`. This must **not** be described as Zero Data Retention. OpenAI API business inputs/outputs are not used for model training by default unless the API organization explicitly opts in to sharing. Any stronger retention claim requires current account-level evidence and current OpenAI documentation.

### Operational logs

Vercel and Supabase may record infrastructure/request metadata needed to operate and secure the service. Application logs must not intentionally print lead names, phone numbers, email addresses, enquiry text, notes, access tokens, refresh tokens, passwords, API keys or other secrets.

## 3. Current processor/subprocessor map

| System | Current role in LeadRescue | Current state |
| --- | --- | --- |
| Supabase | Auth, tenant database, RLS, tasks/audit persistence | VERIFIED in Dev only |
| Vercel | Application hosting, Preview deployments, runtime/build logs | VERIFIED; current team is Hobby; commercial hosting upgrade is still required |
| OpenAI API | Optional human-reviewed language enhancement | IMPLEMENTED in code/Dev path; no claim of Zero Data Retention |
| Meta / Google | Future lead source and quality feedback | NOT IMPLEMENTED |
| WhatsApp / Voice / booking | Future channels | NOT IMPLEMENTED |
| Stripe | Billing | APPROVED EXCLUSION for clients 1-10; manual/external billing only |
| Zoho CRM | CRM sync | APPROVED EXCLUSION |

Before Client #1, the customer-facing privacy notice and agreement must name or appropriately describe the processors actually used in Production. Do not list future integrations as live.

## 4. Data-flow boundary

1. Founder provisions an authorized user and organization.
2. User authenticates through Supabase Auth.
3. Server resolves the authenticated organization membership.
4. Lead/contact/workflow data is read or written through tenant-scoped application/database paths.
5. RLS and server-side tenant derivation enforce organization separation.
6. Optional AI enhancement is invoked only after authenticated organization access and sends only the bounded enhancement payload.
7. Human review remains required before outreach.
8. Future provider feedback, if later approved, must be asynchronous and must not block the LeadRescue state save.

## 5. Client #1 data-minimization boundary

**PROPOSED FOR APPROVAL:** The first commercial pilot should be limited to ordinary business lead/contact and follow-up information needed to operate LeadRescue.

Until separately assessed and approved, clients should be instructed not to place the following into LeadRescue enquiry/notes fields:

- passwords, API keys or authentication secrets;
- payment-card data or banking credentials;
- government identity-document numbers;
- medical records, diagnosis, treatment notes or other clinical records;
- highly sensitive personal information that is unnecessary for lead follow-up.

LeadRescue is a lead follow-up operating system, not a clinical record, payment vault or identity-document repository.

This boundary needs an explicit user approval before it becomes a commercial term.

## 6. Retention and deletion

Exact retention periods are **REQUIRES APPROVAL**. Do not publish a number until the commercial/privacy policy is approved.

### Required operating sequence

- When service is suspended, organization access can be set to `paused` immediately without deleting data.
- When a client terminates or submits an approved deletion request, the founder must verify the requester and organization before destructive action.
- A final export opportunity, if offered, must occur before deletion.
- Live tenant data must be deleted through a controlled, auditable administrative procedure.
- Backups may retain deleted records until the applicable backup retention window expires. Customer-facing wording must explain this accurately rather than promising instant erasure from historical backups.
- Auth identities must be reviewed separately from organization data. Deleting an organization does not automatically mean every associated Auth identity should be deleted if that identity has another legitimate reason to remain.

### Verified current database deletion behavior

Current hosted Dev foreign keys show:

- deleting an organization cascades to its contacts, leads, follow-up tasks, lead events and organization memberships;
- deleting a lead cascades to its follow-up tasks and lead events;
- deleting an Auth user cascades to its profile/membership relationships and sets historical `lead_events.actor_user_id` to null where applicable;
- lead-to-contact uses `RESTRICT`, avoiding accidental contact deletion while a lead still references it.

Current RLS policies expose tenant-member selects and controlled application writes. Administrative organization deletion is **not** exposed as an ordinary self-service application operation. A founder-run deletion procedure and restore-safe verification still need to be tested before Client #1.

## 7. Security controls already established in Dev

- Row Level Security on application tables.
- Server-derived organization and actor identity.
- Fail-closed missing/ambiguous membership.
- Cross-tenant read/create/update/task tests.
- Auth access-token refresh and invalid-session fail-closed tests.
- Founder active/paused access enforcement.
- Atomic imported-lead persistence and idempotent import retry behavior.
- No ordinary service-role bypass.
- Secrets kept in server environment variables rather than browser storage or repository files.

## 8. Security gaps before Client #1

- Separate Production Supabase environment is not yet created.
- Production migrations, Auth, tenant acceptance and restore testing are not yet complete.
- Supabase Security Advisor currently reports **Leaked Password Protection Disabled**. Current Supabase documentation states this protection is available on Pro and above.
- Current Vercel team is Hobby. Current Vercel Terms restrict Hobby to personal/non-commercial use, so Hobby cannot be the commercial Client #1 hosting plan.
- Repository remains public under the earlier approved current-stage decision. The Master requires this visibility decision to be re-opened before materially sensitive commercial code/assets or real client data expand.
- Production data retention/deletion periods are not approved.
- Production backup RPO/RTO are not approved or restore-tested.
- Production monitoring alerts and application rate limits are not configured.
- Privacy notice, data-processing terms, controller/processor allocation, applicable jurisdiction and cross-border transfer wording remain REQUIRES VERIFICATION / legal review.

## 9. Client #1 privacy/compliance gate

Before real client lead data is accepted, all of the following must be true:

- Production data flow and processors are final and documented.
- Customer-facing privacy notice accurately describes current processing.
- Client contract/DPA responsibilities are approved for the relevant jurisdiction and client type.
- Retention and deletion periods are approved.
- Founder deletion procedure is tested with fictional Production-like data.
- Backup restore is tested and documented.
- Production access controls and tenant isolation pass acceptance.
- Vercel and Supabase plans are appropriate for commercial use.
- Leaked-password protection and other approved Production Auth hardening are enabled and verified.
- Monitoring, alerting, rate limiting, incident handling and rollback are operational.
- No unsupported claim of legal compliance, Zero Data Retention, uptime SLA, customer results or provider integrations is made.

## 10. Decisions still required

1. Client #1 permitted-data boundary, including whether any healthcare-related lead data is allowed.
2. Live-data retention after contract termination.
3. Export window before deletion.
4. Backup retention/RPO/RTO target.
5. Customer notice/DPA jurisdiction and legal review path.
6. Repository visibility before real client data/commercial expansion.
7. Whether optional OpenAI enhancement is enabled for Client #1 and how that processor is disclosed.
