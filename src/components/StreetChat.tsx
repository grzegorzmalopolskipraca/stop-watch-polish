import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
          setMessages((current) => {
            const updated = [...current, payload.new as Message];
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
    scrollToBottom();
  }, [messages]);

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
      const fingerprint = `user_${Math.random().toString(36).substring(7)}`;

      const { error } = await supabase.from("street_chat_messages").insert({
        street,
        message: newMessage.trim(),
        user_fingerprint: fingerprint,
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Błąd podczas wysyłania wiadomości");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
        <h4 className="font-semibold">Chat sąsiedzki - {street}</h4>
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

      <div className="bg-card rounded-lg border border-border">
        <div className="h-80 overflow-y-auto p-4 space-y-3">
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
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
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
              <span className="text-xs text-muted-foreground">
                {newMessage.length}/500
              </span>
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
