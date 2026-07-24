# Flow 1 — PQ Draft → RFQ → Convert → PQ + SQ

1. `01-pq-draft-capture` — Is this an IC PQ draft? Flags / already mapped?
2. `02-create-rfq` — Create custom RFQ header + lines from draft
3. `03-notify-seller` — Notify partner company about new RFQ
4. `04-seller-fill-rfq` — Seller fills price/delivery and submits (API)
5. `05-convert-pq-and-sq` — Buyer convert: draft→PQ + partner SQ

Orchestrator auto-runs 01→02→03 on draft save. 04/05 are user-driven APIs.
