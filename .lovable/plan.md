## Cel

Zwiększyć widoczność ejedzie.pl w Google dla zapytań mieszkańców Wrocławia o: korki, ruch drogowy, wypadki, utrudnienia, objazdy, remonty, prędkość przejazdu, prognozy ruchu — bez istotnych zmian wizualnych.

## Obecny stan (audyt)

- `index.html`: tytuł generyczny "Czy ulica stoi? - Społecznościowe raporty ruchu", brak słów "Wrocław", brak canonical, brak hreflang, OG image wskazuje na lovable.dev, autor "Lovable", brak Schema.org.
- HTML serwowany to pusty SPA shell (`<div id="root">`) — Googlebot renderuje JS, ale brak prerenderingu = wolniejsza indeksacja i słabsze sygnały treściowe.
- **Brak sitemap.xml** (404 na produkcji).
- `robots.txt` istnieje, ale nie wskazuje sitemap.
- Brak dedykowanych URL-i per ulica (wszystko w `/` jako stan klienta) → Google nie ma czego indeksować pod frazami "korki Borowska Wrocław" itp.
- Brak nagłówków `<h1>`/`<h2>` z lokalnymi frazami w statycznym HTML.
- Brak danych strukturalnych (LocalBusiness/WebSite/BreadcrumbList/FAQPage).
- Pages takie jak `/o-projekcie`, `/kontakt`, `/regulamin`, `/statystyki`, `/rss` mają tylko domyślny `<title>` z index.html.

## Zakres prac (bez zmian wizualnych)

### 1. `index.html` — meta tagi i podstawowe SEO

- Tytuł: `Korki Wrocław na żywo — eJedzie.pl | Ruch, wypadki, utrudnienia`
- Meta description (~155 zn.): społeczność, raporty na żywo, prognozy, 14 ulic, wypadki, objazdy.
- Dodać: `<link rel="canonical" href="https://ejedzie.pl/">`, `<meta name="robots" content="index,follow,max-image-preview:large">`, `<meta name="geo.region" content="PL-DS">`, `<meta name="geo.placename" content="Wrocław">`, `<meta name="geo.position">`, `<meta name="ICBM">`, `meta name="keywords"` (umiarkowanie), `lang="pl-PL"`.
- OG/Twitter: własny obrazek (użyć `/icon-512.png` lub nowy `/og-image.png` w `public/` — bez zmian UI), `og:url`, `og:locale=pl_PL`, `og:site_name=eJedzie.pl`, autor zmienić z "Lovable" na "Grzegorz Małopolski".
- JSON-LD w `<head>`:
  - `WebSite` z `SearchAction` (sitelinks searchbox).
  - `Organization` (nazwa, logo, sameAs LinkedIn, kontakt e-mail).
  - `WebApplication` (kategoria: TravelApplication, area served: Wrocław).
  - `FAQPage` z 5–8 typowymi pytaniami (np. "Jak sprawdzić korki we Wrocławiu?", "Czy aplikacja jest darmowa?", "Jakie ulice są monitorowane?").

### 2. Per-page SEO przez `react-helmet-async`

- Dodać zależność `react-helmet-async`, owinąć `App` w `HelmetProvider`.
- Utworzyć komponent `src/components/Seo.tsx` (title, description, canonical, OG, JSON-LD, noindex flag).
- Dodać unikalne tagi na: `Index`, `About`, `Contact`, `TermsAndPrivacy`, `Statystyki`, `Rss`, `Coupons`, `Push`. Trasy prywatne (`Konto`, `Auth`, `Kupon`, `Errors`, `NotFound`) → `noindex`.
- Każdy tytuł zawiera "Wrocław" + temat strony.

### 3. Indeksowalne strony per ulica (kluczowe dla long-tail)

- Dodać trasę `/ulica/:slug` (np. `/ulica/borowska`) renderowaną przez nowy `StreetPage.tsx`, który pod spodem wybiera daną ulicę i pokazuje istniejące komponenty (TrafficLine, TodayTimeline, WeeklyTimeline, PredictedTraffic, GreenWave, StreetChat) — UI taki sam jak w Index, tylko ze wstępnie wybraną ulicą.
- Per-ulica `<h1>`: "Korki na ulicy {Nazwa} we Wrocławiu — aktualny ruch i prognoza".
- Per-ulica unikalny meta title/description i JSON-LD `Place` + `BreadcrumbList`.
- W `Index.tsx` linki tekstowe (lub w sekcji "Monitorowane ulice") prowadzące do `/ulica/<slug>` — drobny dodatek pod istniejącą sekcją, niezauważalny wizualnie (lista linków w naturalnym miejscu, z istniejącym stylem Tailwind).

### 4. `sitemap.xml` i `robots.txt`

- Dodać statyczny `public/sitemap.xml` zawierający: `/`, `/o-projekcie`, `/kontakt`, `/regulamin`, `/statystyki`, `/rss`, `/coupons` oraz `/ulica/<slug>` dla każdej z 14 ulic (z `lastmod`, `changefreq=hourly` dla głównej i ulic, `priority`).
- Zaktualizować `public/robots.txt` o linię `Sitemap: https://ejedzie.pl/sitemap.xml` i `Disallow: /konto, /auth, /kupon, /push, /errors`.

