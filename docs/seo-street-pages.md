# SEO stron ulic eJedzie.pl

## Cel

Odpowiadać na lokalne zapytania takie jak „korki Borowska Wrocław”, „ruch na Hallera” czy „zdarzenie drogowe na Ślężnej”, a następnie kierować użytkownika do mapy z bieżącym ruchem.

## Jak działają strony

- Każda z 14 monitorowanych ulic ma własny adres `/ulica/{slug}/`, unikalny tytuł, opis, nagłówek i canonical.
- Podstrony są renderowane do HTML podczas `npm run build`, więc ich treść i metadane są dostępne w pierwszej odpowiedzi serwera.
- Statystyki pochodzą z `traffic_reports` i `incident_reports`. Funkcja `get_street_seo_stats` zwraca podsumowanie w jednym zapytaniu: ostatni zapis ruchu, trendy według dnia tygodnia, pory dnia, miesiąca i roku oraz zgłoszone zdarzenia.
- Wejście na podstronę nie odpytuje TomTom ani modelu AI. Odczyt ogranicza się do zapisanych danych w Supabase; zapytanie jest buforowane w przeglądarce przez 5 minut.
- Jeśli ulica nie ma żadnego zapisanego raportu, po wczytaniu danych strona dostaje `noindex`, żeby nie indeksować pustej strony.
- Przyciski u góry i na dole otwierają stronę główną z wybraną ulicą. Linki między ulicami są widoczne dla użytkowników, także na mobile.

## Wdrożenie

Przed udostępnieniem stron należy zastosować migrację `supabase/migrations/20261022090000_add_street_seo_statistics.sql`. Funkcja musi być dostępna dla ról `anon` i `authenticated`, ponieważ statystyki są publiczne.

Build tworzy katalog HTML dla każdej ulicy oraz aktualizuje wpisy ulic w `sitemap.xml`. Po publikacji należy przesłać `https://ejedzie.pl/sitemap.xml` w Google Search Console i sprawdzić kilka URL-i narzędziem Inspekcja adresu URL.

## Kolejne kroki SEO

1. W Search Console zapisać punkt odniesienia dla wyświetleń, kliknięć i zapytań zawierających nazwy monitorowanych ulic.
2. Po 4–8 tygodniach porównać strony według ulicy. Uzupełniać informacje o odcinkach lub skrzyżowaniach tylko wtedy, gdy aplikacja ma wiarygodne dane dla tych miejsc.
3. Utrzymywać indeksowalność zależną od jakości danych. Nie tworzyć podstron dla ulic ani dzielnic, dla których eJedzie nie ma użytecznych raportów.
4. Mierzyć kliknięcia z podstron do mapy zdarzeniem GA4 `street_landing_map_click` i porównywać je z ruchem organicznym.
5. Rozbudować strony na podstawie zapytań z Search Console, zamiast dopisywać powtarzalne akapity lub generować tekst tylko pod słowa kluczowe.

Google zaleca treści przydatne dla ludzi oraz server-side lub static rendering dla aplikacji JavaScript. Dokumentacja: [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) i [spam policies](https://developers.google.com/search/docs/essentials/spam-policies).
