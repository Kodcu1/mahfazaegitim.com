import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lljzumduvnzenydiopnc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsanp1bWR1dm56ZW55ZGlvcG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODkzNDgsImV4cCI6MjEwMzc2NTM0OH0.QseP1AKb9mkRxakhgrPX40JCy-OOmKYm1CGlVvnTDoI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export const VITE_SUPABASE_URL = SUPABASE_URL;
export const VITE_SUPABASE_ANON_KEY = SUPABASE_KEY;
export const isSupabaseConfigured = true;