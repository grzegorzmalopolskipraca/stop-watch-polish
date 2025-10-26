import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IP-based rate limiting: max 2 visits per IP per hour
async function checkIPRateLimit(supabase: any, clientIP: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', `ip_${clientIP}`)
    .eq('action_type', 'visit_recording_ip')
    .gte('last_action_at', oneHourAgo);

  if (error) {
    console.error('IP rate limit check error:', error);
    return true; // Fail open
  }

  if (data && data.length >= 2) {
    return false; // IP rate limit exceeded
  }

  // Record this IP request
  await supabase.from('rate_limits').insert({
    identifier: `ip_${clientIP}`,
    action_type: 'visit_recording_ip',
    action_count: 1,
    last_action_at: new Date().toISOString(),
  });

  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`Visit recording from IP: ${clientIP}`);

    // Check IP-based rate limit first
    const ipAllowed = await checkIPRateLimit(supabase, clientIP);
    if (!ipAllowed) {
      console.log(`IP rate limit exceeded for ${clientIP}`);
      return new Response(
        JSON.stringify({ message: 'Visit already recorded recently from this IP' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { userFingerprint } = await req.json();

    if (!userFingerprint) {
      return new Response(
        JSON.stringify({ error: 'User fingerprint is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Rate limiting: max 1 visit per user per hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const identifier = `visit_${userFingerprint}`;
    
    const { data: recentLimit } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('action_type', 'page_visit')
      .gte('last_action_at', oneHourAgo.toISOString())
      .limit(1);

    if (recentLimit && recentLimit.length > 0) {
      console.log(`Rate limit: User ${userFingerprint} already visited within the last hour`);
      return new Response(
        JSON.stringify({ message: 'Visit already recorded recently' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get today's date (YYYY-MM-DD format)
    const today = new Date().toISOString().split('T')[0];
    
    // Check if today's record exists
    const { data: existingRecord, error: fetchError } = await supabase
      .from('daily_visit_stats')
      .select('*')
      .eq('visit_date', today)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }

    if (existingRecord) {
      // Increment the counter for today
      const { error: updateError } = await supabase
        .from('daily_visit_stats')
        .update({ 
          visit_count: existingRecord.visit_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('visit_date', today);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      
      console.log(`Incremented visit count for ${today} to ${existingRecord.visit_count + 1}`);
    } else {
      // Create new record for today with count 1
      const { error: insertError } = await supabase
        .from('daily_visit_stats')
        .insert({
          visit_date: today,
          visit_count: 1,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
      
      console.log(`Created new visit record for ${today} with count 1`);
    }

    // Increment total visit counter
    const { data: totalCounter } = await supabase
      .from('total_visit_counter')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (totalCounter) {
      const { error: updateTotalError } = await supabase
        .from('total_visit_counter')
        .update({ 
          total_visits: totalCounter.total_visits + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', totalCounter.id);

      if (updateTotalError) {
        console.error('Update total counter error:', updateTotalError);
        throw updateTotalError;
      }
      
      console.log(`Incremented total visit count to ${totalCounter.total_visits + 1}`);
    }

    // Update rate limit
    await supabase.from('rate_limits').insert({
      identifier,
      action_type: 'page_visit',
      action_count: 1,
    });

    return new Response(
      JSON.stringify({ message: 'Visit recorded successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error recording visit:', error);
    return new Response(
      JSON.stringify({ error: 'Wystąpił błąd podczas zapisywania odwiedzin' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
