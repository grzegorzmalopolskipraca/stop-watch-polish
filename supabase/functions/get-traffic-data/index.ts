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

    // Initialize Supabase client for rate limiting
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check IP-based rate limit
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

    const { origin, destination }: TrafficRequest = await req.json();
    
    console.log('[get-traffic-data] Request body:', { origin, destination });
    
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('[get-traffic-data] Google Maps API key not configured');
      throw new Error('Google Maps API key not configured');
    }

    // Add 1 minute to current time for departureTime (Google requires future time)
    const departureTime = new Date(Date.now() + 60000).toISOString();
    console.log('[get-traffic-data] Using departure time:', departureTime);

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const body = {
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
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      departureTime: departureTime,
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: "pl",
      units: "METRIC"
    };

    console.log('[get-traffic-data] Calling Google Maps API for route:', { origin, destination });
    console.log('[get-traffic-data] Request body:', JSON.stringify(body, null, 2));

    const gStart = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
      },
      body: JSON.stringify(body)
    });
    const gEnd = Date.now();
    console.log('[get-traffic-data] Google API HTTP status:', response.status, `latency: ${gEnd - gStart}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[get-traffic-data] Google Maps API error:', response.status, errorText);
      throw new Error(`Google Maps API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[get-traffic-data] Google Maps API response received:', JSON.stringify(data, null, 2));
    const routesCount = Array.isArray(data?.routes) ? data.routes.length : 0;
    const first = routesCount > 0 ? data.routes[0] : null;
    if (first) {
      console.log('[get-traffic-data] Summary -> routes:', routesCount, 'distanceMeters:', first.distanceMeters, 'duration:', first.duration);
    } else {
      console.warn('[get-traffic-data] No routes returned by Google.');
    }
    console.log('[get-traffic-data] Function total time:', `${Date.now() - funcStart}ms`);

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
