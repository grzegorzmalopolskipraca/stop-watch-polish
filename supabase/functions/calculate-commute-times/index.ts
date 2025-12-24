import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SERVICE_NAME = 'calculate-commute-times';
const DEFAULT_INTERVAL = 10;
const FALLBACK_INTERVAL = 20;

interface Profile {
  user_id: string;
  home_address: string | null;
  work_address: string | null;
  home_lat: number | null;
  home_lng: number | null;
  work_lat: number | null;
  work_lng: number | null;
  traffic_api_preference: string | null;
}

interface CommuteSchedule {
  user_id: string;
  day_of_week: number;
  to_work_start: string;
  to_work_end: string;
  from_work_start: string;
  from_work_end: string;
}

interface ServiceStatus {
  id: string;
  service_name: string;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error_at: string | null;
  consecutive_failures: number;
  current_interval_minutes: number;
  is_healthy: boolean;
}

// Get current time in Poland timezone (Europe/Warsaw)
function getPolandTime(): Date {
  const now = new Date();
  
  // Use Intl.DateTimeFormat to get the correct time in Poland
  // This properly handles DST transitions
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  const year = parseInt(getPart('year'));
  const month = parseInt(getPart('month')) - 1; // JS months are 0-indexed
  const day = parseInt(getPart('day'));
  const hour = parseInt(getPart('hour'));
  const minute = parseInt(getPart('minute'));
  const second = parseInt(getPart('second'));
  
  // Create a date object representing Poland time
  // Note: This date object's UTC methods will reflect Poland local time values
  const polandDate = new Date(year, month, day, hour, minute, second);
  
  console.log(`Poland time calculated: ${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')} ${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}:${second.toString().padStart(2,'0')}`);
  
  return polandDate;
}

// Round time to nearest 10 minutes (floor)
function roundToNearest10Min(date: Date): string {
  const hours = date.getHours();
  const minutes = Math.floor(date.getMinutes() / 10) * 10;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Parse time string to minutes since midnight
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Convert minutes since midnight to time string
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Check if time is in range
function isTimeInRange(current: string, start: string, end: string): boolean {
  const currMinutes = timeToMinutes(current);
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return currMinutes >= startMinutes && currMinutes <= endMinutes;
}

// Generate all 10-minute slots in a range
function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  
  for (let m = startMin; m <= endMin; m += 10) {
    slots.push(minutesToTime(m));
  }
  return slots;
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

// Get or create service status
async function getServiceStatus(
  // deno-lint-ignore no-explicit-any
  supabase: any
): Promise<ServiceStatus | null> {
  try {
    const { data, error } = await supabase
      .from('service_execution_status')
      .select('*')
      .eq('service_name', SERVICE_NAME)
      .maybeSingle();

    if (error) {
      console.error('Error fetching service status:', error);
      return null;
    }

    if (!data) {
      // Create initial record
      const { data: newData, error: insertError } = await supabase
        .from('service_execution_status')
        .insert({
          service_name: SERVICE_NAME,
          current_interval_minutes: DEFAULT_INTERVAL,
          is_healthy: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating service status:', insertError);
        return null;
      }
      return newData;
    }

    return data;
  } catch (e) {
    console.error('Exception in getServiceStatus:', e);
    return null;
  }
}

// Update service status after execution
async function updateServiceStatus(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  success: boolean,
  status: ServiceStatus | null
): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    if (success) {
      // Reset to default interval on success
      await supabase
        .from('service_execution_status')
        .upsert({
          service_name: SERVICE_NAME,
          last_success_at: now,
          last_attempt_at: now,
          consecutive_failures: 0,
          current_interval_minutes: DEFAULT_INTERVAL,
          is_healthy: true,
        }, { onConflict: 'service_name' });
      
      console.log(`Service status updated: healthy, interval: ${DEFAULT_INTERVAL}min`);
    } else {
      // Increment failures and potentially switch to fallback interval
      const newFailures = (status?.consecutive_failures || 0) + 1;
      const shouldUseFallback = newFailures >= 3;
      
      await supabase
        .from('service_execution_status')
        .upsert({
          service_name: SERVICE_NAME,
          last_attempt_at: now,
          last_error_at: now,
          consecutive_failures: newFailures,
          current_interval_minutes: shouldUseFallback ? FALLBACK_INTERVAL : DEFAULT_INTERVAL,
          is_healthy: !shouldUseFallback,
        }, { onConflict: 'service_name' });
      
      if (shouldUseFallback) {
        console.log(`Service unhealthy after ${newFailures} failures, switching to ${FALLBACK_INTERVAL}min interval`);
        await logError(supabase, SERVICE_NAME, 'SERVICE_UNHEALTHY',
          `Service marked unhealthy after ${newFailures} consecutive failures, fallback to ${FALLBACK_INTERVAL}min interval`,
          { consecutiveFailures: newFailures }
        );
      }
    }
  } catch (e) {
    console.error('Error updating service status:', e);
  }
}

