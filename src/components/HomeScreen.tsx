import { Profile } from "../types/database";
import type { Announcement } from "../types/database";
import { AnnouncementsSection } from "./AnnouncementsSection";
import { AppIcon } from "./AppIcon";

type HomeScreenProps = {
  profile: Profile;
  announcements: Announcement[];
  areAnnouncementsLoading: boolean;
  isSigningOut: boolean;
  onOpenAdminPanel: () => void;
  onOpenModule: (title: string) => void;
  onSignOut: () => void;
};

const userShortcuts = [
  { name: "Zlecenia", description: "Lista zleceń do realizacji", icon: "clipboard" as const },
  { name: "Mapa", description: "Podgląd lokalizacji", icon: "map-pin" as const },
  { name: "Kalendarz", description: "Plan pracy i dostępność", icon: "chart" as const }
];

const adminShortcuts = [
  { name: "Zlecenia", description: "Zlecenia w systemie", icon: "clipboard" as const },
  { name: "Mapa", description: "Podgląd lokalizacji", icon: "map-pin" as const },
  { name: "Panel Administratora", description: "Zarządzanie aplikacją", icon: "shield" as const }
];

export function HomeScreen({
  profile,
  announcements,
  areAnnouncementsLoading,
  isSigningOut,
  onOpenAdminPanel,
  onOpenModule,
  onSignOut
}: HomeScreenProps) {
  const shortcuts = profile.role === "admin" ? adminShortcuts : userShortcuts;

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
          <p className="shortcut-section__hint">Przesuń palcem, aby zobaczyć kolejne moduły.</p>
          <div className="shortcut-grid">
            {shortcuts.map((shortcut) => (
              <button
                className="shortcut-card shortcut-card--button"
                key={shortcut.name}
                type="button"
                onClick={() =>
                  shortcut.name === "Panel Administratora"
                    ? onOpenAdminPanel()
                    : onOpenModule(shortcut.name)
                }
              >
                <span className="shortcut-card__icon" aria-hidden="true">
                  <AppIcon name={shortcut.icon} size={22} />
                </span>
                <h3>{shortcut.name}</h3>
                <p>{shortcut.description}</p>
                <span className="shortcut-card__footer">
                  <span className="shortcut-card__status">Wkrótce</span>
                  <AppIcon name="arrow-right" size={16} />
                </span>
              </button>
            ))}
          </div>
        </section>

        <AnnouncementsSection
          announcements={announcements}
          isLoading={areAnnouncementsLoading}
        />
      </div>
    </main>
  );
}
