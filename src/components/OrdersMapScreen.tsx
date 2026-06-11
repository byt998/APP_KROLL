import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CityWithStats, Order } from "../types/database";
import { AppIcon } from "./AppIcon";

type OrdersMapScreenProps = {
  cities: CityWithStats[];
  isLoading: boolean;
  orders: Order[];
  onBack: () => void;
};

function cityName(cities: CityWithStats[], cityId: string) {
  return cities.find((city) => city.id === cityId)?.name || "Nieznane miasto";
}

function markerIcon(status: Order["status"]) {
  const color = status === "completed" ? "#1f9d67" : "#d93f3f";

  return L.divIcon({
    className: "order-map-marker",
    html: `<span style="background:${color}"></span>`,
    iconAnchor: [12, 24],
    iconSize: [24, 24],
    popupAnchor: [0, -22]
  });
}

export function OrdersMapScreen({ cities, isLoading, orders, onBack }: OrdersMapScreenProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const ordersWithGps = useMemo(
    () => orders.filter((order) => order.latitude !== null && order.longitude !== null),
    [orders]
  );

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapElementRef.current, {
      center: [52.069, 19.48],
      zoom: 6
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markerLayerRef.current = markerLayer;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;

    if (!map || !markerLayer) {
      return;
    }

    markerLayer.clearLayers();

    const bounds: L.LatLngTuple[] = [];
    ordersWithGps.forEach((order) => {
      const position: L.LatLngTuple = [Number(order.latitude), Number(order.longitude)];
      bounds.push(position);
      L.marker(position, { icon: markerIcon(order.status) })
        .bindPopup(
          `<strong>${order.order_name || order.description || "Zlecenie"}</strong><br />${cityName(
            cities,
            order.city_id
          )}<br />${order.status === "completed" ? "Zrealizowane" : "Aktywne"}`
        )
        .addTo(markerLayer);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { maxZoom: 14, padding: [30, 30] });
    }

    window.setTimeout(() => map.invalidateSize(), 0);
  }, [cities, ordersWithGps]);

  return (
    <main className="home-layout">
      <div className="home-content app-screen">
        <button className="back-button" type="button" onClick={onBack}>
          <AppIcon name="arrow-right" size={17} />
          Powrót
        </button>

        <section className="hero-card hero-card--compact">
          <div className="hero-card__copy">
            <p className="section-kicker section-kicker--light">Mapa</p>
            <h1>Mapa Zleceń</h1>
            <span className="hero-card__status">
              <span />
              {ordersWithGps.length} z GPS
            </span>
          </div>
        </section>

        <section className="announcements-section">
          <div className="panel-heading">
            <span className="panel-heading__icon">
              <AppIcon name="map-pin" size={20} />
            </span>
            <div>
              <p className="section-kicker">Lokalizacje</p>
              <h2>Zlecenia na mapie</h2>
            </div>
          </div>
          <div className="map-legend">
            <span>
              <i className="map-dot map-dot--active" /> Aktywne
            </span>
            <span>
              <i className="map-dot map-dot--completed" /> Zrealizowane
            </span>
          </div>
          {isLoading && <p className="empty-state">Ładowanie mapy...</p>}
          {!isLoading && ordersWithGps.length === 0 && (
            <p className="empty-state">Brak zleceń z lokalizacją GPS.</p>
          )}
          <div className="orders-map" ref={mapElementRef} />
        </section>
      </div>
    </main>
  );
}
