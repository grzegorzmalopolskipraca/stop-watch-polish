import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Bell, BellOff } from "lucide-react";
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, isPushSubscribed } from "@/utils/pushNotifications";

interface Message {
  id: string;
  street: string;
  message: string;
  created_at: string;
}

interface StreetChatProps {
  street: string;
}

export const StreetChat = ({ street }: StreetChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);

  // Load notification preference when street changes
  useEffect(() => {
    setNotificationsEnabled(isPushSubscribed(street));
  }, [street]);

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Twoja przeglądarka nie obsługuje powiadomień");
      return;
    }

    if (notificationsEnabled) {
      // Unsubscribe
      const success = await unsubscribeFromPushNotifications(street);
      if (success) {
        setNotificationsEnabled(false);
        toast.success("Powiadomienia wyłączone");
      } else {
        toast.error("Błąd podczas wyłączania powiadomień");
      }
    } else {
      // Subscribe
      const success = await subscribeToPushNotifications(street);
      if (success) {
        setNotificationsEnabled(true);
        toast.success("Powiadomienia włączone");
      } else {
        toast.error("Nie udało się włączyć powiadomień. Sprawdź ustawienia przeglądarki.");
      }
    }
  };


  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("street_chat_messages")
        .select("*")
        .eq("street", street)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setMessages((data || []).reverse());
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    initialLoadRef.current = true;
    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`street-chat-${street}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "street_chat_messages",
          filter: `street=eq.${street}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((current) => {
            const updated = [...current, newMsg];
            // Keep only last 20 messages
            return updated.slice(-20);
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [street]);

  useEffect(() => {
    // Skip auto-scroll on initial load
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    if (messages.length > 0) {
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length > 1 ? messages[messages.length - 1]?.id : null]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      toast.error("Wiadomość nie może być pusta");
      return;
    }

    if (newMessage.length > 500) {
      toast.error("Wiadomość jest za długa (max 500 znaków)");
      return;
    }

    setIsSubmitting(true);

    try {
      const userFingerprint = `user_${Math.random().toString(36).substring(2, 9)}`;

      const { data, error } = await supabase.functions.invoke('submit-chat-message', {
        body: {
          street,
          message: newMessage.trim(),
          userFingerprint,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send message');
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setNewMessage("");
      toast.success("Wiadomość wysłana!");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Błąd podczas wysyłania wiadomości");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary/10 border-2 border-blue-400 rounded-lg p-5 text-sm space-y-2">
        <h4 className="text-lg font-bold text-primary">💬 Chat sąsiedzki (cb radio) - {street}</h4>
        <p>
          Ten chat służy do komunikacji między sąsiadami. Jeśli stoisz na
          przystanku i czekasz na autobus, możesz napisać dokąd jedziesz, a ktoś
          jadący samochodem może Cię zabrać, zmniejszając korki.
        </p>
        <p className="text-muted-foreground text-xs">
          <strong>Przykład:</strong> "Uprzejmy 22-latek w czerwonej kurtce na
          przystanku przy Atalu chce dojechać na Plac Grunwaldzki" → Odpowiedź:
          "Cześć, jadę czerwoną Mazdą 6, będę za 5 minut, mogę Cię zabrać"
        </p>
      </div>

      <div className="bg-card rounded-lg border-2 border-blue-400">
        <div className="h-80 overflow-y-auto p-4 space-y-3" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Brak wiadomości. Bądź pierwszy!
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-muted/30 rounded-lg p-3 space-y-1"
              >
                <div className="text-xs text-muted-foreground">
                  {format(new Date(msg.created_at), "HH:mm", { locale: pl })}
                </div>
                <div className="text-sm break-words">{msg.message}</div>
              </div>
            ))
          )}
          
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t-2 border-blue-400">
          <div className="space-y-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Napisz wiadomość... (max 500 znaków)"
              className="resize-none"
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={requestNotificationPermission}
                  className="gap-2"
                >
                  {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  <span className="text-xs">Powiadom mnie</span>
                </Button>
                <span className="text-xs text-muted-foreground">
                  {newMessage.length}/500
                </span>
              </div>
              <Button type="submit" disabled={isSubmitting || !newMessage.trim()}>
                {isSubmitting ? "Wysyłanie..." : "Wyślij"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
