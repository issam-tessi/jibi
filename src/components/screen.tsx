import { useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceCard } from '@/components/balance-card';
import { GradientFill } from '@/components/gradient-fill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCigarettes } from '@/providers/cigarette-provider';
import { useFinance } from '@/providers/finance-provider';
import { useGym } from '@/providers/gym-provider';

const PULL_TRIGGER = 70;
const PULL_MAX = 110;

/**
 * Tab screen shell: a pinned header (the balance card unless a tab brings its own) above scrolling content,
 * clear of the bottom tab bar. Pull down to reload.
 */
export function Screen({ children, header }: PropsWithChildren<{ header?: ReactNode }>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const finance = useFinance();
  const cigarettes = useCigarettes();
  const gym = useGym();
  const [refreshing, setRefreshing] = useState(false);

  async function reload() {
    setRefreshing(true);
    try {
      await Promise.all([finance.refresh(), cigarettes.refresh(), gym.refresh()]);
    } finally {
      setRefreshing(false);
    }
  }

  const pull = useWebPull(reload, refreshing);

  return (
    <ThemedView style={styles.container}>
      <GradientFill from={theme.background} to={theme.backgroundTint} angle="diagonal" />
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        {header !== null && <View style={styles.header}>{header === undefined ? <BalanceCard /> : header}</View>}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.five }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            Platform.OS === 'web' ? undefined : (
              <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={theme.textSecondary} />
            )
          }
          {...pull.handlers}>
          {Platform.OS === 'web' && (pull.distance > 0 || refreshing) && (
            <View style={[styles.pull, { height: refreshing ? 48 : pull.distance }]}>
              {refreshing ? (
                <ActivityIndicator color={theme.textSecondary} />
              ) : (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={{ transform: [{ rotate: pull.distance >= PULL_TRIGGER ? '180deg' : '0deg' }] }}>
                  ↓
                </ThemedText>
              )}
            </View>
          )}
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Pull-to-refresh for web (RefreshControl is a no-op there): drag down from the top of the list. */
function useWebPull(onRefresh: () => void, refreshing: boolean) {
  const [distance, setDistance] = useState(0);
  const scrollY = useRef(0);
  const startY = useRef<number | null>(null);

  if (Platform.OS !== 'web') return { distance: 0, handlers: {} };

  const y = (e: GestureResponderEvent) => e.nativeEvent.touches[0]?.pageY ?? 0;
  return {
    distance,
    handlers: {
      onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      },
      scrollEventThrottle: 16,
      onTouchStart: (e: GestureResponderEvent) => {
        startY.current = scrollY.current <= 0 && !refreshing ? y(e) : null;
      },
      onTouchMove: (e: GestureResponderEvent) => {
        if (startY.current === null) return;
        const dy = y(e) - startY.current;
        setDistance(dy > 0 ? Math.min(PULL_MAX, dy * 0.5) : 0);
      },
      onTouchEnd: () => {
        if (startY.current !== null && distance >= PULL_TRIGGER) onRefresh();
        startY.current = null;
        setDistance(0);
      },
    },
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  pull: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: -Spacing.three },
});
