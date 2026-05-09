import { useState, useCallback } from "react";

export type GeolocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; lat: number; lng: number; accuracy: number }
  | { status: "error"; message: string };

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: "idle" });

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: "error", message: "La géolocalisation n'est pas disponible sur cet appareil." });
      return;
    }
    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: "success",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Accès à la localisation refusé. Autorisez-la dans les paramètres de votre navigateur.",
          2: "Position introuvable. Vérifiez votre connexion.",
          3: "La demande de localisation a expiré. Réessayez.",
        };
        setState({ status: "error", message: messages[err.code] ?? "Erreur de localisation inconnue." });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, locate, reset };
}
