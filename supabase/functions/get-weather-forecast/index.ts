import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherRequest {
  latitude: number;
  longitude: number;
}

interface WeatherSlot {
  timeFrom: string;
  timeTo: string;
  rainPercent: number;
  rainfallMillis: number;
}

// Cache weather data for 10 minutes per location
const weatherCache = new Map<string, { data: WeatherSlot[], timestamp: number }>();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
}

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
    const { latitude, longitude }: WeatherRequest = await req.json();
    
    console.log('[get-weather-forecast] Request for:', { latitude, longitude });
    
    // Check cache first
    const cacheKey = getCacheKey(latitude, longitude);
    const cached = weatherCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION_MS) {
      console.log('[get-weather-forecast] Returning cached data');
      return new Response(
        JSON.stringify(cached.data),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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
    console.log('[get-weather-forecast] Weather API response received');
    
    if (!data.forecastHours || !Array.isArray(data.forecastHours)) {
      console.error('[get-weather-forecast] No forecast hours in response');
      throw new Error('No forecast data available');
    }

    // Get current time and filter for next 3 hours to ensure we have enough data
    const currentTime = new Date();
    const threeHoursLater = new Date(currentTime.getTime() + 3 * 60 * 60 * 1000);
    
    const relevantHours = data.forecastHours.filter((hour: any) => {
      const hourTime = new Date(hour.interval.startTime);
      return hourTime >= currentTime && hourTime <= threeHoursLater;
    }).slice(0, 4); // Get up to 4 hours for better interpolation

    console.log('[get-weather-forecast] Found', relevantHours.length, 'relevant hours');

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

    console.log('[get-weather-forecast] Generated', sortedSlots.length, 'slots for 2 hours');

    // Cache the results
    weatherCache.set(cacheKey, {
      data: sortedSlots,
      timestamp: now,
    });

    // Clean old cache entries
    for (const [key, value] of weatherCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION_MS) {
        weatherCache.delete(key);
      }
    }

    return new Response(
      JSON.stringify(sortedSlots),
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
