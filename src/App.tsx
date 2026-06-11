import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AdminPanelScreen } from "./components/AdminPanelScreen";
import { AnnouncementManagerScreen } from "./components/AnnouncementManagerScreen";
import { CityManagerScreen } from "./components/CityManagerScreen";
import { CreateOrdersScreen } from "./components/CreateOrdersScreen";
import { HomeScreen } from "./components/HomeScreen";
import { ImportDetailsScreen } from "./components/ImportDetailsScreen";
import { ImportSheetScreen } from "./components/ImportSheetScreen";
import { LoginScreen } from "./components/LoginScreen";
import { ModulePlaceholderScreen } from "./components/ModulePlaceholderScreen";
import { OrderImportScreen } from "./components/OrderImportScreen";
import { OrdersListScreen } from "./components/OrdersListScreen";
import { OrdersMapScreen } from "./components/OrdersMapScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { WorkOrderAdminScreen } from "./components/WorkOrderAdminScreen";
import { parseXlsxFile } from "./lib/xlsxImport";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import type {
  Announcement,
  CityWithStats,
  ImportBatch,
  ImportedOrder,
  ImportSheet,
  ImportSourceType,
  Order,
  OrderPhoto,
  OrderPublicItem,
  Profile
} from "./types/database";

type AuthView = "login" | "register";
type AppView =
  | "home"
  | "admin"
  | "orders-admin"
  | "orders-list"
  | "orders-map"
  | "cities-admin"
  | "orders-import"
  | "create-orders"
  | "import-details"
  | "import-sheet"
  | "announcements-admin"
  | "module-placeholder";

type SelectedImport = {
  batch: ImportBatch;
  city: CityWithStats | null;
  sheets: ImportSheet[];
};

const MISSING_PROFILE_MESSAGE =
  "Konto istnieje, ale nie ma przypisanego profilu. Skontaktuj się z administratorem.";
const REGISTRATION_SUCCESS_MESSAGE =
  "Konto zostało utworzone. Możesz się zalogować.";

