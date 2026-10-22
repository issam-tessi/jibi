import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { CigaretteProvider } from '@/providers/cigarette-provider';
import { FinanceProvider } from '@/providers/finance-provider';
import { GymProvider } from '@/providers/gym-provider';
import { PanicProvider, usePanicActive } from '@/providers/panic-provider';
import { PrayerProvider } from '@/providers/prayer-provider';
import { WorkoutProvider } from '@/providers/workout-provider';
import { PrivacyProvider } from '@/providers/privacy-provider';

export default function AppLayout() {
  return (
    <FinanceProvider>
      <CigaretteProvider>
      <GymProvider>
      <PrayerProvider>
      <WorkoutProvider>
      <PrivacyProvider>
      <PanicProvider>
      <PanicStatusBar />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="category/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ presentation: 'modal' }} />
        <Stack.Screen name="smoke" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout" options={{ presentation: 'modal' }} />
        <Stack.Screen name="panic" options={{ presentation: 'modal' }} />
      </Stack>
      </PanicProvider>
      </PrivacyProvider>
      </WorkoutProvider>
      </PrayerProvider>
      </GymProvider>
      </CigaretteProvider>
    </FinanceProvider>
  );
}

/** Panic mode is always dark, so the status bar needs light content whatever the system theme. */
function PanicStatusBar() {
  return usePanicActive() ? <StatusBar style="light" /> : null;
}
