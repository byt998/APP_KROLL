import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AdminPanelScreen } from "./components/AdminPanelScreen";
import { AnnouncementManagerScreen } from "./components/AnnouncementManagerScreen";
import { CityManagerScreen } from "./components/CityManagerScreen";
import { HomeScreen } from "./components/HomeScreen";
import { LoginScreen } from "./components/LoginScreen";
import { ModulePlaceholderScreen } from "./components/ModulePlaceholderScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { WorkOrderAdminScreen } from "./components/WorkOrderAdminScreen";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import type { Announcement, CityWithStats, Profile } from "./types/database";

type AuthView = "login" | "register";
type AppView =
  | "home"
  | "admin"
  | "orders-admin"
  | "cities-admin"
  | "announcements-admin"
  | "module-placeholder";

const MISSING_PROFILE_MESSAGE =
  "Konto istnieje, ale nie ma przypisanego profilu. Skontaktuj się z administratorem.";
const REGISTRATION_SUCCESS_MESSAGE =
  "Konto zostało utworzone. Możesz się zalogować.";

export default function App() {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [appView, setAppView] = useState<AppView>("home");
  const [selectedModule, setSelectedModule] = useState("Moduł");
  const [moduleBackView, setModuleBackView] = useState<AppView>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [areAnnouncementsLoading, setAreAnnouncementsLoading] = useState(false);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [isAnnouncementSaving, setIsAnnouncementSaving] = useState(false);
  const [cities, setCities] = useState<CityWithStats[]>([]);
  const [areCitiesLoading, setAreCitiesLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [citySuccess, setCitySuccess] = useState<string | null>(null);
  const [isCitySaving, setIsCitySaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadAnnouncements = useCallback(async () => {
    setAreAnnouncementsLoading(true);
    setAnnouncementError(null);

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setAnnouncementError("Nie udało się pobrać komunikatów.");
      setAnnouncements([]);
      setAreAnnouncementsLoading(false);
      return;
    }

    setAnnouncements((data || []) as Announcement[]);
    setAreAnnouncementsLoading(false);
  }, []);

  const loadCities = useCallback(async () => {
    setAreCitiesLoading(true);
    setCityError(null);

    const { data, error } = await supabase.rpc("get_cities_with_stats");

    if (error) {
      setCityError("Nie udało się pobrać miast.");
      setCities([]);
      setAreCitiesLoading(false);
      return;
    }

    setCities((data || []) as CityWithStats[]);
    setAreCitiesLoading(false);
  }, []);

  const synchronizeSession = useCallback(async (session: Session | null) => {
    const currentRequest = ++requestId.current;

    if (!session) {
      setProfile(null);
      setAnnouncements([]);
      setCities([]);
      setAppView("home");
      setModuleBackView("home");
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
    setAppView("home");
    setModuleBackView("home");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (profile) {
      void loadAnnouncements();
    }
  }, [loadAnnouncements, profile]);

  useEffect(() => {
    if (profile?.role === "admin" && appView === "cities-admin") {
      void loadCities();
    }
  }, [appView, loadCities, profile?.role]);

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
    setAnnouncements([]);
    setCities([]);
    setAuthView("login");
    setAppView("home");
    setModuleBackView("home");
    setIsSigningOut(false);
  }

  function openModule(title: string, backView: AppView = "home") {
    setSelectedModule(title);
    setModuleBackView(backView);
    setAppView("module-placeholder");
  }

  function openCityManager() {
    setCityError(null);
    setCitySuccess(null);
    setAppView("cities-admin");
  }

  async function createAnnouncement(title: string, content: string) {
    setIsAnnouncementSaving(true);
    setAnnouncementError(null);

    const { error } = await supabase.from("announcements").insert({ title, content });

    if (error) {
      setAnnouncementError("Nie udało się dodać komunikatu.");
      setIsAnnouncementSaving(false);
      return;
    }

    await loadAnnouncements();
    setIsAnnouncementSaving(false);
  }

  async function updateAnnouncement(id: string, title: string, content: string) {
    setIsAnnouncementSaving(true);
    setAnnouncementError(null);

    const { error } = await supabase
      .from("announcements")
      .update({ title, content })
      .eq("id", id);

    if (error) {
      setAnnouncementError("Nie udało się zapisać zmian.");
      setIsAnnouncementSaving(false);
      return;
    }

    await loadAnnouncements();
    setIsAnnouncementSaving(false);
  }

  async function deleteAnnouncement(id: string) {
    setIsAnnouncementSaving(true);
    setAnnouncementError(null);

    const { error } = await supabase.from("announcements").delete().eq("id", id);

    if (error) {
      setAnnouncementError("Nie udało się usunąć komunikatu.");
      setIsAnnouncementSaving(false);
      return;
    }

    await loadAnnouncements();
    setIsAnnouncementSaving(false);
  }

  async function createCity(name: string) {
    const trimmedName = name.trim();
    const normalizedName = trimmedName.toLocaleLowerCase("pl-PL");

    setCityError(null);
    setCitySuccess(null);

    if (cities.some((city) => city.name.trim().toLocaleLowerCase("pl-PL") === normalizedName)) {
      setCityError("Miasto już istnieje.");
      return false;
    }

    setIsCitySaving(true);

    const { error } = await supabase.from("cities").insert({ name: trimmedName });

    if (error) {
      setCityError(
        error.code === "23505" ? "Miasto już istnieje." : "Nie udało się dodać miasta."
      );
      setIsCitySaving(false);
      return false;
    }

    await loadCities();
    setCitySuccess("Miasto zostało dodane.");
    setIsCitySaving(false);
    return true;
  }

  async function deleteCity(id: string) {
    setIsCitySaving(true);
    setCityError(null);
    setCitySuccess(null);

    const { error } = await supabase.from("cities").delete().eq("id", id);

    if (error) {
      setCityError(
        error.code === "23503"
          ? "Nie można usunąć miasta, które ma przypisane zlecenia."
          : "Nie udało się usunąć miasta."
      );
      setIsCitySaving(false);
      return;
    }

    await loadCities();
    setCitySuccess("Miasto zostało usunięte.");
    setIsCitySaving(false);
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
    if (appView === "admin" && profile.role === "admin") {
      return (
        <AdminPanelScreen
          onBack={() => setAppView("home")}
          onOpenAnnouncements={() => setAppView("announcements-admin")}
          onOpenOrders={() => setAppView("orders-admin")}
          onOpenModule={(title) => openModule(title, "admin")}
        />
      );
    }

    if (appView === "orders-admin" && profile.role === "admin") {
      return (
        <WorkOrderAdminScreen
          onBack={() => setAppView("admin")}
          onOpenCities={openCityManager}
          onOpenModule={(title) => openModule(title, "orders-admin")}
        />
      );
    }

    if (appView === "cities-admin" && profile.role === "admin") {
      return (
        <CityManagerScreen
          cities={cities}
          isLoading={areCitiesLoading}
          isSaving={isCitySaving}
          error={cityError}
          success={citySuccess}
          onBack={() => setAppView("orders-admin")}
          onCreate={createCity}
          onDelete={deleteCity}
        />
      );
    }

    if (appView === "announcements-admin" && profile.role === "admin") {
      return (
        <AnnouncementManagerScreen
          announcements={announcements}
          isLoading={areAnnouncementsLoading}
          isSaving={isAnnouncementSaving}
          error={announcementError}
          onBack={() => setAppView("admin")}
          onCreate={createAnnouncement}
          onUpdate={updateAnnouncement}
          onDelete={deleteAnnouncement}
        />
      );
    }

    if (appView === "module-placeholder") {
      return (
        <ModulePlaceholderScreen
          title={selectedModule}
          onBack={() => setAppView(moduleBackView)}
        />
      );
    }

    return (
      <HomeScreen
        profile={profile}
        announcements={announcements}
        areAnnouncementsLoading={areAnnouncementsLoading}
        isSigningOut={isSigningOut}
        onOpenAdminPanel={() => setAppView("admin")}
        onOpenModule={(title) => openModule(title, "home")}
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
