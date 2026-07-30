# Frontend Zustand Stores

Client-only state for the Vendor Portal. **Server data belongs in TanStack Query**, not in these stores.

## Layout

| Domain         | Path                   | Responsibility                                                        |
| -------------- | ---------------------- | --------------------------------------------------------------------- |
| Auth           | `auth/`                | Session flags, current user, login/logout UI state                    |
| Sidebar / PWA  | `sidebar/`, `pwa/`     | Shell chrome and install prompt state                                 |
| Table          | `table/table.store.ts` | Multi-table filters, pagination, order, sort, visibility by `tableId` |
| Create drafts  | `create/`              | Ephemeral document headers and, where required, line items            |
| Shared helpers | `lib/`                 | `createAppStore`, `Updater`, and related store utilities              |

Legacy table files such as `table-filter.store.ts`, `table-order.store.ts`, and `table-pagination.store.ts` are **re-export shims** over the composed table store. Prefer the public hooks re-exported from those paths or the composed store directly.

## Rules

1. Create stores with the curried **`createAppStore`** helper (`lib/create-store.ts`) — DEV-only devtools, optional immer.
2. Prefer **named action methods** on the store; avoid calling raw `set` from components.
3. Select narrowly: `useStore((state) => state.field)`.
4. Use **`useShallow`** when selecting multiple values as an object.
5. Keep domains separate unless the concerns always travel together.
6. Export creators such as `createXStore` / `createXStoreInstance` for isolated unit tests.
7. **Avoid `persist` for create drafts.** Fetched lists and detail stay in TanStack Query — do not mirror them into Zustand.
8. Table UI state is one multi-table registry keyed by `tableId`.

## Create Draft Patterns

Document create drafts use the factory in `create/document-draft.factory.ts`.

| Pattern                | Stores                                                                  | Documents (examples)             |
| ---------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| **A** — header only    | Header store; product lines stay in React state inside the feature hook | PO, PQ, SO, SQ, AR invoice       |
| **B** — header + lines | Header and line stores                                                  | GRPO, AP invoice, AP credit memo |

## What Not To Store

- API list/detail responses (use React Query keys and cache)
- IC notifications, RFQs, retries, unread counts (use `features/intercompany` queries)
- Derived values that can be computed from existing store fields or props

## Tests

```bash
# from frontend package root
pnpm test
```

Store tests live under `frontend/tests/unit/store/` and import shipped modules via `@/store/...`.

| Test file                        | Focus                   |
| -------------------------------- | ----------------------- |
| `create-store.test.ts`           | `createAppStore` helper |
| `document-draft.factory.test.ts` | Create-draft factory    |
| `table.store.test.ts`            | Multi-table registry    |

## Related

- Frontend overview: [`../../README.md`](../../README.md)
- Product rules for server vs client state: [`../../../PRODUCT.md`](../../../PRODUCT.md)
