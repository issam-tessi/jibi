import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { Tables } from '@/lib/database.types';
import { addDays, today } from '@/lib/dates';
import { db } from '@/lib/db';

export type Workout = Tables<'workouts'> & { sets: Tables<'workout_sets'>[] };
export type DraftSet = { weight: number | null; reps: number };
export type DraftExercise = { name: string; sets: DraftSet[] };

type WorkoutState = { workouts: Workout[]; loading: boolean; error: string | null };

type WorkoutActions = {
  refresh: () => Promise<void>;
  saveWorkout: (w: { at: Date; name: string | null; note: string; exercises: DraftExercise[] }) => Promise<string | null>;
  deleteWorkout: (id: string) => Promise<string | null>;
};

const Context = createContext<(WorkoutState & WorkoutActions) | null>(null);

export function WorkoutProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<WorkoutState>({ workouts: [], loading: true, error: null });

  const refresh = useCallback(async () => {
    const since = new Date(`${addDays(today(), -365)}T00:00:00`).toISOString();
    const { data, error } = await db
      .from('workouts')
      .select('*, sets:workout_sets(*)')
      .gte('performed_at', since)
      .order('performed_at', { ascending: false })
      .limit(500);
    const workouts = ((data ?? []) as Workout[]).map((w) => ({
      ...w,
      sets: [...w.sets].sort((a, b) => a.position - b.position).map((s) => ({ ...s, weight_kg: s.weight_kg === null ? null : Number(s.weight_kg) })),
    }));
    setState({ workouts, loading: false, error: error?.message ?? null });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const actions = useMemo<WorkoutActions>(
    () => ({
      refresh,
      saveWorkout: async ({ at, name, note, exercises }) => {
        const { data, error } = await db
          .from('workouts')
          .insert({ performed_at: at.toISOString(), name, note: note.trim() || null })
          .select('id')
          .single();
        if (error || !data) return error?.message ?? 'Could not save the workout.';
        let position = 0;
        const rows = exercises.flatMap((e) =>
          e.sets.map((s) => ({ workout_id: data.id, exercise: e.name, position: position++, weight_kg: s.weight, reps: s.reps }))
        );
        if (rows.length) {
          const res = await db.from('workout_sets').insert(rows);
          if (res.error) {
            await db.from('workouts').delete().eq('id', data.id);
            return res.error.message;
          }
        }
        await refresh();
        return null;
      },
      deleteWorkout: async (id) => {
        const { error } = await db.from('workouts').delete().eq('id', id);
        if (!error) await refresh();
        return error?.message ?? null;
      },
    }),
    [refresh]
  );

  return <Context value={{ ...state, ...actions }}>{children}</Context>;
}

export function useWorkouts() {
  const ctx = use(Context);
  if (!ctx) throw new Error('useWorkouts must be used inside <WorkoutProvider>');
  return ctx;
}
