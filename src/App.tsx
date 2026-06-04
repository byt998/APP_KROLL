import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { HomeScreen } from "./components/HomeScreen";
import { LoginScreen } from "./components/LoginScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import type { Profile } from "./types/database";

type AuthView = "login" | "register";

const MISSING_PROFILE_MESSAGE =
  "Konto istnieje, ale nie ma przypisanego profilu. Skontaktuj się z administratorem.";
const REGISTRATION_SUCCESS_MESSAGE =
  "Konto zostało utworzone. Możesz się zalogować.";

export default function App() {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const requestId = useRef(0);

  const synchronizeSession = useCallback(async (session: Session | null) => {
    const currentRequest = ++requestId.current;

    if (!session) {
      setProfile(null);
      setIsLoading(false);
      setIsSigningOut(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (currentRequest !== requestId.current) {
      return;
    }

    if (error || !data) {
      setProfile(null);
      setMessage(
        error?.code === "PGRST116" || !data
          ? MISSING_PROFILE_MESSAGE
          : "Nie udało się pobrać profilu. Spróbuj zalogować się ponownie."
      );
      setIsLoading(false);
      await supabase.auth.signOut();
      return;
    }

    setMessage(null);
    setProfile(data as Profile);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isActive = true;
    const timeoutIds = new Set<number>();

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isActive) {
        return;
      }

      if (error) {
        setMessage("Nie udało się sprawdzić sesji. Odśwież stronę i spróbuj ponownie.");
        setIsLoading(false);
        return;
      }

      void synchronizeSession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        if (isActive) {
          void synchronizeSession(session);
        }
      }, 0);

      timeoutIds.add(timeoutId);
    });

    return () => {
      isActive = false;
      requestId.current += 1;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      subscription.unsubscribe();
    };
  }, [synchronizeSession]);

  async function handleSignOut() {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("Nie udało się wylogować. Spróbuj ponownie.");
      setIsSigningOut(false);
      return;
    }

    setProfile(null);
    setAuthView("login");
    setIsSigningOut(false);
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="status-layout">
        <section className="status-card">
          <p className="section-kicker">Konfiguracja</p>
          <h1>Połącz aplikację z Supabase</h1>
          <p>
            Uzupełnij plik <code>.env</code> wartościami opisanymi w <code>.env.example</code>,
            a następnie uruchom aplikację ponownie.
          </p>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="status-layout">
        <section className="status-card status-card--loading">
          <span className="spinner" aria-hidden="true" />
          <h1>Ładowanie aplikacji</h1>
          <p>Sprawdzamy sesję i dane użytkownika.</p>
        </section>
      </main>
    );
  }

  if (profile) {
    return (
      <HomeScreen
        profile={profile}
        isSigningOut={isSigningOut}
        onSignOut={handleSignOut}
      />
    );
  }

  if (authView === "register") {
    return (
      <RegisterScreen
        onRegistrationSuccess={() => {
          setMessage(REGISTRATION_SUCCESS_MESSAGE);
          setAuthView("login");
        }}
        onShowLogin={() => {
          setMessage(null);
          setAuthView("login");
        }}
      />
    );
  }

  return (
    <LoginScreen
      message={message}
      onShowRegister={() => {
        setMessage(null);
        setAuthView("register");
      }}
    />
  );
}
