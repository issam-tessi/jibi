import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, toISODate } from '@/lib/dates';
import type { HistoryAction } from '@/lib/history';
import { useFinance } from '@/providers/finance-provider';

export default function HistoryScreen() {
  const { history, undo, redo } = useFinance();
  const theme = useTheme();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: HistoryAction) {
    setBusy(action.groupId);
    setError(null);
    const err = await (action.undone ? redo : undo)(action.groupId);
    setBusy(null);
    if (err) setError(err);
  }

  const byDay = new Map<string, HistoryAction[]>();
  for (const a of history) {
    const day = toISODate(new Date(a.at));
    byDay.set(day, [...(byDay.get(day) ?? []), a]);
  }

  return (
    <Sheet title="History">
      <ThemedText type="small" themeColor="textSecondary">
        Every change you make is listed here. Undo restores things as they were; Redo puts the change back. Making a new
        change clears what can be redone.
      </ThemedText>
      {error && (
        <ThemedText type="small" style={{ color: theme.expense }}>
          {error}
        </ThemedText>
      )}
      {history.length === 0 && (
        <ThemedText themeColor="textSecondary">Nothing yet — your changes will show up here.</ThemedText>
      )}
      {[...byDay.entries()].map(([day, actions]) => (
        <View key={day} style={styles.day}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.dayLabel}>
            {formatDay(day)}
          </ThemedText>
          <Card style={styles.list}>
            {actions.map((a) => (
              <View key={a.groupId} style={[styles.row, a.undone && styles.undone]}>
                <View style={[styles.icon, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText style={styles.iconText}>{a.icon}</ThemedText>
                </View>
                <View style={styles.info}>
                  <ThemedText
                    type="smallBold"
                    numberOfLines={1}
                    style={a.undone && { textDecorationLine: 'line-through' }}>
                    {a.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {new Date(a.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    {a.detail ? ` · ${a.detail}` : ''}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => run(a)}
                  disabled={busy != null}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.undone ? 'Redo' : 'Undo'} ${a.title}`}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: a.undone ? theme.text : theme.backgroundElement },
                    (pressed || busy === a.groupId) && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: a.undone ? theme.background : theme.text }}>
                    {busy === a.groupId ? '…' : a.undone ? '↷ Redo' : '↶ Undo'}
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  day: { gap: Spacing.one },
  dayLabel: { paddingHorizontal: Spacing.one },
  list: { paddingVertical: Spacing.two, gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  undone: { opacity: 0.55 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 16, lineHeight: 20 },
  info: { flex: 1 },
  button: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Radius.small },
  pressed: { opacity: 0.6 },
});
