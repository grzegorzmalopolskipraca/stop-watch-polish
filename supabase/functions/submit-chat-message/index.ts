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

const messageSchema = z.object({
  street: z.enum(VALID_STREETS as [string, ...string[]]),
  message: z.string().trim().min(1, 'Wiadomość nie może być pusta').max(500, 'Wiadomość jest za długa'),
  userFingerprint: z.string().min(1).max(100),
});

// IP-based rate limiting: max 3 messages per IP per minute
async function checkIPRateLimit(supabase: any, clientIP: string): Promise<{ allowed: boolean; message?: string }> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', `ip_${clientIP}`)
    .eq('action_type', 'chat_message_ip')
    .gte('last_action_at', oneMinuteAgo);

  if (error) {
    console.error('IP rate limit check error:', error);
    return { allowed: true }; // Fail open
  }

  if (data && data.length >= 3) {
    return { 
      allowed: false, 
      message: 'Zbyt wiele wiadomości z tego adresu IP. Spróbuj ponownie za minutę.' 
    };
  }

  // Record this IP request
  await supabase.from('rate_limits').insert({
    identifier: `ip_${clientIP}`,
    action_type: 'chat_message_ip',
    action_count: 1,
    last_action_at: new Date().toISOString(),
  });

  return { allowed: true };
}

// Rate limiting: max 10 messages per fingerprint per hour
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

    // Get IP address for rate limiting (prioritize x-forwarded-for)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    console.log(`Chat message request from IP: ${clientIP}`);

    // Check IP-based rate limit first (stronger protection)
    const ipRateLimitResult = await checkIPRateLimit(supabase, clientIP);
    if (!ipRateLimitResult.allowed) {
      console.log(`IP rate limit exceeded for ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          error: 'rate_limit',
          message: ipRateLimitResult.message 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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

    // Check fingerprint rate limit (secondary protection)
    const rateLimitCheck = await checkRateLimit(supabase, userFingerprint, 'chat_message');
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize the message to prevent XSS
    const sanitizedMessage = sanitizeMessage(message);

    // Check for prohibited words
    const { data: prohibitedWords, error: prohibitedError } = await supabase
      .from('prohibited_words')
      .select('word');

    if (prohibitedError) {
      console.error('Error fetching prohibited words:', prohibitedError);
    } else if (prohibitedWords && prohibitedWords.length > 0) {
      const messageLower = message.toLowerCase().trim();
      const foundProhibitedWord = prohibitedWords.find(({ word }) => {
        const wordLower = word.toLowerCase();
        // Check for whole word or as part of a word (strict filtering)
        const regex = new RegExp(`\\b${wordLower}\\b|${wordLower}`, 'i');
        return regex.test(messageLower);
      });

      if (foundProhibitedWord) {
        return new Response(
          JSON.stringify({ error: 'Wiadomość zawiera niedozwolone słowa' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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

    // Send push notifications in the background (don't wait for it)
    supabase.functions.invoke('send-push-notifications', {
      body: { street, message: sanitizedMessage }
    }).catch(err => console.error('Push notification error:', err));

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
