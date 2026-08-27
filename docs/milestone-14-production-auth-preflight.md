# LeadRescue AI Milestone 14 Production Auth Preflight

**Status:** VERIFIED PRE-CONFIGURATION EVIDENCE. No hosted Auth setting, Auth user, Vercel environment variable, `main` branch, or public Production deployment was changed by this preflight.

## Current Production Supabase state

Production project remains:

- name: `LeadRescue AI Production`
- ref: `iumpokzozncoszwgywwn`
- region: `ap-south-1` / South Asia (Mumbai)
- status: `ACTIVE_HEALTHY`

Direct database counts before fictional Auth provisioning:

- `auth.users`: 0
- `auth.identities`: 0
- `public.profiles`: 0
- `public.organization_members`: 0

No QA user or client identity exists yet.

## Verified application Auth behavior on `develop`

Current LeadRescue code uses email/password sign-in only for the pilot login path:

- `src/app/login/actions.ts` calls `supabase.auth.signInWithPassword(...)` after server-side login form parsing.
- `src/lib/auth/login.ts` accepts email plus password only.
- `src/app/login/page.tsx` exposes a Sign in form and explicitly states that account creation is controlled during the pilot. It contains no public signup form or signup action.
- `src/lib/supabase/proxy.ts` refreshes/validates the Supabase SSR session with `auth.getClaims()`.
- `src/lib/supabase/config.ts` requires only the Production project's public URL and publishable key for normal application Auth. No service-role/secret key is required by the browser login path.

Therefore the intended Production Auth mode for this milestone is founder-provisioned permanent email/password users, with public signup disabled at the hosted Supabase Auth layer.

## Current official Supabase configuration boundary

Supabase's hosted Auth setting **Allow new users to sign up** controls whether new users can self-register. When disabled, existing users can still sign in. This matches LeadRescue's approved first-10-client founder-provisioning policy.

Do not disable the email provider itself: LeadRescue relies on email/password sign-in. The global signup control should be disabled while email authentication remains enabled.

Supabase admin user creation/invitation is a privileged operation and must be performed from the Dashboard or from a trusted server using a project secret key. A secret key must never be exposed to the browser or committed to Git.

## Vercel/GitHub relationship verified

The existing Vercel project is `leadrescue-ai` under team `LeadRescue AI` and is already connected to exact GitHub repository `nileshsshirishkar/leadrescue-ai`.

Direct deployment metadata confirms GitHub pushes create Preview deployments for `develop` and `ops/production-environment`. The latest PR #28 evidence commit also produced a READY Preview deployment.

Do not create a duplicate Vercel project and do not connect Supabase's optional GitHub integration. Existing GitHub -> Vercel Preview deployment behavior is already active.

The existing Preview environment must not be silently repointed from Dev Supabase to Production Supabase because it is also used for Dev/PR validation. Production Supabase acceptance should use an explicitly isolated configuration path rather than overwriting shared Preview environment variables.

## Hosted Auth settings still requiring direct verification/configuration

The current connector does not expose Supabase hosted Auth-config read/write actions. The database itself also does not establish the hosted `disable_signup` setting.

Before provisioning fictional Production users, directly verify in the Supabase Dashboard for **LeadRescue AI Production**:

1. email/password authentication remains enabled;
2. **Allow new users to sign up** is OFF;
3. anonymous sign-ins remain OFF;
4. do not set a guessed Site URL or redirect URL yet. The exact application acceptance URL must be determined first;
5. do not connect Supabase GitHub/Vercel integrations from the Supabase dashboard.

## Next controlled step

After the hosted signup setting is verified OFF, create exactly two fictional Production QA email/password users through the Supabase Dashboard Auth user administration path, using no real client data. Then record their generated UUIDs and create corresponding fictional profiles, organizations and memberships through controlled database administration for two-tenant acceptance.

Do not manually insert rows into `auth.users` with SQL. Supabase Auth users must be created through supported Auth administration paths.
