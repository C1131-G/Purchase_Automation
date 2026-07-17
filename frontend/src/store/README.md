# Frontend Zustand stores

Client-only state for the Vendor Portal. **Server data belongs in TanStack Query** — do not duplicate API lists/entities into these stores.

## Layout

| Domain | Path | Responsibility |
|--------|------|----------------|
| Auth | `auth/` | Session flags, user, login/logout (not server caches) |
| Sidebar / PWA | `sidebar/`, `pwa/` | UI chrome |
| Table | `table/table.store.ts` | Multi-table filters, pagination, order, sort, visibility by `tableId` |
| Create drafts | `create/` | Ephemeral document headers (and lines for pattern-B docs) |
| Shared helpers | `lib/` | `createAppStore`, `Updater` / `applyUpdater` |

Legacy table files (`table-filter.store.ts`, etc.) are **re-export shims** over the composed table store.

## Rules (project conventions)

1. **Curried create** via `createAppStore` (DEV-only `devtools`, optional `immer`).
2. **Named actions** on the store — never call raw `set` from components. Pass action names as the third `set` arg (`"auth/login"`).
3. **Select narrowly** — `useStore((s) => s.field)`. Multi-value objects: `useShallow`.
4. **Domain separation** — separate stores when domains never interact (auth vs table vs create). Use **slices/one registry** when concerns always travel together (table UI).
5. **Create drafts**
   - **Pattern A** (PO, PQ, SO, SQ, AR invoice): header in Zustand via `createHeaderOnlyDraftStore`; product lines stay in React state in hooks. No dead `lines` APIs on the store.
   - **Pattern B** (GRPO, AP invoice, AP credit memo): header + lines via `createLineDraftStore`.
6. **Export creators** — `createXStore` / `createXStoreInstance` for unit tests so each test gets a fresh store.
7. **No persist** for create drafts. Prefer Query for anything fetched from the API.

## Tests

```bash
cd frontend && pnpm test
```

All frontend tests live under `frontend/tests/` (e.g. `tests/unit/store/`). They import shipped modules via `@/store/...`.
