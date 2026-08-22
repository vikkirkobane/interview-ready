# Interview Ready — AI Career Copilot MVP

**Status:** 🟢 Production Ready (Feature Complete & Tested)  
**SDK:** Expo SDK 56 (`react-native@0.85.3` / `expo@56.0.20`)  
**Test Suite:** 47 / 47 Suites Passed (329 / 329 Tests Passing)  
**Linter:** ESLint 0 Errors, 0 Warnings  

---

## 🚀 Quick Start

### For Developers

1. **Install Dependencies**
   ```bash
   npm install
   ```
2. **Run Locally**
   ```bash
   npx expo start
   ```
3. **Run Test Suite**
   ```bash
   npm test -- --forceExit
   ```
4. **Run Linter**
   ```bash
   npm run lint
   ```
5. **Run Expo Diagnostics**
   ```bash
   node node_modules/expo-doctor/bin/expo-doctor.js
   ```

### Building for Android (APK via EAS)

**One-time setup**

```powershell
npm install
npx eas login
npx eas init
```

`eas init` replaces the placeholder `projectId` in `app.json` with your real Expo project ID.

Set cloud build secrets (use your real Supabase and provider values):

```powershell
npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR-PROJECT.supabase.co" --type string
npx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --type string
```

**Build and install**

```powershell
npm run build:android
```

When the build finishes, download the APK from the [Expo dashboard](https://expo.dev) and install it on your device.

---

## 📱 Feature Overview

### 1. Onboarding Funnel (Stories 1–6)
- **Welcome & Auth**: Google OAuth, LinkedIn OAuth, Email/Password sign-up & sign-in with password reset.
- **Target Role Setup**: Choose target job role, seniority level, and years of experience.
- **Profile & Resume Parsing**: Rapid profile setup with resume upload (PDF/DOCX/image extraction).
- **Instant Job Analysis (Magic Moment)**: Immediate fit score, keyword match breakdown, and gap analysis.
- **Real-Time Resume Generation**: Live streaming resume generation with ATS optimization.
- **Feature Discovery**: Interactive tour of all AI Copilot tools.

### 2. Core Copilot Modules (Stories 7–15)
- **Job Fit Analyzer**: Deep JD parsing against user profile with actionable improvement suggestions.
- **AI Resume Builder & Manager**: Multi-resume management, live document editing, ATS scoring, and PDF generation.
- **Mock Interviews**: Interactive AI mock interview sessions, customizable difficulty, instant feedback, and PDF prep reports.
- **Cover Letter Generator**: Highly tailored, multi-tone cover letters with in-line document editor and email export.
- **LinkedIn Optimizer**: Tailored headlines, About sections, experience rewrites, and PDF optimization guides.
- **Company Research**: In-depth company culture, interview talking points, smart questions to ask, and PDF dossiers.
- **Application Tracker**: Full Kanban pipeline tracker (Applied, Screening, Technical, Final, Offer, Rejected).
- **Ask AI**: Career copilot chat with multi-page document attachment support for context-aware Q&A.

### 3. Monetization & Credits (Stories 16–18)
- **Paystack Subscriptions**: Pro monthly/annual plan subscriptions with currency-aware pricing and webview checkout.
- **Referral & Promo Code System**: Viral referral codes, promo code redemptions, and bonus credit allocation.
- **AdMob Integration**: Rewarded ads for earning extra free credits.

---

## 🏗️ Architecture & Technical Highlights

### Modern UI/UX Standards
- **Bounded Expansion Inputs**: Form inputs and text areas adaptively expand with standard UI/UX constraints (`minHeight: 100-140`, `maxHeight: 180-200`) and smooth internal scrolling.
- **Clean Document Attachment**: Attached files are displayed as clear badges without polluting user prompt bars.

### Resilient AI Architecture
- **Multi-Provider Fallback**: Groq → OpenAI / Anthropic / OpenRouter with automatic failover.
- **Zod Validation**: Strongly typed schemas for all AI JSON outputs.
- **Real-Time Streaming**: Edge-function streaming via Supabase Realtime for instant user feedback.

### Robust Test Coverage
- Comprehensive unit and integration tests across all screens, hooks, stores, and export utilities.
- 47 test suites, 329 passing tests.

---

## 📚 Documentation Index

All detailed guides and specifications live in the `docs/` folder:

| Document | Purpose |
| :--- | :--- |
| [DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) | Complete directory of all architecture and implementation guides |
| [PROGRESS_TRACKER.md](docs/PROGRESS_TRACKER.md) | Milestone tracker, feature checklist, and status |
| [USER_STORIES.md](docs/USER_STORIES.md) | Detailed specifications for all 18 user stories |
| [PAYSTACK_INTEGRATION.md](docs/PAYSTACK_INTEGRATION.md) | Payment gateway setup and subscription verification |
| [PROMO_CODES_GUIDE.md](docs/PROMO_CODES_GUIDE.md) | Promo codes and referral reward system |
| [CREDIT_SYSTEM.md](docs/CREDIT_SYSTEM.md) | Atomic credit deduction and balance rules |
| [ads-integration-guide.md](docs/ads-integration-guide.md) | Google AdMob rewarded ads setup |
| [testing_guide.md](docs/testing_guide.md) | Running Jest test suites and mocks |
