import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsUp, Umbrella } from "lucide-react";

interface WeatherSlot {
  timeFrom: string;
  timeTo: string;
  rainPercent: number;
  rainfallMillis: number;
}

interface StreetCoordinates {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
}

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

interface Props {
  street: string;
}

export const WeatherForecast = ({ street }: Props) => {
  const [weatherSlots, setWeatherSlots] = useState<WeatherSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoading(true);
      
      try {
        const coords = STREET_COORDINATES[street];
        if (!coords) {
          console.warn(`[WeatherForecast] No coordinates found for street: ${street}`);
          setIsLoading(false);
          return;
        }

        // Use center point of the street
        const latitude = (coords.start.lat + coords.end.lat) / 2;
        const longitude = (coords.start.lng + coords.end.lng) / 2;

        console.log(`[WeatherForecast] Fetching weather for ${street}:`, { latitude, longitude });

        const { data, error } = await supabase.functions.invoke('get-weather-forecast', {
          body: { latitude, longitude, street }
        });

        if (error) {
          console.error('[WeatherForecast] Error fetching weather:', error);
          setIsLoading(false);
          return;
        }

        if (data && Array.isArray(data)) {
          console.log(`[WeatherForecast] Received ${data.length} weather slots`);
          setWeatherSlots(data);
        }
      } catch (error) {
        console.error('[WeatherForecast] Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, [street]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div>
            <h3 className="text-lg font-semibold">
              Jeździsz rowerem lub motocyklem?
            </h3>
            <p className="text-sm text-muted-foreground">
              Wyjedź, gdy nie będzie padać
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Najlepsze 20 minut by nie zmoknąć w ciągu najbliższych 2 godzin
            </p>
            <Umbrella className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (weatherSlots.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div>
            <h3 className="text-lg font-semibold">
              Jeździsz rowerem lub motocyklem?
            </h3>
            <p className="text-sm text-muted-foreground">
              Wyjedź, gdy nie będzie padać
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Najlepsze 20 minut by nie zmoknąć w ciągu najbliższych 2 godzin
            </p>
            <Umbrella className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Brak danych pogodowych
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div>
          <h3 className="text-lg font-semibold">
            Jeździsz rowerem lub motocyklem?
          </h3>
          <p className="text-sm text-muted-foreground">
            Wyjedź, gdy nie będzie padać
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Najlepsze 20 minut by nie zmoknąć w ciągu najbliższych 2 godzin
          </p>
          <Umbrella className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        {weatherSlots.map((slot, index) => {
          // Find minimum rainfall
          const minRainfall = Math.min(...weatherSlots.map(s => s.rainfallMillis));
          const isMinRainfall = slot.rainfallMillis === minRainfall;
          const isFirstMinRainfall = isMinRainfall && weatherSlots.findIndex(s => s.rainfallMillis === minRainfall) === index;
          
          // Calculate background color based on rainfall (0-20mm scale)
          const rainfallCapped = Math.min(slot.rainfallMillis, 20);
          const intensity = rainfallCapped / 20; // 0 to 1
          
          // Create blue color gradient: lighter blue (low rain) to darker blue (high rain)
          const lightness = Math.round(95 - (intensity * 35)); // 95% to 60%
          const bgColor = `hsl(210 100% ${lightness}%)`;
          const borderLightness = Math.round(70 - (intensity * 30)); // 70% to 40%
          const borderColor = `hsl(210 100% ${borderLightness}%)`;

          return (
            <div
              key={index}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border"
              style={{ 
                backgroundColor: bgColor,
                borderColor: borderColor
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {slot.timeFrom} - {slot.timeTo}
                </span>
                {isFirstMinRainfall && (
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>
                  Szansa na deszcz <strong>{slot.rainPercent}%</strong>
                </span>
                <span>
                  Opady <strong>{slot.rainfallMillis} mm</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
