/**
 * Main application component for the Gluten-Free Map.
 * This app allows users to find and review gluten-free establishments and products.
 *//**
 * Composant racine de l'application Gluten Free Spot.
 * Gère le routing, les providers globaux, et le layout responsive
 * (desktop avec footer, mobile avec bottom nav).
 */
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import EtablissementsPage from "@/pages/etablissements";
import EtablissementDetailPage from "@/pages/etablissement-detail";
import ProduitsPage from "@/pages/produits";
import AjouterPage from "@/pages/ajouter";
import ProfilPage from "@/pages/profil";
import AdminPage from "@/pages/admin";
import ConnexionPage from "@/pages/connexion";
import InscriptionPage from "@/pages/inscription";
import { Leaf } from "lucide-react";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});



function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/etablissements" component={EtablissementsPage} />
      <Route path="/etablissements/:id" component={EtablissementDetailPage} />
      <Route path="/produits" component={ProduitsPage} />
      <Route path="/ajouter" component={AjouterPage} />
      <Route path="/profil" component={ProfilPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/connexion" component={ConnexionPage} />
      <Route path="/inscription" component={InscriptionPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-x-hidden">
      {/* === Effets de fond futuristes (blobs lumineux flous) === */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <Navbar />

      {/* 
        Padding-bottom sur mobile pour ne pas que le contenu passe sous la bottom nav.
        h-16 (4rem) = hauteur de la bottom nav + un peu de marge.
      */}
      <main className="flex-1 pb-20 md:pb-0">
        <Router />
      </main>

      {/* 
        Footer : caché sur mobile (la bottom nav prend déjà la place).
        Sur desktop : design moderne avec gradient et accent lumineux.
      */}
      <footer className="hidden md:block relative border-t border-border/40 py-8 mt-12 backdrop-blur-sm">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Leaf className="w-5 h-5 text-primary" />
            <p className="font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Gluten Free Spot
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Trouvez les meilleurs établissements sans gluten près de chez vous.
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppLayout />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;