# Quick Deployment Guide - Google Maps API Optimization

## ⚡ Quick Start (5 minutes)

### Step 1: Deploy Functions
```bash
# Deploy all three functions
npx supabase functions deploy get-traffic-data-batch
npx supabase functions deploy get-traffic-data
npx supabase functions deploy auto-traffic-monitor
```

### Step 2: Verify API Key
```bash
# Check if Google Maps API key is set
npx supabase secrets list | grep GOOGLE_MAPS_API_KEY

# If not set, add it:
npx supabase secrets set GOOGLE_MAPS_API_KEY=your_key_here
```

### Step 3: Test Batch Function
```bash
npx supabase functions invoke get-traffic-data-batch --body '{
  "routes": [
    {
      "origin": {"lat": 51.058494, "lng": 17.014247},
      "destination": {"lat": 51.061066, "lng": 16.998068},
      "street": "Zwycięska",
      "direction": "to_center"
    }
  ]
}'
```

**Expected output:**
```json
{
  "results": [...],
  "stats": {
    "total": 1,
    "cached": 0,
    "api_calls": 1,
    "cache_hit_rate": "0.0%",
    "total_time_ms": 500
  }
}
```

### Step 4: Test Auto-Monitor
```bash
npx supabase functions invoke auto-traffic-monitor
```

**Expected output:**
```json
{
  "success": true,
  "processed": 26,
  "skipped": 0,
  "errors": 0
}
```

### Step 5: Monitor Logs (Live)
```bash
npx supabase functions logs auto-traffic-monitor --tail
```

**Watch for:**
- ✅ "Using BATCH API"
- ✅ "Cache duration: 15min (RUSH HOUR)" or "30min (off-peak)"
- ✅ "Cache hit rate: XX%"
- ✅ "Completed. Success: 26"

---

## 🎯 What Was Changed

### New Function Created
- `supabase/functions/get-traffic-data-batch/index.ts`
  - Batches up to 100 routes in single API call
  - Uses Distance Matrix API instead of Directions API
  - Dynamic 15-30 min cache based on time

### Functions Modified
- `supabase/functions/get-traffic-data/index.ts`
  - Added dynamic cache (15-30 min)
  - Better logging

- `supabase/functions/auto-traffic-monitor/index.ts`
  - Uses batch API instead of sequential calls
  - No more 30-second delays
  - 98% faster execution

### Frontend
- ✅ No changes needed (backward compatible)

---

## 📊 Expected Results

### Before Optimization
```
Auto-monitor run:
- Duration: 13 minutes
- API calls: 26 (Directions API)
- Cost: $0.13
- Monthly: $132.50
```

### After Optimization
```
Auto-monitor run:
- Duration: 5-10 seconds
- API calls: 1 (Distance Matrix API, batched)
- Cost: $0.001 (with 80% cache hit)
- Monthly: $0.90

SAVINGS: 99.3% ($131.60/month)
```

---

## 🕐 Cache Behavior by Time

| Time | Cache Duration | Why |
|------|----------------|-----|
| 7-10 AM | 15 min | Morning rush hour |
| 10 AM - 4 PM | 30 min | Stable midday traffic |
| 4-7 PM | 15 min | Evening rush hour |
| 7-10 PM | 30 min | Stable evening traffic |

---

## ✅ Verification Checklist

After deployment, verify:

**Immediate (5 minutes):**
- [ ] Batch function deploys without errors
- [ ] Auto-monitor completes in < 15 seconds
- [ ] Logs show "BATCH API" messages
- [ ] Logs show cache duration (15 or 30 min)

**First Hour:**
- [ ] Frontend still displays traffic correctly
- [ ] No error logs in Supabase dashboard
- [ ] Cache hit rate increases on second run

**First Day:**
- [ ] Cache hit rate > 70%
- [ ] Rush hour shows 15-min cache
- [ ] Off-peak shows 30-min cache
- [ ] All streets reporting successfully

**First Week:**
- [ ] Google Cloud Console shows < $1 API usage
- [ ] Cache hit rate > 80%
- [ ] No user complaints about stale data

