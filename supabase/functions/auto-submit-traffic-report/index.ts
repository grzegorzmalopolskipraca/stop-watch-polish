import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
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

const VALID_STATUSES = ['stoi', 'toczy_sie', 'jedzie'];
const VALID_DIRECTIONS = ['to_center', 'from_center'];

const reportSchema = z.object({
  street: z.enum(VALID_STREETS as [string, ...string[]]),
  status: z.enum(VALID_STATUSES as [string, ...string[]]),
  userFingerprint: z.string().min(1).max(100),
  direction: z.enum(VALID_DIRECTIONS as [string, ...string[]]),
  isAutoSubmit: z.boolean(),
  speed: z.number().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`Auto-submit traffic report from IP: ${clientIP}`);
    
    const body = await req.json();
    
    // Validate input
    const validationResult = reportSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowe dane wejściowe', details: validationResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { street, status, userFingerprint, direction, speed } = validationResult.data;

    // Check for duplicate submission in last 10 seconds
    const tenSecondsAgo = new Date();
    tenSecondsAgo.setSeconds(tenSecondsAgo.getSeconds() - 10);
    
    const { data: recentReports, error: checkError } = await supabase
      .from('traffic_reports')
      .select('*')
      .eq('user_fingerprint', userFingerprint)
      .eq('street', street)
      .eq('direction', direction)
      .eq('status', status)
      .gte('reported_at', tenSecondsAgo.toISOString())
      .limit(1);

    if (checkError) {
      console.error('Check error:', checkError);
      return new Response(
        JSON.stringify({ error: 'Database check error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If duplicate found, silently skip insertion
    if (recentReports && recentReports.length > 0) {
      console.log(`[AutoSubmit] Duplicate submission detected for ${userFingerprint} on ${street} (${direction}) with status ${status} - skipping`);
      return new Response(
        JSON.stringify({ success: true, silent: true, skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the traffic report without rate limiting
    const { error } = await supabase
      .from('traffic_reports')
      .insert({
        street,
        status,
        user_fingerprint: userFingerprint,
        reported_at: new Date().toISOString(),
        direction,
        speed: speed || null,
      });

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success silently (no message to user)
    return new Response(
      JSON.stringify({ success: true, silent: true }),
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
