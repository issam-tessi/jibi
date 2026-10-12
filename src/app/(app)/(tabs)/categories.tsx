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
    <Screen title="Categories">
      <View style={styles.section}>
        <SectionTitle title={`Your categories · ${categories.length}`} />
        <Card style={styles.list}>
          {categories.map((c, i) => (
            <CategoryRow
              key={c.id}
              category={c}
              last={i === categories.length - 1}
              onPress={() => router.push({ pathname: '/category/[id]', params: { id: c.id } })}
            />
          ))}
        </Card>
        <ThemedText themeColor="textSecondary" style={styles.footer}>
          Tap a category to rename it or change its icon.
        </ThemedText>
      </View>

      <View style={styles.section}>
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
      </View>

      <Button title="Sign Out" variant="danger" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}

function CategoryRow({ category, onPress, last }: { category: Category; onPress: () => void; last: boolean }) {
  const theme = useTheme();
  const color = useCategoryColor()(category.color_slot);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${category.name}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.icon, { backgroundColor: color }]}>
        <ThemedText style={styles.iconText}>{category.icon}</ThemedText>
      </View>
      <View style={[styles.rowBody, !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <ThemedText style={styles.rowName}>{category.name}</ThemedText>
        <ThemedText themeColor="textMuted" style={styles.chevron}>
          ›
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  form: { gap: Spacing.three },
  list: { padding: 0 },
  footer: { paddingHorizontal: Spacing.three, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, gap: 14 },
  icon: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 16, lineHeight: 20 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingRight: 14 },
  rowName: { flex: 1 },
  chevron: { fontSize: 20, lineHeight: 22 },
});
