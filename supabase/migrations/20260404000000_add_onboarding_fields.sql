-- Add onboarding fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- Add subscription fields for paywall
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'institutional', 'monthly', 'semestral', 'annual')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Comment on new columns
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether the user has completed the onboarding wizard';
COMMENT ON COLUMN public.profiles.onboarding_data IS 'JSON data collected during onboarding (age, goals, study days, etc.)';
COMMENT ON COLUMN public.profiles.subscription_type IS 'User subscription type: free, institutional (Fleming), monthly, semestral, annual';
COMMENT ON COLUMN public.profiles.subscription_expires_at IS 'When the paid subscription expires (null for institutional/free)';
