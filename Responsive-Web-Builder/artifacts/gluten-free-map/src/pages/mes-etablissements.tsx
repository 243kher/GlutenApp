import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Star,
  ShieldCheck,
  Pencil,
  Plus,
  ShieldCheckIcon,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type MyEstablishment = {
  id: number;
  name: string;
  type: string;
  address: string;
  city: string;
  verificationLevel: "unverified" | "community" | "certified";
  safeCeliac: boolean;
  photoUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  verificationCount: number;
  createdAt: string;
};

const verificationConfig = {
  unverified: {
    label: "Non vérifié",
    color: "text-muted-foreground",
    bg: "bg-muted/40",
    Icon: ShieldAlert,
  },
  community: {
    label: "Communautaire",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    Icon: ShieldCheck,
  },
  certified: {
    label: "Certifié",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    Icon: ShieldCheckIcon,
  },
};

export default function MesEtablissementsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading, isError } = useQuery<MyEstablishment[]>({
    queryKey: ["me-establishments"],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/me/establishments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement établissements");
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
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-green-500" />
            Mes établissements
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.length ?? 0} établissement
            {(data?.length ?? 0) > 1 ? "s" : ""} ajouté
            {(data?.length ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setLocation("/ajouter")}
          className="rounded-full bg-gradient-to-r from-primary to-primary/80 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Erreur */}
      {isError && (
        <div className="text-center py-8 text-sm text-destructive">
          Impossible de charger vos établissements. Veuillez réessayer.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && (!data || data.length === 0) && (
        <div className="text-center py-16">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-1">Aucun établissement</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Vous n'avez pas encore ajouté d'établissement.
          </p>
          <Button
            onClick={() => setLocation("/ajouter")}
            className="rounded-full bg-gradient-to-r from-primary to-primary/80 gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un établissement
          </Button>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {data?.map((est) => (
          <EstablishmentCard
            key={est.id}
            est={est}
            onOpen={() => setLocation(`/etablissements/${est.id}`)}
            onEdit={() => setLocation(`/etablissements/${est.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function EstablishmentCard({
  est,
  onOpen,
  onEdit,
}: {
  est: MyEstablishment;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const verif = verificationConfig[est.verificationLevel];
  const VerifIcon = verif.Icon;

  return (
    <div
      onClick={onOpen}
      className="group relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex gap-4">
        {/* Photo */}
        <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
          {est.photoUrl ? (
            <img
              src={est.photoUrl}
              alt={est.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-500/20 to-emerald-500/5 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-green-600/60" />
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold truncate group-hover:text-primary transition-colors">
              {est.name}
            </h3>
            {est.safeCeliac && (
              <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
            )}
          </div>

          <p className="text-xs text-muted-foreground truncate mb-1.5">
            {est.address}, {est.city}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${verif.bg} ${verif.color}`}
            >
              <VerifIcon className="w-3 h-3" />
              {verif.label}
            </span>
            {est.averageRating != null && (
              <span className="flex items-center gap-1 text-amber-500">
                <Star className="w-3 h-3 fill-current" />
                <span className="font-semibold">
                  {Number(est.averageRating).toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  ({est.reviewCount})
                </span>
              </span>
            )}
            <span className="text-muted-foreground capitalize">{est.type}</span>
          </div>

          {/* Bouton Modifier uniquement */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
}
