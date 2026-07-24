import { useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { masterDataAPI } from "@/features/create-pages/create-shared/api/master-data.service";
import type { ProductLookupItem } from "@/features/create-pages/create-shared/api/create-shared.types";
import type { ProductRow } from "@/features/create-pages/create-shared/utils/create-order.types";
import {
  unwrapMasterData,
  mapProductLookup,
  mapProductWarehouseStock,
} from "@/features/create-pages/create-shared/api/create-shared.mapper";

interface UseExcelImportProps {
  productRows: ProductRow[];
  setProductRows: (rows: ProductRow[] | ((prev: ProductRow[]) => ProductRow[])) => void;
  defaultWarehouseCode: string;
  vendorName: string;
  vendorCode: string;
  transactionType: "sales" | "purchase";
  onSearchProducts: () => void;
  closeMenu: () => void;
}

interface UploadedRow {
  itemCode: string;
  quantity: number;
  unitPrice?: number | undefined;
  discountPercent?: number | undefined;
  warehouseCode?: string | undefined;
}

function cleanValue(val: string): string {
  let cleaned = (val || "").trim();
  // Strip Excel formula wrapper if present: ="value" or = "value"
  if (cleaned.startsWith("=") && cleaned.includes('"')) {
    const match = cleaned.match(/="([^"]*)"/);
    if (match) {
      cleaned = match[1] ?? "";
    }
  }
  return cleaned.replace(/^["']|["']$/g, "").trim();
}

// Parses a single line of CSV/TSV correctly, taking into account quoted fields
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result.map((val) => cleanValue(val));
}

export function useExcelImport({
  productRows: _productRows,
  setProductRows,
  defaultWarehouseCode,
  vendorName,
  vendorCode,
  transactionType,
  onSearchProducts,
  closeMenu,
}: UseExcelImportProps) {
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  const handleDownloadTemplate = () => {
    try {
      const headers = ["Item Code", "Quantity", "Discount %", "Warehouse Code"];

      // Format Item Codes as ="value" to force Excel to treat them as text
      const sampleRows = [
        [`="A00001"`, "12", "5", defaultWarehouseCode || "W001"],
        [`="A00002"`, "25", "0", defaultWarehouseCode || "W001"],
      ];

      const csvRows = [headers.join(","), ...sampleRows.map((row) => row.join(","))];
      const csvContent = csvRows.join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "erp_portal_product_template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      closeMenu();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUploadClick = (fileInputRef: RefObject<HTMLInputElement | null>) => {
    // Check if partner is selected
    const partnerName = vendorName.trim();
    const partnerCode = vendorCode.trim();

    if (!partnerName || !partnerCode) {
      onSearchProducts(); // Trigger native validation popup
      closeMenu();
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "xls" && extension !== "xlsx" && extension !== "csv" && extension !== "xml") {
      e.target.value = "";
      return;
    }

    setIsSimulatingUpload(true);
    closeMenu();

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;

        // Binary Excel file detection (.xlsx)
        if (text.startsWith("PK\x03\x04") || text.includes("\x00")) {
          setValidationErrors([
            "Binary Excel file detected (.xlsx). Direct client-side parsing of zip-compressed binary Excel files is not supported.",
            "Please open this file in Excel, choose 'Save As', select 'CSV (Comma delimited) (*.csv)' or 'Text (Tab delimited) (*.txt)', and upload the saved file.",
          ]);
          setIsErrorModalOpen(true);
          setIsSimulatingUpload(false);
          e.target.value = "";
          return;
        }

        let headers: string[] = [];
        let dataRows: string[][] = [];

        // Check if file is HTML/XML table format
        const isHtml =
          text.includes("<table") ||
          text.includes("<html") ||
          text.includes("<xml") ||
          text.includes("<Workbook");

        if (isHtml) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/html");
          const table = doc.querySelector("table");
          if (!table) {
            throw new Error("Could not find a valid table in the uploaded spreadsheet.");
          }
          const trs = Array.from(table.querySelectorAll("tr"));
          if (trs.length === 0) {
            // Check if it's XML Spreadsheet 2003 format
            const xmlRows = Array.from(table.querySelectorAll("row"));
            const firstXmlRow = xmlRows[0];
            if (!firstXmlRow) {
              throw new Error("The uploaded XML spreadsheet has no valid rows.");
            }
            headers = Array.from(firstXmlRow.querySelectorAll("cell")).map((el) =>
              cleanValue(el.textContent || ""),
            );
            dataRows = xmlRows
              .slice(1)
              .map((row) =>
                Array.from(row.querySelectorAll("cell")).map((cell) =>
                  cleanValue(cell.textContent || ""),
                ),
              );
          } else {
            const firstTr = trs[0];
            if (!firstTr) {
              throw new Error("The uploaded HTML table has no valid header row.");
            }
            headers = Array.from(firstTr.querySelectorAll("th, td")).map((el) =>
              cleanValue(el.textContent || ""),
            );
            dataRows = trs
              .slice(1)
              .map((tr) =>
                Array.from(tr.querySelectorAll("td")).map((td) => cleanValue(td.textContent || "")),
              );
          }
        } else {
          const lines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

          const firstLine = lines[0];
          if (!firstLine) {
            throw new Error("The uploaded file is empty.");
          }

          const delimiter = firstLine.includes("\t") ? "\t" : ",";
          headers = parseCSVLine(firstLine, delimiter);
          dataRows = lines.slice(1).map((line) => parseCSVLine(line, delimiter));
        }

        // Header mapping
        const colIndices: Partial<Record<keyof UploadedRow, number>> = {};
        const headerMapping: Record<string, keyof UploadedRow> = {
          "item code": "itemCode",
          itemcode: "itemCode",
          item_code: "itemCode",
          "product code": "itemCode",
          productcode: "itemCode",
          code: "itemCode",

          quantity: "quantity",
          qty: "quantity",

          "unit price": "unitPrice",
          unitprice: "unitPrice",
          price: "unitPrice",
          rate: "unitPrice",

          "discount %": "discountPercent",
          "discount percent": "discountPercent",
          discountpercent: "discountPercent",
          discount: "discountPercent",
          "disc %": "discountPercent",
          disc: "discountPercent",

          "warehouse code": "warehouseCode",
          warehousecode: "warehouseCode",
          "whs code": "warehouseCode",
          whscode: "warehouseCode",
          warehouse: "warehouseCode",
        };

        headers.forEach((header, index) => {
          const normHeader = header
            .toLowerCase()
            .replace(/[^a-z0-9%]/g, " ")
            .trim()
            .replace(/\s+/g, " ");
          const mapped = headerMapping[normHeader] || headerMapping[normHeader.replace(/\s+/g, "")];
          if (mapped) {
            colIndices[mapped] = index;
          }
        });

        if (colIndices.itemCode === undefined) {
          throw new Error("Could not find 'Item Code' column in the uploaded file.");
        }
        if (colIndices.quantity === undefined) {
          throw new Error("Could not find 'Quantity' column in the uploaded file.");
        }

        const parsedRows: UploadedRow[] = [];
        const parseErrors: string[] = [];

        dataRows.forEach((rowFields, rowIndex) => {
          const rowNum = rowIndex + 2; // +1 for 0-index offset, +1 for header line

          // Skip completely empty fields or blank rows (where all columns are empty/whitespace)
          const isRowBlank = rowFields.every((field) => !field || !field.trim());
          if (isRowBlank) {
            return;
          }

          const itemCodeRaw =
            colIndices.itemCode !== undefined ? rowFields[colIndices.itemCode] : "";
          const itemCode = (itemCodeRaw || "").trim();
          if (!itemCode) {
            parseErrors.push(`Row ${rowNum}: Item Code is empty.`);
            return;
          }

          const quantityRaw =
            colIndices.quantity !== undefined ? rowFields[colIndices.quantity] : "";
          const quantity = parseFloat(quantityRaw || "");
          if (isNaN(quantity) || quantity <= 0) {
            parseErrors.push(
              `Row ${rowNum}: Quantity must be a positive number (found: "${quantityRaw || ""}").`,
            );
            return;
          }

          let unitPrice: number | undefined;
          if (colIndices.unitPrice !== undefined) {
            const priceRaw = rowFields[colIndices.unitPrice];
            if (priceRaw !== undefined && priceRaw.trim() !== "") {
              const parsedPrice = parseFloat(priceRaw);
              if (isNaN(parsedPrice) || parsedPrice < 0) {
                parseErrors.push(
                  `Row ${rowNum}: Unit Price must be a non-negative number (found: "${priceRaw}").`,
                );
              } else {
                unitPrice = parsedPrice;
              }
            }
          }

          let discountPercent: number | undefined;
          if (colIndices.discountPercent !== undefined) {
            const discountRaw = rowFields[colIndices.discountPercent];
            if (discountRaw !== undefined && discountRaw.trim() !== "") {
              const parsedDiscount = parseFloat(discountRaw);
              if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
                parseErrors.push(
                  `Row ${rowNum}: Discount % must be between 0 and 100 (found: "${discountRaw}").`,
                );
              } else {
                discountPercent = parsedDiscount;
              }
            }
          }

          const warehouseCode =
            colIndices.warehouseCode !== undefined
              ? (rowFields[colIndices.warehouseCode] || "").trim()
              : "";

          parsedRows.push({
            itemCode,
            quantity,
            unitPrice,
            discountPercent,
            warehouseCode,
          });
        });

        if (parseErrors.length > 0) {
          setValidationErrors(parseErrors);
          setIsErrorModalOpen(true);
          setIsSimulatingUpload(false);
          e.target.value = "";
          return;
        }

        if (parsedRows.length === 0) {
          throw new Error("No data rows found in the uploaded file.");
        }

        // Fetch products and validate item codes against SAP catalog
        const uniqueItemCodes = Array.from(new Set(parsedRows.map((r) => r.itemCode)));
        const productDetailsMap: Record<string, ProductLookupItem> = {};
        const productStocksMap: Record<string, Record<string, number>> = {};
        const resolutionErrors: string[] = [];

        // Helper to chunk unique codes to prevent overloading browser connection pool
        const chunkSize = 10;
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueItemCodes.length; i += chunkSize) {
          chunks.push(uniqueItemCodes.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
          await Promise.all(
            chunk.map(async (code) => {
              try {
                const res = await masterDataAPI.getProducts({
                  search: code,
                  type: transactionType,
                });
                const products = unwrapMasterData(res).map(mapProductLookup);
                const match = products.find(
                  (p) => p.code.trim().toLowerCase() === code.trim().toLowerCase(),
                );
                if (!match) {
                  resolutionErrors.push(
                    `Item Code "${code}" was not found in the ERP product catalog.`,
                  );
                  return;
                }
                productDetailsMap[code] = match;

                // Fetch stock for this product across warehouses
                const stockRes = await masterDataAPI.getProductWarehouseStocks(match.code);
                const stocks = unwrapMasterData(stockRes).map(mapProductWarehouseStock);
                const stockMap: Record<string, number> = {};
                stocks.forEach((s) => {
                  stockMap[s.code.trim()] = s.stock;
                });
                productStocksMap[code] = stockMap;
              } catch (err: any) {
                resolutionErrors.push(
                  `Failed to verify Item Code "${code}": ${err?.message || err || "Unknown error"}`,
                );
              }
            }),
          );
        }

        if (resolutionErrors.length > 0) {
          setValidationErrors(resolutionErrors);
          setIsErrorModalOpen(true);
          setIsSimulatingUpload(false);
          e.target.value = "";
          return;
        }

        // Map resolved rows to ProductRow objects
        const finalNewRows: ProductRow[] = parsedRows.map((row) => {
          const catalogProduct = productDetailsMap[row.itemCode];
          if (!catalogProduct) {
            throw new Error(`Catalog product not found for item code: ${row.itemCode}`);
          }
          const targetWarehouse = row.warehouseCode || defaultWarehouseCode || "";
          const stocksMap = productStocksMap[row.itemCode] || {};
          const stock = stocksMap[targetWarehouse] ?? 0;

          const price = row.unitPrice !== undefined ? row.unitPrice : catalogProduct.price;
          const discountPercent = row.discountPercent !== undefined ? row.discountPercent : 0;
          const discountAmount = price * row.quantity * (discountPercent / 100);

          const uomCode =
            transactionType === "purchase"
              ? catalogProduct.purchaseUomCode || catalogProduct.uomCode
              : catalogProduct.uomCode || catalogProduct.purchaseUomCode;
          const uomEntry =
            transactionType === "purchase"
              ? (catalogProduct.purchaseUomEntry ?? catalogProduct.uomEntry)
              : (catalogProduct.uomEntry ?? catalogProduct.purchaseUomEntry);

          return {
            id: `row-imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productCode: catalogProduct.code,
            productName: catalogProduct.name,
            quantity: row.quantity,
            price: price,
            discountPercent: discountPercent,
            discountAmount: discountAmount,
            warehouseCode: targetWarehouse,
            comment: "",
            stock: stock,
            taxRate: catalogProduct.taxRate,
            vatGroup: catalogProduct.vatGroup,
            currency: catalogProduct.currency,
            uomCode: uomCode || "",
            uomEntry: uomEntry || 0,
            selected: false,
          };
        });

        // Append rows to current document
        setProductRows((prev) => [...prev, ...finalNewRows]);
      } catch {
      } finally {
        setIsSimulatingUpload(false);
        e.target.value = "";
      }
    };

    reader.onerror = () => {
      setIsSimulatingUpload(false);
      e.target.value = "";
    };

    reader.readAsText(file);
  };

  return {
    isSimulatingUpload,
    validationErrors,
    isErrorModalOpen,
    setIsErrorModalOpen,
    handleDownloadTemplate,
    handleUploadClick,
    handleFileChange,
  };
}
