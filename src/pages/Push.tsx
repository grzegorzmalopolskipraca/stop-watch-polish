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

          // Get user ID if available
          const id = OneSignal.User.PushSubscription.id;
          console.log("🆔 [COMPONENT] User ID:", id);
          setUserId(id);

          // Listen for subscription changes
          OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
            console.log("🔄 [COMPONENT] Subscription changed:", event);
            setIsSubscribed(event.current.optedIn);
            setUserId(event.current.id);
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
          
          const newId = OneSignal.User.PushSubscription.id;
          console.log("[REGISTER] New User ID:", newId);
          
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
              <p className="text-xs text-muted-foreground">
                User ID: {userId}
              </p>
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

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h2 className="font-semibold text-foreground">Instrukcja:</h2>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Kliknij "Włącz powiadomienia" i zezwól na powiadomienia w przeglądarce</li>
            <li>Wprowadź wiadomość testową</li>
            <li>Kliknij "Wyślij powiadomienie"</li>
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
