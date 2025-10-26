import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WONDERPUSH_ACCESS_TOKEN = Deno.env.get("WONDERPUSH_ACCESS_TOKEN") || "";
const WONDERPUSH_API_URL = "https://management-api.wonderpush.com/v1/deliveries";

// IP-based rate limiting: max 5 notification triggers per IP per minute
async function checkIPRateLimit(supabase: any, clientIP: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', `ip_${clientIP}`)
    .eq('action_type', 'push_notification_ip')
    .gte('last_action_at', oneMinuteAgo);

  if (error) {
    console.error('IP rate limit check error:', error);
    return true; // Fail open
  }

  if (data && data.length >= 5) {
    return false; // IP rate limit exceeded
  }

  // Record this IP request
  await supabase.from('rate_limits').insert({
    identifier: `ip_${clientIP}`,
    action_type: 'push_notification_ip',
    action_count: 1,
    last_action_at: new Date().toISOString(),
  });

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`Push notification request from IP: ${clientIP}`);

    // Initialize Supabase client for rate limiting
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check IP-based rate limit
    const allowed = await checkIPRateLimit(supabase, clientIP);
    if (!allowed) {
      console.log(`Push notification rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Zbyt wiele prób wysłania powiadomień. Spróbuj ponownie za minutę.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { street, message } = await req.json();

    console.log(`Sending WonderPush notification for street: ${street}`);

    // Determine if this is an incident notification or chat notification
    const isIncident = street.startsWith('incidents_');
    const actualStreet = isIncident ? street.replace('incidents_', '') : street;
    const title = isIncident 
      ? `Zdarzenie drogowe - ${actualStreet}`
      : `Nowa wiadomość na czacie - ${actualStreet}`;

    // Send notification via WonderPush REST API
    const response = await fetch(WONDERPUSH_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WONDERPUSH_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-WonderPush-Authorization": `Bearer ${WONDERPUSH_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        notification: {
          alert: {
            text: message,
            title: title,
          },
        },
        targetTags: [`street_${street}`],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("WonderPush API error:", response.status, errorText);
      throw new Error(`WonderPush API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("WonderPush notification sent successfully:", data);

    return new Response(
      JSON.stringify({ 
        success: true,
        data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-push-notifications:", error);
    return new Response(JSON.stringify({ error: "Wystąpił błąd podczas wysyłania powiadomień" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
