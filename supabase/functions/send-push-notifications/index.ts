import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// VAPID keys for Web Push
const VAPID_PUBLIC_KEY = "BMqzXH7fFBP0HEsJV_6KHYLKxEp-gZHDvEYqM0JF9x8xKLmN4VnQV_HBQPYd8ZKjF9WvZ8pN7qLmKJHGFd9sRwU";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper function to create VAPID JWT
async function createVapidAuthToken(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = {
    typ: "JWT",
    alg: "ES256"
  };
  
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: "mailto:support@ejedzie.pl"
  };
  
  const encoder = new TextEncoder();
  const headerStr = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadStr = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerStr}.${payloadStr}`;
  
  // Import private key
  const privateKeyBuffer = urlBase64ToUint8Array(VAPID_PRIVATE_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array(privateKeyBuffer),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    encoder.encode(unsignedToken)
  );
  
  const signatureArray = new Uint8Array(signature);
  const signatureStr = btoa(String.fromCharCode(...signatureArray))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${unsignedToken}.${signatureStr}`;
}

async function sendPushNotification(subscription: any, payload: any) {
  try {
    const subscriptionData = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
    
    // Create the notification payload
    const notificationPayload = JSON.stringify({
      title: "Nowa wiadomość na czacie ejedzie.pl",
      body: payload.message,
      data: {
        url: "/",
        street: payload.street,
      },
    });

    console.log("Sending push notification to:", subscriptionData.endpoint);

    // Create VAPID auth token
    const vapidToken = await createVapidAuthToken(subscriptionData.endpoint);

    // Send the notification using fetch
    const response = await fetch(subscriptionData.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `vapid t=${vapidToken}, k=${VAPID_PUBLIC_KEY}`,
        "TTL": "86400",
      },
      body: notificationPayload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Push notification failed:", response.status, errorText);
      return false;
    }

    console.log("Push notification sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { street, message } = await req.json();

    // Get all subscriptions for this street
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("street", street);

    if (error) throw error;

    console.log(`Sending push notifications to ${subscriptions?.length || 0} subscribers for street: ${street}`);

    // Send push notifications to all subscribers
    const results = await Promise.allSettled(
      (subscriptions || []).map((sub) =>
        sendPushNotification(sub.subscription, { street, message })
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Push notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-push-notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
