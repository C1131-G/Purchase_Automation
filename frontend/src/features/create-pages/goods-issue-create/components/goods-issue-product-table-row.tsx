import React from "react";
import { Search, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { SuggestionList } from "@/features/create-pages/create-shared/components/core/suggestion-list";
import { ProductUomModal } from "@/features/create-pages/create-shared/components/modals/product-uom-modal";
import { ProductWarehouseStockModal } from "@/features/create-pages/create-shared/components/modals/product-warehouse-stock-modal";
import { LookupPopup } from "@/components/lookup/lookup-popup";
import { createSharedQueries } from "@/features/create-pages/create-shared/api/create-shared.queries";
import { incomingPaymentQueries } from "@/features/table-pages/incoming-payment/api/incoming-payment.queries";
import type { CreateLookupOption } from "@/features/create-pages/create-shared/utils/create-order.types";
import type { GoodsIssueRow } from "../types/goods-issue.types";

interface GoodsIssueProductTableRowProps {
  row: GoodsIssueRow;
  openProductPopup: (rowId: string | null) => void;
  updateProductRow: (id: string, patch: Partial<GoodsIssueRow>) => void;
  removeProductRow: (id: string) => void;
  prefetchProducts: (warehouseCode?: string) => void;
  warehouses: CreateLookupOption[];
  warehousesLoading: boolean;
  disableInputs?: boolean;
  uoms?: CreateLookupOption[];
  priceListCode?: string | undefined;
}

// ─── FixedDropdown: Renders a suggestion dropdown anchored to an input ref using fixed positioning ─

interface FixedDropdownProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  visible: boolean;
}

function FixedDropdown({ anchorRef, children, visible }: FixedDropdownProps) {
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useLayoutEffect(() => {
    if (!visible || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 260),
      zIndex: 9999,
    });
  }, [visible, anchorRef]);

  if (!visible) return null;

  return <div style={style}>{children}</div>;
}

