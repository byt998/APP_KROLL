import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ImportedOrder, ImportSheet } from "../types/database";
import { AppIcon } from "./AppIcon";

type ImportSheetScreenProps = {
  sheet: ImportSheet;
  items: ImportedOrder[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  onBack: () => void;
  onUpdate: (id: string, values: Partial<ImportedOrder>) => Promise<void>;
};

const editableTextFields = [
  ["address", "Adres"],
  ["decision_number", "Numer decyzji"],
  ["case_number", "Znak sprawy"],
  ["work_scope", "Zakres prac"],
  ["species", "Gatunek"],
  ["circumference", "Obwód"],
  ["unit", "Jednostka"],
  ["notes", "Uwagi"]
] as const;

const editableNumberFields = [
  ["quantity", "Ilość"],
  ["unit_price_net", "Cena netto"],
  ["unit_price_gross", "Cena brutto"],
  ["total_value_net", "Wartość netto"],
  ["total_value_gross", "Wartość brutto"]
] as const;

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
    item.case_number
  ].some((value) => String(value || "").toLowerCase().includes(normalized));
}

function valueForInput(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

export function ImportSheetScreen({
  sheet,
  items,
  isLoading,
  isSaving,
  error,
  success,
  onBack,
  onUpdate
}: ImportSheetScreenProps) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ImportedOrder | null>(null);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesSearch(item, query)),
    [items, query]
  );

  return (
    <main className="home-layout">
      <div className="home-content app-screen">
        <button className="back-button" type="button" onClick={onBack}>
          <AppIcon name="arrow-right" size={17} />
          Powrót
        </button>

        <section className="hero-card hero-card--compact">
          <div className="hero-card__copy">
            <p className="section-kicker section-kicker--light">Arkusz</p>
            <h1>{sheet.sheet_name}</h1>
            <span className="hero-card__status">
              <span />
              {sheet.imported_rows_count} pozycji
            </span>
          </div>
        </section>

        <section className="announcements-section">
          <div className="panel-heading">
            <span className="panel-heading__icon">
              <AppIcon name="clipboard" size={20} />
            </span>
            <div>
              <p className="section-kicker">Pozycje robocze</p>
              <h2>Praca na arkuszu</h2>
            </div>
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

          {error && <p className="form-message form-message--error">{error}</p>}
          {success && <p className="form-message form-message--success">{success}</p>}

          {isLoading ? (
            <p className="empty-state">Ładowanie pozycji roboczych...</p>
          ) : filteredItems.length === 0 ? (
            <p className="empty-state">Brak pozycji roboczych dla tego arkusza.</p>
          ) : (
            <div className="imported-order-list">
              {filteredItems.map((item) => (
                <article className="imported-order-card" key={item.id}>
                  <div>
                    <p className="section-kicker">Wiersz {item.source_row_number || "-"}</p>
                    <h3>{item.address || "Brak adresu"}</h3>
                    <p>{item.work_scope || "Brak zakresu prac"}</p>
                  </div>
                  <dl className="city-stats">
                    <div>
                      <dt>Gatunek</dt>
                      <dd>{item.species || "-"}</dd>
                    </div>
                    <div>
                      <dt>Ilość</dt>
                      <dd>{item.quantity ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Wartość brutto</dt>
                      <dd>{item.total_value_gross ?? "-"}</dd>
                    </div>
                  </dl>
                  <button className="button button--secondary" type="button" onClick={() => setEditing(item)}>
                    Edytuj
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <EditImportedOrderModal
          item={editing}
          isSaving={isSaving}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            await onUpdate(editing.id, values);
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}

function EditImportedOrderModal({
  item,
  isSaving,
  onClose,
  onSave
}: {
  item: ImportedOrder;
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: Partial<ImportedOrder>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft(
      [...editableTextFields, ...editableNumberFields].reduce<Record<string, string>>(
        (result, [field]) => {
          result[field] = valueForInput(item[field]);
          return result;
        },
        {}
      )
    );
  }, [item]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const values: Partial<ImportedOrder> = {};

    editableTextFields.forEach(([field]) => {
      values[field] = draft[field]?.trim() || null;
    });

    editableNumberFields.forEach(([field]) => {
      const value = draft[field]?.trim();
      values[field] = value ? Number(value.replace(",", ".")) : null;
    });

    await onSave(values);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal-panel" role="dialog">
        <div className="panel-heading">
          <span className="panel-heading__icon">
            <AppIcon name="settings" size={20} />
          </span>
          <div>
            <p className="section-kicker">Edycja</p>
            <h2>Pozycja robocza</h2>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-grid">
            {editableTextFields.map(([field, label]) => (
              <label className="form-field" key={field}>
                <span>{label}</span>
                <input
                  type="text"
                  value={draft[field] || ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              </label>
            ))}
            {editableNumberFields.map(([field, label]) => (
              <label className="form-field" key={field}>
                <span>{label}</span>
                <input
                  type="number"
                  value={draft[field] || ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>

          <div className="button-row">
            <button className="button button--primary" disabled={isSaving} type="submit">
              {isSaving ? "Zapisywanie..." : "Zapisz"}
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
