# TomTom API setup

Live traffic routes, automatic street monitoring, commute time calculations, address validation, and weather forecasts use TomTom APIs. The key is read only by Supabase Edge Functions as `TOMTOM_API_KEY`. The location picker displays OpenStreetMap tiles and sends address searches through the `validate-address` Edge Function; it does not expose the TomTom key in the browser.

## Create a key

1. Sign in to [MyTomTom](https://my.tomtom.com/).
2. Open **Keys → API & SDK Keys** and use the existing **My first API key** or create a dedicated key for eJedzie.
3. Enable **Routing API** and **Geocoding API** for route, commute, and address features. TomTom's Weather Forecast API documentation currently requires requesting access; confirm that access is enabled for the key if forecasts return an authorization error. Keep the key server-side; do not add it to a `VITE_*` variable or commit it to the repository.
4. Copy the key.

TomTom's current pricing page lists a free monthly quota for Routing API. Check the quota and current usage in the TomTom dashboard; the quota is shared by all route and commute requests made with that key.

## Add the Supabase secret

In the Supabase project dashboard, open **Project Settings → Edge Functions → Secrets**, add a secret named exactly `TOMTOM_API_KEY`, paste the copied value, and save it.

Once the code is deployed, redeploy these Edge Functions so they load the secret:

- `get-traffic-data`
- `get-traffic-data-batch`
- `calculate-commute-times`
- `validate-address`
- `get-weather-forecast`

Apply the migration `supabase/migrations/20261021090000_switch_traffic_provider_to_tomtom.sql` as part of the database deployment. It sets existing profiles to TomTom and clears cached Google traffic responses.

## Request volume

The street monitor has 26 directional routes. Its cache is one hour from 06:30 to 20:00 and three hours overnight. If every route is refreshed at each cache expiry, that is roughly 13,300 TomTom requests in a 30-day month, before commute calculations and user-triggered traffic requests. Check TomTom usage after deployment; a busy commute schedule may require lowering the monitoring frequency or increasing cache time to stay within the free quota.
