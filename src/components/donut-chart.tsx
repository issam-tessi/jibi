import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type DonutSlice = { key: string; value: number; color: string };

type Props = {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  /** Slice to emphasize; others fade. */
  activeKey?: string | null;
  centerLabel: string;
  centerValue: string;
};

const GAP_PX = 2; // surface gap between adjacent segments

/** Ring chart: one arc per slice, with a headline figure in the middle. */
export function DonutChart({ slices, size = 200, thickness = 22, activeKey, centerLabel, centerValue }: Props) {
  const theme = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const visible = slices.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? GAP_PX : 0;

  const lengths = visible.map((slice) => (slice.value / total) * circumference);
  const arcs = visible.map((slice, i) => ({
    ...slice,
    dash: Math.max(lengths[i] - gap, 0.5),
    offset: lengths.slice(0, i).reduce((s, l) => s + l, 0),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.backgroundElement}
          strokeWidth={thickness}
          fill="none"
        />
        {arcs.map((arc) => (
          <Circle
            key={arc.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arc.color}
            strokeWidth={activeKey === arc.key ? thickness + 6 : thickness}
            strokeOpacity={activeKey && activeKey !== arc.key ? 0.25 : 1}
            strokeDasharray={`${arc.dash} ${circumference}`}
            strokeDashoffset={-arc.offset}
            fill="none"
            // Start at 12 o'clock and go clockwise.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <ThemedText type="small" themeColor="textSecondary">
          {centerLabel}
        </ThemedText>
        <ThemedText style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {centerValue}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  value: { fontSize: 24, lineHeight: 30, fontWeight: 700, fontVariant: ['tabular-nums'] },
});
