import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';

import { FireField, Flame, useLoop } from '@/components/fire';
import { ThemedText } from '@/components/themed-text';
import { Fire, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/dates';
import { potIcon, potLabel } from '@/lib/pots';
import { PANIC_POTS, type PanicReport } from '@/providers/panic-provider';

/** A 0→1 shared value that plays once on mount (instantly with reduced motion). */
function useIntro(duration: number, delay = 0) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    progress.set(withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) })));
  }, [progress, duration, delay, reduced]);
  return progress;
}

/**
 * "What Jibi thought" (flat, dashed) vs "reality" (sloping down to what was counted) over the dark period.
 * The gap between them is filled with fire. The real path is unknown, so the slope is an even-spread estimate.
 */
export function BurnChart({ report, formatValue, height = 190 }: { report: PanicReport; formatValue: (v: number) => string; height?: number }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const reveal = useIntro(1600, 250);

  const recorded = report.recorded.card + report.recorded.cash;
  const actual = report.actual.card + report.actual.cash;
  const spread = Math.abs(recorded - actual) || Math.abs(recorded) * 0.2 || 1;
  const max = Math.max(recorded, actual) + spread * 0.25;
  const min = Math.min(recorded, actual) - spread * 0.35;
  const pad = 14;
  const points = Math.min(report.days, 60) + 1;
  const x = (i: number) => pad + (i / (points - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (height - pad * 2);
  const reality = Array.from({ length: points }, (_, i) => recorded - (recorded - actual) * (i / (points - 1)));
  const ghost = reality.map((_, i) => `${x(i)},${y(recorded)}`);
  const real = reality.map((v, i) => `${x(i)},${y(v)}`);
  const end = { x: x(points - 1), y: y(actual) };

  const curtain = useAnimatedStyle(() => ({ width: `${reveal.value * 100}%` }));
  const endFlame = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0.85, 1], [0, 1]),
    transform: [{ scale: interpolate(reveal.value, [0.85, 1], [0.2, 1]) }],
  }));
  const pulse = useLoop(1100, { bounce: true });
  const dot = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2.4]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.7, 0]),
  }));

  return (
    <View style={styles.chart}>
      <View style={[styles.row, styles.legend]}>
        <Legend dashed color={theme.textMuted} label={`Jibi thought · ${formatValue(recorded)}`} />
        <Legend color={Fire.orange} label={`Reality · ${formatValue(actual)}`} />
      </View>

      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <>
            <Animated.View style={[styles.curtain, curtain]}>
              <Svg width={width} height={height}>
                <Defs>
                  <LinearGradient id="burn" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={Fire.yellow} stopOpacity={0.95} />
                    <Stop offset="0.45" stopColor={Fire.orange} stopOpacity={0.85} />
                    <Stop offset="1" stopColor={Fire.red} stopOpacity={0.35} />
                  </LinearGradient>
                </Defs>
                <Line x1={0} x2={width} y1={y(min) - 1} y2={y(min) - 1} stroke={theme.border} strokeWidth={1} />
                <Polygon points={[...ghost, ...real.slice().reverse()].join(' ')} fill="url(#burn)" />
                <Polyline points={ghost.join(' ')} fill="none" stroke={theme.textMuted} strokeWidth={2} strokeDasharray="5 5" />
                <Polyline
                  points={real.join(' ')}
                  fill="none"
                  stroke={Fire.orange}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Circle cx={end.x} cy={end.y} r={5} fill={Fire.yellow} stroke={theme.card} strokeWidth={2} />
              </Svg>
            </Animated.View>
            {report.burned > 0 && <FireField embers={18} smoke={5} seed={7} />}
            <Animated.View pointerEvents="none" style={[styles.dot, { left: end.x - 5, top: end.y - 5 }, dot]} />
            {report.burned > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[styles.endFlame, { left: end.x - 15, top: end.y - 46 }, endFlame]}>
                <Flame size={30} seed={11} />
              </Animated.View>
            )}
          </>
        )}
      </View>

      <View style={styles.row}>
        <ThemedText type="small" themeColor="textMuted" style={styles.axis}>
          {formatDay(report.since)} · last entry
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.axis}>
          {formatDay(report.until)} · panic
        </ThemedText>
      </View>
    </View>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, dashed ? { borderColor: color, borderWidth: 1.5, borderStyle: 'dashed' } : { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const CANDLE_HEIGHT = 150;

/** One candle per pot: the ghost outline is what Jibi recorded, the wax melts down to what's really left. */
export function BurnCandles({ report, formatValue }: { report: PanicReport; formatValue: (v: number) => string }) {
  const top = Math.max(1, ...PANIC_POTS.flatMap((p) => [report.recorded[p], report.actual[p]]));
  return (
    <View style={styles.candles}>
      {PANIC_POTS.map((pot, i) => (
        <Candle
          key={pot}
          seed={i}
          label={`${potIcon(pot)} ${potLabel(pot)}`}
          from={Math.max(0, report.recorded[pot]) / top}
          to={Math.max(0, report.actual[pot]) / top}
          burned={Math.max(0, report.gap[pot])}
          actualLabel={formatValue(report.actual[pot])}
          burnedLabel={formatValue(Math.max(0, report.gap[pot]))}
        />
      ))}
    </View>
  );
}

function Candle({
  seed,
  label,
  from,
  to,
  burned,
  actualLabel,
  burnedLabel,
}: {
  seed: number;
  label: string;
  from: number;
  to: number;
  burned: number;
  actualLabel: string;
  burnedLabel: string;
}) {
  const theme = useTheme();
  const melt = useIntro(1800, 500 + seed * 250);
  const wax = useAnimatedStyle(() => ({ height: interpolate(melt.value, [0, 1], [from, to]) * CANDLE_HEIGHT }));

  return (
    <View style={styles.candleCol}>
      <ThemedText type="smallBold" style={styles.center}>
        {actualLabel}
      </ThemedText>
      <View style={styles.candleTrack}>
        <View style={[styles.ghost, { height: from * CANDLE_HEIGHT, borderColor: theme.textMuted }]} />
        <Animated.View style={[styles.wax, wax]}>
          {burned > 0 && <Flame size={26} seed={20 + seed} style={styles.wick} />}
          <View style={styles.waxShine} />
        </Animated.View>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={[styles.center, { color: burned > 0 ? Fire.orange : theme.income }]}>
        {burned > 0 ? `🔥 −${burnedLabel}` : '✓ intact'}
      </ThemedText>
    </View>
  );
}

/** How much of the fire has been explained by back-dated entries. */
export function Containment({ report }: { report: PanicReport }) {
  const share = report.burned > 0 ? report.explainedTotal / report.burned : 1;
  const grow = useIntro(1200, 300);
  const bar = useAnimatedStyle(() => ({ width: `${grow.value * share * 100}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.water, bar]} />
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  legend: { flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexShrink: 1 },
  swatch: { width: 14, height: 4, borderRadius: 2 },
  axis: { fontSize: 11, lineHeight: 14 },
  curtain: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: Fire.yellow },
  endFlame: { position: 'absolute' },
  candles: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: Spacing.four },
  candleCol: { alignItems: 'center', gap: Spacing.one, minWidth: 110 },
  center: { textAlign: 'center' },
  candleTrack: { height: CANDLE_HEIGHT, width: 46, justifyContent: 'flex-end', alignItems: 'center', marginTop: Spacing.four },
  ghost: {
    position: 'absolute',
    bottom: 0,
    width: 46,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  wax: {
    width: 40,
    minHeight: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: Fire.amber,
    boxShadow: `0 0 18px ${Fire.orange}`,
  },
  waxShine: { position: 'absolute', left: 6, top: 8, bottom: 6, width: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  wick: { position: 'absolute', bottom: '100%', left: 7, marginBottom: -4 },
  track: { height: 12, borderRadius: 6, backgroundColor: 'rgba(255,106,26,0.25)', overflow: 'hidden' },
  water: { height: '100%', borderRadius: 6, backgroundColor: '#4fb3ff', boxShadow: '0 0 10px #4fb3ff' },
});
