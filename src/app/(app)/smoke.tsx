import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BurningCigarette } from '@/components/burning-cigarette';
import { PackArt } from '@/components/cig-art';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Input } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BRANDS, brandById, isCigaretteCategory } from '@/lib/cigarettes';
import { useCigarettes } from '@/providers/cigarette-provider';
import { useFinance } from '@/providers/finance-provider';

const MOODS = ['☕ Coffee', '🍽️ After food', '😤 Stress', '🍻 Friends', '🚗 Driving', '💼 Work break', '🌙 Before bed'];

export default function SmokeScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ brand?: string }>();
  const { stock, smoke } = useCigarettes();
  const { categories } = useFinance();
  const owned = BRANDS.filter((b) => (stock[b.id] ?? 0) > 0);
  const [brand, setBrand] = useState(params.brand ?? owned[0]?.id ?? BRANDS[0].id);
  const [note, setNote] = useState('');
  const [moods, setMoods] = useState<string[]>([]);
  const [phase, setPhase] = useState<'ready' | 'burning' | 'done'>('ready');
  const [error, setError] = useState<string | null>(null);
  const left = stock[brand] ?? 0;
  const name = brandById(brand).name;

  async function light() {
    setError(null);
    const err = await smoke(brand, [...moods, note.trim()].filter(Boolean).join(' · '));
    if (err) return setError(err);
    setPhase('burning');
  }

  const toggleMood = (m: string) => setMoods((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]));

  const buyPack = () => {
    const cat = categories.find(isCigaretteCategory);
    router.replace({ pathname: '/entry', params: { type: 'expense', ...(cat && { category: cat.id }) } });
  };

  return (
    <Sheet title={phase === 'ready' ? 'Light one up' : name}>
      {phase === 'ready' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brands}>
          {(owned.length ? owned : BRANDS).map((b) => {
            const selected = b.id === brand;
            return (
              <Pressable
                key={b.id}
                onPress={() => setBrand(b.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${b.name}, ${stock[b.id] ?? 0} left`}
                style={[styles.brand, { borderColor: selected ? theme.text : 'transparent', backgroundColor: theme.backgroundElement }]}>
                <PackArt style={b.style} name={b.name} size={36} />
                <ThemedText type="smallBold">{stock[b.id] ?? 0}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <BurningCigarette lit={phase !== 'ready'} onBurnt={() => setPhase('done')} />

      {phase === 'ready' && left <= 0 && (
        <>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            No {name} left. Buy a pack first so the count stays right.
          </ThemedText>
          <Button title="🛒 Buy a pack" onPress={buyPack} />
        </>
      )}

      {phase === 'ready' && left > 0 && (
        <>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {left} {name} left
          </ThemedText>
          <View style={styles.moods}>
            {MOODS.map((m) => (
              <Chip key={m} label={m} selected={moods.includes(m)} onPress={() => toggleMood(m)} />
            ))}
          </View>
          <Input placeholder="A few words about this one (optional)" value={note} onChangeText={setNote} maxLength={280} />
          {error && (
            <ThemedText type="small" style={{ color: theme.expense }}>
              {error}
            </ThemedText>
          )}
          <Button title="🔥 Light it up" onPress={light} />
        </>
      )}

      {phase === 'burning' && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Burning… {[...moods, note.trim()].filter(Boolean).join(' · ') || 'enjoy the moment'}
        </ThemedText>
      )}

      {phase === 'done' && (
        <>
          <View style={[styles.done, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Logged 🚬</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {left} {name} left
            </ThemedText>
          </View>
          <Button title="Done" onPress={() => router.back()} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  brands: { gap: Spacing.two },
  brand: { alignItems: 'center', gap: Spacing.one, padding: Spacing.two, borderRadius: Radius.medium, borderWidth: 2 },
  center: { textAlign: 'center' },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  done: { alignItems: 'center', gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.large },
});
