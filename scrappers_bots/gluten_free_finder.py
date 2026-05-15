#!/usr/bin/env python3
"""
Gluten-Free Places Finder (OpenStreetMap) - version élargie
-----------------------------------------------------------
Cherche les lieux sans gluten d'une ville en interrogeant plusieurs tags OSM :
  - diet:gluten_free = yes / only / limited
  - name contient "gluten"
  - description contient "gluten"
  - cuisine contient "gluten_free"

Et utilise une bounding box plus large pour ratisser les communes voisines.

Usage :
    python gluten_free_finder.py "Marseille"
    python gluten_free_finder.py "Marseille" --bbox  # zone élargie
    python gluten_free_finder.py "Marseille" --reverse-geocode

Dépendances :
    pip install requests
"""

import argparse
import csv
import time
from typing import Dict, List, Optional, Tuple

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

NOMINATIM_URL = "https://nominatim.openstreetmap.org"
USER_AGENT = "gluten-free-finder/1.0"

# Bounding boxes des grandes villes françaises (south, west, north, east)
# Pour élargir au-delà des frontières administratives strictes
KNOWN_BBOXES = {
    "marseille": (43.16, 5.22, 43.41, 5.56),
    "paris":     (48.78, 2.20, 48.92, 2.48),
    "lyon":      (45.69, 4.74, 45.81, 4.92),
    "bordeaux":  (44.78, -0.71, 44.92, -0.49),
    "toulouse":  (43.53, 1.35, 43.68, 1.52),
    "nice":      (43.65, 7.18, 43.78, 7.34),
    "nantes":    (47.17, -1.65, 47.29, -1.46),
    "lille":     (50.59, 2.97, 50.68, 3.10),
}


# ---------------------------------------------------------------------------
# Requête Overpass
# ---------------------------------------------------------------------------

def build_query(city: str, bbox: Optional[Tuple[float, float, float, float]]) -> str:
    """
    Construit une requête Overpass qui regarde plusieurs tags
    (diet, name, description, cuisine) version élargie.
    """
    if bbox:
        # Filtre par bounding box (south, west, north, east)
        area_filter = f"({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]})"
        area_setup = ""
    else:
        area_setup = f'area["name"="{city}"]->.a;'
        area_filter = "(area.a)"

    return f"""[out:json][timeout:120];
{area_setup}
(
  nwr["diet:gluten_free"~"yes|only|limited"]{area_filter};
  nwr["name"~"gluten",i]{area_filter};
  nwr["description"~"gluten",i]{area_filter};
  nwr["cuisine"~"gluten_free",i]{area_filter};
);
out center tags;"""


def try_endpoint(endpoint: str, query: str) -> Optional[List[Dict]]:
    """Essaie 3 méthodes d'envoi sur un endpoint Overpass."""
    ua_headers = {"User-Agent": USER_AGENT}
    strategies = [
        ("POST form",
         lambda: requests.post(endpoint, data={"data": query},
                               headers=ua_headers, timeout=180)),
        ("POST raw",
         lambda: requests.post(endpoint, data=query.encode("utf-8"),
                               headers={**ua_headers,
                                        "Content-Type": "text/plain"},
                               timeout=180)),
        ("GET",
         lambda: requests.get(endpoint, params={"data": query},
                              headers=ua_headers, timeout=180)),
    ]
    for name, call in strategies:
        try:
            r = call()
            if r.status_code == 200:
                try:
                    data = r.json()
                except ValueError:
                    print(f"      • {name:9s} → HTTP 200 mais JSON invalide")
                    continue
                elements = data.get("elements", [])
                print(f"      • {name:9s} → HTTP 200 ✓ ({len(elements)} éléments)")
                return elements
            else:
                snippet = r.text[:80].replace("\n", " ")
                print(f"      • {name:9s} → HTTP {r.status_code} : {snippet}")
        except requests.exceptions.Timeout:
            print(f"      • {name:9s} → timeout")
        except Exception as e:
            print(f"      • {name:9s} → {type(e).__name__} : {str(e)[:60]}")
    return None


