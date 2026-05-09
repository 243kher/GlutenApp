import { CheckCircle, BadgeCheck, Circle, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  level: string;
  safeCeliac?: boolean;
  size?: "sm" | "md";
}

const levelConfig = {
  unverified: {
    label: "Non vérifié",
    icon: Circle,
    className: "bg-muted text-muted-foreground border-border",
  },
  community: {
    label: "Vérifié communauté",
    icon: CheckCircle,
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  certified: {
    label: "Certifié propriétaire",
    icon: BadgeCheck,
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  },
};

const levelDescriptions = {
  unverified: "Ajouté par un utilisateur, non encore confirmé par la communauté.",
  community: "Confirmé par plusieurs membres de la communauté.",
  certified: "Certifié directement par le propriétaire de l'établissement.",
};

export function VerificationBadge({ level, size = "sm" }: Props) {
  const config = levelConfig[level as keyof typeof levelConfig] ?? levelConfig.unverified;
  const Icon = config.icon;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium cursor-help ${config.className} ${textSize}`}>
          <Icon className={iconSize} />
          {config.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{levelDescriptions[level as keyof typeof levelDescriptions]}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function SafeCeliacBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 cursor-help ${textSize}`}>
          <AlertTriangle className={iconSize} />
          Safe Coeliaque
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">Cet établissement garantit explicitement l&apos;absence de contamination croisée, essentiel pour les personnes cœliaques.</p>
      </TooltipContent>
    </Tooltip>
  );
}
