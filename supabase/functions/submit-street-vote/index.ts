import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const streetVoteSchema = z.object({
  streetName: z.string().trim().min(1).max(100),
  userFingerprint: z.string().min(1),
  existingStreets: z.array(z.string()),
});

// Check rate limit for blocked users
async function checkRateLimit(supabase: any, identifier: string, actionType: string): Promise<{ allowed: boolean; message?: string }> {
  const now = new Date();
  const timeWindow = 30 * 60 * 1000; // 30 minutes in milliseconds

  const { data: rateLimitData, error: rateLimitError } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action_type', actionType)
    .single();

  if (rateLimitError && rateLimitError.code !== 'PGRST116') {
    console.error('Error checking rate limit:', rateLimitError);
    return { allowed: true };
  }

  if (rateLimitData) {
    const lastActionTime = new Date(rateLimitData.last_action_at).getTime();
    const timeSinceLastAction = now.getTime() - lastActionTime;

    if (timeSinceLastAction < timeWindow) {
      const remainingMinutes = Math.ceil((timeWindow - timeSinceLastAction) / 60000);
      return { 
        allowed: false, 
        message: `Zostałeś zablokowany za próbę dodania nieprawidłowej nazwy. Spróbuj ponownie za ${remainingMinutes} minut.` 
      };
    } else {
      // Time window has passed, remove the rate limit
      await supabase
        .from('rate_limits')
        .delete()
        .eq('id', rateLimitData.id);
    }
  }

  return { allowed: true };
}

// Add rate limit entry for blocked user
async function addRateLimit(supabase: any, identifier: string, actionType: string) {
  const { error } = await supabase
    .from('rate_limits')
    .upsert({
      identifier,
      action_type: actionType,
      action_count: 1,
      last_action_at: new Date().toISOString(),
    }, {
      onConflict: 'identifier,action_type',
    });

  if (error) {
    console.error('Error adding rate limit:', error);
  }
}

// Normalize street name for comparison
function normalizeStreetName(name: string): string {
  return name.toLowerCase().trim();
}

// Check if street name is similar
function isSimilarStreet(name1: string, name2: string): boolean {
  const normalized1 = normalizeStreetName(name1);
  const normalized2 = normalizeStreetName(name2);
  
  if (normalized1 === normalized2) return true;
  
  // Check if they're the same without last 3 letters (for Polish declensions)
  if (normalized1.length > 3 && normalized2.length > 3) {
    const prefix1 = normalized1.slice(0, -3);
    const prefix2 = normalized2.slice(0, -3);
    return prefix1 === prefix2;
  }
  
  return false;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse and validate request body
    const body = await req.json();
    const validationResult = streetVoteSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Nieprawidłowe dane wejściowe',
          details: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { streetName, userFingerprint, existingStreets } = validationResult.data;

    // Check if user is blocked
    const rateLimitCheck = await checkRateLimit(supabase, userFingerprint, 'street_vote_blocked');
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get prohibited words
    const { data: prohibitedWords, error: prohibitedError } = await supabase
      .from('prohibited_words')
      .select('word');

    if (prohibitedError) {
      console.error('Error fetching prohibited words:', prohibitedError);
    }

    // Check if street name contains prohibited words
    const normalizedStreetName = normalizeStreetName(streetName);
    const containsProhibitedWord = prohibitedWords?.some((item: { word: string }) => {
      const prohibitedWord = normalizeStreetName(item.word);
      return normalizedStreetName.includes(prohibitedWord);
    });

    if (containsProhibitedWord) {
      console.log(`Blocked street name with prohibited word: ${streetName} from user: ${userFingerprint}`);
      
      // Block the user for 30 minutes
      await addRateLimit(supabase, userFingerprint, 'street_vote_blocked');
      
      return new Response(
        JSON.stringify({ 
          error: 'Nazwa ulicy zawiera niedozwolone słowa. Zostałeś zablokowany na 30 minut.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if street already exists in main list
    for (const existingStreet of existingStreets) {
      if (isSimilarStreet(streetName, existingStreet)) {
        return new Response(
          JSON.stringify({ error: 'Ta ulica już jest na liście lub istnieje podobna nazwa' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if street already exists in votes
    const { data: existingVotes, error: votesError } = await supabase
      .from('street_votes')
      .select('*');

    if (votesError) {
      console.error('Error fetching existing votes:', votesError);
      throw votesError;
    }

    // Find existing vote
    const existingVote = existingVotes?.find((v: any) => 
      normalizeStreetName(v.street_name) === normalizeStreetName(streetName)
    );

    if (existingVote) {
      // Check if user already voted
      const voterIps = (existingVote.voter_ips as string[]) || [];
      if (voterIps.includes(userFingerprint)) {
        return new Response(
          JSON.stringify({ error: 'Już głosowałeś na tę ulicę' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update vote count
      const updatedVoterIps = [...voterIps, userFingerprint];
      const { error: updateError } = await supabase
        .from('street_votes')
        .update({
          votes: existingVote.votes + 1,
          voter_ips: updatedVoterIps,
        })
        .eq('id', existingVote.id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Dziękujemy za głos!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Check against all existing votes for similar names
      for (const vote of existingVotes || []) {
        if (isSimilarStreet(streetName, vote.street_name)) {
          return new Response(
            JSON.stringify({ error: 'Ta ulica już jest na liście lub istnieje podobna nazwa' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Create new vote
      const { error: insertError } = await supabase
        .from('street_votes')
        .insert({
          street_name: streetName,
          votes: 1,
          voter_ips: [userFingerprint],
        });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true, message: 'Dziękujemy za dodanie nowej ulicy!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in submit-street-vote function:', error);
    return new Response(
      JSON.stringify({ error: 'Wystąpił błąd podczas przetwarzania' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
