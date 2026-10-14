import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Chip, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PrayerName, PrayerStatus } from '@/lib/database.types';
import { addDays, formatDay, shiftDay, today } from '@/lib/dates';
import { CITIES, PRAYERS, cityById, hijriDate, prayerTimes } from '@/lib/prayer-times';
import { usePreferences } from '@/providers/preferences-provider';
import { usePrayers, type PrayerLog } from '@/providers/prayer-provider';

const GRID_DAYS = 30;

const STATUSES: { value: PrayerStatus; icon: string; label: string }[] = [
  { value: 'jamaah', icon: '🕌', label: 'Mosque' },
  { value: 'ontime', icon: '✓', label: 'On time' },
  { value: 'late', icon: '⏰', label: 'Late' },
  { value: 'missed', icon: '✕', label: 'Missed' },
];

function useStatusColors() {
  const theme = useTheme();
  return { jamaah: '#6d5dfc', ontime: theme.income, late: '#d99a00', missed: theme.expense } as Record<PrayerStatus, string>;
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const isoToDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Five daily prayers: times for your city, a status per prayer, streaks and a 30-day grid. */
export function PrayerModule() {
  const { logs, error } = usePrayers();
  const { prayerCity, setPreference } = usePreferences();
  const city = cityById(prayerCity);
  const [day, setDay] = useState(today());

  const byDay = new Map<string, Map<PrayerName, PrayerLog>>();
  for (const l of logs) {
    const m = byDay.get(l.day) ?? new Map();
    m.set(l.prayer, l);
    byDay.set(l.day, m);
  }

  return (
    <>
      {error && <ThemedText type="small">{error}</ThemedText>}
      <NextPrayer lat={city.lat} lng={city.lng} cityName={city.name} />
      <DayCard day={day} setDay={setDay} logged={byDay.get(day)} lat={city.lat} lng={city.lng} />
      <PrayerStats byDay={byDay} />
      <PrayerGrid byDay={byDay} onPick={setDay} />

      <SectionTitle title="City for prayer times" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cities}>
        {CITIES.map((c) => (
          <Chip key={c.id} label={`📍 ${c.name}`} selected={c.id === city.id} onPress={() => setPreference('prayerCity', c.id)} />
        ))}
      </ScrollView>
    </>
  );
}

function NextPrayer({ lat, lng, cityName }: { lat: number; lng: number; cityName: string }) {
  const theme = useTheme();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const times = prayerTimes(now, lat, lng);
  let next = PRAYERS.find((p) => times[p.key] > now);
  let at = next ? times[next.key] : null;
  if (!next) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    next = PRAYERS[0];
    at = prayerTimes(tomorrow, lat, lng).fajr;
  }
  const mins = Math.max(0, Math.round((at!.getTime() - now.getTime()) / 60000));
  const left = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  const hijri = hijriDate(now);

  return (
    <View style={[styles.hero, { backgroundColor: theme.hero }]}>
      <View style={styles.flex}>
        <ThemedText type="small" style={{ color: theme.heroTextSecondary }}>
          Next · {cityName}
        </ThemedText>
        <ThemedText style={[styles.heroTitle, { color: theme.heroText }]}>
          {next.name} <ThemedText style={[styles.heroArabic, { color: theme.heroTextSecondary }]}>{next.arabic}</ThemedText>
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.heroTextSecondary }}>
          {hhmm(at!)} · in {left}
          {hijri ? ` · ${hijri}` : ''}
        </ThemedText>
      </View>
      <ThemedText style={styles.heroIcon}>🌙</ThemedText>
    </View>
  );
}

