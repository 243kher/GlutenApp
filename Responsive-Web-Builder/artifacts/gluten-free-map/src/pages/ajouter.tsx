import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  MapPin, CheckCircle, ChevronLeft, ChevronRight, Sparkles,
  Navigation, Loader2, AlertCircle, ShieldCheck, LogIn,
} from "lucide-react";
import { useCreateEstablishment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";

const schema = z.object({
  name: z.string().min(2, "Nom requis"),
  type: z.enum(["restaurant", "bakery", "grocery", "cafe", "other"]),
  address: z.string().min(5, "Adresse requise"),
  city: z.string().min(2, "Ville requise"),
  lat: z.number({ coerce: true }).min(-90).max(90),
  lng: z.number({ coerce: true }).min(-180).max(180),
  phone: z.string().optional(),
  website: z.string().url("URL invalide").optional().or(z.literal("")),
  hours: z.string().optional(),
  description: z.string().optional(),
  glutenFreeMenu: z.string().optional(),
  safeCeliac: z.boolean(),
});

const PARIS_LAT = 48.8566;
const PARIS_LNG = 2.3522;

const typeOptions = [
  { value: "restaurant", label: "Restaurant" },
  { value: "bakery", label: "Boulangerie"},
  { value: "grocery", label: "Épicerie" },
  { value: "cafe", label: "Café"},
  { value: "other", label: "Autre"},
];

const typeLabels: Record<string, string> = Object.fromEntries(
  typeOptions.map(o => [o.value, o.label])
);

const stepInfo = [
  { num: 1, label: "Localisation", short: "Lieu" },
  { num: 2, label: "Détails", short: "Détails" },
  { num: 3, label: "Confirmation", short: "Valider" },
];

export default function AjouterPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useCreateEstablishment();
  const [step, setStep] = useState(1);

  const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema as any), // <-- Ajout de "as any" ici
  defaultValues: {
    name: "", type: "restaurant", address: "", city: "Paris",
    lat: PARIS_LAT, lng: PARIS_LNG, safeCeliac: false,
    phone: "", website: "", hours: "", description: "", glutenFreeMenu: "",
  },
});

  // === Auth gate stylé ===
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 md:py-24 text-center">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />
          <div className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl shadow-primary/30">
            <MapPin className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
        <p className="text-muted-foreground mb-6">
          Vous devez être connecté pour ajouter un établissement à la carte.
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

  function onSubmit(values: z.infer<typeof schema>) {
    mutation.mutate(
      {
        data: {
          name: values.name, type: values.type, address: values.address, city: values.city,
          lat: values.lat, lng: values.lng, safeCeliac: values.safeCeliac,
          phone: values.phone || undefined,
          website: values.website || undefined,
          hours: values.hours || undefined,
          description: values.description || undefined,
          glutenFreeMenu: values.glutenFreeMenu || undefined,
        },
      },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries();
          toast({ title: "Établissement ajouté", description: "Merci pour votre contribution !" });
          setLocation(`/etablissements/${data.id}`);
        },
        onError: () => toast({ title: "Erreur", description: "Impossible d'ajouter l'établissement", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 pb-24 md:pb-10">
      {/* ========================================================
          HEADER
          ======================================================== */}
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Contribution communautaire</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
            Ajouter un établissement
          </span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Aidez la communauté en référençant un lieu sans gluten que vous connaissez
        </p>
      </div>

      {/* ========================================================
          STEPPER  barre de progression + labels
          ======================================================== */}
      <div className="mb-8">
        {/* Étapes avec ronds */}
        <div className="flex items-center justify-between mb-2">
          {stepInfo.map((s, idx) => {
            const isDone = s.num < step;
            const isCurrent = s.num === step;
            return (
              <div key={s.num} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => isDone && setStep(s.num)}
                  disabled={!isDone && !isCurrent}
                  className={`relative flex flex-col items-center gap-2 transition-all ${
                    isDone ? "cursor-pointer hover:scale-105" : ""
                  }`}
                >
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      isDone
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30"
                        : isCurrent
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/20"
                        : "bg-muted/50 backdrop-blur border border-border/50 text-muted-foreground"
                    }`}
                  >
                    {isDone ? <CheckCircle className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={`text-[11px] md:text-xs font-medium transition-colors ${
                    isCurrent ? "text-foreground" : isDone ? "text-foreground/70" : "text-muted-foreground"
                  }`}>
                    <span className="hidden md:inline">{s.label}</span>
                    <span className="md:hidden">{s.short}</span>
                  </span>
                </button>

                {/* Trait de liaison entre les ronds */}
                {idx < stepInfo.length - 1 && (
                  <div className="flex-1 h-1 mx-2 -mt-6 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 ${
                        s.num < step ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* ========================================================
              STEP 1  LOCALISATION
              ======================================================== */}
          {step === 1 && (
            <FormCard title="Localisation" subtitle="Où se trouve cet établissement ?">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nom de l'établissement *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Helmut Newcake"
                      data-testid="input-name"
                      className="rounded-xl h-11 bg-background/50 backdrop-blur border-border/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Type d'établissement *
                  </FormLabel>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {typeOptions.map((opt) => {
                      const active = field.value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          data-testid={`type-${opt.value}`}
                          className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border transition-all duration-200 ${
                            active ? "text-primary-foreground border-primary" : "bg-card/50 backdrop-blur border-border/50 hover:bg-accent/50 hover:scale-105"
                          }`}
                        >
                          {active && (
                            <span className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-md shadow-primary/30" />
                          )}
                          <span className="relative text-xs font-medium leading-tight text-center">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end sm:items-start">
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Adresse *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="36 Rue Bichat"
                        data-testid="input-address"
                        className="rounded-xl h-11 bg-background/50 backdrop-blur border-border/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ville *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Paris"
                      data-testid="input-city"
                      className="rounded-xl h-11 bg-background/50 backdrop-blur border-border/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* === Bloc coordonnées GPS avec bouton "ma position" === */}
              <CoordsBlock form={form} />

              <Button
                type="button"
                className="w-full h-12 rounded-2xl mt-2 bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-shadow gap-2 text-base font-semibold"
                onClick={() => {
                  form.trigger(["name", "type", "address", "city", "lat", "lng"]).then((ok) => ok && setStep(2));
                }}
                data-testid="button-next"
              >
                Continuer
                <ChevronRight className="w-4 h-4" />
              </Button>
            </FormCard>
          )}

          {/* ========================================================
              STEP 2  DÉTAILS
              ======================================================== */}
          {step === 2 && (
            <FormCard title="Détails" subtitle="Ajoutez des informations utiles aux visiteurs (optionnel)">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Téléphone
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+33 1 23 45 67 89"
                      data-testid="input-phone"
                      className="rounded-xl h-11 bg-background/50 backdrop-blur border-border/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Site web
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      data-testid="input-website"
                      className="rounded-xl h-11 bg-background/50 backdrop-blur border-border/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="hours" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Horaires d'ouverture
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Lun-Sam 9h-19h"
                      data-testid="input-hours"
                      className="rounded-xl h-11 bg-background/50 backdrop-blur border-border/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez l'établissement, son ambiance, sa spécialité..."
                      data-testid="textarea-description"
                      className="rounded-xl min-h-24 resize-none bg-background/50 backdrop-blur border-border/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="glutenFreeMenu" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <span>🌾</span>
                    Menu sans gluten
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Quelles options sans gluten propose-t-il ?"
                      data-testid="textarea-menu"
                      className="rounded-xl min-h-24 resize-none bg-background/50 backdrop-blur border-border/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="safeCeliac" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30 border border-orange-200/50 dark:border-orange-800/50">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="safe-celiac"
                      data-testid="switch-safe-celiac"
                    />
                    <Label htmlFor="safe-celiac" className="text-sm text-orange-700 dark:text-orange-300 cursor-pointer font-medium flex-1">
                      <span className="font-bold block">Safe pour les cœliaques</span>
                      <span className="text-xs opacity-80">Pas de contamination croisée constatée</span>
                    </Label>
                  </div>
                </FormItem>
              )} />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl backdrop-blur bg-card/50 border-border/50 gap-1"
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Retour
                </Button>
                <Button
                  type="button"
                  className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/30 gap-1 font-semibold"
                  onClick={() => setStep(3)}
                  data-testid="button-next-step2"
                >
                  Vérifier
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </FormCard>
          )}

          {/* ========================================================
              STEP 3  CONFIRMATION
              ======================================================== */}
          {step === 3 && (
            <FormCard title="Confirmation" subtitle="Vérifiez les informations avant de publier">
              {/* Récap visuel  cartes plutôt qu'un tableau */}
              <div className="space-y-2.5">
                <RecapRow label="Nom" value={form.getValues("name")} />
                <RecapRow
                  label="Type"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      {typeLabels[form.getValues("type")]}
                    </span>
                  }
                />
                <RecapRow label="Adresse" value={`${form.getValues("address")}, ${form.getValues("city")}`} />
                <RecapRow
                  label="Coordonnées"
                  value={`${form.getValues("lat").toFixed(4)}, ${form.getValues("lng").toFixed(4)}`}
                  mono
                />
                <RecapRow
                  label="Safe cœliaque"
                  value={
                    form.getValues("safeCeliac")
                      ? <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                          <ShieldCheck className="w-4 h-4" />
                          Oui
                        </span>
                      : <span className="text-muted-foreground">Non</span>
                  }
                />
              </div>

              {/* Aperçu menu sans gluten s'il est rempli */}
              {form.getValues("glutenFreeMenu") && (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                  <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">
                    🌾 Menu sans gluten
                  </p>
                  <p className="text-sm text-foreground/80">{form.getValues("glutenFreeMenu")}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl backdrop-blur bg-card/50 border-border/50 gap-1"
                  onClick={() => setStep(2)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Retour
                </Button>
                <Button
                  type="submit"
                  className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow font-semibold gap-2"
                  disabled={mutation.isPending}
                  data-testid="button-submit"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Publication...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Publier l'établissement
                    </>
                  )}
                </Button>
              </div>
            </FormCard>
          )}
        </form>
      </Form>
    </div>
  );
}

