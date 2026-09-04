import type {
  OrderItemRow,
  OrderRow,
  OrderStatusHistoryRow,
} from '../../database/types.js';

export interface OrderItemDto {
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

export interface OrderStatusEventDto {
  status: string;
  note: string | null;
  createdAt: string;
}

export interface OrderDto {
  id: number;
  orderNumber: string;
  items: OrderItemDto[];
  ship: {
    name: string;
    phone: string;
    address: string;
    city: string;
    area: string | null;
    postalCode: string | null;
  };
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  paymentMethod: 'cod' | 'card';
  paymentStatus: OrderRow['payment_status'];
  orderStatus: OrderRow['order_status'];
  notes: string | null;
  createdAt: string;
  timeline: OrderStatusEventDto[];
}

export function toOrderDto(
  order: OrderRow & { coupon_code?: string | null },
  items: (OrderItemRow & { slug?: string | null; image?: string | null })[],
  timeline: OrderStatusHistoryRow[],
): OrderDto {
  return {
    id: order.id,
    orderNumber: order.order_number,
    items: items.map((i) => ({
      productId: i.product_id,
      variantId: i.variant_id,
      productName: i.product_name,
      slug: i.slug ?? null,
      image: i.image ?? null,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      subtotal: i.subtotal,
    })),
    ship: {
      name: order.ship_name,
      phone: order.ship_phone,
      address: order.ship_address,
      city: order.ship_city,
      area: order.ship_area,
      postalCode: order.ship_postal_code,
    },
    subtotal: order.subtotal,
    discount: order.discount,
    shippingFee: order.shipping_fee,
    total: order.total,
    couponCode: order.coupon_code ?? null,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    notes: order.notes,
    createdAt: order.created_at,
    timeline: timeline.map((t) => ({
      status: t.status,
      note: t.note,
      createdAt: t.created_at,
    })),
  };
}
