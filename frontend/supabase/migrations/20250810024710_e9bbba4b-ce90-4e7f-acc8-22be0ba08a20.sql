
-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  venue TEXT NOT NULL,
  max_players INTEGER NOT NULL,
  shuttlecock_price DECIMAL(10,2) NOT NULL,
  court_hourly_rate DECIMAL(10,2) NOT NULL,
  shuttlecocks_used INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courts table for each event
CREATE TABLE public.courts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  court_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  actual_start_time TIME,
  actual_end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table for event registrations
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  start_time TIME,
  end_time TIME NOT NULL,
  registration_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'waitlist', 'cancelled')),
  cancelled_on_event_day BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cost calculations table
CREATE TABLE public.cost_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  court_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  shuttlecock_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  fine DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Event creators and admins can update events" ON public.events FOR UPDATE TO authenticated USING (
  auth.uid() = created_by OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for courts
CREATE POLICY "Anyone can view courts" ON public.courts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert courts" ON public.courts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = courts.event_id AND (
      created_by = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);
CREATE POLICY "Authenticated users can update courts" ON public.courts FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = courts.event_id AND (
      created_by = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);
CREATE POLICY "Authenticated users can delete courts" ON public.courts FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = courts.event_id AND (
      created_by = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

-- RLS Policies for players
CREATE POLICY "Anyone can view players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can register as player" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own registrations" ON public.players FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = players.event_id AND (
      created_by = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

-- RLS Policies for cost calculations
CREATE POLICY "Anyone can view cost calculations" ON public.cost_calculations FOR SELECT USING (true);
CREATE POLICY "Event creators and admins can insert cost calculations" ON public.cost_calculations FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = cost_calculations.event_id AND (
      created_by = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);
CREATE POLICY "Event creators and admins can update cost calculations" ON public.cost_calculations FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = cost_calculations.event_id AND (
      created_by = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);
CREATE POLICY "Event creators and admins can delete cost calculations" ON public.cost_calculations FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = cost_calculations.event_id AND (
      created_by = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);
