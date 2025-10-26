import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const About = () => {
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
          <h1 className="text-4xl font-bold mb-8">O projekcie</h1>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Misja projektu</h2>
            <p className="text-lg leading-relaxed mb-4">
              Misją portalu jest:
            </p>
            <p className="text-lg leading-relaxed mb-6">
              <strong>Pomoc sąsiedzka w celu zmniejszania korków w najbardziej zakorkowanych ulicach w miastach.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Jak to działa?</h2>
            <p className="text-lg leading-relaxed mb-4">
              Misja ta realizowana jest przez portal, który ma na celu informowanie się wzajemnie kiedy są korki 
              a kiedy jest Zielona fala i można jechać.
            </p>
            <p className="text-lg leading-relaxed mb-6">
              Jeśli więcej ludzi będzie jeździć w godzinach, kiedy jest mniejszy ruch na ulicach, wtedy stracą 
              mniej czasu, spalą mniej paliwa i odciążą korki, przez co ich sąsiedzi też na tym skorzystają.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Korzyści</h2>
            <div className="space-y-4 text-lg leading-relaxed">
              <p>
                Dzięki temu, oszczędzimy trochę czasu, który tracimy w korkach i będziemy mogli go spędzić 
                z rodziną lub tworzyć coś kreatywnego w pracy.
              </p>
              <p>
                Będziemy bardziej ekologiczni, ponieważ mniej spalin trafi do środowiska.
              </p>
              <p>
                My i nasi sąsiedzi będziemy bardziej szczęśliwi, mniej zestresowani, a tym samym milsi dla innych.
              </p>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
};

export default About;
