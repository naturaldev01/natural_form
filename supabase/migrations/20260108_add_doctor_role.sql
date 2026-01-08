/*
  # Add doctor role to user_profiles

  1. Changes
    - Update role constraint to include 'doctor' role
    - This allows doctors to register and use the internal studio tool

  2. Notes
    - Doctors can access /studio for demonstrations
    - Doctors can access /dashboard to view consultations
    - Doctors do NOT send data to Zoho CRM (internal use only)
*/

-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_role_check' 
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
  END IF;
END $$;

-- Add new constraint with doctor role included
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('admin', 'sales', 'marketing', 'doctor'));
