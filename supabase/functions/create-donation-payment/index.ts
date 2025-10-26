import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// IP-based rate limiting: max 3 payment sessions per IP per hour
async function checkIPRateLimit(supabase: any, clientIP: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', `ip_${clientIP}`)
    .eq('action_type', 'donation_payment_ip')
    .gte('last_action_at', oneHourAgo);

  if (error) {
    console.error('IP rate limit check error:', error);
    return true; // Fail open
  }

  if (data && data.length >= 3) {
    return false; // IP rate limit exceeded
  }

  // Record this IP request
  await supabase.from('rate_limits').insert({
    identifier: `ip_${clientIP}`,
    action_type: 'donation_payment_ip',
    action_count: 1,
    last_action_at: new Date().toISOString(),
  });

  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`Payment session request from IP: ${clientIP}`);

    // Initialize Supabase client for rate limiting
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check IP-based rate limit
    const allowed = await checkIPRateLimit(supabase, clientIP);
    if (!allowed) {
      console.log(`Payment rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Zbyt wiele prób utworzenia płatności. Spróbuj ponownie za godzinę.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { priceId } = await req.json();

    if (!priceId) {
      throw new Error("Price ID is required");
    }

    console.log("Creating donation payment session for price:", priceId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/?donation=success`,
      cancel_url: `${req.headers.get("origin")}/?donation=cancelled`,
    });

    console.log("Payment session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating payment session:", error);
    return new Response(JSON.stringify({ error: "Wystąpił błąd podczas tworzenia płatności" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
