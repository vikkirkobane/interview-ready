import { Stack } from 'expo-router';
import { Colors } from '../../src/theme/tokens';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bgPrimary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="callback" options={{ animation: 'none' }} />
    </Stack>
  );
}
