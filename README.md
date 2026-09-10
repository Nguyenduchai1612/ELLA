# ELLA Storefront — Frontend

Next.js + TypeScript storefront for ELLA, built against the Frontend
Master Specification. Talks only to the ASP.NET Core Web API — never
touches PostgreSQL directly.

## Status: PHASE 1 — Project Foundation ✅

Per the spec's working rule (Section 46), phases are built one at a time
and each is reported before moving on. This is Phase 1 only.

### What's in this phase

- **Project scaffold**: `package.json`, `tsconfig.json` (strict mode,
  `noUncheckedIndexedAccess`), `next.config.mjs`, ESLint, Prettier,
  Tailwind (placeholder tokens — real design system is Phase 2).
- **Domain types** (`src/types/`) encoding the business rules directly in
  the type system: `Product` vs `ProductVariant` (SKU) as separate
  entities, backend-authoritative `listPrice`/`salePrice`, order-item
  snapshots, known `ApiErrorCode` union, etc.
- **API layer** (`src/lib/api/`): one interface per domain
  (`ProductService`, `CartService`, `CheckoutService`, `OrdersService`,
  `CustomersService`, `ReviewsService`, `PaymentsService`), each with a
  `Mock*` and `Real*` implementation. `productsApi`, `cartApi`, etc. are
  the only things a component ever imports — the mock/real switch lives
  in one place (`NEXT_PUBLIC_API_MODE`), never in UI code (Section 43).
- **Error handling** (`src/lib/errors/`): backend error codes →
  Vietnamese messages; order status enum → Vietnamese labels.
- **State architecture** (`src/lib/state/`): `CartProvider` (server-backed
  cart, cached client-side) and `AuthProvider` (auth is never a purchase
  prerequisite — see Section 16), composed in `AppProviders`.
- **Marketing attribution** (`src/lib/attribution/`): first-touch UTM/
  fbclid capture into `sessionStorage`, read at checkout time.
- **Routing skeleton**: every route from Section 42 exists as a stub page
  under `src/app/`, each labeled with the phase that will actually build
  it out.
- **Two real components**: `PriceDisplay` (Section 6 struck-through list
  price / sale price) and `PagePlaceholder` (temporary, deleted phase by
  phase as real pages land).

### Assumptions made (non-blocking, per Section 46)

- **ASSUMPTION**: Tailwind CSS as the styling approach. Nothing in the
  spec mandates a specific styling system; Tailwind fits the "utility,
  mobile-first, fast to ship" direction in Sections 28–29. Revisit in
  Phase 2 if you'd prefer CSS Modules or another approach.
- **ASSUMPTION**: Next.js 14 (App Router, stable) rather than a Next.js
  15 canary, for stability given V1 is a real storefront handling money.
- **ASSUMPTION**: real API endpoint paths (`/api/products`, `/api/cart`,
  etc.) are placeholders following REST convention. The actual ASP.NET
  Core route contract needs confirming in Phase 16 — the `Real*Service`
  files are the only place that will need to change; `ProductService`
  etc. interfaces (and everything calling `productsApi`) will not.
- **ASSUMPTION**: mock-mode cart/reviews/addresses use in-memory module
  state that resets on reload. Fine for exercising UI before the backend
  exists; not meant to simulate persistence.
- **ASSUMPTION**: attribution uses first-touch (first UTM params seen in
  the session win). Confirm this is the model marketing/backend expect.

No BLOCKING DECISION was hit in this phase — nothing here materially
locks in an architecture choice that would be expensive to reverse later.

### A note on this environment

This sandbox has no network access, so `npm install` could not be run
here and the Next.js build could not be executed end-to-end. I did:

- Run `tsc --noEmit` against the whole `src/` tree using a local
  TypeScript compiler, and fixed every genuine type error it found (an
  unsafe array-index fallback in the mock product service). The
  remaining errors it reports are exclusively "cannot find module
  react/next/tailwindcss/@types/node" — expected until you run
  `npm install`, not real bugs.
- Manually reviewed every file for the spec's hard rules (no `any` on
  business entities, `skuId` not renamed to `variantId`, no client-side
  price/stock trust, etc.).

**Before Phase 2, please run locally:**

```bash
npm install
npm run typecheck   # should be 100% clean once deps are installed
npm run dev
```

If `typecheck` or `dev` surface anything unexpected, tell me and I'll
fix it before we continue — per Section 46, Phase 1 should be solid
before Phase 2 starts.

## Mock mode

`NEXT_PUBLIC_API_MODE=mock` (the default — see `.env.example`) runs the
whole app against in-memory mock services seeded with the spec's own
"Vòng cổ cỏ 4 lá" (EAC-05) example: two SKUs, one with its own images,
one that must fall back to the product's common images, and one that's
out of stock — so the SKU-selection, image-fallback, and out-of-stock
rules all have real data to exercise once pages are built.

Switch to `NEXT_PUBLIC_API_MODE=real` and set `NEXT_PUBLIC_API_BASE_URL`
once the ASP.NET Core API is reachable — no UI code changes required.

## Next phase

**Phase 2 — Design System**: ELLA's actual color palette, type scale,
spacing scale, and base `ui/` components (buttons, inputs, etc.),
replacing the Phase 1 Tailwind placeholder config.

Say the word and I'll continue with Phase 2.
