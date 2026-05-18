import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageSquare,
  Star,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type UserReview = {
  id: number;
  rating: number;
  comment: string | null;
  crossContaminationAlert: boolean;
  photoUrl: string | null;
  createdAt: string;
  establishment: {
    id: number;
    name: string;
    type: string;
    city: string;
    photoUrl: string | null;
  };
};

export default function MesAvisPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<UserReview[]>({
    queryKey: ["me-reviews"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/auth/me/reviews", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement avis");
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
            <MessageSquare className="w-6 h-6 text-blue-500" />
            Mes avis
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.length ?? 0} avis publié{(data?.length ?? 0) > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (!data || data.length === 0) && (
        <div className="text-center py-16">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-1">Aucun avis publié</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Partagez votre expérience pour aider la communauté.
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
        {data?.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            onClick={() =>
              setLocation(`/etablissement/${review.establishment.id}`)
            }
          />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  onClick,
}: {
  review: UserReview;
  onClick: () => void;
}) {
  const date = new Date(review.createdAt).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      onClick={onClick}
      className="group relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all duration-200"
    >
      {/* Établissement (en-tête) */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border/40">
        <div className="relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-muted">
          {review.establishment.photoUrl ? (
            <img
              src={review.establishment.photoUrl}
              alt={review.establishment.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary/60" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold truncate group-hover:text-primary transition-colors">
            {review.establishment.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {review.establishment.city} · {date}
          </p>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= review.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-semibold">{review.rating}/5</span>
      </div>

      {/* Commentaire */}
      {review.comment && (
        <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3">
          {review.comment}
        </p>
      )}

      {/* Alerte contamination */}
      {review.crossContaminationAlert && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">
          <AlertTriangle className="w-3 h-3" />
          Alerte contamination croisée
        </div>
      )}
    </div>
  );
}