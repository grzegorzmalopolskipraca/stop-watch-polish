import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [isLoading, setIsLoading] = useState(true);
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

      // Reverse to show oldest first
      setMessages((data || []).reverse());
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
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
            const newMessages = [...current, payload.new as Message];
            // Keep only last 20 messages
            return newMessages.slice(-20);
          });
          setTimeout(scrollToBottom, 100);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      toast.error("Wiadomość nie może być pusta");
      return;
    }

    if (newMessage.length > 500) {
      toast.error("Wiadomość może mieć maksymalnie 500 znaków");
      return;
    }

    try {
      const fingerprint = `user_${Math.random().toString(36).substring(7)}`;

      const { error } = await supabase.from("street_chat_messages").insert({
        street,
        message: newMessage.trim(),
        user_fingerprint: fingerprint,
      });

      if (error) throw error;

      setNewMessage("");
      toast.success("Wiadomość wysłana");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Błąd podczas wysyłania wiadomości");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 text-sm">
        <h4 className="font-semibold mb-2">💬 Chat sąsiedzki</h4>
        <p className="text-muted-foreground mb-2">
          Komunikuj się z sąsiadami! Czekasz na przystanku i chcesz dojechać do
          centrum? Napisz gdzie jesteś i dokąd jedziesz.
        </p>
        <div className="bg-background/50 rounded p-3 space-y-1 text-xs">
          <p className="font-medium">Przykład:</p>
          <p className="text-muted-foreground">
            → "Uprzejmy 22-latek w czerwonej kurtce na przystanku przy Atalu
            chce dojechać na Plac Grunwaldzki"
          </p>
          <p className="text-muted-foreground">
            → "Cześć, jadę czerwoną Mazdą 6, będę za 5 minut, zabiorę Cię tam"
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h4 className="font-semibold">Ostatnie wiadomości</h4>
        </div>

        <div className="h-80 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Ładowanie...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Brak wiadomości. Bądź pierwszy!
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-muted/30 rounded-lg p-3 space-y-1"
              >
                <p className="text-xs text-muted-foreground">
                  {format(new Date(msg.created_at), "HH:mm", { locale: pl })}
                </p>
                <p className="text-sm">{msg.message}</p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Napisz wiadomość..."
              maxLength={500}
              className="flex-1"
            />
            <Button type="submit">Wyślij</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {newMessage.length}/500 znaków
          </p>
        </form>
      </div>
    </div>
  );
};
