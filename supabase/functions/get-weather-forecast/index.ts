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

interface WeatherSlot {
  timeFrom: string;
  timeTo: string;
  rainPercent: number;
  rainfallMillis: number;
}

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function interpolateWeatherData(hour1: any, hour2: any, intervalMinutes: number): WeatherSlot[] {
  const slots: WeatherSlot[] = [];
  
  const rain1 = hour1.precipitation?.value || 0;
  const rain2 = hour2.precipitation?.value || 0;
  const prob1 = hour1.precipitationProbability || 0;
  const prob2 = hour2.precipitationProbability || 0;
  
  const time1 = new Date(hour1.interval.startTime);
  const time2 = new Date(hour2.interval.startTime);
  
  // Create 3 slots of 20 minutes each for the hour
  for (let i = 0; i < 3; i++) {
    const slotStart = new Date(time1.getTime() + i * 20 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 20 * 60 * 1000);
    
    // Linear interpolation based on position within the hour
    const position = i / 3;
    const interpolatedRain = rain1 + (rain2 - rain1) * position;
    const interpolatedProb = prob1 + (prob2 - prob1) * position;
    
    // Calculate rain for 20-minute period (divide hourly by 3)
    const slotRain = interpolatedRain / 3;
    
    slots.push({
      timeFrom: `${slotStart.getHours().toString().padStart(2, '0')}:${slotStart.getMinutes().toString().padStart(2, '0')}`,
      timeTo: `${slotEnd.getHours().toString().padStart(2, '0')}:${slotEnd.getMinutes().toString().padStart(2, '0')}`,
      rainPercent: Math.round(interpolatedProb * 100),
      rainfallMillis: Math.round(slotRain * 10) / 10, // Round to 1 decimal
    });
  }
  
  return slots;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, street }: WeatherRequest = await req.json();
    
    console.log('[get-weather-forecast] Request for:', { latitude, longitude, street });
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check database cache first
    if (street) {
      const { data: cachedData, error: cacheError } = await supabase
        .from('weather_cache')
        .select('weather_data, cached_at')
        .eq('street', street)
        .single();
      
      if (!cacheError && cachedData) {
        const cachedAt = new Date(cachedData.cached_at).getTime();
        const now = Date.now();
        
        if ((now - cachedAt) < CACHE_DURATION_MS) {
          console.log('[get-weather-forecast] Returning cached data from database');
          return new Response(
            JSON.stringify(cachedData.weather_data),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    }
    
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('[get-weather-forecast] Google Maps API key not configured');
      throw new Error('Google Maps API key not configured');
    }

    console.log('[get-weather-forecast] Calling Google Weather API');

    // Call Google Weather API
    const url = 'https://weather.googleapis.com/v1/forecast/hours:lookup';
    const params = new URLSearchParams({
      key: apiKey,
      'location.latitude': latitude.toString(),
      'location.longitude': longitude.toString(),
    });

    const response = await fetch(`${url}?${params.toString()}`);
    console.log('[get-weather-forecast] Weather API HTTP status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[get-weather-forecast] Weather API error:', response.status, errorText);
      throw new Error(`Weather API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[get-weather-forecast] ===== RAW WEATHER API RESPONSE =====');
    console.log('[get-weather-forecast] Full response structure:', JSON.stringify(data, null, 2));
    
    if (!data.forecastHours || !Array.isArray(data.forecastHours)) {
      console.error('[get-weather-forecast] No forecast hours in response');
      throw new Error('No forecast data available');
    }

    console.log('[get-weather-forecast] Total forecast hours received:', data.forecastHours.length);

    // Get current time and filter for next 3 hours to ensure we have enough data
    const currentTime = new Date();
    const threeHoursLater = new Date(currentTime.getTime() + 3 * 60 * 60 * 1000);
    
    console.log('[get-weather-forecast] Current time:', currentTime.toISOString());
    console.log('[get-weather-forecast] Filtering for next 3 hours until:', threeHoursLater.toISOString());
    
    const relevantHours = data.forecastHours.filter((hour: any) => {
      const hourTime = new Date(hour.interval.startTime);
      return hourTime >= currentTime && hourTime <= threeHoursLater;
    }).slice(0, 4); // Get up to 4 hours for better interpolation

    console.log('[get-weather-forecast] Found', relevantHours.length, 'relevant hours');
    
    // Log detailed precipitation data for each relevant hour
    relevantHours.forEach((hour: any, idx: number) => {
      console.log(`[get-weather-forecast] Hour ${idx + 1}:`, {
        time: hour.interval.startTime,
        precipitation_mm: hour.precipitation?.value || 0,
        precipitation_prob_percent: (hour.precipitationProbability || 0) * 100,
        temperature_c: hour.temperature?.value || 'N/A',
        humidity_percent: hour.humidity || 'N/A',
        raw_precipitation_object: JSON.stringify(hour.precipitation || {}),
        raw_precipitation_prob: hour.precipitationProbability
      });
    });

    if (relevantHours.length < 2) {
      console.error('[get-weather-forecast] Not enough forecast data');
      throw new Error('Insufficient forecast data');
    }

    // Create 20-minute slots
    const allSlots: WeatherSlot[] = [];
    
    for (let i = 0; i < relevantHours.length - 1; i++) {
      const slots = interpolateWeatherData(relevantHours[i], relevantHours[i + 1], 20);
      allSlots.push(...slots);
    }

    // Filter slots to only those within the next 2 hours from now
    const twoHoursLater = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);
    
    const filteredSlots = allSlots.filter(slot => {
      const [hours, minutes] = slot.timeFrom.split(':').map(Number);
      const slotTime = new Date(currentTime);
      slotTime.setHours(hours, minutes, 0, 0);
      
      // Handle day boundary
      if (hours < currentTime.getHours()) {
        slotTime.setDate(slotTime.getDate() + 1);
      }
      
      return slotTime >= currentTime && slotTime < twoHoursLater;
    });
    
    // Ensure we always return exactly 6 slots (even if some extend slightly beyond 2 hours)
    const finalSlots = filteredSlots.length >= 6 ? filteredSlots.slice(0, 6) : allSlots.slice(0, 6);

    // Sort by best weather conditions (lowest rain probability, then lowest rainfall)
    const sortedSlots = [...finalSlots].sort((a, b) => {
      if (a.rainPercent !== b.rainPercent) {
        return a.rainPercent - b.rainPercent;
      }
      return a.rainfallMillis - b.rainfallMillis;
    });

    console.log('[get-weather-forecast] ===== FINAL PROCESSED SLOTS =====');
    console.log('[get-weather-forecast] Generated', sortedSlots.length, 'slots for 2 hours');
    sortedSlots.forEach((slot, idx) => {
      console.log(`[get-weather-forecast] Slot ${idx + 1}:`, {
        time: `${slot.timeFrom} - ${slot.timeTo}`,
        rain_percent: slot.rainPercent,
        rainfall_mm: slot.rainfallMillis
      });
    });
    
    // Add metadata to response
    const responseWithMeta = {
      slots: sortedSlots,
      meta: {
        location: { latitude, longitude, street },
        generatedAt: new Date().toISOString(),
        source: 'Google Weather API',
        dataFreshness: 'live'
      }
    };

    // Cache the results in database
    if (street) {
      const { error: upsertError } = await supabase
        .from('weather_cache')
        .upsert({
          street,
          latitude,
          longitude,
          weather_data: responseWithMeta,
          cached_at: new Date().toISOString(),
        }, {
          onConflict: 'street'
        });
      
      if (upsertError) {
        console.error('[get-weather-forecast] Error caching weather data:', upsertError);
      } else {
        console.log('[get-weather-forecast] Weather data cached in database');
      }
    }

    // Clean old cache entries (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabase
      .from('weather_cache')
      .delete()
      .lt('cached_at', oneHourAgo);

    return new Response(
      JSON.stringify(responseWithMeta),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in get-weather-forecast function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
