import type { CityWithStats, ImportBatch, ImportSheet } from "../types/database";
import { AppIcon } from "./AppIcon";

type ImportDetailsScreenProps = {
  batch: ImportBatch;
  city: CityWithStats | null;
  sheets: ImportSheet[];
  message: string | null;
  onBack: () => void;
  onOpenSheet: (sheet: ImportSheet) => void;
};

function sourceTypeLabel(value: string) {
  return value === "wide_cost_table" ? "Tabela kosztorysowa / szeroka" : "Tabela wierszowa";
}

export function ImportDetailsScreen({
  batch,
  city,
  sheets,
  message,
  onBack,
  onOpenSheet
}: ImportDetailsScreenProps) {
  return (
    <main className="home-layout">
      <div className="home-content app-screen">
        <button className="back-button" type="button" onClick={onBack}>
          <AppIcon name="arrow-right" size={17} />
          Powrót
        </button>

        <section className="hero-card hero-card--compact">
          <div className="hero-card__copy">
            <p className="section-kicker section-kicker--light">Szczegóły importu</p>
            <h1>{batch.import_name}</h1>
            <span className="hero-card__status">
              <span />
              {message || "Import zapisany"}
            </span>
          </div>
        </section>

        <section className="announcements-section">
          <div className="panel-heading">
            <span className="panel-heading__icon">
              <AppIcon name="clipboard" size={20} />
            </span>
            <div>
              <p className="section-kicker">Podsumowanie</p>
              <h2>Dane pliku</h2>
            </div>
          </div>

          <dl className="import-summary-grid">
            <div>
              <dt>Miasto</dt>
              <dd>{city?.name || "Nieznane"}</dd>
            </div>
            <div>
              <dt>Nazwa importu</dt>
              <dd>{batch.import_name}</dd>
            </div>
            <div>
              <dt>Plik XLSX</dt>
              <dd>{batch.original_filename || "-"}</dd>
            </div>
            <div>
              <dt>Typ tabeli</dt>
              <dd>{sourceTypeLabel(batch.source_type)}</dd>
            </div>
            <div>
              <dt>Liczba arkuszy</dt>
              <dd>{batch.sheets_count}</dd>
            </div>
            <div>
              <dt>Pozycje robocze</dt>
              <dd>{batch.total_imported_rows_count}</dd>
            </div>
          </dl>
        </section>

        <section className="shortcut-section">
          <div className="sheet-card-grid">
            {sheets.map((sheet) => (
              <article className="sheet-card" key={sheet.id}>
                <p className="section-kicker">Arkusz</p>
                <h3>{sheet.sheet_name}</h3>
                <dl className="city-stats">
                  <div>
                    <dt>Typ tabeli</dt>
                    <dd>{sourceTypeLabel(sheet.source_type)}</dd>
                  </div>
                  <div>
                    <dt>Pozycje robocze</dt>
                    <dd>{sheet.imported_rows_count}</dd>
                  </div>
                  <div>
                    <dt>Utworzone zlecenia</dt>
                    <dd>{sheet.created_orders_count}</dd>
                  </div>
                  <div>
                    <dt>Pominięte wiersze</dt>
                    <dd>{sheet.skipped_rows_count}</dd>
                  </div>
                </dl>
                <button className="button button--secondary" type="button" onClick={() => onOpenSheet(sheet)}>
                  Otwórz arkusz
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
