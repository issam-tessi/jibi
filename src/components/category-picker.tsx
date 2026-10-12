import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useCategoryColor, useTheme } from '@/hooks/use-theme';
import type { Category } from '@/providers/finance-provider';

type Props = {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Show a "Sort later" tile that maps to null. */
  allowLater?: boolean;
};

/** Grid of category tiles (emoji + name, colored ring when selected). */
export function CategoryPicker({ categories, value, onChange, allowLater }: Props) {
  const theme = useTheme();
  const colorFor = useCategoryColor();

  const tiles = [
    ...(allowLater ? [{ id: null, icon: '⏳', name: 'Sort later', color: theme.unsorted }] : []),
    ...categories.map((c) => ({ id: c.id, icon: c.icon, name: c.name, color: colorFor(c.color_slot) })),
  ];

  return (
    <View style={styles.grid}>
      {tiles.map((t) => {
        const selected = value === t.id;
        return (
          <Pressable
            key={t.id ?? 'later'}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(t.id)}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: selected ? t.color + '22' : theme.backgroundElement,
                borderColor: selected ? t.color : 'transparent',
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.icon}>{t.icon}</ThemedText>
            <ThemedText type="small" numberOfLines={1}>
              {t.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: 2,
  },
  icon: { fontSize: 24, lineHeight: 30 },
  pressed: { opacity: 0.7 },
});
