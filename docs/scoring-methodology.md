# Phase 1 scoring methodology

LeadRescue AI Phase 1 is intentionally deterministic. The same validated lead record and reference date always produce the same result. The engine does not infer facts from outside the record and does not estimate a probability of sale.

## Intent level

Intent is calculated first:

| Record signal | Points |
| --- | ---: |
| A specific service interest (not a generic “service”, “information”, or “help”) | +25 |
| Price, cost, availability, appointment, consultation, booking, or quote language | +25 |
| A quoted price or explicit budget/price signal | +20 |
| An appointment marked requested, booked, scheduled, or missed | +15 |
| Enquiry text containing at least 45 characters | +10 |
| Status marked interested, qualified, hot, or proposal | +10 |

- High intent: 55 points or more
- Medium intent: 30–54 points
- Low intent: below 30 points

## Recovery score

The recovery score starts from the intent level:

- High intent: 42
- Medium intent: 27
- Low intent: 12

Follow-up and risk adjustments are then applied:

| Record signal | Score adjustment |
| --- | ---: |
| No usable last-contact date | +5 |
| Last contact 8+ days ago | +22 |
| Last contact 4–7 days ago | +14 |
| Last contact 2–3 days ago | +6 |
| Last contact today or yesterday | −18 |
| Promised callback is recorded and contact is not recent | +20 |
| Missed/no-show appointment | +24 |
| Requested/pending/not-booked appointment | +17 |
| Interested/qualified/hot/proposal status | +10 |
| Explicit price objection | +6 |
| Repeated no-response with high intent | −4 |
| Repeated no-response with medium/low intent | −14 |
| Both phone and email missing | −12 |

The total is rounded and clamped to 0–100.

- Critical: 80–100
- High: 65–79
- Medium: 45–64
- Low: 0–44

## Leakage diagnosis order

Some records contain multiple signals. The engine uses this precedence so the most actionable failure is shown:

1. Recently contacted — monitor
2. Missed appointment without re-engagement
3. Overdue promised callback
4. Appointment requested, not booked
5. Price objection stalled
6. Repeated no-response
7. Needs clarification
8. Interested lead left waiting
9. Follow-up gap

## Queue ranking

The Rescue Queue sorts by recovery priority, intent level, time since last contact, appointment/callback risk, confidence, and then lead name for a stable tie-breaker.

## Evidence and confidence

Evidence sentences are produced only from actual fields: service interest, matched buying language, contact date, appointment status, callback notes, price concerns, follow-up count, and missing contact details.

Confidence is lowered when contact methods or context fields are missing. “Likely objection” uses explicit price, timing, or no-response language; otherwise the UI states that no explicit objection is recorded.

## Recovery messages

Messages use deterministic templates selected from the leakage diagnosis. Dedicated branches cover overdue callbacks, uncompleted appointment requests, missed appointments, price objections, interested leads left waiting, repeated no-response, clarification needs, and recently contacted leads.

Each actionable draft uses only the lead’s first name, recorded service context, and facts established by the diagnosis. Callback drafts mention pricing only when a quoted price or explicit price, pricing, cost, quote, or budget language exists in the record. Templates do not invent discounts, amounts, appointment details, offers, objections, or outcomes, and contain exactly one CTA question.

Recently contacted leads receive an internal hold action rather than a customer-facing draft. The interface labels these cases “Recommended action” and “NO OUTREACH RECOMMENDED,” removes the copy control, and tells the reviewer to return after the current response window. Every output remains marked as requiring human review.

## Phase 2 enhancement boundary

Deterministic scoring and diagnosis remain authoritative. GPT-5.6 enhancement is optional, appears only for outreach-eligible leads, and may improve only the explanation, recovery-message wording, conversation guidance, and uncertainty note. It cannot change the score, priority, diagnosis, evidence, confidence, deadline, next action, or no-outreach decision.

Only an explicit one-lead action can use tokens. Successful results are cached against the relevant record fingerprint, and no-outreach cases are rejected before the OpenAI client is invoked. See `docs/phase-2-architecture.md` for the complete server, privacy, cost, and failure controls.
