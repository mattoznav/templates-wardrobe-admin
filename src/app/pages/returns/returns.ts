import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';

import { Api, errorMessage } from '../../core/api';
import { Icon } from '../../core/icon';
import { Page, ReturnRequest } from '../../core/models';
import { MoneyPipe, PhotoPipe, ShopDatePipe } from '../../core/store';

@Component({
  selector: 'app-returns',
  imports: [FormsModule, RouterLink, Icon, MoneyPipe, ShopDatePipe, PhotoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <h1 class="page__title">Returns</h1>
          <p class="muted">When a parcel arrives, check the pieces: receiving restocks them and refunds their price. Delivery is not refunded.</p>
        </div>
        <label class="search">
          <app-icon name="magnifying-glass" [size]="16" />
          <input class="input" type="search" placeholder="Return, order or email" [ngModel]="q()" (ngModelChange)="search$.next($event)" aria-label="Search returns" />
        </label>
      </header>

      <div class="segments" role="group" aria-label="Status">
        @for (f of filters; track f.value) {
          <button type="button" [attr.aria-pressed]="status() === f.value" (click)="status.set(f.value); load()">{{ f.label }}</button>
        }
      </div>

      @if (error()) {
        <p class="alert"><app-icon name="warning-circle" [size]="18" /> {{ error() }}</p>
      }

      <div class="cards">
        @for (r of page()?.results ?? []; track r.id) {
          <article class="ret">
            <header class="ret__head">
              <div>
                <p class="eyebrow">{{ r.created_at | shopDate: 'datetime' }}</p>
                <h2 class="mono">{{ r.reference }}</h2>
                <p class="muted small">
                  Order <a routerLink="/orders" [queryParams]="{ open: r.order.id }">{{ r.order.reference }}</a> · {{ r.order.full_name }}, {{ r.order.email }}
                </p>
              </div>
              <span class="badge badge--{{ r.status }}">{{ r.status_label }}</span>
            </header>

            <ul class="ret__lines">
              @for (l of r.lines; track l.order_line) {
                <li>
                  <img class="thumb" [src]="l.image_url | photo: 80" alt="" />
                  <span>{{ l.product_name }}<br /><span class="muted small">{{ l.colour }}, {{ l.size }}</span></span>
                  <span class="mono">{{ l.quantity }} × {{ l.unit_price | money: r.order.currency }}</span>
                </li>
              }
            </ul>

            <p class="reason"><strong>{{ r.reason_label }}</strong>@if (r.note) {: “{{ r.note }}”}</p>

            @if (r.status === 'requested') {
              <div class="ret__act">
                <input class="input" [(ngModel)]="notes[r.id]" [name]="'note-' + r.id" placeholder="Note for the customer (needed to reject)" />
                <button type="button" class="btn btn--danger" [disabled]="busy() === r.id" (click)="reject(r)">Reject</button>
                <button type="button" class="btn btn--primary" [disabled]="busy() === r.id" (click)="receive(r)">
                  <app-icon name="check" [size]="16" /> Received, refund {{ r.value | money: r.order.currency }}
                </button>
              </div>
            } @else {
              <p class="muted small">
                {{ r.status === 'refunded' ? 'Refunded ' + (r.refund_amount | money: r.order.currency) : 'Rejected' }} on {{ r.closed_at | shopDate: 'long' }}
                @if (r.staff_note) { · {{ r.staff_note }}}
              </p>
            }
          </article>
        } @empty {
          @if (page()) {
            <p class="empty">No returns here.</p>
          } @else {
            <div class="skeleton" style="height: 200px"></div>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .page__head p {
      max-width: 62ch;
      margin-top: 6px;
      font-size: 13.5px;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 12px;
    }

    .ret {
      display: grid;
      gap: 16px;
      align-content: start;
      padding: 20px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--bg-raised);
    }

    .ret__head {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
    }

    .ret__head h2 {
      font-family: var(--sans);
      font-size: 18px;
      font-weight: 600;
      margin-block: 2px;
    }

    .small {
      font-size: 12.5px;
    }

    .ret__lines {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 14px;
    }

    .ret__lines li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 12px;
      align-items: center;
    }

    .reason {
      padding: 10px 12px;
      background: var(--bg-sunken);
      border-radius: var(--radius);
      font-size: 13.5px;
    }

    .reason strong {
      font-weight: 500;
    }

    .ret__act {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
    }

    .ret__act .input {
      grid-column: 1 / -1;
    }

    .ret__act .btn--primary {
      grid-column: 2;
      grid-row: 2;
    }

    @media (max-width: 600px) {
      .cards {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class Returns {
  private api = inject(Api);

  readonly qParam = input<string>(undefined, { alias: 'q' });

  protected filters = [
    { value: 'requested', label: 'To check' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'rejected', label: 'Rejected' },
    { value: '', label: 'All' },
  ];
  protected page = signal<Page<ReturnRequest> | null>(null);
  protected error = signal('');
  protected busy = signal<number | null>(null);
  protected status = signal('requested');
  protected q = signal('');
  protected notes: Record<number, string> = {};
  protected search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(300)).subscribe((q) => {
      this.q.set(q);
      this.load();
    });
    queueMicrotask(() => {
      if (this.qParam()) {
        this.q.set(this.qParam()!);
        this.status.set('');
      }
      this.load();
    });
  }

  load() {
    this.error.set('');
    this.api.returns({ status: this.status(), q: this.q() }).subscribe({
      next: (p) => this.page.set(p),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  private act(r: ReturnRequest, request: ReturnType<Api['receiveReturn']>) {
    this.busy.set(r.id);
    this.error.set('');
    request.subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.page.update((p) => (p ? { ...p, results: p.results.map((x) => (x.id === updated.id ? updated : x)) } : p));
      },
      error: (err) => {
        this.busy.set(null);
        this.error.set(errorMessage(err));
      },
    });
  }

  receive(r: ReturnRequest) {
    this.act(r, this.api.receiveReturn(r.id, this.notes[r.id] ?? ''));
  }

  reject(r: ReturnRequest) {
    this.act(r, this.api.rejectReturn(r.id, this.notes[r.id] ?? ''));
  }
}
