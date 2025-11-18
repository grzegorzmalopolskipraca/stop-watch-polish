import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  street?: string;
  direction?: string;
}

interface BatchTrafficRequest {
  routes: RouteRequest[];
}

interface RouteResult {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  street?: string;
  direction?: string;
  distance?: number;
  duration?: number;
  duration_in_traffic?: number;
  status: string;
  cached: boolean;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const funcStart = Date.now();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { routes }: BatchTrafficRequest = await req.json();

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      throw new Error('Invalid request: routes array is required');
    }

    if (routes.length > 100) {
      throw new Error('Maximum 100 routes per batch request');
    }

    console.log(`[get-traffic-data-batch] Processing ${routes.length} routes`);

    const cacheDuration = getCacheDuration();
    const cacheDurationMinutes = Math.floor(cacheDuration / (60 * 1000));
    const currentHour = new Date().getHours();
    const isRushHour = (currentHour >= 7 && currentHour <= 10) || (currentHour >= 16 && currentHour <= 19);
    console.log(`[Batch] Current time: ${currentHour}:00, Cache duration: ${cacheDurationMinutes}min (${isRushHour ? 'RUSH HOUR' : 'off-peak'})`);

    // Step 1: Check cache for all routes
    const cacheChecks = await Promise.all(
      routes.map(async (route) => {
        const cacheKey = createCacheKey(route.origin, route.destination);
        const { data, error } = await supabase
          .from('traffic_cache')
          .select('traffic_data, cached_at')
          .eq('route_key', cacheKey)
          .single();

        if (!error && data) {
          const cachedAt = new Date(data.cached_at).getTime();
          const nowTs = Date.now();
          const cacheAge = (nowTs - cachedAt) / 1000;

          if ((nowTs - cachedAt) < cacheDuration) {
            console.log(`[Batch] Cache HIT for ${route.street || 'route'} (${route.direction || ''}) - age: ${cacheAge.toFixed(0)}s, max: ${cacheDurationMinutes}min`);

            // Extract distance/duration from cached Directions API response
            const cachedRoutes = data.traffic_data?.routes;
            if (cachedRoutes && cachedRoutes[0]?.legs?.[0]) {
              const leg = cachedRoutes[0].legs[0];
              return {
                route,
                cached: true,
                result: {
                  origin: route.origin,
                  destination: route.destination,
                  street: route.street,
                  direction: route.direction,
                  distance: leg.distance?.value,
                  duration: leg.duration?.value,
                  duration_in_traffic: leg.duration_in_traffic?.value || leg.duration?.value,
                  status: 'OK',
                  cached: true,
                }
              };
            }
          }
        }

        return { route, cached: false };
      })
    );

    // Separate cached and uncached routes
    const cachedResults: RouteResult[] = [];
    const uncachedRoutes: RouteRequest[] = [];

    cacheChecks.forEach((check) => {
      if (check.cached && check.result) {
        cachedResults.push(check.result);
      } else {
        uncachedRoutes.push(check.route);
      }
    });

    console.log(`[Batch] Cache hits: ${cachedResults.length}, API calls needed: ${uncachedRoutes.length}`);

    // Step 2: Fetch uncached routes using Distance Matrix API
    const apiResults: RouteResult[] = [];

    if (uncachedRoutes.length > 0) {
      const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
      if (!apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      // Distance Matrix API supports up to 25 origins × 25 destinations = 625 elements per request
      // We'll batch in groups of 25 routes to stay within limits
      const BATCH_SIZE = 25;

      for (let i = 0; i < uncachedRoutes.length; i += BATCH_SIZE) {
        const batch = uncachedRoutes.slice(i, i + BATCH_SIZE);

        // Build origins and destinations strings
        const origins = batch.map(r => `${r.origin.lat},${r.origin.lng}`).join('|');
        const destinations = batch.map(r => `${r.destination.lat},${r.destination.lng}`).join('|');

        console.log(`[Batch] Calling Distance Matrix API for ${batch.length} routes (batch ${Math.floor(i / BATCH_SIZE) + 1})`);

        const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
        const params = new URLSearchParams({
          origins,
          destinations,
          departure_time: 'now',
          traffic_model: 'best_guess',
          key: apiKey
        });

        const gStart = Date.now();
        const response = await fetch(`${url}?${params.toString()}`);
        const gEnd = Date.now();

        console.log(`[Batch] Distance Matrix API response: ${response.status}, latency: ${gEnd - gStart}ms`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Batch] Google Maps API error:', response.status, errorText);
          throw new Error(`Google Maps API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
          console.error('[Batch] Distance Matrix API error:', data.status, data.error_message);
          throw new Error(`Distance Matrix API error: ${data.status}`);
        }

        // Process each result (Distance Matrix returns a matrix, we need diagonal elements)
        for (let j = 0; j < batch.length; j++) {
          const route = batch[j];
          const element = data.rows[j]?.elements[j];

          if (element && element.status === 'OK') {
            const result: RouteResult = {
              origin: route.origin,
              destination: route.destination,
              street: route.street,
              direction: route.direction,
              distance: element.distance?.value,
              duration: element.duration?.value,
              duration_in_traffic: element.duration_in_traffic?.value || element.duration?.value,
              status: 'OK',
              cached: false,
            };

            apiResults.push(result);

            // Cache the result (convert to Directions API format for compatibility)
            const cacheKey = createCacheKey(route.origin, route.destination);
            const directionsCompatibleData = {
              routes: [{
                legs: [{
                  distance: element.distance,
                  duration: element.duration,
                  duration_in_traffic: element.duration_in_traffic || element.duration,
                }]
              }],
              status: 'OK'
            };

            await supabase
              .from('traffic_cache')
              .upsert({
                route_key: cacheKey,
                origin_lat: route.origin.lat,
                origin_lng: route.origin.lng,
                destination_lat: route.destination.lat,
                destination_lng: route.destination.lng,
                traffic_data: directionsCompatibleData,
                cached_at: new Date().toISOString(),
              }, {
                onConflict: 'route_key'
              });

            console.log(`[Batch] Cached result for ${route.street || 'route'} (${route.direction || ''})`);
          } else {
            console.warn(`[Batch] No data for route ${j}:`, element?.status);
            apiResults.push({
              origin: route.origin,
              destination: route.destination,
              street: route.street,
              direction: route.direction,
              status: element?.status || 'ERROR',
              cached: false,
            });
          }
        }
      }
    }

    // Combine cached and API results
    const allResults = [...cachedResults, ...apiResults];

    // Clean old cache entries (older than max cache duration - use 60 min to be safe)
    const maxCacheDuration = 60 * 60 * 1000; // 60 minutes
    const cacheExpiryCutoff = new Date(Date.now() - maxCacheDuration).toISOString();
    await supabase
      .from('traffic_cache')
      .delete()
      .lt('cached_at', cacheExpiryCutoff);

    const totalTime = Date.now() - funcStart;
    console.log(`[Batch] Completed in ${totalTime}ms. Total: ${allResults.length}, Cached: ${cachedResults.length}, API: ${apiResults.length}`);
    console.log(`[Batch] Cost saved: $${(cachedResults.length * 0.005).toFixed(3)}, API cost: $${(Math.ceil(uncachedRoutes.length / BATCH_SIZE) * 0.005).toFixed(3)}`);

    return new Response(
      JSON.stringify({
        results: allResults,
        stats: {
          total: allResults.length,
          cached: cachedResults.length,
          api_calls: Math.ceil(uncachedRoutes.length / 25),
          cache_hit_rate: ((cachedResults.length / allResults.length) * 100).toFixed(1) + '%',
          total_time_ms: totalTime,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[Batch] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
