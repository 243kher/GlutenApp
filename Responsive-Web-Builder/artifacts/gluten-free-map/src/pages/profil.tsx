import { useLocation } from "wouter";
import { User, Heart, MapPin, MessageSquare, Settings } from "lucide-react";
import { useGetMe, getGetMeQueryKey, useUpdateMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ProfilPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMe = useUpdateMe();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [dietaryPreferences, setDietaryPreferences] = useState(user?.dietaryPreferences ?? "");

  const { data: profile, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), enabled: !!user },
  });

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <User className="w-12 h-12 mx-auto text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Connexion requise</h2>
        <p className="text-muted-foreground mb-4">Connectez-vous pour accéder à votre profil.</p>
        <Button onClick={() => setLocation("/connexion")}>Se connecter</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-32 w-full rounded-2xl mb-6" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const p = (profile as any) ?? user;
  const roleLabel: Record<string, string> = { user: "Utilisateur", owner: "Propriétaire", admin: "Administrateur" };

  function handleSave() {
    updateMe.mutate(
      { data: { name: name || undefined, dietaryPreferences: dietaryPreferences || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Profil mis à jour" });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setEditing(false);
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Mon profil</h1>

      <div className="bg-card border border-card-border rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold" data-testid="text-profile-name">{p.name}</h2>
              <p className="text-sm text-muted-foreground">{p.email}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
                {roleLabel[p.role] ?? p.role}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} data-testid="button-edit-profile">
            <Settings className="w-4 h-4 mr-2" />
            {editing ? "Annuler" : "Modifier"}
          </Button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nom</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" data-testid="input-edit-name" />
            </div>
            <div>
              <Label htmlFor="edit-dietary">Préférences alimentaires</Label>
              <Textarea
                id="edit-dietary"
                value={dietaryPreferences}
                onChange={(e) => setDietaryPreferences(e.target.value)}
                placeholder="Ex: coeliaque, intolérant au lactose..."
                className="mt-1"
                data-testid="textarea-dietary"
              />
            </div>
            <Button onClick={handleSave} disabled={updateMe.isPending} data-testid="button-save-profile">
              {updateMe.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        ) : (
          <div>
            {p.dietaryPreferences && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Préférences alimentaires</h3>
                <p className="text-sm">{p.dietaryPreferences}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: MapPin, label: "Établissements ajoutés", value: "0" },
          { icon: MessageSquare, label: "Avis publiés", value: "0" },
          { icon: Heart, label: "Favoris", value: "0" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-card border border-card-border rounded-xl p-4 text-center">
            <Icon className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold mb-4">Compte</h2>
        <div className="text-sm text-muted-foreground mb-4">
          Membre depuis le {new Date(p.createdAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
        </div>
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => { logout(); setLocation("/"); }}
          data-testid="button-logout-profile"
        >
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
