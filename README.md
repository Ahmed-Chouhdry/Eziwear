# EZiWear — A-to-Z E-Commerce

Premium streetwear storefront + admin dashboard.
**Angular 22** · **Node.js/Express** · **MySQL** · JWT auth · Cloudinary images.

> Built phase-by-phase per `docs/EZiWear_A_to_Z_Ecommerce_Project_Plan.docx`.
> Each phase is finished and checked before the next begins.

## Repo layout

```
frontend/   Angular storefront + admin (SCSS design system)
backend/    Express REST API  (/api/v1)               — Phase 2+
docs/       Project plan
docker-compose.yml   MySQL 8 + Adminer                 — Phase 2+
```

## Brand / design system

The official EZiWear colour system is fixed. Tokens live in
`frontend/src/styles/_tokens.scss` — do not hard-code colours in components.

| Token | Hex | Role |
|---|---|---|
| `--ezi-black` | `#0B0B0D` | dark bg / header / footer / hero |
| `--ezi-ivory` | `#F5F2EA` | light bg / text on dark |
| `--ezi-graphite` | `#17171A` | dark cards / drawers / inputs |
| `--ezi-silver` | `#C9C4B8` | borders / secondary text |
| `--ezi-orange` | `#C96A32` | **accent** — CTAs, active, SALE/NEW |
| `--ezi-gold` | `#D6A84F` | **VIP / premium only** |

Approx usage ratio: Black 35 · Ivory 35 · Graphite 15 · Orange 8 · Silver 5 · Gold 2.

## Getting started

Local ports on this machine (others were taken): **frontend 4310 · backend 3005 · MySQL 3307 · Adminer 8081**.

### Database

```bash
cp .env.example .env
docker compose up -d              # MySQL :3307 + Adminer http://localhost:8081
```

### Backend

```bash
cd backend
npm install
npm run dev                       # http://localhost:3005/api/v1
npm run db:migrate                # run migrations (Phase 3+)
```

### Frontend

```bash
cd frontend
npm install
npm start -- --port 4310          # http://localhost:4310  (?theme=dark|light forces a theme)
```

## Progress

- [x] **Phase 0** — Planning, repo, project structure
- [x] **Phase 1** — Angular foundation: design system, theming (dark/light),
      shared components, routing + lazy features, HTTP interceptors,
      loading / empty / 404 states
- [x] **Phase 2** — Express + MySQL foundation: `/api/v1`, Knex pool + `/health`
      (DB status), zod validation, error handler, pino logging, JWT + role
      middleware, CORS + rate-limit + helmet, migration/seed pipeline
- [x] **Phase 3** — Database design: 20 tables (6 migrations, FKs + indexes),
      typed rows, seed (admin + 12-product catalog)
- [x] **Phase 4** — Authentication: register / login (email or phone) / me /
      forgot + reset password / change password; JWT + bcrypt; Angular forms
      wired, session restored on load, route guards live
- [x] **Phase 5** — Home + catalog APIs: categories, products (filter/sort/paginate),
      product detail + related, home sections, sliders, social links.
      Frontend switched from mock data to the live API.
- [x] **Phase 6** — Product catalog: query-param-driven `/shop` (shareable URLs),
      filters sidebar + mobile drawer (price / size / colour / availability),
      active-filter chips, search overlay, `GET /products/filters` endpoint
- [x] **Phase 7** — Product details: image zoom (hover + lightbox), per-colour size
      availability, sold-out states, wishlist (local, per-device) with heart on
      cards + PDP + a real `/wishlist` page, reviews summary block, category-name breadcrumb
- [x] **Phase 8** — Cart: hybrid guest (localStorage) / server cart, guest→server
      merge on login, server-side stock capping, coupon apply (`WELCOME10`) with
      discount line in cart page + drawer, revalidation endpoint for checkout
- [x] **Phase 9** — Checkout: address book CRUD, saved/new shipping address, COD,
      transactional `POST /orders` (stock re-check `FOR UPDATE`, re-price,
      re-validate coupon, decrement stock, bump coupon usage, clear cart),
      order confirmation + tracking timeline, `/account/orders` list & detail
- [x] **Phase 11** — Customer account: `/account` layout (Profile / Orders /
      Addresses / Wishlist / Sign out), profile edit (`PATCH /auth/me`) + change
      password, address book UI, server-synced wishlist (`/api/v1/wishlist`,
      guest→server merge on login)
- [x] **Phase 12** — Admin dashboard: `adminGuard` + `requireRole('admin')`,
      `GET /admin/stats` (revenue, orders by status, customers, VIP/low/out-of-stock),
      `/admin/stats/sales` (14-day series), `/admin/orders/recent`,
      `/admin/inventory/low-stock`. Live stat cards, sales bar chart, recent-orders
      & low-stock tables
- [x] **Phase 13** — Admin Product Management: full CRUD (`/admin/products` list
      with search/status filter/publish-toggle/delete, create/edit form with
      pricing, New/Featured/VIP badges, image URLs, size/colour variant grid with
      per-variant stock). Safe delete (archives instead if the product has order
      history); variant delete keeps history (stock→0) if referenced by past orders
- [x] **Phase 14** — Categories & Collections: full CRUD (`/admin/categories`),
      up/down reordering, active/inactive toggle, safe delete (blocked with a
      friendly message while products reference the category). Collections
      (New Arrivals / Featured / VIP / Sale) are product-level flags, already
      manageable from the Phase 13 product form — no separate entity needed
- [x] **Phase 15** — Slider & Advertisement Management: full CRUD for both
      (`/admin/sliders` tabbed UI), homepage-slider reordering + active/inactive
      toggle with the live hero reflecting changes immediately, ad scheduling
      (start/end dates) and placement (hero/homepage banner/popup/category)
- [x] **Phase 16** — Admin Orders & Customers (Phase 10's payment/order-status
      flow folded in): order list (search/status/payment filters, pagination),
      order detail with enforced state-machine transitions
      (pending→confirmed→processing→shipped→delivered, cancel/return branches),
      COD auto-marks paid on delivery, stock restock + auto-refund on
      cancel/return of a paid order, full `order_status_history` +
      `audit_logs` trail. Customer list (search/status, order-count/spend
      excluding void orders) + detail (order history, addresses,
      suspend/reactivate — suspension blocks login immediately)
- [x] **Phase 17** — Coupons, Review moderation & Social links: full coupon CRUD
      (`/admin/coupons` — percentage/fixed, min order, max discount cap, usage
      limit, date window), customer review submission (gated to a delivered
      order for that product, one review per customer/product — editing
      re-queues it for moderation) with a real approved-reviews list + write/edit
      form on the PDP, admin review moderation (`/admin/reviews` — approve/
      reject/delete), social links full CRUD + reordering (folded into the
      existing Sliders & Ads page as a third tab, footer already reads them live)
- [x] **Phase 18** — Cloudinary image upload: `POST/DELETE /admin/uploads` (multer
      in-memory → `cloudinary.uploader.upload_stream`, admin-only, 8MB/image-only
      guard), a shared `<ui-image-upload>` component (upload button + live
      preview + manual-URL fallback + best-effort delete-on-replace) wired into
      every admin image field that used to be paste-a-URL-only — product images,
      category image, slider images, advertisement media
- [ ] Phases 19–20 — polish, deployment
