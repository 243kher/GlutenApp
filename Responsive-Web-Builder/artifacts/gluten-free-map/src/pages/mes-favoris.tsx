import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, MapPin, Star, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);

  const { data, isLoading } = useQuery<FavoriteEstablishment[]>({
    queryKey: ["me-favorites"],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/me/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement favoris");
      return res.json();
    },
  });

  // Mutation pour retirer un favori (toggle côté backend)
  const removeFavorite = useMutation({
    mutationFn: async (establishmentId: number) => {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/establishments/${establishmentId}/favorite`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Favori retiré" });
      queryClient.invalidateQueries({ queryKey: ["me-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["me-stats-manual"] });
      // Si tu as un getGetMeStatsQueryKey en place, ajoute aussi :
      // queryClient.invalidateQueries({ queryKey: getGetMeStatsQueryKey() });
      setPendingRemove(null);
    },
    onError: () => {
      toast({ title: "Erreur", variant: "destructive" });
      setPendingRemove(null);
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
            {data?.length ?? 0} établissement
            {(data?.length ?? 0) > 1 ? "s" : ""}
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
            onClick={() => setLocation("/etablissements")}
            className="rounded-full bg-gradient-to-r from-primary to-primary/80"
          >
            Explorer les établissements
          </Button>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {data?.map((fav) => (
          <FavoriteCard
            key={fav.favoriteId}
            fav={fav}
            onOpen={() => setLocation(`/etablissements/${fav.id}`)} // ← "etablissements" avec "s"
            onRemove={() => setPendingRemove(fav.id)}
          />
        ))}
      </div>

      {/* Dialog confirmation retrait */}
      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce favori ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cet établissement ne sera plus dans votre liste de favoris. Vous
              pourrez le rajouter à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingRemove && removeFavorite.mutate(pendingRemove)
              }
              className="bg-destructive hover:bg-destructive/90"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FavoriteCard({
  fav,
  onOpen,
  onRemove,
}: {
  fav: FavoriteEstablishment;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={onOpen}
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
            <div className="flex items-center gap-2 flex-shrink-0">
              {fav.safeCeliac && (
                <ShieldCheck className="w-4 h-4 text-green-500" />
              )}
              {/* Bouton retirer */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // empêche le clic de remonter au div parent
                  onRemove();
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors"
                aria-label="Retirer des favoris"
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>
            </div>
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