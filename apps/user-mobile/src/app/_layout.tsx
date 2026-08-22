import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ModalProvider } from "@/components/ui/ModalProvider";
import { useSession } from "../lib/auth-client";
import { useCitizenStore } from "../store/citizen-store";

SplashScreen.preventAutoHideAsync().catch(() => {});

const PUBLIC_ROUTES = new Set([
  "index",
  "onboarding",
  "login",
  "location-permission",
]);

/**
 * Auth guard: watches the Better Auth session and redirects by role.
 *
 *  - Not authenticated + protected screen → /login
 *  - Authenticated CITIZEN + public screen → /(tabs)/home
 *  - Authenticated WORKER  + public screen → /(worker)/(tabs)/home
 *  - Authenticated AUTHORITY               → /(tabs)/home is not appropriate;
 *    the worker layout handles this gracefully with an access message.
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
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        avatarUrl: session.user.image ?? "",
      });
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (isPending) return; // still loading session from SecureStore

    const current: string = (segments[0] as string) ?? "index";
    const isOnPublicScreen = PUBLIC_ROUTES.has(current);
    const isOnWorkerScreen = current === "(worker)";
    const isOnCitizenTabsScreen = current === "(tabs)";

    if (!session && !isOnPublicScreen) {
      // Not authenticated → send to login
      router.replace("/login");
      return;
    }

    if (session && isOnPublicScreen) {
      const role = (session.user as any)?.role ?? "CITIZEN";
      if (role === "WORKER") {
        router.replace("/(worker)/(tabs)/home" as any);
      } else {
        // CITIZEN and AUTHORITY both land here
        router.replace("/(tabs)/home");
      }
      return;
    }

    // Prevent a logged-in WORKER from accidentally navigating citizen tabs
    if (session && isOnCitizenTabsScreen) {
      const role = (session.user as any)?.role ?? "CITIZEN";
      if (role === "WORKER") {
        router.replace("/(worker)/(tabs)/home" as any);
      }
      return;
    }

    // Prevent a logged-in CITIZEN from accessing worker routes
    if (session && isOnWorkerScreen) {
      const role = (session.user as any)?.role ?? "CITIZEN";
      if (role === "CITIZEN") {
        router.replace("/(tabs)/home");
      }
    }
  }, [session, isPending, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ModalProvider>
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="location-permission" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(worker)" />
          <Stack.Screen name="report-details" />
          <Stack.Screen name="report-submitted" />
          <Stack.Screen name="report-tracking/[id]" />
          <Stack.Screen name="community-vote/[id]" />
          <Stack.Screen name="feedback/[id]" />
          <Stack.Screen name="map-view" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="help" />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="report-litterer/select-type" />
          <Stack.Screen name="report-litterer/capture" />
          <Stack.Screen name="report-litterer/details" />
          <Stack.Screen name="report-litterer/review" />
          <Stack.Screen name="report-litterer/submitted" />
        </Stack>
      </ModalProvider>
    </SafeAreaProvider>
  );
}
