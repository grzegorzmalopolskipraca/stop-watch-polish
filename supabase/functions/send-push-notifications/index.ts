import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = "16ce973c-c7b3-42ff-b7b4-fe48be517186";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Sending push notification via OneSignal");
    
    const { street, message, isIncident } = await req.json();
    console.log("Request params:", { street, isIncident });

    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal REST API key not configured");
    }

    // Construct notification title and body
    const title = isIncident ? `🚨 Zdarzenie na ${street}` : `💬 Nowa wiadomość na ${street}`;
    const body = message || (isIncident ? "Zgłoszono zdarzenie na Twojej ulicy" : "Nowa wiadomość w czacie");

    console.log("Sending notification:", { title, body });

    // Create tag key matching the subscription format
    const tagKey = `street_${street.replace(/\s+/g, '_')}`;
    console.log("Using tag key:", tagKey);

    // Send notification to OneSignal
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { en: title },
        contents: { en: body },
        filters: [
          { field: "tag", key: tagKey, relation: "=", value: "true" }
        ],
      }),
    });

    const responseData = await response.json();
    console.log("OneSignal response:", responseData);

    if (!response.ok) {
      throw new Error(`OneSignal API error: ${JSON.stringify(responseData)}`);
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
