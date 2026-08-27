# Interview Ready — Web Migration & Production Deployment Guide

This document provides a complete technical explanation of all architectural and codebase changes made, followed by a step-by-step checklist of everything required to deploy the web app to Vercel and connect it with your domain, authentication providers, and existing website.

---

## 1. High-Level Architecture Overview

Your application now operates on a **Unified Cross-Platform Architecture**:

```
                               ┌──────────────────────────────────────────────┐
                               │           CUSTOM DOMAIN / DNS ROUTING         │
                               └──────────────────────┬───────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
           https://yourdomain.com                                        https://app.yourdomain.com
       ┌───────────────────────────────┐                             ┌───────────────────────────────┐
       │   Existing Marketing Site     │                             │      Interview Ready Web      │
       │    (React Landing Page)       │                             │   (Expo Static PWA on Vercel) │
       └───────────────┬───────────────┘                             └───────────────┬───────────────┘
                       │                                                             │
                       │ CTA: "Launch App"                                           │
                       └─────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │   SUPABASE SHARED BACKEND   │
                                       │ (PostgreSQL, Auth, Edge Fn) │
                                       └──────────────┬──────────────┘
                                                      │
                                    ┌─────────────────┴─────────────────┐
                                    ▼                                   ▼
                            Web PWA Clients                     Native Android App
                        (Desktop, iOS Safari)                 (Google Play / Direct APK)
```

### Why this architecture is optimal:
1. **Solves the iOS Dilemma for Free**: Users on iPhone/iPad visit `app.yourdomain.com` in Safari, tap **Share → Add to Home Screen**, and install the app as a full-screen, standalone app without requiring an Apple Developer Account ($99/yr) or App Store review.
2. **Preserves the Android Native App**: 100% of your business logic, AI coaching, resume building, and database integrations are shared between Web and Android in this single repository.
3. **Zero Conflicts with Existing Website**: Hosting the web app at `app.yourdomain.com` ensures your landing page and your application routes never collide and can be deployed independently.

---

## 2. Detailed Breakdown of Codebase Changes

### A. Web App & PWA Foundation
- **`app/+html.tsx`**: Custom root HTML template for Expo Router Web that injects:
  - Apple Web App meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`) for standalone iOS fullscreen mode.
  - Safe Area Insets (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`) so iPhone notch and Dynamic Island rendering feel native.
  - Viewport scaling and touch controls (`touch-action: manipulation`) preventing accidental double-tap zooming.
- **`public/manifest.json`**: Web App Manifest specifying standalone display mode, theme colors (`#1a3a5c`), and maskable icon references.
- **`public/` Assets**: Placed high-resolution icons (`icon_padded.png`, `apple-touch-icon.png`, `favicon.png`) in `public/` for automatic browser discovery.
- **`src/components/features/PWAInstallBanner.tsx`**: Smart install prompt that:
  - Automatically hides itself if the user is already in standalone/PWA mode.
  - On **iOS Safari**, displays an animated guide: *"Tap Share [icon] in Safari, then choose 'Add to Home Screen' [icon]"*.
  - On **Chrome / Android / Desktop**, captures the native `beforeinstallprompt` event and shows a 1-tap "Install App" button.
  - Remembers user dismissals for 7 days in storage.

### B. Universal Authentication (Google & LinkedIn)
- **`src/lib/social-auth.web.ts`**: Web implementation of Google Sign-In using Supabase OAuth redirects (`supabase.auth.signInWithOAuth({ provider: 'google' })`), completely eliminating native-only Android Google Sign-In SDK dependencies on Web.
- **`src/stores/auth-store.ts`**: Updated `signInWithOAuth` so that when run on Web (`Platform.OS === 'web'`), it executes a clean browser redirect to the OAuth provider with `redirectTo: window.location.origin + '/auth/callback'`.
- **`app/auth/callback.tsx`**: Added web PKCE code exchange handler that parses `?code=` from the URL upon returning from Google/LinkedIn, establishes the Supabase session, and routes the user into `/(tabs)` or onboarding.

### C. Web Payments (Paystack Inline Checkout)
- **`src/components/features/payments/PaystackWebView.web.tsx`**: Created a dedicated Web checkout component that loads the official **Paystack Inline JS Popup** (`https://js.paystack.co/v1/inline.js`) dynamically in the browser. Handles popup opening, payment verification callbacks, cancellations, and subscription activations seamlessly.

### D. Export & Download Parity
- **`src/lib/resumeExport.ts` & `src/lib/coverLetterExport.ts`**:
  - On **Web**: Triggers browser print/save-as-PDF dialogs (`window.print()`) for PDF exports, and direct binary blob downloads (`Packer.toBlob` + `<a download>`) for DOCX exports.
  - On **Native**: Uses `expo-print` and `expo-sharing` native share sheets.

