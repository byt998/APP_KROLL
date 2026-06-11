import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const {
  announcementsDelete,
  announcementsDeleteEq,
  announcementsInsert,
  announcementsOrder,
  announcementsUpdate,
  announcementsUpdateEq,
  citiesDelete,
  citiesDeleteEq,
  citiesInsert,
  citiesOrder,
  citiesRpc,
  citiesSelect,
  from,
  getSession,
  orderPublicItemsRpc,
  importBatchInsert,
  importBatchOrder,
  importBatchSelect,
  importBatchEq,
  importBatchSingle,
  importSheetInsert,
  importSheetOrder,
  importSheetSelect,
  importSheetEq,
  importSheetSingle,
  importedOrdersEq,
  importedOrdersEqRemoved,
  importedOrdersInsert,
  importedOrdersOrder,
  importedOrdersSelect,
  importedOrdersUpdate,
  importedOrdersUpdateEq,
  onAuthStateChange,
  orderItemsInsert,
  orderItemsSelect,
  orderItemsEq,
  orderPhotosInsert,
  orderPhotosOrder,
  orderPhotosSelect,
  ordersDelete,
  ordersDeleteEq,
  ordersInsert,
  ordersOrder,
  ordersSingle,
  ordersUpdate,
  ordersUpdateEq,
  parseXlsxFile,
  profilesOrder,
  profileSingle,
  rpc,
  signOut,
  storageFrom,
  storageCreateSignedUrl,
  storageUpload,
  unsubscribe
} = vi.hoisted(() => ({
  announcementsDelete: vi.fn(),
  announcementsDeleteEq: vi.fn(),
  announcementsInsert: vi.fn(),
  announcementsOrder: vi.fn(),
  announcementsUpdate: vi.fn(),
  announcementsUpdateEq: vi.fn(),
  citiesDelete: vi.fn(),
  citiesDeleteEq: vi.fn(),
  citiesInsert: vi.fn(),
  citiesOrder: vi.fn(),
  citiesRpc: vi.fn(),
  citiesSelect: vi.fn(),
  from: vi.fn(),
  getSession: vi.fn(),
  orderPublicItemsRpc: vi.fn(),
  importBatchInsert: vi.fn(),
  importBatchOrder: vi.fn(),
  importBatchSelect: vi.fn(),
  importBatchEq: vi.fn(),
  importBatchSingle: vi.fn(),
  importSheetInsert: vi.fn(),
  importSheetOrder: vi.fn(),
  importSheetSelect: vi.fn(),
  importSheetEq: vi.fn(),
  importSheetSingle: vi.fn(),
  importedOrdersEq: vi.fn(),
  importedOrdersEqRemoved: vi.fn(),
  importedOrdersInsert: vi.fn(),
  importedOrdersOrder: vi.fn(),
  importedOrdersSelect: vi.fn(),
  importedOrdersUpdate: vi.fn(),
  importedOrdersUpdateEq: vi.fn(),
  onAuthStateChange: vi.fn(),
  orderItemsInsert: vi.fn(),
  orderItemsSelect: vi.fn(),
  orderItemsEq: vi.fn(),
  orderPhotosInsert: vi.fn(),
  orderPhotosOrder: vi.fn(),
  orderPhotosSelect: vi.fn(),
  ordersDelete: vi.fn(),
  ordersDeleteEq: vi.fn(),
  ordersInsert: vi.fn(),
  ordersOrder: vi.fn(),
  ordersSingle: vi.fn(),
  ordersUpdate: vi.fn(),
  ordersUpdateEq: vi.fn(),
  parseXlsxFile: vi.fn(),
  profilesOrder: vi.fn(),
  profileSingle: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  storageFrom: vi.fn(),
  storageCreateSignedUrl: vi.fn(),
  storageUpload: vi.fn(),
  unsubscribe: vi.fn()
}));

let authListener: ((event: string, session: Session | null) => void) | undefined;

vi.mock("./lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from,
    rpc,
    auth: {
      getSession,
      onAuthStateChange,
      signOut
    },
    storage: {
      from: storageFrom
    }
  }
}));

vi.mock("./lib/xlsxImport", () => ({
  parseXlsxFile
}));

const session = {
  user: { id: "user-1" }
} as Session;

function profile(role: "user" | "admin") {
  return {
    id: "user-1",
    phone: "500600700",
    auth_email: null,
    first_name: role === "admin" ? "Anna" : "Jan",
    last_name: "Kowalski",
    role
  };
}

