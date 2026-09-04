export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cod' | 'card';

export interface OrderItem {
  productId: number | null;
  variantId: number | null;
  productName: string;
  slug: string | null;
  image: string | null;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderStatusEvent {
  status: string;
  note: string | null;
  createdAt: string;
}

export interface OrderShip {
  name: string;
  phone: string;
  address: string;
  city: string;
  area: string | null;
  postalCode: string | null;
}

export interface Order {
  id: number;
  orderNumber: string;
  items: OrderItem[];
  ship: OrderShip;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  notes: string | null;
  createdAt: string;
  timeline: OrderStatusEvent[];
}

export interface OrderSummary {
  orderNumber: string;
  total: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  itemCount: number;
  firstItem: string;
  firstImage: string | null;
}

export interface CreateOrderPayload {
  addressId?: number;
  address?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    area?: string;
    postalCode?: string;
    saveAddress?: boolean;
  };
  shippingMethod?: 'standard';
  paymentMethod: 'cod';
  couponCode?: string;
  notes?: string;
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};
