import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrafficRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

// Dynamic cache duration based on time of day
// Rush hours: shorter cache for fresh data
// Off-peak: longer cache to save costs
function getCacheDuration(): number {
  const hour = new Date().getHours();

  // Rush hours: 7-10 AM, 4-7 PM - fresh data matters
  if ((hour >= 7 && hour <= 10) || (hour >= 16 && hour <= 19)) {
    return 10 * 60 * 1000; // 10 minutes
  }

  // Mid-day / evening - slower traffic changes
  return 30 * 60 * 1000; // 30 minutes
}

// Create a cache key from route coordinates
function createCacheKey(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): string {
  return `route_${origin.lat.toFixed(6)}_${origin.lng.toFixed(6)}_to_${destination.lat.toFixed(6)}_${destination.lng.toFixed(6)}`;
}

// IP-based rate limiting: max 10 requests per IP per minute
async function checkIPRateLimit(supabase: any, clientIP: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', `ip_${clientIP}`)
    .eq('action_type', 'traffic_data_request')
    .gte('last_action_at', oneMinuteAgo);

  if (error) {
    console.error('Rate limit check error:', error);
    return true; // Fail open to avoid blocking legitimate users on errors
  }

  if (data && data.length >= 10) {
    return false; // Rate limit exceeded
  }

  // Record this request
  await supabase.from('rate_limits').insert({
    identifier: `ip_${clientIP}`,
    action_type: 'traffic_data_request',
    action_count: 1,
    last_action_at: new Date().toISOString(),
  });

  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const funcStart = Date.now();
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`Traffic data request from IP: ${clientIP}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { origin, destination }: TrafficRequest = await req.json();

    console.log('[get-traffic-data] Request body:', { origin, destination });

    // Check route-based cache first (serve without touching rate limits)
    const cacheKey = createCacheKey(origin, destination);
    const cacheDuration = getCacheDuration();
    const cacheDurationMinutes = Math.floor(cacheDuration / (60 * 1000));

    const { data: cachedData, error: cacheError } = await supabase
      .from('traffic_cache')
      .select('traffic_data, cached_at')
      .eq('route_key', cacheKey)
      .single();

    if (!cacheError && cachedData) {
      const cachedAt = new Date(cachedData.cached_at).getTime();
      const nowTs = Date.now();
      const cacheAge = (nowTs - cachedAt) / 1000; // in seconds

      if ((nowTs - cachedAt) < cacheDuration) {
        console.log(`[get-traffic-data] Cache HIT for route (age: ${cacheAge.toFixed(0)}s, max: ${cacheDurationMinutes}min)`);
        return new Response(
          JSON.stringify(cachedData.traffic_data),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        console.log(`[get-traffic-data] Cache EXPIRED for route (age: ${cacheAge.toFixed(0)}s, max: ${cacheDurationMinutes}min)`);
      }
    } else {
      console.log('[get-traffic-data] Cache MISS for route');
    }

    // Enforce rate limit only for cache misses/refreshes
    const allowed = await checkIPRateLimit(supabase, clientIP);
    if (!allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('[get-traffic-data] Google Maps API key not configured');
      throw new Error('Google Maps API key not configured');
    }

    console.log('[get-traffic-data] Calling Google Directions API for route:', { origin, destination });

    // Use Directions API for real-time traffic data
    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      departure_time: 'now', // Use 'now' for real-time traffic
      traffic_model: 'best_guess',
      key: apiKey
    });

    const gStart = Date.now();
    const response = await fetch(`${url}?${params.toString()}`);
    const gEnd = Date.now();
    console.log('[get-traffic-data] Google API HTTP status:', response.status, `latency: ${gEnd - gStart}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[get-traffic-data] Google Maps API error:', response.status, errorText);
      throw new Error(`Google Maps API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[get-traffic-data] Google Directions API response received');
    
    if (data.status !== 'OK') {
      console.error('[get-traffic-data] Directions API error:', data.status, data.error_message);
      throw new Error(`Directions API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    const routesCount = Array.isArray(data?.routes) ? data.routes.length : 0;
    const route = routesCount > 0 ? data.routes[0] : null;
    
    if (route && route.legs && route.legs.length > 0) {
      const leg = route.legs[0];
      console.log('[get-traffic-data] Summary -> routes:', routesCount, 
        'distance:', leg.distance?.value, 
        'duration:', leg.duration?.value,
        'duration_in_traffic:', leg.duration_in_traffic?.value);
    } else {
      console.warn('[get-traffic-data] No routes returned by Google.');
    }
    console.log('[get-traffic-data] Function total time:', `${Date.now() - funcStart}ms`);

    // Cache the response
    const { error: upsertError } = await supabase
      .from('traffic_cache')
      .upsert({
        route_key: cacheKey,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        traffic_data: data,
        cached_at: new Date().toISOString(),
      }, {
        onConflict: 'route_key'
      });
    
    if (upsertError) {
      console.error('[get-traffic-data] Cache upsert error:', upsertError);
      // Don't fail the request if caching fails
    } else {
      console.log('[get-traffic-data] Response cached successfully');
    }

    // Clean old cache entries (older than max cache duration - use 60 min to be safe)
    const maxCacheDuration = 60 * 60 * 1000; // 60 minutes
    const cacheExpiryCutoff = new Date(Date.now() - maxCacheDuration).toISOString();
    await supabase
      .from('traffic_cache')
      .delete()
      .lt('cached_at', cacheExpiryCutoff);

    return new Response(
      JSON.stringify(data),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in get-traffic-data function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
