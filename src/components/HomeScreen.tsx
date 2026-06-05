import { Profile } from "../types/database";
import { AppIcon } from "./AppIcon";

type HomeScreenProps = {
  profile: Profile;
  isSigningOut: boolean;
  onSignOut: () => void;
};

const shortcuts = [
  { name: "Zadania", description: "Lista bieżących zadań", icon: "clipboard" as const },
  { name: "Mapa", description: "Lokalizacje i dojazdy", icon: "map-pin" as const },
  { name: "Raporty", description: "Podsumowania pracy", icon: "chart" as const },
  { name: "Ustawienia", description: "Ustawienia aplikacji", icon: "settings" as const }
];

export function HomeScreen({ profile, isSigningOut, onSignOut }: HomeScreenProps) {
  return (
    <main className="home-layout">
      <header className="home-header">
        <div className="home-header__content">
          <div className="home-header__identity">
            <span className="home-header__mark">K</span>
            <div>
              <p className="home-header__brand">KROLL</p>
              <p className="home-header__eyebrow">Panel pracownika</p>
            </div>
          </div>
          <button
            className="button button--light"
            type="button"
            onClick={onSignOut}
            disabled={isSigningOut}
          >
            <AppIcon name="sign-out" size={17} />
            {isSigningOut ? "Wylogowanie..." : "Wyloguj"}
          </button>
        </div>
      </header>

      <div className="home-content">
        <section className="hero-card">
          <div className="hero-card__copy">
            <p className="section-kicker section-kicker--light">Strona główna</p>
            <h1>Witaj, {profile.first_name || "Użytkowniku"}</h1>
            <span className="hero-card__status">
              <span />
              Konto aktywne
            </span>
          </div>
          <div className="hero-card__visual">
            <span className="hero-card__sparkle">
              <AppIcon name="sparkles" size={24} />
            </span>
            <span className="hero-card__avatar">
              {(profile.first_name || "U").slice(0, 1).toUpperCase()}
            </span>
          </div>
        </section>

        <section className="shortcut-section">
          <div className="panel-heading">
            <span className="panel-heading__icon">
              <AppIcon name="sparkles" size={20} />
            </span>
            <div>
              <p className="section-kicker">Szybki dostęp</p>
              <h2>Moduły aplikacji</h2>
            </div>
          </div>
          <p className="shortcut-section__hint">Przesuń palcem, aby zobaczyć kolejne moduły.</p>
          <div className="shortcut-grid">
            {shortcuts.map((shortcut) => (
              <article className="shortcut-card" key={shortcut.name}>
                <span className="shortcut-card__icon" aria-hidden="true">
                  <AppIcon name={shortcut.icon} size={22} />
                </span>
                <h3>{shortcut.name}</h3>
                <p>{shortcut.description}</p>
                <span className="shortcut-card__footer">
                  <span className="shortcut-card__status">Wkrótce</span>
                  <AppIcon name="arrow-right" size={16} />
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
