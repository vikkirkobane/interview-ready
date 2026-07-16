import { Stack, useRouter } from 'expo-router';
import { Typography, Spacing, useTheme } from '../../src/theme';
import { Pressable,  Text, View, StyleSheet } from 'react-native';
import { useNavigationStore } from '../../src/stores/navigation-store';
import { SideMenu } from '../../src/components/ui/SideMenu';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

export default function OnboardingLayout() {
  const { openMenu } = useNavigationStore();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <>
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bgPrimary },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerLeft: () => (
          <Pressable 
            style={[styles.headerTitleContainer, { paddingLeft: Spacing.md }]}
            onPress={openMenu}
          >
            <View style={styles.menuIcon}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={{ width: 28, height: 28 }} 
                resizeMode="contain" 
              />
            </View>
            <Text style={[styles.headerTitleText, { color: colors.primary }]}>Interview Ready</Text>
          </Pressable>
        ),
        headerTitle: '',
        headerRight: () => (
          <Pressable style={styles.headerRight} onPress={() => router.push('/(tabs)/settings')}>
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
          </Pressable>
        ),
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="referral-code" />
      <Stack.Screen name="role" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="analyze" />
      <Stack.Screen name="resume" />
      <Stack.Screen name="discover" />
    </Stack>
    <SideMenu />
    </>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuIcon: {
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: {
    ...Typography.displayMd,
    fontSize: 20,
  },
  headerRight: {
    paddingRight: Spacing.lg,
  },
});
