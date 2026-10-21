import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();

    if (!address || address.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Address is required and must be at least 3 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('TOMTOM_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'TomTom API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geocodeUrl = new URL(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(address.trim())}.json`);
    geocodeUrl.searchParams.set('key', apiKey);
    geocodeUrl.searchParams.set('language', 'pl-PL');
    geocodeUrl.searchParams.set('countrySet', 'PL');
    geocodeUrl.searchParams.set('limit', '1');

    const response = await fetch(geocodeUrl, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();

    if (response.ok && data.results?.length > 0) {
      const result = data.results[0];
      return new Response(
        JSON.stringify({
          success: true,
          formatted_address: result.address?.freeformAddress ?? result.address?.localName ?? address.trim(),
          place_id: result.id,
          location: { lat: result.position.lat, lng: result.position.lon },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nie znaleziono adresu. Sprawdź poprawność danych.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('TomTom geocoding API error:', response.status, data);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Błąd podczas wyszukiwania adresu.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error validating address:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