function DayCard({
  day,
  setDay,
  logged,
  lat,
  lng,
}: {
  day: string;
  setDay: (d: string) => void;
  logged?: Map<PrayerName, PrayerLog>;
  lat: number;
  lng: number;
}) {
  const theme = useTheme();
  const colors = useStatusColors();
  const { mark } = usePrayers();
  const times = prayerTimes(isoToDate(day), lat, lng);
  const now = new Date();
  const done = PRAYERS.filter((p) => {
    const s = logged?.get(p.key)?.status;
    return s && s !== 'missed';
  }).length;

  return (
    <Card style={styles.section}>
      <View style={styles.dayNav}>
        <Pressable onPress={() => setDay(shiftDay(day, -1))} hitSlop={8} style={styles.navBtn} accessibilityRole="button" accessibilityLabel="Previous day">
          <ThemedText type="smallBold">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.dayLabel}>
          {formatDay(day)} · {done}/5
        </ThemedText>
        <Pressable
          onPress={() => setDay(shiftDay(day, 1))}
          disabled={day >= today()}
          hitSlop={8}
          style={[styles.navBtn, day >= today() && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Next day">
          <ThemedText type="smallBold">›</ThemedText>
        </Pressable>
      </View>

      {PRAYERS.map((p) => {
        const status = logged?.get(p.key)?.status;
        const notYet = times[p.key] > now;
        return (
          <View key={p.key} style={[styles.prayerRow, notYet && styles.dim]}>
            <View style={[styles.statusDot, { backgroundColor: status ? colors[status] : theme.backgroundElement }]} />
            <View style={styles.prayerName}>
              <ThemedText type="smallBold">
                {p.name} <ThemedText type="small" themeColor="textMuted">{p.arabic}</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {hhmm(times[p.key])}
              </ThemedText>
            </View>
            <View style={styles.statusRow}>
              {STATUSES.map((s) => {
                const selected = status === s.value;
                return (
                  <Pressable
                    key={s.value}
                    disabled={notYet}
                    onPress={() => mark(day, p.key, selected ? null : s.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name}: ${s.label}`}
                    accessibilityState={{ selected, disabled: notYet }}
                    style={[
                      styles.statusBtn,
                      { backgroundColor: selected ? colors[s.value] : theme.backgroundElement },
                    ]}>
                    <ThemedText style={[styles.statusIcon, { color: selected ? '#ffffff' : theme.textSecondary }]}>{s.icon}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={styles.legend}>
        {STATUSES.map((s) => (
          <View key={s.value} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors[s.value] }]} />
            <ThemedText type="small" themeColor="textMuted">
              {s.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </Card>
  );
}

function PrayerStats({ byDay }: { byDay: Map<string, Map<PrayerName, PrayerLog>> }) {
  const theme = useTheme();
  const prayed = (d: string) =>
    PRAYERS.filter((p) => {
      const s = byDay.get(d)?.get(p.key)?.status;
      return s && s !== 'missed';
    }).length;

  // Full days in a row (all five prayed), counting today only once it's complete.
  let streak = 0;
  for (let d = prayed(today()) === 5 ? today() : addDays(today(), -1); prayed(d) === 5; d = addDays(d, -1)) streak++;

  const pct = (days: number) => {
    let n = 0;
    for (let i = 1; i <= days; i++) n += prayed(addDays(today(), -i));
    return Math.round((n / (days * 5)) * 100);
  };
  let mosque = 0;
  for (const m of byDay.values()) for (const l of m.values()) if (l.status === 'jamaah' && l.day >= addDays(today(), -GRID_DAYS)) mosque++;

  const perPrayer = PRAYERS.map((p) => {
    let n = 0;
    for (let i = 1; i <= GRID_DAYS; i++) {
      const s = byDay.get(addDays(today(), -i))?.get(p.key)?.status;
      if (s && s !== 'missed') n++;
    }
    return { ...p, n };
  });

  const tiles: [string, string][] = [
    [`${prayed(today())}/5`, 'today'],
    [streak ? `🔥 ${streak}` : '0', 'full days in a row'],
    [`${pct(7)}%`, 'last 7 days'],
    [String(mosque), `at the mosque (${GRID_DAYS}d)`],
  ];

  return (
    <>
      <View style={styles.tiles}>
        {tiles.map(([v, l]) => (
          <View key={l} style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText style={styles.tileValue}>{v}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {l}
            </ThemedText>
          </View>
        ))}
      </View>
      <Card style={styles.list}>
        <ThemedText type="smallBold">Consistency · last {GRID_DAYS} days</ThemedText>
        {perPrayer.map((p) => (
          <View key={p.key} style={styles.barRow}>
            <ThemedText type="small" style={styles.barLabel}>
              {p.name}
            </ThemedText>
            <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.fill, { width: `${(p.n / GRID_DAYS) * 100}%`, backgroundColor: theme.income }]} />
            </View>
            <ThemedText type="smallBold" style={styles.num}>
              {p.n}
            </ThemedText>
          </View>
        ))}
      </Card>
    </>
  );
}

/** Prayers (rows) × last 30 days (columns), colored by status. Tap a column to open that day. */
function PrayerGrid({ byDay, onPick }: { byDay: Map<string, Map<PrayerName, PrayerLog>>; onPick: (day: string) => void }) {
  const theme = useTheme();
  const colors = useStatusColors();
  const days = Array.from({ length: GRID_DAYS }, (_, i) => addDays(today(), i - GRID_DAYS + 1));
  return (
    <>
      <SectionTitle title={`Last ${GRID_DAYS} days`} />
      <Card style={styles.gridCard}>
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            {PRAYERS.map((p) => (
              <ThemedText key={p.key} style={[styles.gridLabel, { color: theme.textMuted }]}>
                {p.name[0]}
              </ThemedText>
            ))}
          </View>
          {days.map((d) => (
            <Pressable key={d} onPress={() => onPick(d)} style={styles.gridCol} accessibilityLabel={`Open ${d}`}>
              {PRAYERS.map((p) => {
                const s = byDay.get(d)?.get(p.key)?.status;
                return <View key={p.key} style={[styles.gridCell, { backgroundColor: s ? colors[s] : theme.backgroundElement }]} />;
              })}
            </Pressable>
          ))}
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: Spacing.half },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.large },
  heroTitle: { fontSize: 24, lineHeight: 30, fontWeight: 700 },
  heroArabic: { fontSize: 18, fontWeight: 500 },
  heroIcon: { fontSize: 36, lineHeight: 44 },
  section: { gap: Spacing.two },
  dayNav: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { width: 40, height: 32, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { flex: 1, textAlign: 'center' },
  disabled: { opacity: 0.3 },
  dim: { opacity: 0.45 },
  prayerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  statusDot: { width: 8, height: 32, borderRadius: 4 },
  prayerName: { flex: 1 },
  statusRow: { flexDirection: 'row', gap: Spacing.one },
  statusBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusIcon: { fontSize: 15, lineHeight: 20, fontWeight: 700 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, justifyContent: 'center', paddingTop: Spacing.one },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: { flexGrow: 1, flexBasis: '45%', padding: Spacing.three, borderRadius: Radius.large, borderWidth: StyleSheet.hairlineWidth },
  tileValue: { fontSize: 22, lineHeight: 28, fontWeight: 700, fontVariant: ['tabular-nums'] },
  list: { gap: Spacing.two },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  barLabel: { width: 64 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  num: { minWidth: 24, textAlign: 'right', fontVariant: ['tabular-nums'] },
  gridCard: { alignItems: 'center' },
  gridRow: { flexDirection: 'row', gap: 2 },
  gridCol: { gap: 2 },
  gridLabel: { height: 9, fontSize: 8, lineHeight: 9, width: 10 },
  gridCell: { width: 8, height: 9, borderRadius: 2 },
  cities: { gap: Spacing.two },
});
