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
    start: { lat: 51.060302, lng: 17.007551 },
    end: { lat: 51.070612, lng: 17.011211 }
  },
  "Karkonoska": {
    start: { lat: 51.047681, lng: 16.970960 },
    end: { lat: 51.074112, lng: 17.007528 }
  },
  "Ślężna": {
    start: { lat: 51.072314, lng: 17.012157 },
    end: { lat: 51.093395, lng: 17.030582 }
  },
  "Powstańców Śląskich": {
    start: { lat: 51.075543, lng: 17.007560 },
    end: { lat: 51.101667, lng: 17.029515 }
  },
  "Grabiszyńska": {
    start: { lat: 51.095267, lng: 16.983208 },
    end: { lat: 51.104327, lng: 17.021340 }
  },
  "Borowska": {
    start: { lat: 51.071441, lng: 17.032402 },
    end: { lat: 51.093573, lng: 17.033407 }
  },
  "Buforowa": {
    start: { lat: 51.043754, lng: 17.060997 },
    end: { lat: 51.068746, lng: 17.054066 }
  },
  "Grota Roweckiego": {
    start: { lat: 51.043693, lng: 17.028696 },
    end: { lat: 51.070613, lng: 17.032364 }
  },
  "Radosna": {
    start: { lat: 51.037788, lng: 16.986309 },
    end: { lat: 51.058774, lng: 17.006882 }
  },
  "Sudecka": {
    start: { lat: 51.072714, lng: 17.011915 },
    end: { lat: 51.084632, lng: 17.018180 }
  },
  "Opolska": {
    start: { lat: 51.085276, lng: 16.998133 },
    end: { lat: 51.106789, lng: 17.025789 }
  },
  "Parafialna": {
    start: { lat: 51.037543, lng: 17.042567 },
    end: { lat: 51.057234, lng: 17.048923 }
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
          Średni czas przejazdu: {durationMinutes > 0 && `${durationMinutes} min`} {distanceKm && `Dystans: ${distanceKm} km`} {avgSpeed && `Średnia prędkość: ${avgSpeed} km/h`}
        </span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        {(() => {
          const linePercent = avgSpeed ? Math.max(0, Math.min(100, 50 - parseFloat(avgSpeed))) : trafficPercent;
          
          // Smooth gradient from dark green (0%) -> yellow (50%) -> dark red (100%)
          let barColor: string;
          if (linePercent <= 50) {
            // Interpolate from dark green to yellow
            const ratio = linePercent / 50;
            const r = Math.round(34 + (255 - 34) * ratio);
            const g = Math.round(139 + (255 - 139) * ratio);
            const b = Math.round(34 + (0 - 34) * ratio);
            barColor = `rgb(${r}, ${g}, ${b})`;
          } else {
            // Interpolate from yellow to dark red
            const ratio = (linePercent - 50) / 50;
            const r = Math.round(255 + (139 - 255) * ratio);
            const g = Math.round(255 + (0 - 255) * ratio);
            const b = 0;
            barColor = `rgb(${r}, ${g}, ${b})`;
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
