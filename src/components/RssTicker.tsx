import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RssItem {
  id: string;
  text: string;
  position: number;
}

interface RssTickerProps {
  speed?: number;
}

export const RssTicker = ({ speed = 60 }: RssTickerProps) => {
  const [items, setItems] = useState<RssItem[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('rss_items')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) {
        console.error('Error fetching RSS items:', error);
        return;
      }
      
      if (data) {
        setItems(data);
      }
    };

    fetchItems();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('rss_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rss_items'
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (items.length === 0) return null;

  // Duplicate items to create seamless loop
  const duplicatedItems = [...items, ...items];

  return (
    <div className="w-full bg-primary/10 overflow-hidden border-b border-border">
      <div className="relative h-8 flex items-center">
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes scroll-left {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-scroll-left {
              animation: scroll-left ${speed}s linear infinite;
            }
            .animate-scroll-left:hover {
              animation-play-state: paused;
            }
          `
        }} />
        <div className="flex gap-32 animate-scroll-left whitespace-nowrap text-sm px-4">
          {duplicatedItems.map((item, index) => (
            <span key={`${item.id}-${index}`} className="text-foreground/80">
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
