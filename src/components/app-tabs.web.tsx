import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

import { MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type Icon = 'home' | 'pie_chart' | 'category';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="home">Home</TabButton>
          </TabTrigger>
          <TabTrigger name="insights" href="/insights" asChild>
            <TabButton icon="pie_chart">Insights</TabButton>
          </TabTrigger>
          <TabTrigger name="categories" href="/categories" asChild>
            <TabButton icon="category">Categories</TabButton>
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: Icon }) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : '#8e8e93';
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <SymbolView name={{ ios: 'circle', web: icon }} tintColor={color} size={26} />
      <ThemedText style={[styles.label, { color }]}>{children}</ThemedText>
    </Pressable>
  );
}

/** Frosted, iOS-style bottom tab bar. */
function TabBar(props: TabListProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  return (
    <View {...props} style={styles.container}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: scheme === 'dark' ? 'rgba(22,22,24,0.78)' : 'rgba(249,249,249,0.82)',
            borderTopColor: theme.border,
          },
        ]}>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: {
    width: '100%',
    maxWidth: MaxContentWidth + 32,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    paddingBottom: 22,
    // Translucent blur like the iOS tab bar.
    backdropFilter: 'saturate(180%) blur(20px)',
  } as object,
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontSize: 10, lineHeight: 12, fontWeight: 500, letterSpacing: 0.1 },
  pressed: { opacity: 0.6 },
});
