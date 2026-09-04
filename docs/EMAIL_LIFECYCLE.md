# InterviewReady Email Lifecycle (email-bot lane, Master Plan §6)

Post-capture email program for the LinkedIn funnel (appinterviewready.top).
Capture trigger = landing-page email form (`/ats-score`, owned by hermes/coder-bot)
→ `POST /api/email/capture` → welcome email (immediate) → 5-email value drip.

> **Repo home:** this is the canonical project folder `C:\Users\user\interview-ready`
> (Expo web app). The lane was migrated here from the legacy Vite repo
> (`Desktop\Projects\interview-ready\interview-ready`), which previously owned
> the domain; the Vite repo's copies are kept as the live fallback until this
> repo is deployed to the domain.

## What is live / where

| Piece | Location | State |
|---|---|---|
| Welcome + drip copy | `api/email/_lib/content.ts` | built, dry-run verified |
| SMTP send shell | `api/email/_lib/mail.ts` (Spaceship transporter reused from `api/_lib/spaceship.ts`) | built |
| Airtable storage | `api/email/_lib/airtable.ts` | built |
| UTM / schedule policy | `api/email/_lib/lifecycle.ts` | built |
| Capture trigger endpoint | `api/email/capture.ts` | built |
| Drip scheduler tick | `api/email/tick.ts` (Vercel Cron) | built |
| Signup hook (stop drip) | `api/email/signed-up.ts` | built |
| Tracking endpoints | `api/t/pixel.ts`, `api/t/click.ts`, `api/t/unsub.ts` | built |
| Lead-magnet page | `public/ats-checklist.html` (10-point ATS checklist) | built |
| Dry-run verifier | `scripts/email-dryrun.ts` | built |
| Airtable tables | "Email Subscribers", "Email Events" (base `app5axaWoe4MblFFS`) | CREATED |

Not yet live on the site: endpoints are committed locally but not deployed to
Vercel, and the `/ats-score` landing (hermes) must call the capture endpoint.

## Capture trigger contract (what hermes/coder-bot wires)

Landing page email form (`/ats-score`), after the visitor submits:

```js
await fetch('/api/email/capture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,                 // required
    name,                  // optional, used for greeting
    source: 'linkedin',    // optional; default linkedin
    utm_campaign: 'ats-score-landing'  // optional; original LinkedIn post slug
  }),
});
// response: { success, existed, welcomeSent, status, promo: 'LINKEDIN20' }
```

Fire the `email_captured` analytics event at the same time (analytics-bot's
GA4/analytics events). Do NOT call this endpoint from the browser before
server-side validation — the api handler re-validates and rate-limits.

Idempotent: re-capturing the same email never re-sends the welcome.

## Status machine (Airtable "Email Subscribers".Status)

`new → welcome_sent → drip1_sent → drip2_sent → drip3_sent → drip4_sent →
drip5_sent → done` · terminal: `signed_up` (stopped by /api/email/signed-up),
`unsubscribed` (via /api/t/unsub), `done` (3 consecutive send errors).

Scheduling (1–2 per week): welcome day 0 · drip-1 +4 · drip-2 +7 · drip-3 +11 ·
drip-4 +14 · drip-5 +18. Days are configurable in `DRIP_DAY_OFFSETS`.

## Drip scheduler (Vercel Cron)

`tick.ts` runs daily and sends every due email, with an optimistic lock
(Next Due At pushed +2h before send) so overlapping runs cannot double-send.

vercel.json (add this; needs `EMAIL_CRON_SECRET` in Vercel env):

```json
{
  "crons": [
    { "path": "/api/email/tick?key=YOUR_SECRET", "schedule": "0 8 * * *" }
  ]
}
```

Secret auth: `?key=` or header `x-email-cron-secret` must equal
`EMAIL_CRON_SECRET`. Without a configured secret tick returns 403 (safe
default). Add these to the Vercel project env: `EMAIL_CRON_SECRET`,
optionally `AIRTABLE_SUBSCRIBERS_TABLE` / `AIRTABLE_EVENTS_TABLE`
(defaults: "Email Subscribers" / "Email Events"). SPACESHIP_* and AIRTABLE_*
are already in the production env.

## Tracking & the weekly analytics report

Every email carries exactly ONE tracked marketing CTA
(`utm_source=email&utm_medium=email&utm_campaign=<welcome|drip-N>`), an open
pixel, and a footer unsubscribe link. All events land in "Email Events"
(Type: send / open / click / unsubscribe / signed_up / error).

Report queries (analytics-bot):

```js
// opens/clicks per campaign (unique-ish; dedupe by Email in your pivot)
Type='open' AND Campaign='drip-2'   // etc.
Type='click' AND Campaign='drip-2'
```

Delivery-rate / open-rate / click-rate denominator = sends per campaign
(`Type='send'`). Open rate: unique-openers / sent; click rate:
unique-clickers / sent. Post-Apple-MPP note: open rates skew low; click
rate is the harder signal — best performer = highest unique click rate
plus signup events (`signed_up` with note "signup webhook").

## Env additions

```
EMAIL_CRON_SECRET=<long random>        # protects tick + signed-up
AIRTABLE_SUBSCRIBERS_TABLE=Email Subscribers   # optional
AIRTABLE_EVENTS_TABLE=Email Events              # optional
```

## Deploy checklist (handoff to hermes, tech-lane owner)

1. Review + commit `api/email/**`, `api/t/**`, `public/ats-checklist.html`,
   `scripts/email-dryrun.ts` (commit is made; not pushed).
2. Add `EMAIL_CRON_SECRET` (+ optional table overrides) to Vercel env.
3. Add the `crons` block to vercel.json, then deploy.
4. Wire `/ats-score` form → `POST /api/email/capture` (contract above).
5. Smoke test: dry-run (`npx tsx scripts/email-dryrun.ts`), then one real
   capture to a test address, confirm welcome lands, and the pixel/click
   rows appear in "Email Events".
