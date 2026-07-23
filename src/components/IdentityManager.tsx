import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useAuthStore } from '../stores/auth-store';
import { Button } from './ui/Button';
import { Typography, Spacing, Radius } from '../theme';
import { useNotificationStore } from '../stores/notification-store';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

declare const window: any;

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

  const { addNotification } = useNotificationStore();

  const loadIdentities = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userIdentities = await getUserIdentities();
      setIdentities(userIdentities.data || []);
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

  const handleLinkIdentity = async (provider: string) => {
    try {
      setLinkingProviders(prev => ({ ...prev, [provider]: true }));

      await linkIdentity(provider);

      Toast.show({
        type: 'success',
        text1: 'Account linked successfully!',
        text2: `${provider.charAt(0).toUpperCase() + provider.slice(1)} has been linked to your account.`
      });

      // Reload identities after linking
      await loadIdentities();

      addNotification({
        title: 'Account Linked',
        description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} has been successfully linked to your account.`,
        type: 'success',
      });
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
      import('react-native').then(({ Alert }) => {
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
      });
    }
  };

  const unlinkIdentityInternal = async (identityId: string, provider: string) => {
    try {
      await unlinkIdentity(identityId);

      Toast.show({
        type: 'success',
        text1: 'Account unlinked successfully!',
        text2: `${provider.charAt(0).toUpperCase() + provider.slice(1)} has been removed from your account.`
      });

      // Reload identities after unlinking
      await loadIdentities();

      addNotification({
        title: 'Account Unlinked',
        description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} has been successfully removed from your account.`,
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
    switch (provider.toLowerCase()) {
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
    switch (provider.toLowerCase()) {
      case 'google':
        return 'Google';
      case 'linkedin':
        return 'LinkedIn';
      case 'github':
        return 'GitHub';
      case 'email':
        return 'Email';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: '#6B7280' }]}>Loading linked accounts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: '#111827' }]}>Linked Accounts</Text>
        <Text style={[styles.subtitle, { color: '#6B7280' }]}>
          Manage your connected authentication providers
        </Text>
      </View>

      <View style={styles.identityList}>
        {identities.map((identity) => (
          <View key={identity.id} style={[styles.identityCard, { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }]}>
            <View style={styles.identityInfo}>
              <View style={[styles.providerIcon, { backgroundColor: '#F3F4F6' }]}>
                {getProviderIcon(identity.provider)}
              </View>
              <View style={styles.identityDetails}>
                <Text style={[styles.identityProvider, { color: '#111827' }]}>
                  {getProviderDisplayName(identity.provider)}
                </Text>
                {identity.identity_data.email && (
                  <Text style={[styles.identityEmail, { color: '#6B7280' }]}>
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
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: '#6B7280' }]}>
              No linked accounts yet. Connect additional providers for easier sign-in.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.linkOptions}>
        <Text style={[styles.sectionTitle, { color: '#111827' }]}>Link New Account</Text>

        <View style={styles.providerButtons}>
          {!identities.some(i => i.provider === 'google') && (
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

          {!identities.some(i => i.provider === 'linkedin') && (
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
    backgroundColor: '#F9FAFB',
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