-- Create Registrations table to hold overall order and contact details
CREATE TABLE IF NOT EXISTS public.golf_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    payment_reference TEXT NOT NULL UNIQUE
);

-- Create Registration Items table to hold selected package details and quantities
CREATE TABLE IF NOT EXISTS public.golf_registration_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.golf_registrations(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL,
    package_title TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_item NUMERIC(10, 2) NOT NULL
);

-- Create Players table to hold participant details
CREATE TABLE IF NOT EXISTS public.golf_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.golf_registrations(id) ON DELETE CASCADE,
    player_number INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    handicap TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_golf_reg_items_registration_id ON public.golf_registration_items(registration_id);
CREATE INDEX IF NOT EXISTS idx_golf_players_registration_id ON public.golf_players(registration_id);
CREATE INDEX IF NOT EXISTS idx_golf_registrations_email ON public.golf_registrations(contact_email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.golf_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_registration_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_players ENABLE ROW LEVEL SECURITY;

-- Enable Anonymous Public Insert Policies (so clients can register)
CREATE POLICY "Allow public insert on golf_registrations" 
ON public.golf_registrations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public insert on golf_registration_items" 
ON public.golf_registration_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public insert on golf_players" 
ON public.golf_players 
FOR INSERT 
WITH CHECK (true);

-- Enable Read-Only Policies for Authenticated Admin Users
CREATE POLICY "Allow authenticated read on golf_registrations" 
ON public.golf_registrations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated read on golf_registration_items" 
ON public.golf_registration_items 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated read on golf_players" 
ON public.golf_players 
FOR SELECT 
TO authenticated 
USING (true);

-- Create Public View for "Who's In" to protect emails
CREATE OR REPLACE VIEW public.public_golf_players AS
SELECT full_name, handicap, created_at FROM public.golf_players;

GRANT SELECT ON public.public_golf_players TO anon;
GRANT SELECT ON public.public_golf_players TO authenticated;

-- Function to securely calculate available holes based on registered items
CREATE OR REPLACE FUNCTION public.get_available_holes()
RETURNS integer AS $$
DECLARE
  used_holes integer;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN package_id = 'diamond-record' THEN quantity * 2
      WHEN package_id IN ('hole-sponsor', 'gold-record', 'platinum-record', 'longest-drive', 'closest-to-pin') THEN quantity * 1
      ELSE 0
    END
  ), 0) INTO used_holes
  FROM public.golf_registration_items;
  
  RETURN 18 - used_holes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_available_holes TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_holes TO authenticated;
