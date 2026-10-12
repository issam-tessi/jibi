import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Logo } from '@/components/logo';
import { Button, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { appUserEmail, useAppUsers, type AppUser } from '@/hooks/use-app-users';
import { supabase } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH = 6;

export default function SignInScreen() {
  const { users, error, loading } = useAppUsers();
  const [selected, setSelected] = useState<AppUser | null>(null);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          {selected ? (
            <PasswordStep user={selected} onBack={() => setSelected(null)} />
          ) : (
            <>
              <View style={styles.brand}>
                <Logo size={64} />
                <ThemedText type="title">Who are you?</ThemedText>
              </View>
              {error && <ThemedText type="small">{error}</ThemedText>}
              {loading && users.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Loading…
                </ThemedText>
              )}
              <View style={styles.grid}>
                {users.map((u) => (
                  <UserTile key={u.username} user={u} onPress={() => setSelected(u)} />
                ))}
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function UserTile({ user, onPress }: { user: AppUser; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={user.display_name}
      onPress={onPress}
      style={({ pressed }) => [styles.tileWrapper, pressed && styles.pressed]}>
      <View style={styles.tile}>
        <ThemedView type="card" style={styles.avatar}>
          <ThemedText style={styles.avatarIcon}>{user.icon}</ThemedText>
        </ThemedView>
        <ThemedText>{user.display_name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
          {user.has_password ? ' ' : 'New'}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function PasswordStep({ user, onBack }: { user: AppUser; onBack: () => void }) {
  const isSetup = !user.has_password;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setMessage(null);
    if (isSetup) {
      if (password.length < MIN_PASSWORD_LENGTH)
        return setMessage(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      if (password !== confirm) return setMessage("Passwords don't match.");
    }

    setBusy(true);
    const email = appUserEmail(user.username);
    const { data, error } = isSetup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      setMessage(error.message === 'Invalid login credentials' ? 'Wrong password.' : error.message);
    } else if (!data.session) {
      // Happens if "Confirm email" is still enabled in Supabase Auth settings.
      setMessage('Account created but not signed in: disable "Confirm email" in Supabase Auth.');
    }
    // On success the auth listener swaps the navigator to the app.
  }

  return (
    <>
      <Pressable onPress={onBack} hitSlop={8}>
        <ThemedText type="small" themeColor="textSecondary">
          ← Not {user.display_name}?
        </ThemedText>
      </Pressable>

      <View style={styles.header}>
        <ThemedText style={styles.icon}>{user.icon}</ThemedText>
        <ThemedText type="subtitle">{user.display_name}</ThemedText>
      </View>
      <ThemedText themeColor="textSecondary">
        {isSetup ? 'First time here — choose your password.' : 'Enter your password.'}
      </ThemedText>

      <Input
        placeholder={isSetup ? 'New password' : 'Password'}
        secureTextEntry
        autoFocus
        autoComplete={isSetup ? 'new-password' : 'current-password'}
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={isSetup ? undefined : submit}
      />
      {isSetup && (
        <Input
          placeholder="Confirm password"
          secureTextEntry
          autoComplete="new-password"
          value={confirm}
          onChangeText={setConfirm}
          onSubmitEditing={submit}
        />
      )}

      {message && <ThemedText type="small">{message}</ThemedText>}

      <Button title={isSetup ? 'Set password' : 'Sign in'} disabled={busy} onPress={submit} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  form: { width: '100%', maxWidth: 400, gap: Spacing.three },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.four, marginTop: Spacing.three },
  tileWrapper: { width: '50%' },
  tile: { alignItems: 'center', gap: 6 },
  brand: { alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
  } as object,
  avatarIcon: { fontSize: 48, lineHeight: 58 },
  caption: { fontSize: 13, lineHeight: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icon: { fontSize: 40, lineHeight: 48 },
  pressed: { opacity: 0.7 },
});
