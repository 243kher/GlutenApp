import { useState, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  Navigation,
  X,
  MapPin,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
  SlidersHorizontal,
  Sparkles,
  Store,
  Wheat,
  ShoppingCart,
  Coffee,
  MoreHorizontal,
  ShieldCheck,
  Filter,
  Check,
} from "lucide-react";
import { Link } from "wouter";
import {
  useListEstablishments,
  getListEstablishmentsQueryKey,
  useGetPlatformStats,
  getGetPlatformStatsQueryKey,
} from "@workspace/api-client-react";
import {
  VerificationBadge,
  SafeCeliacBadge,
} from "@/components/VerificationBadge";
import { StarRating } from "@/components/StarRating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGeolocation } from "@/hooks/useGeolocation";

// === Icônes Leaflet ===
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const verificationColors: Record<string, string> = {
  certified: "#16a34a",
  community: "#2563eb",
  unverified: "#9ca3af",
};

const typeColorsBg: Record<string, string> = {
  restaurant: "#f97316",
  bakery: "#eab308",
  grocery: "#22c55e",
  cafe: "#a78bfa",
  other: "#6b7280",
};
const typeLabels: Record<string, string> = {
  restaurant: "Restaurant",
  bakery: "Boulangerie",
  grocery: "Épicerie",
  cafe: "Café",
  other: "Autre",
};

// === Liste enrichie des types : chaque catégorie a une icône Lucide + un label ===
const typeFilters = [
  { value: "", label: "Tous", icon: MoreHorizontal },
  { value: "restaurant", label: "Restaurants", icon: Store },
  { value: "bakery", label: "Boulangeries", icon: Wheat },
  { value: "grocery", label: "Épiceries", icon: ShoppingCart },
  { value: "cafe", label: "Cafés", icon: Coffee },
];

// Même liste mais en version compacte pour le mobile (modal)
const typeOptions = typeFilters.map(({ value, label }) => ({ value, label }));

function createMarker(
  type: string,
  verificationLevel: string,
  isSelected = false,
) {
  const bgColor = typeColorsBg[type] ?? typeColorsBg.other;
  const borderColor =
    verificationColors[verificationLevel] ?? verificationColors.unverified;
  const size = isSelected ? 44 : 34;
  const borderW = isSelected ? 3 : 2;
  const fontSize = isSelected ? 17 : 14;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size + 8}px">
      <div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${bgColor};border:${borderW}px solid ${borderColor};transform:rotate(-45deg);box-shadow:0 ${isSelected ? 6 : 3}px ${isSelected ? 16 : 8}px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);font-size:${fontSize}px;line-height:1;margin-left:-2px;margin-top:-2px"></span>
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
// LocateButton flottant en bas à droite de la carte
// ============================================================
function LocateButton({
  onLocate,
  isLocating,
  isActive,
  onReset,
}: {
  onLocate: () => void;
  isLocating: boolean;
  isActive: boolean;
  onReset: () => void;
}) {
  return (
    <button
      onClick={isActive ? onReset : onLocate}
      disabled={isLocating}
      className={`absolute bottom-6 right-4 z-[1000] flex items-center gap-2 px-4 py-3 rounded-2xl backdrop-blur-xl border font-medium text-sm transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/50 shadow-lg shadow-primary/40"
          : "bg-card/70 border-border/50 shadow-lg hover:shadow-xl hover:scale-105"
      }`}
      data-testid="button-locate"
    >
      {isLocating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Navigation
          className={`w-4 h-4 ${isActive ? "fill-primary-foreground" : ""}`}
        />
      )}
      <span className="hidden sm:block">
        {isLocating
          ? "Localisation..."
          : isActive
            ? "Près de moi"
            : "Me localiser"}
      </span>
    </button>
  );
}

