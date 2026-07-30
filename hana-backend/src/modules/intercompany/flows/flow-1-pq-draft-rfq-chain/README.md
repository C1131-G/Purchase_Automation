# Flow 1 — Direct PQ → RFQ → Update PQ + SQ

1. `01-pq-draft-capture` — Is this an IC PQ (real document)? Flags / already mapped?
2. `02-create-rfq` — Create custom RFQ header + lines from PQ
3. `03-notify-seller` — Notify partner company about new RFQ
4. `04-seller-fill-rfq` — Seller fills price/delivery and submits (API)
5. `05-convert-pq-and-sq` — Update buyer PQ from RFQ + create partner SQ

Orchestrator auto-runs 01→02→03 on **direct PQ create** (not draft). 04/05 are user-driven (submit auto-converts).
