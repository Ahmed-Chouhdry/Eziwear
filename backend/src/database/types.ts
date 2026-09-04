/**
 * Row types for every table + Knex augmentation so `db<'products'>()` and
 * `db('products')` are fully typed. Keep in sync with the migrations.
 */

export type Role = 'customer' | 'admin';
export type ProductStatus = 'draft' | 'published' | 'archived';
export type OnOff = 'active' | 'inactive';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type CouponType = 'percentage' | 'fixed';
export type PaymentMethod = 'cod' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type OrderStatus =
  | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type AdPosition = 'hero' | 'homepage_banner' | 'popup' | 'category';

interface Timestamps {
  created_at: string;
  updated_at: string;
}

export interface UserRow extends Timestamps {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  role: Role;
  status: 'active' | 'suspended';
  email_verified_at: string | null;
}

export interface AddressRow extends Timestamps {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  area: string | null;
  postal_code: string | null;
  is_default: boolean;
}

export interface PasswordResetRow extends Timestamps {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
}

export interface CategoryRow extends Timestamps {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sort_order: number;
  status: OnOff;
}

export interface ProductRow extends Timestamps {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: number;
  sale_price: number | null;
  status: ProductStatus;
  is_new_arrival: boolean;
  is_featured: boolean;
  is_vip: boolean;
}

export interface ProductImageRow extends Timestamps {
  id: number;
  product_id: number;
  image_url: string;
  sort_order: number;
}

export interface ProductVariantRow extends Timestamps {
  id: number;
  product_id: number;
  size: string;
  color: string;
  color_hex: string | null;
  stock: number;
  sku: string;
}

export interface CartRow extends Timestamps {
  id: number;
  user_id: number | null;
  session_id: string | null;
}

export interface CartItemRow extends Timestamps {
  id: number;
  cart_id: number;
  product_variant_id: number;
  quantity: number;
  unit_price: number;
}

export interface WishlistRow extends Timestamps {
  id: number;
  user_id: number;
  product_id: number;
}

export interface CouponRow extends Timestamps {
  id: number;
  code: string;
  type: CouponType;
  value: number;
  min_order: number | null;
  max_discount: number | null;
  start_at: string | null;
  end_at: string | null;
  usage_limit: number | null;
  used_count: number;
  status: OnOff;
}

export interface OrderRow extends Timestamps {
  id: number;
  user_id: number;
  order_number: string;
  address_id: number | null;
  coupon_id: number | null;
  ship_name: string;
  ship_phone: string;
  ship_address: string;
  ship_city: string;
  ship_area: string | null;
  ship_postal_code: string | null;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string | null;
}

export interface OrderItemRow extends Timestamps {
  id: number;
  order_id: number;
  product_id: number | null;
  variant_id: number | null;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderStatusHistoryRow {
  id: number;
  order_id: number;
  status: string;
  note: string | null;
  changed_by: number | null;
  created_at: string;
}

export interface SliderRow extends Timestamps {
  id: number;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  image_url_mobile: string | null;
  button_text: string | null;
  button_link: string | null;
  sort_order: number;
  status: OnOff;
}

export interface AdvertisementRow extends Timestamps {
  id: number;
  title: string | null;
  description: string | null;
  media_url: string;
  cta_text: string | null;
  cta_link: string | null;
  position: AdPosition;
  start_at: string | null;
  end_at: string | null;
  status: OnOff;
}

export interface SocialLinkRow extends Timestamps {
  id: number;
  platform: string;
  url: string;
  sort_order: number;
  status: OnOff;
}

export interface ReviewRow extends Timestamps {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
}

export interface NotificationRow extends Timestamps {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
}

export interface AuditLogRow {
  id: number;
  admin_id: number | null;
  action: string;
  entity: string;
  entity_id: number | null;
  details: unknown;
  ip: string | null;
  created_at: string;
}

declare module 'knex/types/tables.js' {
  interface Tables {
    users: UserRow;
    addresses: AddressRow;
    password_resets: PasswordResetRow;
    categories: CategoryRow;
    products: ProductRow;
    product_images: ProductImageRow;
    product_variants: ProductVariantRow;
    carts: CartRow;
    cart_items: CartItemRow;
    wishlists: WishlistRow;
    coupons: CouponRow;
    orders: OrderRow;
    order_items: OrderItemRow;
    order_status_history: OrderStatusHistoryRow;
    sliders: SliderRow;
    advertisements: AdvertisementRow;
    social_links: SocialLinkRow;
    reviews: ReviewRow;
    notifications: NotificationRow;
    audit_logs: AuditLogRow;
  }
}
