import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { MapPin, CheckCircle } from "lucide-react";
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

export default function AjouterPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useCreateEstablishment();
  const [step, setStep] = useState(1);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", type: "restaurant", address: "", city: "Paris",
      lat: PARIS_LAT, lng: PARIS_LNG, safeCeliac: false,
      phone: "", website: "", hours: "", description: "", glutenFreeMenu: "",
    },
  });

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <MapPin className="w-12 h-12 mx-auto text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Connexion requise</h2>
        <p className="text-muted-foreground mb-4">Vous devez être connecté pour ajouter un établissement.</p>
        <Button onClick={() => setLocation("/connexion")}>Se connecter</Button>
      </div>
    );
  }

  function onSubmit(values: z.infer<typeof schema>) {
    mutation.mutate(
      {
        data: {
          name: values.name,
          type: values.type,
          address: values.address,
          city: values.city,
          lat: values.lat,
          lng: values.lng,
          safeCeliac: values.safeCeliac,
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Ajouter un établissement</h1>
        <p className="text-muted-foreground">Contribuez à la communauté en référençant un lieu sans gluten</p>
      </div>

      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => s < step && setStep(s)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                s < step ? "bg-primary text-primary-foreground cursor-pointer" :
                s === step ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <CheckCircle className="w-4 h-4" /> : s}
            </button>
            <span className={`text-sm ${s === step ? "font-medium" : "text-muted-foreground"}`}>
              {s === 1 ? "Localisation" : s === 2 ? "Détails" : "Confirmation"}
            </span>
            {s < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {step === 1 && (
            <div className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-lg mb-2">Localisation</h2>
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l&apos;établissement *</FormLabel>
                  <FormControl><Input placeholder="Ex: Helmut Newcake" data-testid="input-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="bakery">Boulangerie</SelectItem>
                      <SelectItem value="grocery">Épicerie</SelectItem>
                      <SelectItem value="cafe">Café</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse *</FormLabel>
                  <FormControl><Input placeholder="36 Rue Bichat" data-testid="input-address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville *</FormLabel>
                  <FormControl><Input placeholder="Paris" data-testid="input-city" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="lat" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude *</FormLabel>
                    <FormControl><Input type="number" step="any" placeholder="48.8566" data-testid="input-lat" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lng" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude *</FormLabel>
                    <FormControl><Input type="number" step="any" placeholder="2.3522" data-testid="input-lng" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="button" className="w-full" onClick={() => {
                form.trigger(["name", "type", "address", "city", "lat", "lng"]).then((ok) => ok && setStep(2));
              }} data-testid="button-next">
                Suivant
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-lg mb-2">Détails</h2>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl><Input type="tel" placeholder="+33 1 23 45 67 89" data-testid="input-phone" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Site web</FormLabel>
                  <FormControl><Input type="url" placeholder="https://..." data-testid="input-website" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="hours" render={({ field }) => (
                <FormItem>
                  <FormLabel>Horaires</FormLabel>
                  <FormControl><Input placeholder="Lun-Sam 9h-19h" data-testid="input-hours" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Décrivez l'établissement..." data-testid="textarea-description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="glutenFreeMenu" render={({ field }) => (
                <FormItem>
                  <FormLabel>Menu sans gluten</FormLabel>
                  <FormControl><Textarea placeholder="Décrivez les options sans gluten disponibles..." data-testid="textarea-menu" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="safeCeliac" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <Switch checked={field.value} onCheckedChange={field.onChange} id="safe-celiac" data-testid="switch-safe-celiac" />
                    <Label htmlFor="safe-celiac" className="text-sm text-orange-700 dark:text-orange-300 cursor-pointer font-medium">
                      Cet établissement est safe pour les cœliaques (pas de contamination croisée)
                    </Label>
                  </div>
                </FormItem>
              )} />
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Retour</Button>
                <Button type="button" className="flex-1" onClick={() => setStep(3)} data-testid="button-next-step2">Vérifier</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-card border border-card-border rounded-2xl p-6">
              <h2 className="font-semibold text-lg mb-4">Confirmation</h2>
              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Nom</span>
                  <span className="font-medium">{form.getValues("name")}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{form.getValues("type")}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Adresse</span>
                  <span className="font-medium">{form.getValues("address")}, {form.getValues("city")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Safe coeliaque</span>
                  <span className={`font-medium ${form.getValues("safeCeliac") ? "text-green-600" : "text-muted-foreground"}`}>
                    {form.getValues("safeCeliac") ? "Oui" : "Non"}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>Retour</Button>
                <Button type="submit" className="flex-1" disabled={mutation.isPending} data-testid="button-submit">
                  {mutation.isPending ? "Ajout en cours..." : "Ajouter l'établissement"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
