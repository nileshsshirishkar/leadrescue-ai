# Controlled Supabase lead write contract

## Status

DESIGN ONLY. No application write endpoint is implemented by this document.

## Goal

Define the minimum safe contract for persisting an imported lead without duplicating records on retries, crossing tenant boundaries, silently merging contacts, or leaving partial data behind.

## Locked safety boundary

- Production remains unchanged.
- RLS remains enabled and is the database authorization boundary.
- Ordinary application writes must use the authenticated user session. Do not use a service-role bypass.
- The browser-local workspace remains authoritative until the write path is separately implemented, validated in Preview, and approved.
- Do not automatically merge contacts by email or phone. The current schema does not define either field as unique and two legitimate people can share contact details.
- Do not overwrite an existing persisted lead merely because the same import is retried.

## Idempotency key

For imported or provider-originated leads that are persisted through this contract, both `source` and `source_external_id` are required by the application write contract.

The database conflict key is:

`(organization_id, source, source_external_id)`

The database migration adds a unique constraint on those three columns. PostgreSQL unique constraints allow multiple rows where `source_external_id` is null, so existing/manual records can remain without an external id while imported records receive deterministic retry protection.

`source` and non-null `source_external_id` must already be trimmed and non-empty before insertion. The database also enforces this to reject ambiguous keys such as whitespace-only or padded identifiers.

## First-write behavior

A first successful persisted import should:

1. Resolve the authenticated user's organization context using the existing fail-closed resolver.
2. Validate the incoming lead against a dedicated server-side persistence schema.
3. Normalize the source key before the database boundary.
4. Create one contact row for the imported record.
5. Create one lead row tied to that contact and the authenticated organization.
6. Create a `lead_events` audit row identifying the successful persisted import and authenticated actor.
7. Return only the persisted lead identifier and an explicit `created` result.

The contact, lead, and audit event must succeed or fail as one transaction. A contact must not remain orphaned if the lead or audit insert fails.

## Retry behavior

A retry with the same `(organization_id, source, source_external_id)` must not create another contact or mutate the existing lead.

The write operation should return the existing lead identifier with an explicit `existing` result. The duplicate path must be concurrency-safe and rely on the database unique constraint, rather than a read-then-insert race in application code.

This is intentionally different from a normal destructive upsert. Retrying an import must not overwrite status, notes, follow-up state, ownership, or other fields that a human may have changed after the first import.

## Contact handling

For the first controlled version, each newly persisted external lead creates its own contact row unless the request is resolved as an existing lead through the idempotency key.

Future contact deduplication may be designed separately, but must not assume email or phone uniqueness without an explicit approved policy and tests.

## Tenant enforcement

- The client must never supply an authoritative organization id.
- Organization id comes only from the authenticated server-side organization context.
- Inserts remain subject to the existing RLS membership policies.
- The lead/contact same-organization foreign key remains a second database-level boundary.
- Returned data must be checked against the resolved organization before leaving the server.

## Atomic database boundary

The preferred implementation is a narrowly scoped PostgreSQL function invoked with the authenticated Supabase session and executed as `SECURITY INVOKER`, so caller privileges and RLS remain effective.

The function should perform contact creation, lead insertion, duplicate conflict handling, and audit event creation in one transaction. If this design proves impractical during implementation, any alternative must preserve the same atomicity, RLS, retry, and audit guarantees before approval.

## Audit event

A newly persisted lead should create one immutable `lead_events` row, for example with event type `lead_imported`, with `actor_user_id` bound to the authenticated user through the current RLS policy.

A duplicate retry that returns an existing lead should not create another import event unless a later approved audit policy explicitly requires retry events.

## Initial API behavior, pending implementation

The future endpoint should accept only the fields required by the current LeadRescue import model. It should reject:

- unauthenticated requests;
- missing or ambiguous organization membership;
- missing source or external source id for persistence;
- invalid contact/lead values;
- caller-supplied organization or actor identifiers;
- oversized payloads;
- unsupported fields.

Suggested success responses:

- `201` for a newly created lead;
- `200` for an idempotent retry that resolves to the existing lead.

Error responses must remain sanitized and must not expose SQL, stack traces, secrets, or cross-tenant record existence.

## Required validation before any merge of a write implementation

- migration applies cleanly from a fresh local database;
- existing database tests remain green;
- unique idempotency-key tests pass;
- duplicate retry creates no second contact, lead, or import event;
- concurrent duplicate submissions result in one persisted lead;
- transaction rollback leaves no contact when lead/event creation fails;
- authenticated member can write only inside its organization;
- cross-tenant insert attempts fail under RLS;
- malformed and oversized payloads fail closed;
- Preview runtime test uses fictional non-production records only;
- exact Preview commit passes lint, typecheck, unit tests, build, and pgTAP tests;
- Decision Log is updated before promotion to `develop`.

## Explicitly out of scope

- Production writes;
- browser `localStorage` migration;
- automatic contact deduplication;
- bulk imports;
- provider webhooks;
- Meta or Google ingestion;
- CRM sync;
- WhatsApp, voice, booking, billing, or automation integrations.
