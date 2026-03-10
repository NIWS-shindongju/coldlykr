
-- Create enums for contacts
CREATE TYPE public.contact_category AS ENUM (
  '음식점·카페', '쇼핑·유통', 'IT·소프트웨어', '제조업', '서비스업', '의료·헬스', '교육', '부동산·건설'
);

CREATE TYPE public.contact_region AS ENUM (
  '서울', '경기', '부산', '인천', '대구', '광주', '대전'
);

-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  representative TEXT,
  email TEXT NOT NULL,
  category contact_category NOT NULL,
  region contact_region NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for search and filtering
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_category ON public.contacts(category);
CREATE INDEX idx_contacts_region ON public.contacts(region);
CREATE INDEX idx_contacts_company_name ON public.contacts USING gin(to_tsvector('simple', company_name));

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contacts"
  ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own contacts"
  ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts"
  ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts"
  ON public.contacts FOR DELETE USING (auth.uid() = user_id);