---

## 🔍 Monitoring Commands

### View Recent Logs
```bash
# Auto-monitor logs
npx supabase functions logs auto-traffic-monitor --limit 50

# Batch API logs
npx supabase functions logs get-traffic-data-batch --limit 50
```

### Check Function Status
```bash
# List all functions
npx supabase functions list

# Check specific function
npx supabase functions inspect auto-traffic-monitor
```

### Test Individual Function
```bash
# Test auto-monitor (triggers full monitoring run)
npx supabase functions invoke auto-traffic-monitor

# Test batch with custom routes
npx supabase functions invoke get-traffic-data-batch --body @test-routes.json
```

---

## 🚨 Troubleshooting

### Problem: "API key not configured"
```bash
# Set the key
npx supabase secrets set GOOGLE_MAPS_API_KEY=AIza...your_key
```

### Problem: "Distance Matrix API error"
1. Go to Google Cloud Console
2. Enable "Distance Matrix API"
3. Ensure billing is active

### Problem: Cache hit rate is 0%
- **Expected on first run** - cache is empty
- Wait for second run (30 min later)
- Should see 60-90% cache hits

### Problem: Logs show errors
```bash
# View detailed error logs
npx supabase functions logs auto-traffic-monitor --tail

# Check for specific error patterns
npx supabase functions logs auto-traffic-monitor | grep ERROR
```

### Problem: Frontend shows old data
- **This is expected** with 15-30 min cache
- Data refreshes every 15-30 minutes
- Trade-off for 99% cost savings

---

## 💰 Cost Tracking

### Google Cloud Console
1. Go to: https://console.cloud.google.com
2. APIs & Services → Dashboard
3. Find "Distance Matrix API"
4. Check daily usage

**Expected:**
- ~6 requests/day (with 80% cache hit)
- ~$0.03/day
- ~$0.90/month

### Supabase Logs
Check batch function logs for cost tracking:
```
[Batch] Cost saved: $0.105, API cost: $0.005
```

---

## 🔄 Rollback (If Needed)

If something goes wrong, revert to old behavior:

```bash
# Restore old auto-traffic-monitor (before batch optimization)
git checkout HEAD~1 -- supabase/functions/auto-traffic-monitor/index.ts

# Redeploy old version
npx supabase functions deploy auto-traffic-monitor
```

The old `get-traffic-data` function still works independently, so frontend will be unaffected.

---

## 📞 Support

**Documentation:**
- Full details: `DISTANCE_MATRIX_OPTIMIZATION.md`
- Summary: `OPTIMIZATION_SUMMARY.md`
- This guide: `DEPLOY_OPTIMIZATION.md`

**Common Questions:**

**Q: Will this break the frontend?**
A: No, it's backward compatible. Frontend uses `get-traffic-data` which still works.

**Q: What if Google changes pricing?**
A: Batching will still provide savings. 26 requests → 1 request is always cheaper.

**Q: Can I adjust rush hour times?**
A: Yes, edit the `getCacheDuration()` function in both files:
- `supabase/functions/get-traffic-data/index.ts`
- `supabase/functions/get-traffic-data-batch/index.ts`

**Q: How do I disable auto-monitoring temporarily?**
A: Update `auto_traffic_settings` table, set `is_enabled = false`

---

## 🎉 Success Indicators

You'll know it's working when you see:

✅ Logs show "BATCH API" instead of sequential processing
✅ Execution time drops from 13 min to ~10 seconds
✅ Cache hit rate increases to 70-90% after first day
✅ Google Cloud Console shows < $1/month usage
✅ Frontend still displays traffic correctly
✅ Cost tracking logs show savings

---

## Next Steps

1. **Deploy now** (5 minutes)
2. **Monitor for 24 hours** (verify cache builds up)
3. **Check Google Cloud Console** (confirm cost reduction)
4. **Consider future optimizations** (weekend skipping, street prioritization)

**Ready? Run the deployment commands above!** 🚀
