/** Shapes returned by the wardrobe backend API. */

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

export interface Store {
  name: string;
  tagline: string;
  city: string;
  timezone: string;
  currency: string;
  free_shipping_over: string | null;
  return_window_days: number;
}

export interface Category {
  slug: string;
  name: string;
}

export interface Colour {
  slug: string;
  name: string;
  hex: string;
}

export interface Size {
  code: string;
  label: string;
  system: 'letter' | 'shoe' | 'one';
  position: number;
}

export interface ProductImage {
  url: string;
  alt: string;
  colour: string | null;
  photographer: string;
  photographer_url: string;
  source_url: string;
}

export interface Variant {
  id?: number;
  sku: string;
  colour: string;
  size: string;
  stock: number;
}

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface Product {
  id: number;
  slug: string;
  name: string;
  department: 'women' | 'men' | 'unisex';
  category: string;
  category_name: string;
  status: ProductStatus;
  description: string;
  details: string[];
  composition: string;
  care: string;
  price: string;
  compare_at_price: string | null;
  on_sale: boolean;
  is_new: boolean;
  popularity: number;
  colours: Colour[];
  sizes: { code: string; label: string }[];
  in_stock: boolean;
  images: ProductImage[];
  variants: Variant[];
  collections: string[];
}

export interface InventoryRow {
  id: number;
  sku: string;
  product: { slug: string; name: string; status: ProductStatus; image: string };
  colour: Colour;
  size: string;
  stock: number;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'expired';

export interface OrderLine {
  id: number;
  variant: number;
  product_name: string;
  product_slug: string;
  colour: string;
  size: string;
  sku: string;
  image_url: string;
  unit_price: string;
  quantity: number;
  line_total: string;
  returnable: number;
}

export interface Order {
  id: number;
  reference: string;
  status: OrderStatus;
  status_label: string;
  email: string;
  full_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  shipping_method: { code: string; name: string };
  subtotal: string;
  shipping: string;
  total: string;
  currency: string;
  lines: OrderLine[];
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  tracking_number: string;
  can_cancel: boolean;
  returns: { id: number; reference: string; status: string; refund_amount: string }[];
  customer: { email: string; name: string } | null;
  payments: { provider: string; status: string; amount: string; refunded_amount: string; created_at: string }[] | null;
}

export type ReturnStatus = 'requested' | 'refunded' | 'rejected';

export interface ReturnRequest {
  id: number;
  reference: string;
  order: { id: number; reference: string; currency: string; email: string; full_name: string };
  status: ReturnStatus;
  status_label: string;
  reason: string;
  reason_label: string;
  note: string;
  lines: {
    order_line: number;
    product_name: string;
    product_slug: string;
    colour: string;
    size: string;
    sku: string;
    image_url: string;
    unit_price: string;
    quantity: number;
  }[];
  value: string;
  refund_amount: string;
  staff_note: string;
  created_at: string;
  closed_at: string | null;
}

export interface Summary {
  currency: string;
  days: { date: string; orders: number; revenue: string }[];
  period: { orders: number; revenue: string };
  today: { orders: number; revenue: string; pieces: number };
  to_ship: number;
  in_transit: number;
  returns_open: number;
  stock: { pieces: number; low: number; threshold: number };
  low_stock: { id: number; sku: string; product: string; slug: string; colour: string; size: string; stock: number }[];
  top_products: { product_slug: string; product_name: string; units: number; revenue: string; image: string }[];
  recent_orders: { id: number; reference: string; full_name: string; status: OrderStatus; total: string; created_at: string }[];
  orders_by_status: Partial<Record<OrderStatus, number>>;
  returns_by_reason: Record<string, number>;
  has_sales: boolean;
}
