import * as XLSX from "@e965/xlsx";
import type { ImportSourceType, ImportedOrder } from "../types/database";

type CellValue = string | number | boolean | null;

export type ImportedOrderDraft = Omit<
  ImportedOrder,
  "id" | "city_id" | "import_batch_id" | "import_sheet_id" | "is_removed" | "created_at"
>;

export type ParsedImportSheet = {
  sheetName: string;
  sheetIndex: number;
  items: ImportedOrderDraft[];
  skippedRowsCount: number;
};

export type ParsedWorkbookImport = {
  sheets: ParsedImportSheet[];
  totalImportedRowsCount: number;
  totalSkippedRowsCount: number;
};

function normalizeLabel(value: unknown) {
  return String(value ?? "")
    .replace(/[łŁ]/g, (match) => (match === "Ł" ? "L" : "l"))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function text(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowText(row: unknown[]) {
  return normalizeLabel(row.filter(Boolean).join(" "));
}

function isSummaryOrTechnicalRow(row: unknown[]) {
  const content = rowText(row);
  return [
    "suma",
    "podsumowanie",
    "podpis",
    "kwota uslugi netto",
    "kwota uslugi brutto",
    "wartosc zlecenia",
    "razem"
  ].some((keyword) => content.includes(keyword));
}

function findColumn(headers: unknown[], predicates: Array<(label: string) => boolean>) {
  return headers.findIndex((header) => {
    const label = normalizeLabel(header);
    return predicates.some((predicate) => predicate(label));
  });
}

function valueAt(row: unknown[], index: number) {
  return index >= 0 ? row[index] : null;
}

function rawRow(headers: unknown[], row: unknown[]) {
  return headers.reduce<Record<string, CellValue>>((result, header, index) => {
    const key = String(header || `Kolumna ${index + 1}`);
    const value = row[index] as CellValue | undefined;
    result[key] = value ?? null;
    return result;
  }, {});
}

function isLpValue(value: unknown) {
  const normalized = String(value ?? "").trim();
  return /^[0-9]+[.)]?$/.test(normalized);
}

function parseRowTableSheet(rows: unknown[][], sheetName: string, sheetIndex: number): ParsedImportSheet {
  const headerIndex = rows.findIndex((row) => {
    const labels = row.map(normalizeLabel);
    return labels.some((label) => label === "lp" || label === "lp.") &&
      labels.some((label) => label.includes("ulica") || label.includes("lokalizacja"));
  });

  if (headerIndex < 0) {
    return { sheetName, sheetIndex, items: [], skippedRowsCount: rows.length };
  }

  const headers = rows[headerIndex];
  const columns = {
    lp: findColumn(headers, [(label) => label === "lp" || label === "lp."]),
    address: findColumn(headers, [(label) => label.includes("ulica") || label.includes("lokalizacja")]),
    decision: findColumn(headers, [(label) => label.includes("decyzj")]),
    scope: findColumn(headers, [(label) => label.includes("zakres")]),
    species: findColumn(headers, [(label) => label.includes("gatunek")]),
    circumference: findColumn(headers, [(label) => label.includes("obwod")]),
    unitPriceGross: findColumn(headers, [
      (label) => label.includes("cena") && label.includes("brutto")
    ]),
    quantity: findColumn(headers, [(label) => label.includes("ilosc") || label.includes("szt")]),
    totalValueGross: findColumn(headers, [
      (label) => label.includes("wartosc") && label.includes("brutto")
    ]),
    notes: findColumn(headers, [(label) => label.includes("uwagi")])
  };

  const items: ImportedOrderDraft[] = [];
  let skippedRowsCount = 0;

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const sourceRowNumber = headerIndex + offset + 2;

    if (!row.some((cell) => String(cell ?? "").trim()) || isSummaryOrTechnicalRow(row)) {
      skippedRowsCount += 1;
      return;
    }

    const address = text(valueAt(row, columns.address));
    const workScope = text(valueAt(row, columns.scope));

    if (!isLpValue(valueAt(row, columns.lp)) || (!address && !workScope)) {
      skippedRowsCount += 1;
      return;
    }

    items.push({
      source_type: "row_table",
      source_row_number: sourceRowNumber,
      source_column_name: null,
      address,
      decision_number: text(valueAt(row, columns.decision)),
      case_number: null,
      work_scope: workScope,
      species: text(valueAt(row, columns.species)),
      circumference: text(valueAt(row, columns.circumference)),
      unit: null,
      quantity: numberValue(valueAt(row, columns.quantity)),
      unit_price_net: null,
      unit_price_gross: numberValue(valueAt(row, columns.unitPriceGross)),
      total_value_net: null,
      total_value_gross: numberValue(valueAt(row, columns.totalValueGross)),
      notes: text(valueAt(row, columns.notes)),
      raw_data: rawRow(headers, row)
    });
  });

  return { sheetName, sheetIndex, items, skippedRowsCount };
}

