import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, RefreshCw, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ServiceError {
  id: string;
  created_at: string;
  service_name: string;
  error_type: string;
  error_message: string;
  error_details: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
}

const ERROR_TYPE_COLORS: Record<string, string> = {
  API_RATE_LIMIT: "bg-amber-500",
  API_AUTH_ERROR: "bg-red-500",
  API_ERROR: "bg-orange-500",
  API_TIMEOUT: "bg-yellow-500",
  API_NETWORK_ERROR: "bg-red-400",
  DATABASE_ERROR: "bg-purple-500",
  CONFIG_ERROR: "bg-blue-500",
  FATAL_ERROR: "bg-red-600",
};

const ERROR_TYPE_LABELS: Record<string, string> = {
  API_RATE_LIMIT: "Limit API",
  API_AUTH_ERROR: "Błąd autoryzacji",
  API_ERROR: "Błąd API",
  API_TIMEOUT: "Timeout",
  API_NETWORK_ERROR: "Błąd sieci",
  DATABASE_ERROR: "Błąd bazy",
  CONFIG_ERROR: "Błąd konfiguracji",
  FATAL_ERROR: "Błąd krytyczny",
};

export default function Errors() {
  const [errors, setErrors] = useState<ServiceError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ServiceError | null>(null);

  const loadErrors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setErrors((data as ServiceError[]) || []);
    } catch (error) {
      console.error('Error loading errors:', error);
      toast.error("Nie udało się załadować błędów");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadErrors();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getErrorTypeBadge = (errorType: string) => {
    const color = ERROR_TYPE_COLORS[errorType] || "bg-gray-500";
    const label = ERROR_TYPE_LABELS[errorType] || errorType;
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const getErrorStats = () => {
    const total = errors.length;
    const resolved = errors.filter(e => e.resolved).length;
    const unresolved = total - resolved;
    const last24h = errors.filter(e => {
      const date = new Date(e.created_at);
      const now = new Date();
      return (now.getTime() - date.getTime()) < 24 * 60 * 60 * 1000;
    }).length;
    return { total, resolved, unresolved, last24h };
  };

  const stats = getErrorStats();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Logi błędów serwisów
            </h1>
          </div>
          <Button onClick={loadErrors} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Wszystkie błędy</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Nierozwiązane</p>
                  <p className="text-2xl font-bold text-destructive">{stats.unresolved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Rozwiązane</p>
                  <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Ostatnie 24h</p>
                  <p className="text-2xl font-bold text-amber-500">{stats.last24h}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Errors table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista błędów</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : errors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>Brak zarejestrowanych błędów</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Serwis</TableHead>
                      <TableHead>Typ błędu</TableHead>
                      <TableHead className="min-w-[300px]">Wiadomość</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Szczegóły</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(error.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{error.service_name}</Badge>
                        </TableCell>
                        <TableCell>
                          {getErrorTypeBadge(error.error_type)}
                        </TableCell>
                        <TableCell className="max-w-[400px] truncate">
                          {error.error_message}
                        </TableCell>
                        <TableCell>
                          {error.resolved ? (
                            <Badge className="bg-green-500 text-white">Rozwiązany</Badge>
                          ) : (
                            <Badge variant="destructive">Aktywny</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedError(error)}
                              >
                                Zobacz
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                  Szczegóły błędu
                                </DialogTitle>
                              </DialogHeader>
                              {selectedError && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Data</p>
                                      <p className="font-medium">{formatDate(selectedError.created_at)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Serwis</p>
                                      <p className="font-medium">{selectedError.service_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Typ błędu</p>
                                      {getErrorTypeBadge(selectedError.error_type)}
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Status</p>
                                      {selectedError.resolved ? (
                                        <Badge className="bg-green-500 text-white">Rozwiązany</Badge>
                                      ) : (
                                        <Badge variant="destructive">Aktywny</Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Wiadomość</p>
                                    <p className="bg-muted p-3 rounded-md">{selectedError.error_message}</p>
                                  </div>
                                  
                                  {selectedError.error_details && (
                                    <div>
                                      <p className="text-sm text-muted-foreground mb-1">Szczegóły (JSON)</p>
                                      <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-64">
                                        {JSON.stringify(selectedError.error_details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  {selectedError.resolved_at && (
                                    <div>
                                      <p className="text-sm text-muted-foreground">Rozwiązano</p>
                                      <p className="font-medium">{formatDate(selectedError.resolved_at)}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
