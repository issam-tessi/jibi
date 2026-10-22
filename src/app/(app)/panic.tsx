import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BurnCandles, BurnChart, Containment } from '@/components/burn-chart';
import { FireField, Flame, Glow, useLoop } from '@/components/fire';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, Chip, Input } from '@/components/ui';
import { Fire, Radius, Spacing } from '@/constants/theme';
import { useCountUp } from '@/hooks/use-count-up';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, today } from '@/lib/dates';
import { amountPlaceholder, formatMoney, parseAmount } from '@/lib/money';
import { potIcon } from '@/lib/pots';
import { useFinance } from '@/providers/finance-provider';
import { daysBetween, PANIC_POTS, usePanic, type PanicPot, type PanicReport } from '@/providers/panic-provider';
import { usePrivacy } from '@/providers/privacy-provider';

const HOLD_MS = 1100;

export default function PanicScreen() {
  const { active, report } = usePanic();
  const { locked, unlock } = usePrivacy();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <ThemedText type="smallBold" style={styles.title}>
              {active ? 'Damage report' : 'Panic button'}
            </ThemedText>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <ThemedText themeColor="textSecondary">Close</ThemedText>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {locked ? (
              <Card style={styles.gate}>
                <ThemedText style={styles.gateIcon}>🔒</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                  Balances are hidden. Unlock to see the damage.
                </ThemedText>
                <Button title="Unlock with Face ID" onPress={unlock} />
              </Card>
            ) : active && report ? (
              <Dashboard report={report} />
            ) : (
              <Ignition />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Amount input that, unlike `parseAmount`, accepts zero ("I have nothing left"). */
function parseCount(input: string, currency: string) {
  if (/^\s*0+([.,]0*)?\s*$/.test(input)) return 0;
  return parseAmount(input, currency);
}

function Ignition() {
  const theme = useTheme();
  const { balances } = useFinance();
  const { lastEntryDate, activate } = usePanic();
  const [counts, setCounts] = useState<Record<PanicPot, string>>({ card: '', cash: '' });
  const fmt = (v: number) => formatMoney(v, balances.currency);
  const parsed = PANIC_POTS.map((p) => parseCount(counts[p], balances.currency));
  const ready = parsed.every((v) => v !== null);
  const gap = ready ? balances.card + balances.cash - (parsed[0] ?? 0) - (parsed[1] ?? 0) : null;
  const dark = Math.max(0, daysBetween(lastEntryDate, today()));

  return (
    <>
      <View style={styles.scene}>
        <FireField embers={22} smoke={7} seed={1} />
        <Glow />
        <View style={styles.flames}>
          <Flame size={42} seed={1} style={styles.sideFlame} />
          <Flame size={78} seed={2} />
          <Flame size={48} seed={3} style={styles.sideFlame} />
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={styles.intro}>
        <ThemedText type="subtitle" style={styles.center}>
          Lost track?
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Count what’s really left. Jibi will show what went up in smoke since your last entry and keep the app on
          fire until you’ve got things back under control.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)}>
        <Card style={styles.period}>
          <ThemedText style={styles.periodIcon}>🕳️</ThemedText>
          <View style={styles.flex}>
            <ThemedText type="smallBold">
              {formatDay(lastEntryDate)} → today
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {dark === 0 ? 'Last entry was today' : `${dark} day${dark === 1 ? '' : 's'} off the radar`}
            </ThemedText>
          </View>
        </Card>
      </Animated.View>

      {PANIC_POTS.map((pot, i) => (
        <Animated.View key={pot} entering={FadeInDown.delay(220 + i * 100).duration(500)} style={styles.field}>
          <ThemedText type="smallBold">
            {potIcon(pot)} {pot === 'card' ? 'What’s left in the bank' : 'Cash in your pocket'}
          </ThemedText>
          <Input
            value={counts[pot]}
            onChangeText={(text) => setCounts((c) => ({ ...c, [pot]: text }))}
            placeholder={amountPlaceholder(balances.currency)}
            keyboardType="decimal-pad"
            inputMode="decimal"
            accessibilityLabel={pot === 'card' ? 'Money left in the bank' : 'Cash left'}
          />
          <ThemedText type="small" themeColor="textMuted">
            Jibi thinks: {fmt(balances[pot])}
          </ThemedText>
        </Animated.View>
      ))}

      {gap !== null && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <ThemedText type="smallBold" style={[styles.center, { color: gap > 0 ? Fire.orange : theme.income }]}>
            {gap > 0 ? `≈ ${fmt(gap)} went up in smoke 🔥` : 'Your counts add up — no fire found 🎉'}
          </ThemedText>
        </Animated.View>
      )}

      <HoldToIgnite
        disabled={!ready}
        onIgnite={() => activate({ card: parsed[0] ?? 0, cash: parsed[1] ?? 0 })}
      />
    </>
  );
}

