import type { Announcement } from "../types/database";
import { AppIcon } from "./AppIcon";

type AnnouncementsSectionProps = {
  announcements: Announcement[];
  isLoading: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function AnnouncementsSection({
  announcements,
  isLoading
}: AnnouncementsSectionProps) {
  return (
    <section className="announcements-section">
      <div className="panel-heading">
        <span className="panel-heading__icon">
          <AppIcon name="clipboard" size={20} />
        </span>
        <div>
          <p className="section-kicker">Aktualne informacje</p>
          <h2>Komunikaty</h2>
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">Ładowanie aktualnych informacji...</p>
      ) : announcements.length === 0 ? (
        <p className="empty-state">Brak aktualnych informacji.</p>
      ) : (
        <div className="announcement-list">
          {announcements.map((announcement) => (
            <article className="announcement-card" key={announcement.id}>
              <time dateTime={announcement.created_at}>
                {formatDate(announcement.created_at)}
              </time>
              <h3>{announcement.title}</h3>
              <p>{announcement.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
