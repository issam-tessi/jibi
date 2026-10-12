import { Stack } from 'expo-router';

import { FinanceProvider } from '@/providers/finance-provider';

export default function AppLayout() {
  return (
    <FinanceProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entry" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="category/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ presentation: 'modal' }} />
      </Stack>
    </FinanceProvider>
  );
}
