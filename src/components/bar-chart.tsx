import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Bar = {
  key: string;
  value: number;
  /** Axis label under the bar; omit to leave a gap (e.g. label every 5th day). */
  label?: string;
  /** Not reachable yet (future day/month): drawn as an empty slot, not selectable. */
  disabled?: boolean;
};

type Props = {
  bars: Bar[];
  color: string;
  selectedKey?: string | null;
  onSelect?: (key: string | null) => void;
  /** Hover (web) preview; mirrors selection for pointer users. */
  onHover?: (key: string | null) => void;
  /** Optional dashed reference line, e.g. daily average. */
  reference?: { value: number; label: string };
  /** Formats the top gridline value. */
  formatValue: (value: number) => string;
  height?: number;
};

const BAR_GAP = 2;

/** Single-series vertical bar chart: thin rounded bars on a baseline, tap to select, hover to preview. */
export function BarChart({ bars, color, selectedKey, onSelect, onHover, reference, formatValue, height = 160 }: Props) {
  const theme = useTheme();
  const max = Math.max(...bars.map((b) => b.value), reference?.value ?? 0, 1);
  const scale = (v: number) => (v / max) * height;

  return (
    <View>
      <View style={styles.topLabel}>
        <ThemedText type="small" themeColor="textMuted" style={styles.axisText}>
          {formatValue(max)}
        </ThemedText>
      </View>
      <View style={[styles.plot, { height, borderBottomColor: theme.textMuted }]}>
        {/* Top gridline */}
        <View style={[styles.gridline, { top: 0, backgroundColor: theme.backgroundSelected }]} />

        <View style={[styles.bars, { gap: BAR_GAP }]}>
          {bars.map((b) => {
            const selected = selectedKey === b.key;
            const faded = selectedKey != null && !selected;
            const h = b.value > 0 ? Math.max(scale(b.value), 3) : 0;
            return (
              <Pressable
                key={b.key}
                disabled={b.disabled}
                onPress={() => onSelect?.(selected ? null : b.key)}
                onHoverIn={() => onHover?.(b.key)}
                onHoverOut={() => onHover?.(null)}
                accessibilityRole="button"
                accessibilityLabel={`${b.label ?? b.key}: ${formatValue(b.value)}`}
                accessibilityState={{ selected, disabled: b.disabled }}
                // Hit target is the full column height, larger than the bar itself.
                style={styles.column}>
                {selected && <View style={[styles.highlight, { backgroundColor: theme.backgroundElement }]} />}
                <View
                  style={[
                    styles.bar,
                    {
                      height: h,
                      backgroundColor: b.disabled ? 'transparent' : color,
                      opacity: faded ? 0.35 : 1,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {reference && reference.value > 0 && (
          <View
            pointerEvents="none"
            style={[styles.reference, { bottom: scale(reference.value), borderColor: theme.textSecondary }]}>
            <ThemedText type="small" themeColor="textSecondary" style={[styles.referenceLabel, { backgroundColor: theme.card }]}>
              {reference.label}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.labels, { gap: BAR_GAP }]}>
        {bars.map((b) => (
          <View key={b.key} style={styles.labelCell}>
            {b.label ? (
              <ThemedText
                type="small"
                themeColor={selectedKey === b.key ? 'text' : 'textMuted'}
                style={styles.axisText}
                numberOfLines={1}>
                {b.label}
              </ThemedText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topLabel: { alignItems: 'flex-end', marginBottom: Spacing.half },
  axisText: { fontSize: 11, lineHeight: 14, fontVariant: ['tabular-nums'] },
  plot: { borderBottomWidth: 1, justifyContent: 'flex-end' },
  gridline: { position: 'absolute', left: 0, right: 0, height: 1 },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  highlight: { position: 'absolute', top: 0, bottom: 0, left: -1, right: -1, borderRadius: 4 },
  bar: { width: '100%', maxWidth: 28, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  reference: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  referenceLabel: {
    position: 'absolute',
    right: 0,
    top: -16,
    fontSize: 11,
    lineHeight: 14,
    paddingHorizontal: Spacing.one,
  },
  labels: { flexDirection: 'row', marginTop: Spacing.one },
  labelCell: { flex: 1, alignItems: 'center', overflow: 'visible' },
});
