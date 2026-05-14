#!/usr/bin/env python3
"""
Google Maps Scraper - Supermarchés de Marseille (v4)
-----------------------------------------------------
v4 abandonne le "clic + écoute" qui causait des désynchronisations entre
les différents champs d'une même ligne. Nouvelle stratégie :

  ÉTAPE 1 : on scrolle le panneau de résultats et on collecte les `href`
            de toutes les cartes (chaque href contient déjà l'URL canonique
            du lieu : nom, place_id, coords).
  ÉTAPE 2 : pour chaque href, on fait page.goto() : navigation atomique,
            le panneau qui se charge correspond forcément à l'URL.

Plus lent que la v3 (chaque lieu = une navigation complète), mais TOUS
les champs d'une ligne sont forcément du même lieu.

Installation :
    pip install playwright
    playwright install chromium

Usage :
    python gmaps_supermarches_marseille_v4.py
    python gmaps_supermarches_marseille_v4.py --max 20
    python gmaps_supermarches_marseille_v4.py --headless
"""

import argparse
import csv
import re
import time
import unicodedata
from urllib.parse import quote

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

MARSEILLE_LAT = 43.2965
MARSEILLE_LON = 5.3698

EXCLUDE_CATEGORIES = [
    "restaurant", "fast-food", "boulangerie", "boucherie",
    "pharmacie", "tabac", "fleuriste", "coiffeur",
]


def normalize(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9 ]+", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


# ============================== UI helpers ===================================
def accept_cookies(page):
    for text in ["Tout accepter", "Accept all", "J'accepte"]:
        try:
            page.get_by_role("button", name=text).click(timeout=3000)
            print(f"  ✓ Cookies fermés ({text})")
            return
        except PWTimeout:
            continue
    print("  → Pas de bandeau cookies")


def scroll_results_panel(page, max_iterations=120, pause=1.6):
    feed = 'div[role="feed"]'
    try:
        page.wait_for_selector(feed, timeout=20000)
    except PWTimeout:
        print("  ⚠ Panneau introuvable.")
        return 0

    prev = 0
    stable = 0
    for i in range(max_iterations):
        page.evaluate(f"""
            const el = document.querySelector('{feed}');
            if (el) el.scrollBy(0, 2000);
        """)
        time.sleep(pause)

        for marker in ["Vous êtes arrivé à la fin de la liste",
                       "You've reached the end of the list"]:
            if page.locator(f'text="{marker}"').count() > 0:
                count = page.locator('a.hfpxzc').count()
                print(f"  ✓ Fin de liste ({count} résultats)")
                return count

        current = page.locator('a.hfpxzc').count()
        if current == prev:
            stable += 1
            if stable >= 4:
                print(f"  ✓ Stable après {i+1} scrolls ({current} résultats)")
                return current
        else:
            stable = 0
            if (i + 1) % 5 == 0:
                print(f"  ... scroll #{i+1} : {current} résultats")
        prev = current

    return page.locator('a.hfpxzc').count()


def collect_card_hrefs(page):
    """Récupère le href de chaque carte (URL canonique du lieu)."""
    hrefs = page.eval_on_selector_all(
        "a.hfpxzc",
        "els => els.map(e => e.href)"
    )
    # Dédup en gardant l'ordre
    seen = set()
    unique = []
    for h in hrefs:
        if h and h not in seen:
            seen.add(h)
            unique.append(h)
    return unique


# ============================== Extraction ==================================
def extract_text_safe(page, selector, timeout=2000):
    try:
        return page.locator(selector).first.inner_text(timeout=timeout).strip()
    except (PWTimeout, Exception):
        return ""


def extract_aria_safe(page, selector, timeout=2000):
    try:
        val = page.locator(selector).first.get_attribute(
            "aria-label", timeout=timeout)
        return val.strip() if val else ""
    except (PWTimeout, Exception):
        return ""


def parse_place_id(url):
    m = re.search(r"!1s(0x[0-9a-f]+:0x[0-9a-f]+)", url)
    return m.group(1) if m else None


