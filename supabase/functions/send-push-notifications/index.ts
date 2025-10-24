import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WONDERPUSH_ACCESS_TOKEN = Deno.env.get("WONDERPUSH_ACCESS_TOKEN") || "";
const WONDERPUSH_API_URL = "https://management-api.wonderpush.com/v1/deliveries";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { street, message } = await req.json();

    console.log(`Sending WonderPush notification for street: ${street}`);

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
            title: `Nowa wiadomość na czacie - ${street}`,
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
