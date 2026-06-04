import { AppIcon } from "./AppIcon";

const benefits = [
  "Logowanie numerem telefonu",
  "Bezpieczny dostęp do konta",
  "Wygodna obsługa na telefonie"
];

export function AuthShowcase() {
  return (
    <aside className="auth-showcase">
      <div className="auth-showcase__glow" />
      <span className="auth-showcase__badge">
        <AppIcon name="sparkles" size={16} />
        Panel pracownika
      </span>
      <div className="auth-showcase__content">
        <p className="auth-showcase__eyebrow">KROLL WORKSPACE</p>
        <h2>Wszystko, czego potrzebujesz w pracy, w jednym miejscu.</h2>
        <p>
          Szybki dostęp do najważniejszych informacji oraz modułów przygotowanych
          pod dalszy rozwój aplikacji.
        </p>
      </div>
      <div className="auth-showcase__benefits">
        {benefits.map((benefit) => (
          <div className="auth-showcase__benefit" key={benefit}>
            <span>
              <AppIcon name="check" size={15} />
            </span>
            {benefit}
          </div>
        ))}
      </div>
    </aside>
  );
}
