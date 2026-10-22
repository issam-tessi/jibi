import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { Flame, useLoop } from '@/components/fire';
import { ThemedText } from '@/components/themed-text';
import { Fire } from '@/constants/theme';

/** Shockwave ring that keeps pulsing out of the button. */
function Ring({ delay }: { delay: number }) {
  const progress = useLoop(1800, { delay });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.6, 0]),
    transform: [{ scaleX: interpolate(progress.value, [0, 1], [1, 1.35]) }, { scaleY: interpolate(progress.value, [0, 1], [1, 1.9]) }],
  }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring, style]} />;
}

/** The big red button. While panic mode is on it burns instead of pulsing. */
export function PanicButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  const heartbeat = useLoop(900, { bounce: true });
  const beat = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(heartbeat.value, [0, 1], [1, active ? 1 : 1.05]) }],
  }));

  return (
    <View>
      {!active && (
        <>
          <Ring delay={0} />
          <Ring delay={900} />
        </>
      )}
      <Animated.View style={beat}>
        <Pressable
          onPress={onPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={active ? 'Panic mode is on. Open the damage report' : 'Panic button'}
          style={({ pressed }) => [styles.button, active && styles.buttonActive, pressed && styles.pressed]}>
          <View style={styles.icon}>
            {active ? <Flame size={13} seed={3} /> : <ThemedText style={styles.emoji}>🚨</ThemedText>}
          </View>
          <ThemedText style={styles.label}>{active ? 'PANIC ON' : 'PANIC'}</ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderRadius: 999, backgroundColor: Fire.red },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 999,
    backgroundColor: Fire.red,
    borderWidth: 1.5,
    borderColor: 'rgba(255,220,200,0.55)',
    boxShadow: `0 0 14px ${Fire.red}`,
  },
  buttonActive: {
    backgroundColor: '#2a0805',
    borderColor: Fire.orange,
    boxShadow: `0 0 18px ${Fire.orange}`,
  },
  pressed: { transform: [{ scale: 0.92 }] },
  icon: { width: 16, height: 20, alignItems: 'center', justifyContent: 'flex-end' },
  emoji: { fontSize: 14, lineHeight: 18 },
  label: { color: '#ffffff', fontSize: 13, lineHeight: 16, fontWeight: 900, letterSpacing: 1.6 },
});
