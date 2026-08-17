import { useAuthStore } from '../../src/stores/auth-store';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { useResumeStore } from '../../src/stores/resume-store';
import { useDashboardStore } from '../../src/stores/dashboard-store';
import { useNotificationStore } from '../../src/stores/notification-store';
import { useUIStore } from '../../src/stores/ui-store';
import { useNavigationStore } from '../../src/stores/navigation-store';
import { usePreviewStore } from '../../src/store/previewStore';
import { _resetCodeExchangeCache } from '../../src/lib/auth-code-exchange';
import type { Session } from '@supabase/supabase-js';

/** Reset every zustand store back to a clean, signed-out, not-onboarded state. */
export function resetAllStores() {
  _resetCodeExchangeCache();
  useAuthStore.setState({
    session: null,
    user: null,
    loading: false,
    initialized: true,
    pendingOAuthCallback: false,
  });
  useOnboardingStore.getState().resetOnboarding();
  useProfileStore.setState({ profile: null, loading: false, error: null });
  useResumeStore.setState({
    resumes: [],
    currentResume: null,
    generatingResumeId: null,
    loading: false,
  });
  useDashboardStore.setState({
    stats: null,
    recentActions: [],
    loading: false,
    lastRefreshTime: null,
  });
  useNotificationStore.getState().reset();
  useUIStore.setState({
    isDark: true,
    notificationsEnabled: true,
    isAnalyzing: false,
    isGeneratingResume: false,
    isGeneratingCoverLetter: false,
    showUpgradeModal: false,
    showExportSheet: false,
    interstitialActionCount: 0,
  });
  useNavigationStore.setState({ isMenuOpen: false });
  usePreviewStore.getState().clearPreview();
}

/** Set an authenticated session with the given user metadata. */
export function mockLoggedInSession(
  supabase: any,
  session: Session
) {
  supabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  supabase.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
  useAuthStore.setState({ session, user: session.user, loading: false, initialized: true });
  return session;
}
