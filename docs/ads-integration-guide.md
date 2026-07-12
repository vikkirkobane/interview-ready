# AdMob Integration Guide — Interview Ready

## Overview

The app already has `react-native-google-mobile-ads` installed and a working `AdBanner` component. This guide covers everything needed to fully wire up ads: the build fix, environment setup, all ad formats, gating logic for Pro users, rewarded ads for credit top-ups, and screen-by-screen placement recommendations.

---

## 1. Fix the Build First

Before anything else, the current Android build is broken because `react-native-google-mobile-ads` 16.4.0 pulls in `play-services-ads` 25.4.0, which requires Kotlin 2.3.0 — but the EAS build environment uses Kotlin 2.1.20.

**Fix: downgrade the package to a compatible version.**

```bash
npm install react-native-google-mobile-ads@16.3.1
```

Then trigger a new build:

```bash
eas build -p android --profile preview
```

---

## 2. Environment Variables

### Local (`.env`)

Add these to your `.env` file. Never commit real ad unit IDs to git — they are not secrets per se, but keeping them in env keeps config centralized.

```env
# AdMob — Android
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX

# AdMob — iOS
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

Update `.env.example` to document these keys (already shown above — add them).

### EAS Secrets (for cloud builds)

```bash
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_ANDROID_APP_ID --value "ca-app-pub-..." --type string
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID --value "ca-app-pub-..." --type string
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID --value "ca-app-pub-..." --type string
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID --value "ca-app-pub-..." --type string
# Repeat for iOS variants
```

---

## 3. `app.json` — App ID Configuration

The `react-native-google-mobile-ads` plugin in `app.json` needs the **App ID** (not the ad unit ID):

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
    "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
  }
]
```

> The App ID (`~`) is different from an Ad Unit ID (`/`). Get it from your AdMob dashboard under **App settings**.

---

## 4. SDK Initialization

The SDK is already initialized in `app/_layout.tsx`:

```tsx
import mobileAds from 'react-native-google-mobile-ads';

useEffect(() => {
  initialize();
  mobileAds().initialize();
}, []);
```

This is correct. No changes needed here.

---

## 5. Ad Unit ID Helper

Create a central file to resolve ad unit IDs based on platform and environment. This replaces inline logic scattered across components.

**`src/lib/adUnits.ts`**

```ts
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// In development, always use Google's official test IDs to avoid policy violations.
// In production, pull from environment variables set per platform.

function getAdUnitId(
  androidEnvKey: string,
  iosEnvKey: string,
  testId: string
): string {
  if (__DEV__) return testId;

  const id = Platform.OS === 'android'
    ? process.env[androidEnvKey]
    : process.env[iosEnvKey];

  return id || testId; // fallback to test ID if env var is missing
}

export const AdUnits = {
  banner: getAdUnitId(
    'EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID',
    'EXPO_PUBLIC_ADMOB_IOS_BANNER_ID',
    TestIds.ADAPTIVE_BANNER
  ),
  interstitial: getAdUnitId(
    'EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID',
    'EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID',
    TestIds.INTERSTITIAL
  ),
  rewarded: getAdUnitId(
    'EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID',
    'EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID',
    TestIds.REWARDED
  ),
};
```

---

## 6. Pro User Gating

The `index.tsx` already has this pattern:

```tsx
const isPro = user?.user_metadata?.is_pro === true
  || user?.user_metadata?.plan === 'pro'
  || user?.user_metadata?.subscription === 'pro';

// ...

{!isPro && <AdBanner />}
```

This is the correct pattern. Apply it consistently across all screens. Free users see ads; Pro users never do.

---

## 7. Ad Formats

### 7a. Banner Ad (existing — update to use `AdUnits` helper)

Update `src/components/ui/AdBanner.tsx`:

```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AdUnits } from '../../lib/adUnits';

export const AdBanner = () => {
  const [hasError, setHasError] = useState(false);

  if (hasError) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AdUnits.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          console.warn('[AdMob] Banner failed to load:', error);
          setHasError(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
});
```

### 7b. Interstitial Ad (full-screen, shown between actions)

Create `src/lib/useInterstitialAd.ts`:

