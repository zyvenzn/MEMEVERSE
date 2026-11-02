// Browser-safe Supabase project configuration. Never place service_role or secret keys here.
window.MEMEVERSE_SUPABASE_CONFIG = {
  url: "https://whgryvzbafwvyoiyujzf.supabase.co",
  anonKey: "sb_publishable_v_xR7TZbN49NUGbv90pyLA_GrG3eWIS"
};
if (window.supabase?.createClient && window.MEMEVERSE_SUPABASE_CONFIG.url && window.MEMEVERSE_SUPABASE_CONFIG.anonKey) {
  window.supabaseClient = window.supabase.createClient(
    window.MEMEVERSE_SUPABASE_CONFIG.url,
    window.MEMEVERSE_SUPABASE_CONFIG.anonKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
}