/** Press and hold to fill the button with fire — no accidental panics. */
function HoldToIgnite({ disabled, onIgnite }: { disabled: boolean; onIgnite: () => void }) {
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const shake = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.sin(progress.value * 60) * progress.value * 3 }],
  }));

  function start() {
    if (disabled) return;
    setHolding(true);
    progress.set(withTiming(1, { duration: HOLD_MS, easing: Easing.in(Easing.quad) }));
    timer.current = setTimeout(onIgnite, HOLD_MS);
  }
  function stop() {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    progress.set(withTiming(0, { duration: 250 }));
  }

  return (
    <Animated.View style={shake}>
      <Pressable
        onPressIn={start}
        onPressOut={stop}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Hold to start panic mode"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={() => !disabled && onIgnite()}
        style={[styles.hold, disabled && styles.disabled]}>
        <Animated.View style={[styles.holdFill, fill]} />
        <ThemedText style={styles.holdLabel}>
          {disabled ? 'Enter both amounts' : holding ? 'Keep holding…' : 'Hold to ignite 🔥'}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function Dashboard({ report }: { report: PanicReport }) {
  const theme = useTheme();
  const { balances } = useFinance();
  const { deactivate } = usePanic();
  const [logRemaining, setLogRemaining] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fmt = (v: number) => formatMoney(Math.round(v), balances.currency);
  const shown = useCountUp(report.burned, 1600, 200);
  const flicker = useLoop(140, { bounce: true });
  const neon = useAnimatedStyle(() => ({ opacity: interpolate(flicker.value, [0, 1], [0.82, 1]) }));

  const spendable = report.actual.card + report.actual.cash;
  const runway = report.burnRate > 0 ? Math.floor(spendable / report.burnRate) : null;
  const contained = report.burned > 0 ? Math.round((report.explainedTotal / report.burned) * 100) : 100;

  async function extinguish() {
    setBusy(true);
    setError(null);
    const err = await deactivate(logRemaining && report.remainingTotal > 0);
    setBusy(false);
    if (err) setError(err);
    else if (router.canGoBack()) router.back();
  }

  return (
    <>
      <View style={styles.hero}>
        <FireField embers={26} smoke={8} seed={4} />
        <Glow />
        <Animated.View style={neon}>
          <ThemedText style={styles.neon}>PANIC MODE</ThemedText>
        </Animated.View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {formatDay(report.since)} → {formatDay(report.until)} · {report.days} day{report.days === 1 ? '' : 's'} off the
          radar
        </ThemedText>
        <ThemedText style={styles.burned} numberOfLines={1} adjustsFontSizeToFit>
          {report.burned > 0 ? `−${fmt(shown)}` : fmt(0)}
        </ThemedText>
        <ThemedText type="smallBold" style={[styles.center, { color: theme.textSecondary }]}>
          {report.burned > 0 ? 'went up in smoke without a trace' : 'No fire found — your counts add up 🎉'}
        </ThemedText>
      </View>

      <View style={styles.tiles}>
        <Tile icon="🔥" label="Burn rate" value={`${fmt(report.burnRate)}/day`} delay={0} />
        <Tile icon="⏳" label="Runway" value={runway === null ? '∞' : `${runway} days`} delay={100} />
        <Tile icon="📝" label="Logged since" value={String(report.loggedSince)} delay={200} />
      </View>

      <Animated.View entering={FadeInDown.delay(150).duration(500)}>
        <Card style={styles.section}>
          <ThemedText type="smallBold">The burn</ThemedText>
          <BurnChart report={report} formatValue={fmt} />
          <ThemedText type="small" themeColor="textMuted">
            We only know the start and the end, so the fire is spread evenly across the days.
          </ThemedText>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).duration(500)}>
        <Card style={styles.section}>
          <ThemedText type="smallBold">Melted pots</ThemedText>
          <BurnCandles report={report} formatValue={fmt} />
        </Card>
      </Animated.View>

      {report.burned > 0 && (
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <Card style={styles.section}>
            <View style={styles.rowBetween}>
              <ThemedText type="smallBold">🧯 Fire contained</ThemedText>
              <ThemedText type="smallBold" style={{ color: '#4fb3ff' }}>
                {contained}%
              </ThemedText>
            </View>
            <Containment report={report} />
            <ThemedText type="small" themeColor="textSecondary">
              {report.remainingTotal > 0
                ? `${fmt(report.remainingTotal)} still unexplained. Log what you remember, dated between ${formatDay(report.since)} and ${formatDay(report.until)}, and the fire shrinks.`
                : 'Every millime is accounted for. You can put out the fire.'}
            </ThemedText>
            {report.remainingTotal > 0 && (
              <Button
                title="＋ Log a payment I remember"
                variant="secondary"
                onPress={() => router.push({ pathname: '/entry', params: { type: 'expense', date: report.until } })}
              />
            )}
          </Card>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(450).duration(500)}>
        <Card style={styles.section}>
          <ThemedText type="smallBold">Stabilized?</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Turn panic mode off once you feel back in control.
          </ThemedText>
          {report.remainingTotal > 0 && (
            <Chip
              label={`${logRemaining ? '✓ ' : ''}Log the missing ${fmt(report.remainingTotal)} as payments to sort`}
              selected={logRemaining}
              onPress={() => setLogRemaining((v) => !v)}
            />
          )}
          {error && (
            <ThemedText type="small" style={{ color: theme.expense }}>
              {error}
            </ThemedText>
          )}
          <Pressable
            onPress={extinguish}
            disabled={busy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.extinguish, (pressed || busy) && styles.disabled]}>
            <ThemedText style={styles.extinguishLabel}>{busy ? 'Putting it out…' : '🧯 Put out the fire'}</ThemedText>
          </Pressable>
        </Card>
      </Animated.View>
    </>
  );
}

