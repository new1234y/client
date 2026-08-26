import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check VITE_SUPABASE_URL and VITE_SUPABASE_KEY in .env file');
}

// SECURITY: Validate Supabase URL format
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error('SECURITY: Supabase URL must use HTTPS in production');
}

// SECURITY: Use anon key for client-side (never use service role key in frontend)
if (supabaseKey && supabaseKey.length > 200) {
  console.warn('SECURITY: Possible service role key detected in frontend. Use anon key instead.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getGameByCode(code) {
  try {
    console.log('[getGameByCode] Fetching game with code:', code);
    const { data, error } = await supabase
      .from('game_history')
      .select('*')
      .eq('code', code)
      .maybeSingle(); // Use maybeSingle instead of single to handle 0 rows gracefully

    if (error) {
      console.error('[getGameByCode] Supabase error:', error);
      console.error('[getGameByCode] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('[getGameByCode] Successfully fetched game:', data?.code);
    return data;
  } catch (error) {
    console.error('[getGameByCode] Failed to fetch game by code from Supabase:', error);
    throw error;
  }
}

export async function getGameHistory(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('game_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching game history from Supabase:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch game history from Supabase:', error);
    throw error;
  }
}
