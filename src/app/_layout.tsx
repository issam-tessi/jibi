import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { PreferencesProvider, usePreferences } from '@/providers/preferences-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <PreferencesProvider>
      <ThemedRoot />
    </PreferencesProvider>
  );
}

function ThemedRoot() {
  const colorScheme = useColorScheme();
  const { appearance } = usePreferences();

  // Push the override down to native so tab bars, switches and alerts follow it too.
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { ready } = usePreferences();

  useEffect(() => {
    if (!isLoading && ready) SplashScreen.hideAsync();
  }, [isLoading, ready]);

  if (isLoading || !ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
