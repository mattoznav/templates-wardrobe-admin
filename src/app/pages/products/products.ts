import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';

import { Api, errorMessage } from '../../core/api';
import { Icon } from '../../core/icon';
import { Category, Product } from '../../core/models';
import { MoneyPipe, PhotoPipe } from '../../core/store';

@Component({
  selector: 'app-products',
  imports: [FormsModule, RouterLink, Icon, MoneyPipe, PhotoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page__head">
        <h1 class="page__title">Products</h1>
        <div class="toolbar">
          <label class="search">
            <app-icon name="magnifying-glass" [size]="16" />
            <input class="input" type="search" placeholder="Name or SKU" [ngModel]="q()" (ngModelChange)="search$.next($event)" aria-label="Search products" />
          </label>
          <select class="input" [ngModel]="department()" (ngModelChange)="department.set($event); load()" aria-label="Department">
            <option value="">All departments</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
            <option value="unisex">Unisex</option>
          </select>
          <select class="input" [ngModel]="category()" (ngModelChange)="category.set($event); load()" aria-label="Category">
            <option value="">All categories</option>
            @for (c of categories(); track c.slug) {
              <option [value]="c.slug">{{ c.name }}</option>
            }
          </select>
          <a class="btn btn--primary" routerLink="/products/new"><app-icon name="plus" [size]="16" /> New product</a>
        </div>
      </header>

      <div class="segments" role="group" aria-label="Status">
        @for (s of statuses; track s.value) {
          <button type="button" [attr.aria-pressed]="status() === s.value" (click)="status.set(s.value); load()">{{ s.label }}</button>
        }
      </div>

      @if (error()) {
        <p class="alert"><app-icon name="warning-circle" [size]="18" /> {{ error() }}</p>
      }

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th></th>
              <th>Product</th>
              <th>Category</th>
              <th>Colours</th>
              <th class="num">Stock</th>
              <th class="num">Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (p of products() ?? []; track p.id) {
              <tr class="is-link" (click)="edit(p)">
                <td><img class="thumb" [src]="p.images[0]?.url | photo: 80" alt="" /></td>
                <td>
                  <strong class="name">{{ p.name }}</strong>
                  <span class="muted small">{{ departmentLabel(p.department) }}@if (p.is_new) { · New}</span>
                </td>
                <td class="muted">{{ p.category_name }}</td>
                <td>
                  <span class="swatches">
                    @for (c of p.colours; track c.slug) {
                      <span class="swatch" [style.background]="c.hex" [title]="c.name"></span>
                    }
                  </span>
                </td>
                <td class="num" [class.low]="stock(p) <= 5">{{ stock(p) }}</td>
                <td class="num">
                  {{ p.price | money }}
                  @if (p.compare_at_price) {
                    <br /><s class="muted small">{{ p.compare_at_price | money }}</s>
                  }
                </td>
                <td><span class="badge badge--{{ p.status }}">{{ statusLabel(p.status) }}</span></td>
              </tr>
            } @empty {
              @if (products()) {
                <tr><td colspan="7" class="muted">No products match.</td></tr>
              } @else {
                <tr><td colspan="7"><div class="skeleton" style="height: 160px"></div></td></tr>
              }
            }
          </tbody>
        </table>
      </div>
      @if (products(); as list) {
        <p class="muted small">{{ list.length }} products, {{ totalStock() }} pieces in stock</p>
      }
    </section>
  `,
  styles: `
    .name {
      display: block;
      font-weight: 500;
    }

    .small {
      font-size: 12.5px;
    }

    .swatches {
      display: flex;
      gap: 4px;
    }

    .swatch {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
    }

    .low {
      color: var(--danger);
      font-weight: 600;
    }

    select.input {
      padding-right: 28px;
    }
  `,
})
export class Products {
  private api = inject(Api);
  private router = inject(Router);

  protected statuses = [
    { value: '', label: 'All' },
    { value: 'active', label: 'On sale' },
    { value: 'draft', label: 'Drafts' },
    { value: 'archived', label: 'Archived' },
  ];
  protected products = signal<Product[] | null>(null);
  protected categories = signal<Category[]>([]);
  protected error = signal('');
  protected q = signal('');
  protected status = signal('');
  protected department = signal('');
  protected category = signal('');
  protected search$ = new Subject<string>();
  protected totalStock = computed(() => (this.products() ?? []).reduce((n, p) => n + this.stock(p), 0));

  constructor() {
    this.api.categories().subscribe((c) => this.categories.set(c));
    this.search$.pipe(debounceTime(300)).subscribe((q) => {
      this.q.set(q);
      this.load();
    });
    this.load();
  }

  load() {
    this.error.set('');
    this.api
      .products({ q: this.q(), status: this.status() || 'active,draft,archived', department: this.department(), category: this.category() })
      .subscribe({
        next: (p) => this.products.set(p),
        error: (err) => this.error.set(errorMessage(err)),
      });
  }

  stock(p: Product): number {
    return p.variants.reduce((n, v) => n + v.stock, 0);
  }

  statusLabel(status: string): string {
    return { active: 'On sale', draft: 'Draft', archived: 'Archived' }[status] ?? status;
  }

  departmentLabel(d: string): string {
    return { women: 'Women', men: 'Men', unisex: 'Unisex' }[d] ?? d;
  }

  edit(p: Product) {
    this.router.navigate(['/products', p.slug]);
  }
}
