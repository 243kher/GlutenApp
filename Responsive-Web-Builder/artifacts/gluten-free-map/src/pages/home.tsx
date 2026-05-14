import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search, Navigation, X, MapPin, ChevronRight, Loader2,
  AlertCircle, ArrowLeft, SlidersHorizontal, Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import {
  useListEstablishments, getListEstablishmentsQueryKey,
  useGetPlatformStats, getGetPlatformStatsQueryKey,
} from "@workspace/api-client-react";
import { VerificationBadge, SafeCeliacBadge } from "@/components/VerificationBadge";
import { StarRating } from "@/components/StarRating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/hooks/useGeolocation";

// === Icônes Leaflet ===
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const verificationColors: Record<string, string> = {
  certified: "#16a34a", community: "#2563eb", unverified: "#9ca3af",
};
const typeEmojis: Record<string, string> = {
  restaurant: "🍽", bakery: "🥖", grocery: "🛒", cafe: "☕", other: "📍",
};
const typeColorsBg: Record<string, string> = {
  restaurant: "#f97316", bakery: "#eab308", grocery: "#22c55e", cafe: "#a78bfa", other: "#6b7280",
};
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

function createMarker(type: string, verificationLevel: string, isSelected = false) {
  const bgColor = typeColorsBg[type] ?? typeColorsBg.other;
  const borderColor = verificationColors[verificationLevel] ?? verificationColors.unverified;
  const emoji = typeEmojis[type] ?? "📍";
  const size = isSelected ? 44 : 34;
  const borderW = isSelected ? 3 : 2;
  const fontSize = isSelected ? 17 : 14;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size + 8}px">
      <div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${bgColor};border:${borderW}px solid ${borderColor};transform:rotate(-45deg);box-shadow:0 ${isSelected ? 6 : 3}px ${isSelected ? 16 : 8}px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);font-size:${fontSize}px;line-height:1;margin-left:-2px;margin-top:-2px">${emoji}</span>
      </div>
    </div>`,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  });
}

const userPositionIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:18px;height:18px">
    <div style="position:absolute;inset:-12px;border-radius:50%;background:rgba(59,130,246,0.15);"></div>
    <div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 4px 14px rgba(59,130,246,0.5)"></div>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.setView([lat, lng], 14, { animate: true });
  return null;
}

// ============================================================
// LocateButton — bouton de localisation flottant glassmorphism
// ============================================================
function LocateButton({ onLocate, isLocating, isActive, onReset }: {
  onLocate: () => void; isLocating: boolean; isActive: boolean; onReset: () => void;
}) {
  return (
    <button
      onClick={isActive ? onReset : onLocate}
      disabled={isLocating}
      className={`absolute bottom-6 right-4 z-[800] flex items-center gap-2 px-4 py-3 rounded-2xl backdrop-blur-xl border font-medium text-sm transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/50 shadow-lg shadow-primary/40"
          : "bg-card/70 border-border/50 shadow-lg hover:shadow-xl hover:scale-105"
      }`}
      data-testid="button-locate"
    >
      {isLocating
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Navigation className={`w-4 h-4 ${isActive ? "fill-primary-foreground" : ""}`} />}
      <span className="hidden sm:block">
        {isLocating ? "Localisation..." : isActive ? "Près de moi" : "Me localiser"}
      </span>
    </button>
  );
}

// ============================================================
// DraggableBottomSheet — Apple/Google Maps style
// 3 points d'ancrage : peek (160px) / half (50vh) / full (88vh)
// Drag depuis le handle, backdrop progressif, fermeture sur drag down
// ============================================================
type SnapPoint = "peek" | "half" | "full";

function DraggableBottomSheet({
  open, onClose, children, peekHeight = 160,
}: {
  open: boolean; onClose: () => void; children: React.ReactNode; peekHeight?: number;
}) {
  const [snap, setSnap] = useState<SnapPoint>("peek");
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const [vh, setVh] = useState(typeof window !== "undefined" ? window.innerHeight : 800);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Reset à 'peek' quand on ouvre
  useEffect(() => { if (open) setSnap("peek"); }, [open]);

  const sheetHeight = vh * 0.88;
  const offsets: Record<SnapPoint, number> = {
    full: 0,
    half: sheetHeight - vh * 0.5,
    peek: sheetHeight - peekHeight,
  };
  const currentOffset = Math.max(0, offsets[snap] + dragDelta);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragDelta(e.clientY - startY.current);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}

    const finalOffset = offsets[snap] + dragDelta;

    // Drag down marqué → fermeture
    if (finalOffset > offsets.peek + 70) {
      onClose();
      setDragDelta(0);
      return;
    }

    // Sinon, snap au point le plus proche
    const candidates: Array<{ name: SnapPoint; dist: number }> = [
      { name: "peek", dist: Math.abs(finalOffset - offsets.peek) },
      { name: "half", dist: Math.abs(finalOffset - offsets.half) },
      { name: "full", dist: Math.abs(finalOffset - offsets.full) },
    ];
    candidates.sort((a, b) => a.dist - b.dist);
    setSnap(candidates[0].name);
    setDragDelta(0);
  };

  if (!open) return null;

  // Backdrop transparent au peek, sombre au full
  const backdropOpacity = snap === "full" ? 0.45 : snap === "half" ? 0.2 : 0;

  return (
    <>
      {/* Backdrop sombre qui apparaît quand la sheet monte */}
      <div
        onClick={() => setSnap("peek")}
        className="fixed inset-0 z-[890] md:hidden"
        style={{
          backgroundColor: "black",
          opacity: backdropOpacity,
          pointerEvents: backdropOpacity > 0 ? "auto" : "none",
          transition: isDragging ? "none" : "opacity 0.3s ease",
        }}
      />

      {/* La sheet elle-même */}
      <div
        className="fixed left-0 right-0 bottom-16 z-[900] md:hidden"
        style={{
          height: `${sheetHeight}px`,
          transform: `translateY(${currentOffset}px)`,
          transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div className="relative h-full bg-card/95 backdrop-blur-2xl border-t border-x border-border/40 rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden">
          {/* Liseré lumineux en haut */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {/* Drag handle — la seule zone qui déclenche le drag */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
          >
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto" />
          </div>

          {/* Contenu scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// MobileSearchModal — Airbnb style : modal plein écran
// ============================================================
function MobileSearchModal({
  open, onClose, search, setSearch, type, setType,
  safeCeliac, setSafeCeliac, verificationLevel, setVerificationLevel,
  resultsCount,
}: any) {
  if (!open) return null;

  const resetAll = () => {
    setSearch(""); setType(""); setSafeCeliac(false); setVerificationLevel("");
  };

  return (
    <div className="fixed inset-0 z-[1100] md:hidden bg-background animate-in slide-in-from-bottom duration-300">
      {/* Header sticky avec retour + reset */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center gap-3 px-4 h-16">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-accent/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-lg flex-1">Rechercher</h2>
          <button onClick={resetAll} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Effacer
          </button>
        </div>
      </div>

      <div className="p-4 space-y-7 pb-32">
        {/* Champ de recherche */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 block">
            Recherche libre
          </Label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Nom, ville, mot-clé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 rounded-2xl bg-card/50 backdrop-blur border-border/50 text-base"
            />
          </div>
        </div>

        {/* Type d'établissement — grille de pilules */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
            Type d'établissement
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {typeOptions.map((opt) => {
              const active = type === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`relative p-3 rounded-2xl text-sm font-medium border transition-all duration-200 ${
                    active ? "text-primary-foreground border-primary" : "border-border/50 hover:bg-accent/50"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-md shadow-primary/30" />
                  )}
                  <span className="relative">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtres binaires */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
            Filtres
          </Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-card/50 backdrop-blur border border-border/50">
              <div>
                <p className="font-medium text-sm">Safe cœliaque</p>
                <p className="text-xs text-muted-foreground">Établissements vraiment sûrs pour les cœliaques</p>
              </div>
              <Switch checked={safeCeliac} onCheckedChange={setSafeCeliac} />
            </div>

            <button
              onClick={() => setVerificationLevel((v: string) => v === "certified" ? "" : "certified")}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-card/50 backdrop-blur border border-border/50 hover:bg-card transition-colors text-left"
            >
              <div>
                <p className="font-medium text-sm">Certifiés uniquement</p>
                <p className="text-xs text-muted-foreground">Vérifiés par une association</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                verificationLevel === "certified" ? "bg-primary border-primary shadow-md shadow-primary/30" : "border-border"
              }`}>
                {verificationLevel === "certified" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* CTA flottant en bas */}
      <div className="fixed bottom-0 left-0 right-0 p-4 backdrop-blur-xl bg-background/90 border-t border-border/40">
        <Button
          onClick={onClose}
          className="w-full h-12 rounded-2xl text-base font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow"
        >
          Voir {resultsCount} résultat{resultsCount !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Contenu du panel "établissement sélectionné" — partagé desktop/mobile
// ============================================================
function SelectedContent({ selected, onClose }: { selected: any; onClose: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg leading-tight">{selected.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {typeLabels[selected.type]} · {selected.city}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 -mr-1.5 -mt-1.5 hover:bg-accent rounded-full transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {selected.distance != null && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-semibold text-primary">
            {selected.distance < 1
              ? `${Math.round(selected.distance * 1000)} m`
              : `${selected.distance.toFixed(2)} km`} de vous
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <VerificationBadge level={selected.verificationLevel} />
        {selected.safeCeliac && <SafeCeliacBadge />}
      </div>

      {selected.averageRating != null && (
        <div className="flex items-center gap-2">
          <StarRating rating={selected.averageRating} />
          <span className="text-xs text-muted-foreground">({selected.reviewCount} avis)</span>
        </div>
      )}

      {selected.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
      )}

      <Link href={`/etablissements/${selected.id}`}>
        <Button className="w-full gap-2 h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow">
          Voir la fiche complète
          <ChevronRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}

// ============================================================
// HomePage — composant principal
// ============================================================
export default function HomePage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [safeCeliac, setSafeCeliac] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const { state: geoState, locate, reset: resetGeo } = useGeolocation();
  const userLat = geoState.status === "success" ? geoState.lat : undefined;
  const userLng = geoState.status === "success" ? geoState.lng : undefined;
  const nearbyMode = geoState.status === "success";

  const params: any = { limit: 50 };
  if (search) params.search = search;
  if (type) params.type = type;
  if (safeCeliac) params.safeCeliac = true;
  if (verificationLevel) params.verificationLevel = verificationLevel;
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
  const { data: stats } = useGetPlatformStats({ query: { queryKey: getGetPlatformStatsQueryKey() } });

  const establishments = (data as any)?.establishments ?? [];
  const selected = establishments.find((e: any) => e.id === selectedId) ?? null;

  // Nombre de filtres actifs (pour le badge sur la pill mobile)
  const activeFilterCount =
    (type ? 1 : 0) + (safeCeliac ? 1 : 0) + (verificationLevel ? 1 : 0);

  return (
    <div className="-mb-20 md:mb-0 flex h-[calc(100dvh-128px)] md:h-[calc(100dvh-64px)] overflow-hidden relative">
      {/* ========================================================
          SIDEBAR DESKTOP — modernisée avec glassmorphism
          ======================================================== */}
      <aside className="hidden md:flex flex-col w-80 xl:w-96 bg-card/60 backdrop-blur-xl border-r border-border/40 z-10 flex-shrink-0 relative">
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />

        <div className="p-4 border-b border-border/40 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un établissement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-background/50 backdrop-blur border-border/50"
              data-testid="input-map-search"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {typeOptions.map((opt) => {
              const active = type === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`relative px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    active ? "text-primary-foreground border-primary" : "border-border/50 hover:bg-accent/50"
                  }`}
                  data-testid={`filter-type-${opt.value || "all"}`}
                >
                  {active && <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-md shadow-primary/20" />}
                  <span className="relative">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={safeCeliac} onCheckedChange={setSafeCeliac} id="safe-map" data-testid="switch-safe-celiac" />
              <Label htmlFor="safe-map" className="text-xs text-orange-700 dark:text-orange-300 cursor-pointer font-medium">
                Safe cœliaque
              </Label>
            </div>
            <button
              onClick={() => setVerificationLevel(v => v === "certified" ? "" : "certified")}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                verificationLevel === "certified"
                  ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700"
                  : "border-border/50 hover:bg-accent/50"
              }`}
            >
              Certifié
            </button>
          </div>

          {geoState.status === "error" && (
            <div className="flex items-start gap-2 p-2.5 bg-destructive/10 rounded-xl border border-destructive/20">
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
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-xs text-muted-foreground">
                  {establishments.length} établissement{establishments.length !== 1 ? "s" : ""}
                </p>
                {nearbyMode && (
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Par proximité
                  </span>
                )}
              </div>
              {establishments.map((e: any) => {
                const isSel = selectedId === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id === selectedId ? null : e.id)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-all border ${
                      isSel
                        ? "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-sm shadow-primary/10"
                        : "border-transparent hover:bg-accent/50"
                    }`}
                    data-testid={`list-item-${e.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: verificationColors[e.verificationLevel] ?? "#6b7280" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium text-sm leading-tight truncate">{e.name}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{typeLabels[e.type]}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{e.city}</span>
                          {e.distance != null && (
                            <span className="text-xs font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
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
                );
              })}
            </div>
          )}
        </div>

        {stats && (
          <div className="p-4 border-t border-border/40">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 backdrop-blur rounded-xl p-2 border border-border/30">
                <p className="text-lg font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                  {(stats as any).totalEstablishments}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Lieux</p>
              </div>
              <div className="bg-muted/50 backdrop-blur rounded-xl p-2 border border-border/30">
                <p className="text-lg font-bold text-green-600">{(stats as any).certifiedCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Certifiés</p>
              </div>
              <div className="bg-muted/50 backdrop-blur rounded-xl p-2 border border-border/30">
                <p className="text-lg font-bold text-orange-600">{(stats as any).safeCeliacCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Safe</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ========================================================
          CARTE
          ======================================================== */}
      <div className="flex-1 relative">
        <MapContainer center={[46.8, 2.3]} zoom={6} className="w-full h-full" zoomControl={false}>
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {userLat != null && userLng != null && <MapController lat={userLat} lng={userLng} />}

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

          {establishments.map((e: any) => (
            <Marker
              key={e.id}
              position={[e.lat, e.lng]}
              icon={createMarker(e.type, e.verificationLevel, selectedId === e.id)}
              eventHandlers={{ click: () => setSelectedId(e.id) }}
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
                  {e.safeCeliac && <p className="text-xs text-orange-600 font-medium mb-1">Safe cœliaque</p>}
                  {e.averageRating != null && (
                    <p className="text-xs text-gray-600">{e.averageRating.toFixed(1)}/5 ({e.reviewCount} avis)</p>
                  )}
                  <a href={`/etablissements/${e.id}`} className="text-xs text-green-600 hover:underline font-medium mt-1 block">
                    Voir la fiche →
                  </a>
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

        {/* === Panel desktop pour l'établissement sélectionné === */}
        {selected && (
          <div className="hidden md:block absolute top-4 right-4 z-[900] w-80 bg-card/95 backdrop-blur-2xl border border-border/40 rounded-3xl shadow-2xl p-5">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <SelectedContent selected={selected} onClose={() => setSelectedId(null)} />
          </div>
        )}

        {/* === Pill de recherche flottante (mobile) — Airbnb style === */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="md:hidden absolute top-4 left-4 right-4 z-[800] flex items-center gap-3 px-4 py-3.5 rounded-2xl backdrop-blur-xl bg-card/85 border border-border/50 shadow-lg hover:shadow-xl transition-shadow"
          data-testid="mobile-search-trigger"
        >
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className={`flex-1 text-left text-sm truncate ${search ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {search || "Où mangez-vous sans gluten ?"}
          </span>
          {activeFilterCount > 0 ? (
            <span className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold shadow-md shadow-primary/30">
              {activeFilterCount}
            </span>
          ) : (
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </button>

        {/* === Bottom sheet draggable (mobile) === */}
        <DraggableBottomSheet
          open={selected !== null}
          onClose={() => setSelectedId(null)}
        >
          {selected && <SelectedContent selected={selected} onClose={() => setSelectedId(null)} />}
        </DraggableBottomSheet>
      </div>

      {/* === Modal de recherche plein écran (mobile) === */}
      <MobileSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        search={search} setSearch={setSearch}
        type={type} setType={setType}
        safeCeliac={safeCeliac} setSafeCeliac={setSafeCeliac}
        verificationLevel={verificationLevel} setVerificationLevel={setVerificationLevel}
        resultsCount={establishments.length}
      />
    </div>
  );
}