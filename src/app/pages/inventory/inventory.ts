import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';

import { Api, errorMessage } from '../../core/api';
import { Icon } from '../../core/icon';
import { Category, InventoryRow, Page } from '../../core/models';
import { PhotoPipe } from '../../core/store';

@Component({
  selector: 'app-inventory',
  imports: [FormsModule, RouterLink, Icon, PhotoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <h1 class="page__title">Stock</h1>
          <p class="muted">Add a delivery or correct a count. Changes add to the current stock, so they are safe while orders come in.</p>
        </div>
        <div class="toolbar">
          <label class="search">
            <app-icon name="magnifying-glass" [size]="16" />
            <input class="input" type="search" placeholder="Product or SKU" [ngModel]="q()" (ngModelChange)="search$.next($event)" aria-label="Search stock" />
          </label>
          <select class="input" [ngModel]="category()" (ngModelChange)="category.set($event); reload()" aria-label="Category">
            <option value="">All categories</option>
            @for (c of categories(); track c.slug) {
              <option [value]="c.slug">{{ c.name }}</option>
            }
          </select>
        </div>
      </header>

      <div class="segments" role="group" aria-label="Show">
        <button type="button" [attr.aria-pressed]="!low()" (click)="low.set(false); reload()">Everything</button>
        <button type="button" [attr.aria-pressed]="low()" (click)="low.set(true); reload()">Running low</button>
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
              <th>Colour</th>
              <th>Size</th>
              <th>SKU</th>
              <th class="num">In stock</th>
              <th class="num">Adjust</th>
            </tr>
          </thead>
          <tbody>
            @for (row of page()?.results ?? []; track row.id) {
              <tr>
                <td><img class="thumb" [src]="row.product.image | photo: 60" alt="" /></td>
                <td>
                  <a [routerLink]="['/products', row.product.slug]">{{ row.product.name }}</a>
                  @if (row.product.status !== 'active') {
                    <span class="badge badge--{{ row.product.status }}">{{ row.product.status }}</span>
                  }
                </td>
                <td><span class="dot" [style.background]="row.colour.hex"></span> {{ row.colour.name }}</td>
                <td>{{ row.size }}</td>
                <td class="mono muted">{{ row.sku }}</td>
                <td class="num">
                  <span class="level" [class.level--low]="row.stock > 0 && row.stock <= 3" [class.level--out]="row.stock === 0">{{ row.stock }}</span>
                </td>
                <td class="num">
                  <span class="adjust">
                    <button type="button" class="btn btn--ghost btn--icon" (click)="adjust(row, -1)" [disabled]="row.stock === 0 || busy() === row.id" aria-label="One less"><app-icon name="minus" [size]="14" /></button>
                    <input type="number" class="delta" [(ngModel)]="deltas[row.id]" [name]="'delta-' + row.id" placeholder="+0" aria-label="Pieces to add" (keydown.enter)="applyDelta(row)" />
                    <button type="button" class="btn btn--ghost btn--icon" (click)="adjust(row, 1)" [disabled]="busy() === row.id" aria-label="One more"><app-icon name="plus" [size]="14" /></button>
                    <button type="button" class="btn btn--ghost" (click)="applyDelta(row)" [disabled]="!deltas[row.id] || busy() === row.id">Apply</button>
                  </span>
                </td>
              </tr>
            } @empty {
              @if (page()) {
                <tr><td colspan="7" class="muted">Nothing here.</td></tr>
              } @else {
                <tr><td colspan="7"><div class="skeleton" style="height: 160px"></div></td></tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (page(); as p) {
        <div class="pager">
          <span>{{ p.count }} variants</span>
          <div class="toolbar">
            <button type="button" class="btn btn--ghost btn--icon" [disabled]="!p.previous" (click)="go(-1)" aria-label="Previous page"><app-icon name="caret-left" [size]="16" /></button>
            <span>Page {{ pageNumber() }}</span>
            <button type="button" class="btn btn--ghost btn--icon" [disabled]="!p.next" (click)="go(1)" aria-label="Next page"><app-icon name="caret-right" [size]="16" /></button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .page__head p {
      max-width: 60ch;
      margin-top: 6px;
      font-size: 13.5px;
    }

    td a {
      font-weight: 500;
      text-decoration: none;
    }

    td a:hover {
      text-decoration: underline;
    }

    .dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: 4px;
      border-radius: 50%;
      vertical-align: -1px;
      box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
    }

    .level {
      display: inline-grid;
      place-items: center;
      min-width: 34px;
      height: 26px;
      border-radius: var(--radius);
      background: var(--bg-sunken);
      font-weight: 600;
    }

    .level--low {
      background: var(--warning-soft);
      color: var(--warning);
    }

    .level--out {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .adjust {
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }

    .adjust .btn--icon {
      width: 30px;
      min-height: 30px;
    }

    .adjust .btn:not(.btn--icon) {
      min-height: 30px;
      padding: 0 10px;
    }

    .delta {
      width: 64px;
      min-height: 30px;
      padding: 0 8px;
      border: 1px solid var(--line-strong);
      border-radius: var(--radius);
      background: var(--bg);
      text-align: right;
    }
  `,
})
export class Inventory {
  private api = inject(Api);

  /** ?low=1 opens the low stock view. */
  readonly lowParam = input<string>(undefined, { alias: 'low' });

  protected page = signal<Page<InventoryRow> | null>(null);
  protected categories = signal<Category[]>([]);
  protected error = signal('');
  protected busy = signal<number | null>(null);
  protected q = signal('');
  protected category = signal('');
  protected low = signal(false);
  protected pageNumber = signal(1);
  protected deltas: Record<number, number | null> = {};
  protected search$ = new Subject<string>();

  constructor() {
    this.api.categories().subscribe((c) => this.categories.set(c));
    this.search$.pipe(debounceTime(300)).subscribe((q) => {
      this.q.set(q);
      this.reload();
    });
    queueMicrotask(() => {
      this.low.set(this.lowParam() === '1');
      this.reload();
    });
  }

  reload() {
    this.pageNumber.set(1);
    this.fetch();
  }

  go(step: number) {
    this.pageNumber.update((n) => Math.max(1, n + step));
    this.fetch();
  }

  private fetch() {
    this.error.set('');
    this.api.inventory({ q: this.q(), category: this.category(), low: this.low() ? 1 : null, page: this.pageNumber() }).subscribe({
      next: (p) => this.page.set(p),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  adjust(row: InventoryRow, delta: number) {
    this.busy.set(row.id);
    this.error.set('');
    this.api.adjustStock(row.id, delta).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.deltas[row.id] = null;
        this.page.update((p) => (p ? { ...p, results: p.results.map((r) => (r.id === updated.id ? updated : r)) } : p));
      },
      error: (err) => {
        this.busy.set(null);
        this.error.set(errorMessage(err));
      },
    });
  }

  applyDelta(row: InventoryRow) {
    const delta = Math.trunc(Number(this.deltas[row.id]) || 0);
    if (delta) this.adjust(row, delta);
  }
}
