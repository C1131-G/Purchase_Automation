# `services/` — shared backend helpers

Plain language: helpers used by **many modules** — document links, exports, dashboard math, discounts, doc-number lookup. Feature-specific SQL stays in module repositories.

## When you open it

Export format is wrong, open-quantity / base-document links break, dashboard numbers need a shared fix, or you need a utility used by more than one feature.

## Main pieces

| Name | Simple role |
| --- | --- |
| `document-link/` | Base documents, open lines/qty, parent status updates |
| `export/` | PDF / Excel / Word generation |
| `dashboard/` | Shared dashboard calculations and views |
| `discount.util.ts` | Discount math |
| `docnum-lookup.util.ts` | Document number lookup helpers |
| `currency.util.ts` | Currency helpers |

## How it connects

- **Called by:** [modules/](../modules/README.md) services / mutations
- **May call:** [db/](../db/README.md) through patterns used by document-link queries
- **Not** a replacement for `*.repository.ts` inside a feature

## How to navigate

1. Copy-to / open-qty / parent status → `document-link/`
2. File download formats → `export/`
3. Dashboard shared math → `dashboard/`

## Parent

[← src README](../README.md) · [Package README](../../README.md)
