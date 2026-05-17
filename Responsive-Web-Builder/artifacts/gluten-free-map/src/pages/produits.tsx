import { useState } from "react";
import {
  Search, ShoppingBag, BadgeCheck, X, Sparkles,
  ChevronLeft, ChevronRight, Package,
  Link,
} from "lucide-react";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// ============================================================
// Configuration des catégories  couleurs 
// ============================================================
const categoryConfig: Record<string, { gradient: string; ring: string }> = {
  "Pain":     { gradient: "from-amber-400/20 to-amber-500/5",  ring: "ring-amber-400/30" },
  "Pâtes":    { gradient: "from-yellow-400/20 to-yellow-500/5", ring: "ring-yellow-400/30" },
  "Farine":   { gradient: "from-orange-400/20 to-orange-500/5", ring: "ring-orange-400/30" },
  "Céréales": { gradient: "from-lime-400/20 to-lime-500/5",      ring: "ring-lime-400/30" },
  "Biscuits": { gradient: "from-rose-400/20 to-rose-500/5",     ring: "ring-rose-400/30" },
  "Levure":   { gradient: "from-purple-400/20 to-purple-500/5", ring: "ring-purple-400/30" },
  "Sauce":    { gradient: "from-teal-400/20 to-teal-500/5",   ring: "ring-teal-400/30" },
  "Pizza":    { gradient: "from-red-400/20 to-red-500/5",       ring: "ring-red-400/30" },
};

const fallbackCategory = {
  gradient: "from-muted/40 to-muted/10",
  ring: "ring-border",
};

// Liste des catégories disponibles pour le filtre (ordre fixe et stable)
const availableCategories = [
  "Pain", "Pâtes", "Farine", "Céréales", "Biscuits", "Levure", "Sauce", "Pizza",
];

