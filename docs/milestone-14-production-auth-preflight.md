# LeadRescue AI Milestone 14 Production Auth Preflight

**Status:** VERIFIED PRE-CONFIGURATION EVIDENCE WITH QA-IDENTITY EXCEPTION. No Vercel environment variable, `main` branch, or public Production deployment has been changed by this Auth preflight.

## Current Production Supabase state

Production project remains:

- name: `LeadRescue AI Production`
- ref: `iumpokzozncoszwgywwn`
- region: `ap-south-1` / South Asia (Mumbai)
- status: `ACTIVE_HEALTHY`

Current verified Auth state:

- exactly two founder-created email/password Auth users exist;
- both are email-confirmed;
- public self-signup is disabled;
- anonymous sign-ins are disabled;
- email/password provider remains enabled;
- public `profiles`, `organizations`, and `organization_members` are still empty before tenant fixture provisioning.

## Accepted QA identity exception

The two current QA Auth users use owner-controlled real email addresses rather than reserved fictional-domain addresses. The user explicitly chose to continue with these same QA identities because the same pattern was used in earlier validation.

This is accepted only as a temporary Production-validation exception with these hard conditions:

1. treat both accounts as QA/test identities only, never as customer evidence or real client accounts;
2. do not add real client data to their tenant fixtures;
3. use fictional organization, contact, lead, task, event and note data during acceptance;
4. remove both QA Auth users and all linked QA tenant fixtures before Client #1 real commercial Production data is onboarded, not merely after the site is publicly reachable;
5. verify deletion/offboarding and zero QA residue as a Client #1 gate.

## Verified application Auth behavior on `develop`

Current LeadRescue code uses email/password sign-in only for the pilot login path:

- `src/app/login/actions.ts` calls `supabase.auth.signInWithPassword(...)` after server-side login form parsing.
- `src/lib/auth/login.ts` accepts email plus password only.
- `src/app/login/page.tsx` exposes a Sign in form and explicitly states that account creation is controlled during the pilot. It contains no public signup form or signup action.
- `src/lib/supabase/proxy.ts` refreshes/validates the Supabase SSR session with `auth.getClaims()`.
- `src/lib/supabase/config.ts` requires only the Production project's public URL and publishable key for normal application Auth. No service-role/secret key is required by the browser login path.

Therefore the intended Production Auth mode remains founder-provisioned permanent email/password users with public signup disabled at the hosted Supabase Auth layer.

## Vercel/GitHub relationship verified

The existing Vercel project is `leadrescue-ai` under team `LeadRescue AI` and is already connected to exact GitHub repository `nileshsshirishkar/leadrescue-ai`.

Direct deployment metadata confirms GitHub pushes create Preview deployments for `develop` and `ops/production-environment`.

Do not create a duplicate Vercel project and do not connect Supabase's optional GitHub integration. Existing GitHub -> Vercel Preview deployment behavior is already active.

The existing Preview environment must not be silently repointed from Dev Supabase to Production Supabase because it is also used for Dev/PR validation. Production Supabase acceptance should use an explicitly isolated configuration path rather than overwriting shared Preview environment variables.

## Current limitation discovered during fixture provisioning

The connected Supabase SQL execution path currently rejects INSERT statements with `cannot execute INSERT in a read-only transaction`. Reads continue to work. This is not being bypassed or treated as evidence that Production itself is intentionally read-only.

Because the connector cannot currently perform fixture writes, tenant fixture provisioning must use a supported read-write administrative path, such as the Supabase Dashboard SQL Editor, after exact SQL is reviewed. Do not use a schema migration to hide QA fixture data, and do not commit QA identities or credentials to Git.

## Next controlled step

Create two fictional Production organizations, matching profiles and owner memberships for the two existing QA Auth UUIDs through a controlled read-write administrative transaction. Then verify row counts and tenant mapping before creating fictional contacts/leads/tasks for two-tenant acceptance.
