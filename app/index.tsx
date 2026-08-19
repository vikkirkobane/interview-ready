import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth-store';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '../src/theme';

/**
 * Root index — redirects based on auth state.
 * Authenticated users → tabs, unauthenticated → welcome.
 */
export default function Index() {
  const { session, initialized, loading } = useAuthStore();

  if (!initialized || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.violet} />
      </View>
    );
  }

  if (session) {
    const isCompleted = session.user?.user_metadata?.onboarding_completed;
    if (!isCompleted) {
      return <Redirect href="/(onboarding)/referral-code" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgPrimary,
  },
});