async function signInAs(role: "user" | "admin") {
  profileSingle.mockResolvedValue({ data: profile(role), error: null });

  render(<App />);
  await screen.findByRole("heading", { name: "Zaloguj się" });

  act(() => authListener?.("SIGNED_IN", session));

  return screen.findByRole("heading", {
    name: role === "admin" ? "Witaj, Anna" : "Witaj, Jan"
  });
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authListener = undefined;
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    signOut.mockResolvedValue({ error: null });
    announcementsOrder.mockResolvedValue({ data: [], error: null });
    announcementsInsert.mockResolvedValue({ error: null });
    announcementsUpdate.mockReturnValue({ eq: announcementsUpdateEq });
    announcementsUpdateEq.mockResolvedValue({ error: null });
    announcementsDelete.mockReturnValue({ eq: announcementsDeleteEq });
    announcementsDeleteEq.mockResolvedValue({ error: null });
    citiesRpc.mockResolvedValue({ data: [], error: null });
    orderPublicItemsRpc.mockResolvedValue({
      data: [
        {
          order_id: "order-1",
          imported_order_id: "imported-1",
          address: "Klonowa 1",
          work_scope: "Wycinka",
          species: "Klon",
          circumference: "120",
          quantity: 2
        },
        {
          order_id: "order-1",
          imported_order_id: "imported-2",
          address: null,
          work_scope: "Pielęgnacja",
          species: "Lipa",
          circumference: "80",
          quantity: 1
        }
      ],
      error: null
    });
    rpc.mockImplementation((functionName: string) => {
      if (functionName === "get_cities_with_stats") {
        return citiesRpc();
      }

      if (functionName === "get_order_public_items") {
        return orderPublicItemsRpc();
      }

      throw new Error(`Unexpected RPC: ${functionName}`);
    });
    citiesInsert.mockResolvedValue({ error: null });
    citiesDelete.mockReturnValue({ eq: citiesDeleteEq });
    citiesDeleteEq.mockResolvedValue({ error: null });
    citiesSelect.mockReturnValue({ order: citiesOrder });
    citiesOrder.mockResolvedValue({
      data: [
        {
          id: "city-1",
          name: "Katowice",
          created_by: "admin",
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z"
        }
      ],
      error: null
    });
    parseXlsxFile.mockResolvedValue({
      sheets: [
        {
          sheetName: "Centrum",
          sheetIndex: 0,
          skippedRowsCount: 1,
          items: [
            {
              source_type: "row_table",
              source_row_number: 2,
              source_column_name: null,
              address: "Klonowa 1",
              decision_number: "DEC-1",
              case_number: null,
              work_scope: "Wycinka",
              species: "Klon",
              circumference: null,
              unit: null,
              quantity: 2,
              unit_price_net: null,
              unit_price_gross: 100,
              total_value_net: null,
              total_value_gross: 200,
              notes: null,
              raw_data: { "Ulica, nr działki": "Klonowa 1" }
            }
          ]
        },
        {
          sheetName: "Ligota",
          sheetIndex: 1,
          skippedRowsCount: 0,
          items: []
        }
      ],
      totalImportedRowsCount: 1,
      totalSkippedRowsCount: 1
    });
    importBatchSelect.mockReturnValue({ eq: importBatchEq });
    importBatchEq.mockReturnValue({ order: importBatchOrder });
    importBatchOrder.mockResolvedValue({
      data: [
        {
          id: "batch-1",
          city_id: "city-1",
          import_name: "Katowice - Maj 2026",
          original_filename: "katowice.xlsx",
          source_type: "row_table",
          sheets_count: 1,
          total_imported_rows_count: 2,
          total_skipped_rows_count: 0,
          created_at: "2026-06-06T10:00:00.000Z"
        }
      ],
      error: null
    });
    importBatchInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({ single: importBatchSingle })
    });
    importBatchSingle.mockResolvedValue({
      data: {
        id: "batch-1",
        city_id: "city-1",
        import_name: "Katowice - Maj 2026",
        original_filename: "katowice.xlsx",
        source_type: "row_table",
        sheets_count: 2,
        total_imported_rows_count: 1,
        total_skipped_rows_count: 1,
        created_at: "2026-06-06T10:00:00.000Z"
      },
      error: null
    });
    importSheetSelect.mockReturnValue({ eq: importSheetEq });
    importSheetEq.mockReturnValue({ order: importSheetOrder });
    importSheetOrder.mockResolvedValue({
      data: [
        {
          id: "sheet-1",
          city_id: "city-1",
          import_batch_id: "batch-1",
          sheet_name: "Centrum",
          sheet_index: 0,
          source_type: "row_table",
          imported_rows_count: 2,
          skipped_rows_count: 0,
          created_orders_count: 0,
          created_at: "2026-06-06T10:00:00.000Z"
        }
      ],
      error: null
    });
    importSheetInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({ single: importSheetSingle })
    });
    importSheetSingle
      .mockResolvedValueOnce({
        data: {
          id: "sheet-1",
          city_id: "city-1",
          import_batch_id: "batch-1",
          sheet_name: "Centrum",
          sheet_index: 0,
          source_type: "row_table",
          imported_rows_count: 1,
          skipped_rows_count: 1,
          created_orders_count: 0,
          created_at: "2026-06-06T10:00:00.000Z"
        },
        error: null
      })
      .mockResolvedValueOnce({
        data: {
          id: "sheet-2",
          city_id: "city-1",
          import_batch_id: "batch-1",
          sheet_name: "Ligota",
          sheet_index: 1,
          source_type: "row_table",
          imported_rows_count: 0,
          skipped_rows_count: 0,
          created_orders_count: 0,
          created_at: "2026-06-06T10:00:00.000Z"
        },
        error: null
    });
    importedOrdersInsert.mockResolvedValue({ error: null });
    importedOrdersSelect.mockReturnValue({ eq: importedOrdersEq });
    importedOrdersEq.mockReturnValue({ eq: importedOrdersEqRemoved, order: importedOrdersOrder });
    importedOrdersEqRemoved.mockReturnValue({ order: importedOrdersOrder });
    importedOrdersOrder.mockResolvedValue({
      data: [
        {
          id: "imported-1",
          city_id: "city-1",
          import_batch_id: "batch-1",
          import_sheet_id: "sheet-1",
          source_type: "row_table",
          source_row_number: 2,
          source_column_name: null,
          address: "Klonowa 1",
          decision_number: "DEC-1",
          case_number: null,
          work_scope: "Wycinka",
          species: "Klon",
          circumference: null,
          unit: null,
          quantity: 2,
          unit_price_net: null,
          unit_price_gross: 100,
          total_value_net: null,
          total_value_gross: 200,
          notes: null,
          raw_data: null,
          is_removed: false,
          created_at: "2026-06-06T10:00:00.000Z"
        },
        {
          id: "imported-2",
          city_id: "city-1",
          import_batch_id: "batch-1",
          import_sheet_id: "sheet-1",
          source_type: "row_table",
          source_row_number: 3,
          source_column_name: null,
          address: "Lipowa 2",
          decision_number: "DEC-2",
          case_number: null,
          work_scope: "Pielęgnacja",
          species: "Lipa",
          circumference: null,
          unit: null,
          quantity: 1,
          unit_price_net: null,
          unit_price_gross: 50,
          total_value_net: null,
          total_value_gross: 50,
          notes: null,
          raw_data: null,
          is_removed: false,
          created_at: "2026-06-06T10:00:00.000Z"
        }
      ],
      error: null
    });
    importedOrdersUpdate.mockReturnValue({ eq: importedOrdersUpdateEq });
    importedOrdersUpdateEq.mockResolvedValue({ error: null });
    ordersInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({ single: ordersSingle })
    });
    ordersSingle.mockResolvedValue({
      data: {
        id: "order-1",
        city_id: "city-1",
        import_batch_id: "batch-1",
        import_sheet_id: "sheet-1",
        order_name: "Zlecenie testowe",
        description: "Zlecenie testowe",
        status: "completed",
        notes: "Uwagi",
        created_at: "2026-06-06T10:00:00.000Z",
        completed_at: "2026-06-06T10:00:00.000Z"
      },
      error: null
    });
    orderItemsInsert.mockResolvedValue({ error: null });
    orderItemsSelect.mockReturnValue({ eq: orderItemsEq });
    orderItemsEq.mockResolvedValue({ data: [], error: null });
    ordersOrder.mockResolvedValue({
      data: [
        {
          id: "order-1",
          city_id: "city-1",
          import_batch_id: "batch-1",
          import_sheet_id: "sheet-1",
          assigned_to: null,
          order_name: "Zlecenie testowe",
          description: "Opis zlecenia",
          status: "active",
          notes: "Uwagi",
          latitude: 50.2649,
          longitude: 19.0238,
          completion_notes: null,
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z",
          completed_at: null
        },
        {
          id: "order-2",
          city_id: "city-1",
          import_batch_id: null,
          import_sheet_id: null,
          assigned_to: null,
          order_name: "Zlecenie zielone",
          description: "Gotowe",
          status: "completed",
          notes: null,
          latitude: 50.25,
          longitude: 19.02,
          completion_notes: "Zrobione",
          created_at: "2026-06-05T10:00:00.000Z",
          updated_at: "2026-06-06T11:00:00.000Z",
          completed_at: "2026-06-06T11:00:00.000Z"
        }
      ],
      error: null
    });
    ordersUpdate.mockReturnValue({ eq: ordersUpdateEq });
    ordersUpdateEq.mockResolvedValue({ error: null });
    ordersDelete.mockReturnValue({ eq: ordersDeleteEq });
    ordersDeleteEq.mockResolvedValue({ error: null });
    orderPhotosSelect.mockReturnValue({ order: orderPhotosOrder });
    orderPhotosOrder.mockResolvedValue({
      data: [],
      error: null
    });
    orderPhotosInsert.mockResolvedValue({ error: null });
    profilesOrder.mockResolvedValue({
      data: [
        {
          id: "worker-1",
          phone: "500600701",
          auth_email: null,
          first_name: "Piotr",
          last_name: "Nowak",
          role: "user"
        }
      ],
      error: null
    });
    storageFrom.mockReturnValue({ upload: storageUpload, createSignedUrl: storageCreateSignedUrl });
    storageCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example/photo.jpg" },
      error: null
    });
    storageUpload.mockResolvedValue({ error: null });
    onAuthStateChange.mockImplementation(
      (listener: (event: string, session: Session | null) => void) => {
        authListener = listener;
        return { data: { subscription: { unsubscribe } } };
      }
    );
    from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: profileSingle }),
            order: profilesOrder
          })
        };
      }

      if (table === "announcements") {
        return {
          select: vi.fn().mockReturnValue({ order: announcementsOrder }),
          insert: announcementsInsert,
          update: announcementsUpdate,
          delete: announcementsDelete
        };
      }

      if (table === "cities") {
        return {
          select: citiesSelect,
          insert: citiesInsert,
          delete: citiesDelete
        };
      }

      if (table === "import_batches") {
        return {
          insert: importBatchInsert,
          select: importBatchSelect
        };
      }

      if (table === "import_sheets") {
        return {
          insert: importSheetInsert,
          select: importSheetSelect
        };
      }

      if (table === "imported_orders") {
        return {
          insert: importedOrdersInsert,
          select: importedOrdersSelect,
          update: importedOrdersUpdate
        };
      }

      if (table === "orders") {
        return {
          insert: ordersInsert,
          select: vi.fn().mockReturnValue({ order: ordersOrder }),
          update: ordersUpdate,
          delete: ordersDelete
        };
      }

      if (table === "order_items") {
        return {
          insert: orderItemsInsert,
          select: orderItemsSelect
        };
      }

      if (table === "order_photos") {
        return {
          insert: orderPhotosInsert,
          select: orderPhotosSelect
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it("switches between login and registration", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Zaloguj się" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /zarejestruj się/i }));
    expect(screen.getByRole("heading", { name: "Rejestracja" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /masz już konto/i }));
    expect(screen.getByRole("heading", { name: "Zaloguj się" })).toBeInTheDocument();
  });

  it("shows user shortcuts and hides admin shortcut for regular users", async () => {
    await signInAs("user");

    expect(screen.getByRole("heading", { name: "Zlecenia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mapa" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kalendarz" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Panel Administratora" })).not.toBeInTheDocument();
    expect(await screen.findByText("Brak aktualnych informacji.")).toBeInTheDocument();
  });

  it("shows admin shortcuts and opens the admin panel", async () => {
    await signInAs("admin");

    expect(screen.getByRole("heading", { name: "Zlecenia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mapa" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Panel Administratora" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Kalendarz" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));

    expect(await screen.findByRole("heading", { name: "Zarządzanie" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ZARZĄDZAJ ZLECENIAMI" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DODAJ KOMUNIKAT" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ZARZĄDZAJ PRACOWNIKAMI" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "MAPA ZLECEŃ" })).not.toBeInTheDocument();
  });

  it("opens the work order admin module", async () => {
    await signInAs("admin");

    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));
    await userEvent.click(await screen.findByRole("button", { name: /ZARZĄDZAJ ZLECENIAMI/i }));

    expect(await screen.findByRole("heading", { name: "Zarządzanie zleceniami" }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dodaj Miasto" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Importuj Zlecenia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Twórz Zlecenia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mapa Zleceń" })).toBeInTheDocument();
  });

  it("manages cities from the work order admin module", async () => {
    citiesRpc.mockResolvedValue({
      data: [
        {
          id: "city-1",
          name: "Katowice",
          created_by: "admin",
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z",
          total_orders: 145,
          completed_orders: 120
        }
      ],
      error: null
    });

    await signInAs("admin");
    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));
    await userEvent.click(await screen.findByRole("button", { name: /ZARZĄDZAJ ZLECENIAMI/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Dodaj Miasto/i }));

    expect(await screen.findByRole("heading", { name: "Utworzone miasta" })).toBeInTheDocument();
    const cityCard = screen.getByRole("heading", { name: "Katowice" }).closest("article");
    expect(cityCard).not.toBeNull();
    expect(within(cityCard!).getByText("Łącznie zleceń")).toBeInTheDocument();
    expect(within(cityCard!).getByText("145")).toBeInTheDocument();
    expect(within(cityCard!).getByText("Zakończone")).toBeInTheDocument();
    expect(within(cityCard!).getByText("120")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "DODAJ MIASTO" }));
    expect(screen.getByText("Wpisz nazwę miasta.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Nazwa miasta"), " katowice ");
    await userEvent.click(screen.getByRole("button", { name: "DODAJ MIASTO" }));
    expect(screen.getByText("Miasto już istnieje.")).toBeInTheDocument();
    expect(citiesInsert).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText("Nazwa miasta"));
    await userEvent.type(screen.getByLabelText("Nazwa miasta"), "Gliwice");
    await userEvent.click(screen.getByRole("button", { name: "DODAJ MIASTO" }));

    await waitFor(() => expect(citiesInsert).toHaveBeenCalledWith({ name: "Gliwice" }));
    expect(await screen.findByText("Miasto zostało dodane.")).toBeInTheDocument();

    await userEvent.click(within(cityCard!).getByRole("button", { name: "Usuń" }));

    await waitFor(() => expect(citiesDelete).toHaveBeenCalled());
    expect(citiesDeleteEq).toHaveBeenCalledWith("id", "city-1");
  });

  it("imports XLSX sheets and opens a single sheet workspace", async () => {
    citiesRpc.mockResolvedValue({
      data: [
        {
          id: "city-1",
          name: "Katowice",
          created_by: "admin",
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z",
          total_orders: 0,
          completed_orders: 0
        }
      ],
      error: null
    });

    await signInAs("admin");
    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));
    await userEvent.click(await screen.findByRole("button", { name: /ZARZĄDZAJ ZLECENIAMI/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Importuj Zlecenia/i }));

    expect(await screen.findByRole("heading", { name: "Importuj Zlecenia" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "IMPORTUJ" }));
    expect(screen.getByText("Nie wybrano miasta")).toBeInTheDocument();

    await screen.findByRole("option", { name: "Katowice" });
    await userEvent.selectOptions(screen.getByLabelText("Miasto"), "city-1");
    await userEvent.type(screen.getByLabelText("Nazwa importu"), "Katowice - Maj 2026");
    await userEvent.selectOptions(screen.getByLabelText("Typ tabeli"), "row_table");
    await userEvent.upload(
      screen.getByLabelText("Plik XLSX"),
      new File(["xlsx"], "katowice.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
    await userEvent.click(screen.getByRole("button", { name: "IMPORTUJ" }));

    await waitFor(() => expect(parseXlsxFile).toHaveBeenCalled());
    expect(importBatchInsert).toHaveBeenCalledWith({
      city_id: "city-1",
      import_name: "Katowice - Maj 2026",
      original_filename: "katowice.xlsx",
      source_type: "row_table",
      sheets_count: 2,
      total_imported_rows_count: 1,
      total_skipped_rows_count: 1
    });
    expect(importedOrdersInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        city_id: "city-1",
        import_batch_id: "batch-1",
        import_sheet_id: "sheet-1",
        address: "Klonowa 1"
      })
    ]);

    expect(await screen.findByRole("heading", { name: "Katowice - Maj 2026" })).toBeInTheDocument();
    expect(screen.getByText("Import zakończony")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Centrum" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ligota" })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Otwórz arkusz" })[0]);

    expect(await screen.findByRole("heading", { name: "Centrum" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Klonowa 1" })).toBeInTheDocument();
    expect(importedOrdersEq).toHaveBeenCalledWith("import_sheet_id", "sheet-1");

    await userEvent.click(screen.getAllByRole("button", { name: "Edytuj" })[0]);
    await userEvent.clear(screen.getByLabelText("Adres"));
    await userEvent.type(screen.getByLabelText("Adres"), "Klonowa 3");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    await waitFor(() =>
      expect(importedOrdersUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ address: "Klonowa 3" })
      )
    );
    expect(importedOrdersUpdateEq).toHaveBeenCalledWith("id", "imported-1");
    expect(await screen.findByText("Pozycja robocza zaktualizowana")).toBeInTheDocument();
  });

  it("creates orders from selected imported orders in the workspace", async () => {
    citiesRpc.mockResolvedValue({
      data: [
        {
          id: "city-1",
          name: "Katowice",
          created_by: "admin",
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z",
          total_orders: 0,
          completed_orders: 0
        }
      ],
      error: null
    });

    await signInAs("admin");
    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));
    await userEvent.click(await screen.findByRole("button", { name: /ZARZĄDZAJ ZLECENIAMI/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Twórz Zlecenia/i }));

    expect(await screen.findByRole("heading", { name: "Twórz Zlecenia" })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Utwórz zlecenie" })[0]);
    expect(screen.getByText("Nie wybrano miasta")).toBeInTheDocument();

    await screen.findByRole("option", { name: "Katowice" });
    await userEvent.selectOptions(screen.getByLabelText("Miasto"), "city-1");
    await waitFor(() => expect(importBatchEq).toHaveBeenCalledWith("city_id", "city-1"));

    await screen.findByRole("option", { name: "Katowice - Maj 2026" });
    await userEvent.selectOptions(screen.getByLabelText("Import"), "batch-1");
    await waitFor(() => expect(importSheetEq).toHaveBeenCalledWith("import_batch_id", "batch-1"));

    await screen.findByRole("option", { name: "Centrum" });
    await userEvent.selectOptions(screen.getByLabelText("Arkusz"), "sheet-1");

    expect(await screen.findByDisplayValue("Klonowa 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lipowa 2")).toBeInTheDocument();
    expect(importedOrdersEq).toHaveBeenCalledWith("import_sheet_id", "sheet-1");
    expect(importedOrdersEqRemoved).toHaveBeenCalledWith("is_removed", false);
    expect(screen.getByText(/Naciśnij Enter/)).toBeInTheDocument();

    importedOrdersUpdate.mockClear();
    fireEvent.pointerDown(screen.getByRole("separator", { name: "Zmień szerokość Adres" }), {
      clientX: 0
    });
    fireEvent.pointerMove(window, { clientX: 80 });
    fireEvent.pointerUp(window);
    expect(importedOrdersUpdate).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole("button", { name: "Utwórz zlecenie" })[0]);
    expect(screen.getByText("Nie wybrano żadnych pozycji")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Zaznacz pozycję Klonowa 1"));

    importedOrdersUpdate.mockClear();
    importedOrdersUpdateEq.mockClear();
    const unselectedAddressInput = screen.getByDisplayValue("Lipowa 2");
    await userEvent.clear(unselectedAddressInput);
    await userEvent.type(unselectedAddressInput, "Tylko lipowa");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(importedOrdersUpdate).toHaveBeenCalledWith({ address: "Tylko lipowa" }));
    expect(importedOrdersUpdateEq).toHaveBeenCalledTimes(1);
    expect(importedOrdersUpdateEq).toHaveBeenCalledWith("id", "imported-2");

    importedOrdersUpdate.mockClear();
    importedOrdersUpdateEq.mockClear();
    const decisionInput = screen.getByDisplayValue("DEC-1");
    await userEvent.clear(decisionInput);
    await userEvent.type(decisionInput, "NIE ZAPISUJ");
    await userEvent.keyboard("{Escape}");
    expect(importedOrdersUpdate).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("DEC-1")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Zaznacz pozycję Tylko lipowa"));

    importedOrdersUpdate.mockClear();
    importedOrdersUpdateEq.mockClear();
    const addressInput = screen.getByDisplayValue("Klonowa 1");
    await userEvent.clear(addressInput);
    await userEvent.type(addressInput, "Wspólny adres");
    await userEvent.keyboard("{Enter}");

    await waitFor(() =>
      expect(importedOrdersUpdate).toHaveBeenCalledWith({ address: "Wspólny adres" })
    );
    expect(importedOrdersUpdateEq).toHaveBeenCalledWith("id", "imported-1");
    expect(importedOrdersUpdateEq).toHaveBeenCalledWith("id", "imported-2");

    await userEvent.click(screen.getByRole("button", { name: "Ukryj Gatunek" }));
    expect(screen.queryByRole("columnheader", { name: "Gatunek" })).not.toBeInTheDocument();

    const quantityInput = screen.getByDisplayValue("2");
    await userEvent.clear(quantityInput);
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(importedOrdersUpdate).toHaveBeenCalledWith({ quantity: null }));

    await userEvent.click(screen.getAllByRole("button", { name: "Utwórz zlecenie" })[0]);
    expect(await screen.findByRole("heading", { name: "Utwórz właściwe zlecenie" }))
      .toBeInTheDocument();
    expect(screen.getByText("Jeśli zostawisz puste, aplikacja użyje: Wspólny adres - Wycinka"))
      .toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Uwagi"), "Uwagi");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "completed");
    await userEvent.type(screen.getByLabelText("Latitude"), "50,12");
    await userEvent.type(screen.getByLabelText("Longitude"), "19.91");
    await userEvent.upload(
      screen.getByLabelText("Zdjęcia"),
      new File(["photo"], "start.jpg", { type: "image/jpeg" })
    );
    await userEvent.selectOptions(screen.getByLabelText("Przypisany użytkownik"), "worker-1");
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Utwórz zlecenie" })
    );

    await waitFor(() =>
      expect(ordersInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          city_id: "city-1",
          import_batch_id: "batch-1",
          import_sheet_id: "sheet-1",
          order_name: "Wspólny adres - Wycinka",
          description: "Wspólny adres - Wycinka",
          assigned_to: "worker-1",
          latitude: 50.12,
          longitude: 19.91,
          status: "completed",
          notes: "Uwagi"
        })
      )
    );
    expect(ordersInsert.mock.calls[0][0].completed_at).toEqual(expect.any(String));
    expect(orderItemsInsert).toHaveBeenCalledWith([
      { order_id: "order-1", imported_order_id: "imported-1" },
      { order_id: "order-1", imported_order_id: "imported-2" }
    ]);
    expect(storageFrom).toHaveBeenCalledWith("order-photos");
    expect(storageUpload).toHaveBeenCalled();
    expect(orderPhotosInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: "order-1",
        photo_stage: "admin"
      })
    );
    expect(await screen.findByText("Zlecenie utworzone")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Usuń" })[0]);
    await waitFor(() => expect(importedOrdersUpdate).toHaveBeenCalledWith({ is_removed: true }));
  });

  it("marks imported rows that already have orders and skips them when selecting visible rows", async () => {
    citiesRpc.mockResolvedValue({
      data: [
        {
          id: "city-1",
          name: "Katowice",
          created_by: "admin",
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z",
          total_orders: 0,
          completed_orders: 0
        }
      ],
      error: null
    });
    orderItemsEq.mockResolvedValue({
      data: [{ imported_order_id: "imported-1" }],
      error: null
    });

    await signInAs("admin");
    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));
    await userEvent.click(await screen.findByRole("button", { name: /ZARZĄDZAJ ZLECENIAMI/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Twórz Zlecenia/i }));
    await screen.findByRole("option", { name: "Katowice" });
    await userEvent.selectOptions(screen.getByLabelText("Miasto"), "city-1");
    await screen.findByRole("option", { name: "Katowice - Maj 2026" });
    await userEvent.selectOptions(screen.getByLabelText("Import"), "batch-1");
    await screen.findByRole("option", { name: "Centrum" });
    await userEvent.selectOptions(screen.getByLabelText("Arkusz"), "sheet-1");

    expect(await screen.findByText("Zlecenie utworzone")).toBeInTheDocument();
    expect(screen.getByLabelText("Zaznacz pozycję Klonowa 1")).toBeDisabled();

    await userEvent.click(screen.getByLabelText("Zaznacz widoczne pozycje"));

    expect(screen.getByLabelText("Zaznacz pozycję Klonowa 1")).not.toBeChecked();
    expect(screen.getByLabelText("Zaznacz pozycję Lipowa 2")).toBeChecked();
  });

  it("shows announcements from newest to oldest", async () => {
    announcementsOrder.mockResolvedValue({
      data: [
        {
          id: "new",
          title: "Nowszy komunikat",
          content: "Treść nowsza",
          created_by: "admin",
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z"
        },
        {
          id: "old",
          title: "Starszy komunikat",
          content: "Treść starsza",
          created_by: "admin",
          created_at: "2026-06-05T10:00:00.000Z",
          updated_at: "2026-06-05T10:00:00.000Z"
        }
      ],
      error: null
    });

    await signInAs("user");

    const newer = await screen.findByRole("heading", { name: "Nowszy komunikat" });
    const older = screen.getByRole("heading", { name: "Starszy komunikat" });

    expect(newer.compareDocumentPosition(older)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(announcementsOrder).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("creates, updates and deletes announcements from the admin manager", async () => {
    announcementsOrder.mockResolvedValue({
      data: [
        {
          id: "announcement-1",
          title: "Stary tytuł",
          content: "Stara treść",
          created_by: "admin",
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z"
        }
      ],
      error: null
    });

    await signInAs("admin");
    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));
    await userEvent.click(await screen.findByRole("button", { name: /DODAJ KOMUNIKAT/i }));

    expect(await screen.findByRole("heading", { name: "Dodaj Komunikat" })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Tytuł"), "Nowy komunikat");
    await userEvent.type(screen.getByLabelText("Treść"), "Treść komunikatu");
    await userEvent.click(screen.getByRole("button", { name: "Dodaj komunikat" }));

    await waitFor(() =>
      expect(announcementsInsert).toHaveBeenCalledWith({
        title: "Nowy komunikat",
        content: "Treść komunikatu"
      })
    );

    const existingCard = screen.getByRole("heading", { name: "Stary tytuł" }).closest("article");
    expect(existingCard).not.toBeNull();
    await userEvent.click(within(existingCard!).getByRole("button", { name: "Edytuj" }));

    await userEvent.clear(screen.getByLabelText("Tytuł"));
    await userEvent.type(screen.getByLabelText("Tytuł"), "Poprawiony tytuł");
    await userEvent.clear(screen.getByLabelText("Treść"));
    await userEvent.type(screen.getByLabelText("Treść"), "Poprawiona treść");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz zmiany" }));

    await waitFor(() =>
      expect(announcementsUpdate).toHaveBeenCalledWith({
        title: "Poprawiony tytuł",
        content: "Poprawiona treść"
      })
    );
    expect(announcementsUpdateEq).toHaveBeenCalledWith("id", "announcement-1");

    await userEvent.click(within(existingCard!).getByRole("button", { name: "Usuń" }));

    await waitFor(() => expect(announcementsDelete).toHaveBeenCalled());
    expect(announcementsDeleteEq).toHaveBeenCalledWith("id", "announcement-1");
  });

  it("shows orders to a user and completes an order with photos", async () => {
    await signInAs("user");

    await userEvent.click(screen.getByRole("button", { name: /Zlecenia/i }));
    expect(await screen.findByRole("heading", { name: "Najpierw wybierz miasto" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Katowice/i }));

    expect(await screen.findByRole("heading", { name: "Zlecenie testowe" })).toBeInTheDocument();
    expect(screen.getByText("Zlecenie zielone")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Zlecenie testowe/i }));
    expect(screen.getByRole("heading", { name: "Zakres prac" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Informacje o zleceniu" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Zdjęcia i materiały zlecenia" })).toBeInTheDocument();
    expect(screen.getAllByText("ADRES")).toHaveLength(2);
    expect(screen.getAllByText("ZAKRES PRAC")).toHaveLength(2);
    expect(screen.getAllByText("GATUNEK")).toHaveLength(2);
    expect(screen.getAllByText("OBWÓD")).toHaveLength(2);
    expect(screen.getAllByText("ILOŚĆ")).toHaveLength(2);
    expect(screen.getByText("Wycinka")).toBeInTheDocument();
    expect(screen.getByText("Pielęgnacja")).toBeInTheDocument();
    expect(screen.getAllByText("Brak adresu").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Brak adresu" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Klonowa 1" })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=Katowice%20Klonowa%201&travelmode=driving"
    );
    expect(screen.queryByText("Numer decyzji")).not.toBeInTheDocument();
    expect(screen.queryByText("Cena netto")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edytuj" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Usuń zlecenie" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Zlecenie zielone/i }));
    expect(screen.getByText("Brak pozycji przypisanych do tego zlecenia.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "ZREALIZOWANO" }));
    await userEvent.type(screen.getByLabelText("Uwagi po realizacji"), "Zrobione bez problemów");
    await userEvent.upload(
      screen.getByLabelText("Zdjęcia po realizacji"),
      new File(["photo"], "realizacja.jpg", { type: "image/jpeg" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Zapisz realizację" }));

    await waitFor(() =>
      expect(ordersUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
          completion_notes: "Zrobione bez problemów"
        })
      )
    );
    expect(ordersUpdateEq).toHaveBeenCalledWith("id", "order-1");
    expect(storageFrom).toHaveBeenCalledWith("order-photos");
    expect(storageUpload).toHaveBeenCalled();
    expect(orderPhotosInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: "order-1",
        photo_stage: "completion"
      })
    );
  });

  it("opens an order photo preview from the file name", async () => {
    orderPhotosOrder.mockResolvedValue({
      data: [
        {
          id: "photo-1",
          order_id: "order-1",
          storage_path: "order-1/admin/admin.webp",
          uploaded_by: "user-1",
          photo_stage: "admin",
          created_at: "2026-06-06T10:00:00.000Z"
        }
      ],
      error: null
    });

    await signInAs("user");

    await userEvent.click(screen.getByRole("button", { name: /Zlecenia/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Katowice/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Zlecenie testowe/i }));

    await userEvent.click(screen.getByRole("button", { name: "admin.webp" }));

    expect(storageFrom).toHaveBeenCalledWith("order-photos");
    expect(storageCreateSignedUrl).toHaveBeenCalledWith("order-1/admin/admin.webp", 600);
    expect(await screen.findByRole("img", { name: "admin.webp" })).toHaveAttribute(
      "src",
      "https://storage.example/photo.jpg"
    );
  });

  it("uses imported item data when an order has no name or description", async () => {
    ordersOrder.mockResolvedValue({
      data: [
        {
          id: "order-empty-name",
          city_id: "city-1",
          import_batch_id: "batch-1",
          import_sheet_id: "sheet-1",
          assigned_to: null,
          order_name: null,
          description: null,
          status: "active",
          notes: null,
          latitude: null,
          longitude: null,
          completion_notes: null,
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z",
          completed_at: null
        }
      ],
      error: null
    });
    orderPublicItemsRpc.mockResolvedValue({
      data: [
        {
          order_id: "order-empty-name",
          imported_order_id: "imported-fallback",
          address: "Dębowa 4",
          work_scope: "Sadzenie",
          species: "Dąb",
          circumference: "45",
          quantity: 3
        }
      ],
      error: null
    });

    await signInAs("user");

    await userEvent.click(screen.getByRole("button", { name: /Zlecenia/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Katowice/i }));

    expect(await screen.findByRole("heading", { name: "Dębowa 4 - Sadzenie" })).toBeInTheDocument();
    expect(screen.getByText("Sadzenie · Dąb")).toBeInTheDocument();
    expect(screen.getByText("1 pozycja")).toBeInTheDocument();
  });

  it("lets an admin edit orders and add GPS data", async () => {
    await signInAs("admin");

    await userEvent.click(screen.getByRole("button", { name: /Zlecenia/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Katowice/i }));
    expect(await screen.findByRole("heading", { name: "Zlecenie testowe" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Zlecenie testowe/i }));
    await userEvent.click(screen.getAllByRole("button", { name: "Edytuj" })[0]);
    await userEvent.clear(screen.getByLabelText("Latitude"));
    await userEvent.type(screen.getByLabelText("Latitude"), "50.12");
    await userEvent.clear(screen.getByLabelText("Longitude"));
    await userEvent.type(screen.getByLabelText("Longitude"), "19.91");
    await userEvent.selectOptions(screen.getByLabelText("Przypisany użytkownik"), "worker-1");
    await userEvent.upload(
      screen.getByLabelText("Zdjęcia"),
      new File(["photo"], "admin.webp", { type: "image/webp" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    await waitFor(() =>
      expect(ordersUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          assigned_to: "worker-1",
          latitude: 50.12,
          longitude: 19.91
        })
      )
    );
    expect(orderPhotosInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: "order-1",
        photo_stage: "admin"
      })
    );
  });

  it("lets an admin delete an order after confirmation", async () => {
    await signInAs("admin");

    await userEvent.click(screen.getByRole("button", { name: /Zlecenia/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Katowice/i }));
    expect(await screen.findByRole("heading", { name: "Zlecenie testowe" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Zlecenie testowe/i }));
    await userEvent.click(screen.getAllByRole("button", { name: "Edytuj" })[0]);
    expect(screen.getByRole("button", { name: "Usuń zlecenie" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Usuń zlecenie" }));
    expect(screen.getByText(/Tej operacji nie można cofnąć/i)).toBeInTheDocument();

    ordersOrder.mockResolvedValueOnce({ data: [], error: null });
    orderPublicItemsRpc.mockResolvedValueOnce({ data: [], error: null });
    await userEvent.click(screen.getByRole("button", { name: "Potwierdź usunięcie" }));

    await waitFor(() => expect(ordersDelete).toHaveBeenCalled());
    expect(ordersDeleteEq).toHaveBeenCalledWith("id", "order-1");
    expect(await screen.findByText("Zlecenie usunięte.")).toBeInTheDocument();
    expect(screen.getByText("Brak zleceń dla wybranego miasta.")).toBeInTheDocument();
  });

  it("opens the orders map from home", async () => {
    await signInAs("user");

    await userEvent.click(screen.getByRole("button", { name: /Mapa/i }));

    expect(await screen.findByRole("heading", { name: "Mapa Zleceń" })).toBeInTheDocument();
    expect(screen.getByText("2 z GPS")).toBeInTheDocument();
    expect(screen.getByText("Aktywne")).toBeInTheDocument();
    expect(screen.getByText("Zrealizowane")).toBeInTheDocument();
  });

  it("opens a placeholder module screen", async () => {
    await signInAs("user");

    await userEvent.click(screen.getByRole("button", { name: /Kalendarz/i }));

    expect(await screen.findByRole("heading", { name: "Kalendarz" })).toBeInTheDocument();
    expect(screen.getByText("Moduł w przygotowaniu.")).toBeInTheDocument();
  });

  it("signs out an auth user without a profile and shows the required message", async () => {
    profileSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116" }
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Zaloguj się" });

    act(() => authListener?.("SIGNED_IN", session));

    expect(await screen.findByText(/konto istnieje, ale nie ma przypisanego profilu/i))
      .toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
  });
});
