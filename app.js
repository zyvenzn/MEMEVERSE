/* MEMEVERSE Terminal — offline-first simulated trading application. */
(function () {
  "use strict";

  const DB_NAME = "memeverse-terminal";
  const DB_VERSION = 1;
  const STARTING_CASH = 100000;
  const FEE_RATE = 0.001;
  const $ = (id) => document.getElementById(id);
  const money = (n, digits = 2) => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(n) || 0);
  const number = (n, digits = 2) => new Intl.NumberFormat("en-US", {minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(n) || 0);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "mv-" + Date.now() + "-" + Math.random().toString(16).slice(2));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  const ASSETS = [
    {symbol:"BTCUSD",name:"Bitcoin",category:"Crypto",price:67420,volatility:0.0018,precision:2},
    {symbol:"ETHUSD",name:"Ethereum",category:"Crypto",price:3421.75,volatility:0.0022,precision:2},
    {symbol:"SOLUSD",name:"Solana",category:"Crypto",price:168.27,volatility:0.0032,precision:3},
    {symbol:"BNBUSD",name:"BNB",category:"Crypto",price:612.40,volatility:0.0021,precision:2},
    {symbol:"AAPL",name:"Apple Inc.",category:"Stocks",price:228.35,volatility:0.0011,precision:2},
    {symbol:"NVDA",name:"NVIDIA",category:"Stocks",price:142.80,volatility:0.0020,precision:2},
    {symbol:"MSFT",name:"Microsoft",category:"Stocks",price:415.25,volatility:0.0010,precision:2},
    {symbol:"TSLA",name:"Tesla",category:"Stocks",price:248.50,volatility:0.0025,precision:2},
    {symbol:"EURUSD",name:"Euro / US Dollar",category:"Forex",price:1.08425,volatility:0.00025,precision:5},
    {symbol:"GBPUSD",name:"British Pound / US Dollar",category:"Forex",price:1.29340,volatility:0.00028,precision:5},
    {symbol:"USDJPY",name:"US Dollar / Japanese Yen",category:"Forex",price:151.820,volatility:0.00022,precision:3},
    {symbol:"AUDUSD",name:"Australian Dollar / US Dollar",category:"Forex",price:0.65380,volatility:0.00025,precision:5}
  ];

  const state = {
    db:null, cash:STARTING_CASH, selected:"BTCUSD", category:"All", timeframe:"1m",
    prices:{}, candles:{}, watchlist:["BTCUSD","ETHUSD","SOLUSD","AAPL","EURUSD"],
    orders:[], positions:[], trades:[], activeView:"overview", tickTimer:null,
    chartTimer:null, chartRange:"1D", toastTimer:null, marketPaused:false
  };

  function openDB() {
    return new Promise((resolve,reject) => {
      if (!("indexedDB" in window)) { reject(new Error("IndexedDB tidak tersedia di browser ini.")); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        ["settings","orders","positions","trades","watchlist","candles"].forEach((name) => {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, {keyPath:"id"});
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Gagal membuka database lokal."));
    });
  }

  function store(name, mode, action) {
    return new Promise((resolve,reject) => {
      const tx = state.db.transaction(name, mode);
      const req = action(tx.objectStore(name));
      tx.oncomplete = () => resolve(req ? req.result : true);
      tx.onerror = () => reject(tx.error || new Error("Database lokal gagal diperbarui."));
      tx.onabort = () => reject(tx.error || new Error("Operasi database dibatalkan."));
    });
  }
  const getAll = (name) => store(name,"readonly",(s) => s.getAll());
  const put = (name,value) => store(name,"readwrite",(s) => s.put(value));
  const clearStore = (name) => store(name,"readwrite",(s) => s.clear());

  function seedCandles(asset) {
    const now = Date.now();
    let price = asset.price;
    const rows = [];
    for (let i=119;i>=0;i--) {
      const close = price;
      const move = (Math.random()-0.49) * asset.volatility * 5;
      price = Math.max(asset.price * 0.05, price * (1+move));
      const open = close;
      rows.push({time:now-i*60000,open:open,close:price,high:Math.max(open,price)*(1+Math.random()*asset.volatility),low:Math.min(open,price)*(1-Math.random()*asset.volatility),volume:Math.random()*100});
    }
    state.candles[asset.symbol] = rows;
    state.prices[asset.symbol] = rows[rows.length-1].close;
  }

  async function persistSnapshot() {
    return new Promise((resolve,reject)=>{
      const names=["settings","orders","positions","trades","watchlist","candles"];
      const tx=state.db.transaction(names,"readwrite");
      names.forEach((name)=>tx.objectStore(name).clear());
      tx.objectStore("settings").put({id:"account",cash:state.cash,selected:state.selected,category:state.category,timeframe:state.timeframe,updatedAt:Date.now()});
      state.orders.forEach((x)=>tx.objectStore("orders").put({...x,id:x.id}));
      state.positions.forEach((x)=>tx.objectStore("positions").put({...x,id:x.symbol}));
      state.trades.slice(0,500).forEach((x)=>tx.objectStore("trades").put({...x,id:x.id}));
      tx.objectStore("watchlist").put({id:"symbols",symbols:state.watchlist});
      Object.keys(state.candles).forEach((symbol)=>tx.objectStore("candles").put({id:symbol,rows:state.candles[symbol]}));
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(tx.error||new Error("Failed to save local trading state."));
      tx.onabort=()=>reject(tx.error||new Error("Local trading save was aborted."));
    });
  }

  async function hydrate() {
    const [settings,orders,positions,trades,watch,candles] = await Promise.all([
      getAll("settings"),getAll("orders"),getAll("positions"),getAll("trades"),getAll("watchlist"),getAll("candles")
    ]);
    const account = settings.find((x)=>x.id==="account");
    if (account) {
      state.cash = Number(account.cash);
      state.selected = account.selected || state.selected;
      state.category = account.category || "All";
      state.timeframe = account.timeframe || "1m";
    }
    state.orders = orders || [];
    state.positions = positions || [];
    state.trades = (trades || []).sort((a,b)=>b.timestamp-a.timestamp);
    const savedWatch = (watch || []).find((x)=>x.id==="symbols");
    if (savedWatch && Array.isArray(savedWatch.symbols)) state.watchlist = savedWatch.symbols;
    (candles || []).forEach((x)=>{state.candles[x.id]=x.rows; if(x.rows && x.rows.length) state.prices[x.id]=x.rows[x.rows.length-1].close;});
    ASSETS.forEach((asset)=>{if(!state.candles[asset.symbol])seedCandles(asset);});
  }

  function currentAsset() { return ASSETS.find((x)=>x.symbol===state.selected) || ASSETS[0]; }
  function priceOf(symbol) { return Number(state.prices[symbol] || ASSETS.find((x)=>x.symbol===symbol)?.price || 0); }
  function positionOf(symbol) { return state.positions.find((x)=>x.symbol===symbol); }
  function positionValue(p) { return p.quantity * priceOf(p.symbol); }
  function unrealized(p) { return (priceOf(p.symbol)-p.averagePrice)*p.quantity; }
  function totalEquity() { return state.cash + state.positions.reduce((sum,p)=>sum+positionValue(p),0); }
  function totalUnrealized() { return state.positions.reduce((sum,p)=>sum+unrealized(p),0); }
  function totalRealized() { return state.trades.reduce((sum,t)=>sum+(t.realizedPnl || 0),0); }

  function toast(message, type="success") {
    const el=$("toast"); if(!el)return;
    el.textContent=message; el.className="toast show "+type;
    clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>{el.className="toast";},3200);
  }

  function navigate(view) {
    const allowed=["overview","markets","trade","portfolio","orders","history","settings"];
    state.activeView=allowed.includes(view)?view:"overview";
    document.querySelectorAll("[data-view]").forEach((el)=>el.classList.toggle("active",el.dataset.view===state.activeView));
    document.querySelectorAll(".view").forEach((el)=>el.hidden=el.id!=="view-"+state.activeView);
    const labels={overview:"Overview",markets:"Markets",trade:"Trading terminal",portfolio:"Portfolio",orders:"Open orders",history:"Trade history",settings:"Settings"};
    $("page-title").textContent=labels[state.activeView];
    $("mobile-title").textContent=labels[state.activeView];
    renderAll();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function renderOverview() {
    $("overview-equity").textContent=money(totalEquity());
    $("overview-cash").textContent=money(state.cash);
    $("overview-unrealized").textContent=money(totalUnrealized());
    $("overview-realized").textContent=money(totalRealized());
    const movers=ASSETS.slice(0,8).map((a)=>marketRow(a,true)).join("");
    $("overview-markets").innerHTML=movers;
    $("overview-positions").innerHTML=state.positions.length?state.positions.map(positionRow).join(""):'<tr><td colspan="5" class="empty-cell">No open positions. Explore markets to place a demo trade.</td></tr>';
  }

  function marketRow(asset,compact=false) {
    const p=priceOf(asset.symbol), prev=asset.price, change=((p-prev)/prev)*100;
    const watched=state.watchlist.includes(asset.symbol);
    return '<tr class="market-row '+(asset.symbol===state.selected?"selected":"")+'" data-symbol="'+asset.symbol+'">'+
      '<td><button class="watch-star '+(watched?"on":"")+'" data-watch="'+asset.symbol+'" aria-label="Toggle watchlist">★</button></td>'+
      '<td><button class="asset-link" data-select="'+asset.symbol+'"><b>'+asset.symbol+'</b><small>'+escapeHtml(asset.name)+'</small></button></td>'+
      '<td class="numeric">'+money(p,asset.precision>3?5:asset.precision)+'</td>'+
      '<td class="numeric '+(change>=0?"positive":"negative")+'">'+(change>=0?"+":"")+number(change,2)+'%</td>'+
      '<td><span class="market-type">'+asset.category+'</span></td>'+
      (compact?"":'<td><button class="table-trade" data-trade="'+asset.symbol+'">Trade</button></td>')+'</tr>';
  }

  function positionRow(p) {
    const pnl=unrealized(p);
    return '<tr><td><b>'+p.symbol+'</b><small>'+escapeHtml(p.name)+'</small></td><td class="numeric">'+number(p.quantity,5)+'</td><td class="numeric">'+money(p.averagePrice,5)+'</td><td class="numeric">'+money(priceOf(p.symbol),5)+'</td><td class="numeric '+(pnl>=0?"positive":"negative")+'">'+money(pnl)+'</td></tr>';
  }

  function renderMarkets() {
    const q=($("market-search").value||"").toLowerCase();
    const filtered=ASSETS.filter((a)=>(state.category==="All"||a.category===state.category) && (a.symbol.toLowerCase().includes(q)||a.name.toLowerCase().includes(q)));
    $("market-table-body").innerHTML=filtered.map((a)=>marketRow(a)).join("") || '<tr><td colspan="6" class="empty-cell">No instruments match your search.</td></tr>';
  }

  function renderTrade() {
    const asset=currentAsset();
    $("trade-symbol").textContent=asset.symbol;
    $("trade-name").textContent=asset.name+" · "+asset.category+" · DEMO";
    $("trade-price").textContent=money(priceOf(asset.symbol),asset.precision>3?5:asset.precision);
    $("trade-change").textContent="SIMULATED PRICE";
    $("trade-cash").textContent=money(state.cash);
    $("order-quantity").value=$("order-quantity").value||"0.01";
    $("order-estimate").textContent=money(Number($("order-quantity").value||0)*priceOf(asset.symbol));
    drawChart();
    renderWatchlist();
  }

  function renderWatchlist() {
    $("watchlist").innerHTML=state.watchlist.map((symbol)=>{
      const a=ASSETS.find((x)=>x.symbol===symbol); if(!a)return "";
      const p=priceOf(symbol);
      return '<button class="watch-item '+(symbol===state.selected?"active":"")+'" data-select="'+symbol+'"><span><b>'+symbol+'</b><small>'+a.category+'</small></span><strong>'+money(p,a.precision>3?5:a.precision)+'</strong></button>';
    }).join("") || '<p class="muted">Your watchlist is empty.</p>';
  }

  function drawChart() {
    const canvas=$("price-chart"); if(!canvas)return;
    const rect=canvas.getBoundingClientRect(); if(!rect.width)return;
    const dpr=Math.max(1,window.devicePixelRatio||1);
    canvas.width=Math.floor(rect.width*dpr); canvas.height=Math.floor(300*dpr);
    const ctx=canvas.getContext("2d"); ctx.scale(dpr,dpr);
    const w=rect.width,h=300,rows=state.candles[state.selected]||[];
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle="rgba(148,163,184,.13)"; ctx.lineWidth=1;
    for(let i=1;i<5;i++){const y=i*h/5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    if(rows.length<2)return;
    const minutes={"1m":1,"5m":5,"15m":15,"1h":60,"1d":1440}[state.timeframe]||1;
    const grouped=[];
    rows.forEach((c)=>{
      const bucket=Math.floor(c.time/(minutes*60000));
      const last=grouped[grouped.length-1];
      if(last&&last.bucket===bucket){last.close=c.close;last.high=Math.max(last.high,c.high);last.low=Math.min(last.low,c.low);last.volume+=c.volume;}
      else grouped.push({bucket,time:c.time,open:c.open,close:c.close,high:c.high,low:c.low,volume:c.volume});
    });
    const visible=grouped.slice(-120);
    const min=Math.min(...visible.map((x)=>x.low)),max=Math.max(...visible.map((x)=>x.high)),range=max-min||1;
    const xStep=w/visible.length,body=Math.max(2,Math.min(9,xStep*.58));
    visible.forEach((c,i)=>{
      const x=i*xStep+xStep/2,yo=h-(c.open-min)/range*h,yc=h-(c.close-min)/range*h;
      const yh=h-(c.high-min)/range*h,yl=h-(c.low-min)/range*h;
      const up=c.close>=c.open;ctx.strokeStyle=up?"#4bd6a0":"#ff7185";ctx.fillStyle=ctx.strokeStyle;
      ctx.beginPath();ctx.moveTo(x,yh);ctx.lineTo(x,yl);ctx.stroke();
      ctx.fillRect(x-body/2,Math.min(yo,yc),body,Math.max(1,Math.abs(yc-yo)));
    });
    ctx.fillStyle="#7f8da5";ctx.font="11px system-ui";ctx.fillText(money(max,2),8,14);ctx.fillText(money(min,2),8,h-8);
  }

  function renderOrders() {
    const open=state.orders.filter((o)=>o.status==="OPEN");
    $("open-orders-body").innerHTML=open.length?open.map((o)=>'<tr><td>'+o.symbol+'</td><td>'+o.side+'</td><td>'+o.type+'</td><td class="numeric">'+number(o.quantity,5)+'</td><td class="numeric">'+money(o.limitPrice||0,5)+'</td><td><button class="cancel-order" data-cancel="'+o.id+'">Cancel</button></td></tr>').join(""):'<tr><td colspan="6" class="empty-cell">No open orders.</td></tr>';
  }

  function renderHistory() {
    $("history-body").innerHTML=state.trades.length?state.trades.map((t)=>'<tr><td>'+new Date(t.timestamp).toLocaleString()+'</td><td>'+t.symbol+'</td><td>'+t.side+'</td><td class="numeric">'+number(t.quantity,5)+'</td><td class="numeric">'+money(t.price,5)+'</td><td class="numeric '+((t.realizedPnl||0)>=0?"positive":"negative")+'">'+money(t.realizedPnl||0)+'</td></tr>').join(""):'<tr><td colspan="6" class="empty-cell">Your simulated trades will appear here.</td></tr>';
  }

  function renderPortfolio() {
    $("portfolio-equity").textContent=money(totalEquity());
    $("portfolio-cash").textContent=money(state.cash);
    $("portfolio-invested").textContent=money(state.positions.reduce((s,p)=>s+positionValue(p),0));
    $("portfolio-pnl").textContent=money(totalUnrealized()+totalRealized());
    $("portfolio-body").innerHTML=state.positions.length?state.positions.map(positionRow).join(""):'<tr><td colspan="5" class="empty-cell">No open positions.</td></tr>';
  }

  function renderAll() {
    renderOverview(); renderMarkets(); renderOrders(); renderHistory(); renderPortfolio();
    if(state.activeView==="trade")renderTrade();
    $("top-equity").textContent=money(totalEquity());
  }

  function reservedBuyCash() {
    return state.orders.filter((o)=>o.status==="OPEN"&&o.side==="BUY").reduce((sum,o)=>sum+o.limitPrice*o.quantity*(1+FEE_RATE),0);
  }
  function reservedSellQuantity(symbol) {
    return state.orders.filter((o)=>o.status==="OPEN"&&o.side==="SELL"&&o.symbol===symbol).reduce((sum,o)=>sum+o.quantity,0);
  }

  function executeMarketOrder(side, symbol, quantity) {
    const asset=ASSETS.find((x)=>x.symbol===symbol), price=priceOf(symbol);
    if(!asset || !Number.isFinite(quantity) || quantity<=0)throw new Error("Enter a valid quantity.");
    const gross=price*quantity, fee=gross*FEE_RATE, total=gross+fee;
    const existing=positionOf(symbol);
    if(side==="BUY"){
      if(total+reservedBuyCash()>state.cash)throw new Error("Insufficient available virtual cash after pending buy orders.");
      state.cash-=total;
      if(existing){const newQty=existing.quantity+quantity;existing.averagePrice=((existing.averagePrice*existing.quantity)+gross+fee)/newQty;existing.quantity=newQty;}
      else state.positions.push({symbol,name:asset.name,quantity,averagePrice:(gross+fee)/quantity});
    } else {
      if(!existing || existing.quantity-reservedSellQuantity(symbol)+1e-10<quantity)throw new Error("Not enough available units after pending sell orders.");
      const pnl=(price-existing.averagePrice)*quantity;
      state.cash+=gross-fee;
      existing.quantity-=quantity;
      if(existing.quantity<1e-9)state.positions=state.positions.filter((p)=>p.symbol!==symbol);
      state.trades.unshift({id:uid(),timestamp:Date.now(),symbol,side,quantity,price,fee,realizedPnl:pnl-fee});
      persistSnapshot(); toast("Sell simulated. Realized P/L "+money(pnl-fee));
      return;
    }
    state.trades.unshift({id:uid(),timestamp:Date.now(),symbol,side,quantity,price,fee,realizedPnl:0});
    persistSnapshot(); toast(side+" order simulated successfully.");
  }

  function submitOrder(side) {
    try {
      const type=$("order-type").value, quantity=Number($("order-quantity").value);
      if(!Number.isFinite(quantity)||quantity<=0)throw new Error("Quantity must be greater than zero.");
      const symbol=state.selected;
      if(type==="MARKET"){executeMarketOrder(side,symbol,quantity);}
      else {
        const limitPrice=Number($("limit-price").value);
        if(!Number.isFinite(limitPrice)||limitPrice<=0)throw new Error("Enter a valid limit price.");
        const order={id:uid(),timestamp:Date.now(),symbol,side,type,quantity,limitPrice,status:"OPEN"};
        if(side==="BUY" && reservedBuyCash()+limitPrice*quantity*(1+FEE_RATE)>state.cash)throw new Error("Insufficient available virtual cash for this limit order.");
        if(side==="SELL"){const p=positionOf(symbol);if(!p||p.quantity-reservedSellQuantity(symbol)<quantity)throw new Error("Not enough available units to reserve for this sell limit order.");}
        state.orders.unshift(order);persistSnapshot();toast("Limit order placed in simulation.");
      }
      renderAll();
    } catch(error){toast(error.message||"Order failed.","error");}
  }

  function matchLimitOrders() {
    let changed=false;
    state.orders.filter((o)=>o.status==="OPEN").forEach((o)=>{
      const p=priceOf(o.symbol), crossed=o.side==="BUY"?p<=o.limitPrice:p>=o.limitPrice;
      if(crossed){
        try {o.status="FILLED";o.filledAt=Date.now();executeMarketOrder(o.side,o.symbol,o.quantity);changed=true;}
        catch(e){o.status="REJECTED";o.reason=e.message;changed=true;}
      }
    });
    if(changed)persistSnapshot();
  }

  function tick() {
    if(state.marketPaused)return;
    ASSETS.forEach((asset)=>{
      const previous=priceOf(asset.symbol), next=Math.max(asset.price*.05,previous*(1+(Math.random()-.5)*asset.volatility));
      state.prices[asset.symbol]=next;
      const rows=state.candles[asset.symbol]||[];
      const last=rows[rows.length-1], now=Date.now();
      if(last && now-last.time<60000){last.close=next;last.high=Math.max(last.high,next);last.low=Math.min(last.low,next);}
      else rows.push({time:now,open:previous,close:next,high:Math.max(previous,next),low:Math.min(previous,next),volume:Math.random()*100});
      if(rows.length>180)rows.splice(0,rows.length-180);
      state.candles[asset.symbol]=rows;
    });
    matchLimitOrders();
    renderAll();
    if(state.activeView==="trade")drawChart();
  }

  function toggleWatch(symbol) {
    state.watchlist=state.watchlist.includes(symbol)?state.watchlist.filter((x)=>x!==symbol):state.watchlist.concat(symbol);
    persistSnapshot();renderMarkets();renderWatchlist();
  }

  function selectAsset(symbol) {
    if(!ASSETS.some((x)=>x.symbol===symbol))return;
    state.selected=symbol;
    $("order-quantity").value="";
    if(state.activeView!=="trade")navigate("trade");else renderTrade();
    persistSnapshot();
  }

  function bindEvents() {
    document.addEventListener("click",(event)=>{
      const view=event.target.closest("[data-view]");
      if(view){navigate(view.dataset.view);return;}
      const select=event.target.closest("[data-select]");
      if(select){selectAsset(select.dataset.select);return;}
      const watch=event.target.closest("[data-watch]");
      if(watch){event.stopPropagation();toggleWatch(watch.dataset.watch);return;}
      const trade=event.target.closest("[data-trade]");
      if(trade){selectAsset(trade.dataset.trade);return;}
      const cancel=event.target.closest("[data-cancel]");
      if(cancel){const o=state.orders.find((x)=>x.id===cancel.dataset.cancel);if(o&&o.status==="OPEN"){o.status="CANCELLED";persistSnapshot();renderOrders();toast("Order cancelled.");}return;}
    });
    document.querySelectorAll("[data-category]").forEach((el)=>el.addEventListener("click",()=>{state.category=el.dataset.category;document.querySelectorAll("[data-category]").forEach((x)=>x.classList.toggle("active",x===el));renderMarkets();persistSnapshot();}));
    $("market-search").addEventListener("input",renderMarkets);
    $("order-type").addEventListener("change",()=>{$("limit-price-wrap").hidden=$("order-type").value!=="LIMIT";});
    $("order-quantity").addEventListener("input",()=>{$("order-estimate").textContent=money(Number($("order-quantity").value||0)*priceOf(state.selected));});
    $("buy-button").addEventListener("click",()=>submitOrder("BUY"));
    $("sell-button").addEventListener("click",()=>submitOrder("SELL"));
    document.querySelectorAll("[data-timeframe]").forEach((el)=>el.addEventListener("click",()=>{state.timeframe=el.dataset.timeframe;document.querySelectorAll("[data-timeframe]").forEach((x)=>x.classList.toggle("active",x===el));drawChart();persistSnapshot();}));
    $("pause-market").addEventListener("click",()=>{state.marketPaused=!state.marketPaused;$("pause-market").textContent=state.marketPaused?"Resume simulation":"Pause simulation";});
    $("reset-demo").addEventListener("click",async()=>{
      if(!window.confirm("Reset all local demo funds, positions, orders and trade history? This cannot be undone."))return;
      state.cash=STARTING_CASH;state.positions=[];state.orders=[];state.trades=[];state.watchlist=["BTCUSD","ETHUSD","SOLUSD","AAPL","EURUSD"];
      ASSETS.forEach(seedCandles);await Promise.all(["settings","orders","positions","trades","watchlist","candles"].map(clearStore));await persistSnapshot();renderAll();toast("Demo account reset.");
    });
    window.addEventListener("resize",()=>{if(state.activeView==="trade")drawChart();});
  }

  async function boot() {
    try {
      state.db=await openDB();
      await hydrate();
      bindEvents();
      $("loading-screen").hidden=true;
      $("app-shell").hidden=false;
      document.querySelectorAll("[data-timeframe]").forEach((x)=>x.classList.toggle("active",x.dataset.timeframe===state.timeframe));
      document.querySelectorAll("[data-category]").forEach((x)=>x.classList.toggle("active",x.dataset.category===state.category));
      renderAll();
      state.tickTimer=setInterval(tick,2500);
      setInterval(()=>persistSnapshot().catch(()=>{}),15000);
      window.addEventListener("beforeunload",()=>{if(state.db)persistSnapshot();});
      if("serviceWorker" in navigator && location.protocol!=="file:"){navigator.serviceWorker.register("./sw.js").catch(()=>{});}
    } catch(error) {
      $("loading-screen").innerHTML='<div class="load-card"><b>Local storage unavailable</b><p>'+escapeHtml(error.message)+'</p><p>Use a modern browser with IndexedDB enabled and open MEMEVERSE from HTTPS or localhost.</p></div>';
    }
  }

  window.MEMEVERSE={navigate,selectAsset};
  boot();
})();