import { useState } from "react";
import { useParams, Link } from "wouter";
import { MapPin, Phone, Globe, Clock, Heart, Flag, BadgeCheck, MessageSquare, AlertTriangle, ArrowLeft, Check } from "lucide-react";
import {
  useGetEstablishment, getGetEstablishmentQueryKey,
  useListReviews, getListReviewsQueryKey,
  useCreateReview, useToggleFavoriteEstablishment,
  useVerifyEstablishment, useReportEstablishment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { VerificationBadge, SafeCeliacBadge } from "@/components/VerificationBadge";
import { StarRating, InteractiveStarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeLabels: Record<string, string> = {
  restaurant: "Restaurant", bakery: "Boulangerie", grocery: "Épicerie", cafe: "Café", other: "Autre",
};

export default function EtablissementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: establishment, isLoading } = useGetEstablishment(id, {
    query: { queryKey: getGetEstablishmentQueryKey(id), enabled: !!id },
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useListReviews(id, {}, {
    query: { queryKey: getListReviewsQueryKey(id, {}), enabled: !!id },
  });

  const toggleFav = useToggleFavoriteEstablishment();
  const verifyMut = useVerifyEstablishment();
  const reportMut = useReportEstablishment();
  const createReview = useCreateReview();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [crossAlert, setCrossAlert] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reportType, setReportType] = useState("wrong_info");
  const [reportDesc, setReportDesc] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-40 mb-6" />
        <Skeleton className="h-56 w-full rounded-2xl mb-6" />
        <Skeleton className="h-32 w-full rounded-xl mb-4" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Établissement non trouvé.</p>
        <Link href="/etablissements"><Button variant="outline" className="mt-4">Retour</Button></Link>
      </div>
    );
  }

  const e = establishment as any;
  const reviews = (reviewsData as any)?.reviews ?? [];

  function handleToggleFav() {
    if (!user) { toast({ title: "Connexion requise", description: "Connectez-vous pour ajouter des favoris", variant: "destructive" }); return; }
    toggleFav.mutate({ id }, {
      onSuccess: (data: any) => {
        toast({ title: data.isFavorited ? "Ajouté aux favoris" : "Retiré des favoris" });
        queryClient.invalidateQueries({ queryKey: getGetEstablishmentQueryKey(id) });
      },
    });
  }

  function handleVerify() {
    if (!user) { toast({ title: "Connexion requise", variant: "destructive" }); return; }
    verifyMut.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Vérification enregistrée", description: "Merci pour votre contribution !" });
        queryClient.invalidateQueries({ queryKey: getGetEstablishmentQueryKey(id) });
      },
    });
  }

  function handleSubmitReview() {
    if (!user) { toast({ title: "Connexion requise", variant: "destructive" }); return; }
    createReview.mutate(
      { id, data: { rating: reviewRating, comment: reviewComment || undefined, crossContaminationAlert: crossAlert } },
      {
        onSuccess: () => {
          toast({ title: "Avis publié", description: "Merci pour votre retour !" });
          setReviewComment(""); setReviewRating(5); setCrossAlert(false); setReviewOpen(false);
          queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey(id, {}) });
          queryClient.invalidateQueries({ queryKey: getGetEstablishmentQueryKey(id) });
        },
        onError: () => toast({ title: "Erreur", description: "Impossible de publier l'avis", variant: "destructive" }),
      }
    );
  }

  function handleReport() {
    if (!user) { toast({ title: "Connexion requise", variant: "destructive" }); return; }
    reportMut.mutate(
      { id, data: { type: reportType as any, description: reportDesc } },
      {
        onSuccess: () => {
          toast({ title: "Signalement envoyé", description: "Notre équipe l'examinera prochainement." });
          setReportDesc(""); setReportOpen(false);
        },
      }
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/etablissements" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour aux établissements
      </Link>

      <div className="bg-card border border-card-border rounded-2xl overflow-hidden mb-6 shadow-sm">
        <div className="h-48 bg-accent flex items-center justify-center">
          {e.photoUrl ? (
            <img src={e.photoUrl} alt={e.name} className="w-full h-full object-cover" />
          ) : (
            <MapPin className="w-16 h-16 text-primary/20" />
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-establishment-name">{e.name}</h1>
              <span className="text-sm text-muted-foreground">{typeLabels[e.type] ?? e.type}</span>
            </div>
            <button onClick={handleToggleFav} className="p-2 rounded-full hover:bg-accent transition-colors" data-testid="button-favorite">
              <Heart className={`w-5 h-5 ${e.isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <VerificationBadge level={e.verificationLevel} size="md" />
            {e.safeCeliac && <SafeCeliacBadge size="md" />}
          </div>

          {e.averageRating != null && (
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={e.averageRating} size="md" showValue />
              <span className="text-sm text-muted-foreground">({e.reviewCount} avis)</span>
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{e.address}, {e.city}</span>
            </div>
            {e.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><a href={`tel:${e.phone}`} className="hover:text-foreground">{e.phone}</a></div>}
            {e.website && <div className="flex items-center gap-2"><Globe className="w-4 h-4" /><a href={e.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground truncate">{e.website}</a></div>}
            {e.hours && <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{e.hours}</span></div>}
          </div>

          {e.description && <p className="text-sm text-foreground mb-4">{e.description}</p>}

          {e.glutenFreeMenu && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
              <h3 className="font-medium text-sm mb-1">Menu sans gluten</h3>
              <p className="text-sm text-muted-foreground">{e.glutenFreeMenu}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <Button onClick={handleVerify} variant="outline" size="sm" className="gap-2" disabled={verifyMut.isPending} data-testid="button-verify">
              <Check className="w-4 h-4" />
              Vérifier ({e.verificationCount})
            </Button>

            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-add-review">
                  <MessageSquare className="w-4 h-4" />
                  Ajouter un avis
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Laisser un avis</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="mb-2 block">Note</Label>
                    <InteractiveStarRating value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div>
                    <Label htmlFor="review-comment">Commentaire (optionnel)</Label>
                    <Textarea id="review-comment" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Partagez votre expérience..." className="mt-1" data-testid="textarea-review" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <Switch checked={crossAlert} onCheckedChange={setCrossAlert} id="cross-alert" data-testid="switch-cross-alert" />
                    <Label htmlFor="cross-alert" className="text-sm text-orange-700 dark:text-orange-300 cursor-pointer">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Signaler une contamination croisée
                    </Label>
                  </div>
                  <Button onClick={handleSubmitReview} className="w-full" disabled={createReview.isPending} data-testid="button-submit-review">
                    {createReview.isPending ? "Publication..." : "Publier l'avis"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive" data-testid="button-report">
                  <Flag className="w-4 h-4" />
                  Signaler
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Signaler un problème</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Type de problème</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger className="mt-1" data-testid="select-report-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cross_contamination">Contamination croisée</SelectItem>
                        <SelectItem value="wrong_info">Informations incorrectes</SelectItem>
                        <SelectItem value="closed">Établissement fermé</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="report-desc">Description</Label>
                    <Textarea id="report-desc" value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Décrivez le problème..." className="mt-1" data-testid="textarea-report" />
                  </div>
                  <Button onClick={handleReport} className="w-full" disabled={reportMut.isPending} data-testid="button-submit-report">
                    {reportMut.isPending ? "Envoi..." : "Envoyer le signalement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Avis ({(reviewsData as any)?.total ?? 0})
        </h2>

        {reviewsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Aucun avis pour le moment. Soyez le premier !</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r: any) => (
              <div key={r.id} className="border-b border-border last:border-0 pb-4 last:pb-0" data-testid={`review-${r.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.userName}</span>
                    <StarRating rating={r.rating} />
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
                {r.crossContaminationAlert && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    Contamination croisée signalée
                  </div>
                )}
                {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
