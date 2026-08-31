import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../src/stores/auth-store';
import { Colors } from '../src/theme';
import LandingPage from '../src/components/landing/LandingPage';

/**
 * Root index — Displays the marketing landing page with direct
 * "Get Started" / "Sign In" / "Go to Dashboard" navigation actions.
 */
export default function Index() {
  const { initialized, loading } = useAuthStore();

  if (!initialized || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.violet} />
      </View>
    );
  }

  return <LandingPage />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgPrimary,
  },
});
