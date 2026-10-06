# Wardrobe template: Admin

The back office for the clothing store's staff: daily sales, orders and fulfilment, the catalogue, stock and returns.

Angular 22, standalone components and signals, no UI library. Part of the [`templates-wardrobe`](https://github.com/mattoznav/templates-wardrobe) template, inside the [`templates`](https://github.com/mattoznav/templates) collection.

## Requirements

- Node.js 22.22 or newer (or 24.15+) and npm
- The backend running locally (see its README)

## Quick start

The admin needs the [backend](https://github.com/mattoznav/templates-wardrobe-backend) running on `http://localhost:8001`. In development every `/api` call is proxied there (`proxy.conf.json`), so there is no CORS to configure.

```bash
npm install
npm start
```

Open `http://localhost:4201` and sign in with a staff account. To create one, set `DEMO_ADMIN_PASSWORD` in the backend's `.env` and run `manage.py bootstrap`, or run `manage.py createsuperuser`.
Customer accounts are refused: only users with staff rights can sign in.

Check the project with `npm run build`, which compiles it with strict type checking into `dist/`.

## Sections

| Section | What staff can do |
| --- | --- |
| Today | Sales today and over 7, 14 or 30 days, orders to ship, returns waiting, best sellers, sizes running low, why pieces come back |
| Orders | Search by reference, name or email, filter by status or day. Ship with a tracking number, mark delivered, cancel with a full refund before shipping |
| Products | Search and filter the catalogue. Create and edit products: details, price and old price for sales, photos with their credits, colours, sizes and the stock of every variant |
| Stock | Every colour and size with its stock. Add a delivery or correct a count: changes add to the current stock, so they never overwrite an order placed in the meantime |
| Returns | Check returned parcels: receive (restock and refund the pieces) or reject with a note for the customer |

Rules that protect data live in the backend: stock never goes below zero, ordered products and variants cannot be deleted (archive them instead), shipped orders cannot be cancelled, and pieces cannot be returned twice.

## Structure

```
src/app/
  core/      API client, auth (JWT with refresh), models, shop timezone and currency pipes, photo sizes, icons
  layout/    Shell with the navigation
  pages/     One folder per section
```

Dates and prices always use the shop's timezone and currency, loaded from `/api/store/` at startup. Product photos come from the Unsplash CDN in the size each view needs.

## Production

```bash
npm run build
```

Serve `dist/wardrobe-admin/browser` from the same domain as the API (for example under `/admin/` with the API under `/api/`), or put both behind one reverse proxy.
The public website is built ahead of time: after editing products, trigger a rebuild of the website (for example with a deploy hook) so the shop pages follow.

## License

The code is released under the [MIT License](LICENSE).
