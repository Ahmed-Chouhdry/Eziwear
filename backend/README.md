# EZiWear Backend

Express REST API — **`/api/v1`**. TypeScript (ESM) · Knex + mysql2 · Zod · JWT · Pino.

## Run

```bash
# from repo root — start MySQL 8 + Adminer first
cp .env.example .env
docker compose up -d                       # MySQL :3307 · Adminer http://localhost:8081

cd backend
npm install
npm run dev                                # http://localhost:3000/api/v1
```

`npm run dev` starts even if the DB is down — `GET /api/v1/health` reports DB status.

## Scripts

| script | what |
|---|---|
| `npm run dev` | watch-mode server (tsx) |
| `npm run build` / `npm start` | compile to `dist/` and run |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:make <name>` | create a migration |
| `npm run db:migrate` / `db:rollback` | run / undo migrations |
| `npm run db:seed:make <name>` / `db:seed` | create / run seeds |

Knex CLI reads `knexfile.ts` (loaded via tsx — see `.knexrc`/scripts).

## Structure

```
src/
  config/      env (zod-validated), logger (pino), db (knex pool)
  middleware/  validate (zod), auth (JWT + requireRole), rate-limit, error-handler
  utils/       ApiError, asyncHandler, response helpers ({ success, data })
  modules/     health/  + auth, products, orders … (added per phase)
  routes/      v1.ts — assembles /api/v1
  app.ts       express app (helmet, cors, rate-limit, json, pino-http)
  server.ts    bootstrap + graceful shutdown
