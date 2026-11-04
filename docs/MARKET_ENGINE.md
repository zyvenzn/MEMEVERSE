# MEMEVERSE market engine

The terminal runs its own market, fully offline. Prices are not real quotes, and the player's own trades move them.

## How a price is made

```
price = basePrice * exp(x + dev)
```

- `x` is the fair value offset. Every 2.5 seconds it takes a random step (same volatility as before) and is pulled very slowly back to the base price (time constant 72 hours), so prices wander but never run away.
- `dev` is the temporary part of the player's own impact. It fades back to zero (time constant 20 minutes).

## How a trade moves the market

A trade of `Q` units moves the log-price by `I = Q * unitImpact`, where `unitImpact` comes from the asset's **depth** (USD needed to move the price about 1%).

- The fill walks along the price curve, so a bigger order gets a worse average price (slippage).
- After the fill the price sits at the new level. 35% of the move stays (it moves `x`), 65% fades away over time (it goes into `dev`).
- Buying and selling the same size right away returns the same cash (minus fees). Waiting makes the round trip lose money, so pumping your own price never prints profit.
- Orders that would move the price by more than 50% in one go are refused ("too large for this market's depth").
- Limit orders never fill at a price worse than their limit.

Example (BTCUSD, depth 50,000): buying 1 BTC (about $68k) moves the price about +1.36% and the average fill is about 0.68% above the quote.

## While the app is closed

On open (and when the tab or app comes back to the foreground) the engine runs the missed time in 1-minute steps, up to 24 hours. Older gaps are skipped with the exact mean-reverting distribution. Limit orders can fill during that time, at the simulated time they were crossed.

## Tuning

All constants are at the top of the `MarketEngine` block in `app.js`.

| Constant | Meaning | Now |
| --- | --- | --- |
| `DEPTH_USD[symbol]` | USD that moves the price about 1%. Smaller = thinner market = more impact | BTC 50k, ETH 40k, SOL 25k, BNB 22k, stocks 28k-45k, forex 150k-250k |
| `PERSISTENT_SHARE` | Share of a trade's impact that stays | 0.35 |
| `IMPACT_TAU_MS` | How fast the temporary impact fades | 20 minutes |
| `FAIR_TAU_MS` | How fast fair value returns to the base price | 72 hours |
| `MAX_ORDER_IMPACT` | Largest impact one order may cause | 0.5 |

## Known limits

- Single player, one device. There is no shared market and no order book.
- Chart history keeps the last 180 one-minute candles per asset, so the 1H and 1D timeframes show little history.
- Volatility is constant per asset (no news events or volatility regimes yet).
- All of this is synthetic. Do not use it for investment decisions.
