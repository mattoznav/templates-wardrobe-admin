import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Api, errorMessage } from '../../core/api';
import { Icon } from '../../core/icon';
import { Category, Colour, Product, ProductImage, Size, Variant } from '../../core/models';
import { PhotoPipe } from '../../core/store';

type System = Size['system'];

interface Draft {
  name: string;
  slug: string;
  department: Product['department'];
  category: string;
  status: Product['status'];
  is_new: boolean;
  popularity: number;
  price: string;
  compare_at_price: string;
  description: string;
  details: string;
  composition: string;
  care: string;
}

const EMPTY: Draft = {
  name: '',
  slug: '',
  department: 'women',
  category: '',
  status: 'draft',
  is_new: true,
  popularity: 50,
  price: '',
  compare_at_price: '',
  description: '',
  details: '',
  composition: '',
  care: '',
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

@Component({
  selector: 'app-product-form',
  imports: [FormsModule, RouterLink, Icon, PhotoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="page" (ngSubmit)="save()" novalidate>
      <header class="page__head">
        <div>
          <a routerLink="/products" class="back"><app-icon name="arrow-left" [size]="16" /> Products</a>
          <h1 class="page__title">{{ isNew() ? 'New product' : draft.name || 'Product' }}</h1>
        </div>
        <div class="toolbar">
          @if (!isNew()) {
            <a class="btn btn--ghost" [href]="shopUrl()" target="_blank" rel="noopener"><app-icon name="arrow-square-out" [size]="16" /> View in shop</a>
          }
          <button type="submit" class="btn btn--primary" [disabled]="busy() || loading()">{{ isNew() ? 'Create product' : 'Save changes' }}</button>
        </div>
      </header>

      @if (error()) {
        <p class="alert"><app-icon name="warning-circle" [size]="18" /> {{ error() }}</p>
      }
      @if (saved()) {
        <p class="saved"><app-icon name="check-circle" [size]="18" /> Saved. The shop shows the change after its next build.</p>
      }

      @if (!loading()) {
        <div class="layout">
          <div class="col">
            <section class="card">
              <h2>Details</h2>
              <div class="row">
                <div class="field field--grow">
                  <label for="name">Name</label>
                  <input id="name" name="name" [(ngModel)]="draft.name" (ngModelChange)="isNew() && (draft.slug = slug(draft.name))" required />
                </div>
                <div class="field">
                  <label for="slug">Web address</label>
                  <input id="slug" name="slug" [(ngModel)]="draft.slug" [disabled]="!isNew()" />
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <label for="department">Department</label>
                  <select id="department" name="department" [(ngModel)]="draft.department">
                    <option value="women">Women</option>
                    <option value="men">Men</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
                <div class="field">
                  <label for="category">Category</label>
                  <select id="category" name="category" [(ngModel)]="draft.category" required>
                    <option value="" disabled>Choose</option>
                    @for (c of categories(); track c.slug) {
                      <option [value]="c.slug">{{ c.name }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="field">
                <label for="description">Description</label>
                <textarea id="description" name="description" [(ngModel)]="draft.description" rows="4"></textarea>
              </div>
              <div class="field">
                <label for="details">Details</label>
                <textarea id="details" name="details" [(ngModel)]="draft.details" rows="4" placeholder="One per line: fit, closures, pockets"></textarea>
              </div>
              <div class="row">
                <div class="field field--grow">
                  <label for="composition">Composition</label>
                  <input id="composition" name="composition" [(ngModel)]="draft.composition" />
                </div>
                <div class="field field--grow">
                  <label for="care">Care</label>
                  <input id="care" name="care" [(ngModel)]="draft.care" />
                </div>
              </div>
            </section>

            <section class="card">
              <header class="card__head">
                <h2>Colours, sizes and stock</h2>
                <span class="muted small">{{ totalStock() }} pieces</span>
              </header>
              <div class="field">
                <span class="label">Colours</span>
                <div class="chips">
                  @for (c of colours(); track c.slug) {
                    <button type="button" class="chip" [attr.aria-pressed]="chosenColours().includes(c.slug)" (click)="toggleColour(c.slug)">
                      <span class="dot" [style.background]="c.hex"></span>{{ c.name }}
                    </button>
                  }
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <label for="system">Size system</label>
                  <select id="system" name="system" [ngModel]="system()" (ngModelChange)="setSystem($event)">
                    <option value="letter">Letters (XS to XL)</option>
                    <option value="shoe">Shoes (EU)</option>
                    <option value="one">One size</option>
                  </select>
                </div>
                <div class="field field--grow">
                  <span class="label">Sizes</span>
                  <div class="chips">
                    @for (s of systemSizes(); track s.code) {
                      <button type="button" class="chip chip--size" [attr.aria-pressed]="chosenSizes().includes(s.code)" (click)="toggleSize(s.code)">{{ s.label }}</button>
                    }
                  </div>
                </div>
              </div>

              @if (chosenColours().length && chosenSizes().length) {
                <div class="table-wrap">
                  <table class="table grid">
                    <thead>
                      <tr>
                        <th>Colour</th>
                        @for (s of orderedSizes(); track s.code) {
                          <th class="num">{{ s.label }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (c of chosenColours(); track c) {
                        <tr>
                          <td>
                            <span class="dot" [style.background]="colourHex(c)"></span>
                            {{ colourName(c) }}
                          </td>
                          @for (s of orderedSizes(); track s.code) {
                            <td class="num">
                              <input
                                class="stock"
                                type="number"
                                min="0"
                                [name]="'stock-' + c + '-' + s.code"
                                [ngModel]="stockOf(c, s.code)"
                                (ngModelChange)="setStock(c, s.code, $event)"
                                [attr.aria-label]="'Stock ' + colourName(c) + ' ' + s.label"
                              />
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <p class="muted small">Stock changes here replace the numbers. For deliveries while orders are coming in, use Stock instead: it adds to what is there.</p>
              }
            </section>

            <section class="card">
              <header class="card__head">
                <h2>Photos</h2>
                <span class="muted small">The first is the cover. Credit every photo.</span>
              </header>
              <ul class="images">
                @for (img of images(); track $index; let i = $index) {
                  <li>
                    <img class="thumb thumb--lg" [src]="img.url | photo: 128" [alt]="img.alt" />
                    <div class="images__fields">
                      <input class="input" [name]="'alt-' + i" [(ngModel)]="img.alt" placeholder="Describe the photo" aria-label="Alt text" />
                      <div class="row">
                        <select class="input" [name]="'colour-' + i" [(ngModel)]="img.colour" aria-label="Colour shown">
                          <option [ngValue]="null">Any colour</option>
                          @for (c of chosenColours(); track c) {
                            <option [ngValue]="c">{{ colourName(c) }}</option>
                          }
                        </select>
                        <span class="muted small credit">{{ img.photographer }}</span>
                      </div>
                    </div>
                    <div class="images__tools">
                      <button type="button" class="btn btn--ghost btn--icon" [disabled]="i === 0" (click)="moveImage(i, -1)" aria-label="Move up"><app-icon name="caret-left" [size]="16" /></button>
                      <button type="button" class="btn btn--ghost btn--icon" (click)="removeImage(i)" aria-label="Remove"><app-icon name="trash" [size]="16" /></button>
                    </div>
                  </li>
                }
              </ul>
              <details class="add">
                <summary><app-icon name="plus" [size]="16" /> Add a photo</summary>
                <div class="add__fields">
                  <div class="field"><label for="new-url">Image address</label><input id="new-url" name="new-url" [(ngModel)]="newImage.url" placeholder="https://images.unsplash.com/photo-..." /></div>
                  <div class="field"><label for="new-alt">Description</label><input id="new-alt" name="new-alt" [(ngModel)]="newImage.alt" /></div>
                  <div class="row">
                    <div class="field field--grow"><label for="new-by">Photographer</label><input id="new-by" name="new-by" [(ngModel)]="newImage.photographer" /></div>
                    <div class="field field--grow"><label for="new-profile">Photographer page</label><input id="new-profile" name="new-profile" [(ngModel)]="newImage.photographer_url" /></div>
                  </div>
                  <div class="field"><label for="new-source">Photo page (for the credit)</label><input id="new-source" name="new-source" [(ngModel)]="newImage.source_url" /></div>
                  <button type="button" class="btn btn--ghost" (click)="addImage()">Add photo</button>
                </div>
              </details>
            </section>
          </div>

          <div class="col col--side">
            <section class="card">
              <h2>Status</h2>
              <div class="field">
                <select name="status" [(ngModel)]="draft.status" aria-label="Status">
                  <option value="active">On sale</option>
                  <option value="draft">Draft (hidden)</option>
                  <option value="archived">Archived (hidden)</option>
                </select>
              </div>
              <label class="check"><input type="checkbox" name="is_new" [(ngModel)]="draft.is_new" /> Show as new</label>
              <div class="field">
                <label for="popularity">Position in "Featured"</label>
                <input id="popularity" name="popularity" type="number" min="0" [(ngModel)]="draft.popularity" />
                <span class="field__hint">Higher comes first.</span>
              </div>
            </section>

            <section class="card">
              <h2>Price</h2>
              <div class="field">
                <label for="price">Price</label>
                <input id="price" name="price" inputmode="decimal" [(ngModel)]="draft.price" required />
              </div>
              <div class="field">
                <label for="compare">Old price</label>
                <input id="compare" name="compare" inputmode="decimal" [(ngModel)]="draft.compare_at_price" placeholder="Only when on sale" />
                <span class="field__hint">Shown crossed out next to the price.</span>
              </div>
            </section>

            @if (!isNew()) {
              <section class="card">
                <h2>Remove</h2>
                <p class="muted small">Products that were ordered cannot be deleted: archive them to hide them from the shop.</p>
                <button type="button" class="btn btn--danger" (click)="remove()"><app-icon name="trash" [size]="16" /> Delete product</button>
              </section>
            }
          </div>
        </div>
      } @else {
        <div class="skeleton" style="height: 400px"></div>
      }
    </form>
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 13px;
      color: var(--muted);
      text-decoration: none;
    }

    .saved {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 12px 14px;
      border-radius: var(--radius);
      background: var(--success-soft);
      color: var(--success);
      font-size: 14px;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 16px;
      align-items: start;
    }

    .col {
      display: grid;
      gap: 16px;
    }

    .col--side {
      position: sticky;
      top: 16px;
    }

    .card {
      display: grid;
      gap: 16px;
      padding: 22px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--bg-raised);
    }

    .card h2 {
      font-size: 26px;
    }

    .card__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
    }

    .row > .field {
      flex: 1 1 160px;
    }

    .field--grow {
      flex: 2 1 240px !important;
    }

    .small {
      font-size: 12.5px;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border: 1px solid var(--line-strong);
      border-radius: var(--radius);
      background: transparent;
      font-size: 12.5px;
      cursor: pointer;
    }

    .chip[aria-pressed='true'] {
      border-color: var(--ink);
      background: var(--ink);
      color: var(--bg);
    }

    .chip--size {
      min-width: 40px;
      justify-content: center;
    }

    .dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      vertical-align: -1px;
      box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
    }

    .grid td:first-child {
      white-space: nowrap;
    }

    .stock {
      width: 64px;
      min-height: 32px;
      padding: 0 8px;
      border: 1px solid var(--line-strong);
      border-radius: var(--radius);
      background: var(--bg);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .images {
      display: grid;
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .images li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 14px;
      align-items: center;
    }

    .images__fields {
      display: grid;
      gap: 8px;
    }

    .images__fields .row {
      align-items: center;
    }

    .images__fields select {
      max-width: 200px;
    }

    .images__tools {
      display: flex;
      gap: 6px;
    }

    .images__tools button:first-child app-icon {
      transform: rotate(90deg);
    }

    .add summary {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    .add__fields {
      display: grid;
      gap: 12px;
      margin-top: 14px;
      justify-items: start;
    }

    .add__fields .field,
    .add__fields .row {
      width: 100%;
    }

    .check {
      display: flex;
      gap: 10px;
      align-items: center;
      font-size: 14px;
    }

    .check input {
      accent-color: var(--ink);
    }

    @media (max-width: 1000px) {
      .layout {
        grid-template-columns: minmax(0, 1fr);
      }

      .col--side {
        position: static;
      }
    }
  `,
})
export class ProductForm {
  private api = inject(Api);
  private router = inject(Router);

  readonly slugParam = input<string>(undefined, { alias: 'slug' });

  protected draft: Draft = { ...EMPTY };
  protected categories = signal<Category[]>([]);
  protected colours = signal<Colour[]>([]);
  protected sizes = signal<Size[]>([]);
  protected images = signal<ProductImage[]>([]);
  protected variants = signal<Variant[]>([]);
  protected chosenColours = signal<string[]>([]);
  protected chosenSizes = signal<string[]>([]);
  protected system = signal<System>('letter');
  protected loading = signal(true);
  protected busy = signal(false);
  protected error = signal('');
  protected saved = signal(false);
  protected newImage: ProductImage = this.blankImage();

  protected isNew = computed(() => !this.slugParam());
  protected systemSizes = computed(() => this.sizes().filter((s) => s.system === this.system()));
  protected orderedSizes = computed(() => this.systemSizes().filter((s) => this.chosenSizes().includes(s.code)));
  protected totalStock = computed(() =>
    this.variants()
      .filter((v) => this.chosenColours().includes(v.colour) && this.chosenSizes().includes(v.size))
      .reduce((n, v) => n + (Number(v.stock) || 0), 0),
  );

  constructor() {
    queueMicrotask(() => this.load());
  }

  private load() {
    const slug = this.slugParam();
    forkJoin({ categories: this.api.categories(), colours: this.api.colours(), sizes: this.api.sizes() }).subscribe({
      next: ({ categories, colours, sizes }) => {
        this.categories.set(categories);
        this.colours.set(colours);
        this.sizes.set(sizes);
        if (!slug) {
          this.chosenSizes.set(['s', 'm', 'l']);
          this.loading.set(false);
          return;
        }
        this.api.product(slug).subscribe({
          next: (p) => this.fill(p),
          error: (err) => {
            this.error.set(errorMessage(err, 'This product could not be loaded.'));
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private fill(p: Product) {
    this.draft = {
      name: p.name,
      slug: p.slug,
      department: p.department,
      category: p.category,
      status: p.status,
      is_new: p.is_new,
      popularity: p.popularity,
      price: p.price,
      compare_at_price: p.compare_at_price ?? '',
      description: p.description,
      details: p.details.join('\n'),
      composition: p.composition,
      care: p.care,
    };
    this.images.set(p.images.map((i) => ({ ...i })));
    this.variants.set(p.variants.map((v) => ({ ...v })));
    this.chosenColours.set(p.colours.map((c) => c.slug));
    this.chosenSizes.set(p.sizes.map((s) => s.code));
    const first = this.sizes().find((s) => s.code === p.sizes[0]?.code);
    if (first) this.system.set(first.system);
    this.loading.set(false);
  }

  slug(name: string) {
    return slugify(name);
  }

  shopUrl() {
    return `http://localhost:4322/products/${this.draft.slug}/`;
  }

  colourName(slug: string) {
    return this.colours().find((c) => c.slug === slug)?.name ?? slug;
  }

  colourHex(slug: string) {
    return this.colours().find((c) => c.slug === slug)?.hex ?? '#ccc';
  }

  toggleColour(slug: string) {
    this.chosenColours.update((list) => (list.includes(slug) ? list.filter((c) => c !== slug) : [...list, slug]));
  }

  toggleSize(code: string) {
    this.chosenSizes.update((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]));
  }

  setSystem(system: System) {
    this.system.set(system);
    this.chosenSizes.set(system === 'one' ? ['one-size'] : []);
  }

  stockOf(colour: string, size: string): number {
    return this.variants().find((v) => v.colour === colour && v.size === size)?.stock ?? 0;
  }

  setStock(colour: string, size: string, value: number) {
    const stock = Math.max(0, Math.floor(Number(value) || 0));
    this.variants.update((list) => {
      const existing = list.find((v) => v.colour === colour && v.size === size);
      if (existing) return list.map((v) => (v === existing ? { ...v, stock } : v));
      return [...list, { colour, size, stock, sku: '' }];
    });
  }

  moveImage(i: number, step: number) {
    this.images.update((list) => {
      const next = [...list];
      const [item] = next.splice(i, 1);
      next.splice(Math.max(0, i + step), 0, item);
      return next;
    });
  }

  removeImage(i: number) {
    this.images.update((list) => list.filter((_, n) => n !== i));
  }

  addImage() {
    const img = this.newImage;
    if (!img.url.startsWith('https://') || !img.photographer || !img.photographer_url || !img.source_url) {
      this.error.set('A photo needs its address, the photographer and the two credit links.');
      return;
    }
    this.error.set('');
    this.images.update((list) => [...list, { ...img, alt: img.alt || this.draft.name }]);
    this.newImage = this.blankImage();
  }

  private blankImage(): ProductImage {
    return { url: '', alt: '', colour: null, photographer: '', photographer_url: '', source_url: '' };
  }

  save() {
    this.saved.set(false);
    if (!this.draft.name.trim() || !this.draft.category || !this.draft.price) {
      this.error.set('Name, category and price are needed.');
      return;
    }
    const colours = this.chosenColours();
    const sizes = this.chosenSizes();
    const variants = colours.flatMap((colour) =>
      sizes.map((size) => {
        const v = this.variants().find((x) => x.colour === colour && x.size === size);
        return { ...(v?.id ? { id: v.id, sku: v.sku } : {}), colour, size, stock: Number(v?.stock ?? 0) } as Variant;
      }),
    );
    const payload: Partial<Product> & Record<string, unknown> = {
      name: this.draft.name.trim(),
      department: this.draft.department,
      category: this.draft.category,
      status: this.draft.status,
      is_new: this.draft.is_new,
      popularity: Number(this.draft.popularity) || 0,
      price: this.draft.price,
      compare_at_price: this.draft.compare_at_price || null,
      description: this.draft.description,
      details: this.draft.details.split('\n').map((d) => d.trim()).filter(Boolean),
      composition: this.draft.composition,
      care: this.draft.care,
      images: this.images(),
      variants,
    };
    if (this.isNew()) payload['slug'] = this.draft.slug || slugify(this.draft.name);

    this.busy.set(true);
    this.error.set('');
    const request = this.isNew() ? this.api.createProduct(payload) : this.api.updateProduct(this.slugParam()!, payload);
    request.subscribe({
      next: (p) => {
        this.busy.set(false);
        this.saved.set(true);
        if (this.isNew()) this.router.navigate(['/products', p.slug]);
        else this.fill(p);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err, 'The product could not be saved.'));
      },
    });
  }

  remove() {
    if (!confirm(`Delete ${this.draft.name}? This cannot be undone.`)) return;
    this.api.deleteProduct(this.slugParam()!).subscribe({
      next: () => this.router.navigate(['/products']),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
