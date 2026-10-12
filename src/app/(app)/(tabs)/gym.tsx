import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Input, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDay, monthRange, shiftDay, toISODate, today, weekStart as weekStartOf } from '@/lib/dates';
import { useGym, type GymVisit } from '@/providers/gym-provider';
import { usePreferences } from '@/providers/preferences-provider';

const WORKOUTS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body', 'Cardio', 'Abs'];
const HEATMAP_WEEKS = 12;
const SLOTS = [
  { key: 'morning', label: '🌅 Morning', from: 5, to: 12 },
  { key: 'afternoon', label: '☀️ Afternoon', from: 12, to: 17 },
  { key: 'evening', label: '🌆 Evening', from: 17, to: 21 },
  { key: 'night', label: '🌙 Night', from: 21, to: 29 }, // wraps past midnight
] as const;

const dayOf = (v: GymVisit) => toISODate(new Date(v.visited_at));
const minutesOf = (v: GymVisit) => {
  const d = new Date(v.visited_at);
  return d.getHours() * 60 + d.getMinutes();
};
const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export default function GymScreen() {
  const { visits, error } = useGym();
  const { weekStart: startsOn, gymGoal } = usePreferences();

  // Visits per week, keyed by the week's first day.
  const perWeek = new Map<string, number>();
  for (const v of visits) {
    const w = weekStartOf(dayOf(v), startsOn);
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
  }
  const thisWeek = weekStartOf(today(), startsOn);

  // Consecutive weeks hitting the goal; the current week only counts once it's met.
  let streak = 0;
  for (let w = (perWeek.get(thisWeek) ?? 0) >= gymGoal ? thisWeek : addDays(thisWeek, -7); ; w = addDays(w, -7)) {
    if ((perWeek.get(w) ?? 0) >= gymGoal) streak++;
    else break;
  }

  return (
    <Screen header={<GymHero done={perWeek.get(thisWeek) ?? 0} goal={gymGoal} streak={streak} last={visits[0]} />}>
      {error && <ThemedText type="small">{error}</ThemedText>}
      <CheckIn visits={visits} />
      <Heatmap visits={visits} startsOn={startsOn} />
      <TimeOfDay visits={visits} />
      <Totals visits={visits} perWeek={perWeek} />
      <RecentVisits visits={visits} />
    </Screen>
  );
}

