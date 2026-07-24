# Frontend Zustand Stores

Client-only state for the Vendor Portal. Server data belongs in TanStack Query, not in these stores.

## Layout

| Domain         | Path                   | Responsibility                                                            |
| -------------- | ---------------------- | ------------------------------------------------------------------------- |
| Auth           | `auth/`                | Session flags, current user, login/logout state                           |
| Sidebar / PWA  | `sidebar/`, `pwa/`     | UI chrome and install state                                               |
| Table          | `table/table.store.ts` | Multi-table filters, pagination, order, sort, and visibility by `tableId` |
| Create drafts  | `create/`              | Ephemeral document headers and, where required, line items                |
| Shared helpers | `lib/`                 | `createAppStore`, `Updater`, and related store utilities                  |

Legacy table files such as `table-filter.store.ts`, `table-order.store.ts`, and `table-pagination.store.ts` are re-export shims over the composed table store.

## Rules

1. Use the curried `createAppStore` helper for store creation.
2. Keep named action methods on the store and avoid calling raw `set` from components.
3. Select narrowly with hooks such as `useStore((state) => state.field)`.
4. Use `useShallow` when selecting multiple values from a store.
5. Keep domains separate unless the concerns always travel together.
6. Export creators such as `createXStore` or `createXStoreInstance` for unit tests.
7. Avoid `persist` for create drafts. Fetched data should stay in TanStack Query.

## Create Draft Patterns

- **Pattern A**: header-only stores for PO, PQ, SO, SQ, and AR invoice. Product lines stay in React state inside the feature hook.
- **Pattern B**: header + lines stores for GRPO, AP invoice, and AP credit memo.

## Tests

Run the frontend tests from the package root:

```bash
cd frontend
pnpm test
```

Store tests live under `frontend/tests/unit/store/` and import shipped modules via `@/store/...`.
