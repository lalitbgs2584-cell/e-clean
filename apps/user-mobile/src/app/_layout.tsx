import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession } from '../lib/auth-client';
import { useCitizenStore } from '../store/citizen-store';

SplashScreen.preventAutoHideAsync().catch(() => {});

const PUBLIC_ROUTES = new Set(['index', 'onboarding', 'login', 'location-permission']);

/**
 * Auth guard: watches the Better Auth session and redirects accordingly.
 *  - Not authenticated + protected screen → /login
 *  - Authenticated + auth screen          → /(tabs)/home
 *  - Session user is mirrored into the citizen store for screens
 *    that still read profile data from there.
 */
function AuthGuard() {
  const { data: session, isPending } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const { setProfile } = useCitizenStore();

  useEffect(() => {
    if (session?.user) {
      setProfile({
        name: session.user.name ?? '',
        email: session.user.email ?? '',
        avatarUrl: session.user.image ?? '',
      });
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (isPending) return; // still loading session from SecureStore

    const current = segments[0] ?? 'index';
    const isOnPublicScreen = PUBLIC_ROUTES.has(current);

    if (!session && !isOnPublicScreen) {
      router.replace('/login');
    } else if (session && isOnPublicScreen) {
      router.replace('/(tabs)/home');
    }
  }, [session, isPending, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="location-permission" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="report-details" />
        <Stack.Screen name="report-submitted" />
        <Stack.Screen name="report-tracking/[id]" />
        <Stack.Screen name="feedback/[id]" />
        <Stack.Screen name="map-view" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="help" />
        <Stack.Screen name="report-litterer/select-type" />
        <Stack.Screen name="report-litterer/capture" />
        <Stack.Screen name="report-litterer/details" />
        <Stack.Screen name="report-litterer/review" />
        <Stack.Screen name="report-litterer/submitted" />
      </Stack>
    </SafeAreaProvider>
  );
}
