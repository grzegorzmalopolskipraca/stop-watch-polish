# SEO ulic i dróg eJedzie.pl

## Cel

Odpowiadać na lokalne zapytania takie jak „korki Borowska Wrocław”, „ruch na Hallera” czy „zdarzenie drogowe na Ślężnej”, a następnie kierować użytkownika do mapy z bieżącym ruchem.

## Katalog i strony

- Każda z 14 monitorowanych ulic ma własny adres `/ulica/{slug}/`, unikalny tytuł, opis, nagłówek i canonical.
- Katalog miasta pochodzi z oficjalnego, codziennie aktualizowanego [rejestru EMUiA Wrocławia](https://geoportal.wroclaw.pl/emuia/). Miasto udostępnia wykaz również w [zbiorze danych SIP](https://gis.um.wroc.pl/zasoby/?zasob=trasy_rowerowe) bez ograniczeń wykorzystania. Migawka w repozytorium z 2026-10-21 zawiera 2 384 drogi: ulice, aleje, ronda, mosty i pozostałe ciągi drogowe. Po odjęciu 14 już monitorowanych stron generator tworzy 2 370 stron głosowania.
- Każda droga ma unikalny adres. Dla nazw powodujących kolizję adres zawiera identyfikator EMUiA. Dotychczasowe adresy 14 monitorowanych ulic pozostają niezmienione.
- `/ulice-wroclawia/` jest responsywnym, przeszukiwalnym katalogiem z filtrami rodzaju drogi. Zawiera linki do wszystkich stron; z nich można przejść do mapy, raportów monitorowanych ulic i najbardziej głosowanych dróg.
- Strony są renderowane do HTML podczas `npm run build`, więc tytuły, opisy, nagłówki i główna treść są dostępne w pierwszej odpowiedzi serwera.
- Strona nie monitorowanej drogi jasno informuje, że nie ma jej własnych pomiarów. Pokazuje formularz głosowania, bieżący wynik, statystyki miejskie z bazy eJedzie oraz ranking głosów. Nie przypisuje ulicy raportów z innych lokalizacji.
- Statystyki pochodzą z `traffic_reports` i `incident_reports`. Funkcja `get_street_seo_stats` zwraca historię dla monitorowanej ulicy, a `get_wroclaw_seo_stats` — miejskie podsumowanie i głosy w jednym odczycie.
- Miejskie zestawienia liczą udział zapisów ze spowolnieniem według pory dnia i ulicy, zgłoszenia incydentów z ostatnich 12 miesięcy oraz głosy. Pokazują liczbę próbek i opisują ograniczony zakres monitoringu.
- Wejście na stronę nie odpytuje TomTom ani modelu AI. Dane pochodzą wyłącznie z zapisanych raportów Supabase. React Query buforuje statystyki miejskie przez 30 minut, głosy przez 5 minut.
- Wszystkie strony dróg mają `index,follow` i są dodawane do sitemap podczas builda. Każda ma odnośnik do katalogu, listę wszystkich monitorowanych ulic oraz do sześciu sąsiednich nazw z katalogu (do trzech przy krawędzi listy). Katalog zawiera bezpośrednie, crawlable linki do wszystkich stron, pogrupowane alfabetycznie.
- `robots.txt` jawnie zezwala Googlebotowi i Bingbotowi na `/ulica/` oraz `/ulice-wroclawia/`; strony konta i zaplecza pozostają zablokowane dla crawlerów.
- Sitemap i linki ułatwiają odkrycie adresów, ale nie gwarantują, że Google zaindeksuje każdą stronę. Monitoruj raporty indeksowania w Search Console i reaguj na ocenę jakości oraz realne dane z głosowań i statystyk.
- Dla głosowania publiczne RPC zwraca wyłącznie nazwy dróg i liczniki. Odczyt `street_votes.voter_ips` został cofnięty rolom `anon` i `authenticated`.

## Wdrożenie

Przed udostępnieniem nowych funkcji należy zastosować obie migracje:

- `supabase/migrations/20261022090000_add_street_seo_statistics.sql`
- `supabase/migrations/20261022120000_add_wroclaw_road_vote_seo.sql`

Drugą migrację trzeba zastosować razem z aktualizacją Edge Function `submit-street-vote`; formularz głosowania nie wysyła już listy monitorowanych ulic z przeglądarki.

Build tworzy katalog HTML i wpisy sitemap dla wszystkich 2 384 dróg oraz katalogu. Po publikacji należy zastosować migracje i opublikować Edge Function, przesłać `https://ejedzie.pl/sitemap.xml` w Google Search Console oraz sprawdzić kilka URL-i narzędziem Inspekcja adresu URL.

## Kolejne kroki SEO

1. W Search Console zapisać punkt odniesienia dla wyświetleń, kliknięć i zapytań zawierających nazwy ulic oraz korki, utrudnienia, roboty drogowe i zdarzenia.
2. Po 4–8 tygodniach porównać strony według zapytań, wyświetleń, kliknięć i głosów. Rozszerzać lokalne strony wtedy, gdy eJedzie ma wiarygodne, przypisane do tej drogi raporty.
3. Gdy ulica zostanie dodana do monitoringu, zastąpić stronę głosowania lokalnymi raportami i statystykami. Nie kopiować miejskich wartości jako danych tej ulicy.
4. Mierzyć przejścia na mapę i zgłoszone głosy zdarzeniami GA4, porównując je z ruchem organicznym.
5. Odświeżać katalog z oficjalnego rejestru: `python3 scripts/import-wroclaw-roads.py /ścieżka/do/Ulice_StanNaYYYYMMDD.xlsx`, a następnie przebudować strony.

Google zaleca treści przydatne dla ludzi oraz server-side lub static rendering dla aplikacji JavaScript. Dokumentacja: [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) i [spam policies](https://developers.google.com/search/docs/essentials/spam-policies).
