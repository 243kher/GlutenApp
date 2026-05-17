import { Link, useLocation } from "wouter";
import { Leaf, MapPin, ShoppingBag, PlusCircle, User, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoFeuille from './public/glutenapp2.png'; 
const navLinks = [
  { href: "/", label: "Carte", icon: MapPin },
  { href: "/etablissements", label: "Lieux", icon: Leaf },
  { href: "/produits", label: "Produits", icon: ShoppingBag },
  { href: "/ajouter", label: "Ajouter", icon: PlusCircle },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <>
      {/* ============================================================
          BARRE DU HAUT  visible partout
          - Mobile : logo + bouton utilisateur uniquement (minimaliste)
          - Desktop : logo + liens de navigation + bouton utilisateur
          ============================================================ */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40 shadow-sm">
        {/* Ligne de dégradé subtile en bas de la navbar pour l'effet futuriste */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* --- Logo avec effet glow --- */}
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/40 blur-md rounded-full group-hover:bg-primary/60 transition-all duration-300" />
                <img
                    src="/glutenapp2.png" 
                    alt="Logo Gluten Free" 
                    className="w-8 h-8 object-contain relative" 
                  />
              </div>
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent hidden sm:block">
                Gluten Free Spot
              </span>
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent sm:hidden">
                GFS
              </span>
            </Link>

            {/* --- Liens de navigation (desktop uniquement) --- */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = location === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-primary-foreground"
                        : "text-foreground/70 hover:text-foreground hover:bg-accent/60"
                    }`}
                  >
                    {/* Fond animé avec dégradé pour l'item actif */}
                    {isActive && (
                      <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-lg shadow-primary/30" />
                    )}
                    <Icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* --- Section utilisateur (toujours visible) --- */}
            <div className="flex items-center gap-2">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-full border-border/50 bg-background/50 backdrop-blur hover:bg-accent/50"
                      data-testid="button-user-menu"
                    >
                      {/* Avatar avec initiale et dégradé */}
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xs font-bold shadow-md shadow-primary/30">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="hidden sm:block">{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="backdrop-blur-xl bg-background/95 border-border/50">
                    <DropdownMenuItem asChild>
                      <Link href="/profil" className="flex items-center gap-2 cursor-pointer">
                        <User className="w-4 h-4" />
                        Mon profil
                      </Link>
                    </DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                          <Shield className="w-4 h-4" />
                          Administration
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="flex items-center gap-2 text-destructive cursor-pointer"
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      Se déconnecter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/connexion">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full hidden sm:flex"
                      data-testid="link-login"
                    >
                      Se connecter
                    </Button>
                  </Link>
                  <Link href="/inscription">
                    <Button
                      size="sm"
                      className="rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow"
                      data-testid="link-register"
                    >
                      S&apos;inscrire
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ============================================================
          BOTTOM NAV BAR  uniquement sur mobile
          Pattern moderne : navigation par onglets en bas de l'écran,
          accessible au pouce, comme Instagram / Spotify / etc.
          ============================================================ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-t border-border/40">
        {/* Ligne lumineuse en haut */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="flex items-center justify-around h-16 px-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`mobile-nav-${href.replace("/", "") || "home"}`}
              >
                {/* Indicateur lumineux en haut quand actif */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-b-full shadow-[0_2px_10px_hsl(var(--primary))]" />
                )}

                {/* Icône avec glow effect quand active */}
                <div className={`relative transition-transform duration-200 ${isActive ? "scale-110 -translate-y-0.5" : ""}`}>
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
                  )}
                  <Icon className="w-5 h-5 relative" strokeWidth={isActive ? 2.5 : 2} />
                </div>

                <span className={`text-[10px] leading-none transition-all ${isActive ? "font-bold" : "font-medium"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Padding pour les iPhone (safe area) */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background/80" />
      </nav>
    </>
  );
}