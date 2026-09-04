import type { Totals } from '../../utils/pricing.js';

export interface CartLineDto {
  id: number | null; // server cart_items.id, or null for guest/preview
  productId: number;
  variantId: number;
  name: string;
  slug: string;
  image: string | null;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
  lineTotal: number;
  /** true when the requested quantity was reduced to match available stock */
  adjusted: boolean;
  inStock: boolean;
}

export interface AppliedCoupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discount: number;
}

export interface CartDto {
  items: CartLineDto[];
  totals: Totals;
  coupon: AppliedCoupon | null;
  /** true when at least one line was adjusted/removed vs. what was requested */
  changed: boolean;
}
