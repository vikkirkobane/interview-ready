# InterviewReady Email Lifecycle (email-bot lane, Master Plan §6)

Post-capture email program for the LinkedIn funnel (appinterviewready.top).
Capture trigger = landing-page email form (`/ats-score`, owned by hermes/coder-bot)
→ `POST /api/email/capture` → welcome email (immediate) → 5-email value drip.

> **Repo home:** this is the canonical project folder `C:\Users\user\interview-ready`
> (Expo web app). The lane was migrated here from the legacy Vite repo
> (`Desktop\Projects\interview-ready\interview-ready`), which previously owned
> the domain and still serves it until this repo is deployed there. All new
> email-lane work happens here.

## Where everything lives

| Piece | Location | State |
|---|---|---|
| Welcome + drip copy (6 campaigns) | `api/email/_lib/content.ts` | built, dry-run verified |
| Resend-only send shell | `api/email/_lib/mail.ts` (From `welcome@noreply.appinterviewready.top`, replyTo info@) | built |
| Airtable storage | `api/email/_lib/airtable.ts` (tables `Email Subscribers`, `Email Events`, base `app5axaWoe4MblFFS`) | CREATED |
| UTM / schedule policy | `api/email/_lib/lifecycle.ts` | built |
| Capture trigger endpoint | `api/email/capture.ts` | built |
| Drip scheduler tick | `api/email/tick.ts` (Vercel Cron) | built |
| Signup hook (stop drip) | `api/email/signed-up.ts` | built |
| Tracking endpoints | `api/t/pixel.ts`, `api/t/click.ts`, `api/t/unsub.ts` | built |
| Lead-magnet page | `public/ats-checklist.html` (10-point ATS checklist) | built |
| Dry-run verifier | `scripts/email-dryrun.ts` | built |
| Sender infra | Resend domain `noreply.appinterviewready.top` verified (Vercel DNS, Sep 4 2026); `RESEND_API_KEY` in Vercel prod env | **LIVE (via legacy Vite deploy)** |
| Drip cron | `vercel.json` crons → `/api/email/tick` daily 08:00 UTC | **LIVE (via legacy Vite deploy)** |

> ⚠️ **Sender infra note (Sep 4 2026):** the Spacemail/Spaceship mailbox
> `info@appinterviewready.top` has been rejected by its outbound gateway with
> `550 JFE040000 (high probability of spam)` since ~Sep 1 — 85 bounces in the
> inbox including real recipients from earlier v2 launch sends. The email
> lifecycle therefore sends exclusively through **Resend** (`RESEND_API_KEY`).
> The legacy APK-download welcome emails (`api/_lib/spaceship.ts` in the Vite
> repo) still use Spaceship and likely still bounce — separate fix owner.

**Currently live on appinterviewready.top:** the legacy Vite deploy (which
owns the domain and runs the identical lifecycle code). This repo's ported
copy (commit `b6f5ae9`) is the takeover-proof duplicate: when this Expo repo
deploys to the domain, the funnel survives. Before that deploy: add
`RESEND_API_KEY`, `EMAIL_CRON_SECRET`, `AIRTABLE_SUBSCRIBERS_TABLE`,
`AIRTABLE_EVENTS_TABLE` to the Vercel project env.

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

Fire the `email_captured` analytics event at the same time. The api handler
re-validates and rate-limits per IP. Idempotent: re-capturing the same email
never re-sends the welcome.

## Status machine (Airtable "Email Subscribers".Status)

`new → welcome_sent → drip1_sent → drip2_sent → drip3_sent → drip4_sent →
drip5_sent → done` · terminal: `signed_up` (stopped by /api/email/signed-up),
`unsubscribed` (via /api/t/unsub), `done` (3 consecutive send errors).

Scheduling (1–2 per week): welcome day 0 · drip-1 +4 · drip-2 +7 · drip-3 +11 ·
drip-4 +14 · drip-5 +18. Days configurable in `DRIP_DAY_OFFSETS`.

## Drip scheduler (Vercel Cron)

`tick.ts` runs daily and sends every due email, with an optimistic lock
(Next Due At pushed +2h before send) so overlapping runs cannot double-send.
Authorized by the `vercel-cron/1.0` user-agent (cron cannot set headers) or by
`?key=` / `x-email-cron-secret` matching `EMAIL_CRON_SECRET` (403 without it).

## Tracking & the weekly analytics report

Every email carries exactly ONE tracked marketing CTA
(`utm_source=email&utm_medium=email&utm_campaign=<welcome|drip-N>`), an open
pixel, and a footer unsubscribe link. All events land in "Email Events"
(Type: send / open / click / unsubscribe / signed_up / error).

Report queries (analytics-bot):

```js
// opens/clicks per campaign (dedupe by Email for uniques)
Type='open' AND Campaign='drip-2'
Type='click' AND Campaign='drip-2'
```

Delivery-rate / open-rate / click-rate denominator = sends per campaign
(`Type='send'`). Post-Apple-MPP: open rate skews low; click rate is the harder
signal — best performer = highest unique click rate plus `signed_up` events.

## Env additions (`.env` / Vercel)

```
RESEND_API_KEY=re_...                # REQUIRED — all lifecycle sends
EMAIL_CRON_SECRET=<long random>      # protects tick + signed-up
AIRTABLE_SUBSCRIBERS_TABLE=Email Subscribers   # optional
AIRTABLE_EVENTS_TABLE=Email Events              # optional
```

## Verification

- `npx tsc --noEmit` — clean
- `npx tsx scripts/email-dryrun.ts` — 6/6 campaigns (1 click link, UTM trio,
  pixel, unsub, no stray links; no em-dashes in copy)
- Prod smoke (Sep 4): capture → welcomeSent=true via Resend, status
  welcome_sent, drip-1 due +4d; drip-1 and drip-2 sent via cron test;
  open/click rows verified in Email Events.
