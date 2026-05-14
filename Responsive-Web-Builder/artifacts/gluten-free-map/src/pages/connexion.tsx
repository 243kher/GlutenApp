import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import {
  Leaf, Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles,
  MapPin, ShieldCheck, Heart,
} from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export default function ConnexionPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const mutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof schema>) {
    mutation.mutate(
      { data: values },
      {
        onSuccess: (data: any) => {
          login(data.token, data.user);
          toast({ title: "Connexion réussie", description: `Bienvenue, ${data.user.name} !` });
          setLocation("/");
        },
        onError: () => {
          toast({ title: "Erreur", description: "Email ou mot de passe incorrect", variant: "destructive" });
        },
      }
    );
  }

  // Pré-remplissage rapide des comptes démo
  function fillDemo(email: string, password: string) {
    form.setValue("email", email);
    form.setValue("password", password);
  }

  return (
    <div className="min-h-[calc(100dvh-128px)] md:min-h-[calc(100dvh-64px)] -mt-px relative overflow-hidden">
      {/* === Blobs de fond futuristes === */}
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
          tagline="Bon retour parmi nous"
          headline="Reprenez votre exploration sans gluten"
          subline="Retrouvez vos lieux favoris, vos avis, et la communauté qui partage votre quotidien."
        />

        {/* ========================================================
            PANNEAU DROIT — formulaire
            ======================================================== */}
        <div className="flex items-center justify-center p-4 md:p-8 lg:p-12">
          <div className="w-full max-w-md">
            {/* Logo mobile only — sur desktop il est dans le panneau gauche */}
            <div className="lg:hidden text-center mb-6">
              <div className="relative inline-block mb-3">
                <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl shadow-primary/30">
                  <Leaf className="w-7 h-7 text-primary-foreground" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                  Bon retour
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Connectez-vous à votre compte Gluten Spot
              </p>
            </div>

            {/* Titre desktop */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                  Se connecter
                </span>
              </h2>
              <p className="text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link href="/inscription" className="font-semibold text-primary hover:underline">
                  Créer un compte
                </Link>
              </p>
            </div>

            {/* === Carte du formulaire glassmorphism === */}
            <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl p-6 md:p-7 shadow-xl">
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            placeholder="••••••••"
                            data-testid="input-password"
                            className="pl-10 pr-11 h-12 rounded-2xl bg-background/50 backdrop-blur border-border/50 focus-visible:ring-2 focus-visible:ring-primary/30"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-accent/50 transition-colors"
                            tabIndex={-1}
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                          >
                            {showPassword
                              ? <EyeOff className="w-4 h-4 text-muted-foreground" />
                              : <Eye className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow gap-2 font-semibold text-base"
                    disabled={mutation.isPending}
                    data-testid="button-submit"
                  >
                    {mutation.isPending ? "Connexion..." : (
                      <>
                        Se connecter
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              {/* Lien vers inscription — version mobile (sur desktop c'est en haut) */}
              <p className="lg:hidden text-center text-sm text-muted-foreground mt-5">
                Pas encore de compte ?{" "}
                <Link href="/inscription" className="font-semibold text-primary hover:underline">
                  S'inscrire
                </Link>
              </p>
            </div>

            {/* === Comptes de démo — pliable, plus discret === */}
            <DemoAccounts onSelect={fillDemo} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AuthHeroPanel — panneau visuel marketing à gauche (desktop)
// Réutilisé tel quel sur Inscription
// ============================================================
function AuthHeroPanel({
  tagline, headline, subline,
}: { tagline: string; headline: string; subline: string }) {
  return (
    <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-background">
      {/* Blobs internes */}
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />

      {/* Grille décorative en fond */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex flex-col justify-between p-12 w-full">
        {/* Logo en haut */}
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

        {/* Bloc central — headline */}
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

        {/* Liste de features en bas */}
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
// DemoAccounts — encart pour les comptes de démonstration
// Plus discret, mais cliquable pour pré-remplir le formulaire
// ============================================================
function DemoAccounts({ onSelect }: { onSelect: (email: string, password: string) => void }) {
  const [open, setOpen] = useState(false);
  const accounts = [
    { email: "admin@sansgluten.fr", password: "admin", role: "Admin", icon: "👑" },
    { email: "marie@example.com", password: "admin", role: "Utilisateur", icon: "👤" },
  ];

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="opacity-60">•</span>
        {open ? "Masquer" : "Afficher"} les comptes de démonstration
        <span className="opacity-60">•</span>
      </button>

      {open && (
        <div className="mt-3 p-3 rounded-2xl bg-card/40 backdrop-blur border border-border/30 space-y-2">
          {accounts.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => onSelect(acc.email, acc.password)}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-background/40 backdrop-blur border border-border/30 hover:border-primary/30 hover:bg-background/60 transition-all text-left group"
            >
              <span className="text-lg">{acc.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{acc.role}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {acc.email}
                </p>
              </div>
              <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                Utiliser →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}