import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Spacing } from '@/constants/theme';

export const BURN_MS = 6000;

const FILTER_W = 64;
const PAPER_W = 210;
const STUB_W = 18; // paper left when it's done
const H = 22;
const PUFFS = 11;

/**
 * Side view of a cigarette. While `lit`, the paper burns down toward the filter with a glowing ember,
 * a growing ash tip and smoke curling up from wherever the tip currently is.
 */
export function BurningCigarette({ lit, onBurnt }: { lit: boolean; onBurnt?: () => void }) {
  const paper = useSharedValue(PAPER_W);
  const glow = useSharedValue(0);
  const smoking = useSharedValue(0);
  // Keep the latest callback without restarting the burn when the parent re-renders.
  const onBurntRef = useRef(onBurnt);
  useEffect(() => {
    onBurntRef.current = onBurnt;
  });
  const burnt = useCallback(() => onBurntRef.current?.(), []);

  useEffect(() => {
    if (!lit) return;
    smoking.value = withTiming(1, { duration: 400 });
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0.35, { duration: 650 })), -1, true);
    paper.value = withTiming(STUB_W, { duration: BURN_MS, easing: Easing.inOut(Easing.quad) }, (done) => {
      if (!done) return;
      smoking.value = withDelay(1200, withTiming(0, { duration: 1200 }));
      glow.value = withTiming(0, { duration: 900 });
      scheduleOnRN(burnt);
    });
  }, [lit, paper, glow, smoking, burnt]);

  const paperStyle = useAnimatedStyle(() => ({ width: paper.value }));
  const emberStyle = useAnimatedStyle(() => ({ opacity: 0.25 + glow.value * 0.75, transform: [{ scale: 0.9 + glow.value * 0.25 }] }));
  // Ash grows a little as it burns, then (being ash) drops off now and then.
  const ashStyle = useAnimatedStyle(() => {
    const burnt = PAPER_W - paper.value;
    return { width: lit ? 4 + (burnt % 40) * 0.35 : 0 };
  });

  return (
    <View style={styles.stage} accessibilityLabel={lit ? 'Cigarette burning' : 'Cigarette'}>
      <View style={styles.cig}>
        <View style={styles.filter}>
          {Array.from({ length: 14 }, (_, i) => (
            <View key={i} style={[styles.fleck, { left: (i * 37) % (FILTER_W - 6), top: (i * 13) % (H - 4) }]} />
          ))}
          <View style={styles.filterBand} />
        </View>
        <Animated.View style={[styles.paper, paperStyle]} />
        <View style={styles.tip}>
          <Animated.View style={[styles.ash, ashStyle]} />
          {lit && <Animated.View style={[styles.ember, emberStyle]} />}
          <View style={styles.smokeOrigin} pointerEvents="none">
            {Array.from({ length: PUFFS }, (_, i) => (
              <Puff key={i} index={i} active={smoking} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function Puff({ index, active }: { index: number; active: SharedValue<number> }) {
  const t = useSharedValue(0);
  const cycle = 2600 + (index % 3) * 400;

  useEffect(() => {
    t.value = withDelay((index * cycle) / PUFFS, withRepeat(withTiming(1, { duration: cycle, easing: Easing.out(Easing.quad) }), -1, false));
  }, [t, index, cycle]);

  const style = useAnimatedStyle(() => {
    const p = t.value;
    const drift = Math.sin(p * Math.PI * 2 + index) * (10 + index * 2) * p;
    return {
      opacity: active.value * (p < 0.15 ? p / 0.15 : 1 - p) * 0.32,
      transform: [{ translateX: drift + p * 12 }, { translateY: -p * 150 }, { scale: 0.4 + p * 2.2 }],
    };
  });

  return <Animated.View style={[styles.puff, style]} />;
}

const styles = StyleSheet.create({
  stage: { height: 200, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Spacing.four },
  cig: { flexDirection: 'row', alignItems: 'center', width: FILTER_W + PAPER_W + 14 },
  filter: {
    width: FILTER_W,
    height: H,
    backgroundColor: '#d9904a',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    overflow: 'hidden',
  },
  fleck: { position: 'absolute', width: 4, height: 2, borderRadius: 1, backgroundColor: '#b26a2a' },
  filterBand: { position: 'absolute', right: 3, top: 0, bottom: 0, width: 2, backgroundColor: '#e8c26a' },
  paper: { height: H, backgroundColor: '#f7f5f0', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ddd8cc' },
  tip: { flexDirection: 'row', alignItems: 'center', height: H },
  ash: { height: H - 2, backgroundColor: '#8f8b85', borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  ember: {
    position: 'absolute',
    left: -3,
    width: 8,
    height: H + 4,
    borderRadius: 4,
    backgroundColor: '#ff6a1a',
    shadowColor: '#ff6a1a',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  smokeOrigin: { position: 'absolute', left: 0, top: -6, width: 1, height: 1 },
  puff: {
    position: 'absolute',
    left: -13,
    top: -13,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#c9c9c9',
  },
});
