export interface CartItem {
  /** Stable client key: `${productId}:${variantId}` */
  key: string;
  /** Server cart_items.id when this cart is synced to a logged-in user */
  serverId: number | null;
  productId: number;
  variantId: number;
  name: string;
  slug: string;
  image?: string | null;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
}

export interface AppliedCoupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discount: number;
}

/** Server /api/v1/cart payload */
export interface CartDto {
  items: Array<{
    id: number | null;
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
    adjusted: boolean;
    inStock: boolean;
  }>;
  totals: CartTotals;
  coupon: AppliedCoupon | null;
  changed: boolean;
}
