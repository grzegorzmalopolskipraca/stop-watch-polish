import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userFingerprint, street } = await req.json();

    if (!userFingerprint) {
      return new Response(
        JSON.stringify({ error: 'User fingerprint is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Rate limiting: max 1 visit per user per hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: recentVisits } = await supabase
      .from('page_visits')
      .select('id')
      .eq('user_fingerprint', userFingerprint)
      .gte('visited_at', oneHourAgo.toISOString())
      .limit(1);

    if (recentVisits && recentVisits.length > 0) {
      console.log(`Rate limit: User ${userFingerprint} already visited within the last hour`);
      return new Response(
        JSON.stringify({ message: 'Visit already recorded recently' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Record the visit
    const { error: insertError } = await supabase
      .from('page_visits')
      .insert({
        user_fingerprint: userFingerprint,
        street: street || null,
        visited_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ message: 'Visit recorded successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
