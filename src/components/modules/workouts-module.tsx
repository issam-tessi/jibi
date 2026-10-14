import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/bar-chart';
import { ThemedText } from '@/components/themed-text';
import { Card, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDay, toISODate, today, weekStart } from '@/lib/dates';
import { formatKg, oneRepMax } from '@/lib/workouts';
import { usePreferences } from '@/providers/preferences-provider';
import { useWorkouts, type Workout } from '@/providers/workout-provider';

const WEEKS = 8;

const volumeOf = (w: Workout) => w.sets.reduce((s, x) => s + (x.weight_kg ?? 0) * x.reps, 0);

/** Sessions with exercises and sets: weekly volume, personal records and history. */
export function WorkoutsModule() {
  const theme = useTheme();
  const { workouts, error } = useWorkouts();
  const { weekStart: startsOn } = usePreferences();
  const [hasDraft, setHasDraft] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('jibi.workout.draft')
        .then((raw) => setHasDraft(!!raw && JSON.parse(raw).exercises?.length > 0))
        .catch(() => {});
    }, [])
  );

  const thisWeek = weekStart(today(), startsOn);
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(thisWeek, -7 * (WEEKS - 1 - i)));
  const perWeek = new Map<string, { volume: number; sessions: number; sets: number }>();
  for (const w of workouts) {
    const k = weekStart(toISODate(new Date(w.performed_at)), startsOn);
    const cur = perWeek.get(k) ?? { volume: 0, sessions: 0, sets: 0 };
    perWeek.set(k, { volume: cur.volume + volumeOf(w), sessions: cur.sessions + 1, sets: cur.sets + w.sets.length });
  }
  const now = perWeek.get(thisWeek) ?? { volume: 0, sessions: 0, sets: 0 };
  const shown = selected ?? thisWeek;
  const fmtVol = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} t` : `${Math.round(v)} kg`);

  return (
    <>
      {error && <ThemedText type="small">{error}</ThemedText>}

      <Pressable
        onPress={() => router.push('/workout')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.start, { backgroundColor: theme.hero, opacity: pressed ? 0.85 : 1 }]}>
        <ThemedText style={styles.startIcon}>🏋️</ThemedText>
        <View style={styles.flex}>
          <ThemedText style={[styles.startTitle, { color: theme.heroText }]}>{hasDraft ? 'Resume workout' : 'Start a workout'}</ThemedText>
          <ThemedText type="small" style={{ color: theme.heroTextSecondary }} numberOfLines={1}>
            {workouts[0]
              ? `Last: ${workouts[0].name ?? 'Workout'} · ${formatDay(toISODate(new Date(workouts[0].performed_at)))}`
              : 'Log exercises, sets, weight and reps'}
          </ThemedText>
        </View>
        <ThemedText style={[styles.chevron, { color: theme.heroText }]}>›</ThemedText>
      </Pressable>

      <View style={styles.tiles}>
        {[
          [String(now.sessions), 'workouts this week'],
          [String(now.sets), 'sets this week'],
          [fmtVol(now.volume), 'lifted this week'],
          [String(workouts.length), 'in the last year'],
        ].map(([v, l]) => (
          <View key={l} style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText style={styles.tileValue}>{v}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {l}
            </ThemedText>
          </View>
        ))}
      </View>

      {workouts.length > 0 && (
        <Card style={styles.chartCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Week of {formatDay(shown)} · {fmtVol(perWeek.get(shown)?.volume ?? 0)} · {perWeek.get(shown)?.sessions ?? 0} sessions
          </ThemedText>
          <BarChart
            bars={weeks.map((w, i) => ({ key: w, value: perWeek.get(w)?.volume ?? 0, label: (WEEKS - 1 - i) % 2 === 0 ? String(Number(w.slice(8))) : undefined }))}
            color={theme.accent}
            selectedKey={selected}
            onSelect={setSelected}
            onHover={setSelected}
            formatValue={fmtVol}
            height={110}
          />
        </Card>
      )}

      <Records workouts={workouts} />
      <History workouts={workouts} />
    </>
  );
}

function Records({ workouts }: { workouts: Workout[] }) {
  const theme = useTheme();
  const best = new Map<string, { weight: number; reps: number; e1rm: number; on: string }>();
  for (const w of workouts)
    for (const s of w.sets) {
      if (!s.weight_kg) continue;
      const e1rm = oneRepMax(s.weight_kg, s.reps);
      const cur = best.get(s.exercise);
      if (!cur || e1rm > cur.e1rm) best.set(s.exercise, { weight: s.weight_kg, reps: s.reps, e1rm, on: w.performed_at });
    }
  if (!best.size) return null;
  const rows = [...best.entries()].sort((a, b) => b[1].on.localeCompare(a[1].on)).slice(0, 10);

  return (
    <>
      <SectionTitle title="Personal records" right={<ThemedText type="small" themeColor="textMuted">est. 1RM</ThemedText>} />
      <Card style={styles.list}>
        {rows.map(([name, r]) => (
          <View key={name} style={styles.prRow}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatKg(r.weight)} × {r.reps} · {formatDay(toISODate(new Date(r.on)))}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              {formatKg(Math.round(r.e1rm * 2) / 2)}
            </ThemedText>
          </View>
        ))}
      </Card>
    </>
  );
}

function History({ workouts }: { workouts: Workout[] }) {
  const { deleteWorkout } = useWorkouts();
  if (!workouts.length) return null;

  async function remove(w: Workout) {
    const msg = 'Delete this workout and its sets?';
    const ok =
      Platform.OS === 'web'
        ? window.confirm(msg)
        : await new Promise<boolean>((resolve) =>
            Alert.alert(msg, undefined, [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ])
          );
    if (ok) await deleteWorkout(w.id);
  }

  return (
    <>
      <SectionTitle title="History" />
      <Card style={styles.list}>
        <ThemedText type="small" themeColor="textMuted">
          Long-press a workout to delete it.
        </ThemedText>
        {workouts.slice(0, 15).map((w) => {
          const byExercise = new Map<string, Workout['sets']>();
          for (const s of w.sets) byExercise.set(s.exercise, [...(byExercise.get(s.exercise) ?? []), s]);
          const at = new Date(w.performed_at);
          return (
            <Pressable key={w.id} onLongPress={() => remove(w)} style={styles.historyRow} accessibilityHint="Long-press to delete">
              <ThemedText type="smallBold">
                {w.name ?? 'Workout'}{' '}
                <ThemedText type="small" themeColor="textMuted">
                  {formatDay(toISODate(at))} · {at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
              </ThemedText>
              {[...byExercise.entries()].map(([name, sets]) => {
                const top = Math.max(...sets.map((s) => s.weight_kg ?? 0));
                return (
                  <ThemedText key={name} type="small" themeColor="textSecondary">
                    {name} · {sets.length}×{sets[0].reps}
                    {top ? ` · top ${formatKg(top)}` : ''}
                  </ThemedText>
                );
              })}
              {w.note && (
                <ThemedText type="small" themeColor="textMuted">
                  {w.note}
                </ThemedText>
              )}
            </Pressable>
          );
        })}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  start: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.large },
  startIcon: { fontSize: 32, lineHeight: 40 },
  startTitle: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
  chevron: { fontSize: 24, lineHeight: 28 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { flexGrow: 1, flexBasis: '45%', padding: Spacing.three, borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth },
  tileValue: { fontSize: 22, lineHeight: 28, fontWeight: 700, fontVariant: ['tabular-nums'] },
  chartCard: { gap: Spacing.two },
  list: { gap: Spacing.two },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  historyRow: { gap: Spacing.half, paddingVertical: Spacing.one },
});
