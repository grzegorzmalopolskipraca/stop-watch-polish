---
name: creating-edge-function
description: Creates Supabase Edge Functions (Deno runtime) with proper error handling, validation, CORS, and Supabase client setup. Use when creating new backend API endpoints, serverless functions, or adding business logic that runs on the server.
---

# Creating Supabase Edge Function

## When to Use This Skill

Use when you need to create a new Edge Function for:
- Accepting form submissions (traffic reports, chat messages, votes)
- Calling external APIs (Google Routes, Weather, OneSignal)
- Complex calculations that shouldn't run on client
- Database operations requiring service role key
- Cron jobs and scheduled tasks

## Standard Edge Function Template

```typescript
// supabase/functions/[function-name]/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Parse request body
    const { param1, param2, param3 } = await req.json();

    // Validate required fields
    if (!param1 || !param2) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: param1, param2'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Business logic here
    console.log('[FunctionName] Processing:', { param1, param2 });

    // Database operation
    const { data, error } = await supabase
      .from('table_name')
      .insert({
        param1,
        param2,
        param3,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[FunctionName] Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[FunctionName] Success:', data);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[FunctionName] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

## Common Patterns

### Pattern 1: Simple Data Insertion

```typescript
// Use for: submit-traffic-report, submit-chat-message, etc.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { street, status, direction } = await req.json();

    // Validate
    const validStatuses = ['stoi', 'toczy_sie', 'jedzie'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(/* ... */);

    const { data, error } = await supabase
      .from('traffic_reports')
      .insert({ street, status, direction, reported_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Pattern 2: External API Call

```typescript
// Use for: get-weather-forecast, get-traffic-data, etc.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { lat, lon } = await req.json();

    // Call external API
    const apiKey = Deno.env.get('WEATHER_API_KEY');
    const response = await fetch(
      `https://api.weather.com/forecast?lat=${lat}&lon=${lon}&key=${apiKey}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const weatherData = await response.json();

    // Transform data if needed
    const transformed = {
      temperature: weatherData.main.temp,
      condition: weatherData.weather[0].main.toLowerCase(),
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(transformed),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Pattern 3: Trigger Another Function

```typescript
// Use for: submit-traffic-report → send-push-notifications

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { street, status, direction } = await req.json();

    const supabase = createClient(/* ... */);

    // 1. Insert traffic report
    const { data: report, error: insertError } = await supabase
      .from('traffic_reports')
      .insert({ street, status, direction })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Trigger push notifications
    try {
      const notifyResponse = await supabase.functions.invoke('send-push-notifications', {
        body: {
          street,
          status,
          direction
        }
      });

      console.log('[TrafficReport] Notifications triggered:', notifyResponse);
    } catch (notifyError) {
      // Don't fail the main operation if notifications fail
      console.error('[TrafficReport] Notification error:', notifyError);
    }

    return new Response(
      JSON.stringify({ success: true, data: report }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Pattern 4: Rate Limiting

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { user_fingerprint, message } = await req.json();

    const supabase = createClient(/* ... */);

    // Check rate limit (e.g., 10 messages per hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: recentMessages, error: countError } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('user_fingerprint', user_fingerprint)
      .gte('created_at', oneHourAgo.toISOString());

    if (countError) throw countError;

    if (recentMessages && recentMessages.length >= 10) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Maximum 10 messages per hour.'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Proceed with insertion
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ user_fingerprint, message })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Validation Patterns

### String Validation

```typescript
// Required string
if (!street || typeof street !== 'string' || street.trim() === '') {
  return new Response(
    JSON.stringify({ error: 'Invalid street parameter' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Enum validation
const validDirections = ['do centrum', 'od centrum'];
if (!validDirections.includes(direction)) {
  return new Response(
    JSON.stringify({
      error: `Invalid direction. Must be one of: ${validDirections.join(', ')}`
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Number Validation

```typescript
// Required number with range
if (typeof speed !== 'number' || speed < 0 || speed > 200) {
  return new Response(
    JSON.stringify({ error: 'Invalid speed. Must be a number between 0 and 200' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

## Environment Variables

```typescript
// Required environment variable
const apiKey = Deno.env.get('WEATHER_API_KEY');
if (!apiKey) {
  throw new Error('WEATHER_API_KEY environment variable not set');
}

// Optional with default
const maxRetries = parseInt(Deno.env.get('MAX_RETRIES') || '3');
```

## Testing Edge Functions Locally

```bash
# Start Supabase locally
npx supabase start

# Deploy function locally
npx supabase functions deploy [function-name] --no-verify-jwt

# Test with curl
curl -X POST http://localhost:54321/functions/v1/[function-name] \
  -H "Content-Type: application/json" \
  -d '{"param1":"value1","param2":"value2"}'
```

## Frontend Usage

```typescript
// In React component
const submitReport = async (status: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('[function-name]', {
      body: {
        street: selectedStreet,
        status,
        direction
      }
    });

    if (error) {
      console.error('Function error:', error);
      toast.error('Nie udało się wysłać');
      return;
    }

    console.log('Success:', data);
    toast.success('Wysłano pomyślnie!');
  } catch (error) {
    console.error('Unexpected error:', error);
    toast.error('Wystąpił błąd');
  }
};
```

## Deployment

```bash
# Deploy to production
npx supabase functions deploy [function-name]

# Deploy with environment variables
npx supabase secrets set WEATHER_API_KEY=your_key_here

# List deployed functions
npx supabase functions list
```

## Critical Checklist

Before completing an Edge Function:

- [ ] CORS headers configured (OPTIONS handler + headers in all responses)
- [ ] Input validation for all parameters
- [ ] Error handling with try/catch
- [ ] Console logging for debugging (`[FunctionName]` prefix)
- [ ] Proper HTTP status codes (200, 400, 429, 500)
- [ ] JSON response format consistent
- [ ] Supabase client created with service role key
- [ ] Environment variables accessed via `Deno.env.get()`
- [ ] Tested locally with `npx supabase functions serve`
- [ ] Documented in API docs (if public endpoint)

## Common Mistakes to Avoid

❌ **Missing CORS headers:**
```typescript
return new Response(JSON.stringify(data)); // ← Browser will block!
```

✓ **Correct:**
```typescript
return new Response(
  JSON.stringify(data),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

❌ **Not handling OPTIONS:**
```typescript
serve(async (req) => {
  const { data } = await req.json(); // ← Fails on OPTIONS!
});
```

✓ **Correct:**
```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  // ... rest of code
});
```

❌ **No validation:**
```typescript
const { street } = await req.json();
// ← What if street is undefined, null, or invalid?
```

✓ **Correct:**
```typescript
const { street } = await req.json();
if (!street || typeof street !== 'string') {
  return new Response(
    JSON.stringify({ error: 'Invalid street' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

## File Structure

```
supabase/functions/
└── [function-name]/
    └── index.ts  ← Your Edge Function code
```

## References

- Existing functions: `supabase/functions/*/index.ts`
- Supabase docs: https://supabase.com/docs/guides/functions
- Deno docs: https://deno.land/manual
