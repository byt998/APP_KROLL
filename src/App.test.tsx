import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const {
  from,
  getSession,
  onAuthStateChange,
  signOut,
  single,
  unsubscribe
} = vi.hoisted(() => ({
  from: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  single: vi.fn(),
  unsubscribe: vi.fn()
}));

let authListener: ((event: string, session: Session | null) => void) | undefined;

vi.mock("./lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from,
    auth: {
      getSession,
      onAuthStateChange,
      signOut
    }
  }
}));

const session = {
  user: { id: "user-1" }
} as Session;

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authListener = undefined;
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    signOut.mockResolvedValue({ error: null });
    onAuthStateChange.mockImplementation(
      (listener: (event: string, session: Session | null) => void) => {
        authListener = listener;
        return { data: { subscription: { unsubscribe } } };
      }
    );
    from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single })
      })
    });
  });

  it("switches between login and registration", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Zaloguj się" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /zarejestruj się/i }));
    expect(screen.getByRole("heading", { name: "Rejestracja" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /masz już konto/i }));
    expect(screen.getByRole("heading", { name: "Zaloguj się" })).toBeInTheDocument();
  });

  it("loads HOME after an auth event and signs out", async () => {
    single.mockResolvedValue({
      data: {
        id: "user-1",
        phone: "500600700",
        auth_email: null,
        first_name: "Jan",
        last_name: "Kowalski",
        role: "user"
      },
      error: null
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Zaloguj się" });

    act(() => authListener?.("SIGNED_IN", session));

    expect(await screen.findByRole("heading", { name: "Witaj, Jan" })).toBeInTheDocument();
    expect(screen.queryByText("Dane użytkownika")).not.toBeInTheDocument();
    expect(screen.queryByText("500600700")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Zadania" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mapa" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Raporty" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ustawienia" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Wyloguj" }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Zaloguj się" })).toBeInTheDocument();
  });

  it("signs out an auth user without a profile and shows the required message", async () => {
    single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116" }
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Zaloguj się" });

    act(() => authListener?.("SIGNED_IN", session));

    expect(await screen.findByText(/konto istnieje, ale nie ma przypisanego profilu/i))
      .toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
  });
});
