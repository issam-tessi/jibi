import { Tabs, TabList, TabSlot, TabTrigger, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientFill } from '@/components/gradient-fill';
import { Logo } from '@/components/logo';
import { GymIcon, InsightsIcon, ModulesIcon, SettingsIcon } from '@/components/tab-icons';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Icon = ComponentType<{ color: string; strong?: boolean }>;

/** Bottom bar: four icon tabs with the jibi logo raised in the middle; the logo is Home. */
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
          <TabTrigger name="index" href="/" asChild>
            <HomeTab />
          </TabTrigger>
          <TabTrigger name="modules" href="/modules" asChild>
            <IconTab icon={ModulesIcon} label="Modules" />
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <IconTab icon={SettingsIcon} label="Settings" />
          </TabTrigger>
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

function BottomBar({ children, style, ...props }: TabListProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      {...props}
      style={[
        styles.bar,
        { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: Math.max(insets.bottom, Spacing.two) },
      ]}>
      <GradientFill from={theme.card} to={theme.cardTint} />
      <View style={styles.row}>{children}</View>
    </View>
  );
}

function IconTab({ icon: Icon, label, isFocused, ...props }: TabTriggerSlotProps & { icon: Icon; label: string }) {
  const theme = useTheme();
  const color = isFocused ? theme.text : theme.textMuted;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      hitSlop={6}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <Icon color={color} strong={isFocused} />
      <View style={[styles.dot, { backgroundColor: isFocused ? theme.accent : 'transparent' }]} />
    </Pressable>
  );
}

function HomeTab({ isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();
  return (
    <Pressable
      {...props}
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
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: BottomTabInset - Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, height: '100%' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  pressed: { opacity: 0.6 },
  home: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', height: '100%' },
  homeRing: {
    marginTop: -26,
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
