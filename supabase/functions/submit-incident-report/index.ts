import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_STREETS = [
  'Borowska', 'Buforowa', 'Grabiszyńska', 'Grota Roweckiego',
  'Karkonoska', 'Ołtaszyńska', 'Opolska', 'Parafialna', 'Powstańców Śląskich',
  'Radosna', 'Sudecka', 'Ślężna', 'Zwycięska'
];

const VALID_INCIDENT_TYPES = [
  'Wypadek', 'Kolizja', 'Roboty drogowe', 'Awaria pojazdu', 
  'Kontrola drogowa', 'Utrudnienie', 'Zamknięta droga'
];

const VALID_DIRECTIONS = ['to_center', 'from_center'];

const incidentSchema = z.object({
  street: z.enum(VALID_STREETS as [string, ...string[]]),
  incidentType: z.enum(VALID_INCIDENT_TYPES as [string, ...string[]]),
  userFingerprint: z.string().min(1).max(100),
  direction: z.enum(VALID_DIRECTIONS as [string, ...string[]]),
});

// IP-based rate limiting: max 3 reports per IP per 5 minutes
async function checkIPRateLimit(supabase: any, clientIP: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', `ip_${clientIP}`)
    .eq('action_type', 'incident_report_ip')
    .gte('last_action_at', fiveMinutesAgo);

  if (error) {
    console.error('IP rate limit check error:', error);
    return true; // Fail open
  }

  if (data && data.length >= 3) {
    return false; // IP rate limit exceeded
  }

  // Record this IP request
  await supabase.from('rate_limits').insert({
    identifier: `ip_${clientIP}`,
    action_type: 'incident_report_ip',
    action_count: 1,
    last_action_at: new Date().toISOString(),
  });

  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`Incident report from IP: ${clientIP}`);

    // Check IP-based rate limit first
    const ipAllowed = await checkIPRateLimit(supabase, clientIP);
    if (!ipAllowed) {
      console.log(`IP rate limit exceeded for ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'rate_limit', message: 'Zbyt wiele zgłoszeń z tego adresu IP. Spróbuj ponownie za kilka minut.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    const body = await req.json();

    // Validate input with schema
    const validationResult = incidentSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: 'Nieprawidłowe dane wejściowe', 
          details: validationResult.error.issues 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { street, incidentType, userFingerprint, direction } = validationResult.data;

    console.log('Received incident report:', { street, incidentType, userFingerprint, direction });

    // Check rate limiting - max 1 incident report per user per incident type per street per 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentReports } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', userFingerprint)
      .eq('action_type', `incident_${street}_${incidentType}`)
      .gte('last_action_at', fiveMinutesAgo);

    if (recentReports && recentReports.length > 0) {
      return new Response(
        JSON.stringify({ error: 'rate_limit', message: 'Maks 1 zgłoszenie na 5 minut' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Check global rate limiting - max 2 different incident reports per user per 5 minutes
    const { data: allRecentReports } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', userFingerprint)
      .like('action_type', 'incident_%')
      .gte('last_action_at', fiveMinutesAgo);

    if (allRecentReports && allRecentReports.length >= 2) {
      return new Response(
        JSON.stringify({ error: 'rate_limit', message: 'Maks 2 zgłoszenia w ciągu 5 minut' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Insert the incident report
    const { error: insertError } = await supabase
      .from('incident_reports')
      .insert({
        street,
        incident_type: incidentType,
        user_fingerprint: userFingerprint,
        direction,
      });

    if (insertError) {
      console.error('Error inserting incident report:', insertError);
      throw insertError;
    }

    // Update rate limit
    await supabase
      .from('rate_limits')
      .upsert({
        identifier: userFingerprint,
        action_type: `incident_${street}_${incidentType}`,
        action_count: 1,
        last_action_at: new Date().toISOString(),
      });

    // Send push notifications to subscribers
    try {
      await supabase.functions.invoke('send-push-notifications', {
        body: {
          street: `incidents_${street}`,
          message: `${incidentType} zgłoszony na ${street} (${direction === 'to_center' ? 'do centrum' : 'z centrum'})`,
        },
      });
      console.log('Push notification sent for incident');
    } catch (notificationError) {
      console.error('Error sending push notification:', notificationError);
      // Don't fail the whole request if notification fails
    }

    console.log('Incident report submitted successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in submit-incident-report function:', error);
    return new Response(
      JSON.stringify({ error: 'Wystąpił błąd podczas zgłaszania zdarzenia' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
