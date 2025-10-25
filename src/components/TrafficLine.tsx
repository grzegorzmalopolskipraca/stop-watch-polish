import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type TrafficLevel = "low" | "medium" | "high";

interface StreetCoordinates {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
}

interface Props {
  street: string;
  direction: "to_center" | "from_center";
  width?: string;
}

// Street coordinates for Wrocław
const STREET_COORDINATES: Record<string, StreetCoordinates> = {
  "Zwycięska": {
    start: { lat: 51.0927, lng: 17.0089 },
    end: { lat: 51.1101, lng: 17.0324 }
  },
  "Ołtaszyńska": {
    start: { lat: 51.0761, lng: 17.0012 },
    end: { lat: 51.0945, lng: 17.0187 }
  },
  "Karkonoska": {
    start: { lat: 51.1285, lng: 16.9442 },
    end: { lat: 51.1456, lng: 16.9789 }
  },
  "Ślężna": {
    start: { lat: 51.0856, lng: 17.0456 },
    end: { lat: 51.0689, lng: 17.0145 }
  },
  "Powstańców Śląskich": {
    start: { lat: 51.1187, lng: 17.0567 },
    end: { lat: 51.0945, lng: 17.0334 }
  },
  "Grabiszyńska": {
    start: { lat: 51.1023, lng: 17.0123 },
    end: { lat: 51.0834, lng: 16.9867 }
  },
  "Borowska": {
    start: { lat: 51.0889, lng: 17.0567 },
    end: { lat: 51.0645, lng: 17.0234 }
  },
  "Buforowa": {
    start: { lat: 51.0456, lng: 16.9989 },
    end: { lat: 51.0634, lng: 17.0123 }
  },
  "Grota Roweckiego": {
    start: { lat: 51.1234, lng: 17.0789 },
    end: { lat: 51.1089, lng: 17.0456 }
  },
  "Radosna": {
    start: { lat: 51.0734, lng: 17.0678 },
    end: { lat: 51.0889, lng: 17.0823 }
  },
  "Sudecka": {
    start: { lat: 51.1156, lng: 17.0234 },
    end: { lat: 51.0989, lng: 17.0456 }
  }
};

export const TrafficLine = ({ street, direction, width = "100%" }: Props) => {
  const [level, setLevel] = useState<TrafficLevel>("medium");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTraffic() {
      setIsLoading(true);
      try {
        const coords = STREET_COORDINATES[street];
        if (!coords) {
          setLevel("medium");
          setIsLoading(false);
          return;
        }

        // Reverse coordinates if direction is from center
        const origin = direction === "from_center" 
          ? { lat: coords.end.lat, lng: coords.end.lng }
          : { lat: coords.start.lat, lng: coords.start.lng };
        const destination = direction === "from_center"
          ? { lat: coords.start.lat, lng: coords.start.lng }
          : { lat: coords.end.lat, lng: coords.end.lng };

        // Call edge function instead of Google API directly
        const { data: json, error } = await supabase.functions.invoke('get-traffic-data', {
          body: { origin, destination }
        });

        if (error) {
          throw new Error(error.message);
        }
        
        if (json.routes && json.routes.length > 0) {
          const route = json.routes[0];
          const duration = parseInt(route.duration?.replace('s', '') || '0');
          const distance = route.distanceMeters || 1000;
          
          // Calculate speed (meters per second)
          const speed = distance / duration;
          
          // Determine traffic level based on speed
          // Typical city speed: 30-50 km/h (8-14 m/s)
          let newLevel: TrafficLevel = "low";
          if (speed < 5) newLevel = "high";      // < 18 km/h - heavy traffic
          else if (speed < 8) newLevel = "medium"; // < 29 km/h - moderate traffic
          else newLevel = "low";                   // >= 29 km/h - light traffic

          setLevel(newLevel);
        } else {
          setLevel("medium");
        }
      } catch (err) {
        console.error("fetchTraffic error", err);
        setLevel("medium");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTraffic();
    // Refresh every 2 minutes
    const interval = setInterval(fetchTraffic, 120 * 1000);
    return () => clearInterval(interval);
  }, [street, direction]);

  const colorMap: Record<TrafficLevel, string> = {
    low: "#2ecc71",     // green - light traffic
    medium: "#f39c12",  // orange - moderate traffic
    high: "#e74c3c"     // red - heavy traffic
  };

  const labelMap: Record<TrafficLevel, string> = {
    low: "Płynny ruch",
    medium: "Umiarkowany ruch",
    high: "Duże korki"
  };

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Natężenie ruchu (Google Maps)</span>
        {!isLoading && <span className="font-medium">{labelMap[level]}</span>}
      </div>
      <div 
        style={{ 
          width, 
          height: '8px', 
          backgroundColor: isLoading ? '#94a3b8' : colorMap[level],
          transition: 'background-color 0.3s ease',
          borderRadius: '4px'
        }}
        className="relative overflow-hidden"
      >
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        )}
      </div>
    </div>
  );
};
