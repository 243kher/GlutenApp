import { useState } from "react";
import {
  Search, SlidersHorizontal, MapPin, Navigation, Loader2,
  X, AlertCircle, ArrowLeft, Sparkles, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useListEstablishments, getListEstablishmentsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import EstablishmentCard from "@/components/EstablishmentCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGeolocation } from "@/hooks/useGeolocation";

// Option "grocery" supprimée de la liste
const typeOptions = [
  { value: "", label: "Tous les types" },
  { value: "restaurant", label: "Restaurants" },
  { value: "bakery", label: "Boulangeries" },
  { value: "cafe", label: "Cafés" },
  { value: "other", label: "Autres" },
];

const verificationOptions = [
  { value: "", label: "Tous" },
  { value: "certified", label: "Certifié" },
  { value: "community", label: "Vérifié communauté" },
  { value: "unverified", label: "Non vérifié" },
];

const radiusOptions: Array<{ value: number | null; label: string }> = [
  { value: null, label: "Toute distance" },
  { value: 1, label: "1 km" },
  { value: 2, label: "2 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
];

// ============================================================
// Petit bouton "pilule sélectionnable" réutilisable
// ============================================================
function PillButton({
  active, onClick, children, dataTestId,
}: { active: boolean; onClick: () => void; children: React.ReactNode; dataTestId?: string }) {
  return (
    <button
      onClick={onClick}
      data-testid={dataTestId}
      className={`relative px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
        active ? "text-primary-foreground border-primary" : "border-border/50 hover:bg-accent/50"
      }`}
    >
      {active && (
        <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-md shadow-primary/20" />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}

// ============================================================
// Contenu des filtres partagé entre sidebar desktop et modal mobile
// ============================================================
function FiltersContent({
  search, setSearch,
  type, setType,
  verificationLevel, setVerificationLevel,
  safeCeliac, setSafeCeliac,
  nearbyMode, geoState, handleLocateToggle,
  nearbyRadius, setNearbyRadius,
  setPage,
  variant = "desktop",
}: any) {
  const isMobile = variant === "mobile";

  return (
    <div className={`space-y-6 ${isMobile ? "" : ""}`}>
      {/* Près de moi */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 block">
          Localisation
        </Label>
        <button
          onClick={handleLocateToggle}
          disabled={geoState.status === "loading"}
          data-testid="button-nearby"
          className={`relative w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium text-sm border transition-all duration-200 ${
            nearbyMode
              ? "text-primary-foreground border-primary"
              : "bg-card/50 backdrop-blur border-border/50 hover:bg-accent/50"
          }`}
        >
          {nearbyMode && (
            <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-md shadow-primary/30" />
          )}
          <span className="relative flex items-center gap-2">
            {geoState.status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className={`w-4 h-4 ${nearbyMode ? "fill-primary-foreground" : ""}`} />
            )}
            {geoState.status === "loading"
              ? "Localisation..."
              : nearbyMode
              ? "Tri par proximité actif"
              : "Près de moi"}
            {nearbyMode && <X className="w-3.5 h-3.5 ml-auto opacity-70" />}
          </span>
        </button>

        {geoState.status === "error" && (
          <div className="mt-2 flex items-start gap-2 p-2.5 bg-destructive/10 rounded-xl border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{geoState.message}</p>
          </div>
        )}

        {nearbyMode && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {radiusOptions.map((r) => (
              <PillButton
                key={r.value ?? "all"}
                active={nearbyRadius === r.value}
                onClick={() => { setNearbyRadius(r.value); setPage(1); }}
                dataTestId={`filter-radius-${r.value ?? "all"}`}
              >
                {r.label}
              </PillButton>
            ))}
          </div>
        )}
      </div>

      {/* Recherche libre uniquement sur desktop (sur mobile elle est en haut) */}
      {!isMobile && (
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 block">
            Recherche
          </Label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Nom, mot-clé..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 rounded-xl bg-background/50 backdrop-blur border-border/50"
              data-testid="input-search"
            />
          </div>
        </div>
      )}

      {/* Type */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 block">
          Type d'établissement
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {typeOptions.map((opt) => (
            <PillButton
              key={opt.value}
              active={type === opt.value}
              onClick={() => { setType(opt.value); setPage(1); }}
              dataTestId={`filter-type-${opt.value || "all"}`}
            >
              {opt.label}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Vérification */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 block">
          Niveau de vérification
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {verificationOptions.map((opt) => (
            <PillButton
              key={opt.value}
              active={verificationLevel === opt.value}
              onClick={() => { setVerificationLevel(opt.value); setPage(1); }}
              data-testid={`filter-verification-${opt.value || "all"}`}
            >
              {opt.label}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Safe cœliaque */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30 border border-orange-200/50 dark:border-orange-800/50">
        <div>
          <p className="font-medium text-sm text-orange-900 dark:text-orange-200">Safe cœliaque uniquement</p>
          <p className="text-xs text-orange-700/80 dark:text-orange-400/80 mt-0.5">
            Établissements vraiment sûrs
          </p>
        </div>
        <Switch
          checked={safeCeliac}
          onCheckedChange={(v) => { setSafeCeliac(v); setPage(1); }}
          id="safe-celiac"
          data-testid="switch-safe-celiac"
        />
      </div>
    </div>
  );
}

// ============================================================
// Modal de filtres plein écran (mobile) style Airbnb
// ============================================================
function FiltersModal({ open, onClose, resultsCount, onReset, ...rest }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] md:hidden bg-background animate-in slide-in-from-bottom duration-300">
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/85 border-b border-border/40">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center gap-3 px-4 h-16">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-accent/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-lg flex-1">Filtres</h2>
          <button onClick={onReset} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Effacer
          </button>
        </div>
      </div>

      <div className="p-4 pb-32">
        <FiltersContent variant="mobile" {...rest} />
      </div>

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
// EtablissementsPage composant principal
// ============================================================
export default function EtablissementsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [verificationLevel, setVerificationLevel] = useState("");
  const [safeCeliac, setSafeCeliac] = useState(false);
  const [page, setPage] = useState(1);
  const [nearbyRadius, setNearbyRadius] = useState<number | null>(null);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const limit = 12;

  const { state: geoState, locate, reset: resetGeo } = useGeolocation();
  const userLat = geoState.status === "success" ? geoState.lat : undefined;
  const userLng = geoState.status === "success" ? geoState.lng : undefined;

  const params: any = { page, limit };
  if (search) params.search = search;
  
  // Modification stratégique ici :
  if (type) {
    params.type = type;
  } else {
    // Si l'utilisateur choisit "Tous les types", on envoie explicitement à l'API 
    // la liste des types autorisés (sans 'grocery') si votre backend accepte un tableau ou une string jointe.
    // Note : Si votre backend n'accepte pas ça, il faudra filtrer directement côté API (dans le backend).
    params.types = ["restaurant", "bakery", "cafe", "other"]; 
  }
  
  if (verificationLevel) params.verificationLevel = verificationLevel;
  if (safeCeliac) params.safeCeliac = true;
  if (userLat != null && userLng != null) {
    params.lat = userLat;
    params.lng = userLng;
    if (nearbyRadius != null) params.radius = nearbyRadius;
  }

  const { data, isLoading } = useListEstablishments(params, {
    query: {
      queryKey: getListEstablishmentsQueryKey(params),
      enabled: geoState.status !== "loading",
    },
  });

  const establishments = data?.establishments ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const nearbyMode = geoState.status === "success";

  function handleLocateToggle() {
    if (nearbyMode) { resetGeo(); setNearbyRadius(null); setPage(1); }
    else { locate(); setPage(1); }
  }

  function resetAllFilters() {
    setSearch(""); setType(""); setVerificationLevel("");
    setSafeCeliac(false); setNearbyRadius(null); setPage(1);
  }

  // Compteur de filtres actifs pour le badge sur le bouton mobile
  const activeFilterCount =
    (type ? 1 : 0) +
    (verificationLevel ? 1 : 0) +
    (safeCeliac ? 1 : 0) +
    (nearbyMode ? 1 : 0) +
    (nearbyRadius != null ? 1 : 0);

  // Chips d'aperçu des filtres actifs (mobile)
  const activeChips: Array<{ label: string; onRemove: () => void }> = [];
  if (type) activeChips.push({
    label: typeOptions.find(o => o.value === type)?.label || "",
    onRemove: () => { setType(""); setPage(1); },
  });
  if (verificationLevel) activeChips.push({
    label: verificationOptions.find(o => o.value === verificationLevel)?.label || "",
    onRemove: () => { setVerificationLevel(""); setPage(1); },
  });
  if (safeCeliac) activeChips.push({
    label: "Safe cœliaque",
    onRemove: () => { setSafeCeliac(false); setPage(1); },
  });
  if (nearbyMode && nearbyRadius != null) activeChips.push({
    label: `${nearbyRadius} km`,
    onRemove: () => { setNearbyRadius(null); setPage(1); },
  });

  const filtersProps = {
    search, setSearch, type, setType,
    verificationLevel, setVerificationLevel,
    safeCeliac, setSafeCeliac,
    nearbyMode, geoState, handleLocateToggle,
    nearbyRadius, setNearbyRadius, setPage,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      {/* ========================================================
          HEADER titre avec gradient + CTA carte
          ======================================================== */}
      <div className="mb-6 md:mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              Établissements
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Trouvez les meilleurs lieux sans gluten près de chez vous
          </p>
        </div>

        {/* CTA carte caché sur mobile (déjà dans la bottom nav) */}
        <Link href="/" className="hidden md:block">
          <Button variant="outline" size="sm" className="gap-2 rounded-full backdrop-blur bg-card/50 border-border/50">
            <MapPin className="w-4 h-4" />
            Voir sur la carte
          </Button>
        </Link>
      </div>

      {/* ========================================================
          BARRE MOBILE recherche + bouton filtres (sticky)
          ======================================================== */}
      <div className="md:hidden sticky top-16 z-30 -mx-4 px-4 py-3 mb-4 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-11 rounded-2xl bg-card/50 backdrop-blur border-border/50"
              data-testid="input-search-mobile"
            />
          </div>
          <button
            onClick={() => setFiltersModalOpen(true)}
            className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-card/50 backdrop-blur border border-border/50 hover:bg-accent/50 transition-colors"
            data-testid="button-filters-mobile"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-md shadow-primary/30">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Chips des filtres actifs (scrollable horizontal) */}
        {activeChips.length > 0 && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-none -mx-1 px-1">
            {activeChips.map((chip, i) => (
              <button
                key={i}
                onClick={chip.onRemove}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
              >
                {chip.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button
              onClick={resetAllFilters}
              className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          LAYOUT PRINCIPAL sidebar desktop + grille
          ======================================================== */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar desktop avec glassmorphism */}
        <aside className="hidden lg:block w-72 flex-shrink-0">
          <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl p-5 sticky top-24 shadow-sm">
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <h3 className="font-bold text-sm flex items-center gap-2 mb-5">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Filtres
              {activeFilterCount > 0 && (
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  {activeFilterCount} actif{activeFilterCount > 1 ? "s" : ""}
                </span>
              )}
            </h3>
            <FiltersContent variant="desktop" {...filtersProps} />
          </div>
        </aside>

        {/* Grille de résultats */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                {isLoading
                  ? "Chargement..."
                  : <><span className="font-semibold text-foreground">{total}</span> établissement{total !== 1 ? "s" : ""} trouvé{total !== 1 ? "s" : ""}</>}
              </p>
              {nearbyMode && geoState.status === "success" && (
                <p className="text-xs font-medium mt-0.5 flex items-center gap-1 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>Triés par distance</span>
                  {geoState.accuracy <= 100 && (
                    <span className="text-muted-foreground font-normal not-italic">
                      · précision ~{Math.round(geoState.accuracy)} m
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : establishments.length === 0 ? (
            <div className="text-center py-16 md:py-24 rounded-3xl bg-card/40 backdrop-blur border border-border/40">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <MapPin className="w-16 h-16 mx-auto text-muted-foreground/40 relative" />
              </div>
              <h3 className="font-bold text-lg mb-1">Aucun établissement trouvé</h3>
              <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto px-4">
                {nearbyMode && nearbyRadius != null
                  ? `Aucun résultat dans un rayon de ${nearbyRadius} km. Élargissez votre recherche.`
                  : "Essayez de modifier vos filtres ou d'ajouter un nouvel établissement."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {nearbyMode && nearbyRadius != null && (
                  <Button
                    variant="outline"
                    onClick={() => { setNearbyRadius(null); setPage(1); }}
                    className="rounded-full"
                  >
                    Toute distance
                  </Button>
                )}
                <Link href="/ajouter">
                  <Button className="rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/20">
                    Ajouter un établissement
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {establishments.map((e) => (
                <EstablishmentCard key={e.id} establishment={e as any} />
              ))}
            </div>
          )}

          {/* Pagination modernisée */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
                className="rounded-full backdrop-blur bg-card/50 border-border/50 gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </Button>
              <div className="px-4 py-1.5 rounded-full bg-card/50 backdrop-blur border border-border/50 text-sm">
                <span className="font-semibold">{page}</span>
                <span className="text-muted-foreground"> / {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                data-testid="button-next-page"
                className="rounded-full backdrop-blur bg-card/50 border-border/50 gap-1"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Modal de filtres mobile */}
      <FiltersModal
        open={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        resultsCount={total}
        onReset={resetAllFilters}
        {...filtersProps}
      />
    </div>
  );
}