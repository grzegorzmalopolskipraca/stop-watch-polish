import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleViewer } from "@/components/ConsoleViewer";

const Push = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [externalId, setExternalId] = useState<string | null>(null);
  const [pushMessage, setPushMessage] = useState("To jest testowe powiadomienie push!");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    console.log("🚀 [COMPONENT] Component mounted - Initializing OneSignal");
    initializeOneSignal();
  }, []);

  const initializeOneSignal = async () => {
    try {
      console.log("📱 [COMPONENT] Starting OneSignal component initialization...");
      
      // Ensure window.OneSignalDeferred exists
      if (!window.OneSignalDeferred) {
        console.error("❌ [COMPONENT] OneSignalDeferred not found on window");
        throw new Error("OneSignal SDK not loaded");
      }

      console.log("✅ [COMPONENT] OneSignalDeferred found, pushing callback...");
      
      // Wait for OneSignal to be available
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        console.log("✅ [COMPONENT] OneSignal callback executed");
        console.log("[COMPONENT] OneSignal object:", OneSignal);
        
        try {
          // Check if push is supported
          const isPushSupported = OneSignal.Notifications.isPushSupported();
          console.log("[COMPONENT] Push notifications supported:", isPushSupported);

          if (!isPushSupported) {
            console.warn("⚠️ [COMPONENT] Push notifications not supported on this browser");
            toast.error("Powiadomienia push nie są wspierane w tej przeglądarce");
            return;
          }

          // Get current permission
          const permission = OneSignal.Notifications.permissionNative;
          console.log("🔔 [COMPONENT] Current permission:", permission);

          // Get subscription status
          const optedIn = OneSignal.User.PushSubscription.optedIn;
          console.log("✅ [COMPONENT] User opted in:", optedIn);
          setIsSubscribed(optedIn);

          // Get user ID and token if available
          const id = OneSignal.User.PushSubscription.id;
          const token = OneSignal.User.PushSubscription.token;
          const extId = await OneSignal.User.getExternalId();

          console.log("🆔 [COMPONENT] Subscription Details:", {
            id,
            token,
            externalId: extId,
            optedIn
          });

          setUserId(id);
          setPushToken(token);
          setExternalId(extId);

          // Listen for subscription changes
          OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
            console.log("🔄 [COMPONENT] Subscription changed:", {
              previous: event.previous,
              current: event.current
            });
            setIsSubscribed(event.current.optedIn);
            setUserId(event.current.id);
            setPushToken(event.current.token);
          });

          console.log("✅ [COMPONENT] Component initialization complete");
          setIsInitialized(true);
        } catch (innerError) {
          console.error("❌ [COMPONENT] Error in OneSignal callback:", innerError);
          throw innerError;
        }
      });
    } catch (error) {
      console.error("❌ [COMPONENT] OneSignal initialization error:", error);
      toast.error(`Błąd inicjalizacji: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleRegister = async () => {
    try {
      console.log("🔔 [REGISTER] Starting registration...");
      
      if (!window.OneSignalDeferred) {
        throw new Error("OneSignal SDK not loaded");
      }

      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          console.log("[REGISTER] Requesting notification permission...");
          const permission = await OneSignal.Notifications.requestPermission();
          console.log("[REGISTER] Permission result:", permission);

          console.log("[REGISTER] Opting in to push notifications...");
          await OneSignal.User.PushSubscription.optIn();

          // Wait a bit for the subscription to be fully processed
          await new Promise(resolve => setTimeout(resolve, 1000));

          const newId = OneSignal.User.PushSubscription.id;
          const newToken = OneSignal.User.PushSubscription.token;

          console.log("[REGISTER] Registration details:", {
            id: newId,
            token: newToken,
            userAgent: navigator.userAgent,
            platform: navigator.platform
          });

          // Add a tag to help identify test device subscriptions
          await OneSignal.User.addTag("test_device", "true");
          await OneSignal.User.addTag("registered_from", window.location.pathname);
          console.log("[REGISTER] Tags added for identification");

          console.log("✅ [REGISTER] Successfully registered for push notifications");

          toast.success("Powiadomienia push włączone!");
        } catch (innerError) {
          console.error("❌ [REGISTER] Inner registration error:", innerError);
          throw innerError;
        }
      });
    } catch (error) {
      console.error("❌ [REGISTER] Registration error:", error);
      toast.error(`Błąd rejestracji: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleUnregister = async () => {
    try {
      console.log("🔕 [UNREGISTER] Starting unregistration...");
      
      if (!window.OneSignalDeferred) {
        throw new Error("OneSignal SDK not loaded");
      }

      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          console.log("[UNREGISTER] Opting out of push notifications...");
          await OneSignal.User.PushSubscription.optOut();
          
          console.log("✅ [UNREGISTER] Successfully unregistered from push notifications");
          
          toast.success("Powiadomienia push wyłączone");
        } catch (innerError) {
          console.error("❌ [UNREGISTER] Inner unregistration error:", innerError);
          throw innerError;
        }
      });
    } catch (error) {
      console.error("❌ [UNREGISTER] Unregistration error:", error);
      toast.error(`Błąd wyrejestrowania: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
    }
  };

  const handleCheckStatus = async () => {
    try {
      console.log("🔍 [CHECK-STATUS] Checking subscription status...");

      if (!window.OneSignalDeferred) {
        throw new Error("OneSignal SDK not loaded");
      }

      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          const isPushSupported = OneSignal.Notifications.isPushSupported();
          const permission = OneSignal.Notifications.permissionNative;
          const optedIn = OneSignal.User.PushSubscription.optedIn;
          const id = OneSignal.User.PushSubscription.id;
          const token = OneSignal.User.PushSubscription.token;
          const tags = await OneSignal.User.getTags();

          const status = {
            isPushSupported,
            permission,
            optedIn,
            id,
            token: token ? token.substring(0, 50) + '...' : null,
            tags,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            url: window.location.href
          };

          console.log("📊 [CHECK-STATUS] Full Status:", status);

          toast.success(
            `Status: ${optedIn ? 'Subscribed ✅' : 'Not Subscribed ❌'}\nID: ${id || 'None'}\nCheck console for details`,
            { duration: 5000 }
          );
        } catch (innerError) {
          console.error("❌ [CHECK-STATUS] Inner error:", innerError);
          throw innerError;
        }
      });
    } catch (error) {
      console.error("❌ [CHECK-STATUS] Error:", error);
      toast.error("Nie udało się sprawdzić statusu");
    }
  };

  const handleSendPush = async () => {
    if (!pushMessage.trim()) {
      toast.error("Wprowadź wiadomość do wysłania");
      return;
    }

    if (!isSubscribed) {
      toast.error("Najpierw włącz powiadomienia push");
      return;
    }

    setIsSending(true);
    console.log("📤 [SEND-PUSH] Sending push notification...");
    console.log("[SEND-PUSH] Message:", pushMessage);

    try {
      const { data, error } = await supabase.functions.invoke("send-push-notifications", {
        body: {
          street: "test_device",
          message: pushMessage,
        },
      });

      console.log("[SEND-PUSH] Response:", { data, error });

      if (error) {
        console.error("❌ [SEND-PUSH] Error:", error);
        toast.error("Nie udało się wysłać powiadomienia");
      } else {
        console.log("✅ [SEND-PUSH] Push notification sent successfully");
        toast.success("Powiadomienie wysłane!");
      }
    } catch (error) {
      console.error("❌ [SEND-PUSH] Exception:", error);
      toast.error("Wystąpił błąd podczas wysyłania");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Test Push Notifications
          </h1>
          <p className="text-muted-foreground">
            Testuj powiadomienia push OneSignal
          </p>
        </header>

        <div className="space-y-4 p-6 bg-card rounded-lg border">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Status</h2>
            <div className="flex items-center gap-2">
              {isSubscribed ? (
                <>
                  <Bell className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-medium">Powiadomienia włączone</span>
                </>
              ) : (
                <>
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Powiadomienia wyłączone</span>
                </>
              )}
            </div>
            {userId && (
              <div className="text-xs text-muted-foreground space-y-1 mt-2">
                <p className="font-mono break-all">
                  <strong>User ID:</strong> {userId}
                </p>
                {pushToken && (
                  <p className="font-mono break-all">
                    <strong>Token:</strong> {pushToken.substring(0, 50)}...
                  </p>
                )}
                {externalId && (
                  <p className="font-mono break-all">
                    <strong>External ID:</strong> {externalId}
                  </p>
                )}
                <p className="text-xs text-amber-600 mt-1">
                  💡 Tip: Na Androidzie subskrypcja może pojawić się jako "Linux armv8l" w dashboardzie OneSignal
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {isSubscribed ? (
              <Button
                onClick={handleUnregister}
                variant="outline"
                className="w-full"
              >
                <BellOff className="w-4 h-4 mr-2" />
                Wyłącz powiadomienia
              </Button>
            ) : (
              <Button
                onClick={handleRegister}
                className="w-full"
                disabled={!isInitialized}
              >
                <Bell className="w-4 h-4 mr-2" />
                Włącz powiadomienia
              </Button>
            )}

            {isInitialized && (
              <Button
                onClick={handleCheckStatus}
                variant="secondary"
                className="w-full"
              >
                🔍 Sprawdź pełny status
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 p-6 bg-card rounded-lg border">
          <h2 className="text-lg font-semibold">Wyślij testowe powiadomienie</h2>
          
          <div className="space-y-2">
            <Label htmlFor="pushMessage">Wiadomość</Label>
            <Input
              id="pushMessage"
              value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
              placeholder="Wprowadź wiadomość..."
              disabled={!isSubscribed}
            />
          </div>

          <Button
            onClick={handleSendPush}
            disabled={!isSubscribed || isSending || !pushMessage.trim()}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Wysyłanie..." : "Wyślij powiadomienie"}
          </Button>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-3">
          <h2 className="font-semibold text-foreground">Instrukcja:</h2>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Kliknij "Włącz powiadomienia" i zezwól na powiadomienia w przeglądarce</li>
            <li>Sprawdź User ID i token (pojawi się po subskrypcji)</li>
            <li>Wprowadź wiadomość testową</li>
            <li>Kliknij "Wyślij powiadomienie"</li>
            <li>Powiadomienie powinno pojawić się nawet gdy strona jest otwarta</li>
          </ol>

          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
              🔧 Naprawione problemy:
            </h3>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li><strong>Android Chrome:</strong> Subskrypcje teraz działają. W dashboardzie OneSignal mogą się wyświetlać jako "Linux armv8l"</li>
              <li><strong>Wyświetlanie powiadomień:</strong> Dodano obsługę foreground notifications - powiadomienia będą się wyświetlać nawet gdy strona jest otwarta</li>
              <li><strong>Service Worker:</strong> Dodano handlery dla lepszej obsługi kliknięć w powiadomienia</li>
              <li><strong>Debugging:</strong> Dodano tagi "test_device" aby łatwiej znaleźć subskrypcje w dashboardzie</li>
            </ul>
          </div>

          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-100 mb-2">
              💡 Wskazówki debugowania:
            </h3>
            <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
              <li>Użyj "Sprawdź pełny status" aby zobaczyć wszystkie szczegóły subskrypcji</li>
              <li>Sprawdź console przeglądarki (F12) aby zobaczyć dokładne logi</li>
              <li>W OneSignal dashboard filtruj po tagu "test_device" = "true"</li>
              <li>Na Androidzie upewnij się że Chrome ma włączone powiadomienia w ustawieniach systemu</li>
            </ul>
          </div>
        </div>

        {/* Console Viewer */}
        <div className="mt-6">
          <ConsoleViewer />
        </div>

        <footer className="flex flex-wrap justify-center gap-4 mt-8 pt-6 border-t border-border text-sm">
          <Link to="/" className="text-primary hover:underline">
            Strona główna
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/statystyki" className="text-primary hover:underline">
            Statystyki
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/rss" className="text-primary hover:underline">
            RSS
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Push;
