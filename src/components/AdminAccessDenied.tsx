import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminAccessDeniedProps {
  onSignOut: () => void;
  userEmail?: string;
}

export function AdminAccessDenied({ onSignOut, userEmail }: AdminAccessDeniedProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldX className="w-16 h-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Brak dostępu</CardTitle>
          <CardDescription>
            Twoje konto ({userEmail}) nie ma uprawnień administratora.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Aby uzyskać dostęp do tej strony, skontaktuj się z administratorem systemu.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={onSignOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Wyloguj się
            </Button>
            <Link to="/" className="w-full">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Powrót do strony głównej
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
