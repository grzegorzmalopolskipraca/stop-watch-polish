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
        const { data, error } = await supabase.functions.invoke('fetch-rss-feed');
        
        if (error) {
          console.error("Error fetching RSS:", error);
          return;
        }

        if (data?.items) {
          setItems(data.items);
        }
      } catch (error) {
        console.error("Error fetching RSS:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (show) {
      fetchRss();
    }
  }, [show]);

  if (!show || isLoading) return null;

  if (items.length === 0) {
    return null;
  }

  // Duplicate items to create seamless loop
  const duplicatedItems = [...items, ...items];

  return (
    <div className="w-full bg-[#FF8C00] overflow-hidden border-b-2 border-black">
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
        <div className="flex gap-8 animate-scroll-left whitespace-nowrap">
          {duplicatedItems.map((item, index) => (
            <a
              key={index}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black font-medium hover:underline cursor-pointer"
            >
              {item.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
