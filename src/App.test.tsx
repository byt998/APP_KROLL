import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const {
  announcementsDelete,
  announcementsDeleteEq,
  announcementsInsert,
  announcementsOrder,
  announcementsUpdate,
  announcementsUpdateEq,
  citiesDelete,
  citiesDeleteEq,
  citiesInsert,
  citiesRpc,
  from,
  getSession,
  onAuthStateChange,
  profileSingle,
  rpc,
  signOut,
  unsubscribe
} = vi.hoisted(() => ({
  announcementsDelete: vi.fn(),
  announcementsDeleteEq: vi.fn(),
  announcementsInsert: vi.fn(),
  announcementsOrder: vi.fn(),
  announcementsUpdate: vi.fn(),
  announcementsUpdateEq: vi.fn(),
  citiesDelete: vi.fn(),
  citiesDeleteEq: vi.fn(),
  citiesInsert: vi.fn(),
  citiesRpc: vi.fn(),
  from: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  profileSingle: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn()
}));

let authListener: ((event: string, session: Session | null) => void) | undefined;

vi.mock("./lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from,
    rpc,
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

function profile(role: "user" | "admin") {
  return {
    id: "user-1",
    phone: "500600700",
    auth_email: null,
    first_name: role === "admin" ? "Anna" : "Jan",
    last_name: "Kowalski",
    role
  };
}

async function signInAs(role: "user" | "admin") {
  profileSingle.mockResolvedValue({ data: profile(role), error: null });

  render(<App />);
  await screen.findByRole("heading", { name: "Zaloguj się" });

  act(() => authListener?.("SIGNED_IN", session));

  return screen.findByRole("heading", {
    name: role === "admin" ? "Witaj, Anna" : "Witaj, Jan"
  });
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authListener = undefined;
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    signOut.mockResolvedValue({ error: null });
    announcementsOrder.mockResolvedValue({ data: [], error: null });
    announcementsInsert.mockResolvedValue({ error: null });
    announcementsUpdate.mockReturnValue({ eq: announcementsUpdateEq });
    announcementsUpdateEq.mockResolvedValue({ error: null });
    announcementsDelete.mockReturnValue({ eq: announcementsDeleteEq });
    announcementsDeleteEq.mockResolvedValue({ error: null });
    citiesRpc.mockResolvedValue({ data: [], error: null });
    rpc.mockImplementation((functionName: string) => {
      if (functionName === "get_cities_with_stats") {
        return citiesRpc();
      }

      throw new Error(`Unexpected RPC: ${functionName}`);
    });
    citiesInsert.mockResolvedValue({ error: null });
    citiesDelete.mockReturnValue({ eq: citiesDeleteEq });
    citiesDeleteEq.mockResolvedValue({ error: null });
    onAuthStateChange.mockImplementation(
      (listener: (event: string, session: Session | null) => void) => {
        authListener = listener;
        return { data: { subscription: { unsubscribe } } };
      }
    );
    from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: profileSingle })
          })
        };
      }

      if (table === "announcements") {
        return {
          select: vi.fn().mockReturnValue({ order: announcementsOrder }),
          insert: announcementsInsert,
          update: announcementsUpdate,
          delete: announcementsDelete
        };
      }

      if (table === "cities") {
        return {
          insert: citiesInsert,
          delete: citiesDelete
        };
      }

      throw new Error(`Unexpected table: ${table}`);
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

  it("shows user shortcuts and hides admin shortcut for regular users", async () => {
    await signInAs("user");

    expect(screen.getByRole("heading", { name: "Zlecenia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mapa" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kalendarz" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Panel Administratora" })).not.toBeInTheDocument();
    expect(await screen.findByText("Brak aktualnych informacji.")).toBeInTheDocument();
  });

  it("shows admin shortcuts and opens the admin panel", async () => {
    await signInAs("admin");

    expect(screen.getByRole("heading", { name: "Zlecenia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mapa" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Panel Administratora" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Kalendarz" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));

    expect(await screen.findByRole("heading", { name: "Zarządzanie" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ZARZĄDZAJ ZLECENIAMI" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "DODAJ KOMUNIKAT" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ZARZĄDZAJ PRACOWNIKAMI" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MAPA ZLECEŃ" })).toBeInTheDocument();
  });

  it("opens the work order admin module", async () => {
    await signInAs("admin");

    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));
    await userEvent.click(await screen.findByRole("button", { name: /ZARZĄDZAJ ZLECENIAMI/i }));

    expect(await screen.findByRole("heading", { name: "Zarządzanie zleceniami" }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dodaj Miasto" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Importuj Zlecenia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Twórz Zlecenia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mapa Zleceń" })).toBeInTheDocument();
  });

  it("manages cities from the work order admin module", async () => {
    citiesRpc.mockResolvedValue({
      data: [
        {
          id: "city-1",
          name: "Katowice",
          created_by: "admin",
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z",
          total_orders: 145,
          completed_orders: 120,
          active_orders: 25
        }
      ],
      error: null
    });

    await signInAs("admin");
    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));
    await userEvent.click(await screen.findByRole("button", { name: /ZARZĄDZAJ ZLECENIAMI/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Dodaj Miasto/i }));

    expect(await screen.findByRole("heading", { name: "Utworzone miasta" })).toBeInTheDocument();
    const cityCard = screen.getByRole("heading", { name: "Katowice" }).closest("article");
    expect(cityCard).not.toBeNull();
    expect(within(cityCard!).getByText("Łącznie zleceń")).toBeInTheDocument();
    expect(within(cityCard!).getByText("145")).toBeInTheDocument();
    expect(within(cityCard!).getByText("Zakończone")).toBeInTheDocument();
    expect(within(cityCard!).getByText("120")).toBeInTheDocument();
    expect(within(cityCard!).getByText("Aktywne")).toBeInTheDocument();
    expect(within(cityCard!).getByText("25")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "DODAJ MIASTO" }));
    expect(screen.getByText("Wpisz nazwę miasta.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Nazwa miasta"), " katowice ");
    await userEvent.click(screen.getByRole("button", { name: "DODAJ MIASTO" }));
    expect(screen.getByText("Miasto już istnieje.")).toBeInTheDocument();
    expect(citiesInsert).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText("Nazwa miasta"));
    await userEvent.type(screen.getByLabelText("Nazwa miasta"), "Gliwice");
    await userEvent.click(screen.getByRole("button", { name: "DODAJ MIASTO" }));

    await waitFor(() => expect(citiesInsert).toHaveBeenCalledWith({ name: "Gliwice" }));
    expect(await screen.findByText("Miasto zostało dodane.")).toBeInTheDocument();

    await userEvent.click(within(cityCard!).getByRole("button", { name: "Usuń" }));

    await waitFor(() => expect(citiesDelete).toHaveBeenCalled());
    expect(citiesDeleteEq).toHaveBeenCalledWith("id", "city-1");
  });

  it("shows announcements from newest to oldest", async () => {
    announcementsOrder.mockResolvedValue({
      data: [
        {
          id: "new",
          title: "Nowszy komunikat",
          content: "Treść nowsza",
          created_by: "admin",
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z"
        },
        {
          id: "old",
          title: "Starszy komunikat",
          content: "Treść starsza",
          created_by: "admin",
          created_at: "2026-06-05T10:00:00.000Z",
          updated_at: "2026-06-05T10:00:00.000Z"
        }
      ],
      error: null
    });

    await signInAs("user");

    const newer = await screen.findByRole("heading", { name: "Nowszy komunikat" });
    const older = screen.getByRole("heading", { name: "Starszy komunikat" });

    expect(newer.compareDocumentPosition(older)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(announcementsOrder).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("creates, updates and deletes announcements from the admin manager", async () => {
    announcementsOrder.mockResolvedValue({
      data: [
        {
          id: "announcement-1",
          title: "Stary tytuł",
          content: "Stara treść",
          created_by: "admin",
          created_at: "2026-06-06T10:00:00.000Z",
          updated_at: "2026-06-06T10:00:00.000Z"
        }
      ],
      error: null
    });

    await signInAs("admin");
    await userEvent.click(screen.getByRole("button", { name: /Panel Administratora/i }));
    await userEvent.click(await screen.findByRole("button", { name: /DODAJ KOMUNIKAT/i }));

    expect(await screen.findByRole("heading", { name: "Dodaj Komunikat" })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Tytuł"), "Nowy komunikat");
    await userEvent.type(screen.getByLabelText("Treść"), "Treść komunikatu");
    await userEvent.click(screen.getByRole("button", { name: "Dodaj komunikat" }));

    await waitFor(() =>
      expect(announcementsInsert).toHaveBeenCalledWith({
        title: "Nowy komunikat",
        content: "Treść komunikatu"
      })
    );

    const existingCard = screen.getByRole("heading", { name: "Stary tytuł" }).closest("article");
    expect(existingCard).not.toBeNull();
    await userEvent.click(within(existingCard!).getByRole("button", { name: "Edytuj" }));

    await userEvent.clear(screen.getByLabelText("Tytuł"));
    await userEvent.type(screen.getByLabelText("Tytuł"), "Poprawiony tytuł");
    await userEvent.clear(screen.getByLabelText("Treść"));
    await userEvent.type(screen.getByLabelText("Treść"), "Poprawiona treść");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz zmiany" }));

    await waitFor(() =>
      expect(announcementsUpdate).toHaveBeenCalledWith({
        title: "Poprawiony tytuł",
        content: "Poprawiona treść"
      })
    );
    expect(announcementsUpdateEq).toHaveBeenCalledWith("id", "announcement-1");

    await userEvent.click(within(existingCard!).getByRole("button", { name: "Usuń" }));

    await waitFor(() => expect(announcementsDelete).toHaveBeenCalled());
    expect(announcementsDeleteEq).toHaveBeenCalledWith("id", "announcement-1");
  });

  it("opens a placeholder module screen", async () => {
    await signInAs("user");

    await userEvent.click(screen.getByRole("button", { name: /Zlecenia/i }));

    expect(await screen.findByRole("heading", { name: "Zlecenia" })).toBeInTheDocument();
    expect(screen.getByText("Moduł w przygotowaniu.")).toBeInTheDocument();
  });

  it("signs out an auth user without a profile and shows the required message", async () => {
    profileSingle.mockResolvedValue({
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
