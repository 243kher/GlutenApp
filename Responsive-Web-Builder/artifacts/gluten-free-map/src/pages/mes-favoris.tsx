import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, MapPin, Star, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type FavoriteEstablishment = {
  favoriteId: number;
  favoritedAt: string;
  id: number;
  name: string;
  type: string;
  address: string;
  city: string;
  photoUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  verificationLevel: string;
  safeCeliac: boolean;
};

export default function MesFavorisPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<FavoriteEstablishment[]>({
    queryKey: ["me-favorites"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/auth/me/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement favoris");
      return res.json();
    },
  });

  if (!user) {
    setLocation("/connexion");
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 pb-24 md:pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/profil")}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500" />
            Mes favoris
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.length ?? 0} établissement{(data?.length ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (!data || data.length === 0) && (
        <div className="text-center py-16">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full" />
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 flex items-center justify-center">
              <Heart className="w-8 h-8 text-rose-500" />
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-1">Aucun favori</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Ajoutez des établissements à vos favoris pour les retrouver ici.
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="rounded-full bg-gradient-to-r from-primary to-primary/80"
          >
            Explorer la carte
          </Button>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {data?.map((fav) => (
          <FavoriteCard
            key={fav.favoriteId}
            fav={fav}
            onClick={() => setLocation(`/etablissement/${fav.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function FavoriteCard({
  fav,
  onClick,
}: {
  fav: FavoriteEstablishment;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex gap-4">
        {/* Photo */}
        <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
          {fav.photoUrl ? (
            <img
              src={fav.photoUrl}
              alt={fav.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-primary/60" />
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold truncate group-hover:text-primary transition-colors">
              {fav.name}
            </h3>
            {fav.safeCeliac && (
              <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mb-1.5">
            {fav.address}, {fav.city}
          </p>
          <div className="flex items-center gap-3 text-xs">
            {fav.averageRating && (
              <span className="flex items-center gap-1 text-amber-500">
                <Star className="w-3 h-3 fill-current" />
                <span className="font-semibold">
                  {Number(fav.averageRating).toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  ({fav.reviewCount})
                </span>
              </span>
            )}
            <span className="text-muted-foreground capitalize">{fav.type}</span>
          </div>
        </div>
      </div>
    </div>
  );
}