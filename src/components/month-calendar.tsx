import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { toISODate, today } from '@/lib/dates';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// Sequential blue ramp (light -> dark) for "how much was spent that day".
const RAMP = {
  light: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf'],
  dark: ['#104281', '#184f95', '#1c5cab', '#2a78d6', '#3987e5'],
};

/** Month grid (Monday first). Each day shows how much was spent, tinted by amount; tap a day to open it. */
export function MonthCalendar({
  year,
  month,
  spentByDay,
  onSelectDay,
  formatCompact,
}: {
  year: number;
  month: number;
  spentByDay: Map<string, number>;
  onSelectDay: (iso: string) => void;
  formatCompact: (v: number) => string;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const ramp = RAMP[scheme === 'dark' ? 'dark' : 'light'];
  const todayIso = today();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const max = Math.max(...spentByDay.values(), 1);

  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(year, month, i + 1))),
  ];
  while (cells.length % 7) cells.push(null);

  return (
    <View style={styles.grid}>
      {WEEKDAYS.map((d, i) => (
        <View key={`h${i}`} style={styles.cell}>
          <ThemedText type="small" themeColor="textMuted" style={styles.weekday}>
            {d}
          </ThemedText>
        </View>
      ))}
      {cells.map((iso, i) => {
        if (!iso) return <View key={`e${i}`} style={styles.cell} />;
        const spent = spentByDay.get(iso) ?? 0;
        const step = spent ? Math.min(ramp.length - 1, Math.floor((spent / max) * ramp.length)) : -1;
        const bg = step >= 0 ? ramp[step] : theme.backgroundElement;
        const dark = step >= 3 || (scheme === 'dark' && step >= 0);
        const future = iso > todayIso;
        return (
          <View key={iso} style={styles.cell}>
            <Pressable
              onPress={() => onSelectDay(iso)}
              disabled={future}
              accessibilityRole="button"
              accessibilityLabel={`${iso}: spent ${formatCompact(spent)}`}
              style={({ pressed }) => [
                styles.day,
                { backgroundColor: bg, opacity: future ? 0.35 : pressed ? 0.7 : 1 },
                iso === todayIso && { borderWidth: 2, borderColor: theme.text },
              ]}>
              <ThemedText type="smallBold" style={[styles.num, { color: dark ? '#ffffff' : theme.text }]}>
                {Number(iso.slice(8))}
              </ThemedText>
              {spent > 0 && (
                <ThemedText style={[styles.amount, { color: dark ? '#ffffff' : theme.textSecondary }]} numberOfLines={1}>
                  {formatCompact(spent)}
                </ThemedText>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, padding: 2 },
  weekday: { textAlign: 'center', fontSize: 11 },
  day: { aspectRatio: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1 },
  num: { fontSize: 13, lineHeight: 16 },
  amount: { fontSize: 9, lineHeight: 11, fontVariant: ['tabular-nums'] },
});
