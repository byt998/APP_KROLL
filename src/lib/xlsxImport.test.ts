import { describe, expect, it } from "vitest";
import * as XLSX from "@e965/xlsx";
import { parseWorkbook } from "./xlsxImport";

function workbookFromSheets(sheets: Record<string, unknown[][]>) {
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([name, rows]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  });

  return workbook;
}

describe("xlsxImport", () => {
  it("parses row table sheets without merging sheets", () => {
    const workbook = workbookFromSheets({
      Centrum: [
        ["Lp.", "Ulica, nr działki", "Numer i data decyzji", "Zakres prac", "Gatunek", "Ilość (szt./m2)", "Cena jednostkowa brutto", "Wartość brutto w PLN"],
        [1, "Klonowa 1", "DEC-1", "Wycinka", "Klon", 2, 100, 200],
        ["", "", "", "", "", "", "", ""],
        ["Suma", "", "", "", "", "", "", 200]
      ],
      Ligota: [
        ["Lp.", "Ulica, nr działki", "Zakres prac"],
        [1, "Lipowa 2", "Pielęgnacja"]
      ]
    });

    const result = parseWorkbook(workbook, "row_table");

    expect(result.sheets).toHaveLength(2);
    expect(result.totalImportedRowsCount).toBe(2);
    expect(result.sheets[0].items[0]).toMatchObject({
      source_type: "row_table",
      source_row_number: 2,
      address: "Klonowa 1",
      decision_number: "DEC-1",
      work_scope: "Wycinka",
      species: "Klon",
      quantity: 2,
      unit_price_gross: 100,
      total_value_gross: 200
    });
    expect(result.sheets[0].skippedRowsCount).toBe(2);
    expect(result.sheets[1].sheetName).toBe("Ligota");
  });

  it("parses wide cost table service columns as separate working rows", () => {
    const workbook = workbookFromSheets({
      Centrum: [
        ["lp", "nr załącznika", "lokalizacja", "Wycinka", "Pielęgnacja", "uwagi", "znak sprawy"],
        ["", "", "", "szt.", "m2", "", ""],
        ["", "", "jednostka miary", "szt.", "m2", "", ""],
        ["", "", "cena netto", 10, 5, "", ""],
        ["", "", "cena brutto", 12.3, 6.15, "", ""],
        [1, "A1", "Klonowa 1", 2, 0, "pilne", "SP-1"],
        [2, "A2", "Lipowa 2", 1, 3, "", "SP-2"],
        ["Suma", "", "", "", "", "", ""]
      ]
    });

    const result = parseWorkbook(workbook, "wide_cost_table");

    expect(result.sheets).toHaveLength(1);
    expect(result.totalImportedRowsCount).toBe(3);
    expect(result.sheets[0].items[0]).toMatchObject({
      source_type: "wide_cost_table",
      source_column_name: "Wycinka",
      address: "Klonowa 1",
      work_scope: "Wycinka",
      quantity: 2,
      unit: "szt.",
      unit_price_net: 10,
      unit_price_gross: 12.3,
      total_value_net: 20,
      total_value_gross: 24.6,
      notes: "pilne",
      case_number: "SP-1"
    });
    expect(result.sheets[0].items.map((item) => item.work_scope)).toEqual([
      "Wycinka",
      "Wycinka",
      "Pielęgnacja"
    ]);
  });
});
