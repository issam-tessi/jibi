import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { IconPicker } from '@/components/icon-picker';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Button, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useCategoryColor, useTheme } from '@/hooks/use-theme';
import { useFinance, type Category } from '@/providers/finance-provider';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories } = useFinance();
  const category = categories.find((c) => c.id === id);

  if (!category) {
    return (
      <Sheet title="Category">
        <ThemedText themeColor="textSecondary">This category no longer exists.</ThemedText>
      </Sheet>
    );
  }
  return <EditCategory category={category} />;
}

function EditCategory({ category }: { category: Category }) {
  const theme = useTheme();
  const color = useCategoryColor()(category.color_slot);
  const { updateCategory, deleteCategory } = useFinance();
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return setError('Give it a name.');
    setBusy(true);
    setError(null);
    const err = await updateCategory(category.id, name, icon);
    setBusy(false);
    if (err) setError(/duplicate|UNIQUE/.test(err) ? 'You already have a category with that name.' : err);
    else router.back();
  }

  async function remove() {
    const message = 'Payments in it will move back to “To sort”.';
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(`Delete “${category.name}”? ${message}`)
        : await new Promise<boolean>((resolve) =>
            Alert.alert(`Delete “${category.name}”?`, message, [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ])
          );
    if (!confirmed) return;
    const err = await deleteCategory(category.id);
    if (err) setError(err);
    else router.back();
  }

  return (
    <Sheet title="Edit category">
      <View style={styles.preview}>
        <View style={[styles.bubble, { backgroundColor: color + '26', borderColor: color }]}>
          <ThemedText style={styles.previewIcon}>{icon}</ThemedText>
        </View>
        <ThemedText type="smallBold" style={styles.previewName}>
          {name.trim() || 'Category'}
        </ThemedText>
      </View>

      <Input placeholder="Name" value={name} onChangeText={setName} maxLength={60} onSubmitEditing={save} />
      <IconPicker value={icon} onChange={setIcon} />

      {error && (
        <ThemedText type="small" style={{ color: theme.expense }}>
          {error}
        </ThemedText>
      )}
      <Button title={busy ? 'Saving…' : 'Save changes'} disabled={busy} onPress={save} />
      <Button title="Delete category" variant="danger" disabled={busy} onPress={remove} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  bubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewIcon: { fontSize: 34, lineHeight: 42 },
  previewName: { fontSize: 18 },
});
