import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { createContext, use, useRef } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Logo } from '@/components/logo';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="insights" href="/insights" asChild>
            <TabButton>Insights</TabButton>
          </TabTrigger>
          <TabTrigger name="categories" href="/categories" asChild>
            <TabButton>Categories</TabButton>
          </TabTrigger>
          <TabTrigger name="packs" href="/packs" asChild>
            <TabButton>Packs</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

/** Lets the active tab scroll itself into view in the scrollable bar. */
const RevealContext = createContext<(x: number, width: number) => void>(() => {});

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const reveal = use(RevealContext);
  return (
    <Pressable
      {...props}
      onLayout={(e) => isFocused && reveal(e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scroller = useRef<ScrollView>(null);
  const viewport = useRef(0);
  const reveal = (x: number, width: number) =>
    scroller.current?.scrollTo({ x: Math.max(0, x + width / 2 - viewport.current / 2), animated: true });

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <View style={styles.brand}>
          <Logo size={30} />
        </View>

        <RevealContext value={reveal}>
          <ScrollView
            ref={scroller}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={(e) => (viewport.current = e.nativeEvent.layout.width)}
            style={styles.scroller}
            contentContainerStyle={styles.tabs}>
            {props.children}
          </ScrollView>
        </RevealContext>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    borderRadius: Spacing.five,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brand: {
    flexShrink: 0,
  },
  scroller: {
    flex: 1,
    minWidth: 0,
  },
  // Right-aligned when everything fits, scrolls sideways when it doesn't.
  tabs: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
