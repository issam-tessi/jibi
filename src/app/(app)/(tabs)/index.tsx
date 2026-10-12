import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EntryRow } from '@/components/entry-row';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useFinance, type Entry } from '@/providers/finance-provider';

type EntryType = 'income' | 'expense' | 'transfer';

export default function HomeScreen() {
  const { activity, unsorted, balances, error, loading } = useFinance();
  const unsortedTotal = unsorted.reduce((s, e) => s - e.amount_cents, 0);
  const openEntry = (e: Entry) => router.push({ pathname: '/edit/[id]', params: { id: e.id } });

  return (
    <Screen>
      <View style={styles.actions}>
        <ActionButton type="income" icon="＋" label="Add money" />
        <ActionButton type="expense" icon="−" label="Payment" />
        <ActionButton type="transfer" icon="⇄" label="Move" />
      </View>

      {error && <ThemedText type="small">{error}</ThemedText>}

      {unsorted.length > 0 && (
        <>
          <SectionTitle
            title={`To sort · ${unsorted.length}`}
            right={
              <ThemedText type="small" themeColor="textSecondary">
                {formatMoney(unsortedTotal, balances.currency)}
              </ThemedText>
            }
          />
          <Card style={styles.list}>
            <ThemedText type="small" themeColor="textSecondary">
              Tap a payment to give it a category, so your stats stay accurate.
            </ThemedText>
            {unsorted.map((e) => (
              <EntryRow key={e.id} entry={e} onPress={() => openEntry(e)} />
            ))}
          </Card>
        </>
      )}

      <SectionTitle title="Activity" />
      {!loading && activity.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Nothing yet. Start with “Add money” to set your balance.
          </ThemedText>
        </Card>
      ) : (
        groupByDay(activity).map(([day, entries]) => (
          <View key={day} style={styles.day}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.dayLabel}>
              {formatDay(day)}
            </ThemedText>
            <Card style={styles.list}>
              {entries.map((e) => (
                <EntryRow key={e.id} entry={e} onPress={() => openEntry(e)} />
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

function ActionButton({ type, icon, label }: { type: EntryType; icon: string; label: string }) {
  const theme = useTheme();
  const tint = type === 'income' ? theme.income : type === 'expense' ? theme.expense : theme.savings;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push({ pathname: '/entry', params: { type } })}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.actionIcon, { backgroundColor: tint }]}>
        <ThemedText style={styles.actionIconText}>{icon}</ThemedText>
      </View>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function groupByDay(entries: Entry[]) {
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = groups.get(e.occurred_on) ?? [];
    list.push(e);
    groups.set(e.occurred_on, list);
  }
  return [...groups.entries()];
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: { color: '#ffffff', fontSize: 20, lineHeight: 24, fontWeight: 700 },
  pressed: { opacity: 0.7 },
  list: { paddingVertical: Spacing.two, gap: Spacing.one },
  day: { gap: Spacing.one },
  dayLabel: { paddingHorizontal: Spacing.one },
});
