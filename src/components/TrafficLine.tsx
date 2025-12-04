import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type TrafficLevel = "low" | "medium" | "high";

interface StreetCoordinates {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
}

interface Props {
  street: string;
  direction: "to_center" | "from_center";
  width?: string;
  onSpeedUpdate?: (speed: number | null) => void;
  onDistanceUpdate?: (distance: number | null) => void;
}

// Thresholds for speed in km/h - adjusted for urban traffic
const SPEED_THRESHOLDS = {
  LOW: 25,    // >= 25 km/h = free-flowing traffic (green)
  MEDIUM: 8   // 8-25 km/h = moderate traffic (orange)
              // < 8 km/h = heavy congestion (red)
};

// Frustration texts based on speed
const FRUSTRATION_TEXTS: Record<number, string> = {
  0: "Windows się zawiesił. Ja też.",
  1: "Spalić to wszystko i wyprowadzić się w Bieszczady.",
  2: '"Zaraz tam pójdę i sam tym ruchem pokieruję."',
  3: "Mam czas przemyśleć wszystkie swoje błędy życiowe.",
  4: "Auto stoi, ale spalanie emocji rekordowe.",
  5: "Mój silnik to tło dla podcastu o cierpieniu.",
  6: "Zaczynam rozumieć, czemu Elon Musk zbudował rakiety.",
  7: "Zaczynam mówić do samochodu. Samochód nie odpowiada.",
  8: '"To nie korek, to styl życia."',
  9: "Pasy bezpieczeństwa trzymają mnie przy zdrowych zmysłach.",
  10: "Armagedon, tylko bez efektów specjalnych.",
  11: "Mam déjà vu z wczorajszego korka.",
  12: "Rozważam teleportację.",
  13: 'Google Maps: "Za 200 metrów korek." Ja: "Nie żartuj."',
  14: "Jak to możliwe, że ślimak mnie wyprzedza?",
  15: "Dostanę pierdolca, ale przynajmniej ekologicznie.",
  16: "Medytuję na temat sensu kierunkowskazów.",
  17: "Znam już wszystkich kierowców z pasa obok.",
  18: '"Czekaj, to ja w ogóle jeszcze jadę?"',
  19: "Czas płynie, tylko ja nie.",
  20: "Znowu to samo, deja vu level expert.",
  21: "Auto turla się z dumą i desperacją.",
  22: "Już mniej nienawidzę wszystkich.",
  23: "Zaczynam znów słyszeć muzykę zamiast własnych myśli.",
  24: "Mam nadzieję. Maleńką, ale jest.",
  25: 'To tempo już można nazwać "jazdą".',
  26: '"Tato, ruszyliśmy?" – "Nie przerywaj tacie, on czuje flow."',
  27: "Czuję, że żyję. Ledwo, ale jednak.",
  28: "Auto idzie jak marzenie, czyli wolno, ale stabilnie.",
  29: "Zaczynam ufać światu.",
  30: "Włączyłem klime, czuję luksus.",
  31: "Prawie jak ekspresówka, tylko bez ekspresu.",
  32: "Myślę, że przeżyję ten dzień.",
  33: "Mam wrażenie, że los mnie testował, ale już zdałem.",
  34: "Jakbym dostał nowe życie.",
  35: '"To uczucie, gdy naprawdę JEDZIESZ."',
  36: "Przy tym tempie można już marzyć o trzecim biegu.",
  37: "Słyszę ptaki, nie klaksony.",
  38: "Niebo się otwiera.",
  39: "Kawa smakuje jak nagroda Nobla.",
  40: "Tak tu jeszcze nie było. Czuję dumę narodową.",
  41: "To już nie jazda, to poezja.",
  42: "Prawy pas staje się pasem zwycięzców.",
  43: "Mam ochotę pozdrowić kierowców z naprzeciwka.",
  44: "Radio gra, ja śpiewam, policja patrzy.",
  45: "Wreszcie czuję sens istnienia.",
  46: "Chyba mijam czasoprzestrzeń.",
  47: "To uczucie, gdy nie wiesz, co to korek.",
  48: "Świat jest piękny. Ludzie są mili. Drogi puste.",
  49: "Mam ochotę dziękować wszystkim bogom ruchu drogowego.",
  50: "Chyba zaraz wystartuję. Elon, trzymaj się."
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
  },
  "Hallera": {
    start: { lat: 51.086587, lng: 17.011750 },
    end: { lat: 51.093761, lng: 16.981001 }
  }
};