### 5. Wewnętrzne linkowanie i semantyka

- W `Index.tsx` upewnić się, że jest dokładnie jeden `<h1>` z frazą "Wrocław" (jeśli aktualny nagłówek jest inny, dodać ukryty wizualnie nie będzie — zrobimy to małą zmianą tekstu w istniejącym nagłówku tak, by wyglądał naturalnie).
- Dodać atrybuty `alt` do wszystkich `<img>` (sprawdzimy i uzupełnimy frazami z lokalizacją: "Korki na ulicy X we Wrocławiu").
- Dodać `aria-label` na linkach-ikonach (poprawa a11y + SEO).
- Dodać `BreadcrumbList` JSON-LD na podstronach.

### 6. Wydajność i Core Web Vitals (sygnał rankingowy)

- `<link rel="preconnect">` do: googletagmanager, pagead2, onesignal, supabase.
- `<link rel="dns-prefetch">` do tych samych.
- Skrypty AdSense / GA / OneSignal: dodać `fetchpriority="low"` i upewnić się, że są `async`/`defer` (już są).
- Dodać `<meta name="format-detection" content="telephone=no">` — kosmetyczne.

### 7. Lokalne sygnały (Local SEO)

- JSON-LD `LocalBusiness` (typ `WebApplication` + `areaServed: { "@type":"City","name":"Wrocław" }`).
- W stopce (już istnieje sekcja kontakt) — bez zmian wizualnych — dodać mikro-dane przez `itemProp` lub JSON-LD.

### 8. Drobne porządki

- Zmienić `<meta name="author" content="Lovable">` → `Grzegorz Małopolski`.
- Zmienić `twitter:site` na właściwe konto lub usunąć.
- Poprawić aktualne błędy buildu (`MapLocationPicker.tsx` brak typów `google`, `Konto.tsx` typowanie upsert) — odblokowuje deploy.

## Pliki do zmiany / utworzenia

```text
index.html                              (meta, JSON-LD, canonical, preconnect)
public/robots.txt                       (sitemap + disallow)
public/sitemap.xml                      (NOWY)
public/og-image.png                     (opcjonalnie, NOWY — z /icon-512)
package.json                            (+ react-helmet-async)
src/main.tsx                            (HelmetProvider)
src/components/Seo.tsx                  (NOWY — reusable)
src/pages/Index.tsx                     (Seo + linki do /ulica/<slug>, h1)
src/pages/About.tsx                     (Seo)
src/pages/Contact.tsx                   (Seo)
src/pages/TermsAndPrivacy.tsx           (Seo)
src/pages/Statystyki.tsx                (Seo)
src/pages/Rss.tsx                       (Seo)
src/pages/Coupons.tsx                   (Seo)
src/pages/Push.tsx                      (Seo noindex)
src/pages/Konto.tsx                     (Seo noindex + fix typowania upsert)
src/pages/Auth.tsx                      (Seo noindex)
src/pages/NotFound.tsx                  (Seo noindex)
src/pages/StreetPage.tsx                (NOWY — /ulica/:slug)
src/components/MapLocationPicker.tsx    (fix: @types/google.maps lub deklaracja)
src/App.tsx                             (nowa trasa /ulica/:slug)
src/utils/streetSlug.ts                 (NOWY — slugify)
```

## Frazy kluczowe (dobór)

Główne: `korki Wrocław`, `ruch drogowy Wrocław`, `wypadki Wrocław`, `utrudnienia Wrocław`, `objazdy Wrocław`, `remonty dróg Wrocław`, `czy ulica stoi`.
Long-tail per ulica: `korki Borowska Wrocław`, `ruch Powstańców Śląskich`, `Grabiszyńska korek`, itd. dla wszystkich 14 ulic + warianty z "dziś", "teraz", "rano", "popołudniu".

## Czego NIE robimy

- Nie zmieniamy układu, kolorów, layoutu, komponentów UI.
- Nie wdrażamy SSR/Next.js (poza zakresem; wystarczy poprawne meta + sitemap + indeksowalne trasy renderowane klientem — Google dobrze renderuje React 18 z React Router).
- Nie ruszamy treści wymagających decyzji marketingowych (np. nowe artykuły blogowe) — można zaproponować w kolejnym kroku.

## Kolejne kroki po wdrożeniu (do ręcznego wykonania przez właściciela)

1. Google Search Console: dodać/zweryfikować właściwość `https://ejedzie.pl`, zgłosić `sitemap.xml`, poprosić o indeksację głównych URL.
2. Bing Webmaster Tools: to samo.
3. Google Business Profile: opcjonalnie założyć profil "eJedzie.pl — informacje o ruchu, Wrocław".
4. Po 2–4 tygodniach przegląd "Wyników" w GSC i iteracja treści.

Po Twojej akceptacji przejdę do trybu domyślnego i zaimplementuję wszystkie powyższe punkty.
