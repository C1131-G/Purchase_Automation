# Product

## Register

product

## Users

Finance, purchasing, and sales operators at companies running SAP Business One. They work in a daily authenticated portal to create and process purchase/sales documents, and (for intercompany) to track partner RFQs, notifications, and failed sync retries. Context is task-focused, multi-document, often under time pressure between ERP postings.

## Product Purpose

**VEDHA ERP / Vendor Portal** is a modular monorepo (HANA backend + React frontend) that automates purchase document workflows against SAP HANA/Service Layer, with an intercompany (IC) module that chains **real buyer PQ → partner RFQ → PQ/SQ conversion** and **PO → partner A/R Invoice Draft**—without ever failing the primary PO/PQ create path. Success looks like: operators complete IC flows from the portal (not Postman), unread IC activity is visible in the shell, and failed partner posts are recoverable via retry—not silent data loss.

## Brand Personality

Professional, dense, trustworthy. Voice is operational and precise (labels and statuses over marketing copy). Personality: **calm · reliable · ERP-native**.

## Anti-references

- Consumer SaaS “cream/sand” landing aesthetics or hero-metric marketing dashboards
- Over-decorated cards, glassmorphism, gradient text, numbered marketing sections
- Invented form/table controls that diverge from the existing Purchase/Sales table vocabulary
- Dark “hacker terminal” or neon developer themes

## Design Principles

1. **Design serves the task** — tables, filters, and actions match Sales/Purchase list pages; no parallel UI system for IC.
2. **Server data stays server data** — TanStack Query for lists and unread counts; Zustand only for client table chrome.
3. **Session company is truth** — notifications and retries are always scoped to the logged-in SAP company.
4. **IC never blocks primary docs** — failures surface as notifications/retry queue, not create failures.
5. **Familiar density** — operators already trust Sales Quotation grids; IC notifications earn the same density and affordances.

## Accessibility & Inclusion

Target WCAG 2.1 AA for interactive controls (contrast, focus-visible, named buttons). Respect `prefers-reduced-motion` for any new motion. Unread badge and table actions must have clear accessible names (e.g. “Intercompany notifications, N unread”). Keyboard paths for primary actions (mark read, open document, retry).
