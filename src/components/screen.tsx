import { useRef, useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BalanceCard } from '@/components/balance-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCigarettes } from '@/providers/cigarette-provider';
import { useFinance } from '@/providers/finance-provider';

const PULL_TRIGGER = 70;
const PULL_MAX = 110;

/** Tab screen shell: the balance card stays pinned at the top while the content scrolls beneath it. Pull down to reload. */
export function Screen({ children }: PropsWithChildren) {
  const theme = useTheme();
  const finance = useFinance();
  const cigarettes = useCigarettes();
  const [refreshing, setRefreshing] = useState(false);

  async function reload() {
    setRefreshing(true);
    try {
      await Promise.all([finance.refresh(), cigarettes.refresh()]);
    } finally {
      setRefreshing(false);
    }
  }

  const pull = useWebPull(reload, refreshing);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.header}>
          <BalanceCard />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
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
    // Web shows its tab bar at the top of the page.
    paddingTop: Platform.OS === 'web' ? 88 : Spacing.two,
    paddingBottom: Spacing.two,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  pull: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: -Spacing.three },
});
