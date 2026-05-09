import { Star } from "lucide-react";

interface Props {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export function StarRating({ rating, max = 5, size = "sm", showValue = false }: Props) {
  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : size === "md" ? "w-4 h-4" : "w-5 h-5";

  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : i < rating
              ? "fill-amber-200 text-amber-400"
              : "fill-transparent text-muted-foreground/40"
          }`}
        />
      ))}
      {showValue && <span className="ml-1 text-sm font-medium text-foreground">{rating.toFixed(1)}</span>}
    </span>
  );
}

interface InteractiveProps {
  value: number;
  onChange: (v: number) => void;
}

export function InteractiveStarRating({ value, onChange }: InteractiveProps) {
  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className="hover:scale-110 transition-transform"
          data-testid={`star-${i + 1}`}
        >
          <Star
            className={`w-6 h-6 ${i < value ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40 hover:text-amber-400"}`}
          />
        </button>
      ))}
    </span>
  );
}
