
ALTER TABLE public.weekly_plans ADD COLUMN completed_days jsonb DEFAULT '[]'::jsonb;
