# LeadRescue AI Product Requirements & Feature Status

**Status:** Current control source for the core product as of Milestone 13. Environment and evidence states are separated deliberately.

## State definitions

- **Approved:** explicitly accepted product or operating decision.
- **Implemented:** code/schema exists.
- **Verified Dev:** directly tested in hosted Supabase Dev or equivalent controlled Dev environment.
- **Verified Preview:** directly tested in Vercel Preview, including browser/runtime evidence where required.
- **Production:** deployed and accepted against the Production environment. No Dev/Preview evidence should be upgraded to this state by inference.
- **Excluded:** explicitly outside the approved current scope.
- **Future:** possible later layer, not live today.

## Core Client #1 workflow

| Capability | Approved | Implemented | Verified Dev/Preview | Production | Notes |
| --- | --- | --- | --- | --- | --- |
| Password sign-in for founder-provisioned users | Yes | Yes | Yes | No | Public signup remains disabled |
| Server-derived tenant membership | Yes | Yes | Yes | No | Missing/ambiguous membership fails closed |
| Tenant Row Level Security | Yes | Yes | Yes | No | Core database authorization boundary |
| Two independent tenant isolation | Required | Yes | Yes | No | Reads, writes, tasks and reminders tested |
| Expired-token refresh | Required | Yes | Yes | No | Forced runtime test passed in Preview |
| Invalid/malformed session rejection | Required | Yes | Yes | No | Runtime 401 behavior verified in Preview |
| Founder active/paused access | Yes | Yes | Yes | No | Enforced server/database-side |
| Supabase-backed dashboard workspace | Yes | Yes | Yes | No | Operational lead state is server-backed on `develop` |
| Manual/CSV lead import | Yes | Yes | Yes | No | Authenticated tenant derivation, retry-safe behavior |
| Tenant-safe lead/contact detail | Yes | Yes | Yes | No | Contact information visible only within tenant |
| Deterministic scoring and Rescue Queue | Yes | Yes | Yes | No | Deterministic result remains authoritative |
| Status and notes workflow | Yes | Yes | Yes | No | Approved statuses: New, Follow-up needed, Interested, Qualified, Appointment booked, Won, Lost |
| Follow-up task scheduling/completion | Yes | Yes | Yes | No | Uses `follow_up_tasks.due_at` |
| In-app due/overdue/upcoming reminders | Yes | Yes | Yes | No | No external reminder channel implied |
| Audit events for material actions | Yes | Yes | Yes | No | Authenticated actor context |
| Optional OpenAI language enhancement | Yes, optional | Yes | Yes | No | Human-reviewed; deterministic workflow operates without it |
| External/manual billing for clients 1-10 | Yes | Operational policy | N/A | N/A | Billing stays outside LeadRescue |

## Approved exclusions for Client #1 core

| Capability | State | Boundary |
| --- | --- | --- |
| Public self-signup | Excluded for first 10 | Founder provisions users/organizations |
| Stripe/in-app subscriptions | Excluded before 10 clients | Reassess at 10 clients using evidence |
| Zoho CRM sync | Excluded | Do not revive without explicit reversal |
| Full CRM functionality | Excluded | LeadRescue remains focused lead follow-up OS |
| 24/7 support or uptime SLA | Not approved | Do not imply in sales/support wording |
| Automated customer outreach without human review | Excluded | Human review remains required |

## Future provider and channel layers

| Capability | Current state | Required before implementation |
| --- | --- | --- |
| Meta native lead ingestion | Future | Client demand, current official API/permission/privacy recheck, approved credential design |
| Google native lead ingestion | Future | Client demand, current official API/permission/privacy recheck, approved credential design |
| Meta quality feedback | Future | Valid attribution, approved outcome mapping, async outbox/retry, current Meta compliance checks |
| Google quality feedback | Future | Valid attribution/matching, approved outcome mapping, Data Manager/compliance checks |
| WhatsApp automation | Future | Separate provider/security/consent approval |
| Booking automation | Future | Separate product/integration approval |
| Voice AI | Future | Separate provider/privacy/cost approval |
| n8n adapters | Future optional | Must never become authoritative state engine |

## Client #1 readiness items not yet Production-complete

- Milestone 13 commercial/privacy/operations decisions.
- Separate Production Supabase environment.
- Clean Production migration and Production Auth configuration.
- Production two-tenant/auth/write/reminder acceptance.
- Production backup and restore test.
- Production monitoring/alerting and rate limits.
- Approved commercial Vercel plan.
- Supabase Pro purchase and leaked-password protection at Client #1 onboarding before real data, per approved timing decision.
- Repository visibility re-decision for commercial expansion.
- Approved privacy/commercial terms for the actual client/jurisdiction.
- Controlled Client #1 onboarding acceptance.

## Maturity statement

The core LeadRescue workflow is implemented and verified in Dev/Preview. Production commercial readiness is not yet established and must not be claimed until the separate Production and Client #1 gates pass.
