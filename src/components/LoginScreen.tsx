import { FormEvent, useEffect, useState } from "react";
import { isValidPolishPhone, phoneToAuthEmail } from "../lib/authHelpers";
import { supabase } from "../lib/supabaseClient";
import { AuthShowcase } from "./AuthShowcase";
import { Brand } from "./Brand";

type LoginScreenProps = {
  message?: string | null;
  onShowRegister: () => void;
};

export function LoginScreen({ message, onShowRegister }: LoginScreenProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
  }, [message]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!phone.trim() || !password) {
      setError("Wypełnij wszystkie pola.");
      return;
    }

    if (!isValidPolishPhone(phone)) {
      setError("Podaj poprawny numer telefonu.");
      return;
    }

    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: phoneToAuthEmail(phone),
      password
    });

    if (signInError) {
      setError("Nieprawidłowy numer telefonu lub hasło.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <div className="auth-shell">
        <AuthShowcase />
        <section className="auth-card">
          <Brand description="Panel pracownika" />
          <div className="auth-card__intro">
            <span className="auth-card__pill">Witaj ponownie</span>
            <h1>Zaloguj się</h1>
            <p>Wpisz numer telefonu oraz hasło, aby przejść do aplikacji.</p>
          </div>

          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <label className="form-field">
              <span>Numer telefonu</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="500 600 700"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Hasło</span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Wpisz hasło"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {message && <p className="form-message form-message--success">{message}</p>}
            {error && <p className="form-message form-message--error">{error}</p>}

            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logowanie..." : "Zaloguj"}
            </button>
          </form>

          <button className="text-button" type="button" onClick={onShowRegister}>
            Nie masz konta? <strong>Zarejestruj się</strong>
          </button>
        </section>
      </div>
    </main>
  );
}
