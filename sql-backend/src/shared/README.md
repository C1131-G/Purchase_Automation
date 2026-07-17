# `shared/` — small reusable pieces

Plain language: tiny helpers shared by more than one module so feature folders stay thinner.

## When you open it

You see the same HTTP handler pattern repeated (document export or quick lookup) and want the shared implementation.

## Main pieces

| Name | Simple role |
| --- | --- |
| `route-handlers/create-document-export-handler.ts` | Shared handler factory for document export routes |
| `route-handlers/quick-lookup.handler.ts` | Shared quick-lookup handler pattern |

## How it connects

- **Called by:** document modules’ routes
- **Calls:** [services/export/](../services/README.md) and module-specific loaders where needed
- **Keep it small:** prefer feature code in [modules/](../modules/README.md) unless two+ features need the same handler

## How to navigate

1. Export URL behavior → `create-document-export-handler.ts`
2. Quick lookup endpoints → `quick-lookup.handler.ts`

## Parent

[← src README](../README.md) · [Package README](../../README.md)
