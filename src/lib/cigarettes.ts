import type { Category } from '@/providers/finance-provider';

export const CIGS_PER_PACK = 20;

export type BrandStyle = {
  /** Pack body. */
  body: string;
  /** Lid / roof / band color. */
  top: string;
  /** Brand name color. */
  ink: string;
  motif: 'roof' | 'camel' | 'crest' | 'planet';
};

export type Brand = { id: string; name: string; style: BrandStyle };

export const BRANDS: Brand[] = [
  { id: 'marlboro-red', name: 'Marlboro Red', style: { body: '#ffffff', top: '#d0202e', ink: '#1a1a1a', motif: 'roof' } },
  { id: 'marlboro-light', name: 'Marlboro Light', style: { body: '#ffffff', top: '#c9a24a', ink: '#1a1a1a', motif: 'roof' } },
  { id: 'monte-carlo', name: 'Monte Carlo', style: { body: '#1d2a5a', top: '#d6b45a', ink: '#ffffff', motif: 'crest' } },
  { id: 'camel-blue', name: 'Camel Blue', style: { body: '#2f6db5', top: '#f2e2b8', ink: '#ffffff', motif: 'camel' } },
  { id: 'camel-white', name: 'Camel White', style: { body: '#f6f1e6', top: '#b48a4a', ink: '#5a4322', motif: 'camel' } },
  { id: 'mars', name: 'Mars', style: { body: '#c8361d', top: '#ffffff', ink: '#ffffff', motif: 'planet' } },
];

const FALLBACK: BrandStyle = { body: '#8a8a8a', top: '#ffffff', ink: '#ffffff', motif: 'crest' };

export function brandById(id: string): Brand {
  return BRANDS.find((b) => b.id === id) ?? { id, name: id, style: FALLBACK };
}

/** The category that "buying cigarettes" payments go into: 🚬 icon or a cigarette-ish name. */
export function isCigaretteCategory(c: Pick<Category, 'name' | 'icon'> | null | undefined) {
  if (!c) return false;
  return c.icon === '🚬' || /cig|sigar|tabac|smok|دخان|سجائر/i.test(c.name);
}
