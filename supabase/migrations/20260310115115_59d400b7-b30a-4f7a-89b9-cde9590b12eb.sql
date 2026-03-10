
-- Create campaign_contacts table to track individual email sends
CREATE TABLE public.campaign_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'bounced', 'opened')),
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_contacts_campaign ON public.campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_status ON public.campaign_contacts(status);
CREATE INDEX idx_campaign_contacts_user ON public.campaign_contacts(user_id);

ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaign_contacts"
  ON public.campaign_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own campaign_contacts"
  ON public.campaign_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaign_contacts"
  ON public.campaign_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaign_contacts"
  ON public.campaign_contacts FOR DELETE USING (auth.uid() = user_id);

-- Add columns to campaigns table for send settings
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS sender_email TEXT,
  ADD COLUMN IF NOT EXISTS reply_email TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS send_interval INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS max_per_day INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS daily_sent_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_send_date DATE;

-- Enable realtime for campaign_contacts to show live progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_contacts;
