import { FormEvent, useMemo, useState } from "react";
import type { CityWithStats, Order, OrderPhoto, OrderPublicItem, Profile } from "../types/database";
import { AppIcon } from "./AppIcon";

type OrderUpdateInput = {
  assigned_to: string | null;
  order_name: string | null;
  description: string | null;
  notes: string | null;
  status: Order["status"];
  latitude: number | null;
  longitude: number | null;
};

type OrderCompletionInput = {
  completionNotes: string;
  files: File[];
};

type OrdersListScreenProps = {
  cities: CityWithStats[];
  currentProfile: Profile;
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  orders: Order[];
  photos: OrderPhoto[];
  profiles: Profile[];
  publicItems: OrderPublicItem[];
  success: string | null;
  onBack: () => void;
  onComplete: (orderId: string, input: OrderCompletionInput) => Promise<void>;
  onCreatePhotoUrl: (storagePath: string) => Promise<string | null>;
  onDelete: (orderId: string) => Promise<void>;
  onUpdate: (orderId: string, input: OrderUpdateInput, files: File[]) => Promise<void>;
};

function cityName(cities: CityWithStats[], cityId: string) {
  return cities.find((city) => city.id === cityId)?.name || "Nieznane miasto";
}

function displayDate(value: string | null) {
  if (!value) {
    return "Brak";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatGps(order: Order) {
  if (order.latitude === null || order.longitude === null) {
    return "Brak lokalizacji GPS";
  }

  return `${order.latitude}, ${order.longitude}`;
}

function googleMapsDirectionsUrl(city: string, address: string) {
  const destination = encodeURIComponent(`${city} ${address}`.trim());
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}

function orderTitle(order: Order, items: OrderPublicItem[] = []) {
  const firstItem = items[0];
  const itemSummary = [firstItem?.address, firstItem?.work_scope].filter(Boolean).join(" - ");

  return order.order_name || order.description || itemSummary || `Zlecenie z ${items.length || 0} pozycji`;
}

function statusLabel(status: Order["status"]) {
  return status === "completed" ? "Zrealizowane" : "Aktywne";
}

function profileName(profiles: Profile[], profileId: string | null) {
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile) {
    return "Nie przypisano";
  }

  return [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.phone || "Użytkownik";
}

function firstOrderAddress(items: OrderPublicItem[]) {
  return items.find((item) => item.address)?.address || "Brak adresu";
}

function photoFileName(storagePath: string) {
  return storagePath.split("/").slice(-1)[0] || storagePath;
}

function orderSummary(order: Order, items: OrderPublicItem[]) {
  const firstItem = items[0];

  return (
    [firstItem?.work_scope, firstItem?.species].filter(Boolean).join(" · ") ||
    order.notes ||
    order.description ||
    "Kliknij, aby zobaczyć szczegóły zlecenia"
  );
}

export function OrdersListScreen({
  cities,
  currentProfile,
  error,
  isLoading,
  isSaving,
  orders,
  photos,
  profiles,
  publicItems,
  success,
  onBack,
  onComplete,
  onCreatePhotoUrl,
  onDelete,
  onUpdate
}: OrdersListScreenProps) {
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ name: string; url: string } | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openOrderIds, setOpenOrderIds] = useState<string[]>([]);
  const isAdmin = currentProfile.role === "admin";

  const photosByOrder = useMemo(
    () =>
      photos.reduce<Record<string, OrderPhoto[]>>((acc, photo) => {
        acc[photo.order_id] = [...(acc[photo.order_id] || []), photo];
        return acc;
      }, {}),
    [photos]
  );

  const publicItemsByOrder = useMemo(
    () =>
      publicItems.reduce<Record<string, OrderPublicItem[]>>((acc, item) => {
        acc[item.order_id] = [...(acc[item.order_id] || []), item];
        return acc;
      }, {}),
    [publicItems]
  );

  const cityCards = useMemo(
    () =>
      cities.map((city) => {
        const cityOrders = orders.filter((order) => order.city_id === city.id);
        return {
          ...city,
          total_orders: cityOrders.length,
          completed_orders: cityOrders.filter((order) => order.status === "completed").length
        };
      }),
    [cities, orders]
  );
  const selectedCity = cityCards.find((city) => city.id === selectedCityId) || null;
  const selectedCityOrders = useMemo(
    () => orders.filter((order) => order.city_id === selectedCityId),
    [orders, selectedCityId]
  );
  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return selectedCityOrders;
    }

    return selectedCityOrders.filter((order) => {
      const items = publicItemsByOrder[order.id] || [];
      return [
        orderTitle(order, items),
        order.description,
        order.notes,
        statusLabel(order.status),
        ...items.flatMap((item) => [item.address, item.work_scope, item.species])
      ].some((value) => String(value || "").toLowerCase().includes(normalized));
    });
  }, [publicItemsByOrder, query, selectedCityOrders]);
  const activeCount = selectedCityOrders.filter((order) => order.status === "active").length;
  const completedCount = selectedCityOrders.filter((order) => order.status === "completed").length;

  function toggleOrder(orderId: string) {
    setOpenOrderIds((current) =>
      current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]
    );
  }

  function handleBack() {
    if (selectedCityId) {
      setSelectedCityId(null);
      setQuery("");
      setOpenOrderIds([]);
      return;
    }

    onBack();
  }

  async function handleOpenPhoto(photo: OrderPhoto) {
    const url = await onCreatePhotoUrl(photo.storage_path);

    if (url) {
      setPreviewPhoto({ name: photoFileName(photo.storage_path), url });
    }
  }

  return (
    <main className="home-layout">
      <div className="home-content app-screen">
        <button className="back-button" type="button" onClick={handleBack}>
          <AppIcon name="arrow-right" size={17} />
          {selectedCityId ? "Wróć do miast" : "Powrót"}
        </button>

        <section className="hero-card hero-card--compact">
          <div className="hero-card__copy">
            <p className="section-kicker section-kicker--light">Lista</p>
            <h1>Zlecenia</h1>
            <span className="hero-card__status">
              <span />
              {orders.length} w systemie
            </span>
          </div>
        </section>

        {error && <p className="form-message form-message--error">{error}</p>}
        {success && <p className="form-message form-message--success">{success}</p>}

        {isLoading ? (
          <p className="empty-state">Ładowanie zleceń...</p>
        ) : !selectedCity ? (
          <section className="announcements-section orders-city-stage">
            <div className="panel-heading">
              <span className="panel-heading__icon">
                <AppIcon name="map-pin" size={20} />
              </span>
              <div>
                <p className="section-kicker">Miasta</p>
                <h2>Najpierw wybierz miasto</h2>
              </div>
            </div>
            <p className="orders-stage-copy">
              Po kliknięciu otworzą się zlecenia zapisane dla wybranego miasta.
            </p>

            {cityCards.length === 0 ? (
              <p className="empty-state">Brak miast do wyświetlenia.</p>
            ) : (
              <div className="orders-city-grid">
                {cityCards.map((city) => (
                  <button
                    className="order-city-card"
                    key={city.id}
                    type="button"
                    onClick={() => setSelectedCityId(city.id)}
                  >
                    <span className="section-kicker">Miasto</span>
                    <h3>{city.name}</h3>
                    <dl className="city-stats city-stats--compact">
                      <div>
                        <dt>Łącznie zleceń</dt>
                        <dd>{city.total_orders}</dd>
                      </div>
                      <div>
                        <dt>Aktywne</dt>
                        <dd>{city.total_orders - city.completed_orders}</dd>
                      </div>
                      <div>
                        <dt>Zrealizowane</dt>
                        <dd>{city.completed_orders}</dd>
                      </div>
                    </dl>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="announcements-section orders-stage">
            <div className="panel-heading">
              <span className="panel-heading__icon">
                <AppIcon name="clipboard" size={20} />
              </span>
              <div>
                <p className="section-kicker">{selectedCity.name}</p>
                <h2>Lista zleceń</h2>
              </div>
            </div>
            <p className="orders-stage-copy">
              Kliknij kartę, aby rozwinąć szczegóły. Kliknięcie adresu otwiera nawigację do miasta i ulicy.
            </p>

            <label className="form-field import-search-field">
              <span>Szukaj</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Szukaj po adresie, gatunku lub statusie..."
              />
            </label>

            <div className="orders-counter-row">
              <span>{selectedCityOrders.length} zleceń</span>
              <span>{activeCount} aktywne</span>
              <span>{completedCount} zrealizowane</span>
            </div>

            {selectedCityOrders.length === 0 ? (
              <p className="empty-state">Brak zleceń dla wybranego miasta.</p>
            ) : filteredOrders.length === 0 ? (
              <p className="empty-state">Brak zleceń pasujących do wyszukiwania.</p>
            ) : (
              <div className="orders-list orders-list--collapsible">
                {filteredOrders.map((order) => {
                  const orderPhotos = photosByOrder[order.id] || [];
                  const orderItems = publicItemsByOrder[order.id] || [];
                  const orderCityName = cityName(cities, order.city_id);
                  const isOpen = openOrderIds.includes(order.id);

                  return (
                    <article className="order-card order-card--collapsible" key={order.id}>
                      <button
                        aria-expanded={isOpen}
                        className="order-card__toggle"
                        type="button"
                        onClick={() => toggleOrder(order.id)}
                      >
                        <div className="order-card__header">
                          <div>
                            <p className="section-kicker">{orderCityName}</p>
                            <h2>{orderTitle(order, orderItems)}</h2>
                            <p className="order-card__summary">{orderSummary(order, orderItems)}</p>
                            <div className="order-card__badges">
                              <span className="order-card__address">{firstOrderAddress(orderItems)}</span>
                              <span className="order-card__count">
                                {orderItems.length} {orderItems.length === 1 ? "pozycja" : "pozycji"}
                              </span>
                            </div>
                          </div>
                          <span className={`order-status order-status--${order.status}`}>
                            {statusLabel(order.status)}
                          </span>
                          <span className="order-card__chevron" aria-hidden="true">
                            {isOpen ? "−" : "+"}
                          </span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="order-card__content">
                          <OrderPublicItems city={orderCityName} isAdmin={isAdmin} items={orderItems} />

                          <section className="order-detail-section">
                            <div className="section-head section-head--tight">
                              <div>
                                <p className="section-kicker">Informacje</p>
                                <h3>Informacje o zleceniu</h3>
                              </div>
                            </div>
                            <dl className="order-details">
                              <div>
                                <dt>Opis</dt>
                                <dd>{order.description || orderTitle(order, orderItems)}</dd>
                              </div>
                              <div>
                                <dt>Uwagi</dt>
                                <dd>{order.notes || "Brak uwag"}</dd>
                              </div>
                              <div>
                                <dt>GPS</dt>
                                <dd>{formatGps(order)}</dd>
                              </div>
                              <div>
                                <dt>Utworzono</dt>
                                <dd>{displayDate(order.created_at)}</dd>
                              </div>
                              <div>
                                <dt>Zdjęcia</dt>
                                <dd>{orderPhotos.length}</dd>
                              </div>
                              {isAdmin && (
                                <div>
                                  <dt>Przypisany użytkownik</dt>
                                  <dd>{profileName(profiles, order.assigned_to)}</dd>
                                </div>
                              )}
                            </dl>

                            {order.completion_notes && (
                              <p className="order-card__note">Uwagi po realizacji: {order.completion_notes}</p>
                            )}
                          </section>

                          <section className="order-detail-section">
                            <div className="section-head section-head--tight">
                              <div>
                                <p className="section-kicker">Materiały</p>
                                <h3>Zdjęcia i materiały zlecenia</h3>
                              </div>
                              <span className="order-card__count">
                                {orderPhotos.length} {orderPhotos.length === 1 ? "plik" : "plików"}
                              </span>
                            </div>
                            {orderPhotos.length > 0 ? (
                              <>
                                <PhotoNameList photos={orderPhotos} onOpenPhoto={handleOpenPhoto} />
                                {/*
                                    {photo.storage_path.split("/").slice(-1)[0]} ·{" "}
                                    {photo.photo_stage === "completion" ? "realizacja" : "admin"}
                                  </li>
                                ))}
                              </ul>
                                */}
                              </>
                            ) : (
                              <p className="order-card__note">Brak zdjęć dla tego zlecenia.</p>
                            )}
                          </section>

                          <div className="button-row">
                            {isAdmin && (
                              <button
                                className="button button--secondary"
                                type="button"
                                onClick={() => setEditingOrder(order)}
                              >
                                Edytuj
                              </button>
                            )}
                            {order.status !== "completed" && (
                              <button
                                className="button button--primary"
                                type="button"
                                onClick={() => setCompletingOrder(order)}
                              >
                                ZREALIZOWANO
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {editingOrder && (
        <OrderEditModal
          isSaving={isSaving}
          order={editingOrder}
          photos={photosByOrder[editingOrder.id] || []}
          profiles={profiles}
          publicItems={publicItemsByOrder[editingOrder.id] || []}
          onClose={() => setEditingOrder(null)}
          onDelete={async () => {
            await onDelete(editingOrder.id);
            setEditingOrder(null);
          }}
          onSave={async (values, files) => {
            await onUpdate(editingOrder.id, values, files);
            setEditingOrder(null);
          }}
          onOpenPhoto={handleOpenPhoto}
        />
      )}

      {completingOrder && (
        <OrderCompletionModal
          isSaving={isSaving}
          order={completingOrder}
          onClose={() => setCompletingOrder(null)}
          onSave={async (values) => {
            await onComplete(completingOrder.id, values);
            setCompletingOrder(null);
          }}
        />
      )}

      {previewPhoto && (
        <PhotoPreviewModal
          name={previewPhoto.name}
          url={previewPhoto.url}
          onClose={() => setPreviewPhoto(null)}
        />
      )}
    </main>
  );
}

function OrderPublicItems({
  city,
  isAdmin = false,
  items
}: {
  city: string;
  isAdmin?: boolean;
  items: OrderPublicItem[];
}) {
  if (items.length === 0) {
    return (
      <section className="order-detail-section">
        <div className="section-head section-head--tight">
          <div>
            <p className="section-kicker">Zakres</p>
            <h3>Zakres prac</h3>
          </div>
        </div>
        <p className="empty-state">
          Brak pozycji przypisanych do tego zlecenia.
          {isAdmin ? " Zlecenie może nie mieć powiązań z importem." : ""}
        </p>
      </section>
    );
  }

  return (
    <section className="order-detail-section order-public-items">
      <div className="section-head section-head--tight">
        <div>
          <p className="section-kicker">Zakres</p>
          <h3>Zakres prac</h3>
        </div>
        <span className="order-card__count">
          {items.length} {items.length === 1 ? "pozycja" : "pozycji"}
        </span>
      </div>
      {items.map((item) => (
        <article className="order-public-item" key={item.imported_order_id}>
          <dl>
            <div>
              <dt>ADRES</dt>
              <dd>
                {item.address ? (
                  <a href={googleMapsDirectionsUrl(city, item.address)} rel="noreferrer" target="_blank">
                    {item.address}
                  </a>
                ) : (
                  "Brak adresu"
                )}
              </dd>
            </div>
            <div>
              <dt>ZAKRES PRAC</dt>
              <dd>{item.work_scope || "-"}</dd>
            </div>
            <div>
              <dt>GATUNEK</dt>
              <dd>{item.species || "-"}</dd>
            </div>
            <div>
              <dt>OBWÓD</dt>
              <dd>{item.circumference || "-"}</dd>
            </div>
            <div>
              <dt>ILOŚĆ</dt>
              <dd>{item.quantity ?? "-"}</dd>
            </div>
          </dl>
        </article>
      ))}
    </section>
  );
}

function nullableNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function PhotoNameList({
  photos,
  onOpenPhoto
}: {
  photos: OrderPhoto[];
  onOpenPhoto: (photo: OrderPhoto) => Promise<void>;
}) {
  return (
    <ul className="photo-list">
      {photos.map((photo) => (
        <li key={photo.id}>
          <button className="photo-link" type="button" onClick={() => void onOpenPhoto(photo)}>
            {photoFileName(photo.storage_path)}
          </button>
        </li>
      ))}
    </ul>
  );
}

function PhotoPreviewModal({
  name,
  url,
  onClose
}: {
  name: string;
  url: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section aria-modal="true" className="modal-panel photo-preview-modal" role="dialog">
        <div className="bottom-sheet__head">
          <div>
            <p className="section-kicker">Zdjęcie</p>
            <h2>{name}</h2>
          </div>
          <button className="button button--secondary button--compact" type="button" onClick={onClose}>
            Zamknij
          </button>
        </div>
        <img alt={name} src={url} />
      </section>
    </div>
  );
}

function OrderEditModal({
  isSaving,
  order,
  photos,
  profiles,
  publicItems,
  onClose,
  onDelete,
  onOpenPhoto,
  onSave
}: {
  isSaving: boolean;
  order: Order;
  photos: OrderPhoto[];
  profiles: Profile[];
  publicItems: OrderPublicItem[];
  onClose: () => void;
  onDelete: () => Promise<void>;
  onOpenPhoto: (photo: OrderPhoto) => Promise<void>;
  onSave: (values: OrderUpdateInput, files: File[]) => Promise<void>;
}) {
  const [assignedTo, setAssignedTo] = useState(order.assigned_to || "");
  const [description, setDescription] = useState(order.description || "");
  const [files, setFiles] = useState<File[]>([]);
  const [latitude, setLatitude] = useState(order.latitude === null ? "" : String(order.latitude));
  const [longitude, setLongitude] = useState(order.longitude === null ? "" : String(order.longitude));
  const [notes, setNotes] = useState(order.notes || "");
  const [orderName, setOrderName] = useState(order.order_name || "");
  const [status, setStatus] = useState<Order["status"]>(order.status);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(
      {
        assigned_to: assignedTo || null,
        description: description.trim() || null,
        latitude: nullableNumber(latitude),
        longitude: nullableNumber(longitude),
        notes: notes.trim() || null,
        order_name: orderName.trim() || null,
        status
      },
      files
    );
  }

  return (
    <div className="modal-backdrop modal-backdrop--sheet">
      <form className="modal-panel bottom-sheet bottom-sheet--wide" onSubmit={(event) => void handleSubmit(event)}>
        <div className="bottom-sheet__head">
          <div>
            <p className="section-kicker">Administrator</p>
            <h2>Edytuj zlecenie</h2>
          </div>
          <button className="button button--secondary button--compact" type="button" onClick={onClose}>
            Zamknij
          </button>
        </div>

        <div className="bottom-sheet__body">
          <div className="workspace-filters">
            <label className="form-field">
              <span>Nazwa zlecenia</span>
              <input value={orderName} onChange={(event) => setOrderName(event.target.value)} />
            </label>
            <label className="form-field">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as Order["status"])}>
                <option value="active">Aktywne</option>
                <option value="completed">Zrealizowane</option>
              </select>
            </label>
            <label className="form-field">
              <span>Przypisany użytkownik</span>
              <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
                <option value="">Nie przypisano</option>
                {profiles
                  .filter((profile) => profile.role !== "admin")
                  .map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name} · {profile.phone}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Opis</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Uwagi</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>

          <div className="workspace-filters">
            <label className="form-field">
              <span>Latitude</span>
              <input value={latitude} onChange={(event) => setLatitude(event.target.value)} />
            </label>
            <label className="form-field">
              <span>Longitude</span>
              <input value={longitude} onChange={(event) => setLongitude(event.target.value)} />
            </label>
          </div>

          <label className="form-field">
            <span>Zdjęcia</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              multiple
              type="file"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
            />
          </label>

          <div className="order-edit-gallery">
            <p className="section-kicker">Zdjęcia zapisane</p>
            {photos.length === 0 ? (
              <p className="order-card__note">Brak zdjęć.</p>
            ) : (
              <>
                <PhotoNameList photos={photos} onOpenPhoto={onOpenPhoto} />
                {/*
                {photos.map((photo) => (
                  <li key={photo.id}>
                    {photo.storage_path.split("/").slice(-1)[0]} ·{" "}
                    {photo.photo_stage === "completion" ? "realizacja" : "admin"}
                  </li>
                ))}
              </ul>
            )}
          </div>

                */}
              </>
            )}
          </div>

          <OrderPublicItems city="" isAdmin items={publicItems} />
        </div>

        <div className="bottom-sheet__footer">
          {isConfirmingDelete ? (
            <div className="delete-confirmation">
              <p>Tej operacji nie można cofnąć. Zlecenie i jego powiązania zostaną usunięte.</p>
              <button className="button button--primary" disabled={isSaving} type="button" onClick={() => void onDelete()}>
                Potwierdź usunięcie
              </button>
              <button className="button button--secondary" type="button" onClick={() => setIsConfirmingDelete(false)}>
                Nie usuwaj
              </button>
            </div>
          ) : (
            <button
              className="button button--secondary"
              disabled={isSaving}
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
            >
              Usuń zlecenie
            </button>
          )}
          <button className="button button--primary" disabled={isSaving} type="submit">
            Zapisz
          </button>
          <button className="button button--secondary" type="button" onClick={onClose}>
            Anuluj
          </button>
        </div>
      </form>
    </div>
  );
}

function OrderCompletionModal({
  isSaving,
  order,
  onClose,
  onSave
}: {
  isSaving: boolean;
  order: Order;
  onClose: () => void;
  onSave: (values: OrderCompletionInput) => Promise<void>;
}) {
  const [completionNotes, setCompletionNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({ completionNotes, files });
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel bottom-sheet" onSubmit={(event) => void handleSubmit(event)}>
        <div className="bottom-sheet__head">
          <div>
            <p className="section-kicker">Realizacja</p>
            <h2>ZREALIZOWANO</h2>
          </div>
        </div>
        <div className="bottom-sheet__body">
          <p>{orderTitle(order)}</p>
          <label className="form-field">
            <span>Uwagi po realizacji</span>
            <textarea value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Zdjęcia po realizacji</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              multiple
              type="file"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
            />
          </label>
        </div>
        <div className="bottom-sheet__footer">
          <button className="button button--primary" disabled={isSaving} type="submit">
            Zapisz realizację
          </button>
          <button className="button button--secondary" type="button" onClick={onClose}>
            Anuluj
          </button>
        </div>
      </form>
    </div>
  );
}