// ============================================================
// DraggableBottomSheet inchangé (mobile)
// ============================================================
type SnapPoint = "peek" | "half" | "full";
function DraggableBottomSheet({
  open,
  onClose,
  children,
  peekHeight = 160,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  peekHeight?: number;
}) {
  const [snap, setSnap] = useState<SnapPoint>("peek");
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const [vh, setVh] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800,
  );

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    if (open) setSnap("peek");
  }, [open]);

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
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const finalOffset = offsets[snap] + dragDelta;
    if (finalOffset > offsets.peek + 70) {
      onClose();
      setDragDelta(0);
      return;
    }
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
  const backdropOpacity = snap === "full" ? 0.45 : snap === "half" ? 0.2 : 0;

  return (
    <>
      <div
        onClick={() => setSnap("peek")}
        className="fixed inset-0 z-[1150] md:hidden"
        style={{
          backgroundColor: "black",
          opacity: backdropOpacity,
          pointerEvents: backdropOpacity > 0 ? "auto" : "none",
          transition: isDragging ? "none" : "opacity 0.3s ease",
        }}
      />
      <div
        className="fixed left-0 right-0 bottom-16 z-[1200] md:hidden"
        style={{
          height: `${sheetHeight}px`,
          transform: `translateY(${currentOffset}px)`,
          transition: isDragging
            ? "none"
            : "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div className="relative h-full bg-card/95 backdrop-blur-2xl border-t border-x border-border/40 rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
          >
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto" />
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// MobileSearchModal inchangé
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
    // flex-col + overflow-hidden permet au header de rester fixe en haut
    // et au contenu interne de scroller indépendamment
    <div className="fixed inset-0 z-[1200] md:hidden bg-background animate-in slide-in-from-bottom duration-300 flex flex-col">

      {/* === HEADER FIXE  plus de "sticky", c'est un vrai bloc en haut === */}
      <div className="relative flex-shrink-0 backdrop-blur-xl bg-background/95 border-b border-border/40">
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

      {/* === CONTENU SCROLLABLE  flex-1 prend tout l'espace restant === */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 space-y-7 pb-6">
          {/* Champ de recherche  on retire autoFocus pour que l'input
              ne se positionne pas au-dessus du clavier mobile */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 block">
              Recherche libre
            </Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nom, ville, mot-clé..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-12 rounded-2xl bg-card/50 backdrop-blur border-border/50 text-base"
              />
            </div>
          </div>

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
      </div>

      {/* === CTA  flex-shrink-0 reste en bas === */}
      <div className="flex-shrink-0 p-4 backdrop-blur-xl bg-background/95 border-t border-border/40">
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
// SelectedContent  inchangé
// ============================================================
function SelectedContent({
  selected,
  onClose,
}: {
  selected: any;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg leading-tight">{selected.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {typeLabels[selected.type]} · {selected.city}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 -mr-1.5 -mt-1.5 hover:bg-accent rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {selected.distance != null && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-semibold text-primary">
            {selected.distance < 1
              ? `${Math.round(selected.distance * 1000)} m`
              : `${selected.distance.toFixed(2)} km`}{" "}
            de vous
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
          <span className="text-xs text-muted-foreground">
            ({selected.reviewCount} avis)
          </span>
        </div>
      )}
      {selected.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {selected.description}
        </p>
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
// DesktopHeroBar  barre de recherche/filtres horizontale style Booking
// Sticky en haut, prend toute la largeur, avec :
// - input de recherche élargi
// - chips de catégories avec icônes
// - popovers pour filtres avancés
// - bouton "Près de moi" intégré
// - bouton "Effacer" si filtres actifs
// ============================================================
function DesktopHeroBar({
  search,
  setSearch,
  type,
  setType,
  safeCeliac,
  setSafeCeliac,
  verificationLevel,
  setVerificationLevel,
  geoState,
  locate,
  resetGeo,
  resultsCount,
  isLoading,
}: any) {
  const nearbyMode = geoState.status === "success";
  const activeFilterCount =
    (type ? 1 : 0) +
    (safeCeliac ? 1 : 0) +
    (verificationLevel ? 1 : 0) +
    (nearbyMode ? 1 : 0);

  function resetAll() {
    setSearch("");
    setType("");
    setSafeCeliac(false);
    setVerificationLevel("");
    if (nearbyMode) resetGeo();
  }

  return (
    <div className="hidden md:block relative bg-card/70 backdrop-blur-xl border-b border-border/40 shadow-sm">
      {/* Liseré lumineux en bas */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 space-y-3">
        {/* === LIGNE 1  recherche + bouton localisation + compteur === */}
        <div className="flex items-center gap-3">
          {/* Barre de recherche élargie */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un établissement, une ville, un mot-clé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-10 h-11 rounded-full bg-background/50 backdrop-blur border-border/50 text-sm focus-visible:ring-2 focus-visible:ring-primary/30"
              data-testid="input-map-search"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-accent/50 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Bouton "Près de moi" */}
          <button
            onClick={nearbyMode ? resetGeo : locate}
            disabled={geoState.status === "loading"}
            className={`relative h-11 px-4 rounded-full text-sm font-medium border transition-all duration-200 inline-flex items-center gap-2 ${
              nearbyMode
                ? "text-primary-foreground border-primary"
                : "bg-background/50 backdrop-blur border-border/50 hover:bg-accent/50"
            }`}
          >
            {nearbyMode && (
              <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-md shadow-primary/30" />
            )}
            <span className="relative flex items-center gap-2">
              {geoState.status === "loading" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation
                  className={`w-4 h-4 ${nearbyMode ? "fill-primary-foreground" : ""}`}
                />
              )}
              {nearbyMode ? "Près de moi" : "Me localiser"}
              {nearbyMode && <X className="w-3 h-3 ml-1 opacity-70" />}
            </span>
          </button>

          {/* Compteur de résultats à droite */}
          <div className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Chargement...
              </span>
            ) : (
              <>
                <span className="font-bold text-foreground">
                  {resultsCount}
                </span>{" "}
                résultat{resultsCount !== 1 ? "s" : ""}
              </>
            )}
          </div>
        </div>

        {/* === LIGNE 2  chips de catégories + filtres avancés === */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chips de types avec icônes */}
          <div className="flex gap-1.5 flex-wrap">
            {typeFilters.map(({ value, label, icon: Icon }) => {
              const active = type === value;
              return (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    active
                      ? "text-primary-foreground border-primary"
                      : "bg-background/40 backdrop-blur border-border/50 hover:bg-accent/50 hover:scale-105"
                  }`}
                  data-testid={`filter-type-${value || "all"}`}
                >
                  {active && (
                    <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-md shadow-primary/30" />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Séparateur visuel */}
          <div className="w-px h-6 bg-border/50 mx-1" />

          {/* === Popover Vérification === */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                  verificationLevel
                    ? "text-primary-foreground border-primary"
                    : "bg-background/40 backdrop-blur border-border/50 hover:bg-accent/50"
                }`}
              >
                {verificationLevel && (
                  <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-md shadow-primary/30" />
                )}
                <span className="relative flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Vérification
                  {verificationLevel && (
                    <span className="ml-0.5 px-1.5 rounded-full bg-white/25 text-[10px] font-bold">
                      1
                    </span>
                  )}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-64 p-2 rounded-2xl backdrop-blur-xl bg-card/95 border-border/50 z-[1300]"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                Niveau de vérification
              </p>
              {[
                { value: "", label: "Tous", desc: "Pas de filtre" },
                {
                  value: "certified",
                  label: "Certifiés",
                  desc: "Vérifiés par une association",
                },
                {
                  value: "community",
                  label: "Communauté",
                  desc: "Vérifiés par les utilisateurs",
                },
              ].map((opt) => {
                const active = verificationLevel === opt.value;
                return (
                  <button
                    key={opt.value || "all"}
                    onClick={() => setVerificationLevel(opt.value)}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-colors ${
                      active ? "bg-primary/10" : "hover:bg-accent/50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        active ? "bg-primary border-primary" : "border-border"
                      }`}
                    >
                      {active && (
                        <Check
                          className="w-3 h-3 text-primary-foreground"
                          strokeWidth={3}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {opt.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* === Toggle Safe cœliaque inline === */}
          <button
            onClick={() => setSafeCeliac(!safeCeliac)}
            className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
              safeCeliac
                ? "border-orange-400/50 bg-gradient-to-r from-orange-500/15 to-amber-500/10 text-orange-700 dark:text-orange-300"
                : "bg-background/40 backdrop-blur border-border/50 hover:bg-accent/50"
            }`}
          >
            <span className="text-base leading-none">🌾</span>
            Safe cœliaque
            <div
              className={`w-8 h-4 rounded-full relative transition-colors ${safeCeliac ? "bg-orange-500" : "bg-muted"}`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${safeCeliac ? "left-4" : "left-0.5"}`}
              />
            </div>
          </button>

          {/* === Bouton "Effacer" si filtres actifs === */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetAll}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-accent/50"
            >
              <X className="w-3 h-3" />
              Effacer ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Message d'erreur géoloc */}
        {geoState.status === "error" && (
          <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-xl border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{geoState.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HomePage  composant principal
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

  const params: any = { limit: 1000 };
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
  const { data: stats } = useGetPlatformStats({
    query: { queryKey: getGetPlatformStatsQueryKey() },
  });

  const establishments = (data as any)?.establishments ?? [];
  const selected = establishments.find((e: any) => e.id === selectedId) ?? null;

  const activeFilterCount =
    (type ? 1 : 0) + (safeCeliac ? 1 : 0) + (verificationLevel ? 1 : 0);

  return (
    <div className="flex flex-col h-[calc(100dvh-64px-64px)] md:h-[calc(100dvh-64px)] overflow-hidden relative">
      {/* ========================================================
          BARRE HERO DESKTOP  recherche + filtres en haut
          ======================================================== */}
      <DesktopHeroBar
        search={search}
        setSearch={setSearch}
        type={type}
        setType={setType}
        safeCeliac={safeCeliac}
        setSafeCeliac={setSafeCeliac}
        verificationLevel={verificationLevel}
        setVerificationLevel={setVerificationLevel}
        geoState={geoState}
        locate={locate}
        resetGeo={resetGeo}
        resultsCount={establishments.length}
        isLoading={isLoading}
      />

      {/* ========================================================
          ZONE PRINCIPALE  sidebar liste + carte
          ======================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ----- SIDEBAR DESKTOP  uniquement la liste des résultats ----- */}
        <aside className="hidden md:flex flex-col w-80 xl:w-96 bg-card/40 backdrop-blur-xl border-r border-border/40 z-10 flex-shrink-0 relative">
          <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />

          {/* Header sidebar  info de tri */}
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Recherche..."
                : `${establishments.length} établissement${establishments.length !== 1 ? "s" : ""}`}
            </p>
            {nearbyMode && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                <Sparkles className="w-3 h-3 text-primary" />
                Par proximité
              </span>
            )}
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : establishments.length === 0 ? (
              <div className="p-8 text-center">
                <div className="relative inline-block mb-3">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                  <MapPin className="w-12 h-12 text-muted-foreground/30 relative" />
                </div>
                <p className="font-medium text-sm mb-1">Aucun résultat</p>
                <p className="text-xs text-muted-foreground">
                  Essayez d'élargir vos filtres ou de changer de zone.
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {establishments.map((e: any) => {
                  const isSel = selectedId === e.id;
                  return (
                    <button
                      key={e.id}
                      onClick={() =>
                        setSelectedId(e.id === selectedId ? null : e.id)
                      }
                      className={`w-full text-left px-3 py-3 rounded-xl transition-all border ${
                        isSel
                          ? "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-sm shadow-primary/10"
                          : "border-transparent hover:bg-accent/50"
                      }`}
                      data-testid={`list-item-${e.id}`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Mini avatar emoji selon type */}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-sm leading-tight truncate">
                              {e.name}
                            </span>
                            {e.distance != null && (
                              <span className="text-xs font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex-shrink-0">
                                {e.distance < 1
                                  ? `${Math.round(e.distance * 1000)} m`
                                  : `${e.distance.toFixed(1)} km`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {typeLabels[e.type]} · {e.city}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor:
                                  verificationColors[e.verificationLevel] ??
                                  "#6b7280",
                              }}
                            />
                            {e.safeCeliac && <SafeCeliacBadge />}
                            {e.averageRating != null && (
                              <StarRating rating={e.averageRating} />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats footer */}
          {stats && (
            <div className="p-3 border-t border-border/40">
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-background/40 backdrop-blur rounded-xl p-2 border border-border/30">
                  <p className="text-base font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                    {(stats as any).totalEstablishments}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    Lieux
                  </p>
                </div>
                <div className="bg-background/40 backdrop-blur rounded-xl p-2 border border-border/30">
                  <p className="text-base font-bold text-green-600">
                    {(stats as any).certifiedCount}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    Certifiés
                  </p>
                </div>
                <div className="bg-background/40 backdrop-blur rounded-xl p-2 border border-border/30">
                  <p className="text-base font-bold text-orange-600">
                    {(stats as any).safeCeliacCount}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    Safe
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ----- CARTE ----- */}
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

            {userLat != null && userLng != null && (
              <MapController lat={userLat} lng={userLng} />
            )}

            {userLat != null && userLng != null && (
              <>
                <Marker position={[userLat, userLng]} icon={userPositionIcon} />
                {geoState.status === "success" && geoState.accuracy <= 500 && (
                  <Circle
                    center={[userLat, userLng]}
                    radius={geoState.accuracy}
                    pathOptions={{
                      color: "#3b82f6",
                      fillColor: "#3b82f6",
                      fillOpacity: 0.1,
                      weight: 1,
                    }}
                  />
                )}
              </>
            )}

            {establishments.map((e: any) => (
              <Marker
                key={e.id}
                position={[e.lat, e.lng]}
                icon={createMarker(
                  e.type,
                  e.verificationLevel,
                  selectedId === e.id,
                )}
                eventHandlers={{ click: () => setSelectedId(e.id) }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-semibold text-sm mb-1">{e.name}</h3>
                    <p className="text-xs text-gray-500 mb-1">
                      {typeLabels[e.type]} · {e.city}
                    </p>
                    {e.distance != null && (
                      <p className="text-xs font-semibold text-green-700 mb-1">
                        {e.distance < 1
                          ? `${Math.round(e.distance * 1000)} m`
                          : `${e.distance.toFixed(2)} km`}{" "}
                        de vous
                      </p>
                    )}
                    {e.safeCeliac && (
                      <p className="text-xs text-orange-600 font-medium mb-1">
                        Safe cœliaque
                      </p>
                    )}
                    {e.averageRating != null && (
                      <p className="text-xs text-gray-600">
                        {e.averageRating.toFixed(1)}/5 ({e.reviewCount} avis)
                      </p>
                    )}
                    <a
                      href={`/etablissements/${e.id}`}
                      className="text-xs text-green-600 hover:underline font-medium mt-1 block"
                    >
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
            <div className="hidden md:block absolute top-4 right-4 z-[1000] w-80 bg-card/95 backdrop-blur-2xl border border-border/40 rounded-3xl shadow-2xl p-5">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <SelectedContent
                selected={selected}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}

          {/* === Pill de recherche mobile (style Airbnb) === */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="md:hidden absolute top-4 left-4 right-4 z-[1000] flex items-center gap-3 px-4 py-3.5 rounded-2xl backdrop-blur-xl bg-card/85 border border-border/50 shadow-lg hover:shadow-xl transition-shadow"
            data-testid="mobile-search-trigger"
          >
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span
              className={`flex-1 text-left text-sm truncate ${search ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
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

          {/* Bottom sheet draggable (mobile) */}
          <DraggableBottomSheet
            open={selected !== null}
            onClose={() => setSelectedId(null)}
          >
            {selected && (
              <SelectedContent
                selected={selected}
                onClose={() => setSelectedId(null)}
              />
            )}
          </DraggableBottomSheet>
        </div>
      </div>

      {/* Modal de recherche plein écran (mobile) */}
      <MobileSearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        search={search}
        setSearch={setSearch}
        type={type}
        setType={setType}
        safeCeliac={safeCeliac}
        setSafeCeliac={setSafeCeliac}
        verificationLevel={verificationLevel}
        setVerificationLevel={setVerificationLevel}
        resultsCount={establishments.length}
      />
    </div>
  );
}
