import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconPicker, CATEGORY_ICONS } from '@/components/icon-picker';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, SectionTitle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCategoryColor, useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useFinance, type Category } from '@/providers/finance-provider';

function duplicateNameMessage(err: string) {
  return err.includes('duplicate') ? 'You already have a category with that name.' : err;
}

export default function CategoriesScreen() {
  const theme = useTheme();
  const { categories, createCategory } = useFinance();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) return setError('Give it a name.');
    setBusy(true);
    setError(null);
    const err = await createCategory(name, icon);
    setBusy(false);
    if (err) setError(duplicateNameMessage(err));
    else setName('');
  }

  return (
    <Screen>
      <SectionTitle title={`Your categories · ${categories.length}`} />
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

      <SectionTitle title="New category" />
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

      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
    </Screen>
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
