import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Api, errorMessage } from '../../core/api';
import { Icon } from '../../core/icon';
import { Summary } from '../../core/models';
import { MoneyPipe, PhotoPipe, ShopDatePipe, StoreSettings } from '../../core/store';

const REASONS: Record<string, string> = {
  too_small: 'Too small',
  too_large: 'Too large',
  not_as_pictured: 'Not as pictured',
  changed_mind: 'Changed mind',
  faulty: 'Faulty',
  other: 'Other',
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon, MoneyPipe, ShopDatePipe, PhotoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <p class="eyebrow">{{ today }}</p>
          <h1 class="page__title">Today</h1>
        </div>
        <div class="segments" role="group" aria-label="Period">
          @for (d of [7, 14, 30]; track d) {
            <button type="button" [attr.aria-pressed]="days() === d" (click)="load(d)">{{ d }} days</button>
          }
        </div>
      </header>

      @if (error()) {
        <p class="alert"><app-icon name="warning-circle" [size]="18" /> {{ error() }}</p>
      }

      @if (data(); as s) {
        <div class="kpis">
          <div class="kpi">
            <span class="kpi__label">Sales today</span>
            <strong class="kpi__value">{{ s.today.revenue | money: s.currency }}</strong>
            <span class="muted">{{ s.today.orders }} orders, {{ s.today.pieces }} pieces</span>
          </div>
          <div class="kpi">
            <span class="kpi__label">Last {{ days() }} days</span>
            <strong class="kpi__value">{{ s.period.revenue | money: s.currency }}</strong>
            <span class="muted">{{ s.period.orders }} orders, average {{ average() | money: s.currency }}</span>
          </div>
          <a class="kpi kpi--link" routerLink="/orders" [queryParams]="{ status: 'paid' }">
            <span class="kpi__label">To ship</span>
            <strong class="kpi__value">{{ s.to_ship }}</strong>
            <span class="muted">{{ s.in_transit }} on the way</span>
          </a>
          <a class="kpi kpi--link" routerLink="/returns">
            <span class="kpi__label">Returns to check</span>
            <strong class="kpi__value">{{ s.returns_open }}</strong>
            <span class="muted">Waiting for the parcel</span>
          </a>
          <a class="kpi kpi--link" routerLink="/inventory" [queryParams]="{ low: 1 }">
            <span class="kpi__label">Low stock</span>
            <strong class="kpi__value">{{ s.stock.low }}</strong>
            <span class="muted">Variants with {{ s.stock.threshold }} or fewer, {{ s.stock.pieces }} pieces in total</span>
          </a>
        </div>

        <div class="grid">
          <section class="card card--chart">
            <header class="card__head">
              <h2>Sales</h2>
              <span class="muted">Paid orders per day</span>
            </header>
            @if (s.has_sales) {
              <div class="chart" role="img" [attr.aria-label]="'Sales for the last ' + days() + ' days'">
                @for (d of s.days; track d.date) {
                  <div class="bar" [title]="(d.date | shopDate: 'short') + ': ' + (d.revenue | money: s.currency) + ', ' + d.orders + ' orders'">
                    <span class="bar__fill" [style.height.%]="barHeight(d.revenue)"></span>
                    <span class="bar__label">{{ d.date | shopDate: 'day' }}</span>
                  </div>
                }
              </div>
            } @else {
              <p class="muted">No sales yet.</p>
            }
          </section>

          <section class="card">
            <header class="card__head">
              <h2>Best sellers</h2>
              <span class="muted">Last 30 days</span>
            </header>
            <ol class="list">
              @for (p of s.top_products; track p.product_slug) {
                <li>
                  <img class="thumb" [src]="p.image | photo: 80" alt="" />
                  <a [routerLink]="['/products', p.product_slug]">{{ p.product_name }}</a>
                  <span class="num">{{ p.units }} sold</span>
                </li>
              } @empty {
                <li class="muted">Nothing sold yet.</li>
              }
            </ol>
          </section>

          <section class="card">
            <header class="card__head">
              <h2>Running low</h2>
              <a routerLink="/inventory" [queryParams]="{ low: 1 }" class="muted">All</a>
            </header>
            <ul class="list">
              @for (v of s.low_stock; track v.id) {
                <li>
                  <span class="stock" [class.stock--out]="v.stock === 0">{{ v.stock }}</span>
                  <a [routerLink]="['/products', v.slug]">{{ v.product }}</a>
                  <span class="muted">{{ v.colour }}, {{ v.size }}</span>
                </li>
              } @empty {
                <li class="muted">Everything is well stocked.</li>
              }
            </ul>
          </section>

          <section class="card card--wide">
            <header class="card__head">
              <h2>Latest orders</h2>
              <a routerLink="/orders" class="muted">All orders</a>
            </header>
            <div class="table-wrap table-wrap--flat">
              <table class="table">
                <tbody>
                  @for (o of s.recent_orders; track o.id) {
                    <tr class="is-link" (click)="openOrder(o.id)">
                      <td class="mono">{{ o.reference }}</td>
                      <td>{{ o.full_name }}</td>
                      <td class="muted">{{ o.created_at | shopDate: 'datetime' }}</td>
                      <td><span class="badge badge--{{ o.status }}">{{ o.status }}</span></td>
                      <td class="num">{{ o.total | money: s.currency }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="card">
            <header class="card__head">
              <h2>Why things come back</h2>
            </header>
            <ul class="list">
              @for (r of reasons(); track r.code) {
                <li>
                  <span class="meter"><span [style.width.%]="r.share"></span></span>
                  <span>{{ r.label }}</span>
                  <span class="num">{{ r.count }}</span>
                </li>
              } @empty {
                <li class="muted">No returns yet.</li>
              }
            </ul>
          </section>
        </div>
      } @else if (!error()) {
        <div class="kpis">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="kpi skeleton" style="height: 110px"></div>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .kpis {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
    }

    .kpi {
      display: grid;
      gap: 6px;
      align-content: start;
      padding: 18px 20px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--bg-raised);
      font-size: 12.5px;
      text-decoration: none;
    }

    .kpi--link:hover {
      border-color: var(--line-strong);
      background: #fff;
    }

    .kpi__label {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .kpi__value {
      font-family: var(--display);
      font-size: 38px;
      font-weight: 500;
      line-height: 1;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .card {
      display: grid;
      align-content: start;
      gap: 16px;
      padding: 20px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--bg-raised);
    }

    .card--chart,
    .card--wide {
      grid-column: span 2;
    }

    .card__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      font-size: 13px;
    }

    .card__head h2 {
      font-size: 26px;
    }

    .chart {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 220px;
      padding-top: 8px;
    }

    .bar {
      flex: 1;
      display: grid;
      grid-template-rows: 1fr auto;
      gap: 6px;
      height: 100%;
      min-width: 0;
    }

    .bar__fill {
      align-self: end;
      min-height: 2px;
      background: var(--ink);
      transition: height 0.6s var(--ease);
    }

    .bar:hover .bar__fill {
      background: var(--danger);
    }

    .bar__label {
      overflow: hidden;
      font-size: 10.5px;
      color: var(--muted);
      text-align: center;
      white-space: nowrap;
    }

    .list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 13.5px;
    }

    .list li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
    }

    .list a {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-decoration: none;
    }

    .list a:hover {
      text-decoration: underline;
    }

    .num {
      font-variant-numeric: tabular-nums;
      color: var(--ink-soft);
    }

    .stock {
      display: grid;
      place-items: center;
      min-width: 28px;
      height: 24px;
      border-radius: var(--radius);
      background: var(--warning-soft);
      color: var(--warning);
      font-weight: 600;
      font-size: 12px;
    }

    .stock--out {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .meter {
      width: 80px;
      height: 6px;
      background: var(--bg-sunken);
    }

    .meter span {
      display: block;
      height: 100%;
      background: var(--ink-soft);
    }

    .table-wrap--flat {
      border: 0;
      background: none;
    }

    .table-wrap--flat .table td {
      padding-inline: 0 14px;
    }

    @media (max-width: 1200px) {
      .kpis {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .grid {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
    }

    @media (max-width: 760px) {
      .kpis,
      .grid {
        grid-template-columns: minmax(0, 1fr);
      }

      .card--chart,
      .card--wide {
        grid-column: auto;
      }
    }
  `,
})
export class Dashboard {
  private api = inject(Api);
  private router = inject(Router);
  private store = inject(StoreSettings);

  protected data = signal<Summary | null>(null);
  protected error = signal('');
  protected days = signal(14);
  protected today = this.store.format(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' });

  protected average = computed(() => {
    const s = this.data();
    return s && s.period.orders ? Number(s.period.revenue) / s.period.orders : 0;
  });

  private max = computed(() => Math.max(1, ...(this.data()?.days.map((d) => Number(d.revenue)) ?? [1])));

  protected reasons = computed(() => {
    const counts = this.data()?.returns_by_reason ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count, label: REASONS[code] ?? code, share: (count / total) * 100 }));
  });

  constructor() {
    this.load(14);
  }

  load(days: number) {
    this.days.set(days);
    this.error.set('');
    this.api.summary(days).subscribe({
      next: (s) => this.data.set(s),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  barHeight(revenue: string): number {
    return (Number(revenue) / this.max()) * 100;
  }

  openOrder(id: number) {
    this.router.navigate(['/orders'], { queryParams: { open: id } });
  }
}
