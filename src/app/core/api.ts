import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Category, Colour, InventoryRow, Order, Page, Product, ReturnRequest, Size, Store, Summary, User } from './models';

/** All calls go to /api, proxied to the backend in development (see proxy.conf.json). */
export const API = '/api';

type Params = Record<string, string | number | null | undefined>;

function params(values: Params = {}): HttpParams {
  let p = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
  }
  return p;
}

const LABELS: Record<string, string> = {
  compare_at_price: 'Old price',
  non_field_errors: '',
};

/** Turn a DRF error response into one readable sentence. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'The server cannot be reached. Check that the backend is running.';
  const data = err.error;
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail;
    const flat = (value: unknown): string[] =>
      typeof value === 'string'
        ? [value]
        : Array.isArray(value)
          ? value.flatMap(flat)
          : value && typeof value === 'object'
            ? Object.values(value).flatMap(flat)
            : [];
    const messages = Object.entries(data).flatMap(([field, value]) =>
      flat(value).map((v) => {
        const label = LABELS[field] ?? field.replaceAll('_', ' ');
        return label ? `${label[0].toUpperCase()}${label.slice(1)}: ${v}` : v;
      }),
    );
    if (messages.length) return messages.join(' ');
  }
  return fallback;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);

  store = () => this.http.get<Store>(`${API}/store/`);
  me = () => this.http.get<User>(`${API}/auth/me/`);
  categories = () => this.http.get<Category[]>(`${API}/categories/`);
  colours = () => this.http.get<Colour[]>(`${API}/colours/`);
  sizes = () => this.http.get<Size[]>(`${API}/sizes/`);

  summary = (days = 14) => this.http.get<Summary>(`${API}/admin/summary/`, { params: params({ days }) });

  // Catalogue
  products = (filters: Params) => this.http.get<Product[]>(`${API}/products/`, { params: params(filters) });
  product = (slug: string) => this.http.get<Product>(`${API}/products/${slug}/`);
  createProduct = (data: Partial<Product>) => this.http.post<Product>(`${API}/products/`, data);
  updateProduct = (slug: string, data: Partial<Product>) => this.http.patch<Product>(`${API}/products/${slug}/`, data);
  deleteProduct = (slug: string) => this.http.delete<void>(`${API}/products/${slug}/`);

  // Stock
  inventory = (filters: Params) => this.http.get<Page<InventoryRow>>(`${API}/inventory/`, { params: params(filters) });
  adjustStock = (id: number, delta: number) => this.http.post<InventoryRow>(`${API}/inventory/${id}/adjust/`, { delta });

  // Orders
  orders = (filters: Params) => this.http.get<Page<Order>>(`${API}/orders/`, { params: params(filters) });
  order = (id: number) => this.http.get<Order>(`${API}/orders/${id}/`);
  ship = (id: number, tracking_number: string) => this.http.post<Order>(`${API}/orders/${id}/ship/`, { tracking_number });
  deliver = (id: number) => this.http.post<Order>(`${API}/orders/${id}/deliver/`, {});
  cancelOrder = (id: number) => this.http.post<Order>(`${API}/orders/${id}/cancel/`, {});

  // Returns
  returns = (filters: Params) => this.http.get<Page<ReturnRequest>>(`${API}/returns/`, { params: params(filters) });
  receiveReturn = (id: number, staff_note: string) => this.http.post<ReturnRequest>(`${API}/returns/${id}/receive/`, { staff_note });
  rejectReturn = (id: number, staff_note: string) => this.http.post<ReturnRequest>(`${API}/returns/${id}/reject/`, { staff_note });
}
