import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Series = { key: string; label: string; color: string; values: number[] };

type Props = {
  series: Series[];
  /** One label per point (x axis); null leaves the tick unlabeled. */
  xLabels: (string | null)[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  formatValue: (v: number) => string;
  height?: number;
};

/** Multi-series line chart on one shared axis, with a crosshair on the selected/hovered point. */
export function LineChart({ series, xLabels, selectedIndex, onSelect, formatValue, height = 160 }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const count = xLabels.length;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const pad = 4; // keeps 2px lines and 8px markers inside the plot
  const x = (i: number) => (count <= 1 ? width / 2 : pad + (i / (count - 1)) * (width - pad * 2));
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2);
  const active = hover ?? selectedIndex;

  return (
    <View>
      <View style={styles.topLabel}>
        <ThemedText type="small" themeColor="textMuted" style={styles.axisText}>
          {formatValue(max)}
        </ThemedText>
      </View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={y(max)} y2={y(max)} stroke={theme.backgroundSelected} strokeWidth={1} />
            <Line x1={0} x2={width} y1={y(min)} y2={y(min)} stroke={theme.textMuted} strokeWidth={1} />
            {active != null && (
              <Line x1={x(active)} x2={x(active)} y1={0} y2={height} stroke={theme.textMuted} strokeWidth={1} strokeDasharray="3 3" />
            )}
            {series.map((s) => (
              <Polyline
                key={s.key}
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {active != null &&
              series.map((s) => (
                <Circle
                  key={s.key}
                  cx={x(active)}
                  cy={y(s.values[active] ?? 0)}
                  r={4.5}
                  fill={s.color}
                  stroke={theme.card}
                  strokeWidth={2}
                />
              ))}
          </Svg>
        )}
        {/* Invisible hit columns, wider than the line itself. */}
        <View style={[StyleSheet.absoluteFill, styles.hits]}>
          {xLabels.map((label, i) => (
            <Pressable
              key={i}
              style={styles.hit}
              onPress={() => onSelect(selectedIndex === i ? null : i)}
              onHoverIn={() => setHover(i)}
              onHoverOut={() => setHover(null)}
              accessibilityRole="button"
              accessibilityLabel={`${label ?? i + 1}: ${series.map((s) => `${s.label} ${formatValue(s.values[i] ?? 0)}`).join(', ')}`}
            />
          ))}
        </View>
      </View>
      <View style={styles.labels}>
        {xLabels.map((label, i) => (
          <View key={i} style={styles.labelCell}>
            {label ? (
              <ThemedText type="small" themeColor={active === i ? 'text' : 'textMuted'} style={styles.axisText}>
                {label}
              </ThemedText>
            ) : null}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {s.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topLabel: { alignItems: 'flex-end', marginBottom: Spacing.half },
  axisText: { fontSize: 11, lineHeight: 14, fontVariant: ['tabular-nums'] },
  hits: { flexDirection: 'row' },
  hit: { flex: 1 },
  labels: { flexDirection: 'row', marginTop: Spacing.one },
  labelCell: { flex: 1, alignItems: 'center' },
  legend: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  swatch: { width: 12, height: 3, borderRadius: 2 },
});
