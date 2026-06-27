# Claude Development Context

**Project:** Interview Ready (Free-Tier MVP Edition)  
**Version:** 2.0.0  
**Date:** June 20, 2026  
**Purpose:** Living document for AI-assisted development. Feed this to Claude before any coding session.

---

## 1. Project Identity

Interview Ready is a **mobile-first AI career copilot** built on Expo (React Native). It's a Careerflow.ai clone optimized for mobile with African market focus (multi-language resumes, Swahili/French/Amharic support).

**Core flow:** Paste a job description or URL → AI analyzes it → generates ATS-optimized resume + cover letter + interview prep + job fit score. All under 2 minutes.

**Tagline:** "Paste a job. Land the interview."

---

## 2. Architecture DNA (Free-Tier First)

This project is built entirely on **free-tier services**. Every architectural decision prioritizes zero cost at MVP scale.

```
Expo Mobile App
      ↓ HTTPS + WebSocket
Supabase Edge Functions (Deno/Hono)
      ↓
├─ PostgreSQL (500MB, RLS-secured)
├─ Storage (2GB, resumes/docs)
├─ Realtime (200 concurrent, streaming)
├─ Auth (50K users, OAuth)
└─ Deno KV (queue, 10GB)
      ↓
Groq AI (1M tokens/day, Llama 3.3 70B)
OpenRouter (fallback)
```

**Key constraint:** No paid services until we hit documented upgrade triggers. This is not negotiable.

---

## 3. Tech Stack (Immutable for MVP)

| Layer | Technology | Why |
|---|---|---|
| Mobile | Expo SDK 52 + React Native | Cross-platform, OTA updates |
| Styling | NativeWind (Tailwind for RN) | Rapid UI development |
| State | Zustand | Simple, no boilerplate |
| API Cache | TanStack Query v5 | Automatic caching, optimistic updates |
| Backend | Supabase Edge Functions (Deno) | Zero server management |
| API Framework | Hono | Lightweight, fast, Deno-native |
| Database | Supabase PostgreSQL | Managed, RLS, real-time |
| Auth | Supabase Auth | Built-in OAuth, JWT, webhooks |
| AI | Groq API | 1M free tokens/day |
| AI Fallback | OpenRouter | Free tier backup |
| Documents | `docx` (esm.sh) + `pdf-lib` | No Puppeteer/Chromium |
| Queue | Deno KV | Built-in, no Redis |
| Streaming | Supabase Realtime | WebSocket channels |
| Email | Mailgun free tier | 5K emails/month |
| Analytics | PostHog free tier | 1M events/month |
| Monitoring | Sentry free tier | 5K errors/month |
| DNS | Cloudflare free | DDoS + CDN |

**Forbidden for MVP:** Railway, Clerk, Anthropic API, Upstash, Puppeteer, BullMQ, Express.js, Prisma (use Supabase JS client instead).

---

## 4. Design System (Careerflow Clone)

### Colors (Non-Negotiable)
```
Primary:     #6B46FE (violet)
Success:     #16A34A (green)
Warning:     #D97706 (amber)
Error:       #DC2626 (red)
Text Primary:#111827
Text Body:   #374151
Text Muted:  #6B7280
Border:      #E5E7EB
Bg Primary:  #FFFFFF
Bg Secondary:#F9FAFB
```

### Typography
```
Display Large:  30px / 800 weight
Display Medium: 24px / 700 weight
Heading Large:  20px / 700 weight
Heading Medium: 16px / 600 weight
Body Large:     15px / 400 weight
Body Medium:    14px / 400 weight
Label:          12px / 600 weight + 0.4 letter spacing
```

### Component Rules
- Cards: `border-radius: 12px`, subtle shadow, 1px border
- Buttons: Full-radius pill (`9999px`), solid violet
- Score rings: Custom SVG with percentage overlay
- Tags: Rounded pill with colored background + matching text
- Bottom tabs on mobile, sidebar on desktop (responsive)

---

## 5. Database Principles

### RLS is the Security Model
Every table has RLS enabled. No middleware auth checks. The database IS the authorization layer.

```sql
-- Pattern for every table:
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their data" ON public.table_name
  FOR ALL USING (auth.uid() = user_id);
```

### JSONB for Flexible Data
User profiles store work history, education, projects as JSONB arrays. This eliminates schema migrations for profile structure changes.

### Credit System as Database Functions
Credit deduction happens in PostgreSQL functions, not application code. Atomic, race-condition-safe.

