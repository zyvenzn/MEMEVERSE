# MEMEVERSE Trading Terminal Setup

The terminal supports simulated spot trading for BTC, ETH, SOL and BNB. Quotes and candles come from Binance Spot public market-data endpoints. No real cryptocurrency is purchased, deposited, withdrawn or transferred. Execution uses virtual USDV only.

## 1. Apply the database migration

Open Supabase SQL Editor and run the complete contents of `supabase/migrations/202611020003_virtual_trading.sql`. This creates the trade history table and an atomic database function. Players can read only their own trades. Browser clients cannot write wallets, ledger entries or trades directly. The execution RPC is restricted to the service role.

## 2. Deploy the Edge Function

Create a Supabase Edge Function named `execute-trade` using the complete source from `supabase/functions/execute-trade/index.ts`, then deploy it.

The function uses the standard Supabase environment variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, available to Supabase Edge Functions. Never paste the service-role key into the website or GitHub.

The function validates the player's access token, fetches the current price from Binance on the server, and calls the database RPC. The client cannot choose the execution price.

The project config sets `verify_jwt = false` because the function performs explicit user-token validation with Supabase Auth itself. Do not remove that validation.

## 3. Verify the deployment

1. Ensure the trading migration completed successfully.
2. Ensure the `execute-trade` function is deployed.
3. Open the latest Vercel deployment for branch `feat/supabase-foundation`.
4. Sign in to MEMEVERSE and open Trading.
5. Confirm the BTC/USDT chart and quote load.
6. Enter a small quantity and place a virtual buy.
7. Confirm USDV balance decreases and the trade appears under Recent transactions.
8. Sell no more than the quantity held and confirm USDV balance increases by proceeds after the 0.10% fee.

## Current scope and limitations

- Supported: live-reference crypto candles, 24-hour quotes, market buy/sell, 0.10% simulated fee, virtual cash balance, holdings derived from trades, recent trade history.
- Not yet implemented: limit orders, stop-loss, take-profit, order book depth, margin/leverage, shorting, stocks, forex, commodities and portfolio P&L/cost-basis reporting.
- Binance public market-data access can be unavailable in some regions or during rate limits. The UI reports feed errors rather than inventing quotes.
- Prices are references, not guaranteed executable real-world prices. Game execution uses the latest server-fetched spot quote and a virtual ledger.
