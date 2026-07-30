# Flow 2 — PO → AR Invoice

1. `01-po-capture` — Non-draft PO, IC vendor, flags, idempotent map check
2. `02-build-ar-invoice-draft` — Pure payload (customer, tax, branch, remarks)
3. `03-post-ar-invoice-draft` — Partner Service Layer create **AR Invoice** (`POST /Invoices`)
4. `04-map-and-notify` — Map PO→AR_INVOICE, history, notify

Orchestrator runs 01→02→03→04 after portal PO create (IC failure never fails PO).