export default function App() {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [appView, setAppView] = useState<AppView>("home");
  const [selectedModule, setSelectedModule] = useState("Moduł");
  const [moduleBackView, setModuleBackView] = useState<AppView>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [areAnnouncementsLoading, setAreAnnouncementsLoading] = useState(false);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [isAnnouncementSaving, setIsAnnouncementSaving] = useState(false);
  const [cities, setCities] = useState<CityWithStats[]>([]);
  const [areCitiesLoading, setAreCitiesLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [citySuccess, setCitySuccess] = useState<string | null>(null);
  const [isCitySaving, setIsCitySaving] = useState(false);
  const [selectedImport, setSelectedImport] = useState<SelectedImport | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<ImportSheet | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importedOrders, setImportedOrders] = useState<ImportedOrder[]>([]);
  const [areImportedOrdersLoading, setAreImportedOrdersLoading] = useState(false);
  const [importedOrderError, setImportedOrderError] = useState<string | null>(null);
  const [importedOrderSuccess, setImportedOrderSuccess] = useState<string | null>(null);
  const [isImportedOrderSaving, setIsImportedOrderSaving] = useState(false);
  const [workspaceImports, setWorkspaceImports] = useState<ImportBatch[]>([]);
  const [workspaceSheets, setWorkspaceSheets] = useState<ImportSheet[]>([]);
  const [workspaceItems, setWorkspaceItems] = useState<ImportedOrder[]>([]);
  const [usedWorkspaceItemIds, setUsedWorkspaceItemIds] = useState<string[]>([]);
  const [areWorkspaceImportsLoading, setAreWorkspaceImportsLoading] = useState(false);
  const [areWorkspaceSheetsLoading, setAreWorkspaceSheetsLoading] = useState(false);
  const [areWorkspaceItemsLoading, setAreWorkspaceItemsLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceSuccess, setWorkspaceSuccess] = useState<string | null>(null);
  const [isWorkspaceSaving, setIsWorkspaceSaving] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderPhotos, setOrderPhotos] = useState<OrderPhoto[]>([]);
  const [orderPublicItems, setOrderPublicItems] = useState<OrderPublicItem[]>([]);
  const [assignableProfiles, setAssignableProfiles] = useState<Profile[]>([]);
  const [areOrdersLoading, setAreOrdersLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [isOrderSaving, setIsOrderSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadAnnouncements = useCallback(async () => {
    setAreAnnouncementsLoading(true);
    setAnnouncementError(null);

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setAnnouncementError("Nie udało się pobrać komunikatów.");
      setAnnouncements([]);
      setAreAnnouncementsLoading(false);
      return;
    }

    setAnnouncements((data || []) as Announcement[]);
    setAreAnnouncementsLoading(false);
  }, []);

  const loadCities = useCallback(async () => {
    setAreCitiesLoading(true);
    setCityError(null);

    const { data, error } = await supabase.rpc("get_cities_with_stats");

    if (error) {
      setCityError("Nie udało się pobrać miast.");
      setCities([]);
      setAreCitiesLoading(false);
      return;
    }

    setCities((data || []) as CityWithStats[]);
    setAreCitiesLoading(false);
  }, []);

  const loadPublicCities = useCallback(async () => {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setCities([]);
      return;
    }

    setCities(
      (data || []).map((city) => ({
        ...city,
        total_orders: 0,
        completed_orders: 0
      })) as CityWithStats[]
    );
  }, []);

  const loadOrderPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("order_photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setOrderPhotos([]);
      return;
    }

    setOrderPhotos((data || []) as OrderPhoto[]);
  }, []);

  const loadOrderPublicItems = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_order_public_items");

    if (error) {
      setOrderPublicItems([]);
      return;
    }

    setOrderPublicItems((data || []) as OrderPublicItem[]);
  }, []);

  const loadOrders = useCallback(async () => {
    setAreOrdersLoading(true);
    setOrderError(null);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setOrderError("Nie udało się pobrać zleceń.");
      setOrders([]);
      setAreOrdersLoading(false);
      return;
    }

    setOrders((data || []) as Order[]);
    await Promise.all([loadOrderPhotos(), loadOrderPublicItems()]);
    setAreOrdersLoading(false);
  }, [loadOrderPhotos, loadOrderPublicItems]);

  const loadAssignableProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("last_name", { ascending: true });

    if (error) {
      setAssignableProfiles([]);
      return;
    }

    setAssignableProfiles((data || []) as Profile[]);
  }, []);

  const synchronizeSession = useCallback(async (session: Session | null) => {
    const currentRequest = ++requestId.current;

    if (!session) {
      setProfile(null);
      setAnnouncements([]);
      setCities([]);
      setSelectedImport(null);
      setSelectedSheet(null);
      setImportedOrders([]);
      setWorkspaceImports([]);
      setWorkspaceSheets([]);
      setWorkspaceItems([]);
      setUsedWorkspaceItemIds([]);
      setOrders([]);
      setOrderPhotos([]);
      setOrderPublicItems([]);
      setAssignableProfiles([]);
      setAppView("home");
      setModuleBackView("home");
      setIsLoading(false);
      setIsSigningOut(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (currentRequest !== requestId.current) {
      return;
    }

    if (error || !data) {
      setProfile(null);
      setMessage(
        error?.code === "PGRST116" || !data
          ? MISSING_PROFILE_MESSAGE
          : "Nie udało się pobrać profilu. Spróbuj zalogować się ponownie."
      );
      setIsLoading(false);
      await supabase.auth.signOut();
      return;
    }

    setMessage(null);
    setProfile(data as Profile);
    setAppView("home");
    setModuleBackView("home");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (profile) {
      void loadAnnouncements();
    }
  }, [loadAnnouncements, profile]);

  useEffect(() => {
    if (
      profile?.role === "admin" &&
      (appView === "cities-admin" || appView === "orders-import" || appView === "create-orders")
    ) {
      void loadCities();
    }
  }, [appView, loadCities, profile?.role]);

  useEffect(() => {
    if (profile && (appView === "orders-list" || appView === "orders-map")) {
      void loadPublicCities();
      void loadOrders();
      if (profile.role === "admin") {
        void loadAssignableProfiles();
      }
    }
  }, [appView, loadAssignableProfiles, loadOrders, loadPublicCities, profile]);

  useEffect(() => {
    if (profile?.role === "admin" && appView === "create-orders") {
      void loadAssignableProfiles();
    }
  }, [appView, loadAssignableProfiles, profile?.role]);

  useEffect(() => {
    if (profile?.role === "admin" && appView === "import-sheet" && selectedSheet) {
      void loadImportedOrders(selectedSheet.id);
    }
  }, [appView, profile?.role, selectedSheet]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isActive = true;
    const timeoutIds = new Set<number>();

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isActive) {
        return;
      }

      if (error) {
        setMessage("Nie udało się sprawdzić sesji. Odśwież stronę i spróbuj ponownie.");
        setIsLoading(false);
        return;
      }

      void synchronizeSession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        if (isActive) {
          void synchronizeSession(session);
        }
      }, 0);

      timeoutIds.add(timeoutId);
    });

    return () => {
      isActive = false;
      requestId.current += 1;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      subscription.unsubscribe();
    };
  }, [synchronizeSession]);

  async function handleSignOut() {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("Nie udało się wylogować. Spróbuj ponownie.");
      setIsSigningOut(false);
      return;
    }

    setProfile(null);
    setAnnouncements([]);
    setCities([]);
    setSelectedImport(null);
    setSelectedSheet(null);
    setImportedOrders([]);
    setWorkspaceImports([]);
    setWorkspaceSheets([]);
    setWorkspaceItems([]);
    setUsedWorkspaceItemIds([]);
    setOrders([]);
    setOrderPhotos([]);
    setOrderPublicItems([]);
    setAssignableProfiles([]);
    setAuthView("login");
    setAppView("home");
    setModuleBackView("home");
    setIsSigningOut(false);
  }

  function openModule(title: string, backView: AppView = "home") {
    setSelectedModule(title);
    setModuleBackView(backView);
    setAppView("module-placeholder");
  }

  function openCityManager() {
    setCityError(null);
    setCitySuccess(null);
    setAppView("cities-admin");
  }

  function openOrderImport() {
    setImportError(null);
    setImportSuccess(null);
    setAppView("orders-import");
  }

  function openCreateOrders() {
    setWorkspaceError(null);
    setWorkspaceSuccess(null);
    setWorkspaceImports([]);
    setWorkspaceSheets([]);
    setWorkspaceItems([]);
    setUsedWorkspaceItemIds([]);
    setAppView("create-orders");
  }

  function openOrdersList() {
    setOrderError(null);
    setOrderSuccess(null);
    setAppView("orders-list");
  }

  function openOrdersMap(backView: AppView = "home") {
    setModuleBackView(backView);
    setOrderError(null);
    setOrderSuccess(null);
    setAppView("orders-map");
  }

  function openImportedSheet(sheet: ImportSheet) {
    setSelectedSheet(sheet);
    setImportedOrderError(null);
    setImportedOrderSuccess(null);
    setAppView("import-sheet");
  }

  async function createAnnouncement(title: string, content: string) {
    setIsAnnouncementSaving(true);
    setAnnouncementError(null);

    const { error } = await supabase.from("announcements").insert({ title, content });

    if (error) {
      setAnnouncementError("Nie udało się dodać komunikatu.");
      setIsAnnouncementSaving(false);
      return;
    }

    await loadAnnouncements();
    setIsAnnouncementSaving(false);
  }

  async function updateAnnouncement(id: string, title: string, content: string) {
    setIsAnnouncementSaving(true);
    setAnnouncementError(null);

    const { error } = await supabase
      .from("announcements")
      .update({ title, content })
      .eq("id", id);

    if (error) {
      setAnnouncementError("Nie udało się zapisać zmian.");
      setIsAnnouncementSaving(false);
      return;
    }

    await loadAnnouncements();
    setIsAnnouncementSaving(false);
  }

  async function deleteAnnouncement(id: string) {
    setIsAnnouncementSaving(true);
    setAnnouncementError(null);

    const { error } = await supabase.from("announcements").delete().eq("id", id);

    if (error) {
      setAnnouncementError("Nie udało się usunąć komunikatu.");
      setIsAnnouncementSaving(false);
      return;
    }

    await loadAnnouncements();
    setIsAnnouncementSaving(false);
  }

  async function createCity(name: string) {
    const trimmedName = name.trim();
    const normalizedName = trimmedName.toLocaleLowerCase("pl-PL");

    setCityError(null);
    setCitySuccess(null);

    if (cities.some((city) => city.name.trim().toLocaleLowerCase("pl-PL") === normalizedName)) {
      setCityError("Miasto już istnieje.");
      return false;
    }

    setIsCitySaving(true);

    const { error } = await supabase.from("cities").insert({ name: trimmedName });

    if (error) {
      setCityError(
        error.code === "23505" ? "Miasto już istnieje." : "Nie udało się dodać miasta."
      );
      setIsCitySaving(false);
      return false;
    }

    await loadCities();
    setCitySuccess("Miasto zostało dodane.");
    setIsCitySaving(false);
    return true;
  }

  async function deleteCity(id: string) {
    setIsCitySaving(true);
    setCityError(null);
    setCitySuccess(null);

    const { error } = await supabase.from("cities").delete().eq("id", id);

    if (error) {
      setCityError(
        error.code === "23503"
          ? "Nie można usunąć miasta, które ma przypisane zlecenia."
          : "Nie udało się usunąć miasta."
      );
      setIsCitySaving(false);
      return;
    }

    await loadCities();
    setCitySuccess("Miasto zostało usunięte.");
    setIsCitySaving(false);
  }

  async function createImport({
    cityId,
    importName,
    sourceType,
    file
  }: {
    cityId: string;
    importName: string;
    sourceType: ImportSourceType;
    file: File;
  }) {
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    const parsed = await parseXlsxFile(file, sourceType);

    if (parsed.sheets.length === 0) {
      setImportError("Nie znaleziono arkuszy w pliku");
      setIsImporting(false);
      return;
    }

    const { data: batch, error: batchError } = await supabase
      .from("import_batches")
      .insert({
        city_id: cityId,
        import_name: importName,
        original_filename: file.name,
        source_type: sourceType,
        sheets_count: parsed.sheets.length,
        total_imported_rows_count: parsed.totalImportedRowsCount,
        total_skipped_rows_count: parsed.totalSkippedRowsCount
      })
      .select("*")
      .single();

    if (batchError || !batch) {
      setImportError("Nie udało się zapisać importu.");
      setIsImporting(false);
      return;
    }

    const savedSheets: ImportSheet[] = [];

    for (const parsedSheet of parsed.sheets) {
      const { data: savedSheet, error: sheetError } = await supabase
        .from("import_sheets")
        .insert({
          city_id: cityId,
          import_batch_id: batch.id,
          sheet_name: parsedSheet.sheetName,
          sheet_index: parsedSheet.sheetIndex,
          source_type: sourceType,
          imported_rows_count: parsedSheet.items.length,
          skipped_rows_count: parsedSheet.skippedRowsCount,
          created_orders_count: 0
        })
        .select("*")
        .single();

      if (sheetError || !savedSheet) {
        setImportError("Nie udało się zapisać arkusza importu.");
        setIsImporting(false);
        return;
      }

      savedSheets.push(savedSheet as ImportSheet);

      if (parsedSheet.items.length > 0) {
        const { error: rowsError } = await supabase.from("imported_orders").insert(
          parsedSheet.items.map((item) => ({
            ...item,
            city_id: cityId,
            import_batch_id: batch.id,
            import_sheet_id: savedSheet.id
          }))
        );

        if (rowsError) {
          setImportError("Nie udało się zapisać pozycji roboczych.");
          setIsImporting(false);
          return;
        }
      }
    }

    const city = cities.find((item) => item.id === cityId) || null;

    setSelectedImport({
      batch: batch as ImportBatch,
      city,
      sheets: savedSheets
    });
    setImportSuccess("Import zakończony");
    setIsImporting(false);
    setAppView("import-details");
  }

  async function loadImportedOrders(sheetId: string) {
    setAreImportedOrdersLoading(true);
    setImportedOrderError(null);

    const { data, error } = await supabase
      .from("imported_orders")
      .select("*")
      .eq("import_sheet_id", sheetId)
      .eq("is_removed", false)
      .order("source_row_number", { ascending: true });

    if (error) {
      setImportedOrderError("Nie udało się pobrać pozycji roboczych.");
      setImportedOrders([]);
      setAreImportedOrdersLoading(false);
      return;
    }

    setImportedOrders((data || []) as ImportedOrder[]);
    setAreImportedOrdersLoading(false);
  }

  async function updateImportedOrder(id: string, values: Partial<ImportedOrder>) {
    setIsImportedOrderSaving(true);
    setImportedOrderError(null);
    setImportedOrderSuccess(null);

    const { error } = await supabase.from("imported_orders").update(values).eq("id", id);

    if (error) {
      setImportedOrderError("Nie udało się zapisać pozycji roboczej.");
      setIsImportedOrderSaving(false);
      return;
    }

    setImportedOrders((current) =>
      current.map((item) => (item.id === id ? { ...item, ...values } : item))
    );
    setImportedOrderSuccess("Pozycja robocza zaktualizowana");
    setIsImportedOrderSaving(false);
  }

  async function loadWorkspaceImports(cityId: string) {
    setAreWorkspaceImportsLoading(true);
    setWorkspaceError(null);
    setWorkspaceImports([]);
    setWorkspaceSheets([]);
    setWorkspaceItems([]);
    setUsedWorkspaceItemIds([]);

    const { data, error } = await supabase
      .from("import_batches")
      .select("*")
      .eq("city_id", cityId)
      .order("created_at", { ascending: false });

    if (error) {
      setWorkspaceError("Nie udało się pobrać importów.");
      setAreWorkspaceImportsLoading(false);
      return;
    }

    setWorkspaceImports((data || []) as ImportBatch[]);
    setAreWorkspaceImportsLoading(false);
  }

  async function loadWorkspaceSheets(importBatchId: string) {
    setAreWorkspaceSheetsLoading(true);
    setWorkspaceError(null);
    setWorkspaceSheets([]);
    setWorkspaceItems([]);
    setUsedWorkspaceItemIds([]);

    const { data, error } = await supabase
      .from("import_sheets")
      .select("*")
      .eq("import_batch_id", importBatchId)
      .order("sheet_index", { ascending: true });

    if (error) {
      setWorkspaceError("Nie udało się pobrać arkuszy.");
      setAreWorkspaceSheetsLoading(false);
      return;
    }

    setWorkspaceSheets((data || []) as ImportSheet[]);
    setAreWorkspaceSheetsLoading(false);
  }

  async function loadWorkspaceItems(importSheetId: string) {
    setAreWorkspaceItemsLoading(true);
    setWorkspaceError(null);
    setWorkspaceSuccess(null);

    const { data, error } = await supabase
      .from("imported_orders")
      .select("*")
      .eq("import_sheet_id", importSheetId)
      .eq("is_removed", false)
      .order("source_row_number", { ascending: true });

    if (error) {
      setWorkspaceError("Nie udało się pobrać pozycji roboczych.");
      setWorkspaceItems([]);
      setAreWorkspaceItemsLoading(false);
      return;
    }

    setWorkspaceItems((data || []) as ImportedOrder[]);
    setAreWorkspaceItemsLoading(false);
  }

  async function loadUsedWorkspaceItemIds(importSheetId: string) {
    const { data, error } = await supabase
      .from("order_items")
      .select("imported_order_id, imported_orders!inner(import_sheet_id)")
      .eq("imported_orders.import_sheet_id", importSheetId);

    if (error) {
      setWorkspaceError("Nie udało się pobrać informacji o utworzonych zleceniach.");
      setUsedWorkspaceItemIds([]);
      return;
    }

    setUsedWorkspaceItemIds(
      Array.from(new Set((data || []).map((item) => item.imported_order_id).filter(Boolean))) as string[]
    );
  }

  async function updateWorkspaceItems(
    ids: string[],
    field: keyof ImportedOrder,
    value: string | number | null
  ) {
    setIsWorkspaceSaving(true);
    setWorkspaceError(null);
    setWorkspaceSuccess(null);

    for (const id of ids) {
      const { error } = await supabase
        .from("imported_orders")
        .update({ [field]: value })
        .eq("id", id);

      if (error) {
        setWorkspaceError("Nie udało się zapisać pozycji roboczej.");
        setIsWorkspaceSaving(false);
        return;
      }
    }

    setWorkspaceItems((current) =>
      current.map((item) => (ids.includes(item.id) ? { ...item, [field]: value } : item))
    );
    setWorkspaceSuccess("Pozycja robocza zaktualizowana");
    setIsWorkspaceSaving(false);
  }

  async function removeWorkspaceItem(id: string) {
    setIsWorkspaceSaving(true);
    setWorkspaceError(null);
    setWorkspaceSuccess(null);

    const { error } = await supabase.from("imported_orders").update({ is_removed: true }).eq("id", id);

    if (error) {
      setWorkspaceError("Nie udało się usunąć pozycji roboczej.");
      setIsWorkspaceSaving(false);
      return;
    }

    setWorkspaceItems((current) => current.filter((item) => item.id !== id));
    setIsWorkspaceSaving(false);
  }

  async function createOrderFromWorkspace({
    cityId,
    importBatchId,
    importSheetId,
    itemIds,
    orderName,
    notes,
    status,
    assignedTo,
    latitude,
    longitude,
    files
  }: {
    cityId: string;
    importBatchId: string;
    importSheetId: string;
    itemIds: string[];
    orderName: string;
    notes: string;
    status: Order["status"];
    assignedTo: string | null;
    latitude: number | null;
    longitude: number | null;
    files: File[];
  }) {
    setIsWorkspaceSaving(true);
    setWorkspaceError(null);
    setWorkspaceSuccess(null);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        city_id: cityId,
        import_batch_id: importBatchId,
        import_sheet_id: importSheetId,
        order_name: orderName || null,
        description: orderName || null,
        assigned_to: assignedTo,
        latitude,
        longitude,
        status,
        notes: notes || null,
        completed_at: status === "completed" ? new Date().toISOString() : null
      })
      .select("*")
      .single();

    if (orderError || !order) {
      setWorkspaceError("Nie udało się utworzyć zlecenia.");
      setIsWorkspaceSaving(false);
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      itemIds.map((importedOrderId) => ({
        order_id: order.id,
        imported_order_id: importedOrderId
      }))
    );

    if (itemsError) {
      setWorkspaceError("Nie udało się powiązać pozycji ze zleceniem.");
      setIsWorkspaceSaving(false);
      return;
    }

    const uploaded = await uploadOrderPhotos(order.id, files, "admin", setWorkspaceError);

    if (!uploaded) {
      setIsWorkspaceSaving(false);
      return;
    }

    await loadUsedWorkspaceItemIds(importSheetId);
    setWorkspaceSuccess("Zlecenie utworzone");
    setIsWorkspaceSaving(false);
    void loadCities();
  }

  async function uploadOrderPhotos(
    orderId: string,
    files: File[],
    stage: OrderPhoto["photo_stage"],
    setUploadError: (message: string) => void = setOrderError
  ) {
    if (!profile || files.length === 0) {
      return true;
    }

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${orderId}/${stage}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("order-photos")
        .upload(storagePath, file);

      if (uploadError) {
        setUploadError("Nie udało się przesłać zdjęcia.");
        return false;
      }

      const { error: photoError } = await supabase.from("order_photos").insert({
        order_id: orderId,
        storage_path: storagePath,
        uploaded_by: profile.id,
        photo_stage: stage
      });

      if (photoError) {
        setUploadError("Nie udało się zapisać informacji o zdjęciu.");
        return false;
      }
    }

    return true;
  }

  async function updateOrder(
    orderId: string,
    values: {
      assigned_to: string | null;
      order_name: string | null;
      description: string | null;
      notes: string | null;
      status: Order["status"];
      latitude: number | null;
      longitude: number | null;
    },
    files: File[]
  ) {
    setIsOrderSaving(true);
    setOrderError(null);
    setOrderSuccess(null);

    const { error } = await supabase
      .from("orders")
      .update({
        ...values,
        completed_at: values.status === "completed" ? new Date().toISOString() : null
      })
      .eq("id", orderId);

    if (error) {
      setOrderError("Nie udało się zapisać zlecenia.");
      setIsOrderSaving(false);
      return;
    }

    const uploaded = await uploadOrderPhotos(orderId, files, "admin");

    if (!uploaded) {
      setIsOrderSaving(false);
      return;
    }

    setOrderSuccess("Zlecenie zaktualizowane.");
    await loadOrders();
    setIsOrderSaving(false);
  }

  async function deleteOrder(orderId: string) {
    setIsOrderSaving(true);
    setOrderError(null);
    setOrderSuccess(null);

    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) {
      setOrderError("Nie udało się usunąć zlecenia.");
      setIsOrderSaving(false);
      return;
    }

    setOrderSuccess("Zlecenie usunięte.");
    await Promise.all([loadOrders(), loadPublicCities()]);
    setIsOrderSaving(false);
  }

  async function createOrderPhotoUrl(storagePath: string) {
    setOrderError(null);

    const { data, error } = await supabase.storage
      .from("order-photos")
      .createSignedUrl(storagePath, 60 * 10);

    if (error || !data?.signedUrl) {
      setOrderError("Nie udało się otworzyć zdjęcia.");
      return null;
    }

    return data.signedUrl;
  }

  async function completeOrder(
    orderId: string,
    { completionNotes, files }: { completionNotes: string; files: File[] }
  ) {
    setIsOrderSaving(true);
    setOrderError(null);
    setOrderSuccess(null);

    const { error } = await supabase
      .from("orders")
      .update({
        status: "completed",
        completion_notes: completionNotes.trim() || null,
        completed_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (error) {
      setOrderError("Nie udało się oznaczyć zlecenia jako zrealizowane.");
      setIsOrderSaving(false);
      return;
    }

    const uploaded = await uploadOrderPhotos(orderId, files, "completion");

    if (!uploaded) {
      setIsOrderSaving(false);
      return;
    }

    setOrderSuccess("Zlecenie oznaczone jako zrealizowane.");
    await loadOrders();
    setIsOrderSaving(false);
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="status-layout">
        <section className="status-card">
          <p className="section-kicker">Konfiguracja</p>
          <h1>Połącz aplikację z Supabase</h1>
          <p>
            Uzupełnij plik <code>.env</code> wartościami opisanymi w <code>.env.example</code>,
            a następnie uruchom aplikację ponownie.
          </p>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="status-layout">
        <section className="status-card status-card--loading">
          <span className="spinner" aria-hidden="true" />
          <h1>Ładowanie aplikacji</h1>
          <p>Sprawdzamy sesję i dane użytkownika.</p>
        </section>
      </main>
    );
  }

  if (profile) {
    if (appView === "admin" && profile.role === "admin") {
      return (
        <AdminPanelScreen
          onBack={() => setAppView("home")}
          onOpenAnnouncements={() => setAppView("announcements-admin")}
          onOpenOrders={() => setAppView("orders-admin")}
          onOpenModule={(title) => openModule(title, "admin")}
        />
      );
    }

    if (appView === "orders-admin" && profile.role === "admin") {
      return (
        <WorkOrderAdminScreen
          onBack={() => setAppView("admin")}
          onOpenCities={openCityManager}
          onOpenCreateOrders={openCreateOrders}
          onOpenImport={openOrderImport}
          onOpenModule={(title) =>
            title === "Mapa Zleceń" ? openOrdersMap("orders-admin") : openModule(title, "orders-admin")
          }
        />
      );
    }

    if (appView === "orders-list") {
      return (
        <OrdersListScreen
          cities={cities}
          currentProfile={profile}
          error={orderError}
          isLoading={areOrdersLoading}
          isSaving={isOrderSaving}
          orders={orders}
          photos={orderPhotos}
          profiles={assignableProfiles}
          publicItems={orderPublicItems}
          success={orderSuccess}
          onBack={() => setAppView("home")}
          onComplete={completeOrder}
          onCreatePhotoUrl={createOrderPhotoUrl}
          onDelete={deleteOrder}
          onUpdate={updateOrder}
        />
      );
    }

    if (appView === "orders-map") {
      return (
        <OrdersMapScreen
          cities={cities}
          isLoading={areOrdersLoading}
          orders={orders}
          onBack={() => setAppView(moduleBackView)}
        />
      );
    }

    if (appView === "create-orders" && profile.role === "admin") {
      return (
        <CreateOrdersScreen
          cities={cities}
          imports={workspaceImports}
          sheets={workspaceSheets}
          items={workspaceItems}
          usedItemIds={usedWorkspaceItemIds}
          profiles={assignableProfiles}
          areCitiesLoading={areCitiesLoading}
          areImportsLoading={areWorkspaceImportsLoading}
          areSheetsLoading={areWorkspaceSheetsLoading}
          areItemsLoading={areWorkspaceItemsLoading}
          isSaving={isWorkspaceSaving}
          error={workspaceError}
          success={workspaceSuccess}
          onBack={() => setAppView("orders-admin")}
          onLoadImports={loadWorkspaceImports}
          onLoadSheets={loadWorkspaceSheets}
          onLoadItems={loadWorkspaceItems}
          onLoadUsedItems={loadUsedWorkspaceItemIds}
          onUpdateItems={updateWorkspaceItems}
          onRemoveItem={removeWorkspaceItem}
          onCreateOrder={createOrderFromWorkspace}
        />
      );
    }

    if (appView === "orders-import" && profile.role === "admin") {
      return (
        <OrderImportScreen
          cities={cities}
          areCitiesLoading={areCitiesLoading}
          isImporting={isImporting}
          error={importError}
          onBack={() => setAppView("orders-admin")}
          onImport={createImport}
        />
      );
    }

    if (appView === "import-details" && profile.role === "admin" && selectedImport) {
      return (
        <ImportDetailsScreen
          batch={selectedImport.batch}
          city={selectedImport.city}
          sheets={selectedImport.sheets}
          message={importSuccess}
          onBack={() => setAppView("orders-admin")}
          onOpenSheet={openImportedSheet}
        />
      );
    }

    if (appView === "import-sheet" && profile.role === "admin" && selectedSheet) {
      return (
        <ImportSheetScreen
          sheet={selectedSheet}
          items={importedOrders}
          isLoading={areImportedOrdersLoading}
          isSaving={isImportedOrderSaving}
          error={importedOrderError}
          success={importedOrderSuccess}
          onBack={() => setAppView("import-details")}
          onUpdate={updateImportedOrder}
        />
      );
    }

    if (appView === "cities-admin" && profile.role === "admin") {
      return (
        <CityManagerScreen
          cities={cities}
          isLoading={areCitiesLoading}
          isSaving={isCitySaving}
          error={cityError}
          success={citySuccess}
          onBack={() => setAppView("orders-admin")}
          onCreate={createCity}
          onDelete={deleteCity}
        />
      );
    }

    if (appView === "announcements-admin" && profile.role === "admin") {
      return (
        <AnnouncementManagerScreen
          announcements={announcements}
          isLoading={areAnnouncementsLoading}
          isSaving={isAnnouncementSaving}
          error={announcementError}
          onBack={() => setAppView("admin")}
          onCreate={createAnnouncement}
          onUpdate={updateAnnouncement}
          onDelete={deleteAnnouncement}
        />
      );
    }

    if (appView === "module-placeholder") {
      return (
        <ModulePlaceholderScreen
          title={selectedModule}
          onBack={() => setAppView(moduleBackView)}
        />
      );
    }

    return (
      <HomeScreen
        profile={profile}
        announcements={announcements}
        areAnnouncementsLoading={areAnnouncementsLoading}
        isSigningOut={isSigningOut}
        onOpenAdminPanel={() => setAppView("admin")}
        onOpenModule={(title) =>
          title === "Zlecenia"
            ? openOrdersList()
            : title === "Mapa"
              ? openOrdersMap("home")
              : openModule(title, "home")
        }
        onSignOut={handleSignOut}
      />
    );
  }

  if (authView === "register") {
    return (
      <RegisterScreen
        onRegistrationSuccess={() => {
          setMessage(REGISTRATION_SUCCESS_MESSAGE);
          setAuthView("login");
        }}
        onShowLogin={() => {
          setMessage(null);
          setAuthView("login");
        }}
      />
    );
  }

  return (
    <LoginScreen
      message={message}
      onShowRegister={() => {
        setMessage(null);
        setAuthView("register");
      }}
    />
  );
}
