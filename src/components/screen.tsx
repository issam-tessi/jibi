import type { PropsWithChildren, ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BalanceCard } from '@/components/balance-card';
import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * iOS-style tab screen: large title, the Wallet-style balance card pinned underneath,
 * and grouped content scrolling below.
 */
export function Screen({ title, accessory, children }: PropsWithChildren<{ title: string; accessory?: ReactNode }>) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={styles.title}>
              {title}
            </ThemedText>
            {accessory}
            <Logo size={34} />
          </View>
          <BalanceCard />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === 'web' ? Spacing.four : Spacing.one,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { flex: 1 },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    // Web has a floating tab bar at the bottom; native tabs report their own inset.
    paddingBottom: (Platform.OS === 'web' ? 96 : BottomTabInset) + Spacing.five,
  },
});