function parseWideCostSheet(rows: unknown[][], sheetName: string, sheetIndex: number): ParsedImportSheet {
  const headerIndex = rows.findIndex((row) => {
    const labels = row.map(normalizeLabel);
    return labels.some((label) => label === "lp") &&
      labels.some((label) => label.includes("nr zalacznika")) &&
      labels.some((label) => label.includes("lokalizacja"));
  });

  if (headerIndex < 0) {
    return { sheetName, sheetIndex, items: [], skippedRowsCount: rows.length };
  }

  const headers = rows[headerIndex];
  const lpIndex = findColumn(headers, [(label) => label === "lp"]);
  const addressIndex = findColumn(headers, [(label) => label.includes("lokalizacja")]);
  const notesIndex = findColumn(headers, [(label) => label.includes("uwagi")]);
  const caseIndex = findColumn(headers, [(label) => label.includes("znak sprawy")]);
  const unitRow = rows.find((row) => rowText(row).includes("jednostka miary")) || [];
  const netPriceRow = rows.find((row) => rowText(row).includes("cena netto")) || [];
  const grossPriceRow = rows.find((row) => rowText(row).includes("cena brutto")) || [];
  const serviceColumns = headers
    .map((header, index) => ({ header: text(header), index, label: normalizeLabel(header) }))
    .filter(({ header, index, label }) => {
      if (!header || index <= addressIndex) {
        return false;
      }
      return ![
        "uwagi",
        "znak sprawy",
        "razem",
        "suma"
      ].some((blocked) => label.includes(blocked));
    });

  const items: ImportedOrderDraft[] = [];
  let skippedRowsCount = 0;

  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const sourceRowNumber = headerIndex + offset + 2;

    if (!row.some((cell) => String(cell ?? "").trim()) || isSummaryOrTechnicalRow(row)) {
      skippedRowsCount += 1;
      return;
    }

    if (!isLpValue(valueAt(row, lpIndex))) {
      skippedRowsCount += 1;
      return;
    }

    const address = text(valueAt(row, addressIndex));

    if (!address) {
      skippedRowsCount += 1;
      return;
    }

    let createdForRow = 0;

    serviceColumns.forEach(({ header, index }) => {
      const quantity = numberValue(valueAt(row, index));

      if (!quantity || quantity <= 0) {
        return;
      }

      const unitPriceNet = numberValue(valueAt(netPriceRow, index));
      const unitPriceGross = numberValue(valueAt(grossPriceRow, index));

      items.push({
        source_type: "wide_cost_table",
        source_row_number: sourceRowNumber,
        source_column_name: header,
        address,
        decision_number: null,
        case_number: text(valueAt(row, caseIndex)),
        work_scope: header,
        species: null,
        circumference: null,
        unit: text(valueAt(unitRow, index)),
        quantity,
        unit_price_net: unitPriceNet,
        unit_price_gross: unitPriceGross,
        total_value_net: unitPriceNet === null ? null : quantity * unitPriceNet,
        total_value_gross: unitPriceGross === null ? null : quantity * unitPriceGross,
        notes: text(valueAt(row, notesIndex)),
        raw_data: rawRow(headers, row)
      });
      createdForRow += 1;
    });

    if (createdForRow === 0) {
      skippedRowsCount += 1;
    }
  });

  return { sheetName, sheetIndex, items, skippedRowsCount };
}

export function parseWorkbook(workbook: XLSX.WorkBook, sourceType: ImportSourceType): ParsedWorkbookImport {
  const sheets = workbook.SheetNames.map((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: "",
      raw: false
    });

    return sourceType === "row_table"
      ? parseRowTableSheet(rows, sheetName, index)
      : parseWideCostSheet(rows, sheetName, index);
  });

  return {
    sheets,
    totalImportedRowsCount: sheets.reduce((sum, sheet) => sum + sheet.items.length, 0),
    totalSkippedRowsCount: sheets.reduce((sum, sheet) => sum + sheet.skippedRowsCount, 0)
  };
}

export async function parseXlsxFile(file: File, sourceType: ImportSourceType) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  return parseWorkbook(workbook, sourceType);
}