def query_overpass(city: str,
                   bbox: Optional[Tuple[float, float, float, float]]) -> List[Dict]:
    query = build_query(city, bbox)
    for i, endpoint in enumerate(OVERPASS_MIRRORS, 1):
        print(f"\n  → Miroir {i}/{len(OVERPASS_MIRRORS)} : {endpoint}")
        result = try_endpoint(endpoint, query)
        if result is not None:
            return result
    return []


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def extract_osm_info(element: Dict) -> Dict:
    tags = element.get("tags", {})
    if element["type"] == "node":
        lat, lon = element.get("lat"), element.get("lon")
    else:
        center = element.get("center", {})
        lat, lon = center.get("lat"), center.get("lon")

    addr_parts = []
    for key in ("addr:housenumber", "addr:street",
                "addr:postcode", "addr:city"):
        if key in tags:
            addr_parts.append(tags[key])
    address = " ".join(addr_parts)

    place_type = (tags.get("amenity")
                  or tags.get("shop")
                  or tags.get("cuisine") or "")

    # Indique comment le lieu a matché (pour debug)
    match_reasons = []
    if tags.get("diet:gluten_free") in ("yes", "only", "limited"):
        match_reasons.append(f"diet:gluten_free={tags['diet:gluten_free']}")
    if "gluten" in tags.get("name", "").lower():
        match_reasons.append("nom")
    if "gluten" in tags.get("description", "").lower():
        match_reasons.append("description")
    if "gluten_free" in tags.get("cuisine", "").lower():
        match_reasons.append("cuisine")

    return {
        "name": tags.get("name", "Sans nom"),
        "latitude": lat,
        "longitude": lon,
        "address": address,
        "type": place_type,
        "matched_on": ", ".join(match_reasons) or "?",
        "gluten_free": tags.get("diet:gluten_free", ""),
        "website": tags.get("website", ""),
        "phone": tags.get("phone", ""),
        "source": "OpenStreetMap",
    }


def reverse_geocode(lat: float, lon: float) -> str:
    if lat is None or lon is None:
        return ""
    params = {"lat": lat, "lon": lon, "format": "json", "zoom": 18}
    try:
        r = requests.get(f"{NOMINATIM_URL}/reverse", params=params,
                         headers={"User-Agent": USER_AGENT}, timeout=10)
        r.raise_for_status()
        return r.json().get("display_name", "")
    except Exception:
        return ""


def deduplicate(places: List[Dict], tolerance: float = 0.0003) -> List[Dict]:
    unique = []
    for p in places:
        is_dup = False
        for u in unique:
            same_name = (p["name"].lower().strip() == u["name"].lower().strip()
                         and p["name"] != "Sans nom")
            close = False
            if p["latitude"] and u["latitude"]:
                close = (abs(p["latitude"] - u["latitude"]) < tolerance
                         and abs(p["longitude"] - u["longitude"]) < tolerance)
            if same_name or close:
                is_dup = True
                # Fusionne les raisons de match
                u_reasons = set(u["matched_on"].split(", "))
                u_reasons.update(p["matched_on"].split(", "))
                u["matched_on"] = ", ".join(sorted(r for r in u_reasons if r))
                break
        if not is_dup:
            unique.append(p)
    return unique


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("city", help="Nom de la ville")
    parser.add_argument("-o", "--output", default=None)
    parser.add_argument("--bbox", action="store_true",
                        help="Utiliser une bounding box élargie (couvre la "
                             "métropole, pas juste la commune)")
    parser.add_argument("--reverse-geocode", action="store_true")
    args = parser.parse_args()

    output_file = (args.output
                   or f"{args.city.lower().replace(' ', '_')}_sans_gluten_GM.csv")

    # Détection automatique du bbox si demandé
    bbox = None
    if args.bbox:
        bbox = KNOWN_BBOXES.get(args.city.lower())
        if bbox:
            print(f"📦 Bounding box élargie : {bbox}")
        else:
            print(f"⚠ Pas de bbox prédéfinie pour {args.city}, "
                  "utilisation de la zone administrative.")

    print(f"\n🔍 Recherche des lieux sans gluten à {args.city}")
    print("   (tags : diet:gluten_free, name~gluten, description~gluten, "
          "cuisine~gluten_free)")
    print("[1/2] Interrogation d'OpenStreetMap")

    elements = query_overpass(args.city, bbox)

    if not elements:
        print("\n  ✗ Toutes les requêtes Overpass ont échoué. "
              "Voir le diagnostic précédent.")
        return

    places = [extract_osm_info(e) for e in elements]
    places = [p for p in places if p["latitude"] and p["longitude"]]
    before = len(places)
    places = deduplicate(places)
    print(f"\n  ✓ {len(places)} lieux uniques "
          f"({before} avant déduplication)")

    # Stats par tag matché
    from collections import Counter
    reasons = Counter()
    for p in places:
        for r in p["matched_on"].split(", "):
            reasons[r] += 1
    print("\n  Répartition des matchs :")
    for reason, count in reasons.most_common():
        print(f"    • {reason}: {count}")

    if args.reverse_geocode and places:
        missing = [p for p in places if not p["address"]]
        if missing:
            print(f"\n[2/2] Reverse geocoding de {len(missing)} adresses "
                  f"manquantes (1 req/sec)...")
            for i, p in enumerate(missing, 1):
                p["address"] = reverse_geocode(p["latitude"], p["longitude"])
                print(f"  [{i}/{len(missing)}] {p['name']}")
                time.sleep(1.1)
        else:
            print("\n[2/2] Toutes les adresses sont déjà renseignées ✓")
    else:
        print("\n[2/2] Reverse geocoding ignoré")

    fieldnames = ["name", "latitude", "longitude", "address", "type",
                  "matched_on", "gluten_free", "source", "website", "phone"]
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(places)

    print(f"\n✅ {len(places)} lieux sauvegardés dans : {output_file}\n")


if __name__ == "__main__":
    main()