import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewProps,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/** iOS text field on a grouped background. */
export function Input(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textMuted}
      {...props}
      style={[styles.input, { backgroundColor: theme.card, color: theme.text }, props.style]}
    />
  );
}

type ButtonProps = PressableProps & {
  title: string;
  /** primary = filled tint, secondary = tinted, danger = destructive row. */
  variant?: 'primary' | 'secondary' | 'danger';
};

export function Button({ title, variant = 'primary', disabled, ...props }: ButtonProps) {
  const theme = useTheme();
  const bg = variant === 'primary' ? theme.accent : variant === 'danger' ? theme.card : tinted(theme.accent);
  const fg = variant === 'primary' ? '#ffffff' : variant === 'danger' ? theme.expense : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...props}
      style={({ pressed }) => [styles.button, { backgroundColor: bg }, (pressed || disabled) && styles.dimmed]}>
      <ThemedText style={[styles.buttonText, { color: fg }]}>{title}</ThemedText>
    </Pressable>
  );
}

/** Inset grouped section (the rounded white block of an iOS settings list). */
export function Card({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return <View {...props} style={[styles.card, { backgroundColor: theme.card }, style]} />;
}

/** iOS grouped-list section header: small uppercase label above a Card. */
export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <ThemedText themeColor="textSecondary" style={styles.sectionText}>
        {title.toUpperCase()}
      </ThemedText>
      {right}
    </View>
  );
}

/** Capsule option, tinted when selected. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? theme.accent : theme.card },
        pressed && styles.dimmed,
      ]}>
      <ThemedText type="small" style={{ color: selected ? '#ffffff' : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** iOS segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const selectedBg = scheme === 'dark' ? '#636366' : '#ffffff';
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundElement }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && [styles.segmentSelected, { backgroundColor: selectedBg }]]}>
            <ThemedText style={[styles.segmentText, { fontWeight: selected ? 600 : 500, color: theme.text }]}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tint at 15% opacity, e.g. for tinted buttons and icon wells. */
export function tinted(hex: string, alpha = 0.15) {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const shadow = Platform.select({
  web: { boxShadow: '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)' },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
});

const styles = StyleSheet.create({
  input: {
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: 11,
    fontSize: 17,
  },
  button: {
    borderRadius: Radius.large + 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  dimmed: { opacity: 0.5 },
  card: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    overflow: 'hidden',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    marginBottom: -Spacing.two,
  },
  sectionText: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 7,
  },
  segmentSelected: shadow as object,
  segmentText: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
});
