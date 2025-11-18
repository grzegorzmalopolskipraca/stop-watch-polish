import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STREET_COORDINATES: Record<string, { start: { lat: number; lng: number }; end: { lat: number; lng: number } }> = {
  "Zwycięska": {
    start: { lat: 51.058494, lng: 17.014247 },
    end: { lat: 51.061066, lng: 16.998068 }
  },
  "Ołtaszyńska": {
    start: { lat: 51.060302, lng: 17.007551 },
    end: { lat: 51.070612, lng: 17.011211 }
  },
  "Karkonoska": {
    start: { lat: 51.047681, lng: 16.970960 },
    end: { lat: 51.074112, lng: 17.007528 }
  },
  "Ślężna": {
    start: { lat: 51.072314, lng: 17.012157 },
    end: { lat: 51.093395, lng: 17.030582 }
  },
  "Powstańców Śląskich": {
    start: { lat: 51.075543, lng: 17.007560 },
    end: { lat: 51.101667, lng: 17.029515 }
  },
  "Grabiszyńska": {
    start: { lat: 51.095267, lng: 16.983208 },
    end: { lat: 51.104327, lng: 17.021340 }
  },
  "Borowska": {
    start: { lat: 51.071441, lng: 17.032402 },
    end: { lat: 51.093573, lng: 17.033407 }
  },
  "Buforowa": {
    start: { lat: 51.043754, lng: 17.060997 },
    end: { lat: 51.068746, lng: 17.054066 }
  },
  "Grota Roweckiego": {
    start: { lat: 51.043693, lng: 17.028696 },
    end: { lat: 51.070613, lng: 17.032364 }
  },
  "Radosna": {
    start: { lat: 51.037788, lng: 16.986309 },
    end: { lat: 51.058774, lng: 17.006882 }
  },
  "Sudecka": {
    start: { lat: 51.072714, lng: 17.011915 },
    end: { lat: 51.084632, lng: 17.018180 }
  },
  "Opolska": {
    start: { lat: 51.085276, lng: 16.998133 },
    end: { lat: 51.106789, lng: 17.025789 }
  },
  "Parafialna": {
    start: { lat: 51.037543, lng: 17.042567 },
    end: { lat: 51.057234, lng: 17.048923 }
  }
};

const SPEED_THRESHOLDS = {
  LOW: 25,    // >= 25 km/h = free-flowing traffic (green) - jedzie
  MEDIUM: 8   // 8-25 km/h = moderate traffic (orange) - toczy_sie
              // < 8 km/h = heavy congestion (red) - stoi
};

