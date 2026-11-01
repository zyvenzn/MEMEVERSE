-- MEMEVERSE virtual crypto trading foundation.
-- Prices are verified by the execute-trade Edge Function before this RPC is called.
begin;

create table if not exists public.trading_trades (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  symbol text not null check (symbol in ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT')),
  side text not null check (side in ('buy','sell')),
  quantity numeric(28,10) not null check (quantity > 0),
  price numeric(20,8) not null check (price > 0),
  notional numeric(20,2) not null check (notional > 0),
  fee numeric(20,2) not null check (fee >= 0),
  created_at timestamptz not null default now()
);
create index if not exists trading_trades_user_created_idx
  on public.trading_trades(user_id, created_at desc);
create index if not exists trading_trades_user_symbol_idx
  on public.trading_trades(user_id, symbol);

alter table public.trading_trades enable row level security;
drop policy if exists "Players read own trades" on public.trading_trades;
create policy "Players read own trades" on public.trading_trades
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.trading_trades from anon, authenticated;
grant select on public.trading_trades to authenticated;

create or replace function public.execute_virtual_trade(
  p_user_id uuid,
  p_request_id uuid,
  p_symbol text,
  p_side text,
  p_quantity numeric,
  p_price numeric
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance numeric(20,2);
  v_owned numeric(28,10);
  v_notional numeric(20,2);
  v_fee numeric(20,2);
  v_cash numeric(20,2);
  v_trade public.trading_trades%rowtype;
begin
  if p_user_id is null or p_request_id is null then
    raise exception 'Missing trade identity';
  end if;
  if p_symbol not in ('BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT')
     or p_side not in ('buy','sell')
     or p_quantity is null or p_quantity <= 0 or p_quantity > 1000000
     or p_price is null or p_price <= 0 then
    raise exception 'Invalid trade parameters';
  end if;

  select * into v_trade from public.trading_trades where request_id = p_request_id;
  if found then
    if v_trade.user_id <> p_user_id then raise exception 'Request id already used'; end if;
    return jsonb_build_object('trade_id',v_trade.id,'symbol',v_trade.symbol,'side',v_trade.side,
      'quantity',v_trade.quantity,'price',v_trade.price,'notional',v_trade.notional,
      'fee',v_trade.fee,'duplicate',true);
  end if;

  v_notional := round(p_quantity * p_price, 2);
  if v_notional <= 0 then raise exception 'Trade value is too small'; end if;
  v_fee := greatest(round(v_notional * 0.001, 2), 0.01);

  select balance into v_balance from public.wallets where user_id = p_user_id for update;
  if not found then raise exception 'Wallet not found'; end if;

  if p_side = 'buy' then
    v_cash := v_notional + v_fee;
    if v_balance < v_cash then raise exception 'Insufficient USDV balance'; end if;
    update public.wallets set balance = balance - v_cash where user_id = p_user_id;
    insert into public.ledger_entries(user_id,amount,currency,entry_type,reference_id,description)
      values(p_user_id,-v_cash,'USDV','purchase',p_request_id::text,'Virtual crypto buy: '||p_symbol);
  else
    select coalesce(sum(case when side='buy' then quantity else -quantity end),0)
      into v_owned from public.trading_trades
      where user_id=p_user_id and symbol=p_symbol;
    if v_owned < p_quantity then raise exception 'Insufficient asset quantity'; end if;
    v_cash := v_notional - v_fee;
    if v_cash < 0 then raise exception 'Trade value is below fee'; end if;
    update public.wallets set balance = balance + v_cash where user_id = p_user_id;
    insert into public.ledger_entries(user_id,amount,currency,entry_type,reference_id,description)
      values(p_user_id,v_cash,'USDV','sale',p_request_id::text,'Virtual crypto sell: '||p_symbol);
  end if;

  insert into public.trading_trades(request_id,user_id,symbol,side,quantity,price,notional,fee)
    values(p_request_id,p_user_id,p_symbol,p_side,p_quantity,p_price,v_notional,v_fee)
    returning * into v_trade;

  return jsonb_build_object('trade_id',v_trade.id,'symbol',v_trade.symbol,'side',v_trade.side,
    'quantity',v_trade.quantity,'price',v_trade.price,'notional',v_trade.notional,
    'fee',v_trade.fee,'balance',case when p_side='buy' then v_balance-v_cash else v_balance+v_cash end,
    'duplicate',false);
end;
$$;

revoke all on function public.execute_virtual_trade(uuid,uuid,text,text,numeric,numeric) from public, anon, authenticated;
grant execute on function public.execute_virtual_trade(uuid,uuid,text,text,numeric,numeric) to service_role;

commit;
