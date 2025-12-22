import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  user_id: string;
  home_address: string | null;
  work_address: string | null;
  home_lat: number | null;
  home_lng: number | null;
  work_lat: number | null;
  work_lng: number | null;
}

interface CommuteSchedule {
  user_id: string;
  day_of_week: number;
  to_work_start: string;
  to_work_end: string;
  from_work_start: string;
  from_work_end: string;
}

// Get current time in Poland timezone
function getPolandTime(): Date {
  const now = new Date();
  const polandOffset = getPolandOffset(now);
  return new Date(now.getTime() + polandOffset * 60 * 1000);
}

function getPolandOffset(date: Date): number {
  // Poland is UTC+1 in winter, UTC+2 in summer (DST)
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  const isDST = date.getTimezoneOffset() < stdOffset;
  return isDST ? -120 : -60; // -120 for summer (UTC+2), -60 for winter (UTC+1)
}

// Round time to nearest 10 minutes
function roundToNearest10Min(date: Date): string {
  const hours = date.getHours();
  const minutes = Math.floor(date.getMinutes() / 10) * 10;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Check if current time is within a range
function isTimeInRange(current: string, start: string, end: string): boolean {
  const [currH, currM] = current.split(':').map(Number);
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  const currMinutes = currH * 60 + currM;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  return currMinutes >= startMinutes && currMinutes <= endMinutes;
}

// Log error to database
async function logError(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  serviceName: string,
  errorType: string,
  errorMessage: string,
  errorDetails?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('service_errors')
      .insert({
        service_name: serviceName,
        error_type: errorType,
        error_message: errorMessage,
        error_details: errorDetails || null,
      });
    
    if (error) {
      console.error('Failed to log error to database:', error);
    } else {
      console.log(`Error logged to database: ${errorType} - ${errorMessage}`);
    }
  } catch (e) {
    console.error('Exception while logging error:', e);
  }
}

// Get travel duration using Google Distance Matrix API with retry
async function getTravelDuration(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey: string,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  retries: number = 3
): Promise<number | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      console.log(`Distance Matrix response (attempt ${attempt}):`, JSON.stringify(data));
      
      if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        const durationSeconds = element.duration_in_traffic?.value || element.duration?.value;
        if (durationSeconds) {
          return Math.round(durationSeconds / 60);
        }
      }
      
      // Handle specific API errors
      if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'OVER_DAILY_LIMIT') {
        await logError(supabase, 'calculate-commute-times', 'API_RATE_LIMIT', 
          `Google Maps API rate limit exceeded: ${data.status}`, 
          { response: data, attempt, origin: `${originLat},${originLng}`, dest: `${destLat},${destLng}` }
        );
        // Wait longer before retry for rate limits
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
          continue;
        }
        return null;
      }
      
      if (data.status === 'REQUEST_DENIED') {
        await logError(supabase, 'calculate-commute-times', 'API_AUTH_ERROR', 
          `Google Maps API request denied: ${data.error_message || 'Unknown reason'}`, 
          { response: data }
        );
        return null;
      }
      
      if (data.status !== 'OK' || data.rows?.[0]?.elements?.[0]?.status !== 'OK') {
        await logError(supabase, 'calculate-commute-times', 'API_ERROR', 
          `Distance Matrix API returned error status`, 
          { response: data, origin: `${originLat},${originLng}`, dest: `${destLat},${destLng}` }
        );
        
        // Retry for transient errors
        if (attempt < retries && ['UNKNOWN_ERROR', 'INVALID_REQUEST'].includes(data.status)) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        return null;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error calling Distance Matrix API (attempt ${attempt}):`, error);
      
      // Check for timeout/network errors
      if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
        await logError(supabase, 'calculate-commute-times', 'API_TIMEOUT', 
          `Request to Google Maps API timed out`, 
          { error: errorMessage, attempt }
        );
      } else {
        await logError(supabase, 'calculate-commute-times', 'API_NETWORK_ERROR', 
          `Network error while calling Google Maps API: ${errorMessage}`, 
          { error: errorMessage, attempt }
        );
      }
      
      // Retry on network errors
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      return null;
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // deno-lint-ignore no-explicit-any
  let supabase: any = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!googleMapsApiKey) {
      console.error("GOOGLE_MAPS_API_KEY is not configured");
      await logError(supabase, 'calculate-commute-times', 'CONFIG_ERROR', 
        'GOOGLE_MAPS_API_KEY is not configured', {}
      );
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current time in Poland
    const polandTime = getPolandTime();
    const currentDayOfWeek = polandTime.getDay();
    const currentTime = roundToNearest10Min(polandTime);
    const today = polandTime.toISOString().split('T')[0];
    
    console.log(`Running commute time calculation at ${currentTime} (Poland time) on day ${currentDayOfWeek} (${today})`);

    // Get all profiles with both home and work addresses set
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .not('home_lat', 'is', null)
      .not('work_lat', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      await logError(supabase, 'calculate-commute-times', 'DATABASE_ERROR', 
        `Failed to fetch profiles: ${profilesError.message}`, 
        { error: profilesError }
      );
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles with complete addresses found');
      return new Response(
        JSON.stringify({ message: "No profiles to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${profiles.length} profiles with complete addresses`);

    let processedCount = 0;
    const errors: string[] = [];

    for (const profile of profiles as Profile[]) {
      // Get schedule for current day
      const { data: schedules, error: scheduleError } = await supabase
        .from('commute_schedule')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('day_of_week', currentDayOfWeek);

      if (scheduleError) {
        console.error(`Error fetching schedule for user ${profile.user_id}:`, scheduleError);
        await logError(supabase, 'calculate-commute-times', 'DATABASE_ERROR', 
          `Failed to fetch schedule for user: ${scheduleError.message}`, 
          { userId: profile.user_id, dayOfWeek: currentDayOfWeek, error: scheduleError }
        );
        continue;
      }
      
      if (!schedules || schedules.length === 0) {
        console.log(`No schedule found for user ${profile.user_id} on day ${currentDayOfWeek}`);
        continue;
      }

      const schedule = schedules[0] as CommuteSchedule;
      
      // Check "to work" range
      if (isTimeInRange(currentTime, schedule.to_work_start, schedule.to_work_end)) {
        console.log(`User ${profile.user_id}: Calculating to_work time at ${currentTime}`);
        
        const duration = await getTravelDuration(
          profile.home_lat!,
          profile.home_lng!,
          profile.work_lat!,
          profile.work_lng!,
          googleMapsApiKey,
          supabase
        );
        
        if (duration !== null) {
          // Upsert travel time
          const { error: upsertError } = await supabase
            .from('commute_travel_times')
            .upsert({
              user_id: profile.user_id,
              travel_date: today,
              day_of_week: currentDayOfWeek,
              direction: 'to_work',
              departure_time: currentTime,
              travel_duration_minutes: duration,
              origin_address: profile.home_address,
              destination_address: profile.work_address,
              calculated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,travel_date,direction,departure_time',
            });

          if (upsertError) {
            console.error(`Error saving to_work time for user ${profile.user_id}:`, upsertError);
            await logError(supabase, 'calculate-commute-times', 'DATABASE_ERROR', 
              `Failed to save to_work time: ${upsertError.message}`, 
              { userId: profile.user_id, direction: 'to_work', time: currentTime, error: upsertError }
            );
            errors.push(`User ${profile.user_id} to_work: ${upsertError.message}`);
          } else {
            console.log(`Saved to_work time for user ${profile.user_id}: ${duration} min`);
            processedCount++;
          }
        } else {
          console.log(`Failed to get to_work duration for user ${profile.user_id}`);
        }
      }
      
      // Check "from work" range
      if (isTimeInRange(currentTime, schedule.from_work_start, schedule.from_work_end)) {
        console.log(`User ${profile.user_id}: Calculating from_work time at ${currentTime}`);
        
        const duration = await getTravelDuration(
          profile.work_lat!,
          profile.work_lng!,
          profile.home_lat!,
          profile.home_lng!,
          googleMapsApiKey,
          supabase
        );
        
        if (duration !== null) {
          // Upsert travel time
          const { error: upsertError } = await supabase
            .from('commute_travel_times')
            .upsert({
              user_id: profile.user_id,
              travel_date: today,
              day_of_week: currentDayOfWeek,
              direction: 'from_work',
              departure_time: currentTime,
              travel_duration_minutes: duration,
              origin_address: profile.work_address,
              destination_address: profile.home_address,
              calculated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,travel_date,direction,departure_time',
            });

          if (upsertError) {
            console.error(`Error saving from_work time for user ${profile.user_id}:`, upsertError);
            await logError(supabase, 'calculate-commute-times', 'DATABASE_ERROR', 
              `Failed to save from_work time: ${upsertError.message}`, 
              { userId: profile.user_id, direction: 'from_work', time: currentTime, error: upsertError }
            );
            errors.push(`User ${profile.user_id} from_work: ${upsertError.message}`);
          } else {
            console.log(`Saved from_work time for user ${profile.user_id}: ${duration} min`);
            processedCount++;
          }
        } else {
          console.log(`Failed to get from_work duration for user ${profile.user_id}`);
        }
      }
    }

    console.log(`Processed ${processedCount} travel time calculations`);

    return new Response(
      JSON.stringify({ 
        message: "Commute times calculated",
        processed: processedCount,
        errors: errors.length > 0 ? errors : undefined,
        currentTime,
        currentDay: currentDayOfWeek,
        date: today
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in calculate-commute-times:", error);
    
    if (supabase) {
      await logError(supabase, 'calculate-commute-times', 'FATAL_ERROR', 
        error instanceof Error ? error.message : 'Unknown fatal error', 
        { stack: error instanceof Error ? error.stack : undefined }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
