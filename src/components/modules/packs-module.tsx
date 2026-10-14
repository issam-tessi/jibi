import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/bar-chart';
import { OpenPack, PackArt } from '@/components/cig-art';
import { ThemedText } from '@/components/themed-text';
import { Card, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BRANDS, CIGS_PER_PACK, brandById, isCigaretteCategory } from '@/lib/cigarettes';
import { addDays, formatDay, monthRange, toISODate, today } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useCigarettes, type CigPack, type CigSmoke } from '@/providers/cigarette-provider';
import { useFinance } from '@/providers/finance-provider';

const CHART_DAYS = 14;

/** Cigarette stash, smoking stats, price book and log. */
export function PacksModule() {
  const theme = useTheme();
  const { stock, packs, smokes, error } = useCigarettes();
  const { categories, balances, createCategory } = useFinance();
  const cigCategory = categories.find(isCigaretteCategory);
  const fmt = (v: number) => formatMoney(v, balances.currency);

  const buyPack = () =>
    cigCategory
      ? router.push({ pathname: '/entry', params: { type: 'expense', category: cigCategory.id } })
      : createCategory('Cigarettes', '🚬');
  const smokeOne = (brand?: string) => router.push({ pathname: '/smoke', params: brand ? { brand } : {} });

  const owned = BRANDS.filter((b) => (stock[b.id] ?? 0) > 0);
  const total = Object.values(stock).reduce((s, n) => s + Math.max(0, n), 0);

  return (
    <>
      {error && <ThemedText type="small">{error}</ThemedText>}

      <View style={styles.actions}>
        <Pressable
          onPress={() => smokeOne()}
          disabled={!total}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, { backgroundColor: theme.text, opacity: !total ? 0.4 : pressed ? 0.7 : 1 }]}>
          <ThemedText style={styles.actionIcon}>🔥</ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Smoke one
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={buyPack}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText style={styles.actionIcon}>🛒</ThemedText>
          <ThemedText type="smallBold">{cigCategory ? 'Buy a pack' : 'Set up 🚬 category'}</ThemedText>
        </Pressable>
      </View>

      <SectionTitle title={`Your stash · ${total}`} />
      {owned.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Nothing in stock. Log a payment in your 🚬 Cigarettes category and pick the brand; each pack adds{' '}
            {CIGS_PER_PACK} cigarettes here.
          </ThemedText>
        </Card>
      ) : (
        <View style={styles.stash}>
          {owned.map((b) => {
            const left = stock[b.id];
            const fullPacks = Math.floor((left - 1) / CIGS_PER_PACK);
            return (
              <Pressable
                key={b.id}
                onPress={() => smokeOne(b.id)}
                accessibilityRole="button"
                accessibilityLabel={`${b.name}: ${left} left. Smoke one`}
                style={({ pressed }) => [
                  styles.packTile,
                  { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}>
                <View style={styles.packTop}>
                  <PackArt style={b.style} name={b.name} size={44} />
                  <View style={styles.packInfo}>
                    <ThemedText style={styles.packCount}>{left}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {b.name}
                    </ThemedText>
                  </View>
                </View>
                <OpenPack left={left} size={9} />
                {fullPacks > 0 && (
                  <ThemedText type="small" themeColor="textMuted" style={styles.center}>
                    ＋{fullPacks} sealed pack{fullPacks > 1 ? 's' : ''}
                  </ThemedText>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <Stats smokes={smokes} packs={packs} fmt={fmt} />
      <PriceBook packs={packs} fmt={fmt} />
      <SmokeLog smokes={smokes} />
    </>
  );
}

function Stats({ smokes, packs, fmt }: { smokes: CigSmoke[]; packs: CigPack[]; fmt: (v: number) => string }) {
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const now = useNow();
  const todayIso = today();

  const perDay = new Map<string, number>();
  for (const s of smokes) {
    const day = toISODate(new Date(s.smoked_at));
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const days = Array.from({ length: CHART_DAYS }, (_, i) => addDays(todayIso, i - CHART_DAYS + 1));
  const last7 = days.slice(-7).reduce((s, d) => s + (perDay.get(d) ?? 0), 0);
  const avg = last7 / 7;
  const bars = days.map((d, i) => ({
    key: d,
    value: perDay.get(d) ?? 0,
    label: (CHART_DAYS - 1 - i) % 3 === 0 ? String(Number(d.slice(8))) : undefined, // today and every 3rd day back
  }));

  const lastAt = smokes[0] ? new Date(smokes[0].smoked_at).getTime() : null;
  const sinceMin = lastAt ? Math.max(0, Math.floor((now - lastAt) / 60000)) : null;

  const { from, to } = monthRange(new Date().getFullYear(), new Date().getMonth());
  const monthPacks = packs.filter((p) => p.bought_on >= from && p.bought_on < to);
  const monthSpent = monthPacks.reduce((s, p) => s + (p.price_cents ?? 0), 0);
  const priced = packs.filter((p) => p.price_cents);
  const perCig = priced.length
    ? priced.reduce((s, p) => s + p.price_cents!, 0) / priced.reduce((s, p) => s + p.cigarettes, 0)
    : 0;

  const brandCounts = new Map<string, number>();
  for (const s of smokes) brandCounts.set(s.brand, (brandCounts.get(s.brand) ?? 0) + 1);
  const topBrands = [...brandCounts.entries()].sort((a, b) => b[1] - a[1]);
  const shown = selected ?? todayIso;

  return (
    <>
      <SectionTitle title="Stats" />
      <View style={styles.tiles}>
        <StatTile value={String(perDay.get(todayIso) ?? 0)} label="today" />
        <StatTile value={avg.toFixed(1)} label="a day (7d avg)" />
        <StatTile value={sinceMin === null ? '—' : formatSince(sinceMin)} label="since the last" />
        <StatTile value={fmt(monthSpent)} label="spent this month" />
      </View>

      <Card style={styles.chartCard}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDay(shown)} · {perDay.get(shown) ?? 0} cigarette{(perDay.get(shown) ?? 0) === 1 ? '' : 's'}
        </ThemedText>
        <BarChart
          bars={bars}
          color={theme.expense}
          selectedKey={selected}
          onSelect={setSelected}
          onHover={setSelected}
          reference={avg ? { value: avg, label: `avg ${avg.toFixed(1)}/day` } : undefined}
          formatValue={(v) => String(Math.round(v))}
          height={120}
        />
        {perCig > 0 && (
          <ThemedText type="small" themeColor="textMuted">
            ≈ {fmt(Math.round(perCig))} per cigarette · {fmt(Math.round(perCig * avg * 30))} a month at this pace
          </ThemedText>
        )}
      </Card>

      {topBrands.length > 0 && (
        <Card style={styles.list}>
          <ThemedText type="smallBold">Last 30 days by brand</ThemedText>
          {topBrands.map(([id, n]) => {
            const b = brandById(id);
            const share = n / smokes.length;
            return (
              <View key={id} style={styles.brandRow}>
                <View style={[styles.dot, { backgroundColor: b.style.motif === 'roof' ? b.style.top : b.style.body }]} />
                <ThemedText type="small" style={styles.flex}>
                  {b.name}
                </ThemedText>
                <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
                  <View style={[styles.fill, { width: `${share * 100}%`, backgroundColor: theme.textSecondary }]} />
                </View>
                <ThemedText type="smallBold" style={styles.num}>
                  {n}
                </ThemedText>
              </View>
            );
          })}
        </Card>
      )}
    </>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <ThemedText style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

/** Per brand, the latest price per pack at each place; cheapest place first. */
function PriceBook({ packs, fmt }: { packs: CigPack[]; fmt: (v: number) => string }) {
  const theme = useTheme();
  const book = new Map<string, Map<string, { perPack: number; on: string }>>();
  for (const p of packs) {
    if (!p.price_cents) continue;
    const place = p.place || 'Somewhere';
    const places = book.get(p.brand) ?? new Map();
    if (!places.has(place)) places.set(place, { perPack: Math.round(p.price_cents / p.packs), on: p.bought_on });
    book.set(p.brand, places);
  }
  if (!book.size) return null;

  return (
    <>
      <SectionTitle title="Price book" />
      <Card style={styles.list}>
        {[...book.entries()].map(([brand, places]) => {
          const b = brandById(brand);
          const rows = [...places.entries()].sort((x, y) => x[1].perPack - y[1].perPack);
          return (
            <View key={brand} style={styles.bookBrand}>
              <View style={styles.bookHead}>
                <PackArt style={b.style} name={b.name} size={22} />
                <ThemedText type="smallBold">{b.name}</ThemedText>
              </View>
              {rows.map(([place, { perPack, on }], i) => (
                <View key={place} style={styles.bookRow}>
                  <ThemedText type="small" style={styles.flex} numberOfLines={1}>
                    📍 {place}
                    <ThemedText type="small" themeColor="textMuted">
                      {'  '}
                      {formatDay(on)}
                    </ThemedText>
                  </ThemedText>
                  <ThemedText type="smallBold" style={i === 0 && rows.length > 1 ? { color: theme.income } : undefined}>
                    {fmt(perPack)}
                    {i === 0 && rows.length > 1 ? ' ✓' : ''}
                  </ThemedText>
                </View>
              ))}
            </View>
          );
        })}
      </Card>
    </>
  );
}

function SmokeLog({ smokes }: { smokes: CigSmoke[] }) {
  const { deleteSmoke } = useCigarettes();
  const recent = smokes.slice(0, 15);
  if (!recent.length) return null;

  async function remove(s: CigSmoke) {
    const msg = 'Remove this cigarette from your log? It goes back in the pack.';
    const ok =
      Platform.OS === 'web'
        ? window.confirm(msg)
        : await new Promise<boolean>((resolve) =>
            Alert.alert('Remove?', msg, [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Remove', style: 'destructive', onPress: () => resolve(true) },
            ])
          );
    if (ok) await deleteSmoke(s.id);
  }

  return (
    <>
      <SectionTitle title="Recent" />
      <Card style={styles.list}>
        <ThemedText type="small" themeColor="textMuted">
          Long-press one to remove it.
        </ThemedText>
        {recent.map((s) => {
          const at = new Date(s.smoked_at);
          return (
            <Pressable key={s.id} onLongPress={() => remove(s)} style={styles.logRow} accessibilityHint="Long-press to remove">
              <ThemedText type="smallBold" style={styles.time}>
                {at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </ThemedText>
              <View style={styles.flex}>
                <ThemedText type="small">
                  {brandById(s.brand).name}
                  <ThemedText type="small" themeColor="textMuted">
                    {'  '}
                    {formatDay(toISODate(at))}
                  </ThemedText>
                </ThemedText>
                {s.note && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {s.note}
                  </ThemedText>
                )}
              </View>
            </Pressable>
          );
        })}
      </Card>
    </>
  );
}

function formatSince(min: number) {
  if (min < 60) return `${min}m`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h`;
}

/** Current time, ticking every 30s for "since the last" timers. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1, alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three, borderRadius: Radius.large },
  actionIcon: { fontSize: 22, lineHeight: 28 },
  stash: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  packTile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  packTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  packInfo: { flex: 1 },
  packCount: { fontSize: 28, lineHeight: 34, fontWeight: 700, fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileValue: { fontSize: 22, lineHeight: 28, fontWeight: 700, fontVariant: ['tabular-nums'] },
  chartCard: { gap: Spacing.two },
  list: { gap: Spacing.two },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
  track: { width: 90, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  num: { minWidth: 24, textAlign: 'right', fontVariant: ['tabular-nums'] },
  bookBrand: { gap: Spacing.one, paddingVertical: Spacing.one },
  bookHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingLeft: Spacing.five },
  logRow: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.one },
  time: { width: 48, fontVariant: ['tabular-nums'] },
});
