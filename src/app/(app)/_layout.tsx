import { Stack } from 'expo-router';

import { CigaretteProvider } from '@/providers/cigarette-provider';
import { FinanceProvider } from '@/providers/finance-provider';
import { GymProvider } from '@/providers/gym-provider';
import { PrivacyProvider } from '@/providers/privacy-provider';

export default function AppLayout() {
  return (
    <FinanceProvider>
      <CigaretteProvider>
      <GymProvider>
      <PrivacyProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="category/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ presentation: 'modal' }} />
        <Stack.Screen name="smoke" options={{ presentation: 'modal' }} />
      </Stack>
      </PrivacyProvider>
      </GymProvider>
      </CigaretteProvider>
    </FinanceProvider>
  );
}
