CREATE TABLE public.domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  spf_configured boolean NOT NULL DEFAULT false,
  dkim_configured boolean NOT NULL DEFAULT false,
  dmarc_configured boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, domain)
);

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own domains" ON public.domains FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own domains" ON public.domains FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own domains" ON public.domains FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own domains" ON public.domains FOR DELETE TO authenticated USING (auth.uid() = user_id);