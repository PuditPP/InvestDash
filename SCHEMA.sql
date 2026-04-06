-- SQL Migration Script for Investment Portfolio Dashboard

-- 1. Create Holdings Table
CREATE TABLE IF NOT EXISTS public.holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT,
    asset_type TEXT DEFAULT 'Stock',
    sector TEXT DEFAULT 'Other',
    quantity NUMERIC NOT NULL DEFAULT 0,
    average_cost NUMERIC NOT NULL DEFAULT 0,
    current_price NUMERIC,
    prior_close NUMERIC,
    purchase_date DATE,
    note TEXT,
    history NUMERIC[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for holdings
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

-- Create policies for holdings
CREATE POLICY "Users can view their own holdings" 
ON public.holdings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own holdings" 
ON public.holdings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings" 
ON public.holdings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings" 
ON public.holdings FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Create Watchlist Table
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT,
    current_price NUMERIC DEFAULT 0,
    prior_close NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for watchlist
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Create policies for watchlist
CREATE POLICY "Users can view their own watchlist" 
ON public.watchlist FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlist" 
ON public.watchlist FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist" 
ON public.watchlist FOR DELETE 
USING (auth.uid() = user_id);

-- Optional: Create an index on user_id for performance
CREATE INDEX IF NOT EXISTS holdings_user_id_idx ON public.holdings (user_id);
CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON public.watchlist (user_id);
