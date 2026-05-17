// pages/ProduitDetailPage.tsx
import { useParams, Link } from "wouter";
import { MapPin, ArrowLeft, ShoppingBag, BadgeCheck } from "lucide-react";
import {
  useGetProduct,
  getGetProductQueryKey,
  useListProductEstablishments, // ← à générer via ton client OpenAPI
  getListProductEstablishmentsQueryKey,
} from "@workspace/api-client-react";
import { VerificationBadge, SafeCeliacBadge } from "@/components/VerificationBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function ProduitDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);

  const { data: product, isLoading } = useGetProduct(id, {
    query: { queryKey: getGetProductQueryKey(id), enabled: !!id },
  });

  const { data: estabData, isLoading: estabLoading } = useListProductEstablishments(id, {
    query: { queryKey: getListProductEstablishmentsQueryKey(id), enabled: !!id },
  });

  const establishments = (estabData as any)?.establishments ?? [];

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full rounded-3xl mb-6" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Produit non trouvé.</p>
        <Link href="/produits">
          <Button variant="outline" className="rounded-full">Retour</Button>
        </Link>
      </div>
    );
  }

  const p = product as any;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
      <Link
        href="/produits"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors group"
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-card/60 backdrop-blur border border-border/40 group-hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </span>
        Retour aux produits
      </Link>

      {/* === En-tête produit === */}
      <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl overflow-hidden mb-6">
        <div className="relative h-56 md:h-72 bg-gradient-to-br from-primary/10 via-accent to-primary/5 flex items-center justify-center">
          {p.imageUrl ? (
            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-6" />
          ) : (
            <ShoppingBag className="w-20 h-20 text-muted-foreground/30" />
          )}
          {p.isVerified && (
            <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/90 backdrop-blur text-white text-xs font-bold shadow-md">
              <BadgeCheck className="w-3.5 h-3.5" />
              Vérifié
            </div>
          )}
        </div>
        <div className="p-5 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{p.name}</h1>
          {p.brand && <p className="text-muted-foreground mb-3">{p.brand}</p>}
          {p.category && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-background/60 border border-border/40 text-xs font-medium">
              {p.category}
            </div>
          )}
          {p.description && (
            <p className="text-sm text-foreground/80 leading-relaxed mt-4">{p.description}</p>
          )}
        </div>
      </div>

      {/* === Établissements qui le vendent === */}
      <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl p-5 md:p-6">
        <h2 className="font-bold text-lg flex items-center gap-2 mb-5">
          <MapPin className="w-5 h-5 text-primary" />
          Où trouver ce produit
          <span className="text-sm font-normal text-muted-foreground">
            ({establishments.length})
          </span>
        </h2>

        {estabLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : establishments.length === 0 ? (
          <div className="text-center py-10">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              Aucun établissement référencé pour ce produit.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {establishments.map((e: any) => (
              <Link key={e.id} href={`/etablissements/${e.id}`}>
                <a className="flex items-center gap-3 p-3 rounded-2xl bg-background/40 backdrop-blur border border-border/30 hover:border-primary/30 hover:bg-accent/30 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xl flex-shrink-0">
                    {e.type === "restaurant" ? "🍽" : e.type === "bakery" ? "🥖" : e.type === "grocery" ? "🛒" : e.type === "cafe" ? "☕" : "📍"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{e.name}</p>
                      {e.safeCeliac && <SafeCeliacBadge size="sm" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{e.address}, {e.city}</p>
                  </div>
                  <VerificationBadge level={e.verificationLevel} size="sm" />
                </a>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}