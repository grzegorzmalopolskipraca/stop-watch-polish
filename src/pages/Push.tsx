import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { subscribeToOneSignal, unsubscribeFromOneSignal, isOneSignalSubscribed } from "@/utils/onesignal";
import { supabase } from "@/integrations/supabase/client";
import { ConsoleViewer } from "@/components/ConsoleViewer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Push = () => {
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");
  const testStreet = "test_device";

  useEffect(() => {
    console.log("[Push Page] Component mounted");
    console.log("[Push Page] Test street:", testStreet);
    console.log("[Push Page] OneSignal global object:", (window as any).OneSignal);
    console.log("[Push Page] Notification API available:", "Notification" in window);

    if ("Notification" in window) {
      console.log("[Push Page] Current notification permission:", Notification.permission);
    }

    // Service Worker diagnostics + cleanup of legacy SWs
    if ("serviceWorker" in navigator) {
      console.log("[Push Page] ServiceWorker supported by this browser");
      navigator.serviceWorker
        .getRegistrations()
        .then(async (regs) => {
          console.log(
            "[Push Page] Existing SW registrations:",
            regs.map((r) => ({
              scope: r.scope,
              script:
                r.active?.scriptURL ||
                r.installing?.scriptURL ||
                r.waiting?.scriptURL ||
                "<unknown>",
            }))
          );

          // Unregister any legacy/non-OneSignal workers (e.g. old sw.js)
          let didUnregister = false;
          for (const r of regs) {
            const script =
              r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
            const isOneSignal = /OneSignalSDKWorker\.js|OneSignalSDKUpdaterWorker\.js/.test(script);
            const isLegacy = /\/sw\.js$|wonderpush|workbox|vite-pwa/i.test(script);
            if (!isOneSignal && isLegacy) {
              console.warn("[Push Page] Unregistering legacy Service Worker:", { scope: r.scope, script });
              try {
                const ok = await r.unregister();
                console.log("[Push Page] Unregister result:", ok);
                didUnregister = ok || didUnregister;
              } catch (e) {
                console.warn("[Push Page] Unregister failed", e);
              }
            }
          }

          // If we removed an old SW, reload once so OneSignal can take over
          if (didUnregister) {
            console.log("[Push Page] Reloading to allow OneSignal to register its worker...");
            window.location.reload();
          }
        })
        .catch((e) => console.warn("[Push Page] getRegistrations() failed", e));
    } else {
      console.warn("[Push Page] ServiceWorker NOT supported");
    }

    // Check initial push status
    const isSubscribed = isOneSignalSubscribed(testStreet);
    console.log("[Push Page] Initial subscription status:", isSubscribed);
    setIsPushEnabled(isSubscribed);
  }, []);

  const togglePush = async () => {
    console.log("[Push Page] Toggle push clicked, current state:", isPushEnabled);
    setIsLoading(true);
    
    try {
      if (isPushEnabled) {
        // Disable push
        console.log("[Push Page] Attempting to unsubscribe from:", testStreet);
        const success = await unsubscribeFromOneSignal(testStreet);
        console.log("[Push Page] Unsubscribe result:", success);
        
        if (success) {
          setIsPushEnabled(false);
          console.log("[Push Page] Successfully unsubscribed");
          toast.success("Powiadomienia push wyłączone");
        } else {
          console.error("[Push Page] Failed to unsubscribe");
          toast.error("Nie udało się wyłączyć powiadomień");
        }
      } else {
        // Enable push
        console.log("[Push Page] Attempting to subscribe to:", testStreet);
        console.log("[Push Page] Check console for detailed subscription logs");
        
        try {
          const success = await subscribeToOneSignal(testStreet);
          console.log("[Push Page] Subscribe result:", success);
          
          if (success) {
            setIsPushEnabled(true);
            console.log("[Push Page] Successfully subscribed");
            toast.success("✅ Powiadomienia push włączone");
          } else {
            console.error("[Push Page] Failed to subscribe");
            toast.error("❌ Nie udało się włączyć powiadomień - sprawdź konsolę");
          }
        } catch (subscribeError) {
          console.error("[Push Page] Subscribe threw error:", subscribeError);
          throw subscribeError; // Re-throw to be caught by outer catch
        }
      }
    } catch (error) {
      console.error("[Push Page] Error toggling push:", error);
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd";
      console.error("[Push Page] Full error details:", {
        message: errorMessage,
        error: error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Show detailed error dialog
      setBlockedMessage(errorMessage);
      setShowBlockedDialog(true);
      
      toast.error(`❌ ${errorMessage}`, { duration: 5000 });
    } finally {
      setIsLoading(false);
      console.log("[Push Page] Toggle push completed, new state:", !isPushEnabled);
    }
  };

  const sendTestPush = async () => {
    console.log("[Push Page] Send test push clicked");
    console.log("[Push Page] Current push enabled state:", isPushEnabled);
    
    if (!isPushEnabled) {
      console.warn("[Push Page] Cannot send push - notifications not enabled");
      toast.error("Najpierw włącz powiadomienia push");
      return;
    }

    setIsLoading(true);
    console.log("[Push Page] Invoking send-push-notifications edge function");
    console.log("[Push Page] Payload:", { street: testStreet, message: "To jest testowe powiadomienie push!" });
    
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notifications", {
        body: {
          street: testStreet,
          message: "To jest testowe powiadomienie push!",
        },
      });

      console.log("[Push Page] Edge function response:", { data, error });

      if (error) {
        console.error("[Push Page] Error sending push:", error);
        toast.error("Nie udało się wysłać powiadomienia");
      } else {
        console.log("[Push Page] Push notification sent successfully");
        toast.success("Powiadomienie wysłane!");
      }
    } catch (error) {
      console.error("[Push Page] Exception sending push:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsLoading(false);
      console.log("[Push Page] Send push completed");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <AlertDialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-destructive" />
              Powiadomienia zablokowane
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-left">
              <p className="font-semibold text-foreground">{blockedMessage}</p>
              
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Jak to naprawić:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Kliknij ikonę <strong>kłódki</strong> w pasku adresu przeglądarki (obok URL)</li>
                  <li>Znajdź ustawienie <strong>"Powiadomienia"</strong></li>
                  <li>Zmień na <strong>"Zezwalaj"</strong> lub <strong>"Allow"</strong></li>
                  <li>Odśwież stronę</li>
                  <li>Spróbuj ponownie włączyć powiadomienia push</li>
                </ol>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Powiadomienia push wymagają zgody przeglądarki. Bez tego OneSignal nie może działać.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Rozumiem</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-md mx-auto space-y-6 py-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Test Push Notifications
          </h1>
          <p className="text-muted-foreground">
            Testuj powiadomienia push na tym urządzeniu
          </p>
        </header>

        <div className="space-y-4">
          {/* Enable/Disable Push Button */}
          <Button
            onClick={togglePush}
            disabled={isLoading}
            className="w-full h-16 text-lg font-semibold"
            variant={isPushEnabled ? "outline" : "default"}
          >
            {isPushEnabled ? (
              <>
                <Bell className="w-6 h-6 mr-2" />
                Zapisany na powiadomienia - kliknij aby wypisać
              </>
            ) : (
              <>
                <BellOff className="w-6 h-6 mr-2" />
                Nie subskrybujesz - kliknij aby zapisać
              </>
            )}
          </Button>

          {/* Send Test Push Button */}
          <Button
            onClick={sendTestPush}
            disabled={isLoading || !isPushEnabled}
            className="w-full h-16 text-lg font-semibold"
            variant="secondary"
          >
            <Send className="w-6 h-6 mr-2" />
            Wyślij testową wiadomość push
          </Button>

          {!isPushEnabled && (
            <p className="text-sm text-muted-foreground text-center">
              Włącz powiadomienia push, aby móc wysłać testowe powiadomienie
            </p>
          )}
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg space-y-2">
          <h2 className="font-semibold text-foreground">Instrukcja:</h2>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Kliknij przycisk "Push wyłączone" aby włączyć powiadomienia</li>
            <li>Zezwól na powiadomienia w przeglądarce</li>
            <li>Kliknij "Wyślij testowe powiadomienie" aby przetestować</li>
            <li>Powiadomienie powinno pojawić się na tym urządzeniu</li>
          </ol>
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