// Check if we should skip based on interval (CRON only)
function shouldSkipExecution(status: ServiceStatus | null): boolean {
  if (!status || !status.last_attempt_at) {
    return false;
  }

  const lastAttempt = new Date(status.last_attempt_at);
  const now = new Date();
  const minutesSinceLastAttempt = (now.getTime() - lastAttempt.getTime()) / (1000 * 60);
  
  // Use fallback interval if service is unhealthy
  const requiredInterval = status.is_healthy ? DEFAULT_INTERVAL : FALLBACK_INTERVAL;
  
  if (minutesSinceLastAttempt < (requiredInterval - 1)) {
    console.log(`Skipping: only ${minutesSinceLastAttempt.toFixed(1)}min since last attempt, interval: ${requiredInterval}min`);
    return true;
  }
  
  return false;
}

// Traffic API type for different calculation methods
type TrafficApiType = 'distance_matrix_pessimistic' | 'distance_matrix_best_guess' | 'distance_matrix_optimistic' | 'routes_api';

// Get travel duration using Google Distance Matrix API with retry
async function getTravelDurationDistanceMatrix(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey: string,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  trafficModel: 'best_guess' | 'pessimistic' | 'optimistic' = 'pessimistic',
  retries: number = 3
): Promise<number | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&departure_time=now&traffic_model=${trafficModel}&key=${apiKey}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      console.log(`Distance Matrix (${trafficModel}) response (attempt ${attempt}):`, JSON.stringify(data));
      
      if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const element = data.rows[0].elements[0];
        const durationSeconds = element.duration_in_traffic?.value || element.duration?.value;
        if (durationSeconds) {
          const minutes = Math.round(durationSeconds / 60);
          console.log(`Distance Matrix result: ${minutes} min (traffic_model: ${trafficModel})`);
          return minutes;
        }
      }
      
      // Handle specific API errors
      if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'OVER_DAILY_LIMIT') {
        await logError(supabase, SERVICE_NAME, 'API_RATE_LIMIT', 
          `Google Maps API rate limit exceeded: ${data.status}`, 
          { response: data, attempt, origin: `${originLat},${originLng}`, dest: `${destLat},${destLng}` }
        );
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
          continue;
        }
        return null;
      }
      
      if (data.status === 'REQUEST_DENIED') {
        await logError(supabase, SERVICE_NAME, 'API_AUTH_ERROR', 
          `Google Maps API request denied: ${data.error_message || 'Unknown reason'}`, 
          { response: data }
        );
        return null;
      }
      
      if (data.status !== 'OK' || data.rows?.[0]?.elements?.[0]?.status !== 'OK') {
        await logError(supabase, SERVICE_NAME, 'API_ERROR', 
          `Distance Matrix API returned error status`, 
          { response: data, origin: `${originLat},${originLng}`, dest: `${destLat},${destLng}` }
        );
        
        if (attempt < retries && ['UNKNOWN_ERROR', 'INVALID_REQUEST'].includes(data.status)) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        return null;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error calling Distance Matrix API (attempt ${attempt}):`, error);
      
      if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
        await logError(supabase, SERVICE_NAME, 'API_TIMEOUT', 
          `Request to Google Maps API timed out`, 
          { error: errorMessage, attempt }
        );
      } else {
        await logError(supabase, SERVICE_NAME, 'API_NETWORK_ERROR', 
          `Network error while calling Google Maps API: ${errorMessage}`, 
          { error: errorMessage, attempt }
        );
      }
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      return null;
    }
  }
  
  return null;
}

// Get travel duration using Google Routes API (newer, real-time traffic)
async function getTravelDurationRoutesApi(
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
      const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
      
      const requestBody = {
        origin: {
          location: {
            latLng: {
              latitude: originLat,
              longitude: originLng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: destLat,
              longitude: destLng
            }
          }
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL', // Most accurate real-time traffic
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false
        },
        languageCode: 'pl',
        units: 'METRIC'
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.staticDuration'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      console.log(`Routes API response (attempt ${attempt}):`, JSON.stringify(data));

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Duration is in format "123s" (seconds)
        const durationStr = route.duration || route.staticDuration;
        if (durationStr) {
          const seconds = parseInt(durationStr.replace('s', ''));
          const minutes = Math.round(seconds / 60);
          console.log(`Routes API result: ${minutes} min (TRAFFIC_AWARE_OPTIMAL)`);
          return minutes;
        }
      }

      // Handle errors
      if (data.error) {
        await logError(supabase, SERVICE_NAME, 'ROUTES_API_ERROR',
          `Routes API error: ${data.error.message}`,
          { response: data, attempt }
        );
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        return null;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error calling Routes API (attempt ${attempt}):`, error);
      
      await logError(supabase, SERVICE_NAME, 'ROUTES_API_NETWORK_ERROR',
        `Network error calling Routes API: ${errorMessage}`,
        { error: errorMessage, attempt }
      );
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      return null;
    }
  }
  
  return null;
}

