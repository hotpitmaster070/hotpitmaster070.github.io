import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
export const supabase = createClient(
  'ТВОЙ_URL', // ← Supabase → Settings → API → Project URL
  'ТВОЙ_ANON_KEY' // ← anon public
)
