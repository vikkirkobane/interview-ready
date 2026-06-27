# Implementation Roadmap: Days 3-7

**Created:** June 20, 2026, 18:40 UTC  
**For:** Interview Ready - Sprint 0 & 1 Execution  
**Status:** Ready to execute

---

## PHASE 1: COMPLETE BACKEND (Day 3, 4-5 hours)

### Critical Path for Maximum Impact

#### Day 3 Morning (2 hours): Cover Letter + Core Utilities
**Goal:** Enable first complete user journey (JD → Resume → Cover Letter)

1. **`cover-letters/create.ts`** (2 credits per generation)
   ```typescript
   POST /cover-letters/create
   Input: {
     job_title: string,
     company_name: string,
     tone: 'PROFESSIONAL' | 'ENTHUSIASTIC' | 'CONCISE' | 'STORYTELLING' | 'FORMAL',
     job_analysis_id: uuid // optional, for context
   }
   
   // 5 system prompts, one per tone
   const TONE_PROMPTS = {
     PROFESSIONAL: "Formal, achievement-focused...",
     ENTHUSIASTIC: "Energy, passion, culture fit...",
     // etc
   }
   
   // Generate, validate, save, return
   ```
   **Time:** 45 mins
   **Testing:** Manual - generate 5 tones for sample job

2. **`utilities/elevator-pitch.ts`** (0 credits, free)
   ```typescript
   POST /utilities/elevator-pitch
   Input: { context: 'INTERVIEW' | 'NETWORKING' | 'EMAIL' }
   Output: { pitch_30s, pitch_60s }
   ```
   **Time:** 30 mins
   **Testing:** Manual - test 3 contexts

#### Day 3 Afternoon (2 hours): Bonus Features
**Goal:** Add depth to user experience

3. **`interviews/start.ts`** (5 credits per session)
   ```typescript
   POST /interviews/start
   Input: {
     role: string,
     type: 'TECHNICAL' | 'BEHAVIORAL' | 'SYSTEM_DESIGN',
     difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'SENIOR'
   }
   Output: interview_id, channel
   
   // Create interview record
   // Initialize message history
   // Return Realtime channel for streaming
   ```
   **Time:** 60 mins
   **Dependencies:** None (standalone)

4. **`networking/suggest-message.ts`** (0 credits, free)
   ```typescript
   POST /networking/suggest-message
   Input: { contact_id, context }
   Output: 3 AI-generated messages
   ```
   **Time:** 30 mins

---

### Remaining Backend Functions (Optional, Day 3 Evening)

**If time permits** (3+ hours available):

5. **`resumes/export.ts`** (generate .docx files)
   - Integrate `docx` library from esm.sh
   - Template-based document generation
   - Handle 6 resume templates
   - Return download URL

6. **`jobs/scrape.ts`** (Job URL scraper)
   - Cheerio HTML parsing
   - LinkedIn job extractor
   - Indeed job extractor
   - Generic fallback
   - Deno KV caching (24h TTL)

---

## PHASE 2: MOBILE APP FOUNDATION (Days 4-7, Sprint 1)

### Day 4: Onboarding Loop (Stories 1-6, 5+ hours)

#### Setup (30 mins)
```typescript
// 1. Supabase client
src/lib/supabase.ts
- createClient() with SecureStore adapter
- Platform detection (mobile/web)
- Auth state listener

// 2. TanStack Query
src/lib/query-client.ts
- QueryClientProvider setup
- Default stale times
- Error handling

// 3. Zustand stores
src/stores/auth-store.ts      // user, session, login/logout
src/stores/profile-store.ts   // profile, completeness
src/stores/onboarding-store.ts // step tracking
src/stores/dashboard-store.ts  // recent actions, stats
```

#### Story 1: Welcome + OAuth (45 mins)
```typescript
File: app/(auth)/welcome.tsx
- Logo + tagline animation
- Google OAuth button
- LinkedIn OAuth button  
- Email/password form (collapsible)
- "Try without account" option
- Terms/Privacy links

Navigation: → Story 2 on success
Dependencies: auth-store, supabase client
```

#### Story 2: Role & Goal (30 mins)
```typescript
File: app/(onboarding)/role-goal.tsx
- Target role dropdown (with autocomplete)
- Years experience segmented control
- Work type multi-select
- Progress: "Step 1 of 5"
- Next button

State: Zustand → Supabase
Navigation: → Story 3
```

#### Story 3: Quick Profile (45 mins)
```typescript
File: app/(onboarding)/quick-profile.tsx
- Animated progress ring (0-100%)
- Job title, company, role inputs
- Skills tag selector (with autocomplete)
- Education picker
- Milestone badges (50%, 75%, 100%)
- "Skip" button

Auto-save: Every 3 seconds
Navigation: → Story 4
```