function Tile({ icon, label, value, delay }: { icon: string; label: string; value: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(450)} style={styles.tile}>
      <Card style={styles.tileCard}>
        <ThemedText style={styles.tileIcon}>{icon}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </ThemedText>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: 560 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  title: { flex: 1, fontSize: 17 },
  content: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  center: { textAlign: 'center' },
  gate: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.five },
  gateIcon: { fontSize: 40, lineHeight: 48 },
  scene: { height: 190, borderRadius: Radius.large, overflow: 'hidden', justifyContent: 'flex-end' },
  flames: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: -10, paddingBottom: Spacing.three },
  sideFlame: { marginHorizontal: -6 },
  intro: { gap: Spacing.two, paddingHorizontal: Spacing.two },
  period: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  periodIcon: { fontSize: 26, lineHeight: 32 },
  field: { gap: Spacing.two },
  hold: {
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3a0a06',
    borderWidth: 2,
    borderColor: Fire.red,
    boxShadow: `0 0 22px ${Fire.red}`,
  },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Fire.orange },
  holdLabel: { color: '#ffffff', fontSize: 17, lineHeight: 22, fontWeight: 900, letterSpacing: 1 },
  disabled: { opacity: 0.45 },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  neon: {
    color: Fire.amber,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 900,
    letterSpacing: 6,
    textShadowColor: Fire.orange,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  burned: {
    color: Fire.yellow,
    fontSize: 52,
    lineHeight: 60,
    fontWeight: 900,
    fontVariant: ['tabular-nums'],
    textShadowColor: Fire.red,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1 },
  tileCard: { gap: Spacing.half, paddingVertical: Spacing.two, paddingHorizontal: Spacing.two + Spacing.one },
  tileIcon: { fontSize: 18, lineHeight: 22 },
  section: { gap: Spacing.three },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  extinguish: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d6fd1',
    boxShadow: '0 0 18px #4fb3ff',
  },
  extinguishLabel: { color: '#ffffff', fontSize: 16, lineHeight: 20, fontWeight: 800 },
});
