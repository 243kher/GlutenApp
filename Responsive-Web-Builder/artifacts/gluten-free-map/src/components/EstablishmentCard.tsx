import { Link } from "wouter";
import { MapPin, MessageSquare, Navigation } from "lucide-react";
import { VerificationBadge, SafeCeliacBadge } from "./VerificationBadge";
import { StarRating } from "./StarRating";

const typeLabels: Record<string, string> = {
  restaurant: "Restaurant",
  bakery: "Boulangerie",
  grocery: "Épicerie",
  cafe: "Café",
  other: "Autre",
};

interface Establishment {
  id: number;
  name: string;
  type: string;
  address: string;
  city: string;
  verificationLevel: string;
  safeCeliac: boolean;
  averageRating?: number | null;
  reviewCount: number;
  distance?: number | null;
  photoUrl?: string | null;
  description?: string | null;
}

interface Props {
  establishment: Establishment;
  onClick?: () => void;
  compact?: boolean;
}

export default function EstablishmentCard({ establishment: e, onClick, compact = false }: Props) {
  const content = (
    <div
      className={`bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer hover:border-primary/30 ${compact ? "flex gap-3 p-3" : ""}`}
      onClick={onClick}
      data-testid={`card-establishment-${e.id}`}
    >
      {!compact && (
        <div className="h-36 bg-muted overflow-hidden">
          {e.photoUrl ? (
            <img src={e.photoUrl} alt={e.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent">
              <span className="text-4xl text-primary/30">{typeEmoji(e.type)}</span>
            </div>
          )}
        </div>
      )}
      {compact && (
        <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-xl">{typeEmoji(e.type)}</span>
        </div>
      )}
      <div className={compact ? "flex-1 min-w-0" : "p-4"}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-semibold text-foreground leading-tight ${compact ? "text-sm" : ""}`} data-testid={`text-establishment-name-${e.id}`}>{e.name}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">{typeLabels[e.type] ?? e.type}</span>
        </div>
        <div className={`flex flex-wrap gap-1 ${compact ? "mb-1" : "mb-2"}`}>
          <VerificationBadge level={e.verificationLevel} />
          {e.safeCeliac && <SafeCeliacBadge />}
        </div>
        {!compact && e.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{e.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {e.city}
            {e.distance != null && <span className="ml-1 text-primary font-medium">{e.distance.toFixed(1)} km</span>}
          </span>
          <span className="flex items-center gap-1">
            {e.averageRating != null ? (
              <StarRating rating={e.averageRating} />
            ) : (
              <span className="text-muted-foreground/60">Aucun avis</span>
            )}
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />
              {e.reviewCount}
            </span>
          </span>
        </div>
      </div>
    </div>
  );

  if (onClick) return content;
  return <Link href={`/etablissements/${e.id}`}>{content}</Link>;
}

function typeEmoji(type: string) {
  const map: Record<string, string> = {
    restaurant: "🍽",
    bakery: "🥖",
    grocery: "🛒",
    cafe: "☕",
    other: "📍",
  };
  return map[type] ?? "📍";
}