#### Story 4: JD Analyzer Magic Moment (60 mins)
```typescript
File: app/(onboarding)/jd-analyzer.tsx
- Text paste area + URL input
- Loading state with progress
- Score rings (ATS, Skill, Keyword) with animation
- Recommendation badge
- Skills breakdown (matched/missing)
- Job summary card
- 3 action buttons (Generate Resume, Cover Letter, Save)

API Call: POST /jobs/analyze
Navigation: → Story 5 (if resume) or Story 4 (if save)
Real-time: Display analysis ~5 seconds
```

#### Story 5: Resume Generation (60 mins)
```typescript
File: app/(onboarding)/resume-generation.tsx
- Live section-by-section progress animation
- Resume preview (right side on web)
- Completion screen with confetti
- Download button
- "View in Tracker" button

Realtime: Channel subscribe resume:{resumeId}
API Call: POST /resumes/create
UI Update: Section appears as content arrives
```

#### Story 6: Feature Discovery (30 mins)
```typescript
File: app/(onboarding)/discover.tsx
- 3 feature cards (swipeable)
- "Go to Dashboard" button
- "Save & Explore Later" button
- No forced tutorial

Navigation: → app/(tabs)/home
```

**Day 4 Deliverable:** Complete onboarding flow, end-to-end from signup to resume

---

### Day 5: Core Screens (Stories 7, 9, 10, 5+ hours)

#### Story 7: Dashboard Home (60 mins)
```typescript
File: app/(tabs)/home.tsx
- Profile avatar + name + plan badge
- Credit balance with progress bar
- 3 stat cards (swipeable)
- Recent actions feed
- Feature carousel
- 3-column quick action grid
- FAB for "Analyze Job"

Data Queries:
  - /auth/me
  - /applications/stats
  - /resumes/recent
  - /interviews/recent

Realtime: Subscribe to user:{userId} for updates
Refresh: Pull-to-refresh, auto-refresh every 30s
```

#### Story 9: Resume Builder (90 mins)
```typescript
File: app/(tabs)/resume/builder.tsx
- Header: name, template badge, ATS score, share/download
- Template picker modal (6 templates)
- Section editor (collapsible):
  - Summary (textarea + AI rewrite)
  - Experience (per-job)
  - Education
  - Skills (tags, drag-reorder)
  - Projects
- Preview panel (PDF viewer)
- AI Insights sidebar

Editing: Optimistic updates → debounce save
API Calls: 
  - GET /resumes/:id
  - PUT sections
  - POST /resumes/:id/score
  - POST /resumes/:id/section-rewrite
```

#### Story 10: Application Tracker (120 mins)
```typescript
File: app/(tabs)/tracker.tsx
- Kanban board (6 columns: Saved, Applied, Screening, etc.)
- Drag-and-drop cards
- Filter + sort options
- Stats modal (funnel chart)
- Card detail view (sheet)
- Add new application (FAB)
- Empty state

Data:
  - GET /applications/list
  - POST /applications/create
  - PUT /applications/update (status, notes)
  - GET /applications/stats

Drag-drop: react-native-draggable-list (mobile-optimized)
Charts: recharts for funnel
```

#### Story 8: Job Analyzer (45 mins)
```typescript
File: app/job-analyzer/analyze.tsx
- Reuse Story 4 components
- Standalone screen (not just onboarding)
- Can be accessed from Story 7 FAB or feature carousel

Navigation: From home → this screen
```

**Day 5 Deliverable:** Full home dashboard + tracker working, resume editor functional

---

### Day 6: Utilities & Interviews (Stories 11, 12, 13, 14, 15, 5+ hours)

#### Story 11: Mock Interview (120 mins)
```typescript
File: app/(tabs)/interviews.tsx
File: app/interview/chat.tsx
- Lobby: start interview form
- Chat interface (message bubbles)
- AI responses streaming
- Voice button (optional, Whisper API)
- Live scoring sidebar
- Completion screen (score rings + feedback)

Realtime: Channel subscribe interview:{id}
API Calls:
  - POST /interviews/start
  - POST /interviews/message
  - GET /interviews/feedback
  
Voice: expo-av + Whisper API (optional for MVP)
```

#### Story 12: Cover Letter (45 mins)
```typescript
File: app/cover-letter/generate.tsx
- Tone selector (5 options)
- Generated letter display
- Version management (dropdown)
- Edit mode (textarea)
- Copy/download buttons

API Calls:
  - POST /cover-letters/create
  - PUT /cover-letters/:id/regenerate
```

#### Story 13: LinkedIn Optimizer (45 mins)
```typescript
File: app/(tabs)/linkedin.tsx
- 4 section score rings
- Detailed feedback per section
- Generate optimized sections (modal)
- Bonus: LinkedIn post generator (free)

API Calls:
  - POST /linkedin/analyze (2 credits)
  - POST /linkedin/headline
  - POST /linkedin/about
```

#### Story 14: Networking Tracker (45 mins)
```typescript
File: app/(tabs)/networking.tsx
- Contact list (search + filter)
- Follow-up reminders (prominent)
- Contact detail sheet
- Interaction history
- Add contact (FAB)

API Calls:
  - GET /networking/contacts
  - POST /networking/contacts/create
  - PUT /networking/followup
  - GET /networking/suggest-message
```

