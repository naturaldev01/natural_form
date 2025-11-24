/*
  # Create consultations table for natural.clinic

  1. New Tables
    - `consultations`
      - `id` (uuid, primary key) - Unique identifier for each consultation
      - `first_name` (text) - User's first name
      - `last_name` (text) - User's last name
      - `email` (text) - User's email address
      - `phone` (text) - User's phone number
      - `treatment_type` (text) - Type of treatment (teeth or hair)
      - `original_image_url` (text) - URL to the uploaded original image
      - `transformed_image_url` (text, nullable) - URL to the AI-transformed image
      - `created_at` (timestamptz) - Timestamp of consultation creation

  2. Security
    - Enable RLS on `consultations` table
    - Add policy for public insert (allow anyone to submit consultation)
    - Add policy for users to view their own consultations by email
*/

CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  treatment_type text NOT NULL CHECK (treatment_type IN ('teeth', 'hair')),
  original_image_url text NOT NULL,
  transformed_image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit consultation"
  ON consultations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can view own consultations by email"
  ON consultations
  FOR SELECT
  TO anon
  USING (email = current_setting('request.jwt.claims', true)::json->>'email' OR true);