# Frontend

React 19 Vendor Portal UI: purchase/sales document tables and create forms, dashboard, and intercompany (IC) operator surfaces. Built with Vite, TanStack Router (file-based), React Query, Zustand, Zod v4, Tailwind CSS v4, and the React Compiler (Babel).

## Purpose

This package owns:

- File-based routes and auto-generated route tree
- Create/edit document UIs and list tables
- Client-only state (Zustand) vs server data (TanStack Query)
- API consumption against `hana-backend` (`VITE_API_URL`)
- IC notifications, retries, and Request For Quotation (RFQ) UI

It does **not** own SAP HANA or Service Layer logic — that stays in the backend.

## Entry Points

| File                    | Role                                         |
| ----------------------- | -------------------------------------------- |
| `src/main.tsx`          | Bootstrap (QueryClient, router, root render) |
| `src/App.tsx`           | App shell wiring                             |
| `src/routes/__root.tsx` | Root layout, toaster, error boundary         |
| `src/routeTree.gen.ts`  | **Generated** — do not edit by hand          |

## Stack

| Concern            | Library                                                     |
| ------------------ | ----------------------------------------------------------- |
| UI                 | React 19, Tailwind v4                                       |
| Routing            | TanStack Router (file-based) + Vite plugin                  |
| Server state       | TanStack Query                                              |
| Client state       | Zustand (`createAppStore`)                                  |
| Tables             | TanStack Table + TanStack Virtual (large create/copy lists) |
| Forms / validation | React Hook Form + Zod v4                                    |
| Motion / icons     | Motion, Lucide                                              |
| Toasts             | Sonner via shared toast wrapper                             |
| Charts             | Recharts (dashboard)                                        |
| Build              | Vite 8, TypeScript project references, React Compiler       |
| Tests              | Vitest                                                      |

## Scripts

| Command           | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `pnpm dev`        | Vite dev server (`http://localhost:5173`)     |
| `pnpm build`      | `tsc -b` then Vite production build → `dist/` |
| `pnpm preview`    | Serve `dist/` on port 5173 (strict port)      |
| `pnpm test`       | Vitest once (`vitest run`)                    |
| `pnpm test:watch` | Vitest watch mode                             |
| `pnpm typecheck`  | TypeScript project build check (`tsc -b`)     |

From repo root:

```bash
pnpm dev:frontend
pnpm --filter frontend test
pnpm --filter frontend build
```

## Environment

```bash
VITE_API_URL=http://localhost:4000
```

Points the browser at the HANA backend during local development.

## Local Setup

```bash
# from repository root
pnpm install
pnpm dev:frontend
```

Open `http://localhost:5173`. Backend should be running on `:4000` for authenticated flows.

## Project Structure

```text
src/
  main.tsx / App.tsx
  routes/                 # file-based routes → routeTree.gen.ts
    login.tsx
    _layout.tsx           # authenticated shell
    _layout/
      dashboard/
      purchase/           # quotations, orders, grpo, AP, OP + create/update
      sales/              # SQ + request-for-quotations (IC RFQ)
      intercompany/       # notifications, retries
  features/
    auth/
    dashboard/
    layout/
    create-pages/         # document create/edit forms
    create-shared/        # shared create helpers
    table-pages/          # list tables (incl. rfqs/)
    intercompany/         # IC API client, notifications, retries UI
  components/             # shared UI primitives
  shared/                 # client utils, API helpers, toast
  store/                  # Zustand (see store/README.md)
  hooks/
  assets/
tests/
  unit/                   # Vitest unit tests
```

### Feature modules (high level)

| Area                | Responsibility                                                            |
| ------------------- | ------------------------------------------------------------------------- |
| `create-pages/`     | PQ, PO, GRPO, AP invoice/credit, SQ, OP create/edit; shared create chrome |
| `table-pages/`      | Document list grids, filters, relationship map entry points               |
| `intercompany/`     | Paths/queries/mutations for `/api/v1/ic/*`, notification & retry tables   |
| `dashboard/`        | Purchase/sales overview widgets                                           |
| `auth/` / `layout/` | Login session UI, sidebar, shell                                          |

### Intercompany UI routes

| Route                                  | Surface                                        |
| -------------------------------------- | ---------------------------------------------- |
| `/intercompany`                        | Redirects to notifications                     |
| `/intercompany/notifications`          | Company-scoped IC notifications + unread badge |
| `/intercompany/retries`                | Failed IC actions; run retry                   |
| `/sales/request-for-quotations`        | RFQ list (Sales)                               |
| `/sales/request-for-quotations/$rfqId` | RFQ fill / submit / convert                    |

Backend IC architecture:  
[`../hana-backend/src/modules/intercompany/README.md`](../hana-backend/src/modules/intercompany/README.md).

## Toasts

Use **`@/shared/ui/toast/toast`** (not raw `sonner` in features).

- Single `<AppToaster />` is mounted in `src/routes/__root.tsx`.
- **Toast for:** document save success/update, API failures, payments, goods receipt/issue, downloads, edit-restricted fields, hydrate loading, intercompany, session ended.
- Mock-only screens (transfer, item master) toast **“not available yet”** on save until API is wired.
- **Do not toast:** form validation / required-field errors (keep inline `createError`); table list load errors stay in section error UI.
- Create-page helpers: `src/features/create-pages/create-shared/utils/create-feedback-toast.ts`.

## Client State vs Server Data

| Concern                                                  | Tool           |
| -------------------------------------------------------- | -------------- |
| Lists, detail, IC unread, mutations                      | TanStack Query |
| Auth session flags, sidebar, table chrome, create drafts | Zustand        |

Rules and patterns: [`src/store/README.md`](./src/store/README.md).

## Performance Notes

- Large option/product/copy lists on create pages use **TanStack Virtual** where needed.
- Prefer narrow Zustand selectors and `useShallow` for multi-field selects.
- Do not copy fetched server lists into Zustand.

## Build And Deploy

- Production assets → `frontend/dist/`
- Serve as static files (IIS, nginx, CDN, etc.)
- Ensure production API base URL is set at build time via `VITE_API_URL` (or your host’s env injection)

## Important Conventions

- **Do not edit** `src/routeTree.gen.ts`
- Import with `@/` → `src/`
- Keep form validation and payload shaping next to the owning feature
- Server lists stay in React Query; Zustand is client-only
- Prefer existing Purchase/Sales table vocabulary for new operator UIs (incl. IC)

## Tests

```bash
pnpm test
# or from root
pnpm --filter frontend test
```

Layout:

```text
tests/unit/
  store/                  # createAppStore, table store, document drafts
  features/intercompany/
  features/create-pages/request-for-quotation/
  features/table-pages/rfqs/
  features/dashboard/
  create-shared/
  shared/
```

## Troubleshooting

| Issue                   | Action                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| Cannot reach backend    | Check `VITE_API_URL` and that backend is on `:4000`                     |
| New routes missing      | Restart `pnpm dev` so the router plugin regenerates the tree            |
| Stale production assets | Delete `dist/` and run `pnpm build`                                     |
| Session / 401 loops     | Confirm cookies/session with backend `FRONTEND_URL` and same-site setup |
