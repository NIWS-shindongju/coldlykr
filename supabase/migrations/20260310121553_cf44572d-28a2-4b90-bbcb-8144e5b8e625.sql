-- Add sequence_step to campaign_contacts
ALTER TABLE public.campaign_contacts ADD COLUMN IF NOT EXISTS sequence_step integer NOT NULL DEFAULT 1;

-- Add sequence settings to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS use_sequence boolean NOT NULL DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sequence_2_days integer DEFAULT 3;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sequence_2_subject text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sequence_2_body text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sequence_3_days integer DEFAULT 7;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sequence_3_subject text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sequence_3_body text;