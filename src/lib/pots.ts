import type { AccountKind } from '@/lib/database.types';

export const POTS: { value: AccountKind; icon: string; label: string }[] = [
  { value: 'card', icon: '💳', label: 'Card' },
  { value: 'cash', icon: '💰', label: 'Cash' },
  { value: 'savings', icon: '🐷', label: 'Savings' },
];

export function potIcon(pot: AccountKind | null | undefined) {
  return POTS.find((p) => p.value === pot)?.icon ?? '';
}

export function potLabel(pot: AccountKind | null | undefined) {
  return POTS.find((p) => p.value === pot)?.label ?? '';
}

/** Friendly name for a move between two pots. */
export function transferTitle(from: AccountKind, to: AccountKind | null) {
  if (from === 'card' && to === 'cash') return 'Cash withdrawal';
  if (from === 'cash' && to === 'card') return 'Cash deposit';
  if (to === 'savings') return 'Moved to savings';
  if (from === 'savings') return 'Taken from savings';
  return 'Move';
}

export function transferIcon(from: AccountKind, to: AccountKind | null) {
  if (from === 'card' && to === 'cash') return '🏧';
  if (from === 'cash' && to === 'card') return '🏦';
  return '🐷';
}
