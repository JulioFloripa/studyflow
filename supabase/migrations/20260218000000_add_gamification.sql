-- Add gamification fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unlocked_badges TEXT[] DEFAULT '{}';

-- Add ease_factor and next_interval to reviews
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS ease_factor INTEGER,
ADD COLUMN IF NOT EXISTS next_interval INTEGER;

-- Add comment to ease_factor column
COMMENT ON COLUMN public.reviews.ease_factor IS 'Difficulty rating from 1-5 (1=very hard, 5=very easy)';
COMMENT ON COLUMN public.reviews.next_interval IS 'Calculated next review interval in days';
