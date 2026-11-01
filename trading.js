(() => {
  const WATCH = [
    {symbol:"BTCUSDT",base:"BTC",name:"Bitcoin"},
    {symbol:"ETHUSDT",base:"ETH",name:"Ethereum"},
    {symbol:"SOLUSDT",base:"SOL",name:"Solana"},
    {symbol:"BNBUSDT",base:"BNB",name:"BNB"}
  ];
  const intervals=["1m","5m","15m","1h","4h","1d"];
  const state={symbol:"BTCUSDT",interval:"1h",side:"buy",chart:null,candleSeries:null,resize:null,quote:null,quotes:{},timer:null,loading:false};
  const fmt=(n,d=2)=>Number(n||0).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
  const usd=n=>"$"+fmt(n,2);
  const asset=()=>WATCH.find(x=>x.symbol===state.symbol)||WATCH[0];
  const client=()=>window.MEMEVERSE_CLIENT;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  window.renderTradingTerminal=()=>`
    <div class="trade-terminal">
      <div class="trade-heading"><div><span class="trade-kicker">MARKET NEXUS / SPOT TERMINAL</span><h2>Crypto Trading</h2><p>Trade virtual assets using USDV. Market references are live; no real assets are bought or sold.</p></div><div class="trade-live"><i></i> LIVE MARKET FEED</div></div>
      <div class="trade-ticker-strip" id="trade-ticker-strip"><div class="trade-ticker-loading">Connecting to market data…</div></div>
      <div class="trade-layout">
        <section class="trade-market-column">
          <div class="trade-card trade-chart-card">
            <div class="trade-instrument"><div class="trade-coin" id="trade-coin">₿</div><div><b id="trade-pair">BTC / USDT</b><small id="trade-asset-name">Bitcoin · Spot market</small></div><div class="trade-price-block"><b id="trade-current-price">—</b><small id="trade-price-change">Loading quote</small></div></div>
            <div class="trade-chart-toolbar"><div class="trade-intervals">${intervals.map(i=>`<button class="${i===state.interval?"active":""}" data-interval="${i}">${i}</button>`).join("")}</div><span id="trade-chart-status">BINANCE SPOT · CANDLES</span></div>
            <div id="trade-chart" class="trade-chart-canvas"><div class="trade-chart-placeholder">Loading candlestick chart…</div></div>
            <div class="trade-chart-foot"><span>● LIVE PRICE REFERENCE</span><span id="trade-updated">Waiting for data</span></div>
          </div>
          <div class="trade-card trade-markets-card"><div class="trade-card-title"><div><span class="trade-kicker">MARKET WATCH</span><h3>Top crypto assets</h3></div><span>24H CHANGE</span></div><div id="trade-market-list" class="trade-market-list"><div class="trade-empty">Loading markets…</div></div></div>
        </section>
        <aside class="trade-side-column">
          <div class="trade-card trade-ticket">
            <div class="trade-card-title"><div><span class="trade-kicker">ORDER TERMINAL</span><h3>Place an order</h3></div><span class="trade-spot-tag">SPOT</span></div>
            <div class="trade-side-switch"><button data-side="buy" class="active">Buy</button><button data-side="sell">Sell</button></div>
            <div class="trade-selected-asset"><span id="trade-ticket-symbol">BTC / USDT</span><b id="trade-ticket-price">Market —</b></div>
            <label class="trade-label" for="trade-quantity">Quantity <span id="trade-quantity-unit">BTC</span></label>
            <div class="trade-quantity-wrap"><input id="trade-quantity" type="number" min="0.00000001" step="any" placeholder="0.00"><span id="trade-quantity-suffix">BTC</span></div>
            <div class="trade-quick-amounts"><button data-percent="25">25%</button><button data-percent="50">50%</button><button data-percent="75">75%</button><button data-percent="100">100%</button></div>
            <div class="trade-estimates"><div><span>Available balance</span><b id="trade-available">Login required</b></div><div><span>Est. order value</span><b id="trade-estimated">$0.00</b></div><div><span>Trading fee (0.10%)</span><b id="trade-fee">$0.00</b></div></div>
            <button id="trade-submit" class="trade-submit buy" disabled>Connect account to trade</button>
            <p class="trade-disclaimer">Simulation only · 0.10% fee · Market orders execute at the verified quote when submitted.</p>
            <div id="trade-message" class="trade-message" role="status"></div>
          </div>
          <div class="trade-card trade-risk-card"><span class="trade-kicker">MARKET NOTICE</span><b>Know what you're trading</b><p>Charts and quotes are supplied by Binance Spot. Prices may be delayed or unavailable. Orders only affect your MEMEVERSE virtual USDV wallet.</p></div>
        </aside>
      </div>
      <section class="trade-card trade-account-card"><div class="trade-card-title"><div><span class="trade-kicker">YOUR ACCOUNT</span><h3>Portfolio & activity</h3></div><button class="trade-refresh" id="trade-refresh">↻ Refresh</button></div><div class="trade-account-stats"><div><small>VIRTUAL CASH</small><b id="trade-cash">—</b></div><div><small>OPEN ASSETS</small><b id="trade-asset-count">—</b></div><div><small>TRADES EXECUTED</small><b id="trade-trade-count">—</b></div></div><div class="trade-subhead">Your holdings</div><div id="trade-holdings" class="trade-table-wrap"><div class="trade-empty">Sign in to view your portfolio.</div></div><div class="trade-subhead">Recent transactions</div><div id="trade-history" class="trade-table-wrap"><div class="trade-empty">Your completed trades will appear here.</div></div></section>
    </div>`;
  
  function message(text,type="info"){const el=document.getElementById("trade-message");if(el){el.textContent=text;el.className="trade-message "+type}}
  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
  function chartLibrary(){return window.LightweightCharts&&window.LightweightCharts.createChart}
  async function getJSON(url){const response=await fetch(url);if(!response.ok)throw new Error("Market data unavailable ("+response.status+")");return response.json()}
  async function loadQuotes(){
    try{
      const rows=await Promise.all(WATCH.map(async item=>{const q=await getJSON("https://api.binance.com/api/v3/ticker/24hr?symbol="+item.symbol);return {...item,price:Number(q.lastPrice),change:Number(q.priceChangePercent),volume:Number(q.quoteVolume)}}));
      state.quotes=Object.fromEntries(rows.map(x=>[x.symbol,x]));renderMarketList(rows);renderTickerStrip(rows);
      const q=state.quotes[state.symbol];if(q){state.quote=q;setText("trade-current-price",usd(q.price));setText("trade-ticket-price","Market "+usd(q.price));setText("trade-price-change",(q.change>=0?"+":"")+fmt(q.change,2)+"% · 24h");const change=document.getElementById("trade-price-change");if(change)change.className=q.change>=0?"positive":"negative"}
    }catch(e){setText("trade-chart-status","MARKET FEED UNAVAILABLE");message(e.message+"; chart will retry automatically.","error")}
  }
  function renderTickerStrip(rows){const host=document.getElementById("trade-ticker-strip");if(!host)return;host.innerHTML=rows.map(q=>`<button class="trade-ticker" data-symbol="${q.symbol}"><span>${q.base}</span><b>${usd(q.price)}</b><small class="${q.change>=0?"positive":"negative"}">${q.change>=0?"+":""}${fmt(q.change,2)}%</small></button>`).join("")}
  function renderMarketList(rows){const host=document.getElementById("trade-market-list");if(!host)return;host.innerHTML=rows.map(q=>`<button class="trade-market-row ${q.symbol===state.symbol?"selected":""}" data-symbol="${q.symbol}"><span class="trade-market-icon">${q.base==="BTC"?"₿":q.base==="ETH"?"◆":q.base==="SOL"?"◎":"◈"}</span><span class="trade-market-name"><b>${q.base}/USDT</b><small>${q.name}</small></span><span class="trade-market-price"><b>${usd(q.price)}</b><small class="${q.change>=0?"positive":"negative"}">${q.change>=0?"+":""}${fmt(q.change,2)}%</small></span></button>`).join("")}
  async function loadCandles(){
    const host=document.getElementById("trade-chart");if(!host)return;
    try{
      const rows=await getJSON("https://api.binance.com/api/v3/klines?symbol="+state.symbol+"&interval="+state.interval+"&limit=300");
      const candles=rows.map(k=>({time:Math.floor(k[0]/1000),open:Number(k[1]),high:Number(k[2]),low:Number(k[3]),close:Number(k[4])}));
      if(!chartLibrary()){host.innerHTML='<div class="trade-chart-placeholder">Chart library failed to load. Refresh the page to retry.</div>';return}
      if(!state.chart){
        host.innerHTML="";
        state.chart=LightweightCharts.createChart(host,{width:host.clientWidth,height:360,layout:{background:{color:"#0b101b"},textColor:"#8794ac"},grid:{vertLines:{color:"rgba(80,100,130,.12)"},horzLines:{color:"rgba(80,100,130,.12)"}},rightPriceScale:{borderColor:"#26334a"},timeScale:{borderColor:"#26334a",timeVisible:true,secondsVisible:false},crosshair:{mode:0}});
        state.candleSeries=state.chart.addSeries(LightweightCharts.CandlestickSeries,{upColor:"#19b98b",downColor:"#ef5b75",borderUpColor:"#19b98b",borderDownColor:"#ef5b75",wickUpColor:"#19b98b",wickDownColor:"#ef5b75"});
        if(window.ResizeObserver){state.resize=new ResizeObserver(entries=>{for(const entry of entries)state.chart?.applyOptions({width:entry.contentRect.width})});state.resize.observe(host)}
      }
      state.candleSeries.setData(candles);state.chart.timeScale().fitContent();setText("trade-updated","Updated "+new Date().toLocaleTimeString());
    }catch(e){host.innerHTML='<div class="trade-chart-placeholder">'+esc(e.message)+'. Try another timeframe.</div>'}
  }
  function renderSelected(){const q=state.quotes[state.symbol],a=asset();setText("trade-pair",a.base+" / USDT");setText("trade-asset-name",a.name+" · Spot market");setText("trade-coin",a.base==="BTC"?"₿":a.base==="ETH"?"◆":a.base==="SOL"?"◎":"◈");setText("trade-ticket-symbol",a.base+" / USDT");setText("trade-quantity-unit",a.base);setText("trade-quantity-suffix",a.base);if(q){setText("trade-current-price",usd(q.price));setText("trade-ticket-price","Market "+usd(q.price));setText("trade-price-change",(q.change>=0?"+":"")+fmt(q.change,2)+"% · 24h")}document.querySelectorAll(".trade-market-row").forEach(el=>el.classList.toggle("selected",el.dataset.symbol===state.symbol));loadCandles();updateEstimate()}
  function updateEstimate(){const qty=Number(document.getElementById("trade-quantity")?.value||0),price=state.quotes[state.symbol]?.price||0,notional=qty*price,fee=notional*.001;setText("trade-estimated",usd(notional));setText("trade-fee",usd(fee))}
  async function loadAccount(){
    const c=client(),u=window.MEMEVERSE_USER;if(!c||!u){setText("trade-available","Login required");setText("trade-cash","—");setText("trade-asset-count","—");setText("trade-trade-count","—");const submit=document.getElementById("trade-submit");if(submit){submit.disabled=true;submit.textContent="Connect account to trade"}return}
    const [{data:wallet,error:walletError},{data:trades,error:tradeError}]=await Promise.all([c.from("wallets").select("balance").eq("user_id",u.id).maybeSingle(),c.from("trading_trades").select("id,symbol,side,quantity,price,notional,fee,created_at").eq("user_id",u.id).order("created_at",{ascending:false}).limit(50)]);
    if(walletError||tradeError){message((walletError||tradeError).message+" — apply the trading database migration first.","error");return}
    const balance=Number(wallet?.balance||0);setText("trade-available",usd(balance)+" USDV");setText("trade-cash",usd(balance)+" USDV");setText("trade-trade-count",String(trades.length));const submit=document.getElementById("trade-submit");if(submit){submit.disabled=false;submit.textContent=state.side==="buy"?"Buy "+asset().base:"Sell "+asset().base}
    const positions={};for(const t of [...trades].reverse()){positions[t.symbol]=(positions[t.symbol]||0)+(t.side==="buy"?1:-1)*Number(t.quantity)}
    const holdings=Object.entries(positions).filter(([,qty])=>qty>0.0000000001);setText("trade-asset-count",String(holdings.length));
    const h=document.getElementById("trade-holdings");if(h)h.innerHTML=holdings.length?`<table class="trade-table"><thead><tr><th>ASSET</th><th>QUANTITY</th><th>MARK VALUE*</th></tr></thead><tbody>${holdings.map(([symbol,qty])=>{const q=state.quotes[symbol];return `<tr><td><b>${symbol.replace("USDT","")}</b><small> / USDT</small></td><td>${fmt(qty,6)}</td><td>${q?usd(qty*q.price):"—"}</td></tr>`}).join("")}</tbody></table><small class="trade-table-note">*Indicative value based on latest quote.</small>`:'<div class="trade-empty">No holdings yet. Place your first virtual buy.</div>';
    const hist=document.getElementById("trade-history");if(hist)hist.innerHTML=trades.length?`<table class="trade-table"><thead><tr><th>TIME</th><th>PAIR</th><th>SIDE</th><th>QTY</th><th>PRICE</th></tr></thead><tbody>${trades.map(t=>`<tr><td>${new Date(t.created_at).toLocaleString()}</td><td>${t.symbol.replace("USDT","")}/USDT</td><td class="${t.side==="buy"?"positive":"negative"}">${t.side.toUpperCase()}</td><td>${fmt(t.quantity,6)}</td><td>${usd(t.price)}</td></tr>`).join("")}</tbody></table>`:'<div class="trade-empty">No trades yet.</div>';
    updateEstimate();
  }
  async function submitTrade(){
    const c=client(),u=window.MEMEVERSE_USER,qty=Number(document.getElementById("trade-quantity")?.value||0),button=document.getElementById("trade-submit");
    if(!c||!u){message("Login dulu untuk melakukan trading.","error");return}
    if(!Number.isFinite(qty)||qty<=0){message("Masukkan quantity yang valid.","error");return}
    if(!state.quote){message("Tunggu sampai harga market tersedia.","error");return}
    button.disabled=true;button.textContent="Executing…";message("Memverifikasi harga dan mengeksekusi order virtual…");
    const requestId=crypto.randomUUID();
    const {data,error}=await c.functions.invoke("execute-trade",{body:{symbol:state.symbol,side:state.side,quantity:qty,requestId}});
    if(error||data?.error){message(data?.error||error?.message||"Order gagal.","error");button.disabled=false;button.textContent=(state.side==="buy"?"Buy ":"Sell ")+asset().base;return}
    message((state.side==="buy"?"Bought ":"Sold ")+fmt(qty,6)+" "+asset().base+" at "+usd(data.trade.price)+". Fee "+usd(data.trade.fee)+".","success");
    document.getElementById("trade-quantity").value="";await loadAccount();
  }
  function init(){
    if(state.timer)clearInterval(state.timer);
    state.chart=null;state.candleSeries=null;state.resize?.disconnect();state.resize=null;
    const host=document.getElementById("trade-chart");if(!host)return;
    document.querySelectorAll("[data-symbol]").forEach(el=>el.addEventListener("click",()=>{state.symbol=el.dataset.symbol;renderSelected();renderMarketList(Object.values(state.quotes))}));
    document.querySelectorAll("[data-interval]").forEach(el=>el.addEventListener("click",()=>{state.interval=el.dataset.interval;document.querySelectorAll("[data-interval]").forEach(b=>b.classList.toggle("active",b===el));loadCandles()}));
    document.querySelectorAll("[data-side]").forEach(el=>el.addEventListener("click",()=>{state.side=el.dataset.side;document.querySelectorAll("[data-side]").forEach(b=>b.classList.toggle("active",b===el));const submit=document.getElementById("trade-submit");if(submit)submit.textContent=(state.side==="buy"?"Buy ":"Sell ")+asset().base;updateEstimate()}));
    document.querySelectorAll("[data-percent]").forEach(el=>el.addEventListener("click",()=>{const pct=Number(el.dataset.percent)/100,price=state.quotes[state.symbol]?.price||0,balance=Number(document.getElementById("trade-available")?.textContent.replace(/[^0-9.]/g,"")||0);if(state.side==="buy"&&price)document.getElementById("trade-quantity").value=(balance*pct/1.001/price).toFixed(8);updateEstimate()}));
    document.getElementById("trade-quantity")?.addEventListener("input",updateEstimate);
    document.getElementById("trade-submit")?.addEventListener("click",submitTrade);
    document.getElementById("trade-refresh")?.addEventListener("click",()=>{loadQuotes();loadAccount()});
    loadQuotes().then(()=>{renderSelected();loadAccount()});
    state.timer=setInterval(()=>{if(document.getElementById("trade-chart")){loadQuotes();loadCandles()}else clearInterval(state.timer)},30000);
  }
  window.initTradingTerminal=init;
  document.addEventListener("memeverse:auth",()=>{if(document.getElementById("trade-chart"))loadAccount()});
  const originalRender=window.renderTradingTerminal;window.renderTradingTerminal=()=>{const html=originalRender();setTimeout(init,0);return html};
})();