knexfile.ts    migration/seed config
```

## Conventions

- All responses: `{ success, message?, data }` (errors: `{ success:false, message, errors?, statusCode }`).
- Every mutating route validates input with `validate({ body, query, params })` — client validation is never trusted.
- Parameterised queries only (Knex query builder / bindings).
- Auth: JWT access token; `requireRole('admin')` enforced here, not only in Angular guards.
- Rate limiting: global `apiLimiter`, stricter `authLimiter` on auth routes.

## Database

20 tables via 6 migrations (`src/database/migrations/`), typed in `src/database/types.ts`
(Knex `Tables` augmentation — `db('products')` is fully typed; decimals returned as numbers).
Seed (`src/database/seeds/001_core.ts`): admin + sample customer, 5 categories,
12 products (24 images, 144 variants), 1 coupon, 3 sliders, 5 social links.

```bash
npm run db:migrate      # up
npm run db:seed         # sample data (truncates first)
npm run db:rollback     # undo last batch  (add: -- --all  to drop everything)
npm run db:status       # list
```

**Seed logins:** `admin@eziwear.com` / `Admin@12345` · `customer@eziwear.com` / `Customer@123`

## Progress

- [x] **Phase 2** — server, `/api/v1`, DB pool + health check, validation/error/logging, auth + role middleware, CORS + rate-limit + helmet
- [x] **Phase 3** — full schema (20 tables, FKs, indexes), typed rows, seed
- [x] **Phase 4** — auth: `POST /auth/register|login|forgot-password|reset-password|change-password`,
      `GET /auth/me`. bcrypt cost 12, JWT 7d, email-or-phone login, single-use reset tokens,
      no account-existence leak. Frontend wired (app initializer restores session).
- [x] **Phase 5** — catalog + content APIs (public, published-only):
      `GET /categories`, `GET /products` (category/search/price/size/color/inStock/sort/pagination),
      `GET /products/:slug`, `GET /products/:slug/related`,
      `GET /products/sections/:new-arrivals|featured|vip|best-sellers|sale`,
      `GET /sliders`, `GET /social-links`. Batch-loaded images/variants/review aggregates (no N+1).
      Angular `CatalogService` + `ContentService` now hit the API (mock deleted).
- [x] **Phase 6** — `GET /products/filters?category=` (available sizes/colours + price range,
      category-scoped). Frontend `/shop` fully query-param driven + filters sidebar/drawer + search.
- [x] **Phase 7** — product details polish + local wishlist (frontend).
- [x] **Phase 8** — Cart. `GET/DELETE /cart`, `POST/PATCH/DELETE /cart/items[/:id]`,
      `POST /cart/merge`, `POST /cart/validate` (public), `POST /cart/coupon/validate` (public).
      Server-side stock capping, coupon rules (min-order / window / usage-limit / max-discount).
      Frontend `CartService` is hybrid: guest = localStorage, logged-in = server cart, guest
      cart merges on login. Coupon UI in cart page + drawer.
- [x] **Phase 9** — `addresses` CRUD (`GET/POST/PATCH/DELETE /addresses`),
      `POST /orders` (transactional, `FOR UPDATE` stock lock, coupon re-validate,
      stock decrement, `used_count++`, cart clear), `GET /orders`, `GET /orders/:orderNumber`.
      Order number `EZI-<100000+id>`. Frontend: checkout page, order confirmation,
      orders list/detail with tracking timeline.
- [x] **Phase 11** — `PATCH /auth/me` (name/phone), `wishlist` module
      (`GET/POST/DELETE /wishlist[/:productId]`, `POST /wishlist/merge`).
      Frontend: `/account` layout + profile/addresses pages, hybrid `WishlistService`.
- [x] **Phase 12** — `admin` module, all routes `authenticate` + `requireRole('admin')`:
      `GET /admin/stats`, `/admin/stats/sales?days=`, `/admin/orders/recent?limit=`,
      `/admin/inventory/low-stock?limit=`. Frontend admin dashboard wired to live data.
- [x] **Phase 13** — `admin/product.service.ts` + `product.routes.ts`: full product
      CRUD, `PUT /admin/products/:id/images` (replace), per-variant
      `POST/PATCH/DELETE /admin/products/:id/variants` `/admin/variants/:id`
      (safe: keeps history if a variant/product is on past orders). Frontend
      product list + create/edit form (pricing, badges, image URLs, variant grid).
- [x] **Phase 14** — `admin/category.service.ts` + `category.routes.ts`:
      `GET/POST /admin/categories`, `PATCH /admin/categories/:id`,
      `POST /admin/categories/:id/move` (swaps sort_order with the adjacent row),
      `DELETE /admin/categories/:id` (409 if products reference it). Frontend
      `/admin/categories` — single-page list + inline add/edit form + reorder.
- [x] **Phase 15** — `admin/content.{schemas,service,routes}.ts`: sliders
      (`GET/POST /admin/sliders`, `PATCH/DELETE /admin/sliders/:id`,
      `POST /admin/sliders/:id/move`) and advertisements (`GET/POST /admin/advertisements`,
      `PATCH/DELETE /admin/advertisements/:id`, date-range scheduling). Frontend
      `/admin/sliders` tabbed page (Sliders / Advertisements).
- [x] **Phase 16** — `admin/order.{schemas,service}.ts` + `admin/customer.{schemas,service}.ts`
      mounted from `admin/order-management.routes.ts`: `GET/PATCH /admin/orders`
      (search/status/paymentStatus filters, pagination), `GET /admin/orders/:orderNumber`,
      `PATCH /admin/orders/:orderNumber/status` — transaction-wrapped, enforces a
      `TRANSITIONS` state machine (pending→confirmed→processing→shipped→delivered,
      cancel from pending/confirmed/processing, return from shipped/delivered),
      auto-marks COD `payment_status='paid'` on delivery, auto-refunds a paid order
      on cancel/return, restocks `product_variants.stock` for every order item on
      cancel/return, writes `order_status_history` + `audit_logs`.
      `PATCH /admin/orders/:orderNumber/payment-status` (direct override + audit log).
      `GET /admin/customers` (search/status, `orderCount`/`totalSpent` excluding
      cancelled/returned orders), `GET /admin/customers/:id` (addresses + last-20
      orders + lifetime spend), `PATCH /admin/customers/:id/status`
      (active/suspended — suspended blocks login, enforced in `auth.service.ts`
      since Phase 4). Frontend `/admin/orders`, `/admin/orders/:orderNumber`
      (state-machine-mirrored transition buttons + payment-status override),
      `/admin/customers`, `/admin/customers/:id` (stats, suspend/reactivate,
      order history, addresses).
- [x] **Phase 17** — `admin/coupon.{schemas,service}.ts` + `admin/review.{schemas,service}.ts`
      mounted from `admin/marketing.routes.ts`: `GET/POST /admin/coupons`,
      `PATCH/DELETE /admin/coupons/:id` (percentage capped at ≤100, duplicate
      code rejected 409); `GET /admin/reviews` (search/status), `PATCH /admin/reviews/:id/status`
      (approve/reject), `DELETE /admin/reviews/:id`.
      New public `modules/reviews/`: `GET /products/:slug/reviews` (approved only,
      paginated, reviewer name shown as "First L."), `GET /products/:slug/reviews/mine`
      (auth — `{ eligible, review }`), `POST /products/:slug/reviews` (auth —
      upserts by user+product; eligibility = a `delivered` order containing that
      product; editing an existing review resets it to `pending` for re-moderation).
      Social links CRUD (`GET/POST /admin/social-links`, `PATCH/DELETE /admin/social-links/:id`,
      `POST /admin/social-links/:id/move`) added to the existing `admin/content.*`
      module alongside sliders/ads (same reorder-by-swapping-sort_order pattern).
      Frontend: `/admin/coupons` (list+inline form), `/admin/reviews` (moderation
      queue, approve/reject/delete), Sliders & Ads page gained a third "Social Links"
      tab. PDP reviews section rewired to real data — approved list + a
      write/edit form gated on `reviews/mine`'s `eligible` flag (guest → sign-in
      prompt, not eligible → "opens once delivered", eligible → write button,
      already reviewed → status badge + edit).
- [x] **Phase 18** — `config/cloudinary.ts` (configures the SDK only when all
      three `CLOUDINARY_*` env vars are set — `cloudinaryConfigured` flag lets
      the route fail gracefully with 500 instead of crashing at boot when unset).
      `modules/uploads/upload.routes.ts`: `POST /admin/uploads?folder=products|categories|sliders|ads`
      (multer `memoryStorage`, 8MB cap, image-mimetype `fileFilter`, streams the
      buffer to `cloudinary.uploader.upload_stream` under `eziwear/<folder>`,
      returns `{url, publicId}`), `DELETE /admin/uploads?publicId=` (best-effort
      `cloudinary.uploader.destroy`, swallows not-found). Both admin-only.