export function GoodsIssueProductTableRow({
  row,
  openProductPopup,
  updateProductRow,
  removeProductRow,
  prefetchProducts,
  warehouses,
  warehousesLoading,
  disableInputs = false,
  uoms = [],
  priceListCode,
}: GoodsIssueProductTableRowProps) {
  // Product Code state
  const [productInput, setProductInput] = React.useState(row.itemNo || "");
  const [productFocused, setProductFocused] = React.useState(false);
  const productInputRef = React.useRef<HTMLInputElement>(null);

  // Product Description state
  const [descriptionInput, setDescriptionInput] = React.useState(row.itemDescription || "");
  const [descriptionFocused, setDescriptionFocused] = React.useState(false);
  const descriptionInputRef = React.useRef<HTMLInputElement>(null);

  // Warehouse state
  const [warehouseInput, setWarehouseInput] = React.useState(row.whse || "");
  const [warehouseFocused, setWarehouseFocused] = React.useState(false);
  const [warehouseLookupOpen, setWarehouseLookupOpen] = React.useState(false);
  const warehouseInputRef = React.useRef<HTMLInputElement>(null);

  // Account Code state
  const [accountInput, setAccountInput] = React.useState(row.accountCode || "");
  const [accountFocused, setAccountFocused] = React.useState(false);
  const [accountLookupOpen, setAccountLookupOpen] = React.useState(false);
  const accountInputRef = React.useRef<HTMLInputElement>(null);

  // Bin Location state
  const [binInput, setBinInput] = React.useState(
    row.binLocationAllocation ? String(row.binLocationAllocation) : "",
  );
  const [binFocused, setBinFocused] = React.useState(false);
  const [binLookupOpen, setBinLookupOpen] = React.useState(false);
  const binInputRef = React.useRef<HTMLInputElement>(null);

  // UOM Code state
  const [uomInput, setUomInput] = React.useState(row.uomCode || "");
  const [uomLookupOpen, setUomLookupOpen] = React.useState(false);

  // UOM Name state
  const [uomNameInput, setUomNameInput] = React.useState(row.uomName || "");
  const [uomNameLookupOpen, setUomNameLookupOpen] = React.useState(false);

  const blurTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Queries
  const stocksQuery = useQuery({
    ...createSharedQueries.productWarehouseStocks(row.itemNo),
    enabled: Boolean(row.itemNo),
  });
  const stocks = stocksQuery.data ?? [];

  const accountQuery = useQuery({
    ...incomingPaymentQueries.accountSuggestions(accountInput || undefined, 100),
    enabled: accountFocused || accountLookupOpen,
  });
  const accountSuggestions = React.useMemo(() => {
    return (accountQuery.data?.data ?? []).map((acc) => ({
      code: acc.GLAccount,
      name: acc.Account,
    }));
  }, [accountQuery.data]);

  const selectedWarehouse = React.useMemo(() => {
    return warehouses.find((w) => w.code === row.whse);
  }, [warehouses, row.whse]);
  const enableBinLocations = (selectedWarehouse as any)?.enableBinLocations === true;

  const binsQuery = useQuery({
    ...createSharedQueries.warehouseBins(row.whse || ""),
    enabled: enableBinLocations && Boolean(row.whse) && (binFocused || binLookupOpen),
  });
  const binSuggestions = React.useMemo(() => binsQuery.data ?? [], [binsQuery.data]);

  const productsSuggestionsQuery = useQuery({
    ...createSharedQueries.products(
      undefined,
      productFocused ? productInput : descriptionFocused ? descriptionInput : undefined,
      50,
      undefined,
      priceListCode,
    ),
    enabled: productFocused || descriptionFocused,
  });
  const productSuggestions = (productsSuggestionsQuery.data ?? []).map((p) => ({
    code: p.code,
    name: p.name,
    uomCode: p.uomCode,
    uomName: p.uomName,
    price: p.price,
  }));

  const productUoms = React.useMemo(() => {
    return uoms.map((u) => ({
      code: u.code,
      name: u.name,
    }));
  }, [uoms]);

  React.useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    setProductInput(row.itemNo || "");
    setDescriptionInput(row.itemDescription || "");
    setWarehouseInput(row.whse || "");
    setUomInput(row.uomCode || "");
    setUomNameInput(row.uomName || "");
    setAccountInput(row.accountCode || "");
    setBinInput(row.binLocationAllocation ? String(row.binLocationAllocation) : "");
  }, [row]);

  const selectProduct = (item: {
    code: string;
    name: string;
    uomCode?: string;
    uomName?: string;
    price?: number;
  }) => {
    setProductInput(item.code);
    setDescriptionInput(item.name);
    setUomInput(item.uomCode ?? "");
    setUomNameInput(item.uomName ?? "");
    const qty = row.quantity || 1;
    const price = item.price ?? 0;
    const total = qty * price;
    updateProductRow(row.id, {
      itemNo: item.code,
      itemDescription: item.name,
      uomCode: item.uomCode ?? "",
      uomName: item.uomName ?? "",
      unitPrice: String(price),
      total: total > 0 ? total.toFixed(2) : "0.00",
    });
    setProductFocused(false);
    setDescriptionFocused(false);
  };

  const selectWarehouse = (item: CreateLookupOption) => {
    setWarehouseInput(item.code);
    updateProductRow(row.id, { whse: item.code });
    setWarehouseFocused(false);
  };

  const selectAccount = (item: { code: string; name: string }) => {
    setAccountInput(item.code);
    updateProductRow(row.id, { accountCode: item.code });
    setAccountFocused(false);
  };

  const selectUom = (item: CreateLookupOption) => {
    setUomInput(item.code);
    setUomNameInput(item.name);
    updateProductRow(row.id, { uomCode: item.code, uomName: item.name });
  };

  const handlePriceQuantityChange = (field: "quantity" | "unitPrice", value: string | number) => {
    const patch: Partial<GoodsIssueRow> = { [field]: value };
    const newQty = field === "quantity" ? Number(value) : row.quantity;
    const newPriceStr = field === "unitPrice" ? String(value) : String(row.unitPrice);
    const newPrice = parseFloat(newPriceStr.replace(/[^0-9.]/g, "")) || 0;
    const total = newQty * newPrice;
    patch.total = total > 0 ? total.toFixed(2) : "0.00";
    updateProductRow(row.id, patch);
  };

  return (
    <tr className="hover:bg-zinc-50/50 transition-colors">
      {/* Item No */}
      <td className="px-2 py-2 relative">
        <div className="relative">
          <input
            ref={productInputRef}
            type="text"
            value={productInput}
            disabled={disableInputs}
            onChange={(e) => {
              setProductInput(e.target.value);
              setProductFocused(true);
            }}
            onFocus={() => {
              setProductFocused(true);
              prefetchProducts(row.whse);
            }}
            onBlur={() => {
              blurTimerRef.current = setTimeout(() => setProductFocused(false), 150);
            }}
            placeholder="Item No"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 pr-8 text-xs text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            disabled={disableInputs}
            onClick={() => openProductPopup(row.id)}
            className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <Search className="h-3 w-3" />
          </button>
          <FixedDropdown
            anchorRef={productInputRef as React.RefObject<HTMLElement>}
            visible={productFocused && productSuggestions.length > 0}
          >
            <SuggestionList
              items={productSuggestions}
              onSelect={(item) => selectProduct(item as any)}
              query={productInput}
              showCode
            />
          </FixedDropdown>
        </div>
      </td>

      {/* Item Description */}
      <td className="px-2 py-2 relative">
        <div className="relative">
          <input
            ref={descriptionInputRef}
            type="text"
            value={descriptionInput}
            disabled={disableInputs}
            onChange={(e) => {
              setDescriptionInput(e.target.value);
              setDescriptionFocused(true);
            }}
            onFocus={() => {
              setDescriptionFocused(true);
              prefetchProducts(row.whse);
            }}
            onBlur={() => {
              blurTimerRef.current = setTimeout(() => setDescriptionFocused(false), 150);
            }}
            placeholder="Item Description"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 pr-8 text-xs text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            disabled={disableInputs}
            onClick={() => openProductPopup(row.id)}
            className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <Search className="h-3 w-3" />
          </button>
          <FixedDropdown
            anchorRef={descriptionInputRef as React.RefObject<HTMLElement>}
            visible={descriptionFocused && productSuggestions.length > 0}
          >
            <SuggestionList
              items={productSuggestions.map((p) => ({
                uomCode: p.uomCode,
                uomName: p.uomName,
                price: p.price,
                code: p.name,
                name: p.code,
              }))}
              onSelect={(item) => selectProduct(item as any)}
              query={descriptionInput}
              showCode
            />
          </FixedDropdown>
        </div>
      </td>

      {/* Quantity */}
      <td className="px-2 py-2">
        <input
          type="number"
          min={1}
          value={row.quantity || ""}
          disabled={disableInputs}
          onChange={(e) => handlePriceQuantityChange("quantity", e.target.value)}
          className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
        />
      </td>

      {/* Unit Price */}
      <td className="px-2 py-2">
        <input
          type="text"
          value={row.unitPrice || ""}
          disabled={disableInputs}
          onChange={(e) => handlePriceQuantityChange("unitPrice", e.target.value)}
          className="h-9 w-full rounded-lg border border-transparent bg-zinc-50 px-2 text-xs text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          placeholder="0.00"
        />
      </td>

      {/* Warehouse */}
      <td className="relative px-2 py-2">
        <div className="relative">
          <input
            ref={warehouseInputRef}
            type="text"
            value={warehouseInput}
            disabled={disableInputs || warehousesLoading}
            onChange={(e) => {
              setWarehouseInput(e.target.value);
              setWarehouseFocused(true);
            }}
            onFocus={() => setWarehouseFocused(true)}
            onBlur={() => {
              blurTimerRef.current = setTimeout(() => setWarehouseFocused(false), 150);
            }}
            placeholder="Warehouse"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 pr-8 text-xs text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            disabled={disableInputs}
            onClick={() => setWarehouseLookupOpen(true)}
            className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <Search className="h-3 w-3" />
          </button>
          <FixedDropdown
            anchorRef={warehouseInputRef as React.RefObject<HTMLElement>}
            visible={warehouseFocused}
          >
            <SuggestionList
              items={warehouses.filter(
                (w) =>
                  w.code.toLowerCase().includes(warehouseInput.toLowerCase()) ||
                  w.name.toLowerCase().includes(warehouseInput.toLowerCase()),
              )}
              onSelect={selectWarehouse}
              query={warehouseInput}
            />
          </FixedDropdown>
        </div>
        <ProductWarehouseStockModal
          open={warehouseLookupOpen}
          product={{ code: row.itemNo, name: row.itemDescription }}
          stocks={stocks}
          error={stocksQuery.isError ? (stocksQuery.error as Error).message : null}
          loading={stocksQuery.isLoading}
          onClose={() => setWarehouseLookupOpen(false)}
          onSelect={(item) => {
            selectWarehouse(item);
            setWarehouseLookupOpen(false);
          }}
        />
      </td>

      {/* Bin Location */}
      <td className="relative px-2 py-2 min-w-0">
        {enableBinLocations ? (
          <>
            <div className="relative">
              <input
                ref={binInputRef}
                type="text"
                value={binInput}
                disabled={disableInputs}
                onChange={(e) => {
                  setBinInput(e.target.value);
                  setBinFocused(true);
                }}
                onFocus={() => setBinFocused(true)}
                onBlur={() => {
                  blurTimerRef.current = setTimeout(() => setBinFocused(false), 150);
                }}
                placeholder="Select Bin"
                className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 pr-8 text-xs text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 cursor-pointer"
              />
              <button
                type="button"
                disabled={disableInputs}
                onClick={() => setBinLookupOpen(true)}
                className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
              >
                <Search className="h-3 w-3" />
              </button>
              <FixedDropdown
                anchorRef={binInputRef as React.RefObject<HTMLElement>}
                visible={binFocused && binSuggestions.length > 0}
              >
                <SuggestionList
                  items={binSuggestions.filter(
                    (b) =>
                      b.code.toLowerCase().includes(binInput.toLowerCase()) ||
                      b.name.toLowerCase().includes(binInput.toLowerCase()),
                  )}
                  onSelect={(item) => {
                    setBinInput(item.code);
                    updateProductRow(row.id, { binLocationAllocation: Number(item.code) });
                    setBinFocused(false);
                  }}
                  query={binInput}
                />
              </FixedDropdown>
            </div>
            <LookupPopup
              open={binLookupOpen}
              mode="warehouse"
              search={binInput}
              results={binSuggestions}
              loading={binsQuery.isLoading}
              error={binsQuery.isError ? (binsQuery.error as Error).message : null}
              title="Search Bin Locations"
              searchPlaceholder="Search bin code or name..."
              onSearchChange={(val) => {
                setBinInput(val);
                setBinFocused(true);
              }}
              onClose={() => setBinLookupOpen(false)}
              onSelect={(item) => {
                setBinInput(item.code);
                updateProductRow(row.id, { binLocationAllocation: Number(item.code) });
                setBinLookupOpen(false);
              }}
            />
          </>
        ) : (
          <input
            type="text"
            value=""
            disabled={true}
            className="h-9 w-full rounded-lg border border-transparent bg-zinc-100 px-2 text-xs text-zinc-400 outline-none cursor-not-allowed"
            placeholder="N/A"
          />
        )}
      </td>

      {/* UoM Code */}
      <td className="px-2 py-2">
        <div className="relative">
          <input
            type="text"
            value={uomInput}
            readOnly
            disabled={disableInputs}
            onClick={() => setUomLookupOpen(true)}
            placeholder="UoM"
            className="h-9 w-full cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 pr-8 text-xs text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            disabled={disableInputs}
            onClick={() => setUomLookupOpen(true)}
            className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <Search className="h-3 w-3" />
          </button>
        </div>
        <ProductUomModal
          open={uomLookupOpen}
          product={{ code: row.itemNo, name: row.itemDescription }}
          uoms={productUoms}
          onClose={() => setUomLookupOpen(false)}
          onSelect={(item) => {
            selectUom(item);
            setUomLookupOpen(false);
          }}
        />
      </td>

      {/* UoM Name */}
      <td className="px-2 py-2">
        <div className="relative">
          <input
            type="text"
            value={uomNameInput}
            readOnly
            disabled={disableInputs}
            onClick={() => setUomNameLookupOpen(true)}
            placeholder="UoM Name"
            className="h-9 w-full cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-2 pr-8 text-xs text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            disabled={disableInputs}
            onClick={() => setUomNameLookupOpen(true)}
            className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <Search className="h-3 w-3" />
          </button>
        </div>
        <ProductUomModal
          open={uomNameLookupOpen}
          product={{ code: row.itemNo, name: row.itemDescription }}
          uoms={productUoms}
          onClose={() => setUomNameLookupOpen(false)}
          onSelect={(item) => {
            selectUom(item);
            setUomNameLookupOpen(false);
          }}
        />
      </td>

      {/* G/L Account */}
      <td className="relative px-2 py-2">
        <div className="relative">
          <input
            ref={accountInputRef}
            type="text"
            value={accountInput}
            disabled={disableInputs}
            onChange={(e) => {
              setAccountInput(e.target.value);
              setAccountFocused(true);
            }}
            onFocus={() => setAccountFocused(true)}
            onBlur={() => {
              blurTimerRef.current = setTimeout(() => setAccountFocused(false), 150);
            }}
            placeholder="G/L Account"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 pr-8 text-xs text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="button"
            disabled={disableInputs}
            onClick={() => setAccountLookupOpen(true)}
            className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
          >
            <Search className="h-3 w-3" />
          </button>
          <FixedDropdown
            anchorRef={accountInputRef as React.RefObject<HTMLElement>}
            visible={accountFocused && accountSuggestions.length > 0}
          >
            <SuggestionList
              items={accountSuggestions}
              onSelect={selectAccount}
              query={accountInput}
              showCode
              codeLabel="GLAccount"
              nameLabel="Account"
            />
          </FixedDropdown>
        </div>
        <LookupPopup
          open={accountLookupOpen}
          mode="warehouse"
          search={accountInput}
          results={accountSuggestions}
          loading={accountQuery.isLoading}
          error={accountQuery.isError ? (accountQuery.error as Error).message : null}
          title="Search G/L Accounts"
          searchPlaceholder="Search account code or name..."
          codeLabel="GLAccount"
          nameLabel="Account"
          onSearchChange={(val) => {
            setAccountInput(val);
            setAccountFocused(true);
          }}
          onClose={() => setAccountLookupOpen(false)}
          onSelect={(item) => {
            selectAccount(item);
            setAccountLookupOpen(false);
          }}
        />
      </td>

      {/* Actions */}
      <td className="px-2 py-2 text-right">
        <button
          type="button"
          disabled={disableInputs}
          onClick={() => removeProductRow(row.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600 transition"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
