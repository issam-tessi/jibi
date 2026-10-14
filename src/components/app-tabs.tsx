import { Tabs, TabList, TabSlot, TabTrigger, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { createContext, use, useRef, type ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientFill } from '@/components/gradient-fill';
import { Logo } from '@/components/logo';
import { GymIcon, InsightsIcon, PacksIcon, PrayerIcon, SettingsIcon, WorkoutsIcon } from '@/components/tab-icons';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Icon = ComponentType<{ color: string; strong?: boolean }>;

const TAB_W = 60;
const HOME_W = 76;
/** Room above the bar for the raised logo (the scroll view would clip anything outside it). */
const LIFT = 26;

/** Scrollable bottom bar of icon tabs with the jibi logo raised in the middle; the logo is Home. */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <BottomBar>
          <TabTrigger name="insights" href="/insights" asChild>
            <IconTab icon={InsightsIcon} label="Insights" />
          </TabTrigger>
          <TabTrigger name="gym" href="/gym" asChild>
            <IconTab icon={GymIcon} label="Gym" />
          </TabTrigger>
          <TabTrigger name="packs" href="/packs" asChild>
            <IconTab icon={PacksIcon} label="Packs" />
          </TabTrigger>
          <TabTrigger name="index" href="/" asChild>
            <HomeTab />
          </TabTrigger>
          <TabTrigger name="prayer" href="/prayer" asChild>
            <IconTab icon={PrayerIcon} label="Prayer" />
          </TabTrigger>
          <TabTrigger name="workouts" href="/workouts" asChild>
            <IconTab icon={WorkoutsIcon} label="Workouts" />
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <IconTab icon={SettingsIcon} label="Settings" />
          </TabTrigger>
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

/** Lets the focused tab scroll itself into the middle of the bar. */
const RevealContext = createContext<(x: number, width: number) => void>(() => {});

function BottomBar({ children, style, ...props }: TabListProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const viewport = useRef(0);
  const reveal = (x: number, width: number) =>
    scroller.current?.scrollTo({ x: Math.max(0, x + width / 2 - viewport.current / 2), animated: true });

  return (
    <View {...props} style={styles.bar} pointerEvents="box-none">
      <View
        style={[
          styles.background,
          { top: LIFT, backgroundColor: theme.card, borderColor: theme.border },
        ]}>
        <GradientFill from={theme.card} to={theme.cardTint} />
      </View>
      <RevealContext value={reveal}>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => (viewport.current = e.nativeEvent.layout.width)}
          contentContainerStyle={[styles.row, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
          {children}
        </ScrollView>
      </RevealContext>
    </View>
  );
}

function IconTab({ icon: Icon, label, isFocused, ...props }: TabTriggerSlotProps & { icon: Icon; label: string }) {
  const theme = useTheme();
  const reveal = use(RevealContext);
  const color = isFocused ? theme.text : theme.textMuted;
  return (
    <Pressable
      {...props}
      onLayout={(e) => isFocused && reveal(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <Icon color={color} strong={isFocused} />
      <View style={[styles.dot, { backgroundColor: isFocused ? theme.accent : 'transparent' }]} />
    </Pressable>
  );
}

function HomeTab({ isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();
  const reveal = use(RevealContext);
  return (
    <Pressable
      {...props}
      // The bar opens scrolled so the logo sits in the middle (a focused tab after it then takes over).
      onLayout={(e) => reveal(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      accessibilityRole="tab"
      accessibilityLabel="Home"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.home, pressed && styles.homePressed]}>
      <View style={[styles.homeRing, { backgroundColor: theme.card, borderColor: isFocused ? theme.accent : theme.border }]}>
        <Logo size={52} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { height: '100%' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  background: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: LIFT,
    paddingHorizontal: Spacing.two,
  },
  tab: { width: TAB_W, height: BottomTabInset - Spacing.one, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  pressed: { opacity: 0.6 },
  home: { width: HOME_W, height: BottomTabInset - Spacing.one, alignItems: 'center', justifyContent: 'flex-start' },
  homeRing: {
    marginTop: -LIFT,
    padding: 4,
    borderRadius: 20,
    borderWidth: 2,
    shadowColor: '#2a1b8f',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  homePressed: { transform: [{ scale: 0.94 }] },
});
