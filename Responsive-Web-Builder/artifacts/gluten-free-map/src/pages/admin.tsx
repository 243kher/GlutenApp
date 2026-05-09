import { useLocation } from "wouter";
import { Shield, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useListReports, getListReportsQueryKey, useResolveReport } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const reportTypeLabels: Record<string, string> = {
  cross_contamination: "Contamination croisée",
  wrong_info: "Informations incorrectes",
  closed: "Établissement fermé",
  other: "Autre",
};

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const resolveReport = useResolveReport();

  const { data: reports, isLoading } = useListReports({ status: "pending" }, {
    query: { queryKey: getListReportsQueryKey({ status: "pending" }), enabled: user?.role === "admin" },
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Accès restreint</h2>
        <p className="text-muted-foreground mb-4">Cette page est réservée aux administrateurs.</p>
        <Button onClick={() => setLocation("/")} variant="outline">Retour à l&apos;accueil</Button>
      </div>
    );
  }

  const reportsList = (reports as any) ?? [];

  function handleResolve(id: number) {
    resolveReport.mutate(
      { id, data: { resolution: "Résolu par l'administrateur" } },
      {
        onSuccess: () => {
          toast({ title: "Signalement résolu" });
          queryClient.invalidateQueries({ queryKey: getListReportsQueryKey({ status: "pending" }) });
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground">Modération et gestion de la plateforme</p>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Signalements en attente
          </h2>
          <Badge variant="outline">{isLoading ? "..." : reportsList.length} en attente</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : reportsList.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="font-medium">Aucun signalement en attente</p>
            <p className="text-sm text-muted-foreground">Tout est en ordre !</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reportsList.map((r: any) => (
              <div key={r.id} className="border border-border rounded-xl p-4" data-testid={`report-${r.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{r.establishmentName}</span>
                      <Badge variant="outline" className="text-xs">{reportTypeLabels[r.type] ?? r.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{r.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                      <span>Signalé par {r.userName}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleResolve(r.id)}
                    disabled={resolveReport.isPending}
                    className="flex-shrink-0"
                    data-testid={`button-resolve-${r.id}`}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Résoudre
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
