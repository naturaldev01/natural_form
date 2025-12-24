-- Migration: Add performance indexes to consultations table
-- Run this in Supabase Dashboard > SQL Editor
-- This will fix SQLSTATE 57014 timeout errors

-- 1. Main index for ordering by created_at DESC
CREATE INDEX IF NOT EXISTS consultations_created_at_desc_idx
ON public.consultations (created_at DESC);

-- 2. Compound index for treatment_type filter with created_at ordering (used in dashboard)
CREATE INDEX IF NOT EXISTS consultations_treatment_created_idx
ON public.consultations (treatment_type, created_at DESC);

-- 3. Index for first_name ordering (used in dashboard sorting)
CREATE INDEX IF NOT EXISTS consultations_first_name_idx
ON public.consultations (first_name);

-- 4. Index for email ordering (used in dashboard sorting)
CREATE INDEX IF NOT EXISTS consultations_email_idx
ON public.consultations (email);

-- 5. Increase statement timeout (optional - run if still getting timeouts)
ALTER ROLE authenticator SET statement_timeout = '30s';
SELECT pg_reload_conf();

