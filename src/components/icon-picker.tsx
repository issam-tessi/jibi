import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const CATEGORY_ICONS = [
  // food & drink
  '🛒', '🥖', '☕', '🍔', '🍕', '🥤', '🍰', '🍽️',
  // habits & fun
  '🚬', '🍺', '🎮', '🎬', '🎵', '⚽', '🏋️', '🎲',
  // gym & sport
  '💪', '🏃', '🚴', '🏊', '🧘', '🥊', '🎾', '🏀',
  // home & bills
  '🏠', '💡', '💧', '🔥', '📶', '📱', '🧾', '🧹',
  // transport
  '⛽', '🚗', '🚕', '🚌', '🚆', '🛵', '🅿️', '✈️',
  // health & care
  '💊', '🏥', '🦷', '👓', '💇', '🧴', '💄', '🧺',
  // family & life
  '👶', '🍼', '🎓', '📚', '🐶', '🎁', '🎂', '💍',
  // occasions & money
  '🐑', '🌙', '🕌', '🏖️', '💸', '🤝', '🏦', '💳',
  // other
  '👕', '👟', '🛍️', '💻', '🛠️', '🧸', '🚭', '📦',
];

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const theme = useTheme();
  // Keep a category's current icon selectable even if it isn't in the list.
  const icons = CATEGORY_ICONS.includes(value) ? CATEGORY_ICONS : [value, ...CATEGORY_ICONS];
  return (
    <View style={styles.icons}>
      {icons.map((i) => (
        <Pressable
          key={i}
          onPress={() => onChange(i)}
          accessibilityRole="button"
          accessibilityLabel={`Icon ${i}`}
          accessibilityState={{ selected: value === i }}
          style={[styles.choice, { backgroundColor: value === i ? theme.backgroundSelected : 'transparent' }]}>
          <ThemedText style={styles.text}>{i}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  choice: { width: 44, height: 44, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 22, lineHeight: 28 },
});
