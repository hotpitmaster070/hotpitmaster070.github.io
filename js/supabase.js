import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
const SUPABASE_URL = 'https://xljogkyropyocvuuodfl.supabase.co'
const SUPABASE_ANON_KEY = 'сюда_вставь_новый_anon_key'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
