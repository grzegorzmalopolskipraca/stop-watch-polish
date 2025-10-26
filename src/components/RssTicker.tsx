import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RssItem {
  title: string;
  link: string;
}

interface RssTickerProps {
  show: boolean;
}

export const RssTicker = ({ show }: RssTickerProps) => {
  const [items, setItems] = useState<RssItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRss = async () => {
      try {
        console.log("[RssTicker] Fetching RSS feed...");
        const { data, error } = await supabase.functions.invoke('fetch-rss-feed');
        
        if (error) {
          console.error("[RssTicker] Error fetching RSS:", error);
          return;
        }

        console.log("[RssTicker] RSS data received:", data);
        if (data?.items) {
          setItems(data.items);
          console.log("[RssTicker] Items set:", data.items.length);
        }
      } catch (error) {
        console.error("[RssTicker] Error fetching RSS:", error);
      } finally {
        setIsLoading(false);
      }
    };

    console.log("[RssTicker] Show prop changed:", show);
    if (show) {
      fetchRss();
    }
  }, [show]);

  console.log("[RssTicker] Render - show:", show, "isLoading:", isLoading, "items:", items.length);
  
  if (!show || isLoading) return null;

  if (items.length === 0) {
    console.log("[RssTicker] No items to display");
    return null;
  }

  // Duplicate items to create seamless loop
  const duplicatedItems = [...items, ...items];

  return (
    <div className="sticky top-0 z-20 w-full bg-traffic-toczy text-traffic-toczy-foreground overflow-hidden border-b border-border">
      <div className="relative h-10 flex items-center">
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes scroll-left {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-scroll-left {
              animation: scroll-left 30s linear infinite;
            }
            .animate-scroll-left:hover {
              animation-play-state: paused;
            }
          `
        }} />
        <div className="flex gap-8 animate-scroll-left whitespace-nowrap px-4">
          {duplicatedItems.map((item, index) => (
            <a
              key={index}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline cursor-pointer"
            >
              {item.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
