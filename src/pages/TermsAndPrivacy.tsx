import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsAndPrivacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Button>
        </Link>

        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-8">Regulamin i polityka prywatności</h1>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Postanowienia ogólne</h2>
            <p className="text-lg leading-relaxed mb-4">
              Niniejszy regulamin określa zasady korzystania z portalu eJedzie.pl (zwanego dalej "Portalem").
            </p>
            <p className="text-lg leading-relaxed mb-4">
              Korzystając z Portalu, użytkownik akceptuje postanowienia niniejszego regulaminu.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Zasady korzystania z Portalu</h2>
            <p className="text-lg leading-relaxed mb-4">
              Portal służy do wymiany informacji o aktualnym stanie ruchu drogowego na wybranych ulicach.
            </p>
            <p className="text-lg leading-relaxed mb-4">
              Użytkownicy zobowiązani są do przekazywania prawdziwych informacji o stanie ruchu.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Polityka prywatności</h2>
            <h3 className="text-xl font-semibold mb-3">3.1. Zbierane dane</h3>
            <p className="text-lg leading-relaxed mb-4">
              Portal zbiera następujące dane:
            </p>
            <ul className="list-disc pl-6 mb-4 text-lg leading-relaxed">
              <li>Informacje o ruchu drogowym przekazywane przez użytkowników</li>
              <li>Dane dotyczące odwiedzin strony (pliki cookies)</li>
              <li>Adresy IP w celach statystycznych i bezpieczeństwa</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">3.2. Cel zbierania danych</h3>
            <p className="text-lg leading-relaxed mb-4">
              Dane zbierane są w celu:
            </p>
            <ul className="list-disc pl-6 mb-4 text-lg leading-relaxed">
              <li>Świadczenia usług informacyjnych o ruchu drogowym</li>
              <li>Prowadzenia statystyk</li>
              <li>Zapewnienia bezpieczeństwa Portalu</li>
              <li>Wyświetlania reklam Google AdSense</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">3.3. Google AdSense</h3>
            <p className="text-lg leading-relaxed mb-4">
              Portal wykorzystuje Google AdSense do wyświetlania reklam. Google może używać plików cookies 
              do personalizacji reklam na podstawie wcześniejszych odwiedzin użytkownika.
            </p>
            <p className="text-lg leading-relaxed mb-4">
              Użytkownicy mogą zarządzać preferencjami dotyczącymi reklam poprzez 
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"> 
                {" "}Ustawienia reklam Google
              </a>.
            </p>

            <h3 className="text-xl font-semibold mb-3">3.4. Pliki cookies</h3>
            <p className="text-lg leading-relaxed mb-4">
              Portal wykorzystuje pliki cookies w celu:
            </p>
            <ul className="list-disc pl-6 mb-4 text-lg leading-relaxed">
              <li>Zapamiętywania preferencji użytkownika</li>
              <li>Prowadzenia statystyk odwiedzin</li>
              <li>Wyświetlania reklam Google AdSense</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">3.5. Prawa użytkownika</h3>
            <p className="text-lg leading-relaxed mb-4">
              Użytkownik ma prawo do:
            </p>
            <ul className="list-disc pl-6 mb-4 text-lg leading-relaxed">
              <li>Dostępu do swoich danych</li>
              <li>Usunięcia danych</li>
              <li>Sprzeciwu wobec przetwarzania danych</li>
              <li>Przenoszenia danych</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Wyłączenie odpowiedzialności</h2>
            <p className="text-lg leading-relaxed mb-4">
              Informacje przedstawione w Portalu mają charakter pomocniczy i nie stanowią oficjalnych 
              informacji o ruchu drogowym.
            </p>
            <p className="text-lg leading-relaxed mb-4">
              Administrator Portalu nie ponosi odpowiedzialności za decyzje podjęte na podstawie 
              informacji dostępnych w Portalu.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Zmiany regulaminu</h2>
            <p className="text-lg leading-relaxed mb-4">
              Administrator zastrzega sobie prawo do wprowadzania zmian w regulaminie. 
              Zmiany wchodzą w życie z chwilą ich publikacji w Portalu.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Kontakt</h2>
            <p className="text-lg leading-relaxed mb-4">
              W sprawach dotyczących regulaminu i polityki prywatności prosimy o kontakt poprzez 
              stronę <Link to="/kontakt" className="text-primary hover:underline">Kontakt</Link>.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
};

export default TermsAndPrivacy;
