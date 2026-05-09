import { useState } from "react";
import { Search, SlidersHorizontal, MapPin, Navigation, Loader2, X, AlertCircle } from "lucide-react";
import { useListEstablishments, getListEstablishmentsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import EstablishmentCard from "@/components/EstablishmentCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGeolocation } from "@/hooks/useGeolocation";

const typeOptions = [
  { value: "", label: "Tous les types" },
  { value: "restaurant", label: "Restaurants" },
  { value: "bakery", label: "Boulangeries" },
  { value: "grocery", label: "Épiceries" },
  { value: "cafe", label: "Cafés" },
  { value: "other", label: "Autres" },
];

const verificationOptions = [
  { value: "", label: "Tous" },
  { value: "certified", label: "Certifié" },
  { value: "community", label: "Vérifié communauté" },
  { value: "unverified", label: "Non vérifié" },
];

export default function EtablissementsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [verificationLevel, setVerificationLevel] = useState("");
  const [safeCeliac, setSafeCeliac] = useState(false);
  const [page, setPage] = useState(1);
  const [nearbyRadius, setNearbyRadius] = useState<number | null>(null);
  const limit = 12;

  const { state: geoState, locate, reset: resetGeo } = useGeolocation();

  const userLat = geoState.status === "success" ? geoState.lat : undefined;
  const userLng = geoState.status === "success" ? geoState.lng : undefined;

  const params: any = { page, limit };
  if (search) params.search = search;
  if (type) params.type = type;
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
      // Re-fetch when coords change
      enabled: geoState.status !== "loading",
    },
  });

  const establishments = data?.establishments ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const nearbyMode = geoState.status === "success";

  function handleLocateToggle() {
    if (nearbyMode) {
      resetGeo();
      setNearbyRadius(null);
      setPage(1);
    } else {
      locate();
      setPage(1);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Établissements</h1>
        <p className="text-muted-foreground">Trouvez les meilleurs lieux sans gluten près de chez vous</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-card border border-card-border rounded-xl p-5 sticky top-24 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />Filtres
            </h3>

            {/* Nearby Me toggle */}
            <div>
              <button
                onClick={handleLocateToggle}
                disabled={geoState.status === "loading"}
                data-testid="button-nearby"
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                  nearbyMode
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:bg-accent"
                }`}
              >
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
              </button>

              {geoState.status === "error" && (
                <div className="mt-2 flex items-start gap-2 p-2.5 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{geoState.message}</p>
                </div>
              )}

              {nearbyMode && (
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rayon</Label>
                  {[null, 1, 2, 5, 10].map((r) => (
                    <button
                      key={r ?? "all"}
                      onClick={() => { setNearbyRadius(r); setPage(1); }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        nearbyRadius === r
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-foreground"
                      }`}
                      data-testid={`filter-radius-${r ?? "all"}`}
                    >
                      {r == null ? "Toute distance" : `${r} km`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
                data-testid="input-search"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</Label>
              <div className="mt-2 space-y-1">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setType(opt.value); setPage(1); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${type === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground"}`}
                    data-testid={`filter-type-${opt.value || "all"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vérification</Label>
              <div className="mt-2 space-y-1">
                {verificationOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setVerificationLevel(opt.value); setPage(1); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${verificationLevel === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground"}`}
                    data-testid={`filter-verification-${opt.value || "all"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
              <Switch
                checked={safeCeliac}
                onCheckedChange={(v) => { setSafeCeliac(v); setPage(1); }}
                id="safe-celiac"
                data-testid="switch-safe-celiac"
              />
              <Label htmlFor="safe-celiac" className="text-sm font-medium text-orange-700 dark:text-orange-300 cursor-pointer">
                Safe coeliaque uniquement
              </Label>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                {isLoading ? "Chargement..." : `${total} établissement${total !== 1 ? "s" : ""} trouvé${total !== 1 ? "s" : ""}`}
              </p>
              {nearbyMode && geoState.status === "success" && (
                <p className="text-xs text-primary font-medium mt-0.5 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  Triés par distance depuis votre position
                  {geoState.accuracy <= 100 && (
                    <span className="text-muted-foreground font-normal">(précision ~{Math.round(geoState.accuracy)} m)</span>
                  )}
                </p>
              )}
            </div>
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <MapPin className="w-4 h-4" />
                Voir sur la carte
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : establishments.length === 0 ? (
            <div className="text-center py-20">
              <MapPin className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="font-semibold text-lg mb-1">Aucun établissement trouvé</h3>
              {nearbyMode && nearbyRadius != null ? (
                <p className="text-muted-foreground text-sm mb-4">
                  Aucun résultat dans un rayon de {nearbyRadius} km. Élargissez votre recherche.
                </p>
              ) : (
                <p className="text-muted-foreground text-sm mb-4">
                  Essayez de modifier vos filtres ou d&apos;ajouter un nouvel établissement.
                </p>
              )}
              {nearbyMode && nearbyRadius != null && (
                <Button variant="outline" onClick={() => { setNearbyRadius(null); setPage(1); }} className="mb-2 mr-2">
                  Toute distance
                </Button>
              )}
              <Link href="/ajouter">
                <Button>Ajouter un établissement</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {establishments.map((e) => (
                <EstablishmentCard key={e.id} establishment={e as any} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} data-testid="button-prev-page">
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} data-testid="button-next-page">
                Suivant
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
