import { AppIcon } from "./AppIcon";

type WorkOrderAdminScreenProps = {
  onBack: () => void;
  onOpenCities: () => void;
  onOpenCreateOrders: () => void;
  onOpenImport: () => void;
  onOpenModule: (title: string) => void;
};

const orderShortcuts = [
  {
    name: "Dodaj Miasto",
    description: "Zarządzaj miastami i statystykami zleceń.",
    icon: "map-pin" as const
  },
  {
    name: "Importuj Zlecenia",
    description: "Wczytywanie zleceń z plików.",
    icon: "clipboard" as const
  },
  {
    name: "Twórz Zlecenia",
    description: "Ręczne tworzenie nowych zleceń.",
    icon: "sparkles" as const
  },
  {
    name: "Mapa Zleceń",
    description: "Widok zleceń na mapie.",
    icon: "map-pin" as const
  }
];

export function WorkOrderAdminScreen({
  onBack,
  onOpenCities,
  onOpenCreateOrders,
  onOpenImport,
  onOpenModule
}: WorkOrderAdminScreenProps) {
  return (
    <main className="home-layout">
      <div className="home-content app-screen">
        <button className="back-button" type="button" onClick={onBack}>
          <AppIcon name="arrow-right" size={17} />
          Powrót
        </button>

        <section className="hero-card hero-card--compact">
          <div className="hero-card__copy">
            <p className="section-kicker section-kicker--light">Zlecenia</p>
            <h1>Zarządzanie zleceniami</h1>
            <span className="hero-card__status">
              <span />
              Panel admina
            </span>
          </div>
        </section>

        <section className="shortcut-section">
          <div className="shortcut-grid">
            {orderShortcuts.map((shortcut) => (
              <button
                className="shortcut-card shortcut-card--button"
                key={shortcut.name}
                type="button"
                onClick={() =>
                  shortcut.name === "Dodaj Miasto"
                    ? onOpenCities()
                    : shortcut.name === "Importuj Zlecenia"
                      ? onOpenImport()
                      : shortcut.name === "Twórz Zlecenia"
                        ? onOpenCreateOrders()
                    : onOpenModule(shortcut.name)
                }
              >
                <span className="shortcut-card__icon" aria-hidden="true">
                  <AppIcon name={shortcut.icon} size={22} />
                </span>
                <h3>{shortcut.name}</h3>
                <p>{shortcut.description}</p>
                <span className="shortcut-card__footer">
                  <span className="shortcut-card__status">
                    {shortcut.name === "Dodaj Miasto" ||
                    shortcut.name === "Importuj Zlecenia" ||
                    shortcut.name === "Twórz Zlecenia"
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