```ts
import { useEffect, useState } from 'react';
import {
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AdUnits } from './adUnits';

export function useInterstitialAd() {
  const [loaded, setLoaded] = useState(false);
  const [ad] = useState(() =>
    InterstitialAd.createForAdRequest(AdUnits.interstitial, {
      requestNonPersonalizedAdsOnly: true,
    })
  );

  useEffect(() => {
    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setLoaded(true);
    });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      ad.load(); // preload next ad immediately after close
    });
    const unsubscribeError = ad.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.warn('[AdMob] Interstitial error:', error);
        setLoaded(false);
      }
    );

    ad.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [ad]);

  const showAd = () => {
    if (loaded) {
      ad.show();
    }
  };

  return { showAd, loaded };
}
```

**Usage example** — show after generating a resume:

```tsx
import { useInterstitialAd } from '../../src/lib/useInterstitialAd';
import { useAuthStore } from '../../src/stores/auth-store';

export default function NewResumeScreen() {
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.plan === 'pro';
  const { showAd } = useInterstitialAd();

  const handleGenerateResume = async () => {
    // ... generation logic ...

    // Show ad to free users after a successful action
    if (!isPro) {
      showAd();
    }
  };

  // ...
}
```

### 7c. Rewarded Ad (earn credits by watching an ad)

Create `src/lib/useRewardedAd.ts`:

```ts
import { useEffect, useState, useCallback } from 'react';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AdUnits } from './adUnits';

interface UseRewardedAdOptions {
  onRewarded: (amount: number, type: string) => void;
}

export function useRewardedAd({ onRewarded }: UseRewardedAdOptions) {
  const [loaded, setLoaded] = useState(false);
  const [ad] = useState(() =>
    RewardedAd.createForAdRequest(AdUnits.rewarded, {
      requestNonPersonalizedAdsOnly: true,
    })
  );

  useEffect(() => {
    const unsubscribeLoaded = ad.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setLoaded(true)
    );
    const unsubscribeEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        onRewarded(reward.amount, reward.type);
      }
    );
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      ad.load(); // preload next ad
    });
    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (err) => {
      console.warn('[AdMob] Rewarded ad error:', err);
      setLoaded(false);
    });

    ad.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [ad, onRewarded]);

  const showAd = useCallback(() => {
    if (loaded) ad.show();
  }, [ad, loaded]);

  return { showAd, loaded };
}
```

**Usage — "Watch ad to earn 5 credits" button:**

```tsx
import { useRewardedAd } from '../../src/lib/useRewardedAd';
import { useCredits } from '../../src/hooks/useCredits';
import { useAuthStore } from '../../src/stores/auth-store';
import Toast from 'react-native-toast-message';

export function EarnCreditsButton() {
  const { deductCredits } = useCredits(); // used for grant too, via your edge function
  const { user } = useAuthStore();

  const handleReward = async (amount: number) => {
    // Call your Supabase edge function to grant credits
    // This should be a server-side grant to prevent spoofing
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/credits-grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session!.access_token}`,
      },
      body: JSON.stringify({ amount, source: 'rewarded_ad' }),
    });

    Toast.show({
      type: 'success',
      text1: `+${amount} credits earned!`,
      text2: 'Watch another ad anytime to earn more.',
    });
  };

  const { showAd, loaded } = useRewardedAd({ onRewarded: handleReward });

  return (
    <TouchableOpacity onPress={showAd} disabled={!loaded}>
      <Text>{loaded ? 'Watch Ad for 5 Credits' : 'Loading ad...'}</Text>
    </TouchableOpacity>
  );
}
```

> **Important:** Always grant credits server-side (edge function), never purely client-side. Client-side reward callbacks can be spoofed.

---

## 8. Screen-by-Screen Placement Plan

### Banner ads — show at bottom of scroll content for free users

| Screen | Placement | Trigger |
|---|---|---|
| `(tabs)/index.tsx` | Bottom of ScrollView | Already implemented — `{!isPro && <AdBanner />}` |
| `(tabs)/resumes.tsx` | Bottom of list | After last resume card |
| `(tabs)/activities.tsx` | Bottom of ScrollView | After activity list |
| `(tabs)/tracker.tsx` | Bottom of ScrollView | After job list |
| `(tabs)/company-research.tsx` | Bottom of results | After company info |

### Interstitial ads — show after high-value actions

| Trigger | Frequency |
|---|---|
| Resume successfully generated | Every 3rd generation (use a counter in `ui-store.ts`) |
| Cover letter generated | Every 3rd generation |
| Job match analysis complete | Every 3rd analysis |
| Interview session ends | Every session end |

> Cap interstitials per session. A user should see at most 3–4 per session. Use a counter in `ui-store.ts`.

### Rewarded ads — offer in credit-shortage moments

| Location | CTA |
|---|---|
| Low credit warning modal | "Watch an ad to earn 5 credits" |
| `(tabs)/pricing.tsx` | Below pricing tiers for free users |
| Credit balance card on home screen | "Earn more free credits" link |

---

## 9. Interstitial Frequency Cap

Add a counter to `src/stores/ui-store.ts` to cap how often interstitials show:

```ts
// Add to ui-store.ts state
interface UIState {
  // ... existing fields
  interstitialActionCount: number;
  incrementInterstitialCount: () => void;
  resetInterstitialCount: () => void;
}