### E. Native-Only Module Web Stubs
- Created `.web.ts` / `.web.tsx` abstractions for `react-native-google-mobile-ads` ([AdBanner.web.tsx](file:///c:/Users/victo/Desktop/Gemini%20Projects/interview-ready-v2/src/components/ui/AdBanner.web.tsx), [adUnits.web.ts](file:///c:/Users/victo/Desktop/Gemini%20Projects/interview-ready-v2/src/lib/adUnits.web.ts), [useInterstitialAd.web.ts](file:///c:/Users/victo/Desktop/Gemini%20Projects/interview-ready-v2/src/lib/useInterstitialAd.web.ts), [useRewardedAd.web.ts](file:///c:/Users/victo/Desktop/Gemini%20Projects/interview-ready-v2/src/lib/useRewardedAd.web.ts), [mobileAdsService.web.ts](file:///c:/Users/victo/Desktop/Gemini%20Projects/interview-ready-v2/src/lib/mobileAdsService.web.ts)) so `npx expo export --platform web` bundles cleanly with 0 native errors.

### F. Vercel Configuration
- **`vercel.json`**: Production configuration with `cleanUrls: true`, SPA rewrites (routing any path like `/cover-letter`, `/pricing`, `/auth/callback` to the generated static HTML), and caching headers.

---

## 3. What Is Required of You (Action Checklist)

Follow these step-by-step actions to launch the web app live in production:

### Step 1: Deploy to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..." → "Project"**.
3. Select your GitHub repository: `vikkirkobane/app-interview-ready` (or `vikkirkobane/interview-ready`).
4. Vercel will automatically read `vercel.json`:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build:web`
   - **Output Directory**: `dist`
5. In the **Environment Variables** section, add your environment variables:

| Variable Name | Value Description |
| :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL (`https://xxxx.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY` | Your Paystack live public key (`pk_live_...`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Your Google Web Client ID (`...apps.googleusercontent.com`) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Your Google Android Client ID |
| `DASHSCOPE_API_KEY` | Qwen / DashScope AI API Key |
| `RESEND_API_KEY` | Resend email API Key |
| `OCR_SPACE_API_KEY` | OCR Space API Key |
| `SGAI_API_KEY` | SGAI API Key |

6. Click **Deploy**. Vercel will build and assign you a default URL (e.g. `https://app-interview-ready.vercel.app`).

---

### Step 2: Configure Your Subdomain (`app.yourdomain.com`)

1. In Vercel, go to **Project Settings → Domains**.
2. Type your chosen subdomain: **`app.yourdomain.com`** and click **Add**.
3. Go to your DNS provider (where you bought `yourdomain.com`, e.g. Cloudflare, GoDaddy, Namecheap):
   - Add a **CNAME Record**:
     - **Type**: `CNAME`
     - **Name / Host**: `app`
     - **Target / Value**: `cname.vercel-dns.com`
     - **Proxy status**: DNS Only (or Proxied if using Cloudflare)
4. Once DNS propagates (1–5 minutes), your web app is live at `https://app.yourdomain.com` with a free SSL certificate.

---

### Step 3: Update Supabase Authentication URLs

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → select your project.
2. Go to **Authentication → URL Configuration**.
3. **Site URL**: Set to `https://app.yourdomain.com`.
4. **Redirect URLs**: Add the following entries (click **Add URL**):
   - `https://app.yourdomain.com/**`
   - `https://app.yourdomain.com/auth/callback`
   - `http://localhost:8081/**` (for local development)
   - `interviewready://**` (for the native Android app)
5. Click **Save**.

---

### Step 4: Update Google Cloud Console (OAuth)

1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Click on your **Web Client ID** credential.
3. Under **Authorized JavaScript origins**, add:
   - `https://app.yourdomain.com`
   - `http://localhost:8081`
4. Under **Authorized redirect URIs**, add:
   - `https://<your-supabase-id>.supabase.co/auth/v1/callback`
   - `https://app.yourdomain.com/auth/callback`
   - `http://localhost:8081/auth/callback`
5. Click **Save**.

---

### Step 5: Update LinkedIn Developer Portal (OAuth)

1. Open the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps).
2. Select your app → Go to the **Auth** tab.
3. Under **Authorized redirect URLs for your app**, ensure you have:
   - `https://<your-supabase-id>.supabase.co/auth/v1/callback`
4. Click **Update**.

---

### Step 6: Verify Paystack Webhook

1. Open [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developers) → **Settings → API Keys & Webhooks**.
2. Set your **Live Webhook URL** to:
   - `https://<your-supabase-id>.supabase.co/functions/v1/paystack-webhook`
3. Click **Save Changes**.

---

### Step 7: Link Your Existing React Landing Website

On your existing marketing website (`https://yourdomain.com`), update your navigation and call-to-action buttons:
- **"Log In"** button → Links to `https://app.yourdomain.com/login`
- **"Sign Up" / "Get Started" / "Try for Free"** buttons → Links to `https://app.yourdomain.com/signup`
- **"Download for Android"** button → Links to your Google Play Store listing or direct `.apk` download URL.

---

## 4. End-to-End Testing & Verification

Once deployed, test each of the following user flows on `https://app.yourdomain.com`:

| Test Flow | Expected Behavior |
| :--- | :--- |
| **Email Sign In & Sign Up** | Logs in, redirects to onboarding (if new) or dashboard tabs `/(tabs)`. |
| **Google Sign In (Web)** | Opens Google account picker, returns to `/auth/callback`, automatically authenticates. |
| **LinkedIn Sign In (Web)** | Opens LinkedIn authorization dialog, returns and logs in. |
| **Paystack Upgrade** | Opens Paystack popup modal in browser, verifies payment, updates user plan to Pro. |
| **Resume Builder & PDF/DOCX Download** | Generates resume, opens print dialog for PDF or downloads `.docx` file directly. |
| **Cover Letter Generator & Export** | Generates AI letter, exports PDF/DOCX or allows 1-click clipboard copy. |
| **iOS Safari "Add to Home Screen"** | Banner prompts user to tap Share → Add to Home Screen; opens full screen from home screen icon. |
