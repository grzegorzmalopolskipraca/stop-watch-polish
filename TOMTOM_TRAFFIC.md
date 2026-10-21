# TomTom traffic setup

All live traffic routes, automatic street monitoring, and commute time calculations use TomTom Routing API. The API key is read only by Supabase Edge Functions as `TOMTOM_API_KEY`.

## Create a key

1. Sign in to [MyTomTom](https://my.tomtom.com/).
2. Open **Keys → API & SDK Keys** and use the existing **My first API key** or create a dedicated key for eJedzie.
3. If you restrict products on the key, enable **Routing API**. Keep the key server-side; do not add it to a `VITE_*` variable or commit it to the repository.
4. Copy the key.

TomTom's current pricing page lists a free monthly quota for Routing API. Check the quota and current usage in the TomTom dashboard; the quota is shared by all route and commute requests made with that key.

## Add the Supabase secret

In the Supabase project dashboard, open **Project Settings → Edge Functions → Secrets**, add a secret named exactly `TOMTOM_API_KEY`, paste the copied value, and save it.

Once the code is deployed, redeploy these Edge Functions so they load the secret:

- `get-traffic-data`
- `get-traffic-data-batch`
- `calculate-commute-times`

Apply the migration `supabase/migrations/20261021090000_switch_traffic_provider_to_tomtom.sql` as part of the database deployment. It sets existing profiles to TomTom and clears cached Google traffic responses.

## Request volume

The street monitor has 26 directional routes. Its cache is one hour from 06:30 to 20:00 and three hours overnight. If every route is refreshed at each cache expiry, that is roughly 13,300 TomTom requests in a 30-day month, before commute calculations and user-triggered traffic requests. Check TomTom usage after deployment; a busy commute schedule may require lowering the monitoring frequency or increasing cache time to stay within the free quota.