// In the store
interstitialActionCount: 0,
incrementInterstitialCount: () =>
  set((s) => ({ interstitialActionCount: s.interstitialActionCount + 1 })),
resetInterstitialCount: () => set({ interstitialActionCount: 0 }),
```

Usage in a screen:

```ts
import { useUIStore } from '../../src/stores/ui-store';

const { interstitialActionCount, incrementInterstitialCount } = useUIStore();
const { showAd } = useInterstitialAd();

const handleGenerate = async () => {
  // ... generation logic ...

  incrementInterstitialCount();
  if (!isPro && interstitialActionCount % 3 === 0) {
    showAd();
  }
};
```

---

## 10. AdBanner Export

Make sure `AdBanner` is exported from the UI index so imports stay clean. Check `src/components/ui/index.ts` — if it's not there, add:

```ts
export { AdBanner } from './AdBanner';
```

---

## 11. AdMob Dashboard Setup Checklist

Before going live, complete these steps in your [AdMob console](https://apps.admob.com):

- [ ] Create Android and iOS apps in AdMob
- [ ] Note the **App ID** (`~`) for each platform — goes in `app.json`
- [ ] Create ad units for each format (Banner, Interstitial, Rewarded) per platform
- [ ] Note the **Ad Unit IDs** (`/`) for each — goes in `.env` and EAS secrets
- [ ] Set up AdMob app-ads.txt on your domain (if applicable)
- [ ] Review AdMob policies: no self-clicking, no incentivizing banner clicks
- [ ] Test with test IDs during development — **never real IDs in `__DEV__` mode**

---

## 12. Testing Strategy

### Test IDs

The `adUnits.ts` helper automatically uses Google's official test IDs in dev mode:

```
Banner:       ca-app-pub-3940256099942544/9214589741
Interstitial: ca-app-pub-3940256099942544/1033173712
Rewarded:     ca-app-pub-3940256099942544/5224354917
```

### What to verify before shipping

1. **Free user flow** — ads appear on all planned screens
2. **Pro user flow** — no ads appear anywhere
3. **Ad failure** — disable network, confirm `AdBanner` collapses gracefully (returns `null`)
4. **Rewarded ad** — complete a rewarded ad, confirm credits are granted via the edge function
5. **Interstitial cap** — trigger 6 actions, confirm the ad shows on action 3 and 6, not every time
6. **Orientation** — rotate device, confirm `ANCHORED_ADAPTIVE_BANNER` resizes correctly

---

## 13. Common Mistakes to Avoid

- **Never show ads to Pro users.** Check `isPro` before rendering any ad component.
- **Never click your own ads** during testing. Use test IDs instead.
- **Never grant credits client-side only.** Always confirm reward server-side via edge function.
- **Don't show interstitials on every action.** Use the frequency cap from Section 9.
- **Don't place banners inside FlatList items.** Place them once, below the list.
- **Keep `requestNonPersonalizedAdsOnly: true`** until you have a proper consent flow (GDPR/CCPA).
