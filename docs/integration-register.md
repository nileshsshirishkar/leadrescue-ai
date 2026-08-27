# LeadRescue AI Integration Register

**Status:** Milestone 13 current-state register. This file distinguishes approved direction, Dev/Preview implementation and Production state. A provider is not called live merely because it appears in code or historical planning.

| Integration / system | Approved role | Dev / Preview state | Production state | Client #1 gate |
| --- | --- | --- | --- | --- |
| Supabase | Auth and authoritative tenant persistence | IMPLEMENTED and verified in Dev/Preview | NOT ESTABLISHED | Separate Production project, clean migrations, Auth/tenant acceptance, backups/restore and commercial plan |
| Vercel | Current app hosting / Preview validation | IMPLEMENTED; Preview deployments used for validation | Existing main deployment is not the approved commercial Client #1 release | Upgrade from Hobby before commercial use; reverify rollback/monitoring/rate-limit controls |
| OpenAI API | Optional language enhancement after deterministic analysis | IMPLEMENTED in controlled application path; human review remains required | NOT APPROVED FOR CLIENT #1 until Production configuration/data disclosure are accepted | Decide whether enabled for Client #1; disclose processor/data flow; do not claim Zero Data Retention from `store:false` |
| Meta | Future lead ingestion and source-aware quality feedback | NOT IMPLEMENTED | NOT IMPLEMENTED | Separate provider milestone, permissions/consent/attribution/credential design and async feedback outbox required |
| Google Ads | Future lead ingestion and source-aware conversion/quality feedback | NOT IMPLEMENTED | NOT IMPLEMENTED | Separate provider milestone, current API/matching/consent/credential design and async feedback outbox required |
| WhatsApp | Later communication layer | NOT IMPLEMENTED | NOT IMPLEMENTED | Separate approval and provider architecture required |
| Voice AI | Later communication layer | NOT IMPLEMENTED | NOT IMPLEMENTED | Separate approval and provider architecture required |
| Booking / calendar | Later appointment layer | NOT IMPLEMENTED | NOT IMPLEMENTED | Separate approval and provider architecture required |
| n8n | Possible future adapter only | NOT AUTHORITATIVE / not required for core | NOT IMPLEMENTED as state engine | May be used only as an adapter if later approved; LeadRescue remains state engine |
| Stripe | Billing after first-10 review if later approved | APPROVED EXCLUSION for clients 1-10 | NOT IMPLEMENTED | Founder handles external/manual billing for clients 1-10 |
| Zoho CRM | No sync | APPROVED EXCLUSION | NOT IMPLEMENTED | Do not add unless explicit decision reversal |

## Current credential boundary

- Provider secrets and tokens must not be stored in browser localStorage, public repository files, `source_metadata` or client-visible payloads.
- Normal Supabase application operations use authenticated user context, not service-role bypass.
- Future Meta/Google credentials need a tenant-scoped secure storage/rotation design before connector coding.
- Environment-variable names may be version controlled where safe; secret values must not be committed.

## Source and attribution boundary

- Import mechanism, lead source and ad attribution are different concepts.
- CSV does not automatically mean manual/unattributed.
- Free-text source is insufficient to authorize Meta/Google feedback.
- Manual/unattributed leads still receive scoring, follow-up, reminders and outcomes, but no provider feedback without valid attribution evidence.
- Provider failure must never block saving LeadRescue state. Future feedback delivery requires asynchronous outbox/retry semantics unless a later approved architecture replaces it.

## Update rule

Reverify the relevant provider's current official API, permissions, quotas, data/consent terms and credential requirements immediately before implementation. Update this register whenever an integration moves between proposed, implemented, Preview-verified and Production-verified states.
