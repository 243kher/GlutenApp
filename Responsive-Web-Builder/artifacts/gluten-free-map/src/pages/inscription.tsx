import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Leaf } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(2, "Nom trop court"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Au moins 6 caractères"),
  role: z.enum(["user", "owner"]),
});

export default function InscriptionPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const mutation = useRegister();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  });

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
          toast({ title: "Erreur", description: err?.data?.error ?? "Impossible de créer le compte", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Leaf className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Créer un compte</h1>
          <p className="text-muted-foreground mt-1">Rejoignez la communauté sans gluten</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input placeholder="Marie Dupont" data-testid="input-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="vous@exemple.fr" data-testid="input-email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Au moins 6 caractères" data-testid="input-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Je suis</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">Utilisateur (cherche des lieux sans gluten)</SelectItem>
                      <SelectItem value="owner">Propriétaire (je gère un établissement)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit">
                {mutation.isPending ? "Création..." : "Créer mon compte"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Déjà un compte ?{" "}
            <Link href="/connexion" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
