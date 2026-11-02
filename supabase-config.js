// Copy the Supabase Project URL and publishable/anon key from Supabase Dashboard > Project Settings > API.
// This key is designed for browser use; never put a service_role or secret key here.
window.MEMEVERSE_SUPABASE_CONFIG = {
  url: "",
  anonKey: ""
};
if (window.supabase?.createClient && window.MEMEVERSE_SUPABASE_CONFIG.url && window.MEMEVERSE_SUPABASE_CONFIG.anonKey) {
  window.supabaseClient = window.supabase.createClient(
    window.MEMEVERSE_SUPABASE_CONFIG.url,
    window.MEMEVERSE_SUPABASE_CONFIG.anonKey
  );
}
