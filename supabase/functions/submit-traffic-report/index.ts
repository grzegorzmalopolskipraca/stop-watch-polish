import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_STREETS = [
  'Zwycięska', 'Ołtaszyńska', 'Karkonoska', 'Ślężna',
  'Powstańców Śląskich', 'Grabiszyńska', 'Borowska', 'Buforowa',
  'Grota Roweckiego', 'Radosna', 'Sudecka'
];

const VALID_STATUSES = ['stoi', 'toczy_sie', 'jedzie'];
const VALID_DIRECTIONS = ['to_center', 'from_center'];

const reportSchema = z.object({
  street: z.enum(VALID_STREETS as [string, ...string[]]),
  status: z.enum(VALID_STATUSES as [string, ...string[]]),
  userFingerprint: z.string().min(1).max(100),
  direction: z.enum(VALID_DIRECTIONS as [string, ...string[]]),
});

// Rate limiting: max 1 report per user per street per direction per 5 minutes
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds

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
    // First action from this user on this street and direction in the last 5 minutes
    await supabase.from('rate_limits').insert({
      identifier,
      action_type: 'traffic_report_user_street',
      action_count: 1,
    });
    return true; // Allow
  }

  // User has already submitted a report for this street and direction in the last 5 minutes
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

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    const body = await req.json();
    
    // Validate input
    const validationResult = reportSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowe dane wejściowe', details: validationResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { street, status, userFingerprint, direction } = validationResult.data;

    // Check user-street-direction rate limit (1 report per 5 minutes)
    const canSubmit = await checkUserStreetRateLimit(supabase, userFingerprint, street, direction);
    
    if (canSubmit) {
      // Insert the traffic report only if rate limit allows
      const { error } = await supabase
        .from('traffic_reports')
        .insert({
          street,
          status,
          user_fingerprint: userFingerprint,
          reported_at: new Date().toISOString(),
          direction,
        });

      if (error) {
        console.error('Insert error:', error);
      }
    } else {
      console.log(`Rate limit: User ${userFingerprint} tried to submit again for ${street} (${direction}) within 5 minutes`);
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
