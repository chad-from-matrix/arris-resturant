# ARRIS — Restaurant & Café

A production-ready web application for **ARRIS — Restaurant & Café (Somali Cuisine)**,
covering three operations: **Arris 1**, **Arris 2** and **Arris 2 Café**.

Four connected products in one codebase:

1. **Customer website** — hero, story, featured menu, café, loyalty, gallery, locations, contact
2. **QR table system** — scan the code on the table, the digital menu opens in seconds
3. **Coffee loyalty programme** — 10 coffees earn 1 free, stamped only by staff
4. **Admin dashboard** — menu and price control, expenses, suppliers, sales, reports, roles

---

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router) · TypeScript · Tailwind CSS |
| Auth | Firebase Auth (email/password) for admin, manager and staff |
| Data | Cloud Firestore |
| Files | Firebase Storage (logo, hero, food photos) |
| Access control | Firestore + Storage security rules, enforced server-side |
| Charts | Recharts, in the brand palette only |
| QR | `qrcode` for generation (PNG + SVG), `jsQR` / `BarcodeDetector` for scanning |

No business data is ever kept only in `localStorage` or component state. The one
exception is the per-table cart, which is UI state until the order is confirmed
to Firestore.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in your Firebase web app keys
npm run seed                   # loads data/arris-seed-data.json
npm run seed -- --with-admin   # ...and creates the first super admin
npm run dev
```

### Against the local emulators (no Firebase project needed)

```bash
npm run emulators                          # terminal 1 — Auth, Firestore, Storage
SEED_ADMIN_EMAIL=admin@arris.local \
SEED_ADMIN_PASSWORD=arris-super-1 \
npm run test:setup                         # terminal 2 — seed + test logins
npm run dev                                # terminal 3
```

Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local` to point the app at them.

### Deploying the rules

```bash
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

The composite indexes in `firestore.indexes.json` back the table, loyalty-history,
price-history and per-table order queries. Deploy them or those screens will error.

---

## The logo

Drop the **supplied** artwork at `public/brand/arris-logo.png`, or upload it in
**Admin → Settings** (which stores it in Firebase Storage and takes precedence).

The logo is never recreated, redrawn, traced or substituted. The same file is
re-tinted to brand brown on light surfaces with a CSS filter. Until the file is
supplied the header falls back to a plain Cinzel `ARRIS` wordmark and the browser
logs one 404 — both disappear the moment the artwork is added. See
`public/brand/README.md`.

---

## Brand rules the code enforces

**Currency** — Indian Rupee, symbol before the amount, no decimals: `₹200`, `₹1,300`.
The symbol lives in `settings/general` (seeded `₹`) and every price goes through
`formatMoney()` in `src/lib/format.ts`. No call site hardcodes a currency.

**Colours** — the exact tokens are defined once in `src/app/globals.css` and surfaced
through Tailwind. There is no blue, purple or grey-blue anywhere, charts included;
the chart palette in `src/components/admin/Charts.tsx` is gold → copper → brown →
pale gold only.

**Typography**

| Role | Font |
|---|---|
| Section titles ("Breakfast Menu", "Fresh Juice") | Great Vibes — `.script-title` |
| Display headings / wordmark | Cinzel — `.display-title` |
| Small labels, tags, table numbers | Antonio — `.label-text` |
| Body, item names, prices, admin | Inter |

Script faces are decorative only — never item names, prices, form labels or admin UI.

**The menu card** (`src/components/menu/MenuItemCard.tsx`) reproduces the printed
card: `--arris-card` surface, 24px radius, circular photo inside a 4px gold ring,
gold-outlined numbered badge overlapping the top-left corner, centred item name,
gold ornament divider (`——— ◆ ———`), then the price. Items with variants render one
name + price row per variant **above** the divider instead of a single large price.
Items 41–44 render as full-width feature cards; item 43 carries the
"Only for special Fridays" badge.

---

## Roles

| Role | Can |
|---|---|
| **Super Admin** | Everything — branches, users, settings, deletions |
| **Manager** | Dashboard, menu, tables, loyalty, expenses, reports. No super-admin edits, no critical settings |
| **Staff** | View menu, stamp and redeem loyalty, record expenses. No price changes, no financial deletions |

Enforced in `firestore.rules` and `storage.rules`, not just in the UI. The UI
permission map in `src/lib/permissions.ts` mirrors the `roles` collection.

Two deliberate details in the rules:

- Every role check resolves through one `role()` helper that performs a single
  document lookup. Chaining separate `exists()`/`get()` helpers exceeds the
  per-request access-call limit and turns a legitimate write into an evaluation
  error. `get()` on a missing document raises a service-call error rather than
  returning null, so `exists()` gates it.
- `loyaltyTransactions` allows `create` only — never `update` or `delete`. Combined
  with a document id derived from the campaign and the transaction reference, that
  makes one transaction reference worth exactly one stamp, permanently.

---

## Loyalty integrity

- A customer's code (`ARR-4F82K1`) **is** the document id, so a card is fetched by
  code without exposing a listable customer directory. Phone numbers live on the
  staff-only `customers` record, never on the publicly readable card.
- Stamping and redemption run inside a Firestore transaction that creates the
  reference document; a replayed bill number is rejected atomically even if two
  staff phones fire at once.
- Customers are never authenticated, and the rules require a signed-in staff member
  for any change to a stamp count — a customer cannot stamp their own card.

---

## Tests

```bash
npm run build          # production build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # acceptance suite against the emulators
npm run test:browser   # rendered customer pages (needs npm run dev)
npm run test:admin     # admin dashboard, per role (needs npm run dev)
```

- `tests/acceptance.test.ts` — the brief's acceptance checklist, run through the
  application's own data layer and the real security rules.
- `tests/browser.mjs` — drives Chromium over the customer pages at phone and
  desktop widths: the gold ring, numbered badges, ornament dividers, variant
  price rows, `₹` with no decimals, and no sideways scrolling at 390px.
- `tests/admin.mjs` — signs in as super admin, manager and staff, loads all
  fifteen admin screens and checks each sidebar offers only what that role can use.

Run `next build` and `next dev` against separate checkouts, or delete `.next`
between them — sharing the directory leaves the dev server serving broken chunks.

---

## Repository layout

```
src/app/                    routes — customer site, /table/[branch]/[table], /loyalty, /admin/*
src/components/brand/       logo, ornament divider, section header
src/components/menu/        the signature menu card, stamp card
src/components/admin/       admin shell, filters, charts
src/components/ui/          primitives, QR generation and scanning
src/lib/                    types, Firebase clients, formatting, permissions
src/lib/db/                 one service module per domain area
data/                       arris-seed-data.json — 72 real menu items
scripts/                    seed scripts
firestore.rules             role enforcement
legacy-hrms/                unrelated scaffold that previously occupied this repo
```

`legacy-hrms/` is the HRMS Vite starter that was in the repository before this
build. It is untouched and unused; delete it when you are sure nothing needs it.

---

## Ready for, but deliberately not built

Online payments, WhatsApp/SMS notifications, kitchen display, inventory, coupons,
membership tiers, delivery and POS integration. The order pipeline, notifications
and settings are structured so these slot in without reshaping the schema.
