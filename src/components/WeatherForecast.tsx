import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsUp, CloudRain } from "lucide-react";

interface WeatherSlot {
  timeFrom: string;
  timeTo: string;
  rainPercent: number;
  rainfallMillis: number;
}

interface WeatherResponse {
  slots: WeatherSlot[];
  meta: {
    location: { latitude: number; longitude: number; street?: string };
    generatedAt: string;
    source: string;
    dataFreshness: string;
  };
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
  const [weatherMeta, setWeatherMeta] = useState<WeatherResponse['meta'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const coords = STREET_COORDINATES[street];
        if (!coords) {
          console.warn(`[WeatherForecast] No coordinates found for street: ${street}`);
          setError(`Brak współrzędnych dla ulicy: ${street}`);
          setIsLoading(false);
          return;
        }

        // Use center point of the street
        const latitude = (coords.start.lat + coords.end.lat) / 2;
        const longitude = (coords.start.lng + coords.end.lng) / 2;

        console.log(`[WeatherForecast] Fetching weather for ${street}:`, { latitude, longitude });

        const { data, error: invokeError } = await supabase.functions.invoke('get-weather-forecast', {
          body: { latitude, longitude, street }
        });

        if (invokeError) {
          console.error('[WeatherForecast] Error fetching weather:', invokeError);
          setError(`Błąd pobierania danych: ${invokeError.message}`);
          setIsLoading(false);
          return;
        }

        console.log('[WeatherForecast] Raw response:', data);

        // Handle both old format (array) and new format (object with slots and meta)
        if (data) {
          if (Array.isArray(data)) {
            // Old format - backward compatibility
            console.log(`[WeatherForecast] Received ${data.length} weather slots (legacy format)`);
            setWeatherSlots(data);
            setWeatherMeta(null);
          } else if (data.slots && Array.isArray(data.slots)) {
            // New format with metadata
            console.log(`[WeatherForecast] Received ${data.slots.length} weather slots with metadata`);
            console.log('[WeatherForecast] Metadata:', data.meta);
            setWeatherSlots(data.slots);
            setWeatherMeta(data.meta);
          } else {
            console.error('[WeatherForecast] Unexpected data format:', data);
            setError('Nieprawidłowy format danych pogodowych');
          }
        }
      } catch (error) {
        console.error('[WeatherForecast] Error:', error);
        setError(`Błąd: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, [street]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-background dark:to-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <CloudRain className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Jeździsz rowerem lub motocyklem?
              </h3>
              <p className="text-sm text-muted-foreground">
                Wyjedź, gdy nie będzie padać
              </p>
            </div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Najlepsze 20 minut by nie zmoknąć w ciągu najbliższych 2 godzin
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || weatherSlots.length === 0) {
    return (
      <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-background dark:to-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <CloudRain className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Jeździsz rowerem lub motocyklem?
              </h3>
              <p className="text-sm text-muted-foreground">
                Wyjedź, gdy nie będzie padać
              </p>
            </div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Najlepsze 20 minut by nie zmoknąć w ciągu najbliższych 2 godzin
            </p>
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {error || 'Brak danych pogodowych'}
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
            Sprawdź logi konsoli przeglądarki i edge function 'get-weather-forecast' aby zdiagnozować problem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-background dark:to-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse">
          <CloudRain className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Jeździsz rowerem lub motocyklem?
            </h3>
            <p className="text-sm text-muted-foreground">
              Wyjedź, gdy nie będzie padać
            </p>
          </div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Najlepsze 20 minut by nie zmoknąć w ciągu najbliższych 2 godzin
          </p>
        </div>
      </div>
      
      {weatherMeta && (
        <div className="text-xs text-muted-foreground bg-blue-50/50 dark:bg-blue-950/30 rounded p-2 border border-blue-200/30 dark:border-blue-800/30">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span>📍 Lokalizacja: {weatherMeta.location.latitude.toFixed(4)}, {weatherMeta.location.longitude.toFixed(4)}</span>
            <span>🕐 Wygenerowano: {new Date(weatherMeta.generatedAt).toLocaleTimeString('pl-PL')}</span>
            <span>📡 Źródło: {weatherMeta.source}</span>
          </div>
        </div>
      )}
      
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
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
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
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                <span className="whitespace-nowrap">
                  Szansa na deszcz <strong>{slot.rainPercent}%</strong>
                </span>
                <span className="whitespace-nowrap">
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
