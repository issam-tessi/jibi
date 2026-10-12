import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** iOS modal sheet: navigation bar with Cancel on the left and a centered title, grouped content below. */
export function Sheet({ title, children }: PropsWithChildren<{ title: string }>) {
  const theme = useTheme();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {Platform.OS !== 'web' && <View style={[styles.grabber, { backgroundColor: theme.backgroundSelected }]} />}
          <View style={[styles.navBar, { borderBottomColor: theme.border }]}>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button" style={styles.side}>
              <ThemedText style={{ color: theme.accent }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText style={styles.title} numberOfLines={1}>
              {title}
            </ThemedText>
            <View style={styles.side} />
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: 560 },
  flex: { flex: 1 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginTop: 6 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { width: 72 },
  title: { flex: 1, textAlign: 'center', fontWeight: 600 },
  content: { gap: Spacing.four, padding: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.six },
});
