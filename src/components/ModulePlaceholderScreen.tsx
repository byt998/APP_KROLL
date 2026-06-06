import { AppIcon } from "./AppIcon";

type ModulePlaceholderScreenProps = {
  title: string;
  onBack: () => void;
};

export function ModulePlaceholderScreen({ title, onBack }: ModulePlaceholderScreenProps) {
  return (
    <main className="home-layout">
      <div className="home-content app-screen">
        <button className="back-button" type="button" onClick={onBack}>
          <AppIcon name="arrow-right" size={17} />
          Powrót
        </button>

        <section className="placeholder-card">
          <span className="panel-heading__icon">
            <AppIcon name="settings" size={22} />
          </span>
          <p className="section-kicker">Moduł</p>
          <h1>{title}</h1>
          <p>Moduł w przygotowaniu.</p>
        </section>
      </div>
    </main>
  );
}
