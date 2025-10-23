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
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
