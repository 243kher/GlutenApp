import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import {
  Leaf, Eye, EyeOff, Mail, Lock, User as UserIcon,
  ArrowRight, Sparkles, MapPin, ShieldCheck, Heart, Check,
} from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(2, "Nom trop court"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Au moins 6 caractères"),
  role: z.enum(["user", "owner"]),
});

// Choix de profil — utilisateur ou propriétaire
const roleChoices = [
  {
    value: "user",
    title: "Je cherche",
    desc: "Trouver des lieux sans gluten",
    emoji: "🔍",
    gradient: "from-blue-500/20 to-cyan-500/10",
  },
  {
    value: "owner",
    title: "Je gère",
    desc: "Établissement à référencer",
    emoji: "🏪",
    gradient: "from-purple-500/20 to-pink-500/10",
  },
] as const;

export default function InscriptionPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const mutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  });

  const password = form.watch("password");

  function onSubmit(values: z.infer<typeof schema>) {
    mutation.mutate(
      { data: values },
      {
        onSuccess: (data: any) => {
          login(data.token, data.user);
          toast({ title: "Compte créé", description: `Bienvenue, ${data.user.name} !` });
          setLocation("/");
        },
        onError: (err: any) => {
          toast({
            title: "Erreur",
            description: err?.data?.error ?? "Impossible de créer le compte",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-[calc(100dvh-128px)] md:min-h-[calc(100dvh-64px)] -mt-px relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />
      </div>

      <div className="min-h-full grid lg:grid-cols-2">
        {/* ========================================================
            PANNEAU GAUCHE — visuel marketing (desktop uniquement)
            ======================================================== */}
        <AuthHeroPanel
          tagline="Rejoignez la communauté"
          headline="Découvrez le sans gluten autrement"
          subline="Carte interactive, avis vérifiés, recommandations adaptées — votre quotidien sans gluten, simplifié."
        />

        {/* ========================================================
            PANNEAU DROIT — formulaire d'inscription
            ======================================================== */}
        <div className="flex items-center justify-center p-4 md:p-8 lg:p-12">
          <div className="w-full max-w-md">
            {/* Logo mobile */}
            <div className="lg:hidden text-center mb-6">
              <div className="relative inline-block mb-3">
                <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl shadow-primary/30">
                  <Leaf className="w-7 h-7 text-primary-foreground" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                  Créer un compte
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Rejoignez la communauté sans gluten
              </p>
            </div>

            {/* Titre desktop */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                  Créer un compte
                </span>
              </h2>
              <p className="text-muted-foreground">
                Déjà inscrit ?{" "}
                <Link href="/connexion" className="font-semibold text-primary hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>

            {/* Carte formulaire glassmorphism */}
            <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl p-6 md:p-7 shadow-xl">
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* === Sélecteur de rôle — deux gros boutons === */}
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Je suis
                      </FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {roleChoices.map((choice) => {
                          const active = field.value === choice.value;
                          return (
                            <button
                              key={choice.value}
                              type="button"
                              onClick={() => field.onChange(choice.value)}
                              data-testid={`role-${choice.value}`}
                              className={`relative p-3 rounded-2xl border text-left transition-all duration-200 overflow-hidden ${
                                active
                                  ? "border-primary shadow-md shadow-primary/20"
                                  : "border-border/50 hover:border-border bg-card/40 backdrop-blur"
                              }`}
                            >
                              {/* Fond dégradé */}
                              <div className={`absolute inset-0 bg-gradient-to-br ${choice.gradient} ${active ? "opacity-100" : "opacity-40"} transition-opacity`} />
                              {/* Check coche en haut à droite quand actif */}
                              {active && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30">
                                  <Check className="w-3 h-3" strokeWidth={3} />
                                </div>
                              )}
                              <div className="relative">
                                <div className="text-2xl mb-1">{choice.emoji}</div>
                                <p className="font-bold text-sm">{choice.title}</p>
                                <p className="text-[11px] text-muted-foreground leading-tight">
                                  {choice.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Nom complet
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <Input
                            placeholder="Marie Dupont"
                            data-testid="input-name"
                            className="pl-10 h-12 rounded-2xl bg-background/50 backdrop-blur border-border/50 focus-visible:ring-2 focus-visible:ring-primary/30"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <Input
                            type="email"
                            placeholder="vous@exemple.fr"
                            data-testid="input-email"
                            className="pl-10 h-12 rounded-2xl bg-background/50 backdrop-blur border-border/50 focus-visible:ring-2 focus-visible:ring-primary/30"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Mot de passe
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Au moins 6 caractères"
                            data-testid="input-password"
                            className="pl-10 pr-11 h-12 rounded-2xl bg-background/50 backdrop-blur border-border/50 focus-visible:ring-2 focus-visible:ring-primary/30"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-accent/50 transition-colors"
                            tabIndex={-1}
                            aria-label={showPassword ? "Masquer" : "Afficher"}
                          >
                            {showPassword
                              ? <EyeOff className="w-4 h-4 text-muted-foreground" />
                              : <Eye className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      {/* Indicateur de force du mot de passe */}
                      {password && <PasswordStrength password={password} />}
                    </FormItem>
                  )} />

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow gap-2 font-semibold text-base"
                    disabled={mutation.isPending}
                    data-testid="button-submit"
                  >
                    {mutation.isPending ? "Création..." : (
                      <>
                        Créer mon compte
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>

                  {/* Mention légale discrète */}
                  <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                    En créant un compte, vous acceptez les conditions
                    d'utilisation et notre politique de confidentialité.
                  </p>
                </form>
              </Form>

              {/* Lien vers connexion (mobile uniquement) */}
              <p className="lg:hidden text-center text-sm text-muted-foreground mt-5">
                Déjà inscrit ?{" "}
                <Link href="/connexion" className="font-semibold text-primary hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AuthHeroPanel — identique à celui de la page Connexion
// (dupliqué ici pour que les deux fichiers restent indépendants ;
// tu peux extraire dans un fichier partagé si tu préfères)
// ============================================================
function AuthHeroPanel({
  tagline, headline, subline,
}: { tagline: string; headline: string; subline: string }) {
  return (
    <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-background">
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex flex-col justify-between p-12 w-full">
        <Link href="/" className="flex items-center gap-2.5 group w-fit">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/40 blur-md rounded-full group-hover:bg-primary/60 transition-colors" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Gluten Spot
          </span>
        </Link>

        <div className="max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">{tagline}</span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight mb-4">
            <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/50 bg-clip-text text-transparent">
              {headline}
            </span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            {subline}
          </p>
        </div>

        <div className="space-y-3 max-w-md">
          <FeatureRow icon={MapPin} text="Carte interactive de lieux sans gluten" />
          <FeatureRow icon={ShieldCheck} text="Établissements vérifiés par la communauté" />
          <FeatureRow icon={Heart} text="Sauvegardez vos favoris et vos découvertes" />
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="text-sm text-foreground/80">{text}</span>
    </div>
  );
}

// ============================================================
// PasswordStrength — barre visuelle de robustesse
// ============================================================
function PasswordStrength({ password }: { password: string }) {
  // Score simple : longueur, chiffres, majuscules, caractères spéciaux
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/\d/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { min: 0, label: "Trop court", color: "bg-destructive", textColor: "text-destructive" },
    { min: 2, label: "Faible", color: "bg-orange-500", textColor: "text-orange-600 dark:text-orange-400" },
    { min: 3, label: "Correct", color: "bg-yellow-500", textColor: "text-yellow-700 dark:text-yellow-400" },
    { min: 4, label: "Bon", color: "bg-lime-500", textColor: "text-lime-700 dark:text-lime-400" },
    { min: 5, label: "Excellent", color: "bg-green-500", textColor: "text-green-700 dark:text-green-400" },
  ];
  const level = [...levels].reverse().find((l) => score >= l.min) ?? levels[0];
  const fillWidth = `${Math.min(100, (score / 5) * 100)}%`;

  return (
    <div className="mt-1.5">
      <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${level.color}`}
          style={{ width: fillWidth }}
        />
      </div>
      <p className={`text-[11px] font-medium mt-1 ${level.textColor}`}>
        Robustesse : {level.label}
      </p>
    </div>
  );
}