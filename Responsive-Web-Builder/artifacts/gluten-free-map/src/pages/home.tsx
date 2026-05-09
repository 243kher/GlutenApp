import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Navigation, SlidersHorizontal, X, MapPin, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useListEstablishments, getListEstablishmentsQueryKey, useGetPlatformStats, getGetPlatformStatsQueryKey } from "@workspace/api-client-react";
import { VerificationBadge, SafeCeliacBadge } from "@/components/VerificationBadge";
import { StarRating } from "@/components/StarRating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/hooks/useGeolocation";

// Fix leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const verificationColors: Record<string, string> = {
  certified: "#16a34a",
  community: "#2563eb",
  unverified: "#9ca3af",
};

const typeEmojis: Record<string, string> = {
  restaurant: "🍽",
  bakery: "🥖",
  grocery: "🛒",
  cafe: "☕",
  other: "📍",
};

const typeColorsBg: Record<string, string> = {
  restaurant: "#f97316",
  bakery: "#eab308",
  grocery: "#22c55e",
  cafe: "#a78bfa",
  other: "#6b7280",
};

function createMarker(type: string, verificationLevel: string, isSelected = false) {
  const bgColor = typeColorsBg[type] ?? typeColorsBg.other;
  const borderColor = verificationColors[verificationLevel] ?? verificationColors.unverified;
  const emoji = typeEmojis[type] ?? "📍";
  const size = isSelected ? 42 : 34;
  const borderW = isSelected ? 3 : 2;
  const fontSize = isSelected ? 16 : 14;

  return L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size + 8}px;
      ">
        <div style="
          width: ${size}px; height: ${size}px;
          border-radius: 50% 50% 50% 0;
          background: ${bgColor};
          border: ${borderW}px solid ${borderColor};
          transform: rotate(-45deg);
          box-shadow: 0 ${isSelected ? 4 : 2}px ${isSelected ? 12 : 6}px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: ${fontSize}px;
            line-height: 1;
            display: block;
            margin-left: -2px;
            margin-top: -2px;
          ">${emoji}</span>
        </div>
      </div>`,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  });
}

const userPositionIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 16px; height: 16px; border-radius: 50%;
    background: #3b82f6; border: 3px solid white;
    box-shadow: 0 0 0 4px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.setView([lat, lng], 14, { animate: true });
  return null;
}

interface LocateButtonProps {
  onLocate: () => void;
  isLocating: boolean;
  isActive: boolean;
  onReset: () => void;
}

function LocateButton({ onLocate, isLocating, isActive, onReset }: LocateButtonProps) {
  return (
    <button
      onClick={isActive ? onReset : onLocate}
      disabled={isLocating}
      className={`absolute bottom-6 right-4 z-[1000] flex items-center gap-2 px-3 py-2.5 rounded-xl shadow-lg transition-all border font-medium text-sm ${
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border hover:bg-accent hover:shadow-xl"
      }`}
      title={isActive ? "Désactiver la localisation" : "Me localiser"}
      data-testid="button-locate"
    >
      {isLocating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Navigation className={`w-4 h-4 ${isActive ? "fill-primary-foreground" : ""}`} />
      )}
      <span className="hidden sm:block">
        {isLocating ? "Localisation..." : isActive ? "Près de moi" : "Me localiser"}
      </span>
    </button>
  );
}

const typeLabels: Record<string, string> = {
  restaurant: "Restaurant", bakery: "Boulangerie", grocery: "Épicerie", cafe: "Café", other: "Autre",
};

const typeOptions = [
  { value: "", label: "Tous" },
  { value: "restaurant", label: "Restaurants" },
  { value: "bakery", label: "Boulangeries" },
  { value: "grocery", label: "Épiceries" },
  { value: "cafe", label: "Cafés" },
];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [safeCeliac, setSafeCeliac] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { state: geoState, locate, reset: resetGeo } = useGeolocation();

  const userLat = geoState.status === "success" ? geoState.lat : undefined;
  const userLng = geoState.status === "success" ? geoState.lng : undefined;
  const nearbyMode = geoState.status === "success";

  const params: any = { limit: 50 };
  if (search) params.search = search;
  if (type) params.type = type;
  if (safeCeliac) params.safeCeliac = true;
  if (verificationLevel) params.verificationLevel = verificationLevel;
  // Pass coordinates to API — results will be sorted by distance
  if (userLat != null && userLng != null) {
    params.lat = userLat;
    params.lng = userLng;
  }

  const { data, isLoading } = useListEstablishments(params, {
    query: {
      queryKey: getListEstablishmentsQueryKey(params),
      enabled: geoState.status !== "loading",
    },
  });

  const { data: stats } = useGetPlatformStats({
    query: { queryKey: getGetPlatformStatsQueryKey() },
  });

  const establishments = (data as any)?.establishments ?? [];
  const selected = establishments.find((e: any) => e.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden relative">
      {/* Left panel — desktop */}
      <aside className="hidden md:flex flex-col w-80 xl:w-96 bg-card border-r border-border z-10 flex-shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un établissement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-map-search"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  type === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                }`}
                data-testid={`filter-type-${opt.value || "all"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={safeCeliac} onCheckedChange={setSafeCeliac} id="safe-map" data-testid="switch-safe-celiac" />
              <Label htmlFor="safe-map" className="text-xs text-orange-700 dark:text-orange-300 cursor-pointer font-medium">Safe coeliaque</Label>
            </div>
            <button
              onClick={() => setVerificationLevel(v => v === "certified" ? "" : "certified")}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${verificationLevel === "certified" ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700" : "border-border hover:bg-accent"}`}
            >
              Certifié
            </button>
          </div>

          {/* Geolocation error */}
          {geoState.status === "error" && (
            <div className="flex items-start gap-2 p-2.5 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{geoState.message}</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : establishments.length === 0 ? (
            <div className="p-6 text-center">
              <MapPin className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun résultat</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-xs text-muted-foreground">{establishments.length} établissement{establishments.length !== 1 ? "s" : ""}</p>
                {nearbyMode && (
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    Par proximité
                  </span>
                )}
              </div>
              {establishments.map((e: any) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id === selectedId ? null : e.id)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-colors border ${
                    selectedId === e.id ? "bg-primary/5 border-primary/30" : "border-transparent hover:bg-accent"
                  }`}
                  data-testid={`list-item-${e.id}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: verificationColors[e.verificationLevel] ?? "#6b7280" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm leading-tight truncate">{e.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{typeLabels[e.type]}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{e.city}</span>
                        {e.distance != null && (
                          <span className="text-xs font-semibold text-primary">
                            {e.distance < 1
                              ? `${Math.round(e.distance * 1000)} m`
                              : `${e.distance.toFixed(1)} km`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {e.safeCeliac && <SafeCeliacBadge />}
                        {e.averageRating != null && <StarRating rating={e.averageRating} />}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {stats && (
          <div className="p-4 border-t border-border">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted rounded-lg p-2">
                <p className="text-lg font-bold text-foreground">{(stats as any).totalEstablishments}</p>
                <p className="text-xs text-muted-foreground">Lieux</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-lg font-bold text-green-600">{(stats as any).certifiedCount}</p>
                <p className="text-xs text-muted-foreground">Certifiés</p>
              </div>
              <div className="bg-muted rounded-lg p-2">
                <p className="text-lg font-bold text-orange-600">{(stats as any).safeCeliacCount}</p>
                <p className="text-xs text-muted-foreground">Safe</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[46.8, 2.3]}
          zoom={6}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Fly to user position when located */}
          {userLat != null && userLng != null && (
            <MapController lat={userLat} lng={userLng} />
          )}

          {/* User position marker + accuracy circle */}
          {userLat != null && userLng != null && (
            <>
              <Marker position={[userLat, userLng]} icon={userPositionIcon} />
              {geoState.status === "success" && geoState.accuracy <= 500 && (
                <Circle
                  center={[userLat, userLng]}
                  radius={geoState.accuracy}
                  pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1, weight: 1 }}
                />
              )}
            </>
          )}

          {/* Establishment markers */}
          {establishments.map((e: any) => (
            <Marker
              key={e.id}
              position={[e.lat, e.lng]}
              icon={createMarker(e.type, e.verificationLevel, selectedId === e.id)}
              eventHandlers={{ click: () => { setSelectedId(e.id); setMobilePanel(true); } }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-semibold text-sm mb-1">{e.name}</h3>
                  <p className="text-xs text-gray-500 mb-1">{typeLabels[e.type]} · {e.city}</p>
                  {e.distance != null && (
                    <p className="text-xs font-semibold text-green-700 mb-1">
                      {e.distance < 1 ? `${Math.round(e.distance * 1000)} m` : `${e.distance.toFixed(2)} km`} de vous
                    </p>
                  )}
                  {e.safeCeliac && <p className="text-xs text-orange-600 font-medium mb-1">Safe coeliaque</p>}
                  {e.averageRating != null && <p className="text-xs text-gray-600">{e.averageRating.toFixed(1)}/5 ({e.reviewCount} avis)</p>}
                  <a href={`/etablissements/${e.id}`} className="text-xs text-green-600 hover:underline font-medium mt-1 block">Voir la fiche &rarr;</a>
                </div>
              </Popup>
            </Marker>
          ))}

          <LocateButton
            onLocate={locate}
            isLocating={geoState.status === "loading"}
            isActive={nearbyMode}
            onReset={resetGeo}
          />
        </MapContainer>

        {/* Selected establishment panel — desktop */}
        {selected && (
          <div className="hidden md:block absolute top-4 right-4 z-[900] w-80 bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-base leading-tight">{selected.name}</h3>
                <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-accent rounded-lg ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{typeLabels[selected.type]} · {selected.city}</p>
              {(selected as any).distance != null && (
                <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" />
                  {(selected as any).distance < 1
                    ? `${Math.round((selected as any).distance * 1000)} m`
                    : `${(selected as any).distance.toFixed(2)} km`} de vous
                </p>
              )}
              <div className="flex flex-wrap gap-1 mb-3">
                <VerificationBadge level={selected.verificationLevel} />
                {selected.safeCeliac && <SafeCeliacBadge />}
              </div>
              {(selected as any).averageRating != null && (
                <div className="flex items-center gap-2 mb-3">
                  <StarRating rating={(selected as any).averageRating} />
                  <span className="text-xs text-muted-foreground">({selected.reviewCount} avis)</span>
                </div>
              )}
              {selected.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{selected.description}</p>}
              <Link href={`/etablissements/${selected.id}`}>
                <Button className="w-full gap-2" size="sm">
                  Voir la fiche complète
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Mobile bottom panel */}
        {mobilePanel && selected && (
          <div className="md:hidden absolute bottom-0 left-0 right-0 z-[900] bg-card border-t border-border rounded-t-2xl shadow-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-base">{selected.name}</h3>
              <button onClick={() => { setMobilePanel(false); setSelectedId(null); }}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{typeLabels[selected.type]} · {selected.city}</p>
            {(selected as any).distance != null && (
              <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" />
                {(selected as any).distance < 1
                  ? `${Math.round((selected as any).distance * 1000)} m`
                  : `${(selected as any).distance.toFixed(2)} km`} de vous
              </p>
            )}
            <div className="flex flex-wrap gap-1 mb-3">
              <VerificationBadge level={selected.verificationLevel} />
              {selected.safeCeliac && <SafeCeliacBadge />}
            </div>
            <Link href={`/etablissements/${selected.id}`}>
              <Button className="w-full gap-2">
                Voir la fiche complète
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Mobile search bar */}
        <div className="md:hidden absolute top-4 left-4 right-4 z-[900] flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card shadow-md border-border"
              data-testid="input-mobile-search"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-card border border-border rounded-xl p-2.5 shadow-md"
            data-testid="button-mobile-filters"
          >
            <SlidersHorizontal className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
