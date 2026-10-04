import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Auth } from '../core/auth';
import { Icon, IconName } from '../core/icon';
import { StoreSettings } from '../core/store';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="side">
      <a routerLink="/" class="brand" [attr.aria-label]="store.name() + ' back office'">
        <span class="brand__name">{{ store.name() }}</span>
        <span class="brand__sub">Back office</span>
      </a>

      <nav class="nav" aria-label="Sections">
        @for (link of links; track link.path) {
          <a [routerLink]="link.path" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: link.path === '/' }">
            <app-icon [name]="link.icon" [size]="18" />
            <span>{{ link.label }}</span>
          </a>
        }
      </nav>

      <div class="me">
        <span class="me__email" [title]="auth.user()?.email ?? ''">{{ auth.user()?.email }}</span>
        <button type="button" class="btn btn--ghost btn--icon" (click)="auth.signOut()" aria-label="Sign out" title="Sign out">
          <app-icon name="sign-out" [size]="18" />
        </button>
      </div>
    </aside>

    <main class="main">
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: var(--sidebar) minmax(0, 1fr);
      min-height: 100dvh;
    }

    .side {
      position: sticky;
      top: 0;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      gap: 32px;
      padding: 26px 14px 20px;
      border-right: 1px solid var(--line);
      background: var(--bg-sunken);
    }

    .brand {
      display: grid;
      gap: 2px;
      padding: 0 10px;
      text-decoration: none;
    }

    .brand__name {
      font-family: var(--display);
      font-size: 26px;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      line-height: 1;
    }

    .brand__sub {
      font-size: 10.5px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .nav {
      display: grid;
      gap: 2px;
    }

    .nav a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 12px;
      border-radius: var(--radius);
      color: var(--ink-soft);
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      transition:
        background-color 0.15s,
        color 0.15s;
    }

    .nav a:hover {
      background: var(--bg-hover);
      color: var(--ink);
    }

    .nav a.is-active {
      background: var(--bg-raised);
      color: var(--ink);
      box-shadow:
        inset 2px 0 0 var(--ink),
        0 0 0 1px var(--line);
    }

    .me {
      margin-top: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 8px 0;
      border-top: 1px solid var(--line);
    }

    .me__email {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      color: var(--muted);
    }

    .main {
      min-width: 0;
      overflow-x: clip;
    }

    /* Narrow screens: the sidebar becomes a top bar with a scrollable nav */
    @media (max-width: 899px) {
      :host {
        grid-template-columns: minmax(0, 1fr);
      }

      .side {
        position: static;
        height: auto;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }

      .nav {
        order: 3;
        width: 100%;
        display: flex;
        overflow-x: auto;
      }

      .nav a {
        flex: 0 0 auto;
      }

      .nav a.is-active {
        box-shadow: inset 0 -2px 0 var(--ink);
      }

      .me {
        margin: 0 0 0 auto;
        padding: 0;
        border: 0;
      }

      .me__email {
        display: none;
      }
    }
  `,
})
export class Shell {
  protected auth = inject(Auth);
  protected store = inject(StoreSettings);

  protected links: { path: string; label: string; icon: IconName }[] = [
    { path: '/', label: 'Today', icon: 'chart-bar' },
    { path: '/orders', label: 'Orders', icon: 'receipt' },
    { path: '/products', label: 'Products', icon: 'coat-hanger' },
    { path: '/inventory', label: 'Stock', icon: 'stack' },
    { path: '/returns', label: 'Returns', icon: 'arrow-u-up-left' },
  ];
}