def parse_coords_from_url(url):
    m = re.search(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", url)
    if m:
        return float(m.group(1)), float(m.group(2))
    return None, None


def extract_from_current_page(page, href):
    """Extrait tous les détails à partir d'une page chargée par page.goto().
    L'URL et le panneau sont garantis cohérents puisque c'est une navigation."""
    # Le panneau doit être chargé (h1 visible)
    try:
        page.wait_for_selector('h1.DUwDvf', timeout=10000)
    except PWTimeout:
        return None
    time.sleep(0.3)  # petit délai pour le rendu complet

    # Le href passé en goto est la source de vérité pour pid/coords
    place_id = parse_place_id(href)
    lat, lon = parse_coords_from_url(href)

    name = extract_text_safe(page, 'h1.DUwDvf') or "Sans nom"

    address = extract_aria_safe(page, 'button[data-item-id="address"]')
    address = re.sub(r"^Adresse\s*:\s*", "", address, flags=re.IGNORECASE)
    address = re.sub(r"^Address:\s*", "", address, flags=re.IGNORECASE)

    phone = extract_aria_safe(page, 'button[data-item-id^="phone:tel:"]')
    phone = re.sub(r"^Numéro de téléphone\s*:\s*", "", phone,
                   flags=re.IGNORECASE)
    phone = re.sub(r"^Phone:\s*", "", phone, flags=re.IGNORECASE)

    website = ""
    try:
        website = page.locator(
            'a[data-item-id="authority"]'
        ).first.get_attribute("href", timeout=1500) or ""
    except (PWTimeout, Exception):
        pass

    category = extract_text_safe(page, 'button[jsaction*="category"]')
    rating = extract_text_safe(page, 'div.F7nice span[aria-hidden="true"]')

    postal_code = ""
    m = re.search(r"\b(13\d{3})\b", address)
    if m:
        postal_code = m.group(1)

    return {
        "place_id": place_id or "",
        "name": name,
        "latitude": lat,
        "longitude": lon,
        "address": address.strip(),
        "postal_code": postal_code,
        "phone": phone.strip(),
        "website": website,
        "category": category,
        "rating": rating,
        "url": href,
    }


def is_real_supermarket(data, strict):
    if not strict:
        return True
    cat = (data.get("category") or "").lower()
    if not cat:
        return True
    return not any(excl in cat for excl in EXCLUDE_CATEGORIES)


# ================================== Main ====================================

def scrape(query, lat, lon, zoom, output, headless, max_results, strict,
           delay):
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

        # === ÉTAPE 1 : récupérer les URLs canoniques de toutes les cartes ===
        print("[1/4] Ouverture de Google Maps...")
        page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(2)
        accept_cookies(page)
        time.sleep(2)

        print("\n[2/4] Scroll du panneau...")
        scroll_results_panel(page)

        print("\n[3/4] Collecte des URLs des cartes...")
        hrefs = collect_card_hrefs(page)
        print(f"  ✓ {len(hrefs)} URLs uniques collectées")

        if max_results:
            hrefs = hrefs[:max_results]
            print(f"  → limitées à {len(hrefs)} (--max)")

        # === ÉTAPE 2 : navigation atomique vers chaque lieu ===
        print(f"\n[4/4] Visite de {len(hrefs)} lieux (navigation atomique)...")
        results = []
        seen_place_ids = set()
        seen_addr_name = set()
        stats = {"ok": 0, "dup": 0, "filt": 0, "failed": 0}

        for i, href in enumerate(hrefs):
            try:
                page.goto(href, wait_until="domcontentloaded", timeout=30000)
            except (PWTimeout, Exception) as e:
                stats["failed"] += 1
                print(f"  [{i+1}/{len(hrefs)}] ⚠ échec goto : {e}")
                continue

            data = extract_from_current_page(page, href)
            if not data:
                stats["failed"] += 1
                print(f"  [{i+1}/{len(hrefs)}] ⚠ panneau non chargé")
                continue

            # Dédup par place_id
            if data["place_id"] and data["place_id"] in seen_place_ids:
                stats["dup"] += 1
                print(f"  [{i+1}/{len(hrefs)}] ⚠ doublon pid : "
                      f"{data['name'][:40]}")
                continue

            # Dédup par (nom_norm, adresse_norm) pour les fiches Google
            # dupliquées avec des pid différents
            key = (normalize(data["name"]), normalize(data["address"]))
            if key[1] and key in seen_addr_name:
                stats["dup"] += 1
                print(f"  [{i+1}/{len(hrefs)}] ⚠ doublon nom+adresse : "
                      f"{data['name'][:40]}")
                continue

            if not is_real_supermarket(data, strict):
                stats["filt"] += 1
                print(f"  [{i+1}/{len(hrefs)}] ✗ filtré ({data['category']})")
                continue

            if data["place_id"]:
                seen_place_ids.add(data["place_id"])
            seen_addr_name.add(key)
            results.append(data)
            stats["ok"] += 1
            print(f"  [{i+1}/{len(hrefs)}] ✓ {data['name'][:48]}"
                  f"  [{data['postal_code']}]")

            time.sleep(delay)

        browser.close()

    fieldnames = ["place_id", "name", "latitude", "longitude", "address",
                  "postal_code", "phone", "website", "category", "rating",
                  "url"]
    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"\n✅ {stats['ok']} lieux fiables sauvegardés dans : {output}")
    print(f"   Doublons écartés : {stats['dup']}")
    print(f"   Filtrés          : {stats['filt']}")
    print(f"   Échecs           : {stats['failed']}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", default="supermarché")
    parser.add_argument("--lat", type=float, default=MARSEILLE_LAT)
    parser.add_argument("--lon", type=float, default=MARSEILLE_LON)
    parser.add_argument("--zoom", type=int, default=12)
    parser.add_argument("-o", "--output",
                        default="marseille_supermarches.csv")
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--max", type=int, default=None)
    parser.add_argument("--no-filter", action="store_true")
    parser.add_argument("--delay", type=float, default=1.2,
                        help="Pause entre chaque page.goto en secondes "
                             "(défaut 1.2). Plus = moins de risque de "
                             "captcha mais plus lent.")
    args = parser.parse_args()
    scrape(args.query, args.lat, args.lon, args.zoom,
           args.output, args.headless, args.max,
           strict=not args.no_filter, delay=args.delay)


if __name__ == "__main__":
    main()