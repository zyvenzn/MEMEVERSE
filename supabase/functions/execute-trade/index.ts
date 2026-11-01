// Supabase Edge Function: execute-trade
// The browser never supplies an executable price. This function fetches the current
// Binance spot price, validates the player's JWT, then calls the atomic SQL ledger RPC.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const symbols = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Login required" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Trading service is not configured" }, 503);

    const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Invalid session" }, 401);

    const body = await req.json();
    const symbol = String(body.symbol || "").toUpperCase();
    const side = String(body.side || "").toLowerCase();
    const quantity = Number(body.quantity);
    const requestId = String(body.requestId || "");
    if (!symbols.has(symbol) || !["buy", "sell"].includes(side) ||
        !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000 ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return json({ error: "Invalid order details" }, 400);
    }

    const quoteResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    if (!quoteResponse.ok) return json({ error: "Market quote unavailable. Try again shortly." }, 502);
    const quote = await quoteResponse.json();
    const price = Number(quote.price);
    if (!Number.isFinite(price) || price <= 0) return json({ error: "Invalid market quote" }, 502);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc("execute_virtual_trade", {
      p_user_id: authData.user.id,
      p_request_id: requestId,
      p_symbol: symbol,
      p_side: side,
      p_quantity: quantity,
      p_price: price,
    });
    if (error) return json({ error: error.message }, 400);
    return json({ trade: data, quoteSource: "Binance Spot", quotedAt: new Date().toISOString() });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected trading error" }, 500);
  }
});