```sql
CREATE OR REPLACE FUNCTION public.deduct_credits(user_uuid UUID, amount INT)
RETURNS BOOLEAN AS $$
DECLARE current_credits INT;
BEGIN
  SELECT ai_credits INTO current_credits FROM public.users WHERE id = user_uuid;
  IF current_credits IS NULL OR current_credits < amount THEN RETURN FALSE; END IF;
  UPDATE public.users SET ai_credits = ai_credits - amount WHERE id = user_uuid;
  INSERT INTO public.usage_events (user_id, event, credits_used)
  VALUES (user_uuid, 'credit_deduction', amount);
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. AI Agent Patterns

### Groq Integration Pattern
```typescript
// Every AI call follows this structure:
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }, // ALWAYS enforce JSON
    max_tokens: 4000,
    temperature: 0.7,
  }),
});

const data = await response.json();
const result = JSON.parse(data.choices[0].message.content);
return zodSchema.parse(result); // ALWAYS validate
```

### Fallback Chain
1. Groq (primary, 1M tokens/day)
2. OpenRouter (fallback, free tier models)
3. Cached results (if AI is down)
4. Error message to user (last resort)

### Prompt Engineering Rules
- System prompts define the role and output format
- User prompts contain the dynamic data
- ALWAYS request JSON output with `response_format`
- ALWAYS validate with Zod before storing
- Include examples in system prompts for complex schemas

---

## 7. Edge Function Patterns

### Hono + Supabase Client Pattern
```typescript
import { Hono } from 'https://deno.land/x/hono@v3.12.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const app = new Hono();

// Auth is automatic via JWT header
app.post('/endpoint', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: c.req.header('Authorization')! } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // RLS handles authorization automatically
  const { data } = await supabase.from('table').select('*').eq('user_id', user.id);

  return c.json({ data });
});

Deno.serve(app.fetch);
```

### Error Handling Pattern
```typescript
// All functions use this error structure:
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "status": 402
}

// Codes:
// INSUFFICIENT_CREDITS (402)
// NOT_FOUND (404)
// UNAUTHORIZED (401)
// RATE_LIMITED (429)
// VALIDATION_ERROR (400)
// INTERNAL_ERROR (500)
```

---

## 8. Document Generation Rules

### .docx Generation
- Use `docx` library via esm.sh (Deno-compatible)
- Templates are functions that return `Document` objects
- Margins: 720 DXA top/bottom (0.5in), 900 DXA sides (0.625in)
- Always set complete borders on table cells
- Use `numbering.config` at document level for bullets

### PDF Generation (NO PUPPETEER)
- Use `pdf-lib` for lightweight PDF generation
- No Chromium dependency (saves 100MB+ per function)
- Trade-off: Simpler layouts, but sufficient for MVP
- For complex templates: queue to Browserless free tier (1K sessions/mo)

### File Upload Pattern
```typescript
const { error } = await supabase.storage
  .from('documents')
  .upload(path, buffer, { contentType, upsert: true });

const { data } = supabase.storage.from('documents').getPublicUrl(path);
// Store data.publicUrl in database
```

---

## 9. Realtime Streaming Pattern

Replace SSE with Supabase Realtime channels:

```typescript
// Server (Edge Function)
await supabase.channel(`user:${userId}`).send({
  type: 'export_complete',
  resumeId,
  docxUrl,
  pdfUrl,
});

// Client (React Native)
const channel = supabase.channel(`user:${userId}`)
  .on('broadcast', { event: 'export_complete' }, (payload) => {
    // Handle completion
  })
  .subscribe();
```

---

## 10. Credit System Rules

| Operation | Credits | Groq Tokens Est. |
|---|---|---|
| JD Analysis | 1 | ~3K |
| Resume Generation | 3 | ~12K |
| Cover Letter | 2 | ~7K |
| ATS Scoring | 1 | ~2K |
| Mock Interview (session) | 5 | ~15K |
| LinkedIn Optimizer | 2 | ~5K |
| Elevator Pitch | 1 | ~2K |
| Section Rewrite | 1 | ~3K |

**Free tier:** 10 credits/month (resets 1st of month via pg_cron)  
**Premium:** Unlimited (plan = 'PREMIUM')  
**Premium Plus:** Unlimited + priority (plan = 'PREMIUM_PLUS')

---

## 11. Development Workflow

### Before Coding
1. Check `tasks.md` for current sprint tasks
2. Check `planning.md` for architectural decisions
3. Check `design.md` for UI specifications
4. Reference this file for patterns and constraints

### During Coding
1. Write Edge Function + test with `supabase functions serve`
2. Write mobile screen + test on Expo Go
3. Update `tasks.md` with progress
4. Commit with descriptive message

### After Coding
1. Run `supabase db test` for database tests
2. Run `supabase functions test` for function tests
3. Update `planning.md` if architectural decisions changed
4. Mark task complete in `tasks.md`

---

## 12. Onboarding Philosophy

> **"Show value in 60 seconds, not 60 screens."**

The onboarding flow is designed as a **value-first funnel**, not a setup wizard. Every step delivers immediate value or clearly explains why the data is needed.

### Onboarding Flow (5 Steps, ~3 Minutes)

| Step | Screen | Duration | Value Delivered |
|---|---|---|---|
| 0 | Welcome + Auth | 15s | One-tap signup (Google/LinkedIn) |
| 1 | Role & Goal | 30s | AI learns target role for tailoring |
| 2 | Quick Profile | 60s | Profile completeness ring gamifies progress |
| 3 | The Magic Moment | 90s | **First JD analysis + score rings** |
| 4 | First Resume | 60s | **Tailored resume generated in real-time** |
| 5 | Discover App | 30s | Feature discovery cards, no forced tutorial |

### Key Principles
- **Social auth first** — Google/LinkedIn above fold, email fallback
- **Skip always available** — But warn: "You'll get generic AI suggestions"
- **Magic moment by Step 3** — User sees AI analyze a real job before any heavy lifting
- **Realtime streaming** — Resume builds section-by-section, creating anticipation
- **Progressive disclosure** — Only ask for data when AI needs it
- **Smart defaults** — Pre-fill from OAuth (LinkedIn especially)
- **Gamification** — Profile completeness ring (0-100%) with tips

### Recovery for Abandoned Onboarding
- **Drop at Step 2:** Email 1h later → "Your AI resume is waiting — just paste a job URL" (deep link to Step 3)
- **Drop at Step 3 (post-analysis):** Email → "Your job analysis is saved. Generate your resume in 1 tap."
- **Never opens after signup:** Day 3, 7, 14 drip campaign with social proof

### Metrics to Track
- Signup completion rate: >70%
- Time to first value (resume generated): <3 min
- Day 1 retention: >40%
- Day 1 credit usage: >80%
- Day 14 upgrade rate: >5%

### A/B Tests
1. Social auth priority: Google first vs. LinkedIn first
2. Profile skip: Allow skip vs. force completion
3. Magic moment timing: JD analysis in onboarding vs. after onboarding
4. Credit display: Show remaining vs. show used
5. Upgrade timing: Day 7 vs. Day 14 vs. credit exhaustion

---

## 12. Common Pitfalls to Avoid

1. **Don't use Prisma** — Supabase JS client + Zod is the pattern
2. **Don't install npm packages in Edge Functions** — Use esm.sh CDN imports
3. **Don't store secrets in code** — Use Supabase Vault or env vars
4. **Don't forget RLS** — Every table must have policies
5. **Don't use Puppeteer** — pdf-lib or Browserless free tier only
6. **Don't exceed Groq rate limits** — Implement fallback to OpenRouter
7. **Don't forget credit checks** — Deduct before AI calls
8. **Don't store PII in logs** — Sanitize all user data in error logs
9. **Don't hardcode colors** — Use design tokens from `theme/tokens.ts`
10. **Don't skip Zod validation** — Every AI output must be validated

---

## 13. Testing Strategy

### Edge Functions
- Test locally with `supabase functions serve`
- Use `supabase-js` service role for database assertions
- Mock Groq API calls with nock or manual stubs

### Mobile App
- Test on physical devices (iOS + Android)
- Use Expo Go for rapid iteration
- EAS Build for production-like testing

### Database
- Use `supabase db test` for PostgreSQL tests
- Test RLS policies with different auth contexts
- Test credit deduction for race conditions

---

## 14. Deployment Checklist

### Pre-Launch
- [ ] Apple Developer account ($99/year) — REQUIRED
- [ ] Google Play Developer account ($25) — REQUIRED
- [ ] Domain registered (~$12/year) — REQUIRED
- [ ] Supabase project created (free tier)
- [ ] Groq API key obtained (free tier)
- [ ] Mailgun account created (free tier)
- [ ] PostHog project created (free tier)
- [ ] Sentry project created (free tier)
- [ ] Cloudflare DNS configured (free tier)
- [ ] Stripe account created (test mode)

### Database
- [ ] All migrations applied
- [ ] RLS policies verified
- [ ] Triggers tested (auth sync, credit reset)
- [ ] Seed data inserted (templates, plans)

### Edge Functions
- [ ] All functions deployed
- [ ] Environment variables set
- [ ] CORS configured
- [ ] Rate limits tested

### Mobile App
- [ ] EAS Build successful
- [ ] App Store submission prepared
- [ ] Play Store submission prepared
- [ ] Deep linking configured
- [ ] Push notifications set up

---

## 15. Communication Style

When asking Claude to write code:
- **Be specific** about which file/screen/function
- **Reference the PRD** section number for context
- **Mention constraints** (free tier, no Puppeteer, etc.)
- **Provide examples** of existing code patterns
- **Ask for tests** alongside implementation

When Claude asks questions:
- **Prioritize user experience** over developer convenience
- **Choose simplicity** over cleverness
- **Document decisions** in `planning.md`
- **Keep costs zero** unless explicitly upgrading

---

*This document is living. Update it as the project evolves. Last updated: June 20, 2026*