// Main function to get travel duration based on API preference
async function getTravelDuration(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey: string,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  trafficApi: TrafficApiType = 'distance_matrix_pessimistic'
): Promise<number | null> {
  console.log(`Getting travel duration using: ${trafficApi}`);
  
  switch (trafficApi) {
    case 'distance_matrix_pessimistic':
      return getTravelDurationDistanceMatrix(originLat, originLng, destLat, destLng, apiKey, supabase, 'pessimistic');
    case 'distance_matrix_best_guess':
      return getTravelDurationDistanceMatrix(originLat, originLng, destLat, destLng, apiKey, supabase, 'best_guess');
    case 'distance_matrix_optimistic':
      return getTravelDurationDistanceMatrix(originLat, originLng, destLat, destLng, apiKey, supabase, 'optimistic');
    case 'routes_api':
      return getTravelDurationRoutesApi(originLat, originLng, destLat, destLng, apiKey, supabase);
    default:
      console.log(`Unknown traffic API: ${trafficApi}, falling back to pessimistic`);
      return getTravelDurationDistanceMatrix(originLat, originLng, destLat, destLng, apiKey, supabase, 'pessimistic');
  }
}

// Get missing time slots that need to be calculated
async function getMissingSlots(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  today: string,
  dayOfWeek: number,
  schedule: CommuteSchedule,
  currentTime: string
): Promise<{ toWork: string[]; fromWork: string[] }> {
  console.log(`getMissingSlots called for user ${userId}, date ${today}, day ${dayOfWeek}, currentTime ${currentTime}`);
  console.log(`Schedule: to_work ${schedule.to_work_start}-${schedule.to_work_end}, from_work ${schedule.from_work_start}-${schedule.from_work_end}`);
  
  // Get existing records for today
  const { data: existingRecords, error } = await supabase
    .from('commute_travel_times')
    .select('departure_time, direction')
    .eq('user_id', userId)
    .eq('travel_date', today)
    .eq('day_of_week', dayOfWeek);

  if (error) {
    console.error('Error fetching existing records:', error);
    return { toWork: [], fromWork: [] };
  }

  const existingToWork = new Set(
    existingRecords
      ?.filter((r: { direction: string }) => r.direction === 'to_work')
      .map((r: { departure_time: string }) => r.departure_time.substring(0, 5)) || []
  );
  
  const existingFromWork = new Set(
    existingRecords
      ?.filter((r: { direction: string }) => r.direction === 'from_work')
      .map((r: { departure_time: string }) => r.departure_time.substring(0, 5)) || []
  );

  console.log(`Existing to_work records: ${Array.from(existingToWork).join(', ') || 'none'}`);
  console.log(`Existing from_work records: ${Array.from(existingFromWork).join(', ') || 'none'}`);

  const currentMinutes = timeToMinutes(currentTime);
  
  // Generate all slots up to current time for to_work
  const toWorkSlots = generateTimeSlots(schedule.to_work_start, schedule.to_work_end);
  console.log(`All to_work slots: ${toWorkSlots.join(', ')}`);
  
  const missingToWork = toWorkSlots.filter(slot => {
    const slotMinutes = timeToMinutes(slot);
    // Only include slots up to and including current time
    return slotMinutes <= currentMinutes && !existingToWork.has(slot);
  });

  // Generate all slots up to current time for from_work
  const fromWorkSlots = generateTimeSlots(schedule.from_work_start, schedule.from_work_end);
  console.log(`All from_work slots: ${fromWorkSlots.join(', ')}`);
  
  const missingFromWork = fromWorkSlots.filter(slot => {
    const slotMinutes = timeToMinutes(slot);
    // Only include slots up to and including current time
    return slotMinutes <= currentMinutes && !existingFromWork.has(slot);
  });

  console.log(`Missing to_work: ${missingToWork.join(', ') || 'none'}`);
  console.log(`Missing from_work: ${missingFromWork.join(', ') || 'none'}`);

  return { toWork: missingToWork, fromWork: missingFromWork };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // deno-lint-ignore no-explicit-any
  let supabase: any = null;
  let serviceStatus: ServiceStatus | null = null;
  let executionSuccess = false;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get service status
    serviceStatus = await getServiceStatus(supabase);
    
    // Parse request body to check for manual/force call and traffic API preference
    let isManualCall = false;
    let fillMissing = false;
    let requestedTrafficApi: TrafficApiType | null = null;
    try {
      const body = await req.text();
      if (body) {
        const parsed = JSON.parse(body);
        isManualCall = parsed.force === true;
        fillMissing = parsed.fillMissing === true || isManualCall; // Always fill missing on manual calls
        if (parsed.trafficApi) {
          requestedTrafficApi = parsed.trafficApi as TrafficApiType;
        }
      }
    } catch {
      // Body parsing failed, treat as CRON call
    }

    console.log(`Request type: ${isManualCall ? 'MANUAL' : 'CRON'}, fillMissing: ${fillMissing}, requestedTrafficApi: ${requestedTrafficApi || 'from_profile'}`);
    
    
    // Only check interval for CRON calls, not manual calls
    if (!isManualCall && shouldSkipExecution(serviceStatus)) {
      return new Response(
        JSON.stringify({ 
          message: "Skipped - too soon since last execution",
          isHealthy: serviceStatus?.is_healthy,
          currentInterval: serviceStatus?.current_interval_minutes
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!googleMapsApiKey) {
      console.error("GOOGLE_MAPS_API_KEY is not configured");
      await logError(supabase, SERVICE_NAME, 'CONFIG_ERROR', 
        'GOOGLE_MAPS_API_KEY is not configured', {}
      );
      await updateServiceStatus(supabase, false, serviceStatus);
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
      await logError(supabase, SERVICE_NAME, 'DATABASE_ERROR', 
        `Failed to fetch profiles: ${profilesError.message}`, 
        { error: profilesError }
      );
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles with complete addresses found');
      executionSuccess = true;
      await updateServiceStatus(supabase, true, serviceStatus);
      return new Response(
        JSON.stringify({ message: "No profiles to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${profiles.length} profiles with complete addresses`);

    let processedCount = 0;
    const errors: string[] = [];
    const processedSlots: string[] = [];

    for (const profile of profiles as Profile[]) {
      // Get schedule for current day
      const { data: schedules, error: scheduleError } = await supabase
        .from('commute_schedule')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('day_of_week', currentDayOfWeek);

      if (scheduleError) {
        console.error(`Error fetching schedule for user ${profile.user_id}:`, scheduleError);
        await logError(supabase, SERVICE_NAME, 'DATABASE_ERROR', 
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
      
      // Determine which slots to process
      let toWorkSlots: string[] = [];
      let fromWorkSlots: string[] = [];

      if (fillMissing) {
        // Fill all missing slots up to current time
        const missing = await getMissingSlots(supabase, profile.user_id, today, currentDayOfWeek, schedule, currentTime);
        toWorkSlots = missing.toWork;
        fromWorkSlots = missing.fromWork;
        console.log(`User ${profile.user_id}: Found ${toWorkSlots.length} missing to_work slots, ${fromWorkSlots.length} missing from_work slots`);
      } else {
        // Only process current time slot (CRON behavior)
        if (isTimeInRange(currentTime, schedule.to_work_start, schedule.to_work_end)) {
          toWorkSlots = [currentTime];
        }
        if (isTimeInRange(currentTime, schedule.from_work_start, schedule.from_work_end)) {
          fromWorkSlots = [currentTime];
        }
      }

      // Determine which traffic API to use for this user
      // Priority: request body > user profile preference > default (pessimistic)
      const userTrafficApi: TrafficApiType = requestedTrafficApi || 
        (profile.traffic_api_preference as TrafficApiType) || 
        'distance_matrix_pessimistic';
      
      console.log(`User ${profile.user_id}: Using traffic API: ${userTrafficApi}`);

      // Process to_work slots
      for (const timeSlot of toWorkSlots) {
        console.log(`User ${profile.user_id}: Calculating to_work time at ${timeSlot}`);
        
        const duration = await getTravelDuration(
          profile.home_lat!,
          profile.home_lng!,
          profile.work_lat!,
          profile.work_lng!,
          googleMapsApiKey,
          supabase,
          userTrafficApi
        );
        
        if (duration !== null) {
          const { error: upsertError } = await supabase
            .from('commute_travel_times')
            .upsert({
              user_id: profile.user_id,
              travel_date: today,
              day_of_week: currentDayOfWeek,
              direction: 'to_work',
              departure_time: timeSlot,
              travel_duration_minutes: duration,
              origin_address: profile.home_address,
              destination_address: profile.work_address,
              calculated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,travel_date,direction,departure_time',
            });

          if (upsertError) {
            console.error(`Error saving to_work time for user ${profile.user_id}:`, upsertError);
            await logError(supabase, SERVICE_NAME, 'DATABASE_ERROR', 
              `Failed to save to_work time: ${upsertError.message}`, 
              { userId: profile.user_id, direction: 'to_work', time: timeSlot, error: upsertError }
            );
            errors.push(`User ${profile.user_id} to_work ${timeSlot}: ${upsertError.message}`);
          } else {
            console.log(`Saved to_work time for user ${profile.user_id} at ${timeSlot}: ${duration} min`);
            processedSlots.push(`to_work:${timeSlot}`);
            processedCount++;
          }
        } else {
          console.log(`Failed to get to_work duration for user ${profile.user_id} at ${timeSlot}`);
        }
        
        // Small delay between API calls to avoid rate limiting
        if (toWorkSlots.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Process from_work slots
      for (const timeSlot of fromWorkSlots) {
        console.log(`User ${profile.user_id}: Calculating from_work time at ${timeSlot}`);
        
        const duration = await getTravelDuration(
          profile.work_lat!,
          profile.work_lng!,
          profile.home_lat!,
          profile.home_lng!,
          googleMapsApiKey,
          supabase,
          userTrafficApi
        );
        
        if (duration !== null) {
          const { error: upsertError } = await supabase
            .from('commute_travel_times')
            .upsert({
              user_id: profile.user_id,
              travel_date: today,
              day_of_week: currentDayOfWeek,
              direction: 'from_work',
              departure_time: timeSlot,
              travel_duration_minutes: duration,
              origin_address: profile.work_address,
              destination_address: profile.home_address,
              calculated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,travel_date,direction,departure_time',
            });

          if (upsertError) {
            console.error(`Error saving from_work time for user ${profile.user_id}:`, upsertError);
            await logError(supabase, SERVICE_NAME, 'DATABASE_ERROR', 
              `Failed to save from_work time: ${upsertError.message}`, 
              { userId: profile.user_id, direction: 'from_work', time: timeSlot, error: upsertError }
            );
            errors.push(`User ${profile.user_id} from_work ${timeSlot}: ${upsertError.message}`);
          } else {
            console.log(`Saved from_work time for user ${profile.user_id} at ${timeSlot}: ${duration} min`);
            processedSlots.push(`from_work:${timeSlot}`);
            processedCount++;
          }
        } else {
          console.log(`Failed to get from_work duration for user ${profile.user_id} at ${timeSlot}`);
        }
        
        // Small delay between API calls to avoid rate limiting
        if (fromWorkSlots.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    console.log(`Processed ${processedCount} travel time calculations`);
    
    // Mark as success if we processed at least something or had no errors
    executionSuccess = errors.length === 0;
    await updateServiceStatus(supabase, executionSuccess, serviceStatus);

    return new Response(
      JSON.stringify({ 
        message: "Commute times calculated",
        processed: processedCount,
        slots: processedSlots,
        errors: errors.length > 0 ? errors : undefined,
        currentTime,
        currentDay: currentDayOfWeek,
        date: today,
        isHealthy: executionSuccess,
        nextInterval: executionSuccess ? DEFAULT_INTERVAL : FALLBACK_INTERVAL,
        mode: isManualCall ? 'manual' : 'cron'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in calculate-commute-times:", error);
    
    if (supabase) {
      await logError(supabase, SERVICE_NAME, 'FATAL_ERROR', 
        error instanceof Error ? error.message : 'Unknown fatal error', 
        { stack: error instanceof Error ? error.stack : undefined }
      );
      await updateServiceStatus(supabase, false, serviceStatus);
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
