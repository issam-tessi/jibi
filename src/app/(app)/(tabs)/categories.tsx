import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, SectionTitle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useCategoryColor, useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useFinance, type Category } from '@/providers/finance-provider';

const ICONS = ['🛒', '🥖', '☕', '🍔', '🍕', '🥤', '🍰', '🍽️', '🚬', '🍺', '🎮', '🎬', '🎵', '⚽', '🏋️', '🎲', '🏠', '💡', '💧', '🔥', '📶', '📱', '🧾', '🧹', '⛽', '🚗', '🚕', '🚌', '🚆', '🛵', '🅿️', '✈️', '💊', '🏥', '🦷', '👓', '💇', '🧴', '💄', '🧺', '👶', '🍼', '🎓', '📚', '🐶', '🎁', '🎂', '💍', '🐑', '🌙', '🕌', '🏖️', '💸', '🤝', '🏦', '💳', '👕', '👟', '🛍️', '💻', '🛠️', '🧸', '🚭', '📦'];

export default function CategoriesScreen() {
  const theme = useTheme();
  const { categories, createCategory, deleteCategory } = useFinance();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) return setError('Give it a name.');
    setBusy(true);
    setError(null);
    const err = await createCategory(name, icon);
    setBusy(false);
    if (err) setError(err.includes('duplicate') ? 'You already have a category with that name.' : err);
    else setName('');
  }

  async function remove(c: Category) {
    const message = 'Payments in it will move back to “To sort”.';
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(`Delete “${c.name}”? ${message}`)
        : await new Promise<boolean>((resolve) =>
            Alert.alert(`Delete “${c.name}”?`, message, [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ])
          );
    if (!confirmed) return;
    const err = await deleteCategory(c.id);
    if (err) setError(err);
  }

  return (
    <Screen>
      <SectionTitle title="New category" />
      <Card style={styles.form}>
        <View style={styles.icons}>
          {ICONS.map((i) => (
            <Pressable
              key={i}
              onPress={() => setIcon(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: icon === i }}
              style={[
                styles.iconChoice,
                { backgroundColor: icon === i ? theme.backgroundSelected : 'transparent' },
              ]}>
              <ThemedText style={styles.iconText}>{i}</ThemedText>
            </Pressable>
          ))}
        </View>
        <Input placeholder="Name, e.g. Coffee" value={name} onChangeText={setName} maxLength={60} onSubmitEditing={add} />
        {error && (
          <ThemedText type="small" style={{ color: theme.expense }}>
            {error}
          </ThemedText>
        )}
        <Button title={`Add ${icon} ${name.trim() || 'category'}`} disabled={busy} onPress={add} />
      </Card>

      <SectionTitle title={`Your categories · ${categories.length}`} />
      <Card style={styles.list}>
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} onDelete={() => remove(c)} />
        ))}
      </Card>

      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}

function CategoryRow({ category, onDelete }: { category: Category; onDelete: () => void }) {
  const colorFor = useCategoryColor();
  const color = colorFor(category.color_slot);
  return (
    <View style={styles.row}>
      <View style={[styles.bubble, { backgroundColor: color + '26', borderColor: color }]}>
        <ThemedText style={styles.rowIcon}>{category.icon}</ThemedText>
      </View>
      <ThemedText style={styles.rowName}>{category.name}</ThemedText>
      <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Delete ${category.name}`}>
        <ThemedText type="small" themeColor="textMuted">
          Delete
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  iconChoice: { width: 44, height: 44, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 22, lineHeight: 28 },
  list: { paddingVertical: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
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
