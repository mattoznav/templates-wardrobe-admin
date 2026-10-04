import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Api } from './api';

const LOCALE = 'en-GB';

/** Name, timezone and currency of the shop: every date and price is shown in them. */
@Injectable({ providedIn: 'root' })
export class StoreSettings {
  private api = inject(Api);
  readonly name = signal('Shop');
  readonly timezone = signal(Intl.DateTimeFormat().resolvedOptions().timeZone);
  readonly currency = signal('EUR');

  async load(): Promise<void> {
    try {
      const store = await firstValueFrom(this.api.store());
      this.name.set(store.name);
      this.timezone.set(store.timezone);
      this.currency.set(store.currency);
    } catch {
      // Keep the browser defaults: pages still work, times show in local time
    }
  }

  format(iso: string, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: this.timezone() }).format(new Date(iso));
  }

  money(amount: string | number | null | undefined, currency = this.currency()): string {
    const value = Number(amount ?? 0);
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, minimumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
  }
}

@Pipe({ name: 'shopDate' })
export class ShopDatePipe implements PipeTransform {
  private store = inject(StoreSettings);
  transform(iso: string | null | undefined, style: 'short' | 'long' | 'datetime' | 'day' = 'short'): string {
    if (!iso) return '';
    const options: Record<string, Intl.DateTimeFormatOptions> = {
      short: { day: 'numeric', month: 'short' },
      day: { weekday: 'short', day: 'numeric' },
      long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      datetime: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
    };
    return this.store.format(iso, options[style]);
  }
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  private store = inject(StoreSettings);
  transform(amount: string | number | null | undefined, currency?: string): string {
    return this.store.money(amount, currency);
  }
}

/** A sized photo from the Unsplash CDN. */
@Pipe({ name: 'photo' })
export class PhotoPipe implements PipeTransform {
  transform(url: string | null | undefined, width = 80, height = Math.round(width * 4 / 3)): string {
    return url ? `${url}?w=${width}&h=${height}&fit=crop&crop=faces,entropy&q=70&auto=format` : '';
  }
}
