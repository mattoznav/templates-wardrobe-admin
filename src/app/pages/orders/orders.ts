import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';

import { Api, errorMessage } from '../../core/api';
import { Icon } from '../../core/icon';
import { Order, Page } from '../../core/models';
import { MoneyPipe, PhotoPipe, ShopDatePipe } from '../../core/store';

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'paid', label: 'To ship' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'cancelled,expired', label: 'Cancelled' },
];

@Component({
  selector: 'app-orders',
  imports: [FormsModule, RouterLink, Icon, MoneyPipe, ShopDatePipe, PhotoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page__head">
        <h1 class="page__title">Orders</h1>
        <div class="toolbar">
          <label class="search">
            <app-icon name="magnifying-glass" [size]="16" />
            <input class="input" type="search" placeholder="Reference, name or email" [ngModel]="q()" (ngModelChange)="search$.next($event)" aria-label="Search orders" />
          </label>
          <input class="input" type="date" [ngModel]="date()" (ngModelChange)="date.set($event); reload()" aria-label="Day placed" />
        </div>
      </header>

      <div class="segments" role="group" aria-label="Status">
        @for (f of filters; track f.value) {
          <button type="button" [attr.aria-pressed]="statusFilter() === f.value" (click)="statusFilter.set(f.value); reload()">{{ f.label }}</button>
        }
      </div>

      @if (error()) {
        <p class="alert"><app-icon name="warning-circle" [size]="18" /> {{ error() }}</p>
      }

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Placed</th>
              <th>Customer</th>
              <th>Pieces</th>
              <th>Delivery</th>
              <th>Status</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (o of page()?.results ?? []; track o.id) {
              <tr class="is-link" (click)="open(o)">
                <td class="mono"><strong>{{ o.reference }}</strong></td>
                <td class="muted">{{ o.created_at | shopDate: 'datetime' }}</td>
                <td>{{ o.full_name }}<br /><span class="muted small">{{ o.email }}</span></td>
                <td>
                  <span class="thumbs">
                    @for (l of o.lines.slice(0, 3); track l.id) {
                      <img class="thumb" [src]="l.image_url | photo: 60" alt="" />
                    }
                  </span>
                </td>
                <td class="muted">{{ o.shipping_method.name }}</td>
                <td><span class="badge badge--{{ o.status }}">{{ o.status_label }}</span></td>
                <td class="num">{{ o.total | money: o.currency }}</td>
              </tr>
            } @empty {
              @if (page()) {
                <tr><td colspan="7" class="muted">No orders match.</td></tr>
              } @else {
                <tr><td colspan="7"><div class="skeleton" style="height: 120px"></div></td></tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (page(); as p) {
        <div class="pager">
          <span>{{ p.count }} orders</span>
          <div class="toolbar">
            <button type="button" class="btn btn--ghost btn--icon" [disabled]="!p.previous" (click)="go(-1)" aria-label="Previous page"><app-icon name="caret-left" [size]="16" /></button>
            <span>Page {{ pageNumber() }}</span>
            <button type="button" class="btn btn--ghost btn--icon" [disabled]="!p.next" (click)="go(1)" aria-label="Next page"><app-icon name="caret-right" [size]="16" /></button>
          </div>
        </div>
      }
    </section>

    @if (selected(); as o) {
      <div class="drawer-backdrop" (click)="close()"></div>
      <aside class="drawer" role="dialog" aria-modal="true" [attr.aria-label]="'Order ' + o.reference">
        <header class="drawer__head">
          <div>
            <p class="eyebrow">{{ o.created_at | shopDate: 'long' }}</p>
            <h2>{{ o.reference }}</h2>
          </div>
          <button type="button" class="btn btn--ghost btn--icon" (click)="close()" aria-label="Close"><app-icon name="x" [size]="18" /></button>
        </header>

        <div class="drawer__body">
          <div class="status-row">
            <span class="badge badge--{{ o.status }}">{{ o.status_label }}</span>
            @if (o.tracking_number) {
              <span class="muted">Tracking <span class="mono">{{ o.tracking_number }}</span></span>
            }
          </div>

          <ol class="steps">
            <li [class.done]="!!o.paid_at"><strong>Paid</strong>{{ o.paid_at | shopDate: 'datetime' }}</li>
            <li [class.done]="!!o.shipped_at"><strong>Shipped</strong>{{ o.shipped_at | shopDate: 'datetime' }}</li>
            <li [class.done]="!!o.delivered_at"><strong>Delivered</strong>{{ o.delivered_at | shopDate: 'datetime' }}</li>
          </ol>

          <ul class="lines">
            @for (l of o.lines; track l.id) {
              <li>
                <img class="thumb thumb--lg" [src]="l.image_url | photo: 96" alt="" />
                <div>
                  <a [routerLink]="['/products', l.product_slug]">{{ l.product_name }}</a>
                  <p class="muted small">{{ l.colour }}, {{ l.size }} · <span class="mono">{{ l.sku }}</span></p>
                </div>
                <span class="mono">{{ l.quantity }} × {{ l.unit_price | money: o.currency }}</span>
              </li>
            }
          </ul>

          <dl class="facts">
            <div><dt>Subtotal</dt><dd>{{ o.subtotal | money: o.currency }}</dd></div>
            <div><dt>Delivery ({{ o.shipping_method.name }})</dt><dd>{{ o.shipping | money: o.currency }}</dd></div>
            <div><dt>Total</dt><dd><strong>{{ o.total | money: o.currency }}</strong></dd></div>
            <div><dt>Customer</dt><dd>{{ o.customer?.name || o.full_name }}<br />{{ o.email }}</dd></div>
            <div>
              <dt>Ship to</dt>
              <dd>{{ o.full_name }}<br />{{ o.address_line1 }}@if (o.address_line2) {, {{ o.address_line2 }}}<br />{{ o.postal_code }} {{ o.city }}, {{ o.country }}</dd>
            </div>
            <div><dt>Phone</dt><dd>{{ o.phone || 'Not given' }}</dd></div>
          </dl>

          @if (o.payments?.length) {
            <div>
              <p class="eyebrow">Payments</p>
              <ul class="plain">
                @for (p of o.payments; track p.created_at) {
                  <li>
                    <span class="badge badge--{{ p.status }}">{{ p.status }}</span>
                    {{ p.amount | money: o.currency }} via {{ p.provider }}
                    @if (+p.refunded_amount > 0) {
                      <span class="muted">, {{ p.refunded_amount | money: o.currency }} refunded</span>
                    }
                  </li>
                }
              </ul>
            </div>
          }

          @if (o.returns.length) {
            <div>
              <p class="eyebrow">Returns</p>
              <ul class="plain">
                @for (r of o.returns; track r.id) {
                  <li><a routerLink="/returns" [queryParams]="{ q: r.reference }" class="mono">{{ r.reference }}</a> <span class="badge badge--{{ r.status }}">{{ r.status }}</span></li>
                }
              </ul>
            </div>
          }

          @if (o.status === 'paid') {
            <div class="field">
              <label for="tracking">Tracking number</label>
              <input id="tracking" [(ngModel)]="tracking" placeholder="Optional" />
            </div>
          }

          @if (actionError()) {
            <p class="alert">{{ actionError() }}</p>
          }
        </div>

        <footer class="drawer__foot">
          @if (o.can_cancel) {
            <button type="button" class="btn btn--danger" [disabled]="busy()" (click)="cancel(o)">{{ o.status === 'paid' ? 'Cancel and refund' : 'Cancel' }}</button>
          }
          @if (o.status === 'paid') {
            <button type="button" class="btn btn--primary" [disabled]="busy()" (click)="ship(o)"><app-icon name="truck" [size]="16" /> Mark as shipped</button>
          }
          @if (o.status === 'shipped') {
            <button type="button" class="btn btn--primary" [disabled]="busy()" (click)="deliver(o)"><app-icon name="check" [size]="16" /> Mark as delivered</button>
          }
        </footer>
      </aside>
    }
  `,
  styles: `
    .small {
      font-size: 12.5px;
    }

    .thumbs {
      display: flex;
      gap: 4px;
    }

    .thumbs .thumb {
      width: 30px;
    }

    .status-row {
      display: flex;
      gap: 12px;
      align-items: center;
      font-size: 13px;
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 12.5px;
      color: var(--muted);
    }

    .steps li {
      padding-top: 10px;
      border-top: 2px solid var(--line);
    }

    .steps li.done {
      border-color: var(--ink);
      color: var(--ink-soft);
    }

    .steps strong {
      display: block;
      color: var(--ink);
      font-weight: 500;
    }

    .lines {
      display: grid;
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .lines li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 14px;
      align-items: center;
      font-size: 14px;
    }

    .lines a {
      font-weight: 500;
      text-decoration: none;
    }

    .plain {
      display: grid;
      gap: 6px;
      margin: 8px 0 0;
      padding: 0;
      list-style: none;
      font-size: 13.5px;
    }
  `,
})
export class Orders {
  private api = inject(Api);
  private router = inject(Router);

  /** Query params: ?status=paid opens a filter, ?open=12 opens an order. */
  readonly status = input<string>();
  readonly open_ = input<string>(undefined, { alias: 'open' });

  protected filters = FILTERS;
  protected page = signal<Page<Order> | null>(null);
  protected selected = signal<Order | null>(null);
  protected error = signal('');
  protected actionError = signal('');
  protected busy = signal(false);
  protected q = signal('');
  protected date = signal('');
  protected statusFilter = signal('');
  protected pageNumber = signal(1);
  protected tracking = '';
  protected search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(300)).subscribe((q) => {
      this.q.set(q);
      this.reload();
    });
    queueMicrotask(() => {
      this.statusFilter.set(this.status() ?? '');
      this.reload();
      const id = Number(this.open_());
      if (id) this.api.order(id).subscribe((o) => this.selected.set(o));
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
    this.api.orders({ q: this.q(), status: this.statusFilter(), date: this.date(), page: this.pageNumber() }).subscribe({
      next: (p) => this.page.set(p),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  open(o: Order) {
    this.actionError.set('');
    this.tracking = '';
    this.selected.set(o);
  }

  close() {
    this.selected.set(null);
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  private act(request: ReturnType<Api['ship']>) {
    this.busy.set(true);
    this.actionError.set('');
    request.subscribe({
      next: (o) => {
        this.selected.set(o);
        this.busy.set(false);
        this.fetch();
      },
      error: (err) => {
        this.actionError.set(errorMessage(err));
        this.busy.set(false);
      },
    });
  }

  ship(o: Order) {
    this.act(this.api.ship(o.id, this.tracking));
  }

  deliver(o: Order) {
    this.act(this.api.deliver(o.id));
  }

  cancel(o: Order) {
    const refund = o.status === 'paid' ? ` The customer gets ${o.total} ${o.currency} back.` : '';
    if (confirm(`Cancel order ${o.reference}?${refund}`)) this.act(this.api.cancelOrder(o.id));
  }
}