export default function ProduitsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 16;

  const params: any = { page, limit };
  if (search) params.search = search;
  if (category) params.category = category;
  if (verifiedOnly) params.isVerified = true;

  const { data, isLoading } = useListProducts(params, {
    query: { queryKey: getListProductsQueryKey(params) },
  });

  const products = (data as any)?.products ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const activeFilterCount = (category ? 1 : 0) + (verifiedOnly ? 1 : 0);

  function resetFilters() {
    setSearch("");
    setCategory("");
    setVerifiedOnly(false);
    setPage(1);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      {/* ========================================================
          HEADER  titre + sous-titre, plus impactant
          ======================================================== */}
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Catalogue communautaire</span>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2">
          <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
            Produits sans gluten
          </span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl md:mx-0 mx-auto">
          Trouvez des produits certifiés sans gluten dans les commerces de proximité
        </p>
      </div>

      {/* ========================================================
          BARRE DE RECHERCHE  hero pleine largeur avec glassmorphism
          ======================================================== */}
      <div className="relative mb-6 max-w-3xl mx-auto md:mx-0">
        {/* Halo lumineux derrière la barre */}
        <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder='Rechercher un produit (ex: "levure sans gluten")'
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-12 pr-12 h-14 text-base rounded-2xl bg-card/70 backdrop-blur-xl border-border/50 shadow-lg focus-visible:ring-2 focus-visible:ring-primary/30"
            data-testid="input-search-product"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-accent/50 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          FILTRES  chips de catégories + toggle "vérifiés"
          Scroll horizontal sur mobile, wrap sur desktop
          ======================================================== */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto md:flex-wrap scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 pb-1">
          <CategoryChip
            label="Tout"
            active={category === ""}
            onClick={() => { setCategory(""); setPage(1); }}
          />
          {availableCategories.map((cat) => {
            const cfg = categoryConfig[cat] ?? fallbackCategory;
            return (
              <CategoryChip
                key={cat}
                label={cat}
                active={category === cat}
                onClick={() => { setCategory(cat === category ? "" : cat); setPage(1); }}
              />
            );
          })}
        </div>
{/* 
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Toggle "Vérifiés uniquement" 
          <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-full bg-card/50 backdrop-blur border border-border/50">
            <Switch
              checked={verifiedOnly}
              onCheckedChange={(v) => { setVerifiedOnly(v); setPage(1); }}
              id="verified-only"
              data-testid="switch-verified"
            />
            <Label htmlFor="verified-only" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-green-600" />
              Vérifiés uniquement
            </Label>
          </div>

          {/* Reset si filtres actifs 
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-full hover:bg-accent/50"
            >
              Effacer les filtres
            </button>
          )}
        </div>*/}
      </div>

      {/* ========================================================
          COMPTEUR DE RÉSULTATS
          ======================================================== */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground" data-testid="text-product-count">
          {isLoading
            ? "Chargement..."
            : <><span className="font-semibold text-foreground">{total}</span> produit{total !== 1 ? "s" : ""} trouvé{total !== 1 ? "s" : ""}</>}
        </p>
      </div>

      {/* ========================================================
          GRILLE DE PRODUITS
          ======================================================== */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState onReset={resetFilters} hasFilters={activeFilterCount > 0 || !!search} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {products.map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* ========================================================
          PAGINATION
          ======================================================== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-full border border-border/50 bg-card/50 backdrop-blur text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/50 transition-colors"
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Précédent</span>
          </button>
          <div className="px-4 py-2 rounded-full bg-card/50 backdrop-blur border border-border/50 text-sm">
            <span className="font-bold">{page}</span>
            <span className="text-muted-foreground"> / {totalPages}</span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-full border border-border/50 bg-card/50 backdrop-blur text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/50 transition-colors"
            data-testid="button-next-page"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Chip de filtre par catégorie  pilule avec label
// ============================================================
function CategoryChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
        active
          ? "text-primary-foreground border-primary"
          : "bg-card/50 backdrop-blur border-border/50 hover:bg-accent/50 hover:scale-105"
      }`}
    >
      {active && (
        <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-md shadow-primary/30" />
      )}
      <span className="relative flex items-center gap-1.5">
        {label}
      </span>
    </button>
  );
}

// ============================================================
// Carte produit  design moderne avec hover effect
// ============================================================
function ProductCard({ product }: { product: any }) {
  const cfg = categoryConfig[product.category] ?? fallbackCategory;

  return (
    <Link href={`/produits/${product.id}`}>
      
        className="group relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 block cursor-pointer"
        data-testid={`card-product-${product.id}`}
      >
    <div
      className="group relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
      data-testid={`card-product-${product.id}`}
    >
      {/* Liseré lumineux en haut au hover */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* === Image / placeholder avec fond dégradé selon catégorie === */}
      <div className={`relative h-32 sm:h-36 bg-gradient-to-br ${cfg.gradient} flex items-center justify-center overflow-hidden`}>


        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="relative w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <span className="relative text-5xl drop-shadow-sm group-hover:scale-110 transition-transform duration-500">
          </span>
        )}

        {/* Badge "Vérifié" flottant en haut à droite de l'image */}
        {product.isVerified && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/90 backdrop-blur text-white text-[10px] font-bold shadow-md shadow-green-500/30">
            <BadgeCheck className="w-3 h-3" />
            <span className="hidden sm:inline">Vérifié</span>
          </div>
        )}
      </div>

      {/* === Contenu === */}
      <div className="p-3 md:p-4">
        <h3
          className="font-bold text-sm leading-tight mb-1 line-clamp-2 min-h-[2.5rem]"
          data-testid={`text-product-name-${product.id}`}
        >
          {product.name}
        </h3>
        {product.brand && (
          <p className="text-xs text-muted-foreground mb-2 truncate">{product.brand}</p>
        )}

        {product.category && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/60 backdrop-blur border border-border/40 text-[11px] font-medium text-foreground/80">
            {product.category}
          </div>
        )}

        {product.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
      </div>
    </div></Link>
  );
}

// ============================================================
// État vide
// ============================================================
function EmptyState({ onReset, hasFilters }: { onReset: () => void; hasFilters: boolean }) {
  return (
    <div className="text-center py-16 md:py-24 rounded-3xl bg-card/40 backdrop-blur border border-border/40">
      <div className="relative inline-block mb-4">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        <Package className="w-16 h-16 text-muted-foreground/40 relative" />
      </div>
      <h3 className="font-bold text-lg mb-1">Aucun produit trouvé</h3>
      <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto px-4">
        {hasFilters
          ? "Essayez de modifier vos filtres ou votre recherche."
          : "Le catalogue est en cours de constitution. Revenez bientôt !"}
      </p>
      {hasFilters && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-shadow"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}