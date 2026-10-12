import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PackArt } from '@/components/cig-art';
import { ThemedText } from '@/components/themed-text';
import { Chip, Input } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BRANDS, CIGS_PER_PACK, brandById } from '@/lib/cigarettes';
import { formatMoney } from '@/lib/money';
import { useCigarettes, type CigPack } from '@/providers/cigarette-provider';

export type CigPurchase = { brand: string; packs: number; place: string };

/** Latest price paid for one pack of `brand`, preferring the same place. */
export function lastPackPrice(packs: CigPack[], brand: string, place: string) {
  const priced = packs.filter((p) => p.brand === brand && p.price_cents);
  const here = priced.find((p) => (p.place ?? '').toLowerCase() === place.trim().toLowerCase());
  const hit = here ?? priced[0];
  return hit ? { perPack: Math.round(hit.price_cents! / hit.packs), place: hit.place, samePlace: !!here } : null;
}

/** Brand, number of packs and place for a cigarette payment; suggests the amount from past purchases. */
export function CigPurchaseFields({
  value,
  onChange,
  currency,
  onSuggestAmount,
}: {
  value: CigPurchase;
  onChange: (next: CigPurchase) => void;
  currency: string;
  onSuggestAmount: (minor: number) => void;
}) {
  const theme = useTheme();
  const { packs } = useCigarettes();
  const places = [...new Set(packs.map((p) => p.place).filter((p): p is string => !!p))].slice(0, 6);
  const last = lastPackPrice(packs, value.brand, value.place);
  const set = (patch: Partial<CigPurchase>) => {
    const next = { ...value, ...patch };
    onChange(next);
    const price = lastPackPrice(packs, next.brand, next.place);
    if (price) onSuggestAmount(price.perPack * next.packs);
  };

  return (
    <View style={[styles.box, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">🚬 Which pack?</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brands}>
        {BRANDS.map((b) => {
          const selected = b.id === value.brand;
          return (
            <Pressable
              key={b.id}
              onPress={() => set({ brand: b.id })}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={b.name}
              style={[styles.brand, { borderColor: selected ? theme.text : 'transparent', backgroundColor: theme.card }]}>
              <PackArt style={b.style} name={b.name} size={40} />
              <ThemedText type="small" numberOfLines={1} style={styles.brandName}>
                {b.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.packsRow}>
        <ThemedText type="smallBold" style={styles.flex}>
          Packs · {value.packs * CIGS_PER_PACK} cigarettes
        </ThemedText>
        <StepButton label="−" disabled={value.packs <= 1} onPress={() => set({ packs: value.packs - 1 })} />
        <ThemedText type="smallBold" style={styles.count}>
          {value.packs}
        </ThemedText>
        <StepButton label="+" disabled={value.packs >= 50} onPress={() => set({ packs: value.packs + 1 })} />
      </View>

      <Input
        placeholder="Where? e.g. Kiosque Lafayette"
        value={value.place}
        onChangeText={(place) => onChange({ ...value, place })}
        onEndEditing={() => set({})}
        maxLength={80}
        style={{ backgroundColor: theme.card }}
      />
      {places.length > 0 && (
        <View style={styles.places}>
          {places.map((p) => (
            <Chip key={p} label={`📍 ${p}`} selected={p === value.place} onPress={() => set({ place: p })} />
          ))}
        </View>
      )}

      {last && (
        <ThemedText type="small" themeColor="textSecondary">
          {last.samePlace ? 'Last time here' : `Last paid${last.place ? ` at ${last.place}` : ''}`}:{' '}
          {formatMoney(last.perPack, currency)} a pack of {brandById(value.brand).name}
        </ThemedText>
      )}
    </View>
  );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      style={[styles.step, { backgroundColor: theme.card, opacity: disabled ? 0.35 : 1 }]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.large },
  brands: { gap: Spacing.two },
  brand: {
    width: 84,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 2,
  },
  brandName: { fontSize: 12, lineHeight: 16 },
  packsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  count: { minWidth: 24, textAlign: 'center' },
  step: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  places: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