function GymHero({ done, goal, streak, last }: { done: number; goal: number; streak: number; last?: GymVisit }) {
  const theme = useTheme();
  const { setPreference } = usePreferences();
  const r = 30;
  const c = 2 * Math.PI * r;
  const progress = Math.min(1, done / goal);

  return (
    <View style={[styles.hero, { backgroundColor: theme.hero }]}>
      <Svg width={76} height={76} viewBox="0 0 76 76">
        <Circle cx="38" cy="38" r={r} stroke="rgba(255,255,255,0.15)" strokeWidth="8" fill="none" />
        <Circle
          cx="38"
          cy="38"
          r={r}
          stroke={done >= goal ? '#3ddc84' : '#ffd76a'}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * progress} ${c}`}
          transform="rotate(-90 38 38)"
        />
      </Svg>
      <View style={styles.heroCenter} pointerEvents="none">
        <ThemedText style={[styles.heroNum, { color: theme.heroText }]}>{done}</ThemedText>
      </View>
      <View style={styles.heroText}>
        <ThemedText type="small" style={{ color: theme.heroTextSecondary }}>
          This week
        </ThemedText>
        <View style={styles.goalRow}>
          <ThemedText type="smallBold" style={{ color: theme.heroText }}>
            {done} of {goal} sessions
          </ThemedText>
          <GoalStep label="−" onPress={() => setPreference('gymGoal', Math.max(1, goal - 1))} />
          <GoalStep label="+" onPress={() => setPreference('gymGoal', Math.min(7, goal + 1))} />
        </View>
        <ThemedText type="small" style={{ color: theme.heroTextSecondary }} numberOfLines={1}>
          {streak > 0 ? `🔥 ${streak} week${streak > 1 ? 's' : ''} on target · ` : ''}
          {last ? `last: ${formatDay(dayOf(last))} ${hhmm(minutesOf(last))}` : 'no visits yet'}
        </ThemedText>
      </View>
    </View>
  );
}

function GoalStep({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Weekly goal ${label}`} style={styles.goalStep}>
      <ThemedText type="smallBold" style={styles.goalStepText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function CheckIn({ visits }: { visits: GymVisit[] }) {
  const theme = useTheme();
  const { checkIn } = useGym();
  const [workout, setWorkout] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [earlier, setEarlier] = useState(false);
  const [date, setDate] = useState(today());
  const [minutes, setMinutes] = useState(18 * 60);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const todays = visits.filter((v) => dayOf(v) === today());

  async function save() {
    const [y, m, d] = date.split('-').map(Number);
    const at = earlier ? new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60) : new Date();
    if (at.getTime() > Date.now()) return setMessage('That time hasn’t happened yet.');
    setBusy(true);
    setMessage(null);
    const err = await checkIn({ at, workout, note });
    setBusy(false);
    if (err) return setMessage(err);
    setNote('');
    setWorkout(null);
    setEarlier(false);
    setMessage(`Logged ${formatDay(toISODate(at))} at ${hhmm(at.getHours() * 60 + at.getMinutes())} 💪`);
  }

  return (
    <Card style={styles.section}>
      {todays.length > 0 && (
        <ThemedText type="smallBold" style={{ color: theme.income }}>
          ✓ Went today at {todays.map((v) => hhmm(minutesOf(v))).join(', ')}
        </ThemedText>
      )}
      <View style={styles.chips}>
        {WORKOUTS.map((w) => (
          <Chip key={w} label={w} selected={workout === w} onPress={() => setWorkout(workout === w ? null : w)} />
        ))}
      </View>
      <Input placeholder="Note (optional), e.g. new PR on bench" value={note} onChangeText={setNote} maxLength={280} />

      {earlier && (
        <View style={styles.section}>
          <Stepper
            label={`📅 ${formatDay(date)}`}
            onMinus={() => setDate(shiftDay(date, -1))}
            onPlus={() => setDate(shiftDay(date, 1))}
            plusDisabled={date >= today()}
          />
          <Stepper
            label={`🕒 ${hhmm(minutes)}`}
            onMinus={() => setMinutes((minutes + 1440 - 15) % 1440)}
            onPlus={() => setMinutes((minutes + 15) % 1440)}
          />
          <View style={styles.chips}>
            {[
              ['Morning', 7 * 60],
              ['Noon', 12 * 60 + 30],
              ['Evening', 18 * 60 + 30],
              ['Night', 21 * 60],
            ].map(([label, min]) => (
              <Chip key={label} label={`${label} ${hhmm(min as number)}`} selected={minutes === min} onPress={() => setMinutes(min as number)} />
            ))}
          </View>
        </View>
      )}

      {message && (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      )}
      <Button title={busy ? 'Saving…' : earlier ? 'Log this visit' : '💪 I’m at the gym'} disabled={busy} onPress={save} />
      <Pressable onPress={() => setEarlier(!earlier)} hitSlop={8} style={styles.center}>
        <ThemedText type="small" style={{ color: theme.accent }}>
          {earlier ? 'Use the current time instead' : 'Forgot to check in? Log an earlier visit'}
        </ThemedText>
      </Pressable>
    </Card>
  );
}

function Stepper({ label, onMinus, onPlus, plusDisabled }: { label: string; onMinus: () => void; onPlus: () => void; plusDisabled?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: theme.backgroundElement }]}>
      <Pressable onPress={onMinus} hitSlop={8} style={styles.stepBtn} accessibilityRole="button">
        <ThemedText type="smallBold">‹</ThemedText>
      </Pressable>
      <ThemedText type="smallBold" style={styles.stepLabel}>
        {label}
      </ThemedText>
      <Pressable onPress={onPlus} disabled={plusDisabled} hitSlop={8} style={[styles.stepBtn, plusDisabled && styles.disabled]} accessibilityRole="button">
        <ThemedText type="smallBold">›</ThemedText>
      </Pressable>
    </View>
  );
}

