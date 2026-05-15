import { useState } from "react";
import { useLocation } from "wouter";
import {
  Shield, AlertTriangle, CheckCircle, Clock, User,
  Lock, ChevronRight, Sparkles, Crown, Flag, Filter,
} from "lucide-react";
import {
  useListReports, getListReportsQueryKey, useResolveReport,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// ============================================================
// Configuration des types de signalements
// ============================================================
const reportTypeConfig: Record<string, { label: string; color: string; emoji: string }> = {
  cross_contamination: {
    label: "Contamination croisée",
    color: "from-orange-500/20 to-red-500/10 border-orange-400/30 text-orange-700 dark:text-orange-300",
    emoji: "⚠️",
  },
  wrong_info: {
    label: "Informations incorrectes",
    color: "from-yellow-500/20 to-amber-500/10 border-yellow-400/30 text-yellow-700 dark:text-yellow-300",
    emoji: "❓",
  },
  closed: {
    label: "Établissement fermé",
    color: "from-gray-500/20 to-slate-500/10 border-gray-400/30 text-gray-700 dark:text-gray-300",
    emoji: "🔒",
  },
  other: {
    label: "Autre",
    color: "from-blue-500/20 to-cyan-500/10 border-blue-400/30 text-blue-700 dark:text-blue-300",
    emoji: "💬",
  },
};

type StatusFilter = "pending" | "resolved" | "all";

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const resolveReport = useResolveReport();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  const queryParams = statusFilter === "all" ? {} : { status: statusFilter };

  const { data: reports, isLoading } = useListReports(queryParams, {
    query: {
      queryKey: getListReportsQueryKey(queryParams),
      enabled: user?.role === "admin",
    },
  });

  // ============================================================
  // Garde d'accès  page réservée aux admins
  // ============================================================
  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 md:py-24 text-center">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-destructive/30 blur-3xl rounded-full" />
          <div className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center shadow-xl shadow-destructive/30">
            <Lock className="w-10 h-10 text-destructive-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Accès restreint</h2>
        <p className="text-muted-foreground mb-6">
          Cette page est réservée aux administrateurs de la plateforme.
        </p>
        <Button
          onClick={() => setLocation("/")}
          variant="outline"
          className="rounded-full backdrop-blur bg-card/50 border-border/50 gap-2"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  const reportsList: any[] = (reports as any) ?? [];

  // Compteurs pour les stats (calculés en local sur la liste actuelle)
  const pendingCount = reportsList.filter((r) => r.status === "pending" || !r.status).length;
  const resolvedCount = reportsList.filter((r) => r.status === "resolved").length;

  function handleResolve(id: number) {
    resolveReport.mutate(
      { id, data: { resolution: "Résolu par l'administrateur" } },
      {
        onSuccess: () => {
          toast({ title: "Signalement résolu", description: "Le signalement a été marqué comme traité." });
          queryClient.invalidateQueries({ queryKey: getListReportsQueryKey(queryParams) });
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 pb-24 md:pb-10">
      {/* ========================================================
          HEADER ADMIN  avec couronne et bandeau de bienvenue
          ======================================================== */}
      <div className="mb-6 md:mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-400/30 mb-3">
          <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            Espace administrateur
          </span>
        </div>

        <div className="flex items-center gap-4 mb-2">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-primary/40 blur-xl rounded-2xl" />
            <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                Administration
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Modération et gestion de la plateforme
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================
          STATS  vue d'ensemble en haut
          ======================================================== */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        <StatCard
          icon={Flag}
          label="En attente"
          value={statusFilter === "pending" ? reportsList.length : pendingCount}
          color="orange"
          loading={isLoading}
        />
        <StatCard
          icon={CheckCircle}
          label="Résolus"
          value={statusFilter === "resolved" ? reportsList.length : resolvedCount}
          color="green"
          loading={isLoading}
        />
        <StatCard
          icon={Sparkles}
          label="Total"
          value={reportsList.length}
          color="blue"
          loading={isLoading}
        />
      </div>

      {/* ========================================================
          PANNEAU PRINCIPAL  liste des signalements avec onglets
          ======================================================== */}
      <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl shadow-sm overflow-hidden">
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* Header de la section avec onglets */}
        <div className="p-5 md:p-6 border-b border-border/30">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Signalements
            </h2>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              Filtré par statut
            </span>
          </div>

          {/* Onglets  pilules avec dégradé sur l'actif */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
            <TabPill
              active={statusFilter === "pending"}
              onClick={() => setStatusFilter("pending")}
              icon={Clock}
              label="En attente"
            />
            <TabPill
              active={statusFilter === "resolved"}
              onClick={() => setStatusFilter("resolved")}
              icon={CheckCircle}
              label="Résolus"
            />
            <TabPill
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
              icon={Sparkles}
              label="Tous"
            />
          </div>
        </div>

        {/* Liste des signalements */}
        <div className="p-5 md:p-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : reportsList.length === 0 ? (
            <EmptyState statusFilter={statusFilter} />
          ) : (
            <div className="space-y-3">
              {reportsList.map((r: any) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  onResolve={() => handleResolve(r.id)}
                  resolving={resolveReport.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// StatCard  carte de statistique avec icône colorée
// ============================================================
function StatCard({
  icon: Icon, label, value, color, loading,
}: { icon: any; label: string; value: number; color: "orange" | "green" | "blue"; loading?: boolean }) {
  const colors = {
    orange: { gradient: "from-orange-500/20 to-red-500/5", iconBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
    green:  { gradient: "from-green-500/20 to-emerald-500/5", iconBg: "bg-green-500/15 text-green-600 dark:text-green-400" },
    blue:   { gradient: "from-blue-500/20 to-cyan-500/5", iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  }[color];

  return (
    <div className={`relative bg-gradient-to-br ${colors.gradient} backdrop-blur-xl border border-border/40 rounded-2xl p-3 md:p-4`}>
      <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2 ${colors.iconBg}`}>
        <Icon className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-10 mb-1" />
      ) : (
        <p className="text-xl md:text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {value}
        </p>
      )}
      <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide leading-tight">
        {label}
      </p>
    </div>
  );
}

// ============================================================
// TabPill  onglet de filtre
// ============================================================
function TabPill({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
        active
          ? "text-primary-foreground border-primary"
          : "bg-card/50 backdrop-blur border-border/50 hover:bg-accent/50"
      }`}
    >
      {active && (
        <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-md shadow-primary/30" />
      )}
      <span className="relative flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    </button>
  );
}

// ============================================================
// ReportCard  carte d'un signalement
// ============================================================
function ReportCard({
  report, onResolve, resolving,
}: { report: any; onResolve: () => void; resolving: boolean }) {
  const cfg = reportTypeConfig[report.type] ?? reportTypeConfig.other;
  const isResolved = report.status === "resolved";

  return (
    <div
      className={`relative rounded-2xl p-4 backdrop-blur border transition-all ${
        isResolved
          ? "bg-background/30 border-border/30 opacity-60"
          : "bg-background/40 border-border/40 hover:border-primary/30 hover:shadow-md"
      }`}
      data-testid={`report-${report.id}`}
    >
      {/* Pastille de type en haut à gauche */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${cfg.color} border text-xs font-semibold`}>
          <span>{cfg.emoji}</span>
          {cfg.label}
        </div>

        {isResolved && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400 text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Résolu
          </div>
        )}
      </div>

      {/* Établissement concerné */}
      <h3 className="font-bold text-base leading-tight mb-1.5">
        {report.establishmentName}
      </h3>

      {/* Description du signalement */}
      {report.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {report.description}
        </p>
      )}

      {/* Footer : auteur, date, action */}
      <div className="flex items-end justify-between gap-3 flex-wrap pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          {/* Avatar mini */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center text-primary-foreground text-[10px] font-bold flex-shrink-0">
            {(report.userName || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="truncate block">
              Par <span className="font-medium text-foreground/80">{report.userName}</span>
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-2.5 h-2.5" />
              {new Date(report.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </span>
          </div>
        </div>

        {!isResolved && (
          <Button
            size="sm"
            onClick={onResolve}
            disabled={resolving}
            data-testid={`button-resolve-${report.id}`}
            className="rounded-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-md shadow-green-500/30 gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            Résoudre
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// EmptyState essage quand aucun signalement
// ============================================================
function EmptyState({ statusFilter }: { statusFilter: StatusFilter }) {
  const messages = {
    pending: {
      title: "Aucun signalement en attente",
      desc: "Tout est en ordre ! Revenez plus tard pour modérer.",
      icon: CheckCircle,
      iconColor: "text-green-500",
    },
    resolved: {
      title: "Aucun signalement résolu",
      desc: "Les signalements traités apparaîtront ici.",
      icon: Clock,
      iconColor: "text-muted-foreground/40",
    },
    all: {
      title: "Aucun signalement",
      desc: "La plateforme est propre, bravo à la communauté !",
      icon: Sparkles,
      iconColor: "text-primary",
    },
  }[statusFilter];

  const Icon = messages.icon;

  return (
    <div className="text-center py-12 md:py-16">
      <div className="relative inline-block mb-3">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        <Icon className={`w-14 h-14 mx-auto relative ${messages.iconColor}`} />
      </div>
      <p className="font-bold text-base mb-1">{messages.title}</p>
      <p className="text-sm text-muted-foreground">{messages.desc}</p>
    </div>
  );
}