import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientFill } from '@/components/gradient-fill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Shell for modal screens: title + close button, scrollable body. */
export function Sheet({ title, children }: PropsWithChildren<{ title: string }>) {
  const theme = useTheme();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <ThemedView style={styles.container}>
      <GradientFill from={theme.background} to={theme.backgroundTint} angle="diagonal" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <ThemedText type="smallBold" style={styles.title}>
              {title}
            </ThemedText>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <ThemedText themeColor="textSecondary">Cancel</ThemedText>
            </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  title: { flex: 1, fontSize: 17 },
  content: { gap: Spacing.four, paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
});
