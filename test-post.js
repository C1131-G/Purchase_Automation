fetch("http://localhost:4000/api/v1/goods-receipts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    docDate: "2026-07-09",
    lines: [{ itemCode: "A00001", quantity: 1, unitPrice: 10, warehouseCode: "L401" }],
  }),
})
  .then((r) => r.json())
  .then(console.log)
  .catch(console.error);
