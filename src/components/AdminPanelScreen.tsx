import { AppIcon } from "./AppIcon";

type AdminPanelScreenProps = {
  onBack: () => void;
  onOpenAnnouncements: () => void;
  onOpenOrders: () => void;
  onOpenModule: (title: string) => void;
};

const adminShortcuts = [
  { name: "ZARZĄDZAJ ZLECENIAMI", icon: "clipboard" as const },
  { name: "DODAJ KOMUNIKAT", icon: "sparkles" as const },
  { name: "ZARZĄDZAJ PRACOWNIKAMI", icon: "user" as const },
  { name: "MAPA ZLECEŃ", icon: "map-pin" as const }
];

export function AdminPanelScreen({
  onBack,
  onOpenAnnouncements,
  onOpenOrders,
  onOpenModule
}: AdminPanelScreenProps) {
  return (
    <main className="home-layout">
      <div className="home-content app-screen">
        <button className="back-button" type="button" onClick={onBack}>
          <AppIcon name="arrow-right" size={17} />
          Powrót
        </button>

        <section className="hero-card hero-card--compact">
          <div className="hero-card__copy">
            <p className="section-kicker section-kicker--light">Panel administratora</p>
            <h1>Zarządzanie</h1>
            <span className="hero-card__status">
              <span />
              Dostęp admina
            </span>
          </div>
        </section>

        <section className="shortcut-section">
          <div className="shortcut-grid">
            {adminShortcuts.map((shortcut) => (
              <button
                className="shortcut-card shortcut-card--button"
                key={shortcut.name}
                type="button"
                onClick={() =>
                  shortcut.name === "DODAJ KOMUNIKAT"
                    ? onOpenAnnouncements()
                    : shortcut.name === "ZARZĄDZAJ ZLECENIAMI"
                      ? onOpenOrders()
                    : onOpenModule(shortcut.name)
                }
              >
                <span className="shortcut-card__icon" aria-hidden="true">
                  <AppIcon name={shortcut.icon} size={22} />
                </span>
                <h3>{shortcut.name}</h3>
                <span className="shortcut-card__footer">
                  <span className="shortcut-card__status">
                    {shortcut.name === "DODAJ KOMUNIKAT" ||
                    shortcut.name === "ZARZĄDZAJ ZLECENIAMI"
                      ? "Otwórz"
                      : "Wkrótce"}
                  </span>
                  <AppIcon name="arrow-right" size={16} />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
