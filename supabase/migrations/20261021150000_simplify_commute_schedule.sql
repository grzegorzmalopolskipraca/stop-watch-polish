ALTER TABLE public.commute_schedule
  ADD COLUMN is_commute_day boolean NOT NULL DEFAULT false,
  ADD COLUMN work_hours integer NOT NULL DEFAULT 8
    CHECK (work_hours >= 1 AND work_hours <= 12);

-- Start with the weekday departure window users already configured, then
-- apply one shared schedule to all days. Preserve all existing travel records.
WITH weekday_window AS (
  SELECT
    user_id,
    min(to_work_start) AS departure_start,
    max(to_work_end) AS departure_end
  FROM public.commute_schedule
  WHERE day_of_week BETWEEN 1 AND 5
  GROUP BY user_id
)
UPDATE public.commute_schedule AS schedule
SET
  is_commute_day = schedule.day_of_week BETWEEN 1 AND 5,
  work_hours = 8,
  to_work_start = shared.departure_start,
  to_work_end = shared.departure_end,
  from_work_start = (shared.departure_start + interval '7 hours')::time,
  from_work_end = (shared.departure_end + interval '9 hours')::time
FROM weekday_window AS shared
WHERE schedule.user_id = shared.user_id;

ALTER TABLE public.commute_schedule
  ALTER COLUMN from_work_end SET DEFAULT '19:00';

-- New users start with weekdays selected, a 07:00-10:00 departure window,
-- and an eight-hour workday (return window 14:00-19:00).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);

  INSERT INTO public.commute_schedule (user_id, day_of_week, is_commute_day)
  VALUES
    (NEW.id, 0, false),
    (NEW.id, 1, true),
    (NEW.id, 2, true),
    (NEW.id, 3, true),
    (NEW.id, 4, true),
    (NEW.id, 5, true),
    (NEW.id, 6, false);

  RETURN NEW;
END;
$$;
