import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const carpoolingVoteSchema = z.object({
  title: z.string(),
  userFingerprint: z.string(),
});

serve(async (req) => {
  console.log("=== Carpooling vote submission request received ===");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData = await req.json();
    console.log("Request data:", requestData);

    const validatedData = carpoolingVoteSchema.parse(requestData);
    const { title, userFingerprint } = validatedData;

    console.log(`Processing vote for: "${title}"`);
    console.log(`User fingerprint: ${userFingerprint}`);

    // Check if this carpooling idea exists
    const { data: existingVote, error: fetchError } = await supabase
      .from('carpooling_votes')
      .select('*')
      .eq('title', title)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching carpooling vote:", fetchError);
      throw fetchError;
    }

    if (!existingVote) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Ta opcja nie istnieje w systemie' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log("Existing vote found:", existingVote);

    // Check if user has already voted
    const voterFingerprints = existingVote.voter_fingerprints || [];
    const hasVoted = voterFingerprints.includes(userFingerprint);

    if (hasVoted) {
      console.log("User has already voted for this idea");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Już zagłosowałeś na tę opcję' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update the vote count and add user fingerprint
    const newVoterFingerprints = [...voterFingerprints, userFingerprint];
    const newVoteCount = existingVote.vote_count + 1;

    console.log(`Updating vote count from ${existingVote.vote_count} to ${newVoteCount}`);

    const { error: updateError } = await supabase
      .from('carpooling_votes')
      .update({
        vote_count: newVoteCount,
        voter_fingerprints: newVoterFingerprints,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingVote.id);

    if (updateError) {
      console.error("Error updating vote:", updateError);
      throw updateError;
    }

    console.log("Vote successfully recorded");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dziękujemy za głos!',
        voteCount: newVoteCount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Error in submit-carpooling-vote function:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nieprawidłowe dane wejściowe',
          errors: error.errors 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Wystąpił błąd podczas przetwarzania głosu' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
