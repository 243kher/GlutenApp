import { useState } from "react";
import { Search, ShoppingBag, BadgeCheck } from "lucide-react";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ProduitsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 16;

  const params: any = { page, limit };
  if (search) params.search = search;

  const { data, isLoading } = useListProducts(params, {
    query: { queryKey: getListProductsQueryKey(params) },
  });

  const products = (data as any)?.products ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const categoryColors: Record<string, string> = {
    "Pain": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    "Pâtes": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    "Farine": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    "Céréales": "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
    "Biscuits": "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    "Levure": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "Sauce": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    "Pizza": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Produits sans gluten</h1>
        <p className="text-muted-foreground">Trouvez des produits certifiés sans gluten dans les commerces de proximité</p>
      </div>

      <div className="relative max-w-xl mb-8">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder='Rechercher un produit (ex: "levure sans gluten")'
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-10 h-12 text-base"
          data-testid="input-search-product"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground" data-testid="text-product-count">
          {isLoading ? "Chargement..." : `${total} produit${total !== 1 ? "s" : ""} trouvé${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="font-semibold text-lg mb-1">Aucun produit trouvé</h3>
          <p className="text-muted-foreground text-sm">Essayez une autre recherche ou explorez tous les produits.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p: any) => (
            <div
              key={p.id}
              className="bg-card border border-card-border rounded-xl p-4 hover:shadow-md transition-shadow"
              data-testid={`card-product-${p.id}`}
            >
              <div className="h-24 bg-muted rounded-lg mb-3 flex items-center justify-center">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                )}
              </div>
              <h3 className="font-semibold text-sm leading-tight mb-1" data-testid={`text-product-name-${p.id}`}>{p.name}</h3>
              {p.brand && <p className="text-xs text-muted-foreground mb-2">{p.brand}</p>}
              <div className="flex flex-wrap gap-1">
                {p.category && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[p.category] ?? "bg-muted text-muted-foreground"}`}>
                    {p.category}
                  </span>
                )}
                {p.isVerified && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 flex items-center gap-0.5">
                    <BadgeCheck className="w-3 h-3" />
                    Vérifié
                  </span>
                )}
              </div>
              {p.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.description}</p>}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border text-sm disabled:opacity-50 hover:bg-accent transition-colors"
            data-testid="button-prev-page"
          >
            Précédent
          </button>
          <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border text-sm disabled:opacity-50 hover:bg-accent transition-colors"
            data-testid="button-next-page"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