#### Story 15: Settings (30 mins)
```typescript
File: app/(tabs)/settings.tsx
- Account section (email, name, photo)
- Plan section (credits, upgrade, billing)
- Preferences (language, theme, notifications)
- Support (FAQ, contact)
- Danger zone (logout, delete)

API Calls:
  - PUT /auth/update-profile
  - GET /billing/usage
  - DELETE /auth/delete-account
```

#### Stories 16-18: Utilities (30 mins)
```typescript
File: app/elevator-pitch.tsx (modal)
File: app/jd-summary.tsx (modal)
File: app/autofill.tsx (full screen)

All lightweight, mostly UI with minimal API calls
```

**Day 6 Deliverable:** All core features screens complete

---

### Day 7: Polish & Testing (5+ hours)

#### Loading States (90 mins)
- Skeleton loaders for all list screens
- Shimmer animations (Reanimated)
- Progress spinners for long operations
- "Loading..." states for AI operations

#### Error Handling (60 mins)
- Error boundaries (React)
- Retry mechanisms for failed requests
- Offline detection + cached data fallback
- User-friendly error messages (not stack traces)

#### Empty States (45 mins)
- No resumes yet → "Create your first resume"
- No applications yet → "Start tracking your job hunt"
- No interviews yet → "Practice makes perfect"
- Credit exhausted → "Upgrade to continue"

#### Animations (90 mins)
- Screen transitions (slide, fade)
- Score ring reveals (Reanimated)
- Card entrance animations
- Button press feedback
- Confetti on milestones

#### Push Notifications (45 mins)
- Follow-up reminders
- Export complete
- Credit low warning
- Weekly summary

#### Testing (120 mins)
- Full onboarding funnel (Story 1 → 6)
- Core features (analysis → resume → tracker)
- Credit system (exhaust → upgrade)
- Error scenarios (no auth, low credits, network error)
- Performance (cold start <3s, navigation <100ms)
- Accessibility (screen reader labels)

**Day 7 Deliverable:** App polished, all tests passing, ready for store submission

---

## Critical Dependencies Between Components

```
Story 1 (Auth) 
  ↓
Story 2 (Role) → triggers profile auto-setup
  ↓
Story 3 (Profile) → fills profile_completeness
  ↓
Story 4 (JD Analysis) ← requires profile for context
  ↓
Story 5 (Resume) ← requires profile + JD analysis
  ↓
Story 10 (Tracker) ← can link resume to application
  ↓
Story 11 (Interviews) ← can be for tracked job
```

## Testing Strategy by Phase

### Phase 1 Backend (Day 3)
- [ ] Unit test: Each endpoint with sample data
- [ ] Integration test: Full flow - auth → profile → JD → resume
- [ ] Credit system: Verify atomic deduction
- [ ] Error handling: All error codes returned correctly
- [ ] AI output: 10 samples pass Zod validation

### Phase 2 Mobile (Days 4-7)
- [ ] **Day 4:** Onboarding funnel (all 6 steps)
- [ ] **Day 5:** Dashboard + tracker fully functional
- [ ] **Day 6:** All features screens visible
- [ ] **Day 7:** Full app smoke test + performance profiling

### Pre-Launch (Day 8-9)
- [ ] iOS build via EAS Build
- [ ] Android build via EAS Build
- [ ] Test on physical devices (iPhone + Android)
- [ ] App Store/Play Store submission

---

## Optional Enhancements (Post-MVP)

If time available during development:

1. **Offline Mode** — Cache data locally, queue actions
2. **Real-time Collab** — Share resume with recruiter
3. **Job Recommendations** — ML-based job matching
4. **Email Campaigns** — Mailgun integration for re-engagement
5. **Advanced Analytics** — PostHog event tracking
6. **A/B Testing** — Variations in onboarding flow

---

## Success Criteria for Launch

| Metric | Target | Owner |
|--------|--------|-------|
| Signup → Resume | <3 mins | UX/Frontend |
| JD Analysis | <5 secs | Backend |
| Resume Generation | <30 secs | Backend |
| First value shown | Day 1 > 40% retain | Product |
| Zero crashes | <0.1% | QA |
| Cold start | <3 secs | Mobile |

---

## Git Commit Strategy

**Day 3:** `feat: complete AI pipeline (cover letters, interviews, utilities)`  
**Day 4:** `feat: onboarding flow (stories 1-6)`  
**Day 5:** `feat: dashboard & tracker`  
**Day 6:** `feat: utilities (interviews, linkedin, networking)`  
**Day 7:** `chore: polish & testing`  
**Day 8:** `chore: app store submission`  

---

**Document Version:** 1.0  
**Last Updated:** June 20, 2026, 18:40 UTC  
**Status:** Ready to execute next 4 days  

**Next Step:** Proceed with Day 3 (Cover Letters + utilities) OR Day 4 (Mobile app foundation)
