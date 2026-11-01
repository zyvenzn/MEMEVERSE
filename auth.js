(() => {
  const host = document.getElementById("auth-panel");
  if (!host) return;
  const config = window.MEMEVERSE_SUPABASE_CONFIG;
  const hasConfig = Boolean(config?.url && config?.publishableKey && window.supabase?.createClient);
  if (!hasConfig) {
    host.innerHTML = '<div class="auth-card"><b>Online account setup required</b><p class="muted">Supabase client configuration is missing. Check supabase-config.js.</p></div>';
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey);
  window.MEMEVERSE_CLIENT = client;
  let mode = "signup";
  let busy = false;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));

  function render(user, profile, balance) {
    window.MEMEVERSE_USER = user || null;
    window.MEMEVERSE_PROFILE = profile || null;
    if (user) {
      host.innerHTML = `
        <div class="auth-card signed-in">
          <div><span class="auth-kicker">ONLINE ACCOUNT</span><b>${escapeHtml(profile?.display_name || user.email)}</b><small>@${escapeHtml(profile?.handle || "player")}</small></div>
          <div class="auth-right"><span class="auth-state"><i></i> Connected</span><b class="auth-balance">${Number(balance ?? 0).toLocaleString("en-US",{style:"currency",currency:"USD"})} USDV</b><button class="button secondary" id="signout-button" type="button">Sign out</button></div>
        </div>`;
      const side = document.querySelector(".sidebar-bottom");
      if (side) side.innerHTML = `<div class="avatar">${escapeHtml((profile?.display_name || user.email || "P").slice(0,1).toUpperCase())}</div><div><b>${escapeHtml(profile?.display_name || "Player")}</b><small>@${escapeHtml(profile?.handle || "player")}</small></div><span class="online"></span>`;
      const topBalance = document.getElementById("top-balance");
      if (topBalance) topBalance.textContent = Number(balance ?? 0).toLocaleString("en-US",{style:"currency",currency:"USD"});
      const status = document.querySelector(".status");
      if (status) status.innerHTML = "<i></i> Online account";
      document.getElementById("signout-button")?.addEventListener("click", async () => {
        const { error } = await client.auth.signOut();
        if (error) alert(error.message);
      });
      return;
    }
    host.innerHTML = `
      <div class="auth-card auth-form-card">
        <div class="auth-copy"><span class="auth-kicker">PLAYER IDENTITY</span><b>${mode === "signup" ? "Create your MEMEVERSE account" : "Welcome back"}</b><small>One account for every world and application.</small></div>
        <form id="auth-form" class="auth-form">
          ${mode === "signup" ? '<input class="input" name="displayName" maxlength="40" placeholder="Display name" autocomplete="nickname" required>' : ""}
          <input class="input" name="email" type="email" placeholder="Email address" autocomplete="email" required>
          <input class="input" name="password" type="password" minlength="8" placeholder="Password (minimum 8 characters)" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" required>
          <button class="button" id="auth-submit" type="submit">${mode === "signup" ? "Create account" : "Log in"}</button>
        </form>
        <div class="auth-bottom"><span id="auth-message" role="status">Starter balance: 10,000 USDV after account creation.</span><button class="text-button" id="auth-toggle" type="button">${mode === "signup" ? "I already have an account" : "Create a new account"}</button></div>
      </div>`;
    document.getElementById("auth-toggle").addEventListener("click", () => {
      mode = mode === "signup" ? "login" : "signup";
      render(null);
    });
    document.getElementById("auth-form").addEventListener("submit", async event => {
      event.preventDefault();
      if (busy) return;
      busy = true;
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");
      const displayName = String(form.get("displayName") || "").trim() || "New Player";
      const button = document.getElementById("auth-submit");
      const message = document.getElementById("auth-message");
      button.disabled = true;
      button.textContent = "Please wait…";
      message.textContent = "Connecting securely to Supabase…";
      let result;
      if (mode === "signup") {
        result = await client.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
      } else {
        result = await client.auth.signInWithPassword({ email, password });
      }
      busy = false;
      if (result.error) {
        message.textContent = result.error.message;
        button.disabled = false;
        button.textContent = mode === "signup" ? "Create account" : "Log in";
        return;
      }
      if (mode === "signup" && !result.data.session) {
        message.textContent = "Account created. Check your email to confirm, then log in.";
        button.disabled = false;
        button.textContent = "Create account";
      } else if (result.data.session) {
        await loadUser(result.data.session.user);
      }
    });
  }

  async function loadUser(user) {
    const [{ data: profile }, { data: wallet, error: walletError }] = await Promise.all([
      client.from("profiles").select("handle,display_name,bio,avatar_url,banner_url").eq("id", user.id).maybeSingle(),
      client.from("wallets").select("balance").eq("user_id", user.id).maybeSingle()
    ]);
    render(user, profile, wallet?.balance ?? 0);
    if (walletError) console.warn("MEMEVERSE wallet read:", walletError.message);
  }

  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) loadUser(session.user);
    else render(null);
  });
  client.auth.getSession().then(({ data, error }) => {
    if (error) {
      host.innerHTML = '<div class="auth-card"><b>Could not check session</b><p class="muted">Refresh the page and try again.</p></div>';
      return;
    }
    if (data.session?.user) loadUser(data.session.user);
    else render(null);
  });
})();