export const TrafficLine = ({ street, direction, width = "100%", onSpeedUpdate, onDistanceUpdate }: Props) => {
  const [level, setLevel] = useState<TrafficLevel>("medium");
  const [isLoading, setIsLoading] = useState(true);
  const [trafficPercent, setTrafficPercent] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [avgSpeed, setAvgSpeed] = useState<string>("");
  const [animatedSpeed, setAnimatedSpeed] = useState<number>(0);
  const shareRef = useRef<HTMLDivElement>(null);

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

        const origin = direction === "from_center" 
          ? { lat: coords.end.lat, lng: coords.end.lng }
          : { lat: coords.start.lat, lng: coords.start.lng };
        const destination = direction === "from_center"
          ? { lat: coords.start.lat, lng: coords.start.lng }
          : { lat: coords.end.lat, lng: coords.end.lng };

        const t0 = performance.now();
        const { data: json, error } = await supabase.functions.invoke('get-traffic-data', {
          body: { origin, destination }
        });
        const t1 = performance.now();
        console.log(`[TrafficLine] Roundtrip: ${(t1 - t0).toFixed(0)} ms`);

        if (error) {
          console.error(`[TrafficLine] Error:`, error);
          throw new Error(error.message);
        }

        console.log(`[TrafficLine] Received response:`, json);
        
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
            
            // Notify parent about distance update
            if (onDistanceUpdate) {
              onDistanceUpdate(parseFloat(distKm.toFixed(1)));
            }
            
            // Calculate average speed if we have duration
            if (trafficDuration && trafficDuration > 0) {
              const durationHours = trafficDuration / 3600; // convert seconds to hours
              const speed = distKm / durationHours;
              setAvgSpeed(speed.toFixed(1));
              // Notify parent about speed update
              if (onSpeedUpdate) {
                onSpeedUpdate(parseFloat(speed.toFixed(1)));
              }
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

  // Animate needle with subtle random movement
  useEffect(() => {
    const baseSpeed = avgSpeed ? parseFloat(avgSpeed) : 0;
    setAnimatedSpeed(baseSpeed);

    const interval = setInterval(() => {
      const baseSpeed = avgSpeed ? parseFloat(avgSpeed) : 0;
      // Random variation of +/- 0.5 km/h
      const variation = (Math.random() * 2 - 1) * 0.5;
      const newSpeed = Math.max(0, Math.min(50, baseSpeed + variation));
      setAnimatedSpeed(newSpeed);
    }, 1500); // Update every 1.5 seconds for smooth animation

    return () => clearInterval(interval);
  }, [avgSpeed]);

  // Calculate needle angle based on speed (0-50 km/h)
  const calculateNeedleAngle = (speed: number) => {
    const maxSpeed = 50;
    const clampedSpeed = Math.max(0, Math.min(speed, maxSpeed));
    // Apply a slight 5% bias to the speed for visual alignment, then map to angle
    const biasedSpeed = Math.min(maxSpeed, clampedSpeed * 1.05);
    // Rotate from -90 degrees (0 km/h, left) to 90 degrees (50 km/h, right)
    return -90 + (biasedSpeed / maxSpeed) * 180 + 12;
  };

  const currentSpeed = avgSpeed ? parseFloat(avgSpeed) : 0;
  const needleAngle = calculateNeedleAngle(animatedSpeed);

  const handleShare = async () => {
    if (!shareRef.current) return;

    try {
      toast.info("Generowanie obrazu...");
      
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        onclone: (clonedDoc) => {
          // Make street name and eJedzie.pl branding visible in the screenshot
          const streetName = clonedDoc.querySelector('h2.opacity-0');
          if (streetName) {
            (streetName as HTMLElement).style.opacity = '1';
            (streetName as HTMLElement).style.height = 'auto';
          }
          const branding = clonedDoc.querySelector('.absolute.bottom-2.right-2');
          if (branding) {
            (branding as HTMLElement).style.opacity = '1';
          }
          // Add extra bottom padding for the exported image
          const container = clonedDoc.querySelector('.relative.flex.flex-col.items-center');
          if (container) {
            (container as HTMLElement).style.paddingBottom = '4rem';
          }
        }
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Nie udało się utworzyć obrazu");
          return;
        }

        const file = new File([blob], "frustration-level.png", { type: "image/png" });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Poziom frustracji w korku",
              text: `Moja prędkość: ${currentSpeed.toFixed(0)} km/h - ${FRUSTRATION_TEXTS[Math.round(currentSpeed)] || FRUSTRATION_TEXTS[0]}`,
            });
            toast.success("Udostępniono!");
          } catch (err) {
            if ((err as Error).name !== "AbortError") {
              toast.error("Nie udało się udostępnić");
            }
          }
        } else {
          // Fallback: download image
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "frustration-level.png";
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Obraz został pobrany");
        }
      }, "image/png");
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Wystąpił błąd podczas udostępniania");
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs" style={{ color: '#94a3b8' }}>
        <span>
          Średni czas przejazdu: {durationMinutes > 0 && `${durationMinutes} min`} {distanceKm && `Dystans: ${distanceKm} km`} {avgSpeed && `Średnia prędkość: ${avgSpeed} km/h`}
        </span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        {(() => {
          const linePercent = avgSpeed ? Math.max(0, Math.min(100, 70 - parseFloat(avgSpeed))) : trafficPercent;
          
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
      
      {/* Speedometer Gauge */}
      <div ref={shareRef} className="relative flex flex-col items-center mt-2 p-6 pb-8 bg-white rounded-lg">
        {/* Street Name at Top - hidden in UI, visible in export */}
        <h2 className="text-2xl font-bold text-gray-900 opacity-0 h-0 mb-4">{street}</h2>
        
        <svg width="300" height="180" viewBox="0 0 300 180" className="drop-shadow-lg">
          {/* Outer circle background */}
          <circle cx="150" cy="150" r="120" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
          
          {/* Background arc */}
          <path
            d="M 40 150 A 110 110 0 0 1 260 150"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
            strokeLinecap="butt"
          />
          
          {/* Fire emoji for danger zone (0-5 km/h) */}
          <text x="42" y="135" fontSize="24">🔥</text>
          
          {/* Red zone (5-10 km/h) */}
          <path
            d="M 56 106 A 110 110 0 0 1 78 72"
            fill="none"
            stroke="#dc2626"
            strokeWidth="20"
            strokeLinecap="butt"
          />
          
          {/* Tick mark at 10 km/h */}
          <line x1="78" y1="72" x2="88" y2="82" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
          
          {/* Yellow zone (10-20 km/h) - 20% of arc */}
          <path
            d="M 78 72 A 110 110 0 0 1 150 40"
            fill="none"
            stroke="#eab308"
            strokeWidth="20"
            strokeLinecap="butt"
          />
          
          {/* Tick mark at 20 km/h */}
          <line x1="150" y1="40" x2="150" y2="50" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
          
          {/* Green zone (20-50 km/h) - 60% of arc */}
          <path
            d="M 150 40 A 110 110 0 0 1 260 150"
            fill="none"
            stroke="#16a34a"
            strokeWidth="20"
            strokeLinecap="butt"
          />
          
          {/* Speed markers with tick lines */}
          {/* 0 km/h */}
          <line x1="40" y1="150" x2="50" y2="150" stroke="#1f2937" strokeWidth="2" />
          <text x="25" y="155" fontSize="14" fill="#000000" fontWeight="600">0</text>
          
          {/* 5 km/h */}
          <text x="41" y="100" fontSize="14" fill="#000000" fontWeight="600">5</text>
          
          {/* 10 km/h */}
          <text x="63" y="60" fontSize="14" fill="#000000" fontWeight="600">10</text>
          
          {/* 20 km/h */}
          <text x="143" y="20" fontSize="14" fill="#000000" fontWeight="600">20</text>
          
          {/* 30 km/h */}
          <line x1="222" y1="72" x2="212" y2="82" stroke="#1f2937" strokeWidth="2" />
          <text x="223" y="60" fontSize="14" fill="#000000" fontWeight="600">30</text>
          
          {/* 40 km/h */}
          <line x1="250" y1="110" x2="240" y2="115" stroke="#1f2937" strokeWidth="2" />
          <text x="253" y="108" fontSize="14" fill="#000000" fontWeight="600">40</text>
          
          {/* 50 km/h */}
          <line x1="260" y1="150" x2="250" y2="150" stroke="#1f2937" strokeWidth="2" />
          <text x="263" y="155" fontSize="14" fill="#000000" fontWeight="600">50</text>
          
          {/* Minor tick marks every 5 km/h - removed the one at 5 since it's now a major mark */}
          <line x1="109" y1="56" x2="114" y2="62" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="150" y1="40" x2="150" y2="50" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="238" y1="82" x2="232" y2="88" stroke="#94a3b8" strokeWidth="1.5" />
          
          {/* Center circle */}
          <circle cx="150" cy="150" r="10" fill="#1f2937" />
          
          {/* Needle shadow */}
          <line
            x1="150"
            y1="150"
            x2="150"
            y2="55"
            stroke="#00000020"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${needleAngle} 150 150) translate(2, 2)`}
            style={{ transition: 'transform 1s ease-in-out' }}
          />
          
          {/* Needle */}
          <line
            x1="150"
            y1="150"
            x2="150"
            y2="55"
            stroke="#1f2937"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${needleAngle} 150 150)`}
            style={{ transition: 'transform 1s ease-in-out' }}
          />
          
          
          {/* Center bolt */}
          <circle cx="150" cy="150" r="6" fill="#374151" />
          <circle cx="150" cy="150" r="3" fill="#1f2937" />
        </svg>
        
        {/* Speed display below gauge */}
        <div className="mt-2 text-center">
          <div className="text-4xl font-bold text-gray-900">
            {currentSpeed.toFixed(0)}
          </div>
          <div className="text-sm text-gray-500 font-medium">
            km/h
          </div>
        </div>
        
        {/* Frustration Level */}
        <div className="mt-6 text-center px-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Poziom frustracji
          </h3>
          <p className="text-sm text-gray-600 italic max-w-md mx-auto">
            {FRUSTRATION_TEXTS[Math.round(currentSpeed)] || FRUSTRATION_TEXTS[0]}
          </p>
        </div>
        
        {/* eJedzie.pl Branding - hidden in UI, visible in export */}
        <div className="absolute bottom-2 right-2 text-black font-medium opacity-0" style={{ fontSize: '9.6px' }}>
          eJedzie.pl
        </div>
      </div>
      
      {/* Share Button - Outside of captured area */}
      <div className="flex justify-center mt-4">
        <Button
          onClick={handleShare}
          variant="default"
          size="sm"
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          Udostępnij
        </Button>
      </div>
    </div>
  );
};
