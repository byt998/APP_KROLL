import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";

const { rpc, signInWithPassword, signOut, signUp } = vi.hoisted(() => ({
  rpc: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn()
}));

vi.mock("../lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc,
    auth: {
      signInWithPassword,
      signOut,
      signUp
    }
  }
}));

async function fillRegistrationForm(password = "sekret1", repeatedPassword = password) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Imię"), "Jan");
  await user.type(screen.getByLabelText("Nazwisko"), "Kowalski");
  await user.type(screen.getByLabelText("Numer telefonu"), "+48 500 600 700");
  await user.type(screen.getByLabelText("Hasło"), password);
  await user.type(screen.getByLabelText("Powtórz hasło"), repeatedPassword);
  return user;
}

describe("LoginScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates empty fields", async () => {
    render(<LoginScreen onShowRegister={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Zaloguj" }));

    expect(screen.getByText("Wypełnij wszystkie pola.")).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("sends a hidden technical email to Supabase", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginScreen onShowRegister={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Numer telefonu"), "+48 500 600 700");
    await userEvent.type(screen.getByLabelText("Hasło"), "sekret1");
    await userEvent.click(screen.getByRole("button", { name: "Zaloguj" }));

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "500600700@app.local",
      password: "sekret1"
    });
  });

  it("shows a readable auth error", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "invalid credentials" } });
    render(<LoginScreen onShowRegister={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Numer telefonu"), "500600700");
    await userEvent.type(screen.getByLabelText("Hasło"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Zaloguj" }));

    expect(
      await screen.findByText("Nieprawidłowy numer telefonu lub hasło.")
    ).toBeInTheDocument();
  });

  it("opens registration", async () => {
    const onShowRegister = vi.fn();
    render(<LoginScreen onShowRegister={onShowRegister} />);

    await userEvent.click(screen.getByRole("button", { name: /zarejestruj się/i }));

    expect(onShowRegister).toHaveBeenCalled();
  });
});

describe("RegisterScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates minimum password length", async () => {
    render(<RegisterScreen onRegistrationSuccess={vi.fn()} onShowLogin={vi.fn()} />);
    const user = await fillRegistrationForm("12345");

    await user.click(screen.getByRole("button", { name: "Zarejestruj" }));

    expect(screen.getByText("Hasło musi mieć minimum 6 znaków.")).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("validates matching passwords", async () => {
    render(<RegisterScreen onRegistrationSuccess={vi.fn()} onShowLogin={vi.fn()} />);
    const user = await fillRegistrationForm("sekret1", "sekret2");

    await user.click(screen.getByRole("button", { name: "Zarejestruj" }));

    expect(screen.getByText("Hasła muszą być takie same.")).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("blocks a number missing from the allowlist", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    render(<RegisterScreen onRegistrationSuccess={vi.fn()} onShowLogin={vi.fn()} />);
    const user = await fillRegistrationForm();

    await user.click(screen.getByRole("button", { name: "Zarejestruj" }));

    expect(
      await screen.findByText(
        "Twój numer nie widnieje w bazie danych. Skontaktuj się z administratorem."
      )
    ).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("registers an allowlisted number and closes the automatic session", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    signUp.mockResolvedValue({ data: { session: { access_token: "token" } }, error: null });
    signOut.mockResolvedValue({ error: null });
    const onRegistrationSuccess = vi.fn();
    render(
      <RegisterScreen onRegistrationSuccess={onRegistrationSuccess} onShowLogin={vi.fn()} />
    );
    const user = await fillRegistrationForm();

    await user.click(screen.getByRole("button", { name: "Zarejestruj" }));

    await waitFor(() => expect(onRegistrationSuccess).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith("can_register_phone", { phone_input: "500600700" });
    expect(signUp).toHaveBeenCalledWith({
      email: "500600700@app.local",
      password: "sekret1",
      options: {
        data: {
          first_name: "Jan",
          last_name: "Kowalski",
          phone: "500600700"
        }
      }
    });
    expect(signOut).toHaveBeenCalled();
  });
});
