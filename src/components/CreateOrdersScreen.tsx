import { useEffect, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent, PointerEvent } from "react";
import type { CityWithStats, ImportBatch, ImportedOrder, ImportSheet, Order, Profile } from "../types/database";
import { AppIcon } from "./AppIcon";

type EditableColumn = {
  key: keyof ImportedOrder;
  label: string;
  type: "text" | "number";
};

type CreateOrderInput = {
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
};

type CreateOrdersScreenProps = {
  cities: CityWithStats[];
  imports: ImportBatch[];
  sheets: ImportSheet[];
  items: ImportedOrder[];
  usedItemIds: string[];
  profiles: Profile[];
  areCitiesLoading: boolean;
  areImportsLoading: boolean;
  areSheetsLoading: boolean;
  areItemsLoading: boolean;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  onBack: () => void;
  onLoadImports: (cityId: string) => Promise<void>;
  onLoadSheets: (importBatchId: string) => Promise<void>;
  onLoadItems: (sheetId: string) => Promise<void>;
  onLoadUsedItems: (sheetId: string) => Promise<void>;
  onUpdateItems: (
    ids: string[],
    field: keyof ImportedOrder,
    value: string | number | null
  ) => Promise<void>;
  onRemoveItem: (id: string) => Promise<void>;
  onCreateOrder: (input: CreateOrderInput) => Promise<void>;
};

const editableColumns: EditableColumn[] = [
  { key: "address", label: "Adres", type: "text" },
  { key: "decision_number", label: "Numer decyzji", type: "text" },
  { key: "case_number", label: "Znak sprawy", type: "text" },
  { key: "work_scope", label: "Zakres prac", type: "text" },
  { key: "species", label: "Gatunek", type: "text" },
  { key: "circumference", label: "Obwód", type: "text" },
  { key: "unit", label: "Jednostka", type: "text" },
  { key: "quantity", label: "Ilość", type: "number" },
  { key: "unit_price_net", label: "Cena netto", type: "number" },
  { key: "unit_price_gross", label: "Cena brutto", type: "number" },
  { key: "total_value_net", label: "Wartość netto", type: "number" },
  { key: "total_value_gross", label: "Wartość brutto", type: "number" },
  { key: "notes", label: "Uwagi", type: "text" }
];

function inputValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function normalizeCellValue(value: string, type: EditableColumn["type"]) {
  if (!value.trim()) {
    return null;
  }

  if (type === "number") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return value.trim();
}

function nullableNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesSearch(item: ImportedOrder, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    item.address,
    item.work_scope,
    item.species,
    item.decision_number,
    item.case_number,
    item.notes
  ].some((value) => String(value || "").toLowerCase().includes(normalized));
}

