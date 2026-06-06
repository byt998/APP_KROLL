import { FormEvent, useEffect, useState } from "react";
import type { Announcement } from "../types/database";
import { AppIcon } from "./AppIcon";

type AnnouncementManagerScreenProps = {
  announcements: Announcement[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onBack: () => void;
  onCreate: (title: string, content: string) => Promise<void>;
  onUpdate: (id: string, title: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function AnnouncementManagerScreen({
  announcements,
  isLoading,
  isSaving,
  error,
  onBack,
  onCreate,
  onUpdate,
  onDelete
}: AnnouncementManagerScreenProps) {
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setContent(editing.content);
    }
  }, [editing]);

  function resetForm() {
    setEditing(null);
    setTitle("");
    setContent("");
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!title.trim() || !content.trim()) {
      setFormError("Wypełnij tytuł i treść komunikatu.");
      return;
    }

    if (editing) {
      await onUpdate(editing.id, title.trim(), content.trim());
    } else {
      await onCreate(title.trim(), content.trim());
    }

    resetForm();
  }

  return (
    <main className="home-layout">
      <div className="home-content app-screen">
        <button className="back-button" type="button" onClick={onBack}>
          <AppIcon name="arrow-right" size={17} />
          Powrót
        </button>

        <section className="admin-form-card">
          <div className="panel-heading">
            <span className="panel-heading__icon">
              <AppIcon name="clipboard" size={20} />
            </span>
            <div>
              <p className="section-kicker">Administrator</p>
              <h1>{editing ? "Edytuj Komunikat" : "Dodaj Komunikat"}</h1>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <label className="form-field">
              <span>Tytuł</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Tytuł komunikatu"
              />
            </label>
            <label className="form-field">
              <span>Treść</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Treść komunikatu"
                rows={5}
              />
            </label>

            {formError && <p className="form-message form-message--error">{formError}</p>}
            {error && <p className="form-message form-message--error">{error}</p>}

            <div className="button-row">
              <button className="button button--primary" type="submit" disabled={isSaving}>
                {isSaving ? "Zapisywanie..." : editing ? "Zapisz zmiany" : "Dodaj komunikat"}
              </button>
              {editing && (
                <button className="button button--secondary" type="button" onClick={resetForm}>
                  Anuluj edycję
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="announcements-section">
          <div className="panel-heading">
            <span className="panel-heading__icon">
              <AppIcon name="sparkles" size={20} />
            </span>
            <div>
              <p className="section-kicker">Lista</p>
              <h2>Istniejące komunikaty</h2>
            </div>
          </div>

          {isLoading ? (
            <p className="empty-state">Ładowanie komunikatów...</p>
          ) : announcements.length === 0 ? (
            <p className="empty-state">Brak aktualnych informacji.</p>
          ) : (
            <div className="announcement-list">
              {announcements.map((announcement) => (
                <article className="announcement-card announcement-card--admin" key={announcement.id}>
                  <h3>{announcement.title}</h3>
                  <p>{announcement.content}</p>
                  <div className="button-row">
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => setEditing(announcement)}
                    >
                      Edytuj
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      disabled={isSaving}
                      onClick={() => onDelete(announcement.id)}
                    >
                      Usuń
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