/** Last 12 weeks, one column per week, one row per weekday. */
function Heatmap({ visits, startsOn }: { visits: GymVisit[]; startsOn: 0 | 1 }) {
  const theme = useTheme();
  const perDay = new Map<string, number>();
  for (const v of visits) perDay.set(dayOf(v), (perDay.get(dayOf(v)) ?? 0) + 1);
  const first = addDays(weekStartOf(today(), startsOn), -7 * (HEATMAP_WEEKS - 1));
  const names = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const rowNames = [...names.slice(startsOn), ...names.slice(0, startsOn)];
  const todayIso = today();
  const total = [...perDay.entries()].filter(([d]) => d >= first).reduce((s, [, n]) => s + n, 0);

  return (
    <>
      <SectionTitle title={`Last ${HEATMAP_WEEKS} weeks · ${total} visits`} />
      <Card style={styles.heatCard}>
        <View style={styles.heatRow}>
          <View style={styles.heatCol}>
            {rowNames.map((n, i) => (
              <ThemedText key={i} style={[styles.heatLabel, { color: theme.textMuted }]}>
                {i % 2 === 0 ? n : ''}
              </ThemedText>
            ))}
          </View>
          {Array.from({ length: HEATMAP_WEEKS }, (_, w) => (
            <View key={w} style={styles.heatCol}>
              {Array.from({ length: 7 }, (_, d) => {
                const iso = addDays(first, w * 7 + d);
                const n = perDay.get(iso) ?? 0;
                const future = iso > todayIso;
                return (
                  <View
                    key={d}
                    accessibilityLabel={`${iso}: ${n} visit${n === 1 ? '' : 's'}`}
                    style={[
                      styles.heatCell,
                      {
                        backgroundColor: n ? theme.accent : theme.backgroundElement,
                        opacity: future ? 0.3 : n > 1 ? 1 : n ? 0.75 : 1,
                        borderColor: iso === todayIso ? theme.text : 'transparent',
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </Card>
    </>
  );
}

/** When you train: a 24h strip of visits plus morning/afternoon/evening/night split. */
function TimeOfDay({ visits }: { visits: GymVisit[] }) {
  const theme = useTheme();
  const since = addDays(today(), -90);
  const recent = visits.filter((v) => dayOf(v) >= since);
  if (!recent.length) return null;

  const mins = recent.map(minutesOf).sort((a, b) => a - b);
  const median = mins[Math.floor(mins.length / 2)];
  const slotOf = (min: number) => {
    const h = min / 60 < 5 ? min / 60 + 24 : min / 60;
    return SLOTS.find((s) => h >= s.from && h < s.to) ?? SLOTS[3];
  };
  const counts = new Map<string, number>();
  for (const m of mins) counts.set(slotOf(m).key, (counts.get(slotOf(m).key) ?? 0) + 1);

  return (
    <>
      <SectionTitle title="Time of day · 90 days" right={<ThemedText type="small" themeColor="textSecondary">usually ~{hhmm(median)}</ThemedText>} />
      <Card style={styles.section}>
        <View style={[styles.strip, { backgroundColor: theme.backgroundElement }]}>
          {mins.map((m, i) => (
            <View key={i} style={[styles.stripDot, { left: `${(m / 1440) * 100}%`, backgroundColor: theme.accent }]} />
          ))}
        </View>
        <View style={styles.stripAxis}>
          {['00', '06', '12', '18', '24'].map((h) => (
            <ThemedText key={h} style={[styles.axisLabel, { color: theme.textMuted }]}>
              {h}
            </ThemedText>
          ))}
        </View>
        {SLOTS.map((s) => {
          const n = counts.get(s.key) ?? 0;
          return (
            <View key={s.key} style={styles.slotRow}>
              <ThemedText type="small" style={styles.slotLabel}>
                {s.label}
              </ThemedText>
              <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.fill, { width: `${(n / mins.length) * 100}%`, backgroundColor: theme.accent }]} />
              </View>
              <ThemedText type="smallBold" style={styles.num}>
                {n}
              </ThemedText>
            </View>
          );
        })}
      </Card>
    </>
  );
}

function Totals({ visits, perWeek }: { visits: GymVisit[]; perWeek: Map<string, number> }) {
  const theme = useTheme();
  const now = new Date();
  const { from, to } = monthRange(now.getFullYear(), now.getMonth());
  const month = visits.filter((v) => dayOf(v) >= from && dayOf(v) < to).length;
  const last12 = [...perWeek.entries()].filter(([w]) => w >= addDays(today(), -7 * HEATMAP_WEEKS));
  const avg = last12.reduce((s, [, n]) => s + n, 0) / HEATMAP_WEEKS;
  const best = Math.max(0, ...perWeek.values());

  const tiles = [
    [String(month), 'this month'],
    [avg.toFixed(1), 'a week (12w avg)'],
    [String(best), 'best week'],
    [String(visits.length), 'in the last year'],
  ];
  return (
    <View style={styles.tiles}>
      {tiles.map(([value, label]) => (
        <View key={label} style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText style={styles.tileValue}>{value}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function RecentVisits({ visits }: { visits: GymVisit[] }) {
  const { deleteVisit } = useGym();
  const recent = visits.slice(0, 12);
  if (!recent.length) return null;

  async function remove(v: GymVisit) {
    const msg = 'Remove this gym visit?';
    const ok =
      Platform.OS === 'web'
        ? window.confirm(msg)
        : await new Promise<boolean>((resolve) =>
            Alert.alert(msg, undefined, [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
            ])
          );
    if (ok) await deleteVisit(v.id);
  }

  return (
    <>
      <SectionTitle title="Recent visits" />
      <Card style={styles.list}>
        <ThemedText type="small" themeColor="textMuted">
          Long-press a visit to remove it.
        </ThemedText>
        {recent.map((v) => (
          <Pressable key={v.id} onLongPress={() => remove(v)} style={styles.visitRow} accessibilityHint="Long-press to remove">
            <ThemedText type="smallBold" style={styles.time}>
              {hhmm(minutesOf(v))}
            </ThemedText>
            <View style={styles.flex}>
              <ThemedText type="small">
                {formatDay(dayOf(v))}
                {v.workout ? ` · ${v.workout}` : ''}
              </ThemedText>
              {v.note && (
                <ThemedText type="small" themeColor="textSecondary">
                  {v.note}
                </ThemedText>
              )}
            </View>
          </Pressable>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.large },
  heroCenter: { position: 'absolute', left: Spacing.three, width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  heroNum: { fontSize: 26, lineHeight: 32, fontWeight: 700 },
  heroText: { flex: 1, gap: Spacing.half },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  goalStep: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  goalStepText: { color: '#ffffff', lineHeight: 18 },
  section: { gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  center: { alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.medium, padding: Spacing.one },
  stepBtn: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { flex: 1, textAlign: 'center' },
  disabled: { opacity: 0.3 },
  heatCard: { alignItems: 'center' },
  heatRow: { flexDirection: 'row', gap: 4 },
  heatCol: { gap: 4 },
  heatLabel: { height: 18, fontSize: 10, lineHeight: 18, width: 12 },
  heatCell: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5 },
  strip: { height: 28, borderRadius: Radius.small, overflow: 'hidden' },
  stripDot: { position: 'absolute', top: 6, width: 4, height: 16, marginLeft: -2, borderRadius: 2, opacity: 0.55 },
  stripAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -Spacing.two },
  axisLabel: { fontSize: 10, lineHeight: 14 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  slotLabel: { width: 110 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  num: { minWidth: 24, textAlign: 'right', fontVariant: ['tabular-nums'] },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { flexGrow: 1, flexBasis: '45%', padding: Spacing.three, borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth },
  tileValue: { fontSize: 22, lineHeight: 28, fontWeight: 700, fontVariant: ['tabular-nums'] },
  list: { gap: Spacing.two },
  visitRow: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.one },
  time: { width: 48, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
});
