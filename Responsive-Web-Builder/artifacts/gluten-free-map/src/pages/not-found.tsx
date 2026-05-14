import { Link, useLocation } from "wouter";
import { Home, ArrowLeft, MapPin, Search, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-[calc(100dvh-128px)] md:min-h-[calc(100dvh-64px)] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* === Blobs de fond === */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg text-center">
        {/* ========================================================
            CHIFFRE 404 — énorme, en dégradé
            ======================================================== */}
        <div className="relative mb-6">
          {/* Halo derrière le chiffre */}
          <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />

          <h1 className="relative text-[120px] md:text-[160px] font-black tracking-tighter leading-none">
            <span className="bg-gradient-to-br from-primary via-primary/60 to-primary/30 bg-clip-text text-transparent">
              404
            </span>
          </h1>

          {/* Boussole flottante en superposition */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="relative animate-bounce-slow">
              <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full" />
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/40 rotate-12">
                <Compass className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            MESSAGE
            ======================================================== */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              Page introuvable
            </span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto leading-relaxed">
            On a cherché partout, mais cette page n'existe pas (ou plus).
            <br className="hidden sm:inline" />
            Pas de panique, voici quelques pistes pour rebondir.
          </p>
        </div>

        {/* ========================================================
            ACTIONS — CTA principal + retour
            ======================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-8">
          <Link href="/" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow gap-2 font-semibold"
            >
              <Home className="w-4 h-4" />
              Retour à l'accueil
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto rounded-full backdrop-blur bg-card/50 border-border/50 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Page précédente
          </Button>
        </div>

        {/* ========================================================
            SUGGESTIONS — liens vers les sections principales
            ======================================================== */}
        <div className="relative bg-card/40 backdrop-blur-xl border border-border/40 rounded-3xl p-5">
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Ou explorez plutôt
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SuggestionLink
              href="/"
              icon={MapPin}
              title="Carte"
              desc="Lieux sans gluten près de vous"
            />
            <SuggestionLink
              href="/etablissements"
              icon={Search}
              title="Établissements"
              desc="Parcourir et filtrer"
            />
          </div>
        </div>
      </div>

      {/* Animation pour la boussole — déclaration locale via style tag */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) rotate(12deg); }
          50% { transform: translateY(-8px) rotate(8deg); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SuggestionLink — carte cliquable vers une section
// ============================================================
function SuggestionLink({
  href, icon: Icon, title, desc,
}: { href: string; icon: any; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 p-3 rounded-2xl bg-background/40 backdrop-blur border border-border/30 hover:border-primary/30 hover:bg-background/60 hover:-translate-y-0.5 transition-all duration-200 text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
      <ArrowLeft className="w-4 h-4 text-muted-foreground/40 rotate-180 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}