import { FormEvent, useState } from "react";
import { isValidPolishPhone, normalizePhone, phoneToAuthEmail } from "../lib/authHelpers";
import { supabase } from "../lib/supabaseClient";
import { AuthShowcase } from "./AuthShowcase";
import { Brand } from "./Brand";

type RegisterScreenProps = {
  onRegistrationSuccess: () => void;
  onShowLogin: () => void;
};

export function RegisterScreen({
  onRegistrationSuccess,
  onShowLogin
}: RegisterScreenProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [repeatedPassword, setRepeatedPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !phone.trim() ||
      !password ||
      !repeatedPassword
    ) {
      setError("Wypełnij wszystkie pola.");
      return;
    }

    if (!isValidPolishPhone(phone)) {
      setError("Podaj poprawny numer telefonu.");
      return;
    }

    if (password.length < 6) {
      setError("Hasło musi mieć minimum 6 znaków.");
      return;
    }

    if (password !== repeatedPassword) {
      setError("Hasła muszą być takie same.");
      return;
    }

    setIsSubmitting(true);
    const normalizedPhone = normalizePhone(phone);

    const { data: canRegister, error: allowlistError } = await supabase.rpc(
      "can_register_phone",
      { phone_input: normalizedPhone }
    );

    if (allowlistError) {
      setError("Nie udało się sprawdzić numeru telefonu. Spróbuj ponownie.");
      setIsSubmitting(false);
      return;
    }

    if (!canRegister) {
      setError(
        "Twój numer nie widnieje w bazie danych. Skontaktuj się z administratorem."
      );
      setIsSubmitting(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: phoneToAuthEmail(phone),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: normalizedPhone
        }
      }
    });

    if (signUpError) {
      setError("Nie udało się utworzyć konta. Sprawdź dane lub skontaktuj się z administratorem.");
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      await supabase.auth.signOut();
    }

    onRegistrationSuccess();
  }

  return (
    <main className="auth-layout">
      <div className="auth-shell auth-shell--register">
        <AuthShowcase />
        <section className="auth-card auth-card--wide">
          <Brand />
          <div className="auth-card__intro">
            <span className="auth-card__pill">Nowe konto</span>
            <h1>Rejestracja</h1>
            <p>Uzupełnij dane. Numer telefonu musi być wcześniej dodany przez administratora.</p>
          </div>

          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <label className="form-field">
                <span>Imię</span>
                <input
                  type="text"
                  autoComplete="given-name"
                  placeholder="Jan"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Nazwisko</span>
                <input
                  type="text"
                  autoComplete="family-name"
                  placeholder="Kowalski"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </label>
            </div>
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
                autoComplete="new-password"
                placeholder="Minimum 6 znaków"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Powtórz hasło</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Wpisz hasło ponownie"
                value={repeatedPassword}
                onChange={(event) => setRepeatedPassword(event.target.value)}
              />
            </label>

            {error && <p className="form-message form-message--error">{error}</p>}

            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Tworzenie konta..." : "Zarejestruj"}
            </button>
          </form>

          <button className="text-button" type="button" onClick={onShowLogin}>
            Masz już konto? <strong>Zaloguj się</strong>
          </button>
        </section>
      </div>
    </main>
  );
}
