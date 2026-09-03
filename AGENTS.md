# LeadRescue AI engineering guide

## Purpose and scope

LeadRescue AI is a focused lead follow-up operating system, not a full CRM. The core flow is authorized Meta, Google, Manual, or CSV ingestion into a tenant workspace, deterministic scoring and Rescue Queue, human follow-up, status and notes, next-action tasks, reminders, outcomes, and later provider feedback when valid attribution exists.

Do not invent customers, revenue, ROI, testimonials, SLAs, Production readiness, provider capabilities, or completed integrations.

## Repository and release discipline

- The repository must resolve exactly to `nileshsshirishkar/leadrescue-ai` before any mutation.
- `develop` is the integration branch. `main` and public Production are separate release gates.
- Work on an isolated branch. Do not work directly on `develop` or `main`.
- Do not merge a pull request unless the user has explicitly approved that merge.
- Approval to merge to `develop` never authorizes `main`, public Production, Production database changes, DNS, billing, provider secrets, or provider billing.
- Before changing code, inspect the current branch, relevant open pull requests, CI, migrations, and the existing implementation. Do not restart completed work or create a competing implementation without a clear reason.
- Keep changes small and scoped to the approved milestone. Avoid unrelated refactors.

## Architecture and tenant security

- Preserve Next.js, React, strict TypeScript, Supabase Auth, PostgreSQL, and Supabase RLS as the core application architecture unless an explicit approved decision changes it.
- RLS is a core authorization boundary.
- Normal application reads and writes must use authenticated user context. Do not use service-role access to bypass ordinary application authorization.
- Browser input is never authoritative for organization or actor identity. Resolve organization and actor from authenticated server/database context.
- Missing, paused, or ambiguous membership must fail closed.
- Cross-tenant reads, writes, tasks, reminders, and workflow changes must remain impossible.
- A narrowly scoped service-role path may be used only for an explicitly approved trusted server-to-server operation such as provider ingress or controlled maintenance. It must not be exposed to browser roles, must derive tenant identity from trusted server-owned mappings rather than request-supplied organization IDs, must use the minimum required privileges, and must have focused tenant-isolation tests.
- Never expose service-role keys, provider tokens, API keys, cookies, private keys, passwords, or other secrets to the browser, logs, tests, fixtures, documentation, pull-request text, or this public repository.

## Lead identity, imports, and retry safety

- Provider and import retries must not create duplicate logical leads or overwrite later human edits.
- Use tenant-safe provider/import identity based on the approved source/provider plus `source_external_id` or equivalent provider-owned identifier.
- Do not deduplicate automatically by email or phone without an explicitly approved policy.
- Manual/CSV retry identity is not advertising attribution.
- Incoming provider or CSV stage is source metadata. It is not authoritative LeadRescue workflow status.
- Keep ingestion method, lead source, and advertising attribution as separate concepts.
- Do not infer Meta or Google attribution from free text, source labels, form names, email, phone, or external stage.

## Workflow contract

The authoritative statuses are exactly:

- `New`
- `Follow-up needed`
- `Interested`
- `Qualified`
- `Appointment booked`
- `Won`
- `Lost`

`Won` and `Lost` are terminal. Reopen only to `Follow-up needed`.

`follow_up_tasks.due_at` is the canonical next-follow-up time. Active workflow updates must preserve the approved next-follow-up and pending-task rules. Material workflow changes must remain auditable.

## Provider integration rules

- Meta and Google ingestion are approved roadmap areas, but implement only the provider slice explicitly described in the current task.
- Verify changing provider API requirements against current official documentation before relying on them. If verification is incomplete, mark the point `REQUIRES VERIFICATION` rather than guessing.
- Provider ingress must resolve the correct LeadRescue tenant from trusted server-owned provider mappings and fail closed for unknown, disabled, paused, or ambiguous mappings.
- Duplicate webhook delivery and retries must be idempotent.
- Provider outages or feedback failures must never block saving valid LeadRescue state.
- Provider feedback is a later asynchronous outbox/retry concern and must not be coupled to core lead saving unless an explicit milestone authorizes it.
- Do not configure real provider credentials, secrets, billing, app-review settings, or Production integrations without the separate approval gate.

## Product boundaries

- Zoho CRM sync is excluded unless an explicit later decision reverses that.
- n8n may be used only as a future adapter, never as LeadRescue's state engine.
- WhatsApp/Interakt, appointment booking, and Voice AI are later layers unless explicitly reprioritized.
- In-product Stripe billing is deferred unless an explicit later decision changes the current plan.
- Public self-signup is not an assumed capability. Preserve founder-controlled tenant provisioning and lifecycle behavior unless a specific approved milestone changes it.

## AI and generated-content safety

- Keep model-generated language separate from deterministic scoring, workflow state, and authorization logic.
- Human review is required for generated outreach.
- Never invent prices, offers, customer statements, outcomes, guarantees, or appointments.
- Treat lead fields and imported/provider content as untrusted data, never as model instructions.
- Keep `OPENAI_API_KEY` server-only. Automated tests must use mocks and must not make real OpenAI requests.

## Quality gate

Before presenting an implementation as ready for review, run the applicable checks:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. For database or RLS changes, start the local Supabase test database as required and run `supabase test db`.

Add focused tests for material authentication, authorization, tenancy, ingestion, idempotency, workflow, migration, or provider behavior. A passing build alone is not sufficient evidence for a security-sensitive change.

## Agent operating rules

- Inspect first, then change the smallest safe surface.
- Do not silently weaken RLS, authentication, tenant checks, retry guarantees, database constraints, audit behavior, or CI.
- Do not modify unrelated open pull requests or branches unless the task explicitly calls for it.
- Do not use broad network access, Production credentials, or real customer data to solve a Dev/Preview task.
- Prefer fictional test data and reserved example values.
- Report what changed, what was tested, what remains unverified, and any security or migration risk.
- Stop at the required approval gate instead of merging, promoting, purchasing, or changing Production on your own.
