import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { useAuthStore } from '../stores/auth-store';
import { Button } from './ui/Button';
import { Typography, Spacing, Radius, useTheme } from '../theme';
import { useNotificationStore } from '../stores/notification-store';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

declare const window: any;

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  email: 'Email',
};

/** Map Supabase provider slugs (incl. linkedin_oidc) to a canonical label. */
const normalizeProvider = (provider: string) => {
  const key = (provider || '').toLowerCase();
  if (key === 'linkedin_oidc' || key === 'linkedin') return 'linkedin';
  return key;
};

interface Identity {
  id: string;
  identity_data: {
    email?: string;
    full_name?: string;
    provider?: string;
    avatar_url?: string;
  };
  provider: string;
  provider_id: string;
}

export const IdentityManager: React.FC = () => {
  const { user, linkIdentity, unlinkIdentity, getUserIdentities } = useAuthStore();
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingProviders, setLinkingProviders] = useState<Record<string, boolean>>({});

  const { colors } = useTheme();
  const { addNotification } = useNotificationStore();

  const extractIdentities = (userIdentities: any): Identity[] =>
    (userIdentities?.identities || userIdentities?.data || []) as Identity[];

  const loadIdentities = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userIdentities = await getUserIdentities();
      setIdentities(extractIdentities(userIdentities));
    } catch (error: any) {
      console.error('Error loading identities:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load linked accounts',
        text2: error.message || 'Please try again later'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadIdentities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waitForIdentity = async (provider: string) => {
    const normalized = normalizeProvider(provider);
    for (let i = 0; i < 12; i++) {
      const userIdentities = await getUserIdentities();
      const list = extractIdentities(userIdentities);
      setIdentities(list);
      if (list.some((identity) => normalizeProvider(identity.provider) === normalized)) {
        return true;
      }
      // Android delivers the link via an async deep-link exchange — poll until
      // the identity shows up (or time out after ~12s).
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
  };

  const handleLinkIdentity = async (provider: string) => {
    try {
      setLinkingProviders(prev => ({ ...prev, [provider]: true }));

      const { error } = await linkIdentity(provider);

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed to link account',
          text2: error,
        });
        return;
      }

      const linked = await waitForIdentity(provider);

      if (linked) {
        Toast.show({
          type: 'success',
          text1: 'Account linked successfully!',
          text2: `${getProviderDisplayName(provider)} has been linked to your account.`
        });

        addNotification({
          title: 'Account Linked',
          description: `${getProviderDisplayName(provider)} has been successfully linked to your account.`,
          type: 'success',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to link account',
          text2: 'The link did not complete. Please try again.',
        });
      }
    } catch (error: any) {
      console.error('Error linking identity:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to link account',
        text2: error.message || 'Please try again later'
      });
    } finally {
      setLinkingProviders(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleUnlinkIdentity = async (identityId: string, provider: string) => {
    const confirmUnlink = () => {
      unlinkIdentityInternal(identityId, provider);
    };

    if (Platform.OS === 'web') {
      if ((window as any).confirm(`Unlink ${provider.toUpperCase()} Account? This will remove the ability to sign in with this ${provider} account, but your data will remain.`)) {
        confirmUnlink();
      }
    } else {
      Alert.alert(
        `Unlink ${provider.toUpperCase()} Account`,
        `This will remove the ability to sign in with this ${provider} account, but your data will remain.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlink',
            style: 'destructive',
            onPress: confirmUnlink
          }
        ]
      );
    }
  };

  const unlinkIdentityInternal = async (identityId: string, provider: string) => {
    try {
      const { error } = await unlinkIdentity(identityId);

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Failed to unlink account',
          text2: error,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Account unlinked successfully!',
        text2: `${getProviderDisplayName(provider)} has been removed from your account.`
      });

      // Reload identities after unlinking
      await loadIdentities();

      addNotification({
        title: 'Account Unlinked',
        description: `${getProviderDisplayName(provider)} has been successfully removed from your account.`,
        type: 'info',
      });
    } catch (error: any) {
      console.error('Error unlinking identity:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to unlink account',
        text2: error.message || 'Please try again later'
      });
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (normalizeProvider(provider)) {
      case 'google':
        return <Ionicons name="logo-google" size={20} color="#DB4437" />;
      case 'linkedin':
        return <Ionicons name="logo-linkedin" size={20} color="#0077B5" />;
      case 'github':
        return <Ionicons name="logo-github" size={20} color="#333" />;
      case 'email':
        return <Ionicons name="mail-outline" size={20} color="#6B46FE" />;
      default:
        return <Ionicons name="person-outline" size={20} color="#6B46FE" />;
    }
  };

  const getProviderDisplayName = (provider: string) => {
    return PROVIDER_LABELS[normalizeProvider(provider)] ||
      provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading linked accounts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Linked Accounts</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Manage your connected authentication providers
        </Text>
      </View>

      <View style={styles.identityList}>
        {identities.map((identity) => (
          <View key={identity.id} style={[styles.identityCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <View style={styles.identityInfo}>
              <View style={[styles.providerIcon, { backgroundColor: colors.bgMuted }]}>
                {getProviderIcon(identity.provider)}
              </View>
              <View style={styles.identityDetails}>
                <Text style={[styles.identityProvider, { color: colors.textPrimary }]}>
                  {getProviderDisplayName(identity.provider)}
                </Text>
                {identity.identity_data.email && (
                  <Text style={[styles.identityEmail, { color: colors.textMuted }]}>
                    {identity.identity_data.email}
                  </Text>
                )}
              </View>
            </View>

            <Button
              title="Unlink"
              variant="ghost"
              size="sm"
              onPress={() => handleUnlinkIdentity(identity.id, identity.provider)}
              style={styles.unlinkButton}
              disabled={identities.length <= 1}
            />
          </View>
        ))}

        {identities.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No linked accounts yet. Connect additional providers for easier sign-in.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.linkOptions}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Link New Account</Text>

        <View style={styles.providerButtons}>
          {!identities.some(i => normalizeProvider(i.provider) === 'google') && (
            <Button
              title="Link Google"
              variant="outline"
              size="lg"
              icon={<Ionicons name="logo-google" size={18} color="#DB4437" />}
              onPress={() => handleLinkIdentity('google')}
              loading={linkingProviders.google}
              style={styles.providerButton}
            />
          )}

          {!identities.some(i => normalizeProvider(i.provider) === 'linkedin') && (
            <Button
              title="Link LinkedIn"
              variant="outline"
              size="lg"
              icon={<Ionicons name="logo-linkedin" size={18} color="#0077B5" />}
              onPress={() => handleLinkIdentity('linkedin')}
              loading={linkingProviders.linkedin}
              style={styles.providerButton}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.xl,
  },
  loadingContainer: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyMd,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.headingLg,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodyMd,
  },
  identityList: {
    marginBottom: Spacing.xl,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  identityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  identityDetails: {
    flex: 1,
  },
  identityProvider: {
    ...Typography.headingMd,
    fontWeight: '600',
  },
  identityEmail: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  unlinkButton: {
    marginLeft: Spacing.md,
  },
  emptyState: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  emptyText: {
    ...Typography.bodyMd,
    textAlign: 'center',
  },
  linkOptions: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.headingMd,
    marginBottom: Spacing.md,
  },
  providerButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  providerButton: {
    flex: 1,
    minWidth: 150,
  },
});