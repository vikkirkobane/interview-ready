import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRewardedAd } from '../../lib/useRewardedAd';
import { useAuthStore } from '../../stores/auth-store';
import { supabase, supabaseUrl } from '../../lib/supabase';
import { useTheme, Spacing, Radius, Typography } from '../../theme';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

export function EarnCreditsButton() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const handleReward = useCallback(async (amount: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/credits-grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount: 5, source: 'rewarded_ad' }),
      });

      if (!response.ok) {
        throw new Error('Failed to grant credits');
      }

      Toast.show({
        type: 'success',
        text1: `+5 credits earned!`,
        text2: 'Watch another ad anytime to earn more.',
      });
    } catch (error) {
      console.error('[RewardedAd] Error granting credits:', error);
      Toast.show({
        type: 'error',
        text1: 'Credit Grant Failed',
        text2: 'There was an issue giving you your credits. Please try again.',
      });
    }
  }, []);

  const { showAd, loaded } = useRewardedAd({ onRewarded: handleReward });

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { 
          backgroundColor: loaded ? colors.primary : colors.bgSecondary,
          borderColor: loaded ? colors.primary : colors.border
        }
      ]} 
      onPress={showAd} 
      disabled={!loaded}
    >
      <Ionicons 
        name={loaded ? "play-circle" : "hourglass-outline"} 
        size={20} 
        color={loaded ? colors.textInverse : colors.textMuted} 
      />
      <Text style={[
        styles.text, 
        { color: loaded ? colors.textInverse : colors.textMuted }
      ]}>
        {loaded ? 'Watch Ad for 5 Credits' : 'Loading ad...'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  text: {
    ...Typography.label,
  },
});
