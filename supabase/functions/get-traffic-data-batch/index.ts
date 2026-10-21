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
// TomTom's free tier is limited. Cache daytime traffic for an hour and
// overnight traffic for three hours to constrain automated API usage.
function getCacheDuration(): number {
  // Edge Functions run in UTC; use the application's local traffic timezone.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minutes = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  const timeInMinutes = hour * 60 + minutes;

  // Daytime: 6:30 AM (390 min) - 8:00 PM (1200 min)
  if (timeInMinutes >= 390 && timeInMinutes < 1200) {
    return 60 * 60 * 1000; // 60 minutes
  }

  // Overnight: traffic changes less often.
  return 3 * 60 * 60 * 1000; // 3 hours
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
    const currentHour = Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Warsaw',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date()).find((part) => part.type === 'hour')?.value ?? 0);
    const isRushHour = (currentHour >= 7 && currentHour <= 10) || (currentHour >= 16 && currentHour <= 19);
    console.log(`[Batch] Current time: ${currentHour}:00, Cache duration: ${cacheDurationMinutes}min (${isRushHour ? 'RUSH HOUR' : 'off-peak'})`);

    // Step 1: Check cache for all routes (both distance and traffic)
    const cacheChecks = await Promise.all(
      routes.map(async (route) => {
        const cacheKey = createCacheKey(route.origin, route.destination);
        
        // Check for cached distance (permanent)
        const { data: distanceData } = await supabase
          .from('street_distances')
          .select('distance_meters')
          .eq('route_key', cacheKey)
          .single();
        
        // Check for cached traffic data (temporary)
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
            console.log(`[Batch] Cache HIT for ${route.street || 'route'} (${route.direction || ''}) - age: ${cacheAge.toFixed(0)}s`);

            const cachedRoutes = data.traffic_data?.routes;
            if (cachedRoutes && cachedRoutes[0]?.legs?.[0]) {
              const leg = cachedRoutes[0].legs[0];
              return {
                route,
                cached: true,
                cachedDistance: distanceData?.distance_meters || null,
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

        return { route, cached: false, cachedDistance: distanceData?.distance_meters || null };
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

    // Step 2: Fetch uncached routes using TomTom Routing API
    const apiResults: RouteResult[] = [];

    if (uncachedRoutes.length > 0) {
      const apiKey = Deno.env.get('TOMTOM_API_KEY');
      if (!apiKey) {
        console.error('[Batch] TOMTOM_API_KEY not found in environment');
        throw new Error('TomTom API key not configured');
      }
      console.log('[Batch] TomTom API key found');

      for (let i = 0; i < uncachedRoutes.length; i++) {
        const route = uncachedRoutes[i];
        const routeNumber = i + 1;
        const totalRoutes = uncachedRoutes.length;
        
        // Check if we have cached distance for this route
        const checkData = cacheChecks.find(c => c.route === route);
        const cachedDistance = checkData?.cachedDistance;

        if (cachedDistance) {
          console.log(`[Batch ${routeNumber}/${totalRoutes}] Using cached distance: ${cachedDistance}m for ${route.street}`);
        }

        console.log(`[Batch ${routeNumber}/${totalRoutes}] Calling TomTom Routing API for ${route.street || 'route'} (${route.direction || ''})`);
        const locations = `${route.origin.lat},${route.origin.lng}:${route.destination.lat},${route.destination.lng}`;
        const url = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${locations}/json`);
        url.searchParams.set('key', apiKey);
        url.searchParams.set('traffic', 'true');
        url.searchParams.set('computeTravelTimeFor', 'all');
        url.searchParams.set('routeType', 'fastest');
        url.searchParams.set('travelMode', 'car');
        const gStart = Date.now();
        const response = await fetch(url.toString(), { signal: AbortSignal.timeout(30000) });
        const gEnd = Date.now();

        console.log(`[Batch ${routeNumber}/${totalRoutes}] TomTom Routing API: ${response.status}, ${gEnd - gStart}ms`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Batch ${routeNumber}/${totalRoutes}] ❌ API error:`, response.status, errorText);
          apiResults.push({
            origin: route.origin,
            destination: route.destination,
            street: route.street,
            direction: route.direction,
            status: 'ERROR',
            cached: false,
          });
          continue;
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0 || !data.routes[0].summary) {
          console.error(`[Batch ${routeNumber}/${totalRoutes}] ❌ No routes returned`);
          apiResults.push({
            origin: route.origin,
            destination: route.destination,
            street: route.street,
            direction: route.direction,
            status: 'NO_ROUTES',
            cached: false,
          });
          continue;
        }

        const routeData = data.routes[0];
        
        const distanceMeters = routeData.summary.lengthInMeters;
        const durationSeconds = routeData.summary.travelTimeInSeconds;
        const staticDurationSeconds = routeData.summary.noTrafficTravelTimeInSeconds || durationSeconds;
        
        // Cache distance permanently if not already cached
        const cacheKey = createCacheKey(route.origin, route.destination);
        if (!cachedDistance) {
          console.log(`[Batch ${routeNumber}/${totalRoutes}] Caching distance: ${distanceMeters}m`);
          await supabase
            .from('street_distances')
            .upsert({
              route_key: cacheKey,
              street: route.street || '',
              direction: route.direction || '',
              origin_lat: route.origin.lat,
              origin_lng: route.origin.lng,
              destination_lat: route.destination.lat,
              destination_lng: route.destination.lng,
              distance_meters: distanceMeters,
            }, {
              onConflict: 'route_key'
            });
        }
        
        const result: RouteResult = {
          origin: route.origin,
          destination: route.destination,
          street: route.street,
          direction: route.direction,
          distance: distanceMeters,
          duration: staticDurationSeconds,
          duration_in_traffic: durationSeconds,
          status: 'OK',
          cached: false,
        };

        apiResults.push(result);

        // Cache traffic data (temporary)
        const directionsCompatibleData = {
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

        console.log(`[Batch ${routeNumber}/${totalRoutes}] ✅ Cached for ${route.street} (${route.direction})`);
      }
    }

    // Combine cached and API results
    const allResults = [...cachedResults, ...apiResults];

    // Keep entries long enough for the three-hour overnight cache window.
    const maxCacheDuration = 4 * 60 * 60 * 1000;
    const cacheExpiryCutoff = new Date(Date.now() - maxCacheDuration).toISOString();
    await supabase
      .from('traffic_cache')
      .delete()
      .lt('cached_at', cacheExpiryCutoff);

    const totalTime = Date.now() - funcStart;
    const apiCalls = uncachedRoutes.length; // Each route is now a separate API call
    console.log(`[Batch] Completed in ${totalTime}ms. Total: ${allResults.length}, Cached: ${cachedResults.length}, API: ${apiResults.length}`);
    console.log(`[Batch] TomTom API calls made: ${apiCalls}`);

    return new Response(
      JSON.stringify({
        results: allResults,
          stats: {
            total: allResults.length,
            cached: cachedResults.length,
            api_calls: uncachedRoutes.length,
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
    console.error('[Batch] Error stack:', (error as Error).stack);
    console.error('[Batch] Error name:', (error as Error).name);
    return new Response(
      JSON.stringify({
        error: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
