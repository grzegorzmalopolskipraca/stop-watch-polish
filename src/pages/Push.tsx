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

          // Try to get external ID, but don't fail if it doesn't exist
          let extId = null;
          try {
            if (typeof OneSignal.User.getExternalId === 'function') {
              extId = await OneSignal.User.getExternalId();
            }
          } catch (extIdError) {
            console.warn("⚠️ [COMPONENT] Could not get external ID:", extIdError);
          }

          console.log("🆔 [COMPONENT] Subscription Details:", {
            id: id || null,
            token: token ? token.substring(0, 50) + '...' : null,
            externalId: extId || null,
            optedIn
          });

          setUserId(id || null);
          setPushToken(token || null);
          setExternalId(extId || null);

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
        } catch (innerError) {
          console.error("❌ [COMPONENT] Error in OneSignal callback:", innerError);
          // Don't throw - we still want to mark as initialized if OneSignal is available
          toast.warning("OneSignal załadowany z ostrzeżeniami. Sprawdź console.");
        } finally {
          // Always mark as initialized if we got this far (OneSignal is available)
          setIsInitialized(true);
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

          // Add tags to help identify test device subscriptions
          // IMPORTANT: We add "street_test_device" to match what the backend sends to
          await OneSignal.User.addTag("test_device", "true");
          await OneSignal.User.addTag("street_test_device", "true"); // This matches the backend filter
          await OneSignal.User.addTag("registered_from", window.location.pathname);
          console.log("[REGISTER] Tags added for identification:", {
            test_device: "true",
            street_test_device: "true",
            registered_from: window.location.pathname
          });

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
      console.log("[UNREGISTER] Current state - isSubscribed:", isSubscribed, "userId:", userId);

      if (!window.OneSignalDeferred) {
        throw new Error("OneSignal SDK not loaded");
      }

      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          console.log("[UNREGISTER] Opting out of push notifications...");
          await OneSignal.User.PushSubscription.optOut();

          // Wait a bit for the state to update
          await new Promise(resolve => setTimeout(resolve, 500));

          // Check the new state
          const optedIn = OneSignal.User.PushSubscription.optedIn;
          console.log("[UNREGISTER] After opt-out, optedIn status:", optedIn);

          // Manually update state to ensure button re-enables
          setIsSubscribed(false);

          console.log("✅ [UNREGISTER] Successfully unregistered from push notifications");
          toast.success("Powiadomienia push wyłączone");
        } catch (innerError) {
          console.error("❌ [UNREGISTER] Inner unregistration error:", innerError);
          toast.error("Błąd podczas wyłączania powiadomień");
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

      // Check service worker registration
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        console.log("📋 [CHECK-STATUS] Service Worker registration:", {
          found: !!registration,
          scope: registration?.scope,
          active: !!registration?.active,
          installing: !!registration?.installing,
          waiting: !!registration?.waiting,
          updateViaCache: registration?.updateViaCache
        });

        if (registration?.active) {
          console.log("✅ [CHECK-STATUS] Active Service Worker state:", registration.active.state);
          console.log("✅ [CHECK-STATUS] Active Service Worker URL:", registration.active.scriptURL);
        }
      } else {
        console.warn("⚠️ [CHECK-STATUS] Service Workers not supported in this browser");
      }

      // Check notification permission at browser level
      const browserPermission = await navigator.permissions.query({ name: 'notifications' });
      console.log("🔐 [CHECK-STATUS] Browser notification permission:", browserPermission.state);

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

          // Check if required tag is missing and add it
          if (optedIn && !tags.street_test_device) {
            console.log("⚠️ [CHECK-STATUS] Missing street_test_device tag, adding it now...");
            await OneSignal.User.addTag("street_test_device", "true");
            console.log("✅ [CHECK-STATUS] Added missing street_test_device tag");
            toast.success(
              `Status: Subscribed ✅\nBrakujący tag został dodany!\nID: ${id || 'None'}`,
              { duration: 5000 }
            );
          } else {
            const statusMessage = optedIn
              ? `Status: Subscribed ✅\nPermission: ${permission}\nID: ${id || 'None'}\nCheck console for details`
              : `Status: Not Subscribed ❌\nPermission: ${permission}\nID: ${id || 'None'}\n${permission === 'default' ? 'Click "Włącz powiadomienia" to subscribe' : 'Check console for details'}`;

            toast.success(statusMessage, { duration: 6000 });
          }
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

  const handleTestBrowserNotification = async () => {
    try {
      console.log("🧪 [TEST-BROWSER] Testing browser notification directly...");

      // Check if notifications are supported
      if (!("Notification" in window)) {
        toast.error("Ten browser nie wspiera powiadomień");
        console.error("❌ [TEST-BROWSER] Notifications not supported");
        return;
      }

      // Check current permission
      console.log("[TEST-BROWSER] Current permission:", Notification.permission);

      // Request permission if needed
      if (Notification.permission === "default") {
        console.log("[TEST-BROWSER] Requesting permission...");
        const permission = await Notification.requestPermission();
        console.log("[TEST-BROWSER] Permission result:", permission);

        if (permission !== "granted") {
          toast.error("Odmowa zezwolenia na powiadomienia");
          return;
        }
      }

      if (Notification.permission === "denied") {
        toast.error("Powiadomienia są zablokowane w przeglądarce");
        console.error("❌ [TEST-BROWSER] Permission denied");
        return;
      }

      // Create a test notification directly
      console.log("[TEST-BROWSER] Creating test notification...");
      const notification = new Notification("🧪 Test powiadomienia", {
        body: "To jest testowe powiadomienie bezpośrednio z przeglądarki",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "test-notification",
        requireInteraction: false,
        data: { test: true }
      });

      notification.onclick = function() {
        console.log("👆 [TEST-BROWSER] Notification clicked!");
        window.focus();
        notification.close();
      };

      notification.onshow = function() {
        console.log("✅ [TEST-BROWSER] Notification shown!");
      };

      notification.onerror = function(error) {
        console.error("❌ [TEST-BROWSER] Notification error:", error);
      };

      notification.onclose = function() {
        console.log("❌ [TEST-BROWSER] Notification closed");
      };

      console.log("✅ [TEST-BROWSER] Test notification created successfully");
      toast.success("Testowe powiadomienie wysłane!");
    } catch (error) {
      console.error("❌ [TEST-BROWSER] Error:", error);
      toast.error("Błąd podczas testu powiadomienia");
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
            {(userId || isSubscribed) && (
              <div className="text-xs text-muted-foreground space-y-1 mt-2">
                {userId ? (
                  <p className="font-mono break-all">
                    <strong>User ID:</strong> {userId}
                  </p>
                ) : (
                  <p className="text-amber-600">
                    ⏳ Oczekiwanie na User ID...
                  </p>
                )}
                {pushToken && (
                  <p className="font-mono break-all">
                    <strong>Token:</strong> {pushToken.length > 50 ? pushToken.substring(0, 50) + '...' : pushToken}
                  </p>
                )}
                {externalId && (
                  <p className="font-mono break-all">
                    <strong>External ID:</strong> {externalId}
                  </p>
                )}
                {isSubscribed && (
                  <p className="text-xs text-amber-600 mt-1">
                    💡 Tip: Na Androidzie subskrypcja może pojawić się jako "Linux armv8l" w dashboardzie OneSignal
                  </p>
                )}
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
              <>
                <Button
                  onClick={handleCheckStatus}
                  variant="secondary"
                  className="w-full"
                >
                  🔍 Sprawdź pełny status
                </Button>

                <Button
                  onClick={handleTestBrowserNotification}
                  variant="outline"
                  className="w-full"
                >
                  🧪 Test powiadomienia przeglądarki
                </Button>
              </>
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
              <li><strong>Debugging:</strong> Dodano tagi "test_device" i "street_test_device" dla testowania</li>
              <li><strong>Tag matching:</strong> Naprawiono problem "All included players are not subscribed" - tag "street_test_device" jest teraz poprawnie dodawany</li>
            </ul>
          </div>

          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-100 mb-2">
              💡 Wskazówki debugowania:
            </h3>
            <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
              <li><strong>NOWE:</strong> Użyj "🧪 Test powiadomienia przeglądarki" aby sprawdzić czy powiadomienia w ogóle działają (pomija OneSignal)</li>
              <li><strong>WAŻNE:</strong> Jeśli zasubskrybowałeś przed tą zmianą, kliknij "Sprawdź pełny status" aby automatycznie dodać brakujący tag "street_test_device"</li>
              <li>Użyj "Sprawdź pełny status" aby zobaczyć service worker, uprawnienia i wszystkie szczegóły subskrypcji</li>
              <li>Sprawdź console przeglądarki (F12) aby zobaczyć dokładne logi z każdego etapu otrzymywania powiadomienia</li>
              <li>W OneSignal dashboard filtruj po tagu "test_device" = "true" lub "street_test_device" = "true"</li>
              <li>Na Androidzie upewnij się że Chrome ma włączone powiadomienia w ustawieniach systemu</li>
              <li>Logi będą pokazywać czy powiadomienie zostało: otrzymane → wyświetlone → kliknięte</li>
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
