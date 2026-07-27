(()=>{
  if(window.__BLAZING_DEV_MONITOR__) return;

  const state={
    startedAt:Date.now(),
    lastBeat:Date.now(),
    lastEvent:'boot',
    requests:0,
    requestFailures:0,
    warnings:0,
    errors:0,
    lagEvents:0,
    events:[]
  };

  const MAX_EVENTS=40;
  const now=()=>new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});

  function record(type,message,meta={}){
    const item={time:now(),type,message:String(message),meta};
    state.lastEvent=`${type}: ${item.message}`;
    state.events.push(item);
    if(state.events.length>MAX_EVENTS) state.events.shift();
    if(type==='warn') state.warnings++;
    if(type==='error') state.errors++;
    if(type==='lag') state.lagEvents++;
    render();
    return item;
  }

  const style=document.createElement('style');
  style.id='bb-dev-monitor-style';
  style.textContent=`
    #bb-dev-monitor{position:fixed;left:8px;bottom:8px;z-index:2147483647;width:min(430px,calc(100vw - 16px));font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e8eef6;background:rgba(7,10,14,.92);border:1px solid rgba(255,255,255,.2);border-radius:9px;box-shadow:0 6px 24px rgba(0,0,0,.35);backdrop-filter:blur(5px);pointer-events:auto}
    #bb-dev-monitor .bbdm-head{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.12)}
    #bb-dev-monitor .bbdm-dot{width:7px;height:7px;border-radius:50%;background:#73e28b;flex:0 0 auto}
    #bb-dev-monitor[data-status="warn"] .bbdm-dot{background:#ffd36f}
    #bb-dev-monitor[data-status="error"] .bbdm-dot{background:#ff7474}
    #bb-dev-monitor .bbdm-title{font-weight:800;letter-spacing:.04em;flex:1}
    #bb-dev-monitor button{font:inherit;color:#d7e0ea;background:#20262f;border:1px solid rgba(255,255,255,.14);border-radius:5px;padding:2px 6px}
    #bb-dev-monitor .bbdm-stats{display:flex;flex-wrap:wrap;gap:5px;padding:6px 8px}
    #bb-dev-monitor .bbdm-chip{padding:2px 5px;border-radius:4px;background:#151a21;color:#bfc9d6}
    #bb-dev-monitor .bbdm-last{padding:0 8px 6px;color:#d6deea;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #bb-dev-monitor .bbdm-log{display:none;max-height:150px;overflow:auto;border-top:1px solid rgba(255,255,255,.1);padding:5px 8px}
    #bb-dev-monitor[data-open="1"] .bbdm-log{display:block}
    #bb-dev-monitor .bbdm-line{padding:2px 0;border-bottom:1px dashed rgba(255,255,255,.07);word-break:break-word}
    #bb-dev-monitor .bbdm-line[data-type="error"]{color:#ff9292}
    #bb-dev-monitor .bbdm-line[data-type="warn"],#bb-dev-monitor .bbdm-line[data-type="lag"]{color:#ffdc82}
    #bb-dev-monitor .bbdm-line[data-type="ok"]{color:#8ee59f}
  `;
  document.head.appendChild(style);

  const panel=document.createElement('div');
  panel.id='bb-dev-monitor';
  panel.dataset.open='0';
  panel.innerHTML=`
    <div class="bbdm-head">
      <span class="bbdm-dot"></span>
      <span class="bbdm-title">DEV ACTIVITY</span>
      <button type="button" data-action="toggle">LOG</button>
    </div>
    <div class="bbdm-stats"></div>
    <div class="bbdm-last"></div>
    <div class="bbdm-log"></div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('[data-action="toggle"]').addEventListener('click',()=>{
    panel.dataset.open=panel.dataset.open==='1'?'0':'1';
  });

  function render(){
    if(!panel.isConnected) return;
    panel.dataset.status=state.errors?'error':(state.warnings||state.requestFailures||state.lagEvents?'warn':'ok');
    panel.querySelector('.bbdm-stats').innerHTML=[
      `REQ ${state.requests}`,
      `FAIL ${state.requestFailures}`,
      `WARN ${state.warnings}`,
      `ERR ${state.errors}`,
      `LAG ${state.lagEvents}`
    ].map(x=>`<span class="bbdm-chip">${x}</span>`).join('');
    panel.querySelector('.bbdm-last').textContent=`LAST • ${state.lastEvent}`;
    panel.querySelector('.bbdm-log').innerHTML=state.events.slice().reverse().map(e=>
      `<div class="bbdm-line" data-type="${e.type}">[${e.time}] ${e.type.toUpperCase()} • ${escapeHtml(e.message)}</div>`
    ).join('');
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  const originalFetch=window.fetch?.bind(window);
  if(originalFetch){
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:(input?.url||'request');
      const short=url.replace(location.origin,'').split('?')[0];
      state.requests++;
      record('info',`fetch → ${short}`);
      const started=performance.now();
      try{
        const response=await originalFetch(input,init);
        const ms=Math.round(performance.now()-started);
        if(!response.ok){
          state.requestFailures++;
          record('warn',`fetch ${response.status} • ${short} • ${ms}ms`);
        }else{
          record('ok',`fetch ${response.status} • ${short} • ${ms}ms`);
        }
        return response;
      }catch(error){
        state.requestFailures++;
        record('error',`fetch failed • ${short} • ${error?.message||error}`);
        throw error;
      }
    };
  }

  const originalWarn=console.warn.bind(console);
  const originalError=console.error.bind(console);
  console.warn=(...args)=>{record('warn',args.map(String).join(' '));originalWarn(...args);};
  console.error=(...args)=>{record('error',args.map(String).join(' '));originalError(...args);};

  window.addEventListener('error',e=>record('error',`${e.message||'window error'}${e.filename?` @ ${e.filename}:${e.lineno||0}`:''}`));
  window.addEventListener('unhandledrejection',e=>record('error',`unhandled promise • ${e.reason?.message||e.reason||'unknown'}`));

  let expected=performance.now()+1000;
  setInterval(()=>{
    const current=performance.now();
    const drift=current-expected;
    expected=current+1000;
    state.lastBeat=Date.now();
    if(drift>1500) record('lag',`main thread delayed ${Math.round(drift)}ms`);
    else render();
  },1000);

  window.__BLAZING_DEV_MONITOR__={state,record};
  window.dispatchEvent(new CustomEvent('blazing-dev-monitor-ready'));
  record('ok','dev monitor ready');
})();