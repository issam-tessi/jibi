import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconPicker, CATEGORY_ICONS } from '@/components/icon-picker';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCategoryColor, useTheme } from '@/hooks/use-theme';
import { useFinance, type Category } from '@/providers/finance-provider';

function duplicateNameMessage(err: string) {
  return /duplicate|UNIQUE/.test(err) ? 'You already have a category with that name.' : err;
}

/** Category list and "new category" form, shown in Settings. */
export function CategorySettings() {
  const theme = useTheme();
  const { categories, createCategory } = useFinance();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!name.trim()) return setError('Give it a name.');
    setBusy(true);
    setError(null);
    const err = await createCategory(name, icon);
    setBusy(false);
    if (err) setError(duplicateNameMessage(err));
    else {
      setName('');
      setAdding(false);
    }
  }

  return (
    <>
      <SectionTitle
        title={`Categories · ${categories.length}`}
        right={
          <Pressable onPress={() => setAdding(!adding)} hitSlop={8} accessibilityRole="button">
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              {adding ? 'Cancel' : '＋ New'}
            </ThemedText>
          </Pressable>
        }
      />
      <Card style={styles.list}>
        <ThemedText type="small" themeColor="textSecondary">
          Tap a category to rename it or change its icon.
        </ThemedText>
        {categories.map((c) => (
          <CategoryRow
            key={c.id}
            category={c}
            onPress={() => router.push({ pathname: '/category/[id]', params: { id: c.id } })}
          />
        ))}
      </Card>

      {adding && (
      <Card style={styles.form}>
        <IconPicker value={icon} onChange={setIcon} />
        <Input
          placeholder="Name, e.g. Cigarettes"
          value={name}
          onChangeText={setName}
          maxLength={60}
          onSubmitEditing={add}
        />
        {error && (
          <ThemedText type="small" style={{ color: theme.expense }}>
            {error}
          </ThemedText>
        )}
        <Button title={`Add ${icon} ${name.trim() || 'category'}`} disabled={busy} onPress={add} />
      </Card>
      )}
    </>
  );
}

function CategoryRow({ category, onPress }: { category: Category; onPress: () => void }) {
  const colorFor = useCategoryColor();
  const color = colorFor(category.color_slot);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${category.name}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.bubble, { backgroundColor: color + '26', borderColor: color }]}>
        <ThemedText style={styles.rowIcon}>{category.icon}</ThemedText>
      </View>
      <ThemedText style={styles.rowName}>{category.name}</ThemedText>
      <ThemedText themeColor="textMuted">›</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  list: { paddingVertical: Spacing.three, gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  pressed: { opacity: 0.6 },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon: { fontSize: 16, lineHeight: 20 },
  rowName: { flex: 1 },
});
