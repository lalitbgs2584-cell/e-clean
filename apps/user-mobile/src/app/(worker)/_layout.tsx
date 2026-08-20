import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useSession } from '@/lib/auth-client';

/**
 * Worker route-group layout.
 * Provides an additional role guard so that even if a citizen somehow reaches
 * a /(worker)/* URL (e.g. via deep link), they are redirected back to citizen home.
 */
export default function WorkerLayout() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.replace('/login');
      return;
    }

    const role = (session.user as any)?.role ?? 'CITIZEN';
    if (role !== 'WORKER') {
      router.replace('/(tabs)/home');
    }
  }, [session, isPending]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="task/[id]/index" />
      <Stack.Screen name="task/[id]/progress" />
      <Stack.Screen name="task/[id]/completed" />
    </Stack>
  );
}
