import { Link } from "react-router-dom";
import { ArrowLeft, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót
          </Button>
        </Link>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">Kontakt</h1>
            <p className="text-lg text-muted-foreground">
              Masz pytania lub sugestie? Skontaktuj się z autorem projektu.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Autor projektu</CardTitle>
              <CardDescription>Twórca portalu eJedzie.pl</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold mb-2">Grzegorz Małopolski</h3>
                <p className="text-muted-foreground">
                  Pasjonat technologii i rozwiązań, które pomagają ludziom w codziennym życiu.
                </p>
              </div>

              <div className="space-y-3">
                <a
                  href="mailto:grzegorzmalopolskipraca@gmail.com"
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Mail className="h-6 w-6 text-primary" />
                  <div>
                    <div className="font-medium">Email</div>
                    <div className="text-sm text-muted-foreground">
                      Ulepszenia i sugestie piszcie na: grzegorzmalopolskipraca@gmail.com
                    </div>
                  </div>
                </a>

                <a
                  href="https://pl.linkedin.com/in/grzegorz-ma%C5%82opolski-7aa25016b"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Linkedin className="h-6 w-6 text-primary" />
                  <div>
                    <div className="font-medium">LinkedIn</div>
                    <div className="text-sm text-muted-foreground">
                      Grzegorz Małopolski
                    </div>
                  </div>
                </a>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Dziękujemy za korzystanie z portalu eJedzie.pl i pomoc w tworzeniu lepszej społeczności kierowców!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Contact;
