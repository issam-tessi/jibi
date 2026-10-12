import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { CategorySettings } from '@/components/category-settings';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, SectionTitle, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { usernameFromEmail } from '@/hooks/use-app-users';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { usePreferences } from '@/providers/preferences-provider';
import { usePrivacy } from '@/providers/privacy-provider';

export default function SettingsScreen() {
  const { session } = useAuth();
  const { appearance, homeView, weekStart, setPreference, reset } = usePreferences();

  return (
    <Screen>
      <SectionTitle title="Appearance" />
      <Card style={styles.section}>
        <Setting label="Theme">
          <Segmented
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={appearance}
            onChange={(v) => setPreference('appearance', v)}
          />
        </Setting>
      </Card>

      <CategorySettings />

      <SectionTitle title="Home" />
      <Card style={styles.section}>
        <Setting label="Open on" hint="The Activity view Home starts with.">
          <Segmented
            options={[
              { value: 'recent', label: 'Recent' },
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            value={homeView}
            onChange={(v) => setPreference('homeView', v)}
          />
        </Setting>
        <Setting label="Week starts on">
          <Segmented
            options={[
              { value: '1', label: 'Monday' },
              { value: '0', label: 'Sunday' },
            ]}
            value={String(weekStart) as '0' | '1'}
            onChange={(v) => setPreference('weekStart', v === '0' ? 0 : 1)}
          />
        </Setting>
      </Card>

      <PrivacySetting />

      <SectionTitle title="Account" />
      <Card style={styles.section}>
        <ThemedText type="small" themeColor="textSecondary">
          Signed in as <ThemedText type="smallBold">{usernameFromEmail(session?.user.email)}</ThemedText>
        </ThemedText>
        <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
      </Card>

      <Button title="Reset appearance & Home settings" variant="danger" onPress={reset} />
    </Screen>
  );
}

function Setting({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.setting}>
      <View style={styles.settingHeader}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {hint && (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        )}
      </View>
      {children}
    </View>
  );
}

function PrivacySetting() {
  const theme = useTheme();
  const { enabled, locked, available, enable, disable, lock } = usePrivacy();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setBusy(true);
    setMessage(null);
    const ok = next ? await enable() : await disable();
    setBusy(false);
    if (!ok) setMessage(next ? 'Face ID was cancelled or isn’t available.' : 'Face ID is needed to turn the lock off.');
  }

  return (
    <>
      <SectionTitle title="Privacy" />
      <Card style={styles.section}>
        <View style={styles.privacyRow}>
          <View style={styles.settingText}>
            <ThemedText type="smallBold">👁️ Hide balances with Face ID</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {available
                ? 'Hides your Card, Cash and Savings totals until you tap the eye. Hides again when you leave the app.'
                : 'This device or browser doesn’t support Face ID / fingerprint unlock.'}
            </ThemedText>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggle}
            disabled={busy || (!available && !enabled)}
            trackColor={{ true: theme.accent }}
            accessibilityLabel="Hide balances with Face ID"
          />
        </View>
        {enabled && !locked && <Button title="Hide balances now" variant="secondary" onPress={lock} />}
        {message && (
          <ThemedText type="small" style={{ color: theme.expense }}>
            {message}
          </ThemedText>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three },
  setting: { gap: Spacing.two },
  settingHeader: { gap: Spacing.half },
  settingText: { flex: 1, gap: Spacing.half },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