// ============================================================
// FormCard  wrapper glassmorphism pour chaque étape
// ============================================================
function FormCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div>
        <h2 className="font-bold text-lg md:text-xl">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ============================================================
// CoordsBlock  coordonnées GPS + bouton "Utiliser ma position"
// Ce composant améliore vraiment l'UX : pas besoin de chercher
// ses coords sur Google Maps à la main.
// ============================================================
function CoordsBlock({ form }: { form: any }) {
  const { state: geoState, locate } = useGeolocation();
  const { toast } = useToast();

  function handleUseMyLocation() {
    locate();
  }

  // Quand la géoloc réussit, on remplit les champs
  if (geoState.status === "success") {
    const lat = form.getValues("lat");
    const lng = form.getValues("lng");
    // On évite la boucle infinie : on ne set que si les valeurs sont par défaut (Paris)
    if (lat === PARIS_LAT && lng === PARIS_LNG) {
      form.setValue("lat", geoState.lat, { shouldValidate: true });
      form.setValue("lng", geoState.lng, { shouldValidate: true });
      toast({ title: "Position récupérée", description: "Coordonnées GPS remplies automatiquement." });
    }
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-background/30 backdrop-blur p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Coordonnées GPS *
        </Label>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={geoState.status === "loading"}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {geoState.status === "loading"
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Navigation className="w-3 h-3" />}
          Utiliser ma position
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="lat" render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                type="number"
                step="any"
                placeholder="Latitude"
                data-testid="input-lat"
                className="rounded-xl h-10 bg-background/50 backdrop-blur border-border/50 font-mono text-sm"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="lng" render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                type="number"
                step="any"
                placeholder="Longitude"
                data-testid="input-lng"
                className="rounded-xl h-10 bg-background/50 backdrop-blur border-border/50 font-mono text-sm"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {geoState.status === "error" && (
        <div className="flex items-start gap-2 p-2 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{geoState.message}</p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Astuce : cherchez l'adresse sur Google Maps, clic droit sur le point pour copier les coordonnées.
      </p>
    </div>
  );
}

// ============================================================
// RecapRow  ligne de récapitulatif
// ============================================================
function RecapRow({
  label, value, mono,
}: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background/40 backdrop-blur border border-border/30">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}