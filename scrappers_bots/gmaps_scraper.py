#!/usr/bin/env python3
"""
Google Maps Scraper - Lieux sans gluten
----------------------------------------
Scrape le panneau de résultats de Google Maps pour récupérer tous les lieux
correspondant à une recherche dans une zone géographique donnée.

Fonctionnement :
  1. Ouvre Google Maps avec une URL de recherche centrée sur Marseille
  2. Scrolle le panneau latéral jusqu'à charger TOUS les résultats
  3. Clique sur chaque résultat pour extraire nom / coords GPS / adresse / téléphone
  4. Sauvegarde dans un CSV

Installation :
    pip install playwright
    playwright install chromium

Usage :
    python gmaps_scraper.py
    python gmaps_scraper.py --query "sans gluten" --zoom 12 --headless
    python gmaps_scraper.py --lat 43.2965 --lon 5.3698 --zoom 11 -o marseille.csv
"""

import argparse
import csv
import re
import time
from urllib.parse import quote

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

# Coordonnées par défaut : centre de Marseille
MARSEILLE_LAT = 43.2965
MARSEILLE_LON = 5.3698

# ================================== Helpers ==================================
def accept_cookies(page):
    """Ferme le bandeau de cookies Google s'il apparaît."""
    for text in ["Tout accepter", "Accept all", "J'accepte", "Accepter tout"]:
        try:
            page.get_by_role("button", name=text).click(timeout=3000)
            print(f"  ✓ Bandeau cookies fermé ({text})")
            return
        except PWTimeout:
            continue
    print("  → Pas de bandeau cookies détecté")


def scroll_results_panel(page, max_iterations=80, pause=1.6):
    """
    Scrolle le panneau latéral des résultats jusqu'à voir le message
    'Vous êtes arrivé à la fin de la liste', ou jusqu'à ce que plus rien
    ne change après plusieurs essais.
    """
    feed = 'div[role="feed"]'
    try:
        page.wait_for_selector(feed, timeout=20000)
    except PWTimeout:
        print("  ⚠ Panneau de résultats introuvable.")
        return 0

    prev_count = 0
    stable_iterations = 0

    for i in range(max_iterations):
        # Scroll le panneau (pas la page entière)
        page.evaluate(f"""
            const el = document.querySelector('{feed}');
            if (el) el.scrollBy(0, 2000);
        """)
        time.sleep(pause)

        # Détecte la fin de la liste
        end_markers = [
            "Vous êtes arrivé à la fin de la liste",
            "You've reached the end of the list",
        ]
        for marker in end_markers:
            if page.locator(f'text="{marker}"').count() > 0:
                count = page.locator('a.hfpxzc').count()
                print(f"  ✓ Fin de liste atteinte ({count} résultats, "
                      f"scroll #{i+1})")
                return count

        # Détecte la stagnation (plus de nouveaux résultats)
        current_count = page.locator('a.hfpxzc').count()
        if current_count == prev_count:
            stable_iterations += 1
            if stable_iterations >= 4:
                print(f"  ✓ Plus de nouveaux résultats après {i+1} scrolls "
                      f"({current_count} résultats)")
                return current_count
        else:
            stable_iterations = 0
            if (i + 1) % 5 == 0:
                print(f"  ... scroll #{i+1} : {current_count} résultats chargés")
        prev_count = current_count

    return page.locator('a.hfpxzc').count()


def extract_text_safe(page, selector, timeout=2000):
    """Récupère le texte d'un sélecteur sans planter s'il n'existe pas."""
    try:
        return page.locator(selector).first.inner_text(timeout=timeout).strip()
    except (PWTimeout, Exception):
        return ""


def extract_aria_safe(page, selector, timeout=2000):
    """Récupère l'aria-label d'un sélecteur."""
    try:
        val = page.locator(selector).first.get_attribute(
            "aria-label", timeout=timeout)
        return val.strip() if val else ""
    except (PWTimeout, Exception):
        return ""


