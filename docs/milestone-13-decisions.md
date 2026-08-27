# LeadRescue AI Milestone 13 Decision Record

**Status:** Current working decision record for Milestone 13 on PR #27. This supplements the main Decision Log until the milestone is complete and merged. It does not authorize Production or `main` changes.

## Approved decisions

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

## Current recommendations, not yet approved as commercial commitments

### Monitoring

Recommended first-client design:

- founder is primary operational owner;
- Production Vercel runtime logs/errors and Supabase health are checked daily during the controlled pilot;
- automated alerting should cover repeated 5xx/application unavailability and other material failure signals before real data goes live;
- alerts must avoid embedding private lead/contact content;
- secondary escalation contact/channel remains to be named.

Vercel currently documents Production log filtering by environment, status code and error level. This provides a suitable monitoring evidence source, but exact alert delivery/thresholds remain to be selected after the commercial Vercel plan is chosen.

### Application rate limiting

Recommended architecture:

- use Vercel Firewall/WAF rate limiting or another durable distributed mechanism on the approved commercial plan;
- key authenticated limits by verified user and/or server-resolved organization, never a browser-supplied organization id;
- use stricter limits for expensive or abuse-sensitive operations such as AI enhancement and CSV/bulk imports;
- return sanitized HTTP 429 responses;
- do not use an in-memory serverless counter as the security boundary.

Current Vercel documentation states firewall rate limiting is available on Pro or Enterprise. Numeric limits remain deliberately unapproved until the Production plan and expected Client #1 usage are known.

### Backup approach

Recommended initial Client #1 baseline is Supabase Pro daily backups rather than purchasing PITR by default. The final RPO/RTO and whether PITR is justified remain explicit policy decisions. A real restore test with fictional Production-like data is mandatory before Client #1.

## Decisions still requiring explicit approval

- Client #1 target profile.
- Permitted-data boundary.
- Live-data retention after termination.
- Export window before deletion.
- Backup RPO and RTO.
- Monitoring notification channel and secondary escalation contact.
- Final rate-limit thresholds after commercial hosting selection.
- Support channel, support hours and non-SLA response wording.
- Price and billing period.
- Pilot/trial duration.
- Cancellation notice.
- Refund/credit policy.
- Optional OpenAI enhancement enabled/disabled for Client #1.
- Legal/privacy/DPA jurisdiction review path.
- Repository visibility for commercial expansion.
- Vercel paid-plan purchase timing.
- Production Supabase creation and Production promotion.

## Safety boundary

No decision in this file authorizes:

- a Production Supabase project creation;
- paid-plan purchase;
- GitHub repository visibility change;
- provider integration;
- billing integration;
- merge to `main`;
- Production deployment;
- use of real Client #1 lead data before all applicable gates pass.
