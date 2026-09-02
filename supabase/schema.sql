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
SELECT full_name, handicap, created_at, registration_id FROM public.golf_players;

GRANT SELECT ON public.public_golf_players TO anon;
GRANT SELECT ON public.public_golf_players TO authenticated;

-- Function to securely calculate available inventory for sponsorships
CREATE OR REPLACE FUNCTION public.get_inventory_status()
RETURNS json AS $$
DECLARE
  used_general_holes integer;
  used_longest_drive integer;
  used_closest_to_pin integer;
  used_diamond integer;
BEGIN
  -- General holes
  SELECT COALESCE(SUM(
    CASE 
      WHEN package_id = 'diamond-record' THEN quantity * 2
      WHEN package_id IN ('hole-sponsor', 'gold-record', 'platinum-record') THEN quantity * 1
      ELSE 0
    END
  ), 0) INTO used_general_holes
  FROM public.golf_registration_items;

  -- Longest Drive
  SELECT COALESCE(SUM(quantity), 0) INTO used_longest_drive
  FROM public.golf_registration_items
  WHERE package_id = 'longest-drive';

  -- Closest to Pin
  SELECT COALESCE(SUM(quantity), 0) INTO used_closest_to_pin
  FROM public.golf_registration_items
  WHERE package_id = 'closest-to-pin';

  -- Diamond Sponsors
  SELECT COALESCE(SUM(quantity), 0) INTO used_diamond
  FROM public.golf_registration_items
  WHERE package_id = 'diamond-record';
  
  RETURN json_build_object(
    'general_holes_remaining', 16 - used_general_holes,
    'longest_drive_remaining', 1 - used_longest_drive,
    'closest_to_pin_remaining', 1 - used_closest_to_pin,
    'diamond_remaining', 1 - used_diamond
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_inventory_status TO anon;
GRANT EXECUTE ON FUNCTION public.get_inventory_status TO authenticated;

-- Create Public View for Sponsors
CREATE OR REPLACE VIEW public.public_golf_sponsors AS
SELECT r.contact_name AS sponsor_name, i.package_title, r.created_at
FROM public.golf_registrations r
JOIN public.golf_registration_items i ON r.id = i.registration_id
WHERE i.package_id IN ('diamond-record', 'platinum-record', 'gold-record', 'hole-sponsor', 'longest-drive', 'closest-to-pin');

GRANT SELECT ON public.public_golf_sponsors TO anon;
GRANT SELECT ON public.public_golf_sponsors TO authenticated;
