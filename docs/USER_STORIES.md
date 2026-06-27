# Interview Ready — User Stories & Implementation Plan

**Document Version:** 1.0  
**Date:** June 20, 2026  
**Author:** AI Design Session  
**Purpose:** Comprehensive user story mapping with interconnected engagement loops and implementation roadmap

---

## Table of Contents

1. [Overview & Engagement Philosophy](#overview--engagement-philosophy)
2. [User Story Inventory](#user-story-inventory)
3. [Implementation Roadmap](#implementation-roadmap)
4. [Navigation Architecture](#navigation-architecture)
5. [State Management Strategy](#state-management-strategy)
6. [Engagement Mechanics](#engagement-mechanics)
7. [Success Metrics](#success-metrics)
8. [Risk Mitigation](#risk-mitigation)

---

## Overview & Engagement Philosophy

### Core Principle: "Show Value in 60 Seconds, Not 60 Screens"

Interview Ready is designed as an **interconnected value loop** where each user action unlocks deeper engagement with subsequent features. The app must:

✅ Deliver magical value before asking for money  
✅ Create habit-forming daily/weekly loops  
✅ Interconnect features so users never feel stuck  
✅ Use gamification & scarcity (credits) to motivate, not frustrate  
✅ Build emotional investment early (magic moment at 3 minutes)

### User Never Feels Stuck Because:
- Every feature connects to others (resume → tracker → interview → resume)
- Credits create scarcity (motivates upgrade, not friction)
- Accomplishments trigger dopamine (badges, confetti, scores)
- Magic moment happens early (JD analysis + resume in <3 mins)
- Daily habit loops keep users coming back (dashboard → follow-up → action)

---

## User Story Inventory

### PHASE 1: ONBOARDING LOOP (Minutes 0-3, Stories 1-6)

#### Story 1: Welcome & Social Auth
**Screen:** `(auth)/welcome.tsx`  
**Duration:** 15 seconds  
**Priority:** P0 (Critical path)  
**Credits Required:** 0

**User Need:**
```
As a job seeker,
I want to sign up with one tap (Google/LinkedIn),
So I can start immediately without friction.
```

**Acceptance Criteria:**
- [ ] Google OAuth button visible and functional
- [ ] LinkedIn OAuth button visible and functional
- [ ] Email/password form available (collapsed, expandable)
- [ ] "Try without account" option limits to 1 JD analysis
- [ ] Auto-fills profile data from OAuth provider
- [ ] Branded tagline visible: "Paste a job. Land the interview."
- [ ] Terms + Privacy links in footer
- [ ] Deep link recovery on app resume

**Implementation Details:**
- Use `expo-auth-session` for OAuth flows
- Store auth state in Zustand `authStore`
- Persist session to Supabase `auth.users`
- Trigger auth webhook → sync to `public.users` table
- Handle token refresh automatically

**Dependencies:**
- Supabase Auth configured (Google + LinkedIn OAuth)
- Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Auth guard middleware in navigation

**Handoff to Story 2:**
- Profile data auto-filled from OAuth
- Navigation to `(onboarding)/role-goal`

---

#### Story 2: Role & Goal Customization
**Screen:** `(onboarding)/role-goal.tsx`  
**Duration:** 30 seconds  
**Priority:** P0  
**Credits Required:** 0

**User Need:**
```
As a mid-career professional,
I want to tell the AI my target role and experience level,
So it tailors resumes and interview prep to my situation.
```

**Acceptance Criteria:**
- [ ] Target role dropdown with 10+ common suggestions + custom
- [ ] Years of experience segmented control (0-2 / 2-5 / 5-10 / 10+)
- [ ] Work type multi-select (Remote / Hybrid / Onsite)
- [ ] Smart defaults from OAuth (LinkedIn title → suggested role)
- [ ] Progress indicator: "Step 1 of 5"
- [ ] Next button enabled when all fields filled
- [ ] Data persists on app kill/resume

**Implementation Details:**
- Create `target_role`, `years_experience`, `work_type_preference` in `user_profiles` table
- Update Zustand `profileStore` on each field change
- Debounce saves to Supabase (500ms, 3 debounce)
- Show loading state during save

**Dependencies:**
- `user_profiles` table with new columns
- Zustand store with `setRole()` action
- Database migration

**Handoff to Story 3:**
- Data saved to `user_profiles.target_role` etc.
- Navigation to `(onboarding)/quick-profile`

---

#### Story 3: Profile Speed Run (Gamified)
**Screen:** `(onboarding)/quick-profile.tsx`  
**Duration:** 60 seconds  
**Priority:** P0  
**Credits Required:** 0

**User Need:**
```
As a user,
I want to quickly add my latest role, skills, and education,
So the AI can generate more personalized resumes.
```

**Acceptance Criteria:**
- [ ] Animated progress ring (0-100% completeness) updates live
- [ ] Input fields for: job title, company, current role, skills, years, education
- [ ] Skills tag input with auto-complete suggestions
- [ ] Progress tips visible: "Add 3 skills to improve suggestions"
- [ ] Milestone badges trigger at 50%, 75%, 100%
- [ ] Celebratory micro-animation at 100% completion
- [ ] "Skip for now" button with warning modal
- [ ] Auto-save every 3 seconds
- [ ] Data persists across sessions

**Implementation Details:**
- Calculate completeness as: (fields_filled / total_fields) * 100
- Fields: job_title, company, current_role, skills (3+), years_at_job, education
- Auto-complete from:
  - Common job titles (hardcoded)
  - Popular skills by role (algolia/meilisearch)
  - LinkedIn API (if OAuth granted)
- Use Reanimated for progress ring animation
- Toast notifications for milestones

**Dependencies:**
- `user_profiles` JSONB columns: `work_history`, `education`, `skills`
- Milestone badge components (Lucide icons)
- Algolia/Meilisearch integration (optional, autocomplete)

**Handoff to Story 4:**
- Profile ~70% complete minimum to unlock AI
- Navigation to `(onboarding)/jd-analyzer`

---

#### Story 4: The Magic Moment — First JD Analysis
**Screen:** `(onboarding)/jd-analyzer.tsx`  
**Duration:** 90 seconds  
**Priority:** P0 (Core product)  
**Credits Required:** 1 (free tier allows unlimited in onboarding)

**User Need:**
```
As a candidate,
I want to paste a job description (or URL),
So I can immediately see how well I match with score rings.
```

**Acceptance Criteria:**
- [ ] Paste text area accepts job description
- [ ] URL input with validation (LinkedIn, Indeed, generic)
- [ ] Submit button disabled until input
- [ ] "Example" link pre-fills sample JD
- [ ] Loading state with animated skeleton + progress steps
- [ ] Results display three score rings animated reveal:
  - ATS Match: 60-100%
  - Skill Match: 60-100%
  - Keyword Match: 60-100%
- [ ] Recommendation badge (Great/Good/Stretch)
- [ ] Skills breakdown (matched/missing in green/red)
- [ ] Job summary card (collapsible)
- [ ] "Generate Resume" CTA (primary, violet)
- [ ] "Generate Cover Letter" CTA (secondary)
- [ ] "Save to Tracker" CTA (tertiary)
- [ ] Results cached for 24h

**Implementation Details:**
- Backend endpoint: `/jobs/analyze` (Edge Function)
- Input validation: URL length <2000, text length <5000
- Job scraper: Cheerio-based HTML parsing
  - LinkedIn parser (extract job ID from URL)
  - Indeed parser (extract job ID from URL)
  - Generic parser (Cheerio for fallback)
- Cache: Deno KV with 24h TTL
- AI pipeline:
  - Call `JD_ANALYZER_AGENT` with Groq
  - Validate output with Zod
  - Calculate scores (ATS, Skill, Keyword)
  - Return structured response

**Dependencies:**
- Edge Function: `functions/jobs/analyze.ts`
- JD_ANALYZER_SCHEMA (Zod)
- Job scraper integration (Cheerio)
- Groq API client
- Caching layer (Deno KV)

**Handoff to Story 5:**
- Save job_analysis to database
- Pre-fill resume generation context
- Navigation to `(onboarding)/resume-generation` OR `(app)/(tabs)/home`

---

#### Story 5: Real-Time Resume Generation (Momentum Builder)
**Screen:** `(onboarding)/resume-generation.tsx`  
**Duration:** 60 seconds  
**Priority:** P0  
**Credits Required:** 3 (deducted before generation)

**User Need:**
```
As a candidate,
I want to see my resume being built section-by-section in real-time,
So I feel the AI is actively working for me.
```

**Acceptance Criteria:**
- [ ] Header shows job title + template name + progress "Step 4 of 5"
- [ ] Sections appear one-by-one with animations:
  - Professional Summary
  - Experience
  - Skills
  - Education
  - Projects (if available)
- [ ] Real-time streaming via Supabase Realtime channels
- [ ] PDF preview updates live (right side on web)
- [ ] Completion screen with confetti animation
- [ ] Stats display:
  - Keywords matched: X/Y
  - ATS compatibility: X%
  - Generated in: X seconds
- [ ] "Download .docx" button (primary)
- [ ] "Generate Cover Letter" button (secondary)
- [ ] "View in Tracker" button (tertiary)

**Implementation Details:**
- Backend endpoint: `/resumes/create` (Edge Function)
  - Pre-check credits (deduct 3)
  - Load user profile + job analysis
  - Call `RESUME_TAILOR_AGENT` with streaming
  - Stream updates via Supabase Realtime
  - Generate .docx in background queue
  - Store resume + content in database
- Frontend:
  - Zustand `resumeStore` for state
  - Realtime channel subscription
  - Animated section reveals (Reanimated)
  - PDF preview (react-pdf)

**Dependencies:**
- Edge Function: `functions/resumes/create.ts`
- RESUME_CONTENT_SCHEMA (Zod)
- Realtime channel: `resume:{resumeId}`
- Document generation library: `docx`
- Queue system: Deno KV

**Handoff to Story 6:**
- Resume saved with ID
- Navigation to `(onboarding)/discover` OR `(app)/(tabs)/home`
- Deep link option: show "Download" CTA

---

#### Story 6: Feature Discovery (App Lock-in)
**Screen:** `(onboarding)/discover.tsx`  
**Duration:** 30 seconds  
**Priority:** P0  
**Credits Required:** 0

**User Need:**
```
As a new user,
I want to discover what Interview Ready can do,
So I know what features to explore next.
```

**Acceptance Criteria:**
- [ ] Three feature cards displayed (swipeable on mobile):
  - Application Tracker (Kanban icon)
  - Mock Interviews (Chat icon)
  - LinkedIn Optimizer (LinkedIn icon)
- [ ] Each card shows: icon, headline, description, "Explore" CTA
- [ ] Card preview images included
- [ ] Cards are swipeable/scrollable
- [ ] "Go to Dashboard" button (primary, violet)
- [ ] "Save & Explore Later" button (secondary)
- [ ] No forced tutorial or confetti (let user choose next action)
- [ ] No confetti/celebration (reserve for real milestones)

**Implementation Details:**
- Simple carousel component (React Native FlatList or Swiper)
- Static card data (hardcoded)
- Navigation actions on CTA buttons
- No backend calls

**Dependencies:**
- Carousel/swiper component
- Navigation routing

**Handoff to Phase 2:**
- Navigation to `(app)/(tabs)/home` OR feature screens
- Update `user_profiles.onboarding_step = 6` (completed)
- Set `onboarding_completed = true`

---

### PHASE 2: HOME LOOP (Post-Onboarding, Stories 7-15)

#### Story 7: Dashboard Hub (Daily Active Engagement)
**Screen:** `(app)/(tabs)/home.tsx`  
**Duration:** Ongoing  
**Priority:** P0 (Retention engine)  
**Credits Required:** 0

**User Need:**
```
As a user,
I want a dashboard showing my progress and quick actions,
So I can pick up where I left off and feel momentum.
```

**Acceptance Criteria:**
- [ ] Profile avatar + name + plan badge visible (top)
- [ ] Credit balance with visual indicator (progress bar)
- [ ] Three stat cards (swipeable):
  - Weekly progress (applied/interviews/offers)
  - Profile completeness ring
  - Interview streak counter
- [ ] Recent resumable actions feed (max 5 items)
- [ ] Feature carousel (rotation every 5 seconds):
  - Paste job → AI resume
  - Start mock interview
  - Optimize LinkedIn
  - Network follow-up
- [ ] 3-column grid for quick actions:
  - New Resume
  - Interview Practice
  - View Tracker
- [ ] Floating Action Button (FAB) for "Analyze Job"
- [ ] Push notification badges (if new feedback/reminders)
- [ ] Pull-to-refresh functionality

**Implementation Details:**
- Query endpoints:
  - `/auth/me` (user profile + plan)
  - `/profile/completeness` (progress ring)
  - `/applications/stats` (funnel data)
  - `/interviews/recent` (last 3 interviews)
  - `/resumes/recent` (last 3 resumes)
- TanStack Query setup:
  - Refetch every 30 seconds (user-initiated)
  - Stale time: 5 minutes
  - Background refetch on app focus
- Zustand stores:
  - `userStore` (profile, plan, credits)
  - `dashboardStore` (recent actions, stats)
- Realtime subscriptions:
  - Channel: `user:{userId}` for credit updates
  - Channel: `interview:{userId}` for feedback

**Dependencies:**
- Multiple Edge Function endpoints
- TanStack Query configuration
- Realtime channel setup
- FAB component (Lucide + Pressable)
- Carousel component
- Stat cards with icons/progress rings

**Handoff to Other Stories:**
- Dashboard is hub; all features branch from here
- Navigation maintained via bottom tab bar

---

#### Story 8: Job Analyzer (Paste & Analyze)
**Screen:** `(app)/job-analyzer/analyze.tsx`  
**Duration:** 5 minutes per job  
**Priority:** P1  
**Credits Required:** 1

**User Need:**
```
As a user,
I want to analyze a new job description,
So I understand my fit and generate tailored documents.
```

**Acceptance Criteria:**
- [ ] Text paste area with placeholder text
- [ ] URL input with validation + scraper support
- [ ] "Example JD" link (pre-fills sample)
- [ ] Loading state with animated steps (3-5 seconds)
- [ ] Results: Three score rings + recommendation badge
- [ ] Skills breakdown (matched in green, missing in red)
- [ ] Job summary card (company, salary, location, posted date)
- [ ] Action buttons:
  - "Generate Resume" (primary, opens template picker)
  - "Generate Cover Letter" (secondary)
  - "Save to Tracker" (tertiary)
  - "Share Job" (tertiary)
- [ ] Extended actions (post-onboarding):
  - "Add similar jobs" (ML recommendation)
  - "View company intel" (Crunchbase preview)
- [ ] Results are cached/saveable

**Implementation Details:**
- Screen navigation from:
  - FAB on home (Story 7)
  - Feature carousel on home
  - Deep link: `interviewready://analyze`
- Reuse Story 4 logic (JD analyzer)
- Add template picker modal (Story 9)
- Add tone selector modal (Story 12)

**Dependencies:**
- Navigation routing to this screen
- Edge Function endpoints from Story 4-5
- Template picker component
- Tone selector component

**Handoff to Stories 9 & 12:**
- Pre-fill job context for resume/cover letter generation

---

#### Story 9: Resume Builder & Editor (Tailoring Engine)
**Screen:** `(app)/resume/builder.tsx`  
**Duration:** 10-20 minutes  
**Priority:** P1  
**Credits Required:** 0 (view), 1 per section (AI rewrite)

**User Need:**
```
As a user,
I want to edit my generated resume and try different templates,
So it's perfect before submitting.
```

**Acceptance Criteria:**
- [ ] Header: resume name (editable), template badge, ATS score ring, share/download buttons
- [ ] Template picker modal (6 templates with previews):
  - Executive
  - Modern Pro (2-column)
  - Minimal
  - Tech Stack
  - Chronological
  - Creative (premium 🔒)
- [ ] Section list (collapsible, drag-to-reorder):
  - Professional Summary (textarea, AI rewrite button)
  - Experience (per-job: title/company/dates, bullets with AI rewrite)
  - Education
  - Skills (tags, drag-to-reorder, highlight JD matches)
  - Projects (if available)
- [ ] Preview panel (side-by-side on desktop, tab on mobile)
- [ ] Inline editing with optimistic updates
- [ ] Markdown support for bullets (basic)
- [ ] "Download .docx" button (primary, violet)
- [ ] "Download PDF" button (if premium)
- [ ] "Share Link" button (public resume)
- [ ] "Duplicate Resume" button (for another job)
- [ ] ATS Insights sidebar:
  - Score breakdown (0-100)
  - Keywords matched: X/Y
  - Weak areas with tips
  - "Use AI to improve" CTAs with credit cost

**Implementation Details:**
- Backend endpoints:
  - `/resumes/get` (fetch resume content)
  - `/resumes/update` (save section edits)
  - `/resumes/score` (ATS scoring, 1 credit)
  - `/resumes/section-rewrite` (AI rewrite, 1 credit)
  - `/resumes/export` (generate .docx/.pdf)
- Frontend:
  - Zustand `resumeStore` for state
  - TanStack Query for data fetching
  - Optimistic updates on local edits
  - Realtime sync (deferred, not live)
  - Reanimated for preview animations
  - PDF preview: react-pdf or WebView
- Document generation:
  - `docx` library via esm.sh
  - Template selection logic
  - Dynamic styling per template

**Dependencies:**
- Multiple Edge Function endpoints
- Document generation library
- PDF viewer component
- Template styling components

**Handoff to Document Export:**
- Download triggers `/resumes/export`
- Export tracked in usage_events

---

#### Story 10: Application Tracker (Kanban Pipeline)
**Screen:** `(app)/(tabs)/tracker.tsx`  
**Duration:** 5 minutes daily  
**Priority:** P1  
**Credits Required:** 0

**User Need:**
```
As a user,
I want to track my applications in a Kanban board,
So I can see my pipeline progress at a glance.
```

**Acceptance Criteria:**
- [ ] Kanban board with 6 columns:
  - Saved (gray)
  - Applied (blue)
  - Screening (teal)
  - Interviews (purple)
  - Offers (green)
  - Rejected (red)
- [ ] Drag-and-drop cards between columns
- [ ] Card design: logo, company, title, score ring, date, preview
- [ ] Filter buttons:
  - All / This week / This month / All time
  - By company (searchable)
- [ ] Sort: By date added, last updated
- [ ] Stats button (opens summary modal):
  - Funnel chart (conversion rates per stage)
  - Average time-in-stage
  - Projected offer date
  - "Improve your funnel" tips
- [ ] Card detail view (sheet overlay):
  - Full job info
  - Linked resume + cover letter
  - Timeline (applied → feedback → interview → etc.)
  - Notes (editable)
  - Actions: edit, move, delete, call, email
- [ ] Add new application (FAB or button):
  - Modal with fields: title, company, URL, applied date, status
  - "Create from analysis" button (pre-fills from recent JD analysis)
- [ ] Empty state with CTA to analyze first job

**Implementation Details:**
- Backend endpoints:
  - `/applications/list` (with filters, pagination)
  - `/applications/create`
  - `/applications/update` (status, notes, dates)
  - `/applications/delete`
  - `/applications/stats`
  - `/applications/timeline`
- Frontend:
  - Zustand `trackerStore` for state
  - TanStack Query for data + mutations
  - Drag-and-drop library: `react-native-draggable-list` (mobile-friendly)
  - Sheet component for detail view (Gorhom Bottom Sheet)
  - Stats modal with simple charts (recharts)
- Data structure in database:
  - `job_applications` table
  - Fields: company, title, url, status, resume_id, cover_letter_id, notes, timeline_events

**Dependencies:**
- Multiple Edge Function endpoints
- Drag-and-drop library
- Bottom sheet library
- Chart library (recharts)

**Handoff to Tracker:**
- From Story 4 "Save to Tracker" button
- From Story 8 "Save to Tracker" button
- Regular daily check-in loop

---

#### Story 11: Mock Interview Coach (Engagement Lock-in)
**Screen:** `(app)/(tabs)/interviews.tsx` + `interview/chat.tsx`  
**Duration:** 15-30 minutes per session  
**Priority:** P1  
**Credits Required:** 5 per session

**User Need:**
```
As a candidate,
I want to practice interviews with AI,
So I can identify weak areas and build confidence.
```

**Acceptance Criteria:**

**Interview Lobby Screen:**
- [ ] "Start New Interview" section:
  - Role input (text field with suggestions)
  - Interview type selector:
    - Behavioral (STAR method)
    - Technical (coding, system design)
    - Manager (leadership, strategy)
  - Difficulty selector: Beginner / Intermediate / Senior
  - Start button (deduct 5 credits, confirm if low)
- [ ] Past interviews feed:
  - Score ring (0-100)
  - Type badge
  - Company/role info
  - "View Feedback" link
  - "Retry" button
- [ ] Interview stats:
  - Total interviews: X
  - Average score: X%
  - Best interview: X%
  - Improvement trend (micro chart)
- [ ] Empty state with CTA to start first interview

**During Interview (Chat Screen):**
- [ ] Header:
  - Time elapsed (MM:SS counter)
  - "End Interview" button (confirm modal)
- [ ] Chat area:
  - AI message bubbles (left, card style)
  - User message bubbles (right, card style)
  - Typing indicator while AI processes
  - Typing speed animation
- [ ] User input section:
  - Large textarea (max 1000 chars)
  - Send button (disabled until text >10 chars)
  - Voice button (record & transcribe via Whisper API)
  - Char counter (warning at 900)
- [ ] Progress indicator:
  - Question 3/5 (or X/typical_max)
  - Progress bar showing position in interview
- [ ] Scoring sidebar (collapsible on mobile, right panel on desktop):
  - Live feedback:
    - Communication: 72/100 (with tip)
    - Structure: 68/100 (with tip)
    - Confidence: 79/100 (with tip)
  - Tips update after each response

**Interview Complete Screen:**
- [ ] Celebration animation 🎉
- [ ] Overall score ring (large, 0-100)
- [ ] Score breakdown (4-5 rings):
  - Communication
  - Technical Accuracy (if technical)
  - STAR Structure (if behavioral)
  - Confidence
  - Overall
- [ ] Hiring decision badge:
  - 🟢 "Strong Hire" (>80%)
  - 🟡 "Maybe" (65-80%)
  - 🔴 "Pass" (<65%)
- [ ] Feedback section (collapsible):
  - Strengths (3 bullet points)
  - Areas to improve (3 bullet points)
  - Question-by-question breakdown (expandable)
  - Hiring feedback (narrative)
- [ ] Action buttons:
  - "Try Again" (same role, new questions)
  - "Different Role" (back to lobby)
  - "Share Score" (social share)
  - "Download Report" (PDF)

**Implementation Details:**
- Backend endpoints:
  - `/interviews/start` (create session, deduct 5 credits)
  - `/interviews/message` (append message, call AI, stream response)
  - `/interviews/end` (finalize session, trigger scoring)
  - `/interviews/feedback` (generate detailed feedback)
  - `/interviews/list` (past interviews)
  - `/interviews/get` (fetch interview details)
- AI agents:
  - `BEHAVIORAL_INTERVIEW_AGENT` (STAR method, follow-ups)
  - `TECHNICAL_INTERVIEW_AGENT` (code problems, system design)
  - `MANAGER_INTERVIEW_AGENT` (leadership, strategy)
  - `INTERVIEW_SCORING_AGENT` (feedback on all responses)
- Frontend:
  - Zustand `interviewStore` for state
  - Supabase Realtime channel: `interview:{interviewId}`
  - Stream responses (real-time, word-by-word)
  - Chat UI component (similar to ChatGPT)
  - Score animations (Reanimated rings)
  - Voice recording: `expo-av` + `expo-speech` + Whisper API
- Database schema:
  - `interviews` table (id, user_id, role, type, difficulty, score, feedback, created_at)
  - `interview_messages` table (id, interview_id, role, content, created_at)
  - `interview_feedback` table (interview_id, communication_score, structure_score, etc.)

**Dependencies:**
- Multiple Edge Function endpoints
- AI agents (Groq prompts + Zod schemas)
- Realtime channel subscription
- Voice recording/transcription (Whisper API)
- Chat UI components
- Score ring animations
- PDF generation for report

**Handoff to Other Stories:**
- From Story 7 "Interview Practice" CTA
- Feature carousel on home

---

#### Story 12: Cover Letter Generator (Quick Win)
**Screen:** `(app)/cover-letter/generate.tsx`  
**Duration:** 5 minutes  
**Priority:** P1  
**Credits Required:** 2

**User Need:**
```
As a user,
I want to generate a cover letter for a job,
So I don't have to write from scratch.
```

**Acceptance Criteria:**
- [ ] Setup modal (on first generation):
  - Job title (text input, optional)
  - Company name (text input, optional)
  - Tone selector (5 buttons with descriptions):
    - Professional (formal, achievement-focused)
    - Enthusiastic (energy, culture fit)
    - Concise (short, 1-page)
    - Storytelling (personal narrative)
    - Formal (traditional, respectful)
  - Generate button (deduct 2 credits)
- [ ] Generated letter display (card):
  - Full letter text (formatted)
  - Font size controls (A / A+ / A++)
  - Copy button (copies to clipboard, toast: "Copied!")
  - Edit button (opens textarea editor)
- [ ] Version management:
  - "Generated 3 versions" dropdown
  - Switch between versions
  - "Regenerate with tone" button (1 credit, same tone)
  - "Try different tone" button (1 credit, different tone)
  - Delete version button (per version)
- [ ] Export:
  - "Download .docx" button (primary)
  - "Copy to Clipboard" button
  - "Email to Self" button (Mailgun integration)
  - "Share Link" button (public cover letter)
- [ ] Edit mode:
  - Textarea with full letter
  - Character counter
  - "AI rewrite paragraph" button (per paragraph, 1 credit)
  - "AI fix grammar" button (0 credits, auto-correct)
  - Save / Cancel buttons

**Implementation Details:**
- Backend endpoints:
  - `/cover-letters/create` (generate, 2 credits)
  - `/cover-letters/get` (fetch versions)
  - `/cover-letters/regenerate` (new version, 1 credit)
  - `/cover-letters/export` (generate .docx)
- AI agent:
  - `COVER_LETTER_AGENT` (with tone system prompts)
  - 5 tone-specific system prompts
  - Template-aware formatting
- Frontend:
  - Zustand `coverLetterStore` for state
  - TanStack Query for data
  - Tone selector buttons (with icons/descriptions)
  - Version dropdown management
  - Edit modal with textarea

**Dependencies:**
- Edge Function endpoints
- Cover letter AI agent + Zod schema
- Document generation (.docx)
- Email service (Mailgun)

**Handoff to Other Stories:**
- From Story 4 "Generate Cover Letter" CTA
- From Story 8 "Generate Cover Letter" CTA
- From Story 9 in resume editor (companion action)

---

#### Story 13: LinkedIn Optimizer (Growth Feature)
**Screen:** `(app)/(tabs)/linkedin.tsx`  
**Duration:** 10 minutes  
**Priority:** P2  
**Credits Required:** 2 (analyze), 1 per section (optimize)

**User Need:**
```
As a user,
I want to optimize my LinkedIn profile,
So recruiters find me and my applications get more traction.
```

**Acceptance Criteria:**
- [ ] Analyzer screen:
  - 4 section score rings:
    - Headline: 0-100
    - About: 0-100
    - Experience: 0-100
    - Skills: 0-100
  - Overall score ring (larger, at top)
  - Analyze button (if not analyzed yet, 2 credits)
- [ ] Detailed feedback (collapsible per section):
  - Current content snippet
  - Problem explanation
  - AI suggestion (modal on "View suggestion")
  - "Use suggestion" button (1 credit per section)
- [ ] Generate optimized sections (modal per section):
  - Input: current section content
  - AI generates 3 variants (headline) or 1 variant (about)
  - "Copy to LinkedIn" button
  - "Use this version" button
- [ ] Bonus: Post generator
  - "Generate LinkedIn Post" button
  - Topic selector (job search / industry insights / etc.)
  - AI generates post (200-300 chars)
  - "Copy to LinkedIn" button (0 credits, free)
  - "Generate another" button
- [ ] Empty state (no analysis yet):
  - Icon: LinkedIn logo
  - Headline: "Optimize Your LinkedIn"
  - Sub: "Let AI help recruiters discover you"
  - CTA: "Analyze Now" (2 credits)

**Implementation Details:**
- Backend endpoints:
  - `/linkedin/analyze` (score sections, 2 credits)
  - `/linkedin/headline` (generate headline variants)
  - `/linkedin/about` (generate about section)
  - `/linkedin/experience` (enhance bullets)
  - `/linkedin/post` (generate post, 0 credits)
- AI agents:
  - `LINKEDIN_HEADLINE_AGENT` (keyword optimization, personal brand)
  - `LINKEDIN_ABOUT_AGENT` (compelling narrative, keywords)
  - `LINKEDIN_EXPERIENCE_AGENT` (quantifiable achievements)
  - `LINKEDIN_POST_AGENT` (engagement-focused, topic-aware)
- Frontend:
  - Zustand `linkedinStore` for state
  - Section score rings (Reanimated)
  - Modal overlays for suggestions

**Dependencies:**
- Edge Function endpoints
- LinkedIn AI agents + Zod schemas
- LinkedIn OAuth (if importing profile data)
- Scoring algorithm (keyword density, structure analysis)

**Handoff to Other Stories:**
- From Story 7 feature carousel
- Independent feature, can be used anytime

---

#### Story 14: Networking Tracker (Relationship Engine)
**Screen:** `(app)/(tabs)/networking.tsx`  
**Duration:** 5 minutes daily  
**Priority:** P2  
**Credits Required:** 0 (tracking), 0 (message suggestions)

**User Need:**
```
As a user,
I want to track and manage my professional network,
So I maintain relationships and get job referrals.
```

**Acceptance Criteria:**
- [ ] Contact list screen:
  - Search input (by name)
  - Filter buttons:
    - All / Referrer / Current Company / Former / Recruiter / Mentor
  - Sort: Last contacted, name (A-Z)
  - Contact cards (feed):
    - Avatar, name, title, company
    - Relationship badge
    - "Last contacted: X days ago"
    - "Next follow-up: Tomorrow"
    - Message preview (last interaction)
    - Tap to expand → detail view
  - Follow-up reminders section (urgent, at top)
    - Highlighted cards: "FOLLOW UP TODAY"
    - Quick message button
- [ ] Contact detail view (sheet overlay):
  - Header: avatar, name, title, company
  - LinkedIn link (tap opens LinkedIn)
  - Phone (tap calls)
  - Email (tap composes)
  - Relationship section:
    - Type dropdown (Referrer, Current Company, etc.)
    - How met (textarea)
    - Date met (date picker)
    - Strength (1-5 star picker)
  - Interaction history (timeline):
    - Messages sent/received
    - Meetings scheduled
    - Notes added
  - Next follow-up:
    - Current date display
    - "Edit" button (date picker modal)
    - "Remind me" button (push notification)
  - Actions:
    - "Send message" → AI message suggestions modal
    - "Schedule call" → Calendar integration
    - "Delete contact" → Confirm
- [ ] AI message suggestions (modal):
  - 3 pre-written message variants
  - User picks one
  - Optional edit (textarea)
  - Send via email/SMS (if available)
- [ ] Add new contact (FAB or button):
  - Modal with fields:
    - Name (required)
    - Title (optional)
    - Company (optional)
    - Phone (optional)
    - Email (optional)
    - LinkedIn URL (optional)
    - Relationship type (dropdown)
    - Notes (textarea)
    - "Import from LinkedIn" button (if OAuth granted)
- [ ] Gamification badges:
  - "Network of 10" 🎯
  - "Weekly Check-ins" 📞
  - "30-day Streak" 🔥

**Implementation Details:**
- Backend endpoints:
  - `/networking/contacts/list` (with filters)
  - `/networking/contacts/create`
  - `/networking/contacts/update`
  - `/networking/contacts/delete`
  - `/networking/followup/log` (update last_contacted_at)
  - `/networking/followup/suggest` (AI message suggestions, 0 credits)
- Database schema:
  - `network_contacts` table
  - `contact_interactions` table (messages, meetings)
  - Fields: name, title, company, phone, email, linkedin_url, relationship_type, strength, notes, last_contacted_at, next_followup_at
- Frontend:
  - Zustand `networkingStore` for state
  - TanStack Query for contacts + mutations
  - Bottom sheet for detail view (Gorhom)
  - Timeline component for interactions
  - AI message suggestions modal
- AI agent:
  - `NETWORKING_MESSAGE_AGENT` (context-aware messages)

**Dependencies:**
- Multiple Edge Function endpoints
- AI agent for message suggestions
- Calendar integration (expo-calendar)
- Bottom sheet library
- LinkedIn OAuth (optional, for import)

**Handoff to Other Stories:**
- From Story 7 feature carousel
- Can be used alongside other features

---

#### Story 15: Settings & Account Management
**Screen:** `(app)/(tabs)/settings.tsx`  
**Duration:** 5 minutes  
**Priority:** P1  
**Credits Required:** 0

**User Need:**
```
As a user,
I want to manage my account, plan, and preferences,
So I have full control over my experience.
```

**Acceptance Criteria:**
- [ ] Account section:
  - Avatar + photo uploader
  - Name (editable, save button)
  - Email (editable, verify new email)
  - Phone (editable, optional)
  - "Change password" button (email verification flow)
- [ ] Plan section:
  - Current plan badge (Free / Premium / Premium Plus)
  - Credit balance (large display):
    - "7 / 10 credits remaining"
    - Progress bar (green/yellow/red based on level)
  - "View usage" link → Modal with breakdown
  - "Upgrade Plan" button (navigates to pricing modal)
  - "Manage Subscription" button (opens Stripe portal)
  - Billing history (collapsible):
    - List of invoices with download links
    - Dates and amounts
- [ ] Preferences section:
  - Language selector:
    - English (default)
    - French
    - Swahili
    - Amharic
  - Theme toggle (Light / Dark / Auto)
  - Notification toggles:
    - Interview feedback ready
    - Follow-up reminders
    - Weekly summary
    - Job recommendations
  - Email frequency:
    - Weekly digest / Daily / Never
- [ ] Support section:
  - FAQ link (opens WebView)
  - "Contact support" button (email form)
  - Terms of service link (external)
  - Privacy policy link (external)
  - App version (small text)
- [ ] Danger zone (bottom):
  - "Log out" button (red, confirm modal)
  - "Delete account" button (red, confirm + email verification)

**Implementation Details:**
- Backend endpoints:
  - `/auth/update-profile` (name, email, phone)
  - `/auth/change-password` (email verification)
  - `/billing/usage` (credit breakdown)
  - `/billing/portal` (Stripe customer portal URL)
  - `/auth/delete-account` (GDPR-compliant deletion)
- Frontend:
  - Zustand `userStore` for account data
  - TanStack Query for fetching
  - Settings form components
  - Language selector with i18n setup
  - Theme provider (NativeWind)
  - Modal for confirm actions

**Dependencies:**
- Edge Function endpoints
- i18n library (react-i18next)
- Theme provider (NativeWind)
- Stripe customer portal integration
- Email verification flow

**Handoff to Other Stories:**
- From bottom tab bar navigation
- Accessible from any screen via settings icon

---

### PHASE 3: ENGAGEMENT LOOPS & UTILITIES (Stories 16-18)

#### Story 16: Elevator Pitch Generator (Utility)
**Screen:** `(app)/elevator-pitch.tsx`  
**Duration:** 3 minutes  
**Priority:** P2  
**Credits Required:** 0 (free utility)

**User Need:**
```
As a user,
I want a polished elevator pitch for networking,
So I make a great first impression.
```

**Acceptance Criteria:**
- [ ] Context selector (3 buttons):
  - Interview (role-specific, achievements focus)
  - Networking (personality, brief, memorable)
  - Email reply (professional, concise)
- [ ] AI generates:
  - 30-second pitch (50-75 words)
  - 60-second pitch (100-150 words)
- [ ] Copy buttons (per pitch)
  - Toast: "Copied to clipboard!"
- [ ] "Regenerate" button (0 credits, free)
- [ ] Edit mode (tap pitch to edit):
  - Textarea
  - Save / Cancel buttons

**Implementation Details:**
- Backend endpoint:
  - `/utilities/elevator-pitch` (generate, 0 credits)
- AI agent:
  - `ELEVATOR_PITCH_AGENT` (context-aware, concise)
- Frontend:
  - Simple modal or sheet screen
  - Context buttons
  - Copy functionality (react-native Clipboard)

**Dependencies:**
- Edge Function endpoint
- AI agent + Zod schema

---

#### Story 17: JD Summarizer (Quick Reference)
**Screen:** Modal overlay  
**Duration:** 1 minute  
**Priority:** P2  
**Credits Required:** 0 (free utility, bundled with analysis)

**User Need:**
```
As a user,
I want a condensed summary of the job description,
So I don't have to re-read the full JD.
```

**Acceptance Criteria:**
- [ ] Modal with structured summary:
  - Key responsibilities (3-5 bullets)
  - Must-haves (required skills/experience)
  - Nice-to-haves (preferred qualifications)
  - Red flags (notice period, travel, etc.)
  - Culture signals (company vibe indicators)
- [ ] Copy button (copies all to clipboard)
- [ ] Dismiss button

**Implementation Details:**
- Extracted from JD_ANALYZER_AGENT response (already computed)
- Display formatted summary in modal
- No additional backend call (reuse analysis data)

**Dependencies:**
- Modal component
- Data from existing JD analysis

---

#### Story 18: Application Form Autofill (Friction Reduction)
**Screen:** `(app)/autofill.tsx`  
**Duration:** 2 minutes  
**Priority:** P3  
**Credits Required:** 0 (free utility)

**User Need:**
```
As a user,
I want AI to map my profile to job application forms,
So I can fill them out faster.
```

**Acceptance Criteria:**
- [ ] Input area (large textarea):
  - Paste job board form (HTML, copy-paste)
  - Submit button
- [ ] AI parsing:
  - Extracts form fields
  - Maps to user profile data:
    - Name → Full name
    - Email → Email
    - Phone → Phone
    - Experience → Years experience
    - Skills → Skills list
    - Education → Education
    - etc.
- [ ] Results display:
  - Generated JSON object
  - Copy button (copies to clipboard)
  - Field-by-field review (editable modal)
- [ ] User flow:
  - Copy fields from JSON
  - Paste into job board form

**Implementation Details:**
- Backend endpoint:
  - `/utilities/autofill` (parse + map, 0 credits)
- AI agent:
  - `FORM_PARSER_AGENT` (HTML parsing, field extraction)
- Frontend:
  - Textarea for form input
  - JSON display with copy button
  - Modal for field-by-field review

**Dependencies:**
- Edge Function endpoint
- AI agent + Zod schema
- HTML parser (Cheerio in backend)

---

## Implementation Roadmap

### Phase 1: Foundation (Sprint 0, Days 1-3)
**Goal:** Backend ready, database schema live, auth working

**Day 1: Infrastructure**
- [ ] Supabase project setup (free tier)
- [ ] OAuth providers configured (Google, LinkedIn)
- [ ] Database schema migration (001_initial_schema.sql)
- [ ] RLS policies enabled on all tables
- [ ] Auth trigger: sync auth.users → public.users
- [ ] Environment variables configured

**Day 2: Core Edge Functions**
- [ ] Shared utilities (`_shared/`)
- [ ] Auth endpoints (`auth/sync`, `auth/me`, `auth/delete-account`)
- [ ] Profile endpoints (`profile/get`, `profile/update`, `profile/completeness`)
- [ ] All tested with curl/Postman

**Day 3: AI Pipeline**
- [ ] Groq client integration
- [ ] JD Analyzer agent (Story 4 backend)
- [ ] Job scraper (Cheerio)
- [ ] Resume Tailor agent (Story 5 backend)
- [ ] ATS Scorer agent (Story 9 backend)
- [ ] Full pipeline tested: JD → analysis → resume

**Deliverable:** All backend endpoints functional, testable via curl

---

### Phase 2: Mobile App Foundation (Sprint 1, Days 4-7)

**Day 4: Onboarding Loop (Stories 1-6)**
- [ ] Story 1: Welcome + OAuth screen
- [ ] Story 2: Role & Goal screen
- [ ] Story 3: Quick Profile screen (with progress ring)
- [ ] Story 4: JD Analyzer screen
- [ ] Story 5: Resume Generation screen (with Realtime streaming)
- [ ] Story 6: Feature Discovery screen
- [ ] Zustand stores: authStore, profileStore, onboardingStore
- [ ] TanStack Query setup + config
- [ ] Navigation routing + auth guards

**Day 5: Core Screens (Stories 7-9)**
- [ ] Story 7: Dashboard/Home screen
- [ ] Story 8: Job Analyzer screen (post-onboarding)
- [ ] Story 9: Resume Builder/Editor screen
- [ ] Bottom tab navigation
- [ ] Zustand stores: dashboardStore, resumeStore

**Day 6: Tracker & Interviews (Stories 10-11)**
- [ ] Story 10: Application Tracker (Kanban board)
- [ ] Story 11: Mock Interview (Lobby + Chat + Feedback)
- [ ] Realtime channel subscriptions
- [ ] Voice recording integration (if time permits)

**Day 7: Utilities & Polish (Stories 12-15)**
- [ ] Story 12: Cover Letter Generator
- [ ] Story 13: LinkedIn Optimizer (basic version)
- [ ] Story 14: Networking Tracker
- [ ] Story 15: Settings & Account
- [ ] Stories 16-18: Elevator Pitch, JD Summarizer, Autofill
- [ ] Loading states + empty states
- [ ] Error boundaries

**Deliverable:** Full mobile app with all core features, end-to-end working

---

### Phase 3: Polish & Testing (Sprint 2, Days 8-10)

**Day 8: Backend Polish**
- [ ] Complete all missing Edge Functions
- [ ] Error handling standardized
- [ ] Logging + monitoring (Sentry)
- [ ] Rate limiting + credit checks
- [ ] Database query optimization

**Day 9: Mobile Polish**
- [ ] Animations (Reanimated)
  - Score ring reveals
  - Screen transitions
  - Button feedback
- [ ] Skeleton loaders
- [ ] Offline mode + caching strategy
- [ ] Push notifications (if time permits)
- [ ] Deep linking complete

**Day 10: Testing & Bug Fixes**
- [ ] Full onboarding funnel test (all 5 steps)
- [ ] All user stories end-to-end
- [ ] Credit system testing
- [ ] AI output quality review (10 random outputs)
- [ ] Performance testing (cold start, navigation speed)
- [ ] Accessibility testing (screen reader labels, contrast)

**Deliverable:** App store-ready, all major bugs fixed

---

### Phase 4: Launch (Days 11-14)

**Day 11: App Store Submission**
- [ ] Create App Store Connect account (Apple Developer)
- [ ] Create Google Play Console account
- [ ] Prepare store assets (icons, screenshots, descriptions)
- [ ] EAS Build configuration
- [ ] Build for iOS + Android

**Day 12: Submission**
- [ ] Submit to App Store
- [ ] Submit to Google Play
- [ ] Configure Stripe (test mode → live mode post-approval)

**Day 13: Post-Launch Monitoring**
- [ ] PostHog dashboard configured (analytics)
- [ ] Sentry alerts active (error tracking)
- [ ] Monitor onboarding funnel in real-time
- [ ] Respond to user feedback

**Day 14: Post-Launch Optimization**
- [ ] A/B test social auth priority (Google vs LinkedIn)
- [ ] A/B test profile skip (allowed vs forced)
- [ ] Identify drop-off points in onboarding
- [ ] Plan hotfixes for Week 2

**Deliverable:** Live on App Store + Play Store, monitoring active

---

## Navigation Architecture

```
app/
├── _layout.tsx                      // Root layout (auth guard)
│
├── (auth)/
│   ├── welcome.tsx                  // Story 1: OAuth + email signup
│   ├── login.tsx
│   ├── signup.tsx
│   └── _layout.tsx                  // Auth stack (no tab nav)
│
├── (onboarding)/
│   ├── role-goal.tsx                // Story 2
│   ├── quick-profile.tsx            // Story 3
│   ├── jd-analyzer.tsx              // Story 4
│   ├── resume-generation.tsx        // Story 5
│   ├── discover.tsx                 // Story 6
│   └── _layout.tsx                  // Onboarding stack (full screen)
│
├── (app)/
│   ├── (tabs)/
│   │   ├── home.tsx                 // Story 7: Dashboard
│   │   ├── tracker.tsx              // Story 10: Kanban
│   │   ├── interviews.tsx           // Story 11: Interview lobby
│   │   ├── linkedin.tsx             // Story 13: LinkedIn optimizer
│   │   ├── networking.tsx           // Story 14: Networking
│   │   ├── settings.tsx             // Story 15: Account
│   │   └── _layout.tsx              // Bottom tab navigator
│   │
│   ├── job-analyzer/
│   │   └── analyze.tsx              // Story 8: Paste JD
│   │
│   ├── resume/
│   │   ├── builder.tsx              // Story 9: Edit resume
│   │   └── _layout.tsx              // Resume stack
│   │
│   ├── cover-letter/
│   │   ├── generate.tsx             // Story 12: Create cover letter
│   │   └── _layout.tsx
│   │
│   ├── interview/
│   │   ├── chat.tsx                 // Story 11: During interview
│   │   └── _layout.tsx
│   │
│   ├── elevator-pitch.tsx           // Story 16
│   ├── autofill.tsx                 // Story 18
│   └── _layout.tsx                  // App stack (with tab nav)
│
└── (modal)/
    ├── job-summary.tsx              // Story 17: JD summarizer
    └── _layout.tsx                  // Modal stack (overlay)
```

**Navigation Logic:**
- `(auth)` stack: Pre-login screens
- `(onboarding)` stack: 5-step flow after first signup
- `(app)/(tabs)` stack: Main app with bottom tab bar (6 tabs)
- `(app)/...` screens: Full-screen features
- `(modal)` stack: Overlay modals (JD summarizer, confirmations)

**Auth Guard:**
- Root `_layout.tsx` checks Supabase auth state
- Redirects to `(auth)` if not authenticated
- Redirects to `(onboarding)` if onboarding not completed
- Redirects to `(app)` if fully onboarded

---

## State Management Strategy

### Zustand Stores (Persistent)

```typescript
// auth-store.ts
interface AuthStore {
  user: User | null
  session: Session | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithOAuth: (provider: 'google' | 'linkedin') => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
}

// profile-store.ts
interface ProfileStore {
  profile: UserProfile | null
  completeness: number
  isLoading: boolean
  getProfile: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  setProfile: (profile: UserProfile) => void
}

// onboarding-store.ts
interface OnboardingStore {
  step: 0 | 1 | 2 | 3 | 4 | 5 | 6  // 0 = not started, 6 = complete
  targetRole: string
  yearsExp: string
  workType: string[]
  setStep: (step: number) => void
  setRole: (role: string, yearsExp: string, workType: string[]) => void
  clearOnboarding: () => void
}

// dashboard-store.ts
interface DashboardStore {
  stats: DashboardStats | null
  recentActions: RecentAction[]
  isLoading: boolean
  getStats: () => Promise<void>
  getRecentActions: () => Promise<void>
}

// resume-store.ts
interface ResumeStore {
  resumes: Resume[]
  currentResume: Resume | null
  isLoading: boolean
  getResumes: () => Promise<void>
  getResume: (id: string) => Promise<void>
  updateSection: (section: string, content: string) => Promise<void>
  createResume: (jobAnalysisId: string) => Promise<void>
}

// interview-store.ts
interface InterviewStore {
  interviews: Interview[]
  currentInterview: Interview | null
  messages: InterviewMessage[]
  isLoading: boolean
  getInterviews: () => Promise<void>
  startInterview: (role: string, type: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  endInterview: () => Promise<void>
}

// ... similar for tracker, cover-letter, linkedin, networking stores
```

### TanStack Query (Server State)

```typescript
// useGetProfile.ts
export const useGetProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => fetch('/profile/get').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (old: cacheTime)
  })
}

// useAnalyzeJob.ts
export const useAnalyzeJob = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jobDescription: string) =>
      fetch('/jobs/analyze', { method: 'POST', body: JSON.stringify({ jobDescription }) })
        .then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job-analyses'] })
    },
  })
}

// ... similar for all data-fetching operations
```

### Zustand Persistence

```typescript
// Persist auth + profile stores to AsyncStorage
const useAuthStore = create(
  persist(
    (set) => ({ ... }),
    { name: 'auth-store', storage: AsyncStorage }
  )
)

const useProfileStore = create(
  persist(
    (set) => ({ ... }),
    { name: 'profile-store', storage: AsyncStorage }
  )
)
```

### Data Flow

```
User Action (e.g., tap "Analyze Job")
  ↓
Mutation (TanStack Query mutation)
  ↓
Edge Function (backend)
  ↓
Return data → TanStack Query cache
  ↓
Zustand store update (if needed)
  ↓
Component re-render (automatic)
```

---

## Engagement Mechanics

### Habit Formation Loops

**Daily Loop (5 minutes):**
1. Check dashboard (Story 7)
2. Review one follow-up contact (Story 14)
3. Update one application status (Story 10)
4. See progress → dopamine hit

**Weekly Loop (30 minutes):**
1. Analyze one new job (Story 8)
2. Generate or tailor resume (Story 9)
3. Practice mock interview (Story 11)
4. Optimize LinkedIn section (Story 13)

**Monthly Loop:**
1. Reach 100% profile completeness (gamification badge)
2. Schedule first interview (celebration)
3. Receive first offer (confetti + social share)

### Re-engagement Triggers (Dormant >3 days)

**Email Sequence:**
- Day 3: "Your AI interview coach is ready 👋"
- Day 7: "3 new jobs matching your profile"
- Day 14: "Week reminder: credits reset soon"

**Push Notifications:**
- Day 10: "See your interview improvements"
- Weekly: "Network follow-up due"
- Realtime: "Interview feedback ready"

### Gamification Mechanics

**Badges:**
- Profile Completeness: 0% → 50% → 100%
- Network Size: 5 → 10 → 25 → 50 contacts
- Interview Streak: 3 → 7 → 14 days
- Best Score: 80% → 85% → 90% → 95%+

**Progress Indicators:**
- Credit balance (visual bar, color-coded)
- Profile completeness ring
- Application funnel (% conversion per stage)
- Interview improvement trend

**Celebrations:**
- Confetti on first offer
- Animated score ring reveal on interview complete
- "Strong Hire" badge when >80%
- Social share prompts for achievements

### Content Recommendation Engine

**Personalized Job Feed (Future Phase):**
- Collaborative filtering (jobs similar to saved)
- Network-based (companies where contacts work)
- Role-based (matching target role)
- Skill-based (jobs requiring skills user wants to learn)

**Skill Development Suggestions:**
- "30% of jobs want Kubernetes" → "Want to level up?"
- "You're strong in React" → "Try TypeScript roles?"

**Networking Prompts:**
- "You haven't checked on Sarah in 10 days"
- "Mike just got promoted at Google"
- "3 contacts graduating soon" → follow-up suggestions

---

## Success Metrics

### Onboarding Funnel (Target: >70% completion)

| Stage | Goal | Metric |
|---|---|---|
| Welcome → Role/Goal | 90% | Drop-off analysis |
| Role/Goal → Quick Profile | 85% | Skip allowed (+5%) |
| Quick Profile → JD Analysis | 95% | Magic moment magic |
| JD Analysis → Resume Generation | 88% | Core value proposition |
| Resume Generation → Discover | 92% | Natural flow |
| Discover → Home | 80% | Day 1 retention |

**Daily Tracking:**
```json
{
  "date": "2026-06-20",
  "total_signups": 100,
  "step_1_completes": 90,
  "step_2_completes": 77,
  "step_3_completes": 73,
  "step_4_completes": 65,
  "step_5_completes": 60,
  "step_6_completes": 48,
  "home_arrival": 38
}
```

### Engagement Metrics (Target: >40% D1 retention)

| Metric | Target | Method |
|---|---|---|
| D1 Retention | >40% | % of Day 1 users returning Day 2 |
| D7 Retention | >25% | % of Day 1 users returning Day 7 |
| D30 Retention | >10% | % of Day 1 users returning Day 30 |
| DAU | Growth week-over-week | Daily active users |
| Session Duration | >5 min average | Time in app per session |
| Features Used/Week | >2 features | Depth of product adoption |

### Conversion Metrics (Target: >5% by Day 14)

| Metric | Target | Method |
|---|---|---|
| Signup → First JD Analysis | >80% | % completing magic moment |
| First JD Analysis → Resume | >70% | % using core value |
| First Resume → Tracker Add | >60% | % saving application |
| Day 14 Upgrade Rate | >5% | % converting to paid |
| Credit Exhaustion Upgrade | >10% | % upgrading at limit |

### Quality Metrics

| Metric | Target | Method |
|---|---|---|
| AI Output Quality (resume) | >8/10 | Peer review of 10 samples |
| JD Match Accuracy | >85% | Manual verification of scores |
| Interview Feedback Usefulness | >7/10 | User survey |
| App Crash Rate | <0.1% | Sentry monitoring |
| Cold Start Time | <3s | React DevTools Profiler |

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Groq API down | Critical (no AI) | OpenRouter fallback, cached results |
| Supabase quota exceeded | Critical (no auth/data) | Request quota increase, monitor usage |
| Device storage full | Medium (can't save) | Graceful error, cloud backup prompt |
| Network latency | Medium (poor UX) | Offline mode, queue actions, retry logic |
| AI output quality poor | Medium (trust) | Prompt engineering, output validation, human review |

### User Experience Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Onboarding too long | Critical (drop-off) | Target: 3 min to first value, skip allowed at each step |
| Credit scarcity frustrating | High (churn) | Free tier: 10 credits/month, clear pricing, upgrade CTA |
| Resume quality concern | High (trust) | Show ATS score, allow editing, compare to examples |
| Interview feedback harsh | Medium (confidence) | Balanced feedback, strengths emphasized first |

### Product Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Feature creep delaying launch | Critical | MVP lock: only 18 stories, no features beyond |
| Copycat competitors | Medium (post-launch) | First-mover advantage, focus on UX, lock in with habits |
| User data privacy concern | Critical | GDPR compliant, clear privacy policy, secure storage |
| Monetization too aggressive | High (churn) | Free tier generous (10 credits), upgrade only on exhaustion |

---

## Appendix: Quick Reference

### Story Numbering
- Stories 1-6: Onboarding (0-3 minutes)
- Stories 7-15: Core features (post-onboarding)
- Stories 16-18: Utilities (contextual)

### Priority Levels
- **P0:** Critical path (launch blockers)
  - Stories 1-11, 15 (onboarding + core + settings)
- **P1:** Core features (include in MVP)
  - Stories 12-14 (cover letter, linkedin, networking)
- **P2:** Nice-to-have (include if time)
  - Stories 16-17 (elevator pitch, JD summarizer)
- **P3:** Future (post-launch)
  - Story 18 (autofill), coach mode, human review

### Credits Model Quick Reference
| Action | Cost | Notes |
|---|---|---|
| JD Analysis | 1 | Cache 24h |
| Resume Generation | 3 | Tailored to job |
| Resume Section Rewrite | 1 | Per section |
| ATS Scoring | 1 | Per resume |
| Cover Letter | 2 | Per tone |
| Mock Interview | 5 | Per session |
| LinkedIn Analysis | 2 | Per profile |
| LinkedIn Section Optimize | 1 | Per section |
| Elevator Pitch | 0 | Free utility |
| JD Summarizer | 0 | Bundled with analysis |
| Autofill | 0 | Free utility |
| Networking Message Suggestion | 0 | Free utility |

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-06-20 | AI Design | Initial comprehensive mapping |

---

**Last Updated:** June 20, 2026, 17:37 UTC  
**Document Status:** Ready for Implementation  
**Next Steps:** Begin Sprint 0 (Infrastructure & Backend)