function mapSpeedToStatus(speed: number): string {
  if (speed >= SPEED_THRESHOLDS.LOW) return 'jedzie';
  if (speed >= SPEED_THRESHOLDS.MEDIUM) return 'toczy_sie';
  return 'stoi';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Auto Traffic Monitor] Starting monitoring job...');

    // Check if it's between 5 AM and 10 PM
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour < 5 || currentHour >= 22) {
      console.log(`[Auto Traffic Monitor] Outside monitoring hours (${currentHour}:00). Skipping.`);
      return new Response(
        JSON.stringify({ success: true, message: 'Outside monitoring hours' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get settings and check if enough time has passed
    const { data: settings } = await supabase
      .from('auto_traffic_settings')
      .select('*')
      .maybeSingle();

    if (!settings || !settings.is_enabled) {
      console.log('[Auto Traffic Monitor] Monitoring disabled or no settings found. Skipping.');
      return new Response(
        JSON.stringify({ success: true, message: 'Monitoring disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (settings.last_run_at) {
      const lastRun = new Date(settings.last_run_at);
      const minutesSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60);
      
      if (minutesSinceLastRun < settings.interval_minutes) {
        console.log(`[Auto Traffic Monitor] Too soon. Last run: ${minutesSinceLastRun.toFixed(1)}m ago, interval: ${settings.interval_minutes}m`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Too soon since last run',
            minutesSinceLastRun: minutesSinceLastRun.toFixed(1),
            intervalMinutes: settings.interval_minutes
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update last run time
    await supabase
      .from('auto_traffic_settings')
      .update({ last_run_at: now.toISOString() })
      .eq('id', settings.id);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const totalStreets = Object.keys(STREET_COORDINATES).length;

    console.log(`[Auto Traffic Monitor] Using BATCH API - Processing ${totalStreets} streets × 2 directions = ${totalStreets * 2} total routes`);

    // Build batch request for all streets and directions
    const routes = [];
    for (const [streetName, coords] of Object.entries(STREET_COORDINATES)) {
      // To center direction
      routes.push({
        origin: coords.start,
        destination: coords.end,
        street: streetName,
        direction: 'to_center'
      });

      // From center direction
      routes.push({
        origin: coords.end,
        destination: coords.start,
        street: streetName,
        direction: 'from_center'
      });
    }

    console.log(`[Auto Traffic Monitor] Calling batch API with ${routes.length} routes`);
    const batchStart = Date.now();

    // Call batch traffic data function
    const { data: batchData, error: batchError } = await supabase.functions.invoke(
      'get-traffic-data-batch',
      {
        body: { routes }
      }
    );

    const batchDuration = Date.now() - batchStart;
    console.log(`[Auto Traffic Monitor] Batch API completed in ${batchDuration}ms`);

    if (batchError) {
      console.error(`[Auto Traffic Monitor] ❌ Batch API error:`, batchError);
      throw new Error(`Batch API failed: ${batchError.message}`);
    }

    if (!batchData?.results) {
      console.error(`[Auto Traffic Monitor] ❌ No results from batch API`);
      throw new Error('Batch API returned no results');
    }

    console.log(`[Auto Traffic Monitor] Batch stats:`, batchData.stats);
    console.log(`[Auto Traffic Monitor] Cache hit rate: ${batchData.stats.cache_hit_rate}`);

    // Process each result and submit traffic reports
    for (const result of batchData.results) {
      const { street, direction, distance, duration_in_traffic, status } = result;

      if (status !== 'OK') {
        console.log(`[Auto Traffic Monitor] ⚠️ Skipping ${street} (${direction}) - status: ${status}`);
        skipCount++;
        continue;
      }

      if (!duration_in_traffic || !distance) {
        console.log(`[Auto Traffic Monitor] ⚠️ Missing data for ${street} (${direction})`);
        skipCount++;
        continue;
      }

      // Calculate average speed
      const avgSpeed = (distance / duration_in_traffic) * 3.6; // m/s to km/h

      if (avgSpeed <= 0 || !isFinite(avgSpeed)) {
        console.log(`[Auto Traffic Monitor] ⚠️ Invalid speed (${avgSpeed}) for ${street} (${direction})`);
        skipCount++;
        continue;
      }

      // Map speed to status
      const trafficStatus = mapSpeedToStatus(avgSpeed);

      console.log(`[Auto Traffic Monitor] ${street} (${direction}): ${avgSpeed.toFixed(1)} km/h -> ${trafficStatus} (cached: ${result.cached})`);

      // Submit traffic report
      const { error: submitError } = await supabase.functions.invoke(
        'auto-submit-traffic-report',
        {
          body: {
            street,
            status: trafficStatus,
            userFingerprint: 'auto-monitor-system',
            direction,
            isAutoSubmit: true
          }
        }
      );

      if (submitError) {
        console.error(`[Auto Traffic Monitor] ❌ Error submitting report for ${street} (${direction}):`, submitError);
        errorCount++;
      } else {
        console.log(`[Auto Traffic Monitor] ✅ Report submitted for ${street} (${direction})`);
        successCount++;
      }
    }

    console.log(`[Auto Traffic Monitor] Completed. Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: successCount,
        skipped: skipCount,
        errors: errorCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Auto Traffic Monitor] Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process auto traffic monitoring' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});