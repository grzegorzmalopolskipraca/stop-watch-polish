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

// Thresholds for speed in km/h - adjusted for urban traffic
const SPEED_THRESHOLDS = {
  LOW: 25,    // >= 25 km/h = free-flowing traffic (green)
  MEDIUM: 8   // 8-25 km/h = moderate traffic (orange)
              // < 8 km/h = heavy congestion (red)
};

// Street coordinates for Wrocław
const STREET_COORDINATES: Record<string, StreetCoordinates> = {
  "Zwycięska": {
    start: { lat: 51.058494, lng: 17.014247 },
    end: { lat: 51.061066, lng: 16.998068 }
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
  const [trafficPercent, setTrafficPercent] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [avgSpeed, setAvgSpeed] = useState<string>("");

  useEffect(() => {
    async function fetchTraffic() {
      console.log(`[TrafficLine] Starting fetch for street: ${street}, direction: ${direction}`);
      setIsLoading(true);
      try {
        const coords = STREET_COORDINATES[street];
        if (!coords) {
          console.warn(`[TrafficLine] No coordinates found for street: ${street}`);
          setLevel("medium");
          setIsLoading(false);
          return;
        }

        console.log(`[TrafficLine] Found coordinates for ${street}:`, coords);

        // Reverse coordinates if direction is from center
        const origin = direction === "from_center" 
          ? { lat: coords.end.lat, lng: coords.end.lng }
          : { lat: coords.start.lat, lng: coords.start.lng };
        const destination = direction === "from_center"
          ? { lat: coords.start.lat, lng: coords.start.lng }
          : { lat: coords.end.lat, lng: coords.end.lng };

        console.log(`[TrafficLine] Calling edge function with origin:`, origin, `destination:`, destination);
        const t0 = performance.now();
        // Call edge function instead of Google API directly
        const { data: json, error } = await supabase.functions.invoke('get-traffic-data', {
          body: { origin, destination }
        });
        const t1 = performance.now();
        console.log(`[TrafficLine] Edge function roundtrip: ${(t1 - t0).toFixed(0)} ms`);

        if (error) {
          console.error(`[TrafficLine] Edge function error:`, error);
          throw new Error(error.message);
        }

        console.log(`[TrafficLine] Received response from edge function:`, json);
        
        if (json?.routes && json.routes.length > 0) {
          const route = json.routes[0];
          console.log(`[TrafficLine] Route data:`, route);
          
          // Get traffic-aware duration and distance from Directions API response
          const leg = route.legs?.[0];
          if (!leg) {
            console.warn(`[TrafficLine] No leg data in route. Setting level=medium.`);
            setLevel("medium");
            return;
          }

          const trafficDuration = leg.duration_in_traffic?.value; // in seconds
          const normalDuration = leg.duration?.value; // in seconds
          const distance = leg.distance?.value; // in meters
          
          console.log(`[TrafficLine] Parsed - duration_in_traffic: ${trafficDuration}s, duration: ${normalDuration}s, distance: ${distance}m`);
          
          // Calculate traffic percentage for visualization
          if (trafficDuration && normalDuration && normalDuration > 0) {
            const percent = (trafficDuration / normalDuration) * 100;
            setTrafficPercent(Math.min(percent, 100));
            setDurationMinutes(Math.round(trafficDuration / 60));
          }
          
          if (distance && distance > 0) {
            const distKm = distance / 1000;
            setDistanceKm(distKm.toFixed(1));
            
            // Calculate average speed if we have duration
            if (trafficDuration && trafficDuration > 0) {
              const durationHours = trafficDuration / 3600; // convert seconds to hours
              const speed = distKm / durationHours;
              setAvgSpeed(speed.toFixed(1));
            }
          }
          
          if (!trafficDuration || trafficDuration <= 0 || !distance || distance <= 0) {
            console.warn(`[TrafficLine] Invalid duration/distance (duration=${trafficDuration}, distance=${distance}). Setting level=medium.`);
            setLevel("medium");
            return;
          }
          
          // Calculate speed with traffic (meters per second)
          const speed = distance / trafficDuration;
          const speedKmh = speed * 3.6;
          console.log(`[TrafficLine] Calculated speed with traffic: ${speed} m/s (${speedKmh.toFixed(2)} km/h)`);
          
          // Determine traffic level based on speed
          console.log(`[TrafficLine] Thresholds (km/h): red<${SPEED_THRESHOLDS.MEDIUM}, orange<${SPEED_THRESHOLDS.LOW}, green>=${SPEED_THRESHOLDS.LOW}`);
          let newLevel: TrafficLevel;
          if (!isFinite(speed) || speed <= 0) {
            console.warn(`[TrafficLine] Invalid speed computed (speed=${speed}). Falling back to medium.`);
            newLevel = "medium";
          } else if (speedKmh >= SPEED_THRESHOLDS.LOW) {
            newLevel = "low";     // Green: fast, free-flowing
          } else if (speedKmh >= SPEED_THRESHOLDS.MEDIUM) {
            newLevel = "medium";  // Orange: moderate traffic
          } else {
            newLevel = "high";    // Red: slow, congested
          }
          console.log(`[TrafficLine] Determined traffic level: ${newLevel} (speed: ${speed.toFixed(3)} m/s, ${speedKmh.toFixed(1)} km/h)`);
          setLevel(newLevel);
        } else {
          console.warn(`[TrafficLine] No routes in response, setting medium level`);
          setLevel("medium");
        }
      } catch (err) {
        console.error(`[TrafficLine] fetchTraffic error for ${street}:`, err);
        setLevel("medium");
      } finally {
        setIsLoading(false);
        console.log(`[TrafficLine] Finished fetch for ${street}`);
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
  console.log(`[TrafficLine] Current level=${level}, mapped color=${isLoading ? '#94a3b8' : colorMap[level]}`);

  const labelMap: Record<TrafficLevel, string> = {
    low: "Płynny ruch",
    medium: "Umiarkowany ruch",
    high: "Duże korki"
  };

  useEffect(() => {
    const barColor = isLoading ? '#94a3b8' : colorMap[level];
    console.log(`[TrafficLine] UI render state -> loading=${isLoading}, level=${level}, color=${barColor}`);
  }, [isLoading, level]);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs" style={{ color: '#94a3b8' }}>
        <span>
          Natężenie ruchu wzdłuż drogi (w trakcie prac) {durationMinutes > 0 && `Czas: ${durationMinutes} min`} {distanceKm && `Dystans: ${distanceKm} km`} {avgSpeed && `Średnia prędkość: ${avgSpeed} km/h`}
        </span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        {(() => {
          const linePercent = avgSpeed ? Math.max(0, Math.min(100, 50 - parseFloat(avgSpeed))) : trafficPercent;
          let barColor = '#e74c3c'; // red default
          
          if (linePercent > 80) {
            barColor = '#e74c3c'; // red
          } else if (linePercent >= 40) {
            barColor = '#f39c12'; // orange
          } else {
            barColor = '#2ecc71'; // green
          }
          
          return (
            <div 
              style={{ 
                width: `${linePercent}%`,
                height: '100%',
                backgroundColor: barColor,
                transition: 'width 0.3s ease, background-color 0.3s ease'
              }}
            />
          );
        })()}
      </div>
    </div>
  );
};
