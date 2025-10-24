import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// VAPID keys for Web Push - these should match the public key in pushNotifications.ts
const VAPID_PUBLIC_KEY = "BMqzXH7fFBP0HEsJV_6KHYLKxEp-gZHDvEYqM0JF9x8xKLmN4VnQV_HBQPYd8ZKjF9WvZ8pN7qLmKJHGFd9sRwU";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:support@ejedzie.pl',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

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

    // Send the notification using web-push library
    await webpush.sendNotification(subscriptionData, notificationPayload);

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
