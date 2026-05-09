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
    <div className="min-h-screen bg-background">
      <Navbar />
      <Router />
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
