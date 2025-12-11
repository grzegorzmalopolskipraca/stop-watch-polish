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

// Get travel duration using Google Distance Matrix API
async function getTravelDuration(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey: string
): Promise<number | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`Distance Matrix response:`, JSON.stringify(data));
    
    if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      // Use duration_in_traffic if available, otherwise duration
      const durationSeconds = element.duration_in_traffic?.value || element.duration?.value;
      if (durationSeconds) {
        return Math.round(durationSeconds / 60); // Convert to minutes
      }
    }
    
    console.error('Distance Matrix API error:', data);
    return null;
  } catch (error) {
    console.error('Error calling Distance Matrix API:', error);
    return null;
  }
}

// Generate all time slots for a range with 10-minute intervals
function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    currentMinutes += 10;
  }
  
  return slots;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!googleMapsApiKey) {
      console.error("GOOGLE_MAPS_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current time in Poland
    const polandTime = getPolandTime();
    const currentDayOfWeek = polandTime.getDay();
    const currentTime = roundToNearest10Min(polandTime);
    const today = polandTime.toISOString().split('T')[0];
    
    console.log(`Running commute time calculation at ${currentTime} on day ${currentDayOfWeek} (${today})`);

    // Get all profiles with both home and work addresses set
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .not('home_lat', 'is', null)
      .not('work_lat', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
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

      if (scheduleError || !schedules || schedules.length === 0) {
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
          googleMapsApiKey
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
            errors.push(`User ${profile.user_id} to_work: ${upsertError.message}`);
          } else {
            console.log(`Saved to_work time for user ${profile.user_id}: ${duration} min`);
            processedCount++;
          }
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
          googleMapsApiKey
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
            errors.push(`User ${profile.user_id} from_work: ${upsertError.message}`);
          } else {
            console.log(`Saved from_work time for user ${profile.user_id}: ${duration} min`);
            processedCount++;
          }
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
