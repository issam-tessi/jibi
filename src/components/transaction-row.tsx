import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { TransactionWithCategory } from '@/hooks/use-finance-data';
import { formatCents } from '@/lib/money';

type Props = {
  transaction: TransactionWithCategory;
  currency: string;
  onDelete?: () => void;
};

export function TransactionRow({ transaction, currency, onDelete }: Props) {
  const isIncome = transaction.amount_cents > 0;
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <ThemedText>{transaction.category?.name ?? 'Uncategorized'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {transaction.occurred_on}
          {transaction.note ? ` · ${transaction.note}` : ''}
        </ThemedText>
      </View>
      <ThemedText style={{ color: isIncome ? '#1F9D55' : undefined }}>
        {formatCents(transaction.amount_cents, currency)}
      </ThemedText>
      {onDelete && (
        <Pressable accessibilityLabel="Delete transaction" onPress={onDelete} hitSlop={8}>
          <ThemedText type="small" themeColor="textSecondary">
            ✕
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  info: { flex: 1 },
});
