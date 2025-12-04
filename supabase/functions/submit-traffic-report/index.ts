import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_STREETS = [
  'Borowska', 'Buforowa', 'Grabiszyńska', 'Grota Roweckiego', 'Hallera',
  'Karkonoska', 'Ołtaszyńska', 'Opolska', 'Parafialna', 'Powstańców Śląskich',
  'Radosna', 'Sudecka', 'Ślężna', 'Zwycięska'
];

const VALID_STATUSES = ['stoi', 'toczy_sie', 'jedzie'];
const VALID_DIRECTIONS = ['to_center', 'from_center'];

const reportSchema = z.object({
  street: z.enum(VALID_STREETS as [string, ...string[]]),
  status: z.enum(VALID_STATUSES as [string, ...string[]]),
  userFingerprint: z.string().min(1).max(100),
  direction: z.enum(VALID_DIRECTIONS as [string, ...string[]]),
  speed: z.number().nullable().optional(), // Real speed from Google API passed from frontend
});

// Rate limiting: max 1 report per user per street per direction per 1 minute
const RATE_LIMIT_WINDOW = 1 * 60 * 1000; // 1 minute in milliseconds

// IP-based rate limiting: max 10 reports per IP per 1 minute
async function checkIPRateLimit(supabase: any, clientIP: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString();
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', `ip_${clientIP}`)
    .eq('action_type', 'traffic_report_ip')
    .gte('last_action_at', fiveMinutesAgo);

  if (error) {
    console.error('IP rate limit check error:', error);
    return true; // Fail open
  }

  if (data && data.length >= 10) {
    return false; // IP rate limit exceeded
  }

  return true;
}

async function checkUserStreetRateLimit(
  supabase: any,
  userFingerprint: string,
  street: string,
  direction: string
): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString();
  
  const identifier = `${userFingerprint}_${street}_${direction}`;

  // Get recent action from this user on this street
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action_type', 'traffic_report_user_street')
    .gte('last_action_at', fiveMinutesAgo)
    .order('last_action_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Rate limit check error:', error);
    return true; // Fail open - allow the action
  }

  if (!data || data.length === 0) {
    // First action from this user on this street and direction in the last minute
    await supabase.from('rate_limits').insert({
      identifier,
      action_type: 'traffic_report_user_street',
      action_count: 1,
    });
    return true; // Allow
  }

  // User has already submitted a report for this street and direction in the last minute
  return false; // Don't allow
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting (prioritize x-forwarded-for)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`Traffic report from IP: ${clientIP}`);

    // Check IP-based rate limit first (stronger protection)
    const ipAllowed = await checkIPRateLimit(supabase, clientIP);
    if (!ipAllowed) {
      console.log(`IP rate limit exceeded for ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'rate_limit', message: 'Zbyt wiele zgłoszeń z tego adresu IP. Spróbuj ponownie za kilka minut.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await req.json();
    console.log(`[SpeedFlow-Backend] 1. Received body:`, JSON.stringify(body));

    // Validate input
    const validationResult = reportSchema.safeParse(body);
    if (!validationResult.success) {
      console.log(`[SpeedFlow-Backend] 2. Validation failed:`, JSON.stringify(validationResult.error.issues));
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowe dane wejściowe', details: validationResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { street, status, userFingerprint, direction, speed } = validationResult.data;
    console.log(`[SpeedFlow-Backend] 3. Validated data: street=${street}, status=${status}, direction=${direction}, speed=${speed}`);

    // Check user-street-direction rate limit (1 report per minute)
    const canSubmit = await checkUserStreetRateLimit(supabase, userFingerprint, street, direction);

    if (canSubmit) {
      // Record this IP request after successful submission
      await supabase.from('rate_limits').insert({
        identifier: `ip_${clientIP}`,
        action_type: 'traffic_report_ip',
        action_count: 1,
        last_action_at: new Date().toISOString(),
      });

      // Round speed to 1 decimal place for cleaner data
      const roundedSpeed = speed ? Math.round(speed * 10) / 10 : null;
      console.log(`[SpeedFlow-Backend] 4. Processing speed: raw=${speed}, rounded=${roundedSpeed}`);

      // Fetch weather data from cache for this street
      const { data: weatherData } = await supabase
        .from('weather_cache')
        .select('weather_data, cached_at')
        .eq('street', street)
        .order('cached_at', { ascending: false })
        .limit(1)
        .single();

      let weatherFields = {};
      if (weatherData?.weather_data) {
        const weather = weatherData.weather_data as any;
        const conditions = weather.currentConditions || {};
        weatherFields = {
          temperature: conditions.temperature || null,
          weather_condition: conditions.condition || null,
          humidity: conditions.humidity || null,
          wind_speed: conditions.windSpeed || null,
          pressure: conditions.pressure || null,
          visibility: conditions.visibility || null,
          weather_cached_at: weatherData.cached_at,
        };
        console.log(`[SpeedFlow-Backend] Weather data found for ${street}:`, weatherFields);
      }

      // Insert the traffic report only if rate limit allows
      const insertData = {
        street,
        status,
        user_fingerprint: userFingerprint,
        reported_at: new Date().toISOString(),
        direction,
        speed: roundedSpeed,
        ...weatherFields,
      };
      console.log(`[SpeedFlow-Backend] 5. Inserting to DB:`, JSON.stringify(insertData));

      const { error } = await supabase
        .from('traffic_reports')
        .insert(insertData);

      if (error) {
        console.error(`[SpeedFlow-Backend] 6. Insert error:`, error);
      } else {
        console.log(`[SpeedFlow-Backend] 6. Insert SUCCESS - speed=${roundedSpeed} saved to database`);
      }
    } else {
      console.log(`Rate limit: User ${userFingerprint} tried to submit again for ${street} (${direction}) within 1 minute`);
    }

    // Always return success to show "thank you" message
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Wystąpił błąd serwera' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
