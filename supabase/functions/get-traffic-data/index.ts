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
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hour * 60 + minutes;

  // Rush hours: 6:30 AM (390 min) - 8:00 PM (1200 min) - fresh data matters
  if (timeInMinutes >= 390 && timeInMinutes < 1200) {
    return 10 * 60 * 1000; // 10 minutes
  }

  // Off-peak: 8:00 PM - 6:30 AM - slower traffic changes
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
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    const isInternalCall = req.headers.get('x-internal-call') === 'true' ||
                          clientIP === 'unknown' ||
                          clientIP.includes('127.0.0.1') ||
                          clientIP.includes('::1');

    console.log(`Traffic data request from IP: ${clientIP}${isInternalCall ? ' (internal)' : ''}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { origin, destination }: TrafficRequest = await req.json();
    console.log('[get-traffic-data] Request body:', { origin, destination });

    const cacheKey = createCacheKey(origin, destination);
    const cacheDuration = getCacheDuration();
    const cacheDurationMinutes = Math.floor(cacheDuration / (60 * 1000));

    // Check for cached distance (permanent)
    const { data: distanceData } = await supabase
      .from('street_distances')
      .select('distance_meters')
      .eq('route_key', cacheKey)
      .single();

    let cachedDistance: number | null = distanceData?.distance_meters || null;
    if (cachedDistance) {
      console.log(`[get-traffic-data] Using cached distance: ${cachedDistance}m`);
    }

    // Check traffic cache for duration
    const { data: cachedData, error: cacheError } = await supabase
      .from('traffic_cache')
      .select('traffic_data, cached_at')
      .eq('route_key', cacheKey)
      .single();

    if (!cacheError && cachedData) {
      const cachedAt = new Date(cachedData.cached_at).getTime();
      const nowTs = Date.now();
      const cacheAge = (nowTs - cachedAt) / 1000;

      if ((nowTs - cachedAt) < cacheDuration) {
        console.log(`[get-traffic-data] Cache HIT (age: ${cacheAge.toFixed(0)}s, max: ${cacheDurationMinutes}min)`);
        return new Response(
          JSON.stringify(cachedData.traffic_data),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } else {
        console.log(`[get-traffic-data] Cache EXPIRED (age: ${cacheAge.toFixed(0)}s)`);
      }
    } else {
      console.log('[get-traffic-data] Cache MISS');
    }

    if (!isInternalCall) {
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
    } else {
      console.log(`[get-traffic-data] Skipping rate limit for internal call`);
    }
    
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('[get-traffic-data] Google Maps API key not configured');
      throw new Error('Google Maps API key not configured');
    }

    console.log('[get-traffic-data] Calling Google Routes API');

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng
          }
        }
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: 'pl',
      units: 'METRIC'
    };

    const gStart = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.staticDuration'
      },
      body: JSON.stringify(requestBody)
    });
    const gEnd = Date.now();
    console.log('[get-traffic-data] Routes API status:', response.status, `latency: ${gEnd - gStart}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[get-traffic-data] Routes API error:', response.status, errorText);
      throw new Error(`Google Routes API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      console.warn('[get-traffic-data] No routes returned');
      throw new Error('No routes found');
    }

    const route = data.routes[0];
    const distanceMeters = route.distanceMeters;
    const durationSeconds = parseInt(route.duration?.replace('s', '') || '0');
    const staticDurationSeconds = parseInt(route.staticDuration?.replace('s', '') || '0');

    console.log('[get-traffic-data] API data -> distance:', distanceMeters, 'duration:', durationSeconds);

    // Cache distance permanently if not already cached
    if (!cachedDistance) {
      console.log('[get-traffic-data] Caching distance permanently:', distanceMeters);
      await supabase
        .from('street_distances')
        .upsert({
          route_key: cacheKey,
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          destination_lat: destination.lat,
          destination_lng: destination.lng,
          distance_meters: distanceMeters,
        }, {
          onConflict: 'route_key'
        });
    }

    const legacyFormat = {
      routes: [{
        legs: [{
          distance: {
            value: distanceMeters,
            text: `${(distanceMeters / 1000).toFixed(1)} km`
          },
          duration: {
            value: staticDurationSeconds,
            text: `${Math.round(staticDurationSeconds / 60)} min`
          },
          duration_in_traffic: {
            value: durationSeconds,
            text: `${Math.round(durationSeconds / 60)} min`
          }
        }]
      }],
      status: 'OK'
    };
    
    console.log('[get-traffic-data] Total time:', `${Date.now() - funcStart}ms`);

    // Cache traffic data
    await supabase
      .from('traffic_cache')
      .upsert({
        route_key: cacheKey,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        traffic_data: legacyFormat,
        cached_at: new Date().toISOString(),
      }, {
        onConflict: 'route_key'
      });

    // Clean old traffic cache entries
    const maxCacheDuration = 60 * 60 * 1000;
    const cacheExpiryCutoff = new Date(Date.now() - maxCacheDuration).toISOString();
    await supabase
      .from('traffic_cache')
      .delete()
      .lt('cached_at', cacheExpiryCutoff);

    return new Response(
      JSON.stringify(legacyFormat),
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
