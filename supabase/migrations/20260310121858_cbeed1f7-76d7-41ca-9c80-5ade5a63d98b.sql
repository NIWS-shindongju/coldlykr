CREATE TABLE public.email_warmups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  duration_weeks integer NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'idle',
  started_at timestamp with time zone,
  current_day integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_warmups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own warmups" ON public.email_warmups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own warmups" ON public.email_warmups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own warmups" ON public.email_warmups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own warmups" ON public.email_warmups FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_email_warmups_updated_at
  BEFORE UPDATE ON public.email_warmups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();