export const FREE_SHIPPING_THRESHOLD = 5000;
export const FLAT_SHIPPING_FEE = 250;

export function shippingFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
}

export interface Totals {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
}

export function computeTotals(subtotal: number, discount = 0): Totals {
  const safeSubtotal = round2(Math.max(0, subtotal));
  const safeDiscount = round2(Math.min(Math.max(0, discount), safeSubtotal));
  const shippingFee = shippingFor(safeSubtotal - safeDiscount);
  return {
    subtotal: safeSubtotal,
    discount: safeDiscount,
    shippingFee,
    total: round2(safeSubtotal - safeDiscount + shippingFee),
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
