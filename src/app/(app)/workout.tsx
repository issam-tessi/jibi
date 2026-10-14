import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Input } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toISODate, today } from '@/lib/dates';
import { EXERCISES, WORKOUT_TYPES } from '@/lib/workouts';
import { useGym } from '@/providers/gym-provider';
import { useWorkouts } from '@/providers/workout-provider';

const DRAFT_KEY = 'jibi.workout.draft';

/** Text fields while editing; parsed on save. */
type EditSet = { weight: string; reps: string };
type EditExercise = { name: string; sets: EditSet[] };
type Draft = { name: string | null; note: string; exercises: EditExercise[]; startedAt: string };

const emptyDraft = (): Draft => ({ name: null, note: '', exercises: [], startedAt: new Date().toISOString() });

export default function WorkoutScreen() {
  const theme = useTheme();
  const { workouts, saveWorkout } = useWorkouts();
  const { visits, checkIn } = useGym();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loaded, setLoaded] = useState(false);
  const [custom, setCustom] = useState('');
  const wentToday = visits.some((v) => toISODate(new Date(v.visited_at)) === today());
  // Default follows whether you already checked in today (visits may load after mount) until you flip it.
  const [checkInChoice, setAlsoCheckIn] = useState<boolean | null>(null);
  const alsoCheckIn = checkInChoice ?? !wentToday;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep an unfinished workout across closes and app restarts.
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => raw && setDraft(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [draft, loaded]);

  const update = (fn: (d: Draft) => Draft) => setDraft((d) => fn(JSON.parse(JSON.stringify(d)) as Draft));

  // Last numbers used for an exercise, to prefill its first set.
  const lastSetOf = (name: string): EditSet => {
    for (const w of workouts) {
      const s = [...w.sets].reverse().find((x) => x.exercise === name);
      if (s) return { weight: s.weight_kg === null ? '' : String(s.weight_kg), reps: String(s.reps) };
    }
    return { weight: '', reps: '' };
  };
  const addExercise = (name: string) =>
    update((d) => {
      if (name.trim() && !d.exercises.some((e) => e.name === name.trim()))
        d.exercises.push({ name: name.trim(), sets: [lastSetOf(name.trim())] });
      return d;
    });

  const recent = [...new Set(workouts.flatMap((w) => w.sets.map((s) => s.exercise)))];
  const suggestions = [...new Set([...(draft.name ? (EXERCISES[draft.name] ?? []) : []), ...recent, ...EXERCISES.Push, ...EXERCISES.Pull, ...EXERCISES.Legs])]
    .filter((n) => !draft.exercises.some((e) => e.name === n))
    .slice(0, 12);

  async function finish() {
    const exercises = draft.exercises
      .map((e) => ({
        name: e.name,
        sets: e.sets
          .map((s) => ({ weight: s.weight.trim() ? Number(s.weight.replace(',', '.')) : null, reps: Number(s.reps) }))
          .filter((s) => Number.isInteger(s.reps) && s.reps > 0 && (s.weight === null || (Number.isFinite(s.weight) && s.weight >= 0))),
      }))
      .filter((e) => e.sets.length);
    if (!exercises.length) return setError('Add at least one set with reps.');
    setSaving(true);
    setError(null);
    const at = new Date();
    const err = await saveWorkout({ at, name: draft.name, note: draft.note, exercises });
    if (!err && alsoCheckIn) await checkIn({ at: new Date(draft.startedAt), workout: draft.name, note: '' });
    setSaving(false);
    if (err) return setError(err);
    await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    router.back();
  }

  function discard() {
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    setDraft(emptyDraft());
  }

  return (
    <Sheet title="Workout">
      <View style={styles.chips}>
        {WORKOUT_TYPES.map((t) => (
          <Chip key={t} label={t} selected={draft.name === t} onPress={() => update((d) => ({ ...d, name: d.name === t ? null : t }))} />
        ))}
      </View>

      {draft.exercises.map((e, ei) => (
        <View key={e.name} style={[styles.exercise, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.exerciseHead}>
            <ThemedText type="smallBold" style={styles.flex}>
              {e.name}
            </ThemedText>
            <Pressable onPress={() => update((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== ei) }))} hitSlop={8} accessibilityLabel={`Remove ${e.name}`}>
              <ThemedText type="small" themeColor="textMuted">
                Remove
              </ThemedText>
            </Pressable>
          </View>
          {e.sets.map((s, si) => (
            <View key={si} style={styles.setRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.setNum}>
                {si + 1}
              </ThemedText>
              <TextInput
                value={s.weight}
                onChangeText={(v) => update((d) => ((d.exercises[ei].sets[si].weight = v), d))}
                placeholder="kg"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                style={[styles.num, { backgroundColor: theme.card, color: theme.text }]}
                accessibilityLabel={`${e.name} set ${si + 1} weight`}
              />
              <ThemedText type="small" themeColor="textMuted">
                ×
              </ThemedText>
              <TextInput
                value={s.reps}
                onChangeText={(v) => update((d) => ((d.exercises[ei].sets[si].reps = v.replace(/\D/g, '')), d))}
                placeholder="reps"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                style={[styles.num, { backgroundColor: theme.card, color: theme.text }]}
                accessibilityLabel={`${e.name} set ${si + 1} reps`}
              />
              <Pressable
                onPress={() => update((d) => ((d.exercises[ei].sets = d.exercises[ei].sets.filter((_, i) => i !== si)), d))}
                hitSlop={8}
                style={styles.removeSet}
                accessibilityLabel={`Remove set ${si + 1}`}>
                <ThemedText type="small" themeColor="textMuted">
                  ✕
                </ThemedText>
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => update((d) => (d.exercises[ei].sets.push({ ...(d.exercises[ei].sets.at(-1) ?? { weight: '', reps: '' }) }), d))}
            hitSlop={6}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              ＋ Add set
            </ThemedText>
          </Pressable>
        </View>
      ))}

      <View style={styles.block}>
        <ThemedText type="smallBold">Add exercise</ThemedText>
        <View style={styles.chips}>
          {suggestions.map((n) => (
            <Chip key={n} label={n} selected={false} onPress={() => addExercise(n)} />
          ))}
        </View>
        <Input
          placeholder="Other exercise…"
          value={custom}
          onChangeText={setCustom}
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={() => {
            addExercise(custom);
            setCustom('');
          }}
        />
      </View>

      <Input placeholder="Note (optional)" value={draft.note} onChangeText={(note) => update((d) => ({ ...d, note }))} maxLength={280} />

      <View style={styles.switchRow}>
        <ThemedText type="small" style={styles.flex}>
          {wentToday ? 'Also add another gym check-in' : 'Also check in at the gym for today'}
        </ThemedText>
        <Switch value={alsoCheckIn} onValueChange={setAlsoCheckIn} trackColor={{ true: theme.accent }} />
      </View>

      {error && (
        <ThemedText type="small" style={{ color: theme.expense }}>
          {error}
        </ThemedText>
      )}
      <Button title={saving ? 'Saving…' : '🏁 Finish workout'} disabled={saving} onPress={finish} />
      {draft.exercises.length > 0 && <Button title="Discard" variant="danger" onPress={discard} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  block: { gap: Spacing.two },
  exercise: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.large },
  exerciseHead: { flexDirection: 'row', alignItems: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  setNum: { width: 16, textAlign: 'center' },
  num: { flex: 1, minWidth: 0, borderRadius: Radius.small, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two, fontSize: 16, textAlign: 'center' },
  removeSet: { width: 24, alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