export function CreateOrdersScreen({
  cities,
  imports,
  sheets,
  items,
  usedItemIds,
  profiles,
  areCitiesLoading,
  areImportsLoading,
  areSheetsLoading,
  areItemsLoading,
  isSaving,
  error,
  success,
  onBack,
  onLoadImports,
  onLoadSheets,
  onLoadItems,
  onLoadUsedItems,
  onUpdateItems,
  onRemoveItem,
  onCreateOrder
}: CreateOrdersScreenProps) {
  const [cityId, setCityId] = useState("");
  const [importBatchId, setImportBatchId] = useState("");
  const [importSheetId, setImportSheetId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Array<keyof ImportedOrder>>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const visibleColumns = editableColumns.filter((column) => !hiddenColumns.includes(column.key));
  const filteredItems = useMemo(() => items.filter((item) => matchesSearch(item, query)), [items, query]);
  const usedItemIdSet = useMemo(() => new Set(usedItemIds), [usedItemIds]);
  const selectedItems = items.filter((item) => selectedIds.includes(item.id) && !usedItemIdSet.has(item.id));
  const visibleSelectableIds = filteredItems
    .filter((item) => !usedItemIdSet.has(item.id))
    .map((item) => item.id);

  useEffect(() => {
    setSelectedIds([]);
  }, [importSheetId]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => !usedItemIdSet.has(id)));
  }, [usedItemIdSet]);

  async function handleCityChange(value: string) {
    setCityId(value);
    setImportBatchId("");
    setImportSheetId("");
    setSelectedIds([]);

    if (value) {
      await onLoadImports(value);
    }
  }

  async function handleImportChange(value: string) {
    setImportBatchId(value);
    setImportSheetId("");
    setSelectedIds([]);

    if (value) {
      await onLoadSheets(value);
    }
  }

  async function handleSheetChange(value: string) {
    setImportSheetId(value);
    setSelectedIds([]);

    if (value) {
      await Promise.all([onLoadItems(value), onLoadUsedItems(value)]);
    }
  }

  async function handleCellCommit(item: ImportedOrder, column: EditableColumn, value: string) {
    const normalizedValue = normalizeCellValue(value, column.type);
    const idsToUpdate = selectedIds.includes(item.id) && selectedIds.length > 1 ? selectedIds : [item.id];
    await onUpdateItems(idsToUpdate, column.key, normalizedValue);
  }

  function toggleSelection(id: string) {
    if (usedItemIdSet.has(id)) {
      return;
    }

    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]
    );
  }

  function toggleAllVisible() {
    const allVisibleSelected =
      visibleSelectableIds.length > 0 && visibleSelectableIds.every((id) => selectedIds.includes(id));

    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleSelectableIds.includes(id))
        : Array.from(new Set([...current, ...visibleSelectableIds]))
    );
  }

  function handleOpenCreateOrder() {
    setFormError(null);

    if (!cityId) {
      setFormError("Nie wybrano miasta");
      return;
    }

    if (!importBatchId) {
      setFormError("Nie wybrano importu");
      return;
    }

    if (!importSheetId) {
      setFormError("Nie wybrano arkusza");
      return;
    }

    if (selectedIds.length === 0) {
      setFormError("Nie wybrano żadnych pozycji");
      return;
    }

    setIsModalOpen(true);
  }

  function startColumnResize(event: PointerEvent<HTMLSpanElement>, columnKey: keyof ImportedOrder) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = columnWidths[String(columnKey)] || 160;

    function handleMove(moveEvent: globalThis.PointerEvent) {
      const nextWidth = Math.max(110, Math.min(360, startWidth + moveEvent.clientX - startX));
      setColumnWidths((current) => ({ ...current, [String(columnKey)]: nextWidth }));
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return (
    <main className="home-layout">
      <div className="home-content app-screen">
        <button className="back-button" type="button" onClick={onBack}>
          <AppIcon name="arrow-right" size={17} />
          Powrót
        </button>

        <section className="hero-card hero-card--compact">
          <div className="hero-card__copy">
            <p className="section-kicker section-kicker--light">Tabela robocza</p>
            <h1>Twórz Zlecenia</h1>
            <span className="hero-card__status">
              <span />
              {selectedIds.length} zaznaczonych
            </span>
          </div>
        </section>

        <section className="announcements-section workspace-source-card">
          <div className="panel-heading">
            <span className="panel-heading__icon">
              <AppIcon name="clipboard" size={20} />
            </span>
            <div>
              <p className="section-kicker">Dane źródłowe</p>
              <h2>Wybierz zakres pracy</h2>
            </div>
          </div>

          <div className="workspace-filters">
            <label className="form-field">
              <span>Miasto</span>
              <select
                disabled={areCitiesLoading || isSaving}
                value={cityId}
                onChange={(event) => void handleCityChange(event.target.value)}
              >
                <option value="">{areCitiesLoading ? "Ładowanie miast..." : "Wybierz miasto"}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Import</span>
              <select
                disabled={!cityId || areImportsLoading || isSaving}
                value={importBatchId}
                onChange={(event) => void handleImportChange(event.target.value)}
              >
                <option value="">{areImportsLoading ? "Ładowanie importów..." : "Wybierz import"}</option>
                {imports.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.import_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Arkusz</span>
              <select
                disabled={!importBatchId || areSheetsLoading || isSaving}
                value={importSheetId}
                onChange={(event) => void handleSheetChange(event.target.value)}
              >
                <option value="">{areSheetsLoading ? "Ładowanie arkuszy..." : "Wybierz arkusz"}</option>
                {sheets.map((sheet) => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.sheet_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field import-search-field">
            <span>Szukaj</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Adres, zakres prac, gatunek, decyzja lub znak sprawy"
            />
          </label>

        </section>

        <section className="announcements-section workspace-action-card">
          <div className="panel-heading">
            <span className="panel-heading__icon">
              <AppIcon name="sparkles" size={20} />
            </span>
            <div>
              <p className="section-kicker">Akcje</p>
              <h2>Akcje na zaznaczonych wierszach</h2>
            </div>
          </div>

          <p className="workspace-help workspace-help--plain">
            Zaznacz jedną lub kilka pozycji, a następnie utwórz z nich właściwe zlecenie.
          </p>

          <div className="workspace-action-summary">
            <span>{selectedIds.length} zaznaczonych</span>
            <button className="button button--secondary button--compact" type="button" onClick={() => setSelectedIds([])}>
              Wyczyść zaznaczenie
            </button>
            <button className="button button--primary" type="button" onClick={handleOpenCreateOrder}>
              Utwórz zlecenie
            </button>
          </div>

          <div className="workspace-actions">
            {editableColumns.map((column) => (
              <button
                className="button button--secondary button--compact"
                key={column.key}
                type="button"
                onClick={() =>
                  setHiddenColumns((current) =>
                    current.includes(column.key)
                      ? current.filter((key) => key !== column.key)
                      : [...current, column.key]
                  )
                }
              >
                {hiddenColumns.includes(column.key) ? `Pokaż ${column.label}` : `Ukryj ${column.label}`}
              </button>
            ))}
          </div>

          {formError && <p className="form-message form-message--error">{formError}</p>}
          {error && <p className="form-message form-message--error">{error}</p>}
          {success && <p className="form-message form-message--success">{success}</p>}
        </section>

        <section className="announcements-section workspace-table-card">
          <div className="panel-heading">
            <span className="panel-heading__icon">
              <AppIcon name="clipboard" size={20} />
            </span>
            <div>
              <p className="section-kicker">Dane</p>
              <h2>Wiersze robocze</h2>
            </div>
          </div>
          {areItemsLoading ? (
            <p className="empty-state">Ładowanie pozycji roboczych...</p>
          ) : !importSheetId ? (
            <p className="empty-state">Wybierz miasto, import i arkusz, aby rozpocząć pracę.</p>
          ) : filteredItems.length === 0 ? (
            <p className="empty-state">Brak pozycji roboczych dla wybranego arkusza.</p>
          ) : (
            <div className="workspace-table-wrap">
              <p className="workspace-help">
                Naciśnij Enter, aby zapisać zmianę. Przy wielu zaznaczonych wierszach zmieni się ta sama
                kolumna.
              </p>
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        aria-label="Zaznacz widoczne pozycje"
                        checked={
                          visibleSelectableIds.length > 0 &&
                          visibleSelectableIds.every((id) => selectedIds.includes(id))
                        }
                        disabled={visibleSelectableIds.length === 0}
                        type="checkbox"
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th>Akcje</th>
                    {visibleColumns.map((column) => (
                      <th
                        key={column.key}
                        style={{ width: columnWidths[String(column.key)] || 160 }}
                      >
                        <span>{column.label}</span>
                        <span
                          aria-label={`Zmień szerokość ${column.label}`}
                          className="column-resizer"
                          role="separator"
                          onPointerDown={(event) => startColumnResize(event, column.key)}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isUsed = usedItemIdSet.has(item.id);
                    const rowClassName = [
                      selectedIds.includes(item.id) ? "workspace-row--selected" : "",
                      isUsed ? "workspace-row--used" : ""
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                    <tr className={rowClassName || undefined} key={item.id}>
                      <td>
                        <input
                          aria-label={`Zaznacz pozycję ${item.address || item.id}`}
                          checked={selectedIds.includes(item.id)}
                          disabled={isUsed}
                          type="checkbox"
                          onChange={() => toggleSelection(item.id)}
                        />
                      </td>
                      <td>
                        {isUsed && <span className="workspace-used-badge">Zlecenie utworzone</span>}
                        <button
                          className="button button--danger button--compact"
                          disabled={isSaving || isUsed}
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          Usuń
                        </button>
                      </td>
                      {visibleColumns.map((column) => (
                        <td key={column.key}>
                          <WorkspaceCellInput
                            column={column}
                            columnWidth={columnWidths[String(column.key)] || 160}
                            disabled={isSaving}
                            item={item}
                            onCommit={handleCellCommit}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="batch-toolbar" aria-label="Akcje na zaznaczonych wierszach">
        <span className="batch-toolbar__badge">{selectedIds.length} zaznaczonych</span>
        <button className="button button--secondary button--compact" type="button" onClick={() => setSelectedIds([])}>
          Wyczyść zaznaczenie
        </button>
        <button className="button button--primary button--compact" type="button" onClick={handleOpenCreateOrder}>
          Utwórz zlecenie
        </button>
      </div>

      {isModalOpen && (
        <CreateOrderModal
          isSaving={isSaving}
          profiles={profiles}
          selectedItems={selectedItems}
          onClose={() => setIsModalOpen(false)}
          onCreate={async (values) => {
            await onCreateOrder({
              cityId,
              importBatchId,
              importSheetId,
              itemIds: selectedIds,
              ...values
            });
            setSelectedIds([]);
            setIsModalOpen(false);
          }}
        />
      )}
    </main>
  );
}

function WorkspaceCellInput({
  column,
  columnWidth,
  disabled,
  item,
  onCommit
}: {
  column: EditableColumn;
  columnWidth: number;
  disabled: boolean;
  item: ImportedOrder;
  onCommit: (item: ImportedOrder, column: EditableColumn, value: string) => Promise<void>;
}) {
  const savedValue = inputValue(item[column.key]);
  const [draftValue, setDraftValue] = useState(savedValue);

  useEffect(() => {
    setDraftValue(savedValue);
  }, [savedValue]);

  async function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget;

    if (event.key === "Enter") {
      event.preventDefault();
      await onCommit(item, column, draftValue);
      input.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setDraftValue(savedValue);
      input.blur();
    }
  }

  return (
    <input
      disabled={disabled}
      style={{ width: Math.max(90, columnWidth - 24) }}
      type={column.type}
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onKeyDown={(event) => void handleKeyDown(event)}
    />
  );
}

function generatedOrderName(selectedItems: ImportedOrder[]) {
  const firstItem = selectedItems[0];
  const nameFromFirstItem = [firstItem?.address, firstItem?.work_scope].filter(Boolean).join(" - ");

  return nameFromFirstItem || `Zlecenie z ${selectedItems.length} pozycji`;
}

function CreateOrderModal({
  selectedItems,
  profiles,
  isSaving,
  onClose,
  onCreate
}: {
  selectedItems: ImportedOrder[];
  profiles: Profile[];
  isSaving: boolean;
  onClose: () => void;
  onCreate: (values: {
    orderName: string;
    notes: string;
    status: Order["status"];
    assignedTo: string | null;
    latitude: number | null;
    longitude: number | null;
    files: File[];
  }) => Promise<void>;
}) {
  const [orderName, setOrderName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Order["status"]>("active");
  const [assignedTo, setAssignedTo] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fallbackOrderName = generatedOrderName(selectedItems);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate({
      orderName: orderName.trim() || fallbackOrderName,
      notes: notes.trim(),
      status,
      assignedTo: assignedTo || null,
      latitude: nullableNumber(latitude),
      longitude: nullableNumber(longitude),
      files
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal-panel" role="dialog">
        <div className="panel-heading">
          <span className="panel-heading__icon">
            <AppIcon name="check" size={20} />
          </span>
          <div>
            <p className="section-kicker">Zlecenie</p>
            <h2>Utwórz właściwe zlecenie</h2>
          </div>
        </div>

        <div className="selected-items-preview">
          {selectedItems.map((item) => (
            <article key={item.id}>
              <strong>{item.address || "Brak adresu"}</strong>
              <span>{item.work_scope || "Brak zakresu prac"}</span>
            </article>
          ))}
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Nazwa/opis zlecenia</span>
            <input
              aria-label="Nazwa/opis zlecenia"
              value={orderName}
              onChange={(event) => setOrderName(event.target.value)}
              placeholder={fallbackOrderName}
              type="text"
            />
            <small>Jeśli zostawisz puste, aplikacja użyje: {fallbackOrderName}</small>
          </label>
          <label className="form-field">
            <span>Uwagi</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as Order["status"])}>
              <option value="active">active</option>
              <option value="completed">completed</option>
            </select>
          </label>
          <div className="workspace-filters">
            <label className="form-field">
              <span>Latitude</span>
              <input value={latitude} onChange={(event) => setLatitude(event.target.value)} />
            </label>
            <label className="form-field">
              <span>Longitude</span>
              <input value={longitude} onChange={(event) => setLongitude(event.target.value)} />
            </label>
          </div>
          <label className="form-field">
            <span>Zdjęcia</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              multiple
              type="file"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
            />
          </label>
          <label className="form-field">
            <span>Przypisany użytkownik</span>
            <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
              <option value="">Nie przypisano</option>
              {profiles
                .filter((profile) => profile.role !== "admin")
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.first_name} {profile.last_name} · {profile.phone}
                  </option>
                ))}
            </select>
          </label>

          <div className="button-row">
            <button className="button button--primary" disabled={isSaving} type="submit">
              {isSaving ? "Zapisywanie..." : "Utwórz zlecenie"}
            </button>
            <button className="button button--secondary" type="button" onClick={onClose}>
              Anuluj
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
