import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EyeIcon } from '@/components/eye-icon';
import { GradientFill } from '@/components/gradient-fill';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Logo } from '@/components/logo';
import { Button, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAppUsers, type AppUser } from '@/hooks/use-app-users';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

const MIN_PASSWORD_LENGTH = 6;

const LAST_USER_KEY = 'jibi.lastUser';
/** Muted avatar colors, assigned by position in the list. */
const AVATAR_COLORS = ['#5B6B8C', '#B07A55', '#5E8A6E', '#A8677A', '#5D8AA8', '#B39A5B', '#7A6E9E', '#A86A5E'];

export default function SignInScreen() {
  const theme = useTheme();
  const { users, error, loading } = useAppUsers();
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [lastUser, setLastUser] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_USER_KEY).then(setLastUser).catch(() => {});
  }, []);

  const colorOf = (u: AppUser) => AVATAR_COLORS[Math.max(0, users.indexOf(u)) % AVATAR_COLORS.length];

  return (
    <ThemedView style={styles.container}>
      <GradientFill from={theme.background} to={theme.backgroundTint} angle="diagonal" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
          {selected ? (
            <PasswordStep user={selected} color={colorOf(selected)} onBack={() => setSelected(null)} />
          ) : (
            <>
              <View style={styles.brand}>
                <Logo size={72} />
                <ThemedText style={styles.wordmark}>jibi</ThemedText>
                <ThemedText themeColor="textSecondary">Who’s using jibi?</ThemedText>
              </View>

              {error && <ThemedText type="small">{error}</ThemedText>}
              {loading && users.length === 0 && <ActivityIndicator color={theme.textSecondary} />}

              <View style={styles.grid}>
                {users.map((u) => (
                  <UserTile
                    key={u.username}
                    user={u}
                    color={colorOf(u)}
                    last={u.username === lastUser}
                    onPress={() => setSelected(u)}
                  />
                ))}
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Avatar({ user, color, size }: { user: AppUser; color: string; size: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '1F', borderColor: color + '66' }]}>
      <ThemedText style={{ fontSize: size * 0.48, lineHeight: size * 0.6 }}>{user.icon}</ThemedText>
    </View>
  );
}

function UserTile({ user, color, last, onPress }: { user: AppUser; color: string; last: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${user.display_name}${user.has_password ? '' : ', new'}${last ? ', last signed in' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={[styles.ring, { borderColor: last ? theme.accent : 'transparent' }]}>
        <Avatar user={user} color={color} size={76} />
      </View>
      <ThemedText type="smallBold">{user.display_name}</ThemedText>
      {!user.has_password ? (
        <View style={[styles.badge, { backgroundColor: color }]}>
          <ThemedText style={styles.badgeText}>NEW</ThemedText>
        </View>
      ) : last ? (
        <ThemedText style={[styles.lastText, { color: theme.accent }]}>Last used</ThemedText>
      ) : (
        <View style={styles.badgeSpacer} />
      )}
    </Pressable>
  );
}

function PasswordStep({ user, color, onBack }: { user: AppUser; color: string; onBack: () => void }) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const { signIn, createProfile } = useAuth();
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
    if (user.cloud && !user.local) setMessage('Bringing your data over from the cloud… (one time)');
    const { error } = isSetup ? await createProfile(user.username, password) : await signIn(user.username, password);
    setBusy(false);
    if (error) return setMessage(error);
    await AsyncStorage.setItem(LAST_USER_KEY, user.username).catch(() => {});
    // On success the auth listener swaps the navigator to the app.
  }

  return (
    <>
      <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" style={styles.back}>
        <ThemedText type="small" themeColor="textSecondary">
          ‹ Not {user.display_name}?
        </ThemedText>
      </Pressable>

      <View style={styles.header}>
        <Avatar user={user} color={color} size={104} />
        <ThemedText type="subtitle">{user.display_name}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {isSetup
            ? 'First time here — choose a password.'
            : user.local
              ? 'Welcome back. Enter your password.'
              : 'First time on this device — use your usual password and your data comes along.'}
        </ThemedText>
      </View>

      <View style={styles.passwordRow}>
        <Input
          placeholder={isSetup ? 'New password' : 'Password'}
          secureTextEntry={!visible}
          autoFocus
          autoComplete={isSetup ? 'new-password' : 'current-password'}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={isSetup ? undefined : submit}
          style={styles.passwordInput}
        />
        <Pressable
          onPress={() => setVisible(!visible)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          style={styles.eye}>
          <EyeIcon closed={!visible} color={theme.textSecondary} size={20} />
        </Pressable>
      </View>
      {isSetup && (
        <Input
          placeholder="Confirm password"
          secureTextEntry={!visible}
          autoComplete="new-password"
          value={confirm}
          onChangeText={setConfirm}
          onSubmitEditing={submit}
        />
      )}

      {message && (
        <ThemedText type="small" style={[styles.center, { color: busy ? theme.textSecondary : theme.expense }]}>
          {message}
        </ThemedText>
      )}

      <Button title={busy ? 'One moment…' : isSetup ? 'Set password' : 'Sign in'} disabled={busy} onPress={submit} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  form: { width: '100%', maxWidth: 420, gap: Spacing.four },
  brand: { alignItems: 'center', gap: Spacing.one },
  wordmark: { fontSize: 30, lineHeight: 36, fontWeight: 700, letterSpacing: -0.5, marginTop: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: Spacing.two, rowGap: Spacing.four },
  tile: { width: 108, alignItems: 'center', gap: Spacing.one },
  ring: { borderWidth: 2, borderRadius: 999, padding: 3 },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: 1, borderRadius: 999 },
  badgeText: { color: '#ffffff', fontSize: 10, lineHeight: 14, fontWeight: 800, letterSpacing: 0.6 },
  lastText: { fontSize: 11, lineHeight: 16, fontWeight: 700 },
  badgeSpacer: { height: 16 },
  back: { alignSelf: 'flex-start' },
  header: { alignItems: 'center', gap: Spacing.two },
  center: { textAlign: 'center' },
  passwordRow: { justifyContent: 'center' },
  passwordInput: { paddingRight: 48 },
  eye: { position: 'absolute', right: Spacing.three },
  pressed: { opacity: 0.6 },
});
