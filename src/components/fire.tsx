import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Fire } from '@/constants/theme';

/** Deterministic 0..1 noise, so particles look random but render the same every time. */
export function noise(i: number, salt = 1) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** A shared value looping 0→1 forever (or 0→1→0 with `bounce`). Stays at 0 with reduced motion. */
export function useLoop(duration: number, { delay = 0, bounce = false } = {}) {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const easing = bounce ? Easing.inOut(Easing.sin) : Easing.linear;
    progress.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing }), -1, bounce)));
    return () => cancelAnimation(progress);
  }, [progress, duration, delay, bounce, reduced]);
  return progress;
}

/** One teardrop: a square with one sharp corner, turned so the point faces up. */
function Drop({ size, color, glow }: { size: number; color: string; glow?: boolean }) {
  return (
    <View
      style={[
        styles.drop,
        {
          width: size,
          height: size,
          bottom: size * 0.21,
          marginLeft: -size / 2,
          // Longhands only: on web a `borderRadius` shorthand would round the point too.
          borderTopRightRadius: size / 2,
          borderBottomLeftRadius: size / 2,
          borderBottomRightRadius: size / 2,
          backgroundColor: color,
        },
        glow && { boxShadow: `0 0 ${size * 0.6}px ${Fire.orange}` },
      ]}
    />
  );
}

/** A flickering flame, `size` wide and ~1.45× as tall. */
export function Flame({ size = 48, seed = 0, style }: { size?: number; seed?: number; style?: StyleProp<ViewStyle> }) {
  const flicker = useLoop(320 + noise(seed) * 220, { bounce: true });
  const sway = useLoop(900 + noise(seed, 2) * 600, { bounce: true });

  const outer = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(sway.value, [0, 1], [-size * 0.05, size * 0.05]) },
      { scaleY: interpolate(flicker.value, [0, 1], [0.9, 1.12]) },
      { scaleX: interpolate(flicker.value, [0, 1], [1.05, 0.94]) },
    ],
  }));
  const inner = useAnimatedStyle(() => ({
    opacity: interpolate(flicker.value, [0, 1], [0.8, 1]),
    transform: [{ scaleY: interpolate(flicker.value, [0, 1], [1.12, 0.9]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ width: size, height: size * 1.45 }, styles.bottomOrigin, outer, style]}>
      <Drop size={size} color={Fire.red} glow />
      <Drop size={size * 0.74} color={Fire.orange} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.bottomOrigin, inner]}>
        <Drop size={size * 0.5} color={Fire.amber} />
        <Drop size={size * 0.28} color={Fire.core} />
      </Animated.View>
    </Animated.View>
  );
}

/** A tiny glowing spark that drifts upward and fades. */
function Ember({ index, height }: { index: number; height: number }) {
  const progress = useLoop(2200 + noise(index, 3) * 2600, { delay: noise(index, 4) * 3000 });
  const size = 2 + noise(index, 5) * 3.5;
  const rise = height * (0.55 + noise(index, 6) * 0.45);
  const drift = 6 + noise(index, 7) * 14;
  const phase = noise(index, 8) * Math.PI * 2;

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08, 0.7, 1], [0, 1, 0.8, 0]),
    transform: [
      { translateY: -progress.value * rise },
      { translateX: Math.sin(progress.value * Math.PI * 3 + phase) * drift },
      { scale: interpolate(progress.value, [0, 1], [1, 0.3]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.ember,
        {
          left: `${noise(index, 9) * 100}%`,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: noise(index, 10) > 0.5 ? Fire.amber : Fire.yellow,
          boxShadow: `0 0 ${size * 2.5}px ${Fire.orange}`,
        },
        style,
      ]}
    />
  );
}

/** A soft grey puff that rises, swells and dissolves. */
function Puff({ index, height }: { index: number; height: number }) {
  const progress = useLoop(4200 + noise(index, 11) * 3000, { delay: noise(index, 12) * 4000 });
  const size = 34 + noise(index, 13) * 46;
  const drift = (noise(index, 14) - 0.5) * 70;

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 0.6, 1], [0, 0.22, 0.1, 0]),
    transform: [
      { translateY: -progress.value * height * 0.9 },
      { translateX: progress.value * drift },
      { scale: interpolate(progress.value, [0, 1], [0.4, 2.3]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.puff,
        {
          left: `${10 + noise(index, 15) * 80}%`,
          bottom: -size / 2,
          width: size,
          height: size,
          borderRadius: size,
          marginLeft: -size / 2,
          backgroundColor: Fire.smoke,
        },
        style,
      ]}
    />
  );
}

/** Background layer of rising smoke and embers; fills its parent and never takes touches. */
export function FireField({ embers = 16, smoke = 6, seed = 0 }: { embers?: number; smoke?: number; seed?: number }) {
  const [height, setHeight] = useState(0);
  const reduced = useReducedMotion();
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.field]}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && !reduced && (
        <>
          {Array.from({ length: smoke }, (_, i) => (
            <Puff key={`s${i}`} index={seed * 100 + i} height={height} />
          ))}
          {Array.from({ length: embers }, (_, i) => (
            <Ember key={`e${i}`} index={seed * 100 + i} height={height} />
          ))}
        </>
      )}
    </View>
  );
}

/** Glowing orange haze along the bottom edge, gently breathing. */
export function Glow({ color = Fire.orange }: { color?: string }) {
  const breathe = useLoop(1800, { bounce: true });
  const style = useAnimatedStyle(() => ({ opacity: interpolate(breathe.value, [0, 1], [0.35, 0.7]) }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.glow, { boxShadow: `0 0 80px 40px ${color}`, backgroundColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  bottomOrigin: { transformOrigin: 'bottom' },
  drop: {
    position: 'absolute',
    left: '50%',
    borderTopLeftRadius: 0,
    transform: [{ rotate: '45deg' }],
  },
  field: { overflow: 'hidden' },
  ember: { position: 'absolute', bottom: 0 },
  puff: { position: 'absolute' },
  glow: { position: 'absolute', left: '10%', right: '10%', bottom: -10, height: 10, borderRadius: 10 },
});
