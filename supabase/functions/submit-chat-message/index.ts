import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_STREETS = [
  'Zwycięska', 'Ołtaszyńska', 'Karkonoska', 'Ślężna',
  'Powstańców Śląskich', 'Grabiszyńska', 'Borowska', 'Buforowa'
];

const messageSchema = z.object({
  street: z.enum(VALID_STREETS as [string, ...string[]]),
  message: z.string().trim().min(1, 'Wiadomość nie może być pusta').max(500, 'Wiadomość jest za długa'),
  userFingerprint: z.string().min(1).max(100),
});

// Rate limiting: max 10 messages per IP per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_MESSAGES_PER_HOUR = 10;

async function checkRateLimit(
  supabase: any,
  identifier: string,
  actionType: string
): Promise<{ allowed: boolean; message?: string }> {
  const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString();

  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action_type', actionType)
    .gte('last_action_at', oneHourAgo)
    .order('last_action_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Fail open
  }

  if (!data || data.length === 0) {
    await supabase.from('rate_limits').insert({
      identifier,
      action_type: actionType,
      action_count: 1,
    });
    return { allowed: true };
  }

  const record = data[0];
  
  if (record.action_count >= MAX_MESSAGES_PER_HOUR) {
    const resetTime = new Date(new Date(record.last_action_at).getTime() + RATE_LIMIT_WINDOW);
    return {
      allowed: false,
      message: `Limit przekroczony. Możesz wysłać maksymalnie ${MAX_MESSAGES_PER_HOUR} wiadomości na godzinę. Spróbuj ponownie po ${resetTime.toLocaleTimeString('pl-PL')}.`,
    };
  }

  await supabase
    .from('rate_limits')
    .update({
      action_count: record.action_count + 1,
      last_action_at: new Date().toISOString(),
    })
    .eq('id', record.id);

  return { allowed: true };
}

// Simple HTML sanitization to prevent XSS
function sanitizeMessage(message: string): string {
  return message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    const body = await req.json();
    
    // Validate input
    const validationResult = messageSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowe dane wejściowe', details: validationResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { street, message, userFingerprint } = validationResult.data;

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(supabase, clientIP, 'chat_message');
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize the message to prevent XSS
    const sanitizedMessage = sanitizeMessage(message);

    // Insert the chat message
    const { data, error } = await supabase
      .from('street_chat_messages')
      .insert({
        street,
        message: sanitizedMessage,
        user_fingerprint: userFingerprint,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Nie udało się wysłać wiadomości' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
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
