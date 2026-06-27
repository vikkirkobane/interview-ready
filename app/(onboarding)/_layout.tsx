import { Stack, useRouter } from 'expo-router';
import { Typography, Spacing, useTheme } from '../../src/theme';
import { TouchableOpacity, Text, View, StyleSheet, Image } from 'react-native';
import { useNavigationStore } from '../../src/stores/navigation-store';
import { SideMenu } from '../../src/components/ui/SideMenu';
import { Ionicons } from '@expo/vector-icons';

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
          <TouchableOpacity 
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
          </TouchableOpacity>
        ),
        headerTitle: '',
        headerRight: () => (
          <TouchableOpacity style={styles.headerRight} onPress={() => router.push('/(tabs)/settings')}>
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        ),
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
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
