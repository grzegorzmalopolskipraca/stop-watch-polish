-- Add commute-day flag and work-hours length to the commute schedule (additive, defaulted)
ALTER TABLE public.commute_schedule
  ADD COLUMN IF NOT EXISTS is_commute_day boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS work_hours integer NOT NULL DEFAULT 8;

COMMENT ON COLUMN public.commute_schedule.is_commute_day IS 'Whether the user commutes on this weekday';
COMMENT ON COLUMN public.commute_schedule.work_hours IS 'Length of the workday in hours';