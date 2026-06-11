import { FormEvent, useState } from "react";
import type { CityWithStats } from "../types/database";
import { AppIcon } from "./AppIcon";

type CityManagerScreenProps = {
  cities: CityWithStats[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  onBack: () => void;
  onCreate: (name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
};

export function CityManagerScreen({
  cities,
  isLoading,
  isSaving,
  error,
  success,
  onBack,
  onCreate,
  onDelete
}: CityManagerScreenProps) {
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Wpisz nazwę miasta.");
      return;
    }

    const wasCreated = await onCreate(name);

    if (wasCreated) {
      setName("");
    }
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
            <p className="section-kicker section-kicker--light">Miasta</p>
            <h1>Dodaj Miasto</h1>
            <span className="hero-card__status">
              <span />
              Statystyki zleceń
            </span>
          </div>
        </section>

        <section className="city-manager-layout">
          <form className="admin-form-card form-stack" onSubmit={handleSubmit} noValidate>
            <div className="panel-heading">
              <span className="panel-heading__icon">
                <AppIcon name="map-pin" size={20} />
              </span>
              <div>
                <p className="section-kicker">Nowe miasto</p>
                <h2>Nazwa miasta</h2>
              </div>
            </div>

            <label className="form-field">
              <span>Nazwa miasta</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="np. Katowice"
              />
            </label>

            {formError && <p className="form-message form-message--error">{formError}</p>}
            {error && <p className="form-message form-message--error">{error}</p>}
            {success && <p className="form-message form-message--success">{success}</p>}

            <button className="button button--primary" type="submit" disabled={isSaving}>
              {isSaving ? "Zapisywanie..." : "DODAJ MIASTO"}
            </button>
          </form>

          <section className="city-list-panel">
            <div className="panel-heading">
              <span className="panel-heading__icon">
                <AppIcon name="clipboard" size={20} />
              </span>
              <div>
                <p className="section-kicker">Lista</p>
                <h2>Utworzone miasta</h2>
              </div>
            </div>

            {isLoading ? (
              <p className="empty-state">Ładowanie miast...</p>
            ) : cities.length === 0 ? (
              <p className="empty-state">Brak utworzonych miast.</p>
            ) : (
              <div className="city-list">
                {cities.map((city) => (
                  <article className="city-card" key={city.id}>
                    <div className="city-card__header">
                      <h3>{city.name}</h3>
                      <button
                        className="button button--danger"
                        type="button"
                        disabled={isSaving}
                        onClick={() => onDelete(city.id)}
                      >
                        Usuń
                      </button>
                    </div>

                    <dl className="city-stats">
                      <div>
                        <dt>Łącznie zleceń</dt>
                        <dd>{city.total_orders}</dd>
                      </div>
                      <div>
                        <dt>Zakończone</dt>
                        <dd>{city.completed_orders}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
