import { useLocation } from "wouter";
import {
  User,
  Heart,
  MapPin,
  MessageSquare,
  Settings,
  LogOut,
  Sparkles,
  Mail,
  Calendar,
  Save,
  X,
  LogIn,
  ShieldCheck,
  Crown,
} from "lucide-react";
import {
  useGetMe,
  getGetMeQueryKey,
  useUpdateMe,
  useGetMeStats, // ← ajout
  getGetMeStatsQueryKey, // ← ajout
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const roleConfig: Record<
  string,
  { label: string; icon: any; gradient: string }
> = {
  user: {
    label: "Utilisateur",
    icon: User,
    gradient: "from-blue-500/20 to-cyan-500/10",
  },
  owner: {
    label: "Propriétaire",
    icon: ShieldCheck,
    gradient: "from-purple-500/20 to-pink-500/10",
  },
  admin: {
    label: "Administrateur",
    icon: Crown,
    gradient: "from-amber-500/20 to-orange-500/10",
  },
};

export default function ProfilPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMe = useUpdateMe();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [dietaryPreferences, setDietaryPreferences] = useState(
    user?.dietaryPreferences ?? "",
  );

  const { data: profile, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), enabled: !!user },
  });

  const { data: stats, isLoading: statsLoading } = useGetMeStats({
    query: { queryKey: getGetMeStatsQueryKey(), enabled: !!user },
  });

  // Type attendu (à ajouter idéalement dans un type partagé)
  type MeStats = {
    establishments: number;
    reviews: number;
    favorites: number;
  };

  // Orval renvoie directement le body — pas de .data.data
  const s: MeStats = (stats as MeStats) ?? {
    establishments: 0,
    reviews: 0,
    favorites: 0,
  };

  console.log(" stats raw:", stats);

  // 1. On extrait proprement le contenu utile (en descendant d'un ou deux niveaux si nécessaire)
  const statsPayload =
    (stats as any)?.data?.data ?? (stats as any)?.data ?? stats ?? {};

  // === Auth gate ===
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 md:py-24 text-center">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />
          <div className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl shadow-primary/30">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
        <p className="text-muted-foreground mb-6">
          Connectez-vous pour accéder à votre profil.
        </p>
        <Button
          onClick={() => setLocation("/connexion")}
          className="rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 gap-2"
        >
          <LogIn className="w-4 h-4" />
          Se connecter
        </Button>
      </div>
    );
  }

  // === Loading ===
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <Skeleton className="h-48 w-full rounded-3xl mb-6" />
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  const p = (profile as any) ?? user;
  const role = roleConfig[p.role] ?? roleConfig.user;
  const RoleIcon = role.icon;
  const initial = (p.name || "?").charAt(0).toUpperCase();

  function handleSave() {
    updateMe.mutate(
      {
        data: {
          name: name || undefined,
          dietaryPreferences: dietaryPreferences || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Profil mis à jour" });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setEditing(false);
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      },
    );
  }

  function handleCancel() {
    setName(p.name);
    setDietaryPreferences(p.dietaryPreferences ?? "");
    setEditing(false);
  }

  const memberSince = new Date(p.createdAt).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 pb-24 md:pb-10">
      {/* ========================================================
          HERO PROFIL carte d'identité immersive
          ======================================================== */}
      <div className="relative mb-6 rounded-3xl overflow-hidden">
        {/* Bandeau dégradé selon le rôle */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${role.gradient}`}
        />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative backdrop-blur-xl bg-card/50 border border-border/40 p-6 md:p-8">
          <div className="absolute top-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* === Avatar XL avec glow === */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-2xl shadow-primary/40 ring-4 ring-background/50">
                {initial}
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1
                className="text-2xl md:text-3xl font-bold mb-1 truncate"
                data-testid="text-profile-name"
              >
                {p.name}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 mb-3">
                <Mail className="w-3.5 h-3.5" />
                {p.email}
              </p>

              {/* Badge rôle avec icône */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 text-primary text-xs font-semibold">
                <RoleIcon className="w-3.5 h-3.5" />
                {role.label}
              </div>

              {/* Date d'inscription */}
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center sm:justify-start gap-1.5">
                <Calendar className="w-3 h-3" />
                Membre depuis le {memberSince}
              </p>
            </div>

            {/* Bouton éditer  visible sur desktop, en bas sur mobile */}
            <div className="sm:self-start">
              <Button
                variant="outline"
                size="sm"
                onClick={() => (editing ? handleCancel() : setEditing(true))}
                data-testid="button-edit-profile"
                className="rounded-full backdrop-blur bg-card/50 border-border/50 gap-1.5"
              >
                {editing ? (
                  <>
                    <X className="w-4 h-4" />
                    Annuler
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    Modifier
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          FORMULAIRE D'ÉDITION ou affichage des préférences
          ======================================================== */}
      {editing ? (
        <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl p-5 md:p-6 mb-6 shadow-sm">
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Modifier mes informations
          </h2>
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="edit-name"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
              >
                Nom
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl bg-background/50 backdrop-blur border-border/50"
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <Label
                htmlFor="edit-dietary"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block"
              >
                Préférences alimentaires
              </Label>
              <Textarea
                id="edit-dietary"
                value={dietaryPreferences}
                onChange={(e) => setDietaryPreferences(e.target.value)}
                placeholder="Ex: cœliaque, intolérant au lactose, végétarien..."
                className="rounded-xl min-h-24 resize-none bg-background/50 backdrop-blur border-border/50"
                data-testid="textarea-dietary"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Ces informations restent privées et nous aident à mieux
                personnaliser vos recommandations.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 rounded-xl backdrop-blur bg-card/50 border-border/50"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMe.isPending}
                className="flex-[2] rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/30 gap-2"
                data-testid="button-save-profile"
              >
                <Save className="w-4 h-4" />
                {updateMe.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        p.dietaryPreferences && (
          <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl p-5 md:p-6 mb-6 shadow-sm">
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Préférences alimentaires
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {p.dietaryPreferences}
            </p>
          </div>
        )
      )}

      {/* ========================================================
          STATS  cartes de stats avec icônes colorées
          ======================================================== */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
        <StatCard
          icon={MapPin}
          label="Établissements"
          value={statsLoading ? "…" : String(s.establishments)}
          color="green"
        />
        <StatCard
          icon={MessageSquare}
          label="Avis publiés"
          value={statsLoading ? "…" : String(s.reviews)}
          color="blue"
          href="/mes-avis"
        />
        <StatCard
          icon={Heart}
          label="Favoris"
          value={statsLoading ? "…" : String(s.favorites)}
          color="rose"
          href="/mes-favoris"
        />
      </div>

      {/* ========================================================
          SECTION COMPTE  déconnexion
          ======================================================== */}
      <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl p-5 md:p-6 shadow-sm">
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <h2 className="font-bold text-lg mb-1">Compte</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Gérer votre session
        </p>
        <Button
          variant="outline"
          className="gap-2 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          onClick={() => {
            logout();
            setLocation("/");
          }}
          data-testid="button-logout-profile"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// StatCard  carte de stat avec icône colorée et hover
// ============================================================
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: any;
  label: string;
  value: string;
  color: "green" | "blue" | "rose";
  href?: string;
}) {
  const [, setLocation] = useLocation();
  const colorClasses = {
    green: {
      gradient: "from-green-500/20 to-emerald-500/5",
      iconBg: "bg-green-500/15 text-green-600 dark:text-green-400",
    },
    blue: {
      gradient: "from-blue-500/20 to-cyan-500/5",
      iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    },
    rose: {
      gradient: "from-rose-500/20 to-pink-500/5",
      iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    },
  }[color];

  const clickable = !!href;

  return (
    <div
      onClick={clickable ? () => setLocation(href!) : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={`relative bg-gradient-to-br ${colorClasses.gradient} backdrop-blur-xl border border-border/40 rounded-2xl p-3 md:p-4 transition-all duration-200 ${
        clickable
          ? "cursor-pointer hover:scale-[1.04] hover:border-primary/40 active:scale-[0.98]"
          : "hover:scale-[1.02]"
      }`}
    >
      <div
        className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2 ${colorClasses.iconBg}`}
      >
        <Icon className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <p className="text-xl md:text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
        {value}
      </p>
      <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide leading-tight mt-0.5">
        {label}
      </p>
    </div>
  );
}
