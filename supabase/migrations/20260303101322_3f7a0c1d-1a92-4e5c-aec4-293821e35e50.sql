
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  profile_type TEXT NOT NULL DEFAULT 'cliente' CHECK (profile_type IN ('cliente', 'vendedor')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create farmer_details table
CREATE TABLE public.farmer_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT,
  cae_code TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  registration_step INTEGER NOT NULL DEFAULT 1 CHECK (registration_step IN (1, 2)),
  initial_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.farmer_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own details" ON public.farmer_details FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public can view completed farmer details" ON public.farmer_details FOR SELECT USING (registration_step = 2);
CREATE POLICY "Farmers can insert own details" ON public.farmer_details FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Farmers can update own details" ON public.farmer_details FOR UPDATE USING (auth.uid() = user_id);

-- Create farmer_certificates table
CREATE TABLE public.farmer_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.farmer_details(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.farmer_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own certificates" ON public.farmer_certificates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.farmer_details fd WHERE fd.id = farmer_id AND fd.user_id = auth.uid())
);
CREATE POLICY "Farmers can upload certificates" ON public.farmer_certificates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.farmer_details fd WHERE fd.id = farmer_id AND fd.user_id = auth.uid())
);
CREATE POLICY "Farmers can delete own certificates" ON public.farmer_certificates FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.farmer_details fd WHERE fd.id = farmer_id AND fd.user_id = auth.uid())
);

-- Storage bucket for certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false);

CREATE POLICY "Farmers can upload certificates" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Farmers can view own certificates" ON storage.objects FOR SELECT USING (
  bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Farmers can delete own certificates" ON storage.objects FOR DELETE USING (
  bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, profile_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'profile_type', 'cliente')
  );
  
  -- If farmer, create farmer_details entry
  IF COALESCE(NEW.raw_user_meta_data->>'profile_type', 'cliente') = 'vendedor' THEN
    INSERT INTO public.farmer_details (user_id, registration_step)
    VALUES (NEW.id, 1);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_farmer_details_updated_at BEFORE UPDATE ON public.farmer_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
