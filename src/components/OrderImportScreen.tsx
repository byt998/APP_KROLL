import { FormEvent, useState } from "react";
import type { CityWithStats, ImportSourceType } from "../types/database";
import { AppIcon } from "./AppIcon";

type OrderImportScreenProps = {
  cities: CityWithStats[];
  areCitiesLoading: boolean;
  isImporting: boolean;
  error: string | null;
  onBack: () => void;
  onImport: (params: {
    cityId: string;
    importName: string;
    sourceType: ImportSourceType;
    file: File;
  }) => Promise<void>;
};

export function OrderImportScreen({
  cities,
  areCitiesLoading,
  isImporting,
  error,
  onBack,
  onImport
}: OrderImportScreenProps) {
  const [cityId, setCityId] = useState("");
  const [importName, setImportName] = useState("");
  const [sourceType, setSourceType] = useState<ImportSourceType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!cityId) {
      setFormError("Nie wybrano miasta");
      return;
    }

    if (!importName.trim()) {
      setFormError("Nie wpisano nazwy importu");
      return;
    }

    if (!sourceType) {
      setFormError("Nie wybrano typu tabeli");
      return;
    }

    if (!file) {
      setFormError("Nie wybrano pliku XLSX");
      return;
    }

    await onImport({
      cityId,
      importName: importName.trim(),
      sourceType,
      file
    });
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
            <p className="section-kicker section-kicker--light">Import</p>
            <h1>Importuj Zlecenia</h1>
            <span className="hero-card__status">
              <span />
              XLSX
            </span>
          </div>
        </section>

        <section className="admin-form-card import-form-card">
          <div className="panel-heading">
            <span className="panel-heading__icon">
              <AppIcon name="clipboard" size={20} />
            </span>
            <div>
              <p className="section-kicker">Plik XLSX</p>
              <h2>Dane importu</h2>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <label className="form-field">
              <span>Miasto</span>
              <select
                disabled={areCitiesLoading || isImporting}
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
              >
                <option value="">
                  {areCitiesLoading ? "Ładowanie miast..." : "Wybierz miasto"}
                </option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Nazwa importu</span>
              <input
                type="text"
                value={importName}
                onChange={(event) => setImportName(event.target.value)}
                placeholder="np. Katowice - Maj 2026"
              />
            </label>

            <label className="form-field">
              <span>Typ tabeli</span>
              <select
                disabled={isImporting}
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value as ImportSourceType | "")}
              >
                <option value="">Wybierz typ tabeli</option>
                <option value="row_table">Tabela wierszowa</option>
                <option value="wide_cost_table">Tabela kosztorysowa / szeroka</option>
              </select>
            </label>

            <label className="form-field">
              <span>Plik XLSX</span>
              <input
                accept=".xlsx,.xls"
                disabled={isImporting}
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>

            {formError && <p className="form-message form-message--error">{formError}</p>}
            {error && <p className="form-message form-message--error">{error}</p>}

            <button className="button button--primary" disabled={isImporting} type="submit">
              {isImporting ? "Importowanie..." : "IMPORTUJ"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
