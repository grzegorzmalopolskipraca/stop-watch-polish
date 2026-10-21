import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherRequest {
  latitude: number;
  longitude: number;
  street?: string;
}

interface TomTomHour {
  dateTime: string;
  dateTimeLocal?: string;
  temperature?: number;
  weatherCode?: string;
  windSpeed?: number;
  precipitationProbability?: number;
  precipitation?: number;
  pressure?: number;
  relativeHumidity?: number;
}

interface WeatherSlot {
  timeFrom: string;
  timeTo: string;
  rainPercent: number;
  rainfallMillis: number;
}

const CACHE_DURATION_MS = 2 * 60 * 1000;

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

function createSlots(hours: TomTomHour[], now: Date): WeatherSlot[] {
  const upcoming = hours
    .filter((hour) => Number.isFinite(Date.parse(hour.dateTime)) && Date.parse(hour.dateTime) >= now.getTime())
    .slice(0, 5);

  const slots: Array<WeatherSlot & { endTimestamp: number }> = [];
  for (let index = 0; index < upcoming.length; index++) {
    const current = upcoming[index];
    const next = upcoming[index + 1] ?? current;
    const start = current.dateTimeLocal?.slice(11, 16) ?? new Date(current.dateTime).toISOString().slice(11, 16);
    const rainNow = current.precipitation ?? 0;
    const rainNext = next.precipitation ?? rainNow;
    const probabilityNow = current.precipitationProbability ?? 0;
    const probabilityNext = next.precipitationProbability ?? probabilityNow;

    for (let part = 0; part < 3; part++) {
      const ratio = part / 3;
      const rainfall = rainNow + (rainNext - rainNow) * ratio;
      const rainPercent = probabilityNow + (probabilityNext - probabilityNow) * ratio;
      const timeFrom = addMinutes(start, part * 20);
      slots.push({
        timeFrom,
        timeTo: addMinutes(timeFrom, 20),
        rainPercent: Math.round(rainPercent),
        rainfallMillis: Math.round((rainfall / 3) * 10) / 10,
        endTimestamp: Date.parse(current.dateTime) + (part + 1) * 20 * 60 * 1000,
      });
    }
  }

  return slots
    .filter((slot) => slot.endTimestamp > now.getTime() && slot.endTimestamp <= now.getTime() + 2 * 60 * 60 * 1000)
    .slice(0, 12)
    .map(({ timeFrom, timeTo, rainPercent, rainfallMillis }) => ({ timeFrom, timeTo, rainPercent, rainfallMillis }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { latitude, longitude, street }: WeatherRequest = await req.json();
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(JSON.stringify({ error: 'Valid latitude and longitude are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (street) {
      const { data: cached } = await supabase
        .from('weather_cache')
        .select('weather_data, cached_at')
        .eq('street', street)
        .single();
      if (cached && Date.now() - new Date(cached.cached_at).getTime() < CACHE_DURATION_MS) {
        return new Response(JSON.stringify(cached.weather_data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const apiKey = Deno.env.get('TOMTOM_API_KEY');
    if (!apiKey) throw new Error('TOMTOM_API_KEY is not configured');

    const url = new URL('https://api.tomtom.com/weatherforecast/v1/hourly');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('forecastHours', '5');
    url.searchParams.set('key', apiKey);

    const upstream = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) {
      const errorText = (await upstream.text()).slice(0, 300);
      console.error('[get-weather-forecast] TomTom Weather API failed:', upstream.status, errorText);
      throw new Error(`TomTom Weather API returned ${upstream.status}`);
    }

    const data = await upstream.json();
    const hours: TomTomHour[] = data?.data?.hourlyWeatherInfo ?? [];
    if (hours.length < 2) throw new Error('TomTom returned insufficient hourly forecast data');

    const now = new Date();
    const slots = createSlots(hours, now);
    const currentHour = hours.find((hour) => Date.parse(hour.dateTime) >= now.getTime()) ?? hours[0];
    const responseData = {
      slots,
      currentConditions: {
        temperature: currentHour.temperature ?? null,
        condition: currentHour.weatherCode ?? null,
        humidity: currentHour.relativeHumidity ?? null,
        windSpeed: currentHour.windSpeed == null ? null : Math.round(currentHour.windSpeed * 3.6),
        pressure: currentHour.pressure ?? null,
        visibility: null,
      },
      meta: {
        location: { latitude, longitude, street },
        generatedAt: new Date().toISOString(),
        source: 'TomTom Weather API',
        dataFreshness: 'live',
      },
    };

    if (street) {
      const { error } = await supabase.from('weather_cache').upsert({
        street,
        latitude,
        longitude,
        weather_data: responseData,
        cached_at: new Date().toISOString(),
      }, { onConflict: 'street' });
      if (error) console.error('[get-weather-forecast] Failed to cache forecast:', error.message);
    }

    await supabase.from('weather_cache').delete().lt('cached_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get-weather-forecast] Request failed:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