def parse_coords_from_url(url):
    """Extrait lat/lon depuis l'URL Google Maps."""
    # Cherche le pattern !3d{lat}!4d{lon} (le plus fiable)
    m = re.search(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", url)
    if m:
        return float(m.group(1)), float(m.group(2))
    # Fallback : /@lat,lon,zoom
    m = re.search(r"/@(-?\d+\.\d+),(-?\d+\.\d+)", url)
    if m:
        return float(m.group(1)), float(m.group(2))
    return None, None


def extract_place_details(page, card_locator):
    """Clique sur une carte et extrait toutes les infos du panneau de détail."""
    try:
        name = card_locator.get_attribute("aria-label") or ""
        card_locator.click(timeout=5000)
        # Attendre que le panneau de détail apparaisse
        page.wait_for_selector('button[data-item-id="address"], h1.DUwDvf',
                                timeout=6000)
        time.sleep(0.8)  # Laisser l'URL se mettre à jour
    except PWTimeout:
        return None
    except Exception:
        return None

    url = page.url
    lat, lon = parse_coords_from_url(url)

    # Nom : si on n'a pas eu l'aria-label, tenter le h1
    if not name:
        name = extract_text_safe(page, 'h1.DUwDvf') or "Sans nom"

    # Adresse : bouton avec data-item-id="address"
    address = extract_aria_safe(page, 'button[data-item-id="address"]')
    address = re.sub(r"^Adresse\s*:\s*", "", address, flags=re.IGNORECASE)
    address = re.sub(r"^Address:\s*", "", address, flags=re.IGNORECASE)

    # Téléphone
    phone = extract_aria_safe(page, 'button[data-item-id^="phone:tel:"]')
    phone = re.sub(r"^Numéro de téléphone\s*:\s*", "", phone,
                    flags=re.IGNORECASE)
    phone = re.sub(r"^Phone:\s*", "", phone, flags=re.IGNORECASE)

    # Site web
    website = ""
    try:
        website = page.locator('a[data-item-id="authority"]').first.get_attribute(
            "href", timeout=1500) or ""
    except (PWTimeout, Exception):
        pass

    # Catégorie (type de lieu, ex: "Restaurant", "Boulangerie")
    category = extract_text_safe(page, 'button[jsaction*="category"]')

    # Note moyenne
    rating = extract_text_safe(page, 'div.F7nice span[aria-hidden="true"]')

    return {
        "name": name.strip(),
        "latitude": lat,
        "longitude": lon,
        "address": address.strip(),
        "phone": phone.strip(),
        "website": website,
        "category": category,
        "rating": rating,
        "url": url,
    }


# ================================== Main ==================================

def scrape(query, lat, lon, zoom, output, headless, max_results):
    search_url = (f"https://www.google.com/maps/search/{quote(query)}/"
                  f"@{lat},{lon},{zoom}z?hl=fr")
    print(f"\n🌐 URL : {search_url}\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless, slow_mo=50)
        context = browser.new_context(
            locale="fr-FR",
            viewport={"width": 1400, "height": 900},
            user_agent=("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"),
        )
        page = context.new_page()

        print("[1/3] Ouverture de Google Maps...")
        page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(2)
        accept_cookies(page)
        time.sleep(2)

        print("\n[2/3] Scroll du panneau de résultats (peut prendre 1-2 min)...")
        total = scroll_results_panel(page)
        if max_results:
            total = min(total, max_results)
        print(f"\n📊 {total} résultats à extraire\n")

        print("[3/3] Extraction des détails de chaque lieu...")
        results = []
        seen_urls = set()

        for i in range(total):
            cards = page.locator('a.hfpxzc')
            # Re-scroll vers la carte si besoin
            try:
                card = cards.nth(i)
                card.scroll_into_view_if_needed(timeout=3000)
            except Exception:
                continue

            data = extract_place_details(page, card)
            if data and data["url"] not in seen_urls:
                seen_urls.add(data["url"])
                results.append(data)
                print(f"  [{i+1}/{total}] ✓ {data['name'][:55]}"
                      f"  ({data['latitude']}, {data['longitude']})")
            else:
                print(f"  [{i+1}/{total}] ⚠ doublon ou échec")
            time.sleep(0.4)

        browser.close()

    # --- Écriture CSV ---
    fieldnames = ["name", "latitude", "longitude", "address",
                  "phone", "website", "category", "rating", "url"]
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"\n✅ {len(results)} lieux sauvegardés dans : {output}")


def main():
    parser = argparse.ArgumentParser(
        description="Scrape Google Maps pour récupérer des lieux."
    )
    parser.add_argument("--query", default="sans gluten",
                        help="Recherche (défaut: 'sans gluten')")
    parser.add_argument("--lat", type=float, default=MARSEILLE_LAT,
                        help="Latitude du centre (défaut: Marseille)")
    parser.add_argument("--lon", type=float, default=MARSEILLE_LON,
                        help="Longitude du centre (défaut: Marseille)")
    parser.add_argument("--zoom", type=int, default=12,
                        help="Niveau de zoom (10=très dézoomé, 15=quartier). "
                             "12 = couvre Marseille entière")
    parser.add_argument("-o", "--output", default="marseille_sans_gluten_OSM.csv",
                        help="Fichier CSV de sortie")
    parser.add_argument("--headless", action="store_true",
                        help="Mode invisible (sinon le navigateur s'affiche)")
    parser.add_argument("--max", type=int, default=None,
                        help="Limite le nombre de résultats (pour tester)")
    args = parser.parse_args()

    scrape(args.query, args.lat, args.lon, args.zoom,
           args.output, args.headless, args.max)


if __name__ == "__main__":
    main()
