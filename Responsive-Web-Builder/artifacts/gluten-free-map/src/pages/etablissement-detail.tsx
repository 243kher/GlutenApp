import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  Heart,
  Flag,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
  Check,
  Share2,
  Star,
  Navigation,
} from "lucide-react";
import {
  useGetEstablishment,
  getGetEstablishmentQueryKey,
  useListReviews,
  getListReviewsQueryKey,
  useCreateReview,
  useToggleFavoriteEstablishment,
  useVerifyEstablishment,
  useReportEstablishment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  VerificationBadge,
  SafeCeliacBadge,
} from "@/components/VerificationBadge";
import { StarRating, InteractiveStarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const typeLabels: Record<string, string> = {
  restaurant: "Restaurant",
  bakery: "Boulangerie",
  grocery: "Épicerie",
  cafe: "Café",
  other: "Autre",
};

const typeEmojis: Record<string, string> = {
  restaurant: "🍽",
  bakery: "🥖",
  grocery: "🛒",
  cafe: "☕",
  other: "📍",
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
  const { data: reviewsData, isLoading: reviewsLoading } = useListReviews(
    id,
    {},
    {
      query: { queryKey: getListReviewsQueryKey(id, {}), enabled: !!id },
    },
  );

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

  // === États de chargement / erreur ===
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <Skeleton className="h-8 w-40 mb-6 rounded-full" />
        <Skeleton className="h-64 md:h-80 w-full rounded-3xl mb-6" />
        <Skeleton className="h-40 w-full rounded-2xl mb-4" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="text-center py-20 px-4">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
          <MapPin className="w-16 h-16 text-muted-foreground/40 relative" />
        </div>
        <p className="text-muted-foreground mb-4">Établissement non trouvé.</p>
        <Link href="/etablissements">
          <Button variant="outline" className="rounded-full">
            Retour aux établissements
          </Button>
        </Link>
      </div>
    );
  }

  const e = establishment as any;
  const reviews = (reviewsData as any)?.reviews ?? [];
  const reviewsTotal = (reviewsData as any)?.total ?? 0;

  function handleToggleFav() {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour ajouter des favoris",
        variant: "destructive",
      });
      return;
    }
    toggleFav.mutate(
      { id },
      {
        onSuccess: (data: any) => {
          toast({
            title: data.isFavorited
              ? "Ajouté aux favoris"
              : "Retiré des favoris",
          });
          queryClient.invalidateQueries({
            queryKey: getGetEstablishmentQueryKey(id),
          });
        },
      },
    );
  }

  function handleVerify() {
    if (!user) {
      toast({ title: "Connexion requise", variant: "destructive" });
      return;
    }
    verifyMut.mutate(
      { id },
      {
        onSuccess: (data: any) => {
          if (data?.alreadyVerified) {
            toast({
              title: "Déjà vérifié",
              description: "Vous avez déjà vérifié cet établissement.",
            });
          } else {
            toast({
              title: "Vérification enregistrée",
              description: "Merci pour votre contribution !",
            });
            queryClient.invalidateQueries({
              queryKey: getGetEstablishmentQueryKey(id),
            });
          }
        },
        onError: (err: any) => {
          console.error("Verify error:", err);
          const msg =
            err?.data?.error ??
            err?.response?.data?.error ??
            err?.message ??
            "Erreur inconnue";
          toast({ title: "Erreur", description: msg, variant: "destructive" });
        },
      },
    );
  }

  function handleSubmitReview() {
    if (!user) {
      toast({ title: "Connexion requise", variant: "destructive" });
      return;
    }
    createReview.mutate(
      {
        id,
        data: {
          rating: reviewRating,
          comment: reviewComment || undefined,
          crossContaminationAlert: crossAlert,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Avis publié",
            description: "Merci pour votre retour !",
          });
          setReviewComment("");
          setReviewRating(5);
          setCrossAlert(false);
          setReviewOpen(false);
          queryClient.invalidateQueries({
            queryKey: getListReviewsQueryKey(id, {}),
          });
          queryClient.invalidateQueries({
            queryKey: getGetEstablishmentQueryKey(id),
          });
        },
        onError: () =>
          toast({
            title: "Erreur",
            description: "Impossible de publier l'avis",
            variant: "destructive",
          }),
      },
    );
  }

  function handleReport() {
    if (!user) {
      toast({ title: "Connexion requise", variant: "destructive" });
      return;
    }
    reportMut.mutate(
      { id, data: { type: reportType as any, description: reportDesc } },
      {
        onSuccess: () => {
          toast({
            title: "Signalement envoyé",
            description: "Notre équipe l'examinera prochainement.",
          });
          setReportDesc("");
          setReportOpen(false);
        },
      },
    );
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: e.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Lien copié", description: "Vous pouvez le partager." });
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 pb-24 md:pb-8">
      {/* ========================================================
          Bouton retour
          ======================================================== */}
      <Link
        href="/etablissements"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors group"
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-card/60 backdrop-blur border border-border/40 group-hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </span>
        <span className="hidden sm:inline">Retour aux établissements</span>
        <span className="sm:hidden">Retour</span>
      </Link>

      {/* ========================================================
          HERO  image avec dégradé + actions flottantes
          ======================================================== */}
      <div className="relative rounded-3xl overflow-hidden mb-6 shadow-xl">
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent z-10" />

        <div className="relative h-56 md:h-72 bg-gradient-to-br from-primary/10 via-accent to-primary/5">
          {e.photoUrl ? (
            <img
              src={e.photoUrl}
              alt={e.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl md:text-8xl opacity-30">
                {typeEmojis[e.type] ?? "📍"}
              </span>
            </div>
          )}

          {/* Dégradé sombre en bas pour lisibilité du titre */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Actions flottantes en haut à droite */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/20 border border-white/30 text-white flex items-center justify-center hover:bg-white/30 transition-colors shadow-lg"
              aria-label="Partager"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleFav}
              data-testid="button-favorite"
              className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors shadow-lg"
              aria-label="Favori"
            >
              <Heart
                className={`w-4 h-4 transition-all ${e.isFavorited ? "fill-red-500 text-red-500 scale-110" : "text-white"}`}
              />
            </button>
          </div>

          {/* Titre et type superposés sur l'image */}
          <div className="absolute bottom-0 inset-x-0 p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/90 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20">
                {typeLabels[e.type] ?? e.type}
              </span>
            </div>
            <h1
              className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg"
              data-testid="text-establishment-name"
            >
              {e.name}
            </h1>
          </div>
        </div>
      </div>

      {/* ========================================================
          CARTE PRINCIPALE  badges, rating, infos
          ======================================================== */}
      <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl p-5 md:p-6 mb-5 shadow-sm">
        {/* Badges + rating */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <VerificationBadge level={e.verificationLevel} size="md" />
          {e.safeCeliac && <SafeCeliacBadge size="md" />}
          {e.averageRating != null && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400/20 to-amber-500/10 border border-amber-400/30">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                {e.averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({e.reviewCount})
              </span>
            </div>
          )}
        </div>

        {/* Infos contact en grille */}
        <div className="space-y-2 mb-4">
          <InfoRow icon={MapPin} text={`${e.address}, ${e.city}`} />
          {e.phone && (
            <InfoRow icon={Phone} text={e.phone} href={`tel:${e.phone}`} />
          )}
          {e.website && (
            <InfoRow
              icon={Globe}
              text={e.website.replace(/^https?:\/\//, "")}
              href={e.website}
              external
            />
          )}
          {e.hours && <InfoRow icon={Clock} text={e.hours} />}
        </div>

        {e.description && (
          <p className="text-sm text-foreground/80 leading-relaxed mb-4">
            {e.description}
          </p>
        )}

        {/* Encart menu sans gluten avec accent visuel */}
        {e.glutenFreeMenu && (
          <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 mb-4 overflow-hidden">
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <h3 className="font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <span className="text-base">🌾</span>
              Menu sans gluten
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {e.glutenFreeMenu}
            </p>
          </div>
        )}

        {/* === ACTIONS DESKTOP  boutons en ligne === */}
        <div className="hidden md:flex flex-wrap gap-2 pt-4 border-t border-border/40">
          <Button
            onClick={handleVerify}
            variant="outline"
            size="sm"
            className="gap-2 rounded-full backdrop-blur bg-background/50 border-border/50"
            disabled={verifyMut.isPending}
            data-testid="button-verify"
          >
            <Check className="w-4 h-4 text-green-600" />
            Vérifier
            <span className="text-xs text-muted-foreground">
              ({e.verificationCount})
            </span>
          </Button>

          <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow"
                data-testid="button-add-review"
              >
                <MessageSquare className="w-4 h-4" />
                Donner mon avis
              </Button>
            </DialogTrigger>
            <ReviewDialogContent
              reviewRating={reviewRating}
              setReviewRating={setReviewRating}
              reviewComment={reviewComment}
              setReviewComment={setReviewComment}
              crossAlert={crossAlert}
              setCrossAlert={setCrossAlert}
              handleSubmitReview={handleSubmitReview}
              isPending={createReview.isPending}
            />
          </Dialog>

          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-full text-destructive hover:bg-destructive/10 ml-auto"
                data-testid="button-report"
              >
                <Flag className="w-4 h-4" />
                Signaler
              </Button>
            </DialogTrigger>
            <ReportDialogContent
              reportType={reportType}
              setReportType={setReportType}
              reportDesc={reportDesc}
              setReportDesc={setReportDesc}
              handleReport={handleReport}
              isPending={reportMut.isPending}
            />
          </Dialog>
        </div>
      </div>

      {/* ========================================================
          SECTION AVIS
          ======================================================== */}
      <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-3xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Avis
            <span className="text-sm font-normal text-muted-foreground">
              ({reviewsTotal})
            </span>
          </h2>
        </div>

        {reviewsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10">
            <div className="relative inline-block mb-3">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <MessageSquare className="w-12 h-12 text-muted-foreground/40 relative" />
            </div>
            <p className="text-muted-foreground text-sm">
              Aucun avis pour le moment. Soyez le premier !
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <div
                key={r.id}
                className="rounded-2xl p-4 bg-background/40 backdrop-blur border border-border/30"
                data-testid={`review-${r.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {/* Avatar avec initiale */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xs font-bold shadow-md shadow-primary/20">
                      {(r.userName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm leading-tight">
                        {r.userName}
                      </p>
                      <div className="mt-0.5">
                        <StarRating rating={r.rating} />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                {r.crossContaminationAlert && (
                  <div className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mb-1.5 px-2 py-0.5 rounded-full bg-orange-100/50 dark:bg-orange-950/50 border border-orange-200/50 dark:border-orange-800/50">
                    <AlertTriangle className="w-3 h-3" />
                    Contamination croisée signalée
                  </div>
                )}
                {r.comment && (
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          ACTION BAR MOBILE  sticky en bas (juste au-dessus de la bottom nav)
          ======================================================== */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-[1100] backdrop-blur-xl bg-background/85 border-t border-border/40 px-4 py-3">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex gap-2">
          <Button
            onClick={handleVerify}
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 rounded-2xl h-11 bg-card/50 backdrop-blur border-border/50"
            disabled={verifyMut.isPending}
            data-testid="button-verify-mobile"
          >
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-xs">Vérifier ({e.verificationCount})</span>
          </Button>

          <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="flex-1 gap-1.5 rounded-2xl h-11 bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/30"
                data-testid="button-add-review-mobile"
              >
                <MessageSquare className="w-4 h-4" />
                Donner mon avis
              </Button>
            </DialogTrigger>
            <ReviewDialogContent
              reviewRating={reviewRating}
              setReviewRating={setReviewRating}
              reviewComment={reviewComment}
              setReviewComment={setReviewComment}
              crossAlert={crossAlert}
              setCrossAlert={setCrossAlert}
              handleSubmitReview={handleSubmitReview}
              isPending={createReview.isPending}
            />
          </Dialog>

          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <button
                className="w-11 h-11 rounded-2xl bg-card/50 backdrop-blur border border-border/50 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                data-testid="button-report-mobile"
                aria-label="Signaler"
              >
                <Flag className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <ReportDialogContent
              reportType={reportType}
              setReportType={setReportType}
              reportDesc={reportDesc}
              setReportDesc={setReportDesc}
              handleReport={handleReport}
              isPending={reportMut.isPending}
            />
          </Dialog>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Ligne d'info  icône + texte (+ lien optionnel)
// ============================================================
// ============================================================
// Ligne d'info  icône + texte (+ lien optionnel)
// ============================================================
function InfoRow({
  icon: Icon,
  text,
  href,
  external,
}: {
  icon: any;
  text: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary flex-shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <span
        className={`text-sm flex-1 min-w-0 truncate ${href ? "text-foreground hover:text-primary transition-colors" : "text-foreground/80"}`}
      >
        {text}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="flex items-center gap-3 group"
      >
        {content}
      </a>
    );
  }
  return <div className="flex items-center gap-3">{content}</div>;
}

// ============================================================
// Dialog "ajouter un avis"  extrait pour réutilisation desktop/mobile
// ============================================================
function ReviewDialogContent({
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  crossAlert,
  setCrossAlert,
  handleSubmitReview,
  isPending,
}: any) {
  return (
    <DialogContent className="rounded-3xl border-border/40 backdrop-blur-xl bg-card/95">
      <DialogHeader>
        <DialogTitle className="text-xl">Laisser un avis</DialogTitle>
      </DialogHeader>
      <div className="space-y-5 pt-2">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Votre note
          </Label>
          <InteractiveStarRating
            value={reviewRating}
            onChange={setReviewRating}
          />
        </div>
        <div>
          <Label
            htmlFor="review-comment"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block"
          >
            Commentaire (optionnel)
          </Label>
          <Textarea
            id="review-comment"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Partagez votre expérience..."
            className="rounded-2xl resize-none min-h-24 bg-background/50 backdrop-blur border-border/50"
            data-testid="textarea-review"
          />
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30 border border-orange-200/50 dark:border-orange-800/50">
          <Switch
            checked={crossAlert}
            onCheckedChange={setCrossAlert}
            id="cross-alert"
            data-testid="switch-cross-alert"
          />
          <Label
            htmlFor="cross-alert"
            className="text-sm text-orange-700 dark:text-orange-300 cursor-pointer flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            Signaler une contamination croisée
          </Label>
        </div>
        <Button
          onClick={handleSubmitReview}
          className="w-full h-11 rounded-2xl bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/30"
          disabled={isPending}
          data-testid="button-submit-review"
        >
          {isPending ? "Publication..." : "Publier l'avis"}
        </Button>
      </div>
    </DialogContent>
  );
}

// ============================================================
// Dialog "signaler"  extrait pour réutilisation desktop/mobile
// ============================================================
function ReportDialogContent({
  reportType,
  setReportType,
  reportDesc,
  setReportDesc,
  handleReport,
  isPending,
}: any) {
  return (
    <DialogContent className="rounded-3xl border-border/40 backdrop-blur-xl bg-card/95">
      <DialogHeader>
        <DialogTitle className="text-xl flex items-center gap-2">
          <Flag className="w-5 h-5 text-destructive" />
          Signaler un problème
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-5 pt-2">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Type de problème
          </Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger
              className="rounded-xl bg-background/50 backdrop-blur border-border/50"
              data-testid="select-report-type"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cross_contamination">
                Contamination croisée
              </SelectItem>
              <SelectItem value="wrong_info">
                Informations incorrectes
              </SelectItem>
              <SelectItem value="closed">Établissement fermé</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label
            htmlFor="report-desc"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block"
          >
            Description
          </Label>
          <Textarea
            id="report-desc"
            value={reportDesc}
            onChange={(e) => setReportDesc(e.target.value)}
            placeholder="Décrivez le problème..."
            className="rounded-2xl resize-none min-h-24 bg-background/50 backdrop-blur border-border/50"
            data-testid="textarea-report"
          />
        </div>
        <Button
          onClick={handleReport}
          className="w-full h-11 rounded-2xl"
          variant="destructive"
          disabled={isPending}
          data-testid="button-submit-report"
        >
          {isPending ? "Envoi..." : "Envoyer le signalement"}
        </Button>
      </div>
    </DialogContent>
  );
}
