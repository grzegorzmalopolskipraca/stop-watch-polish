import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { street, incidentType, userFingerprint, direction } = await req.json();

    console.log('Received incident report:', { street, incidentType, userFingerprint, direction });

    if (!street || !incidentType || !userFingerprint || !direction) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check rate limiting - max 1 incident report per user per street per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: recentReports } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', userFingerprint)
      .eq('action_type', `incident_street_${street}`)
      .gte('last_action_at', tenMinutesAgo);

    if (recentReports && recentReports.length > 0) {
      return new Response(
        JSON.stringify({ error: 'rate_limit', message: 'Możesz zgłosić zdarzenie na tej ulicy ponownie za kilka minut' }),
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
        action_type: `incident_street_${street}`,
        action_count: 1,
        last_action_at: new Date().toISOString(),
      });

    console.log('Incident report submitted successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in submit-incident-report function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
