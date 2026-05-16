/* ═══════════════════════════════════════════════════════════
   ROYAL CHESS ARENA — MULTI-ENGINE ANALYSIS v3 [IMPROVED]
   Stockfish 16 WASM (real) · Lc0-style · Komodo-style
   
   🔧 IMPROVEMENTS:
   • Better error handling & logging
   • Improved Stockfish WASM loading
   • Fallback to simulated analysis
   • Better user feedback
   • DOM validation
═══════════════════════════════════════════════════════════ */
'use strict';

// Debug mode - set to true for console logging
const DEBUG_MODE = true;
function logDebug(msg, data) {
  if (DEBUG_MODE) {
    console.log(`[Analysis] ${msg}`, data || '');
  }
}

function logError(msg, err) {
  console.error(`[Analysis ERROR] ${msg}`, err || '');
}

/* ═══════════════════════════════════
   PIECES — Lichess SVG standard
═══════════════════════════════════ */
const SVG = {
  wK: `<img src="../../../Images/Chesspieces/wK.png" alt='wK'>`,
  wQ: `<img src="../../../Images/Chesspieces/wQ.png" alt='wQ'>`,
  wR: `<img src="../../../Images/Chesspieces/wR.png" alt='wR'>`,
  wB: `<img src="../../../Images/Chesspieces/wB.png" alt='wB'>`,
  wN: `<img src="../../../Images/Chesspieces/wN.png" alt='wN'>`,
  wP: `<img src="../../../Images/Chesspieces/wP.png" alt='wP'>`,
  bK: `<img src="../../../Images/Chesspieces/bK.png" alt='bK'>`,
  bQ: `<img src="../../../Images/Chesspieces/bQ.png" alt='bQ'>`,
  bR: `<img src="../../../Images/Chesspieces/bR.png" alt='bR'>`,
  bB: `<img src="../../../Images/Chesspieces/bB.png" alt='bB'>`,
  bN: `<img src="../../../Images/Chesspieces/bN.png" alt='bN'>`,
  bP: `<img src="../../../Images/Chesspieces/bP.png" alt='bP'>`
};

/* ═══════════════════════════════════
   CLASSIFICATIONS
═══════════════════════════════════ */
const CL = {
  brilliant: { l:'Brilliant',  c:'#00e5c3', bg:'rgba(0,229,195,.13)',  e:'💎', sym:'!!', d:'is a brilliant move!' },
  critical:  { l:'Critical',   c:'#4fa3e0', bg:'rgba(79,163,224,.11)', e:'🎯', sym:'',   d:'is the only good move' },
  best:      { l:'Best',       c:'#6abf45', bg:'rgba(106,191,69,.11)', e:'✅', sym:'!',  d:'is the best move' },
  excellent: { l:'Excellent',  c:'#94d13a', bg:'rgba(148,209,58,.09)', e:'⭐', sym:'',   d:'is excellent' },
  okay:      { l:'Okay',       c:'#7a9e6e', bg:'rgba(122,158,110,.09)',e:'➡️',  sym:'',   d:'is an okay move' },
  inaccuracy:{ l:'Inaccuracy', c:'#e8c842', bg:'rgba(232,200,66,.11)', e:'⚠️',  sym:'?!', d:'is an inaccuracy' },
  mistake:   { l:'Mistake',    c:'#e07a2a', bg:'rgba(224,122,42,.11)', e:'❌', sym:'?',  d:'is a mistake' },
  blunder:   { l:'Blunder',    c:'#d43030', bg:'rgba(212,48,48,.13)',  e:'💣', sym:'??', d:'is a blunder' },
  forced:    { l:'Forced',     c:'#7a9e6e', bg:'rgba(122,158,110,.09)',e:'🔒', sym:'',   d:'is forced' },
  theory:    { l:'Theory',     c:'#c49a55', bg:'rgba(196,154,85,.09)', e:'📖', sym:'',   d:'is theory' },
  risky:     { l:'Risky',      c:'#9683c8', bg:'rgba(150,131,200,.1)', e:'⚡', sym:'',   d:'is a risky idea' }
};

/* ═══════════════════════════════════
   ENGINE DEFINITIONS
=══════════════════════════════════ */
const ENGINES = {
  sf: {
    id:'sf', name:'Stockfish 16', short:'SF 16', elo:'~3500',
    color:'#0076d6', badge:'sf-badge',
    // Real Stockfish 16 WASM via jsDelivr
    url: 'https://cdn.jsdelivr.net/npm/stockfish@17.1.0/src/stockfish-nnue-16-single.js',
    depth: 20, multiPV: 3,
    style: 'Tactical · NNUE · Depth 20'
  },
  lc0: {
    id:'lc0', name:'Lc0 (Neural)', short:'Lc0', elo:'~3550',
    color:'#e84393', badge:'lc0-badge',
    // Lc0 has no public browser WASM → we use SF with adjusted params to simulate neural style
    url: null, // simulated
    depth: 20, multiPV: 3,
    style: 'Neural · Positional · Monte Carlo'
  },
  kd: {
    id:'kd', name:'Komodo Dragon', short:'KD 3', elo:'~3480',
    color:'#ff8c00', badge:'kd-badge',
    // Komodo Dragon is commercial, no browser WASM → simulated with SF + adjustment
    url: null, // simulated
    depth: 18, multiPV: 3,
    style: 'NNUE · Positional · Dragon Net'
  }
};

/* ═══════════════════════════════════
   STOCKFISH WASM WRAPPER [IMPROVED]
═══════════════════════════════════ */
class StockfishWrapper {
  constructor(url) {
    this.url = url;
    this.worker = null;
    this.ready  = false;
    this._waiters = [];
    this.onInfo = null;
    this.onBest = null;
    this.initTimeout = 15000; // Increased timeout for WASM loading
  }

  async init() {
    return new Promise((resolve, reject) => {
      try {
        logDebug('Loading Stockfish from:', this.url);
        
        // Better error handling for worker creation
        try {
          this.worker = new Worker(this.url);
        } catch (e) {
          logError('Worker creation failed', e);
          reject(new Error('Failed to create Stockfish worker: ' + e.message));
          return;
        }

        this.worker.onmessage = e => this._msg(e.data);
        this.worker.onerror = e => {
          logError('Worker error', e);
          reject(new Error('Stockfish worker error: ' + e.message));
        };

        // Set up initialization sequence with better error handling
        this._send('uci');
        
        this._wait('uciok', this.initTimeout)
          .then(() => { 
            logDebug('UCI handshake complete');
            this._send('isready'); 
            return this._wait('readyok', this.initTimeout); 
          })
          .then(() => { 
            logDebug('Stockfish ready');
            this.ready = true; 
            resolve(); 
          })
          .catch(err => {
            logError('Stockfish init failed', err);
            this.ready = false;
            reject(err);
          });
      } catch(e) { 
        logError('Unexpected init error', e);
        reject(e); 
      }
    });
  }

  _msg(m) {
    this._waiters = this._waiters.filter(w => {
      if (m.includes(w.tok)) { w.res(m); return false; } return true;
    });
    if (m.startsWith('info') && this.onInfo) this.onInfo(m);
    if (m.startsWith('bestmove')) {
      const p = m.split(' ');
      if (this.onBest) this.onBest(p[1], p[3]);
    }
  }

  _wait(tok, ms=5000) {
    return new Promise((res, rej) => {
      const t = setTimeout(() => {
        logError(`Timeout waiting for: ${tok} (${ms}ms)`);
        rej(new Error('Timeout: ' + tok));
      }, ms);
      this._waiters.push({ tok, res: v => { clearTimeout(t); res(v); } });
    });
  }

  _send(cmd) { 
    if (this.worker) {
      try {
        this.worker.postMessage(cmd); 
      } catch(e) {
        logError('Error sending command to worker', e);
      }
    }
  }

  stop() { this._send('stop'); }

  setOption(name, val) { this._send(`setoption name ${name} value ${val}`); }

  async analyse(fen, depth=20, multiPV=3) {
    return new Promise(resolve => {
      const lines = {};
      this.onInfo = msg => {
        const d = this._parse(msg);
        if (d && d.pv?.length) {
          if (!lines[d.mpv] || d.depth >= (lines[d.mpv].depth||0)) lines[d.mpv] = d;
        }
      };
      this.onBest = (best) => {
        this.onInfo = null; this.onBest = null;
        resolve({ lines: Object.values(lines), best });
      };
      
      try {
        this._send(`position fen ${fen}`);
        this._send(`setoption name MultiPV value ${multiPV}`);
        this._send(`go depth ${depth}`);
      } catch(e) {
        logError('Error during analysis', e);
        resolve({ lines: [], best: null });
      }
    });
  }

  _parse(msg) {
    const dep = msg.match(/\bdepth (\d+)/);
    const mpv = msg.match(/\bmultipv (\d+)/);
    const sc  = msg.match(/\bscore (cp|mate) (-?\d+)/);
    const pv  = msg.match(/ pv (.+)/);
    if (!dep || !sc || !pv) return null;
    return {
      depth:+dep[1], mpv:+(mpv?.[1]||1),
      type:sc[1], score:+sc[2],
      pv: pv[1].trim().split(' ')
    };
  }
}

/* ═══════════════════════════════════
   ENGINE MANAGER [IMPROVED]
   Real SF16 + simulated Lc0/KD
═══════════════════════════════════ */
class EngineManager {
  constructor() {
    this.sf     = null;
    this.sfReady = false;
    this.active = 'sf';
    this.cache  = {};   // fen → {sf,lc0,kd}
    this._status = {};
    this.usingFallback = false;
  }

  async init(onStatus) {
    this._status = onStatus;
    onStatus('sf', 'loading');
    
    this.sf = new StockfishWrapper(ENGINES.sf.url);
    try {
      logDebug('Initializing Stockfish...');
      await this.sf.init();
      this.sfReady = true;
      this.sf.setOption('Hash', 128);
      this.usingFallback = false;
      logDebug('Stockfish initialized successfully');
      onStatus('sf', 'ready');
    } catch(e) {
      logError('Stockfish initialization failed, using fallback', e);
      this.sfReady = false;
      this.usingFallback = true;
      onStatus('sf', 'fallback');
      // Show user-friendly message
      const msg = 'Using estimated analysis (Stockfish failed to load). Results are simulated.';
      if (window.toast) window.toast(msg);
    }
    
    // Lc0 and KD have no public browser WASM builds
    onStatus('lc0', 'simulated');
    onStatus('kd',  'simulated');
  }

  setActive(id) { this.active = id; }

  async evaluateFEN(fen, depth=20) {
    if (this.cache[fen]) return this.cache[fen];

    let sfResult;
    if (this.sfReady) {
      try {
        sfResult = await this.sf.analyse(fen, depth, 3);
        if (!sfResult || !sfResult.lines || sfResult.lines.length === 0) {
          logDebug('Empty result from Stockfish, using fallback');
          sfResult = this._simulateSF(fen);
        }
      } catch(e) {
        logError('Stockfish analysis failed', e);
        sfResult = this._simulateSF(fen);
      }
    } else {
      sfResult = this._simulateSF(fen);
    }

    // Build engine comparison: Lc0 and KD derived from SF with characteristic adjustments
    const result = {
      sf:  this._normResult(sfResult, 'sf'),
      lc0: this._lc0Style(sfResult),
      kd:  this._kdStyle(sfResult)
    };
    this.cache[fen] = result;
    return result;
  }

  _normResult(raw, engine) {
    const line1 = raw.lines.find(l=>l.mpv===1) || raw.lines[0] || {};
    return {
      cp:   line1.type==='cp'   ? line1.score : null,
      mate: line1.type==='mate' ? line1.score : null,
      lines: raw.lines,
      best: raw.best
    };
  }

  // Lc0 neural style: slightly different eval (positional bias), same lines
  _lc0Style(sf) {
    const line1 = sf.lines.find(l=>l.mpv===1) || sf.lines[0] || {};
    const baseCp = line1.type==='cp' ? line1.score : 0;
    // Neural nets tend to evaluate positions differently — slightly compress tactical evals,
    // boost positional ones; add characteristic noise
    const adjust = baseCp * 0.08 + (Math.random()-0.5)*12;
    return {
      cp: line1.type==='cp' ? Math.round(baseCp + adjust) : null,
      mate: line1.type==='mate' ? line1.score : null,
      lines: sf.lines.map(l => ({ ...l, score: l.type==='cp' ? Math.round(l.score + adjust*0.5) : l.score })),
      best: sf.best,
      style: 'Neural positional evaluation'
    };
  }

  // Komodo Dragon style: positional/endgame specialist, NNUE
  _kdStyle(sf) {
    const line1 = sf.lines.find(l=>l.mpv===1) || sf.lines[0] || {};
    const baseCp = line1.type==='cp' ? line1.score : 0;
    // KD traditionally evaluates positional advantages more highly
    const adjust = Math.sign(baseCp) * Math.abs(baseCp) * 0.05 + (Math.random()-0.5)*8;
    return {
      cp: line1.type==='cp' ? Math.round(baseCp + adjust) : null,
      mate: line1.type==='mate' ? line1.score : null,
      lines: sf.lines.map(l => ({ ...l, score: l.type==='cp' ? Math.round(l.score + adjust*0.4) : l.score })),
      best: sf.best,
      style: 'Dragon NNUE evaluation'
    };
  }

  _simulateSF(fen) {
    const hash = fen.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    const cp = ((hash % 300) - 150) + (Math.random()-0.5)*40;
    const moves = ['e4','d4','Nf3','c4','g3','Nc3','e5','d5','c5','Nf6'];
    const fake = (cp2) => ({ type:'cp', score:Math.round(cp2), mpv:1, depth:18, pv:[moves[Math.floor(Math.random()*moves.length)],moves[Math.floor(Math.random()*moves.length)]] });
    return {
      lines: [{ ...fake(cp), mpv:1 }, { ...fake(cp*0.7+20), mpv:2 }, { ...fake(cp*0.5+35), mpv:3 }],
      best: moves[Math.floor(Math.random()*moves.length)]
    };
  }
}

/* ═══════════════════════════════════
   MAIN APPLICATION
═══════════════════════════════════ */
const App = (() => {
  const $ = id => document.getElementById(id);
  let chess = null, engines = null, flipped = false, autoPlay = null;
  let boardPx = 480;
  let positions = [], moves = [], evals = [], classifs = [], cpLoss = [];
  let curIdx = -1, players = {w:'White',b:'Black',wr:'?',br:'?'};
  let analysed = false, busy = false, activeEngine = 'sf';
  let engStatus = {sf:'loading', lc0:'simulated', kd:'simulated'};
  let selSq = null, legalDests = [];

/* ── Init ─────────────────────── */
  async function boot() {
    logDebug('Application boot started');
    
    // Validate chess.js
    if (typeof Chess === 'undefined') {
      const err = 'Chess.js library not loaded';
      logError(err);
      showErr(err);
      return;
    }
    
    // Validate DOM elements
    const requiredElements = ['board', 'abtn', 'pgn-ta', 'import-card', 'eng-card'];
    const missing = requiredElements.filter(id => !document.getElementById(id));
    if (missing.length > 0) {
      const err = `Missing HTML elements: ${missing.join(', ')}`;
      logError(err);
      showErr(err);
      return;
    }

    initBoardSize();
    chess = new Chess();
    renderBoard();
    engines = new EngineManager();
    setupSidebar();
    setupTraverser();
    setupToolbar();
    setupImport();
    setupTabs();
    setupEngTabs();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', () => { initBoardSize(); renderBoard(); });
    
    try {
      await engines.init(onEngStatus);
      logDebug('Engine initialization complete');
    } catch(e) {
      logError('Engine initialization error', e);
    }
  }

  function initBoardSize() {
    const avail = Math.min(window.innerHeight - 190, window.innerWidth * 0.40);
    boardPx = Math.max(280, Math.min(520, avail));
    const b = $('board');
    b.style.width = b.style.height = boardPx + 'px';
    $('evalbar').style.minHeight = boardPx + 'px';
  }

  function onEngStatus(eng, state) {
    engStatus[eng] = state;
    const dot = $(`sf-dot-${eng}`);
    const txt = $(`sf-txt-${eng}`);
    if (!dot) {
      logDebug(`Status dot not found for engine: ${eng}`);
      return;
    }
    
    const statusClass = state==='ready' ? 'ready' : state==='error' ? 'error' : state==='thinking' ? 'thinking' : 'loading';
    dot.className = 'sfdot ' + statusClass;
    
    if (txt) {
      const labels = {
        loading:'Loading…',
        ready:'Ready',
        error:'Unavailable',
        thinking:'Thinking…',
        simulated:'Simulated',
        fallback:'Using Fallback'
      };
      txt.textContent = labels[state] || state;
    }
    
    logDebug(`Engine ${eng} status: ${state}`);
    
    // Update engine tab visual
    const tab = document.querySelector(`.eng-tab[data-eng="${eng}"]`);
    if (tab) {
      const sdot = tab.querySelector('.eng-status-dot');
      if (sdot) {
        const colorMap = {
          'ready': '#6abf45',
          'fallback': '#e8c842',
          'simulated': '#e8c842',
          'error': '#d43030',
          'thinking': '#4fa3e0',
          'loading': '#5a6080'
        };
        sdot.style.background = colorMap[state] || '#5a6080';
      }
    }
  }

  /* ── BOARD ────────────────────── */
  function renderBoard() {
    const b = $('board');
    if (!b) {
      logError('Board element not found');
      return;
    }
    
    b.innerHTML = '';
    const cellPx = Math.floor(boardPx/8);
    const fen = positions.length>0 && curIdx>=0 ? positions[curIdx+1] : new Chess().fen();
    
    try {
      const tmp = new Chess(fen);
      const pos = tmp.board();

    for (let ri=0;ri<8;ri++) {
      for (let ci=0;ci<8;ci++) {
        const r = flipped?7-ri:ri, c = flipped?7-ci:ci;
        const light = (r+c)%2===0;
        const sq = document.createElement('div');
        sq.className = 'sq '+(light?'L':'D');
        sq.dataset.sq = 'abcdefgh'[c]+(8-r);
        sq.style.width = sq.style.height = cellPx+'px';

        // Last move highlight
        if (curIdx>=0 && moves[curIdx]) {
          const mv=moves[curIdx];
          if (sq.dataset.sq===mv.from) sq.classList.add('lf');
          if (sq.dataset.sq===mv.to)   sq.classList.add('lt');
        }
        // Selection
        if (selSq===sq.dataset.sq) sq.classList.add('sel');
        if (legalDests.includes(sq.dataset.sq)) {
          sq.classList.add(pos[r][c]?'pc':'pm');
        }

        // Piece
        const p = pos[r][c];
        if (p) {
          const key = p.color+p.type.toUpperCase();
          const wrap = document.createElement('div');
          wrap.innerHTML = SVG[key]||'';
          const svg = wrap.firstChild;
          if (svg) {
            svg.classList.add('piece');
            svg.style.width = svg.style.height = Math.round(cellPx*.86)+'px';
            sq.appendChild(svg);
          }
        }

        // Classification badge on last move destination
        if (curIdx>=0 && classifs[curIdx] && moves[curIdx]?.to===sq.dataset.sq) {
          const cl=CL[classifs[curIdx]];
          const b2=document.createElement('span');
          b2.className='cmark';
          b2.style.cssText=`background:${cl.bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.max(9,cellPx*.20)}px;`;
          b2.textContent=cl.e;
          sq.appendChild(b2);
        }

        // Corner coords
        if (ci===0){const s=document.createElement('span');s.style.cssText=`position:absolute;top:1px;left:2px;font-size:9px;font-family:'DM Mono',monospace;font-weight:600;color:${light?'#b58863':'#f0d9b5'};pointer-events:none;z-index:2`;s.textContent=flipped?ri+1:8-ri;sq.appendChild(s);}
        if (ri===7){const s=document.createElement('span');s.style.cssText=`position:absolute;bottom:1px;right:2px;font-size:9px;font-family:'DM Mono',monospace;font-weight:600;color:${light?'#b58863':'#f0d9b5'};pointer-events:none;z-index:2`;s.textContent='abcdefgh'[flipped?7-ci:ci];sq.appendChild(s);}

        sq.addEventListener('click',()=>onSqClick(sq.dataset.sq));
        b.appendChild(sq);
      }
    }
    updateEvalBar();
    updateMoveInfo();
    } catch(e) {
      logError('Error rendering board', e);
    }
  }

  function onSqClick(sqn) {
    const fen = curIdx>=0&&positions[curIdx+1] ? positions[curIdx+1] : new Chess().fen();
    const tmp = new Chess(fen);
    if (selSq) {
      if (selSq===sqn){selSq=null;legalDests=[];renderBoard();return;}
      const mv=tmp.move({from:selSq,to:sqn,promotion:'q'});
      if (mv){selSq=null;legalDests=[];renderBoard();return;}
      selSq=null;legalDests=[];
    }
    const piece=tmp.get(sqn);
    if (piece&&piece.color===tmp.turn()){
      selSq=sqn;
      legalDests=tmp.moves({square:sqn,verbose:true}).map(m=>m.to);
      renderBoard();
    }
  }

  /* ── EVAL BAR ─────────────────── */
  function updateEvalBar() {
    const fill=$('evalfill'), top=$('evtop'), bot=$('evbot');
    if (!fill) return;
    if (!evals.length||curIdx<0){fill.style.height='50%';return;}
    const ev=evals[curIdx];
    if (!ev){fill.style.height='50%';return;}
    const e=activeEngine;
    const raw=ev[e]||ev['sf']||{cp:0,mate:null};
    let pct, scoreStr;
    
    if (raw.mate!=null){
      pct = raw.mate>0 ? 99 : 1;
      scoreStr = raw.mate>0 ? `M${raw.mate}` : `-M${Math.abs(raw.mate)}`;
    } else {
      const cp = raw.cp || 0;
      // Better scaling: sigmoid function maps [-10, +10] to [0%, 100%]
      // -500 CP ≈ 5%, 0 CP = 50%, +500 CP ≈ 95%
      // Real range in human games: typically -300 to +300
      const logisticScale = 2/(1+Math.exp(-cp/200)) - 1;
      pct = 50 + 50 * logisticScale;
      pct = Math.max(1, Math.min(99, pct));
      scoreStr = cp>=0 ? `+${(cp/100).toFixed(1)}` : `${(cp/100).toFixed(1)}`;
    }
    
    fill.style.height = pct + '%';
    (flipped?top:bot).textContent = scoreStr;
    (flipped?bot:top).textContent = '';
    const sd=$('eng-score');
    if(sd){
      sd.textContent = scoreStr;
      sd.className = 'eng-score ' + (raw.cp>50?'pos':raw.cp<-50?'neg':'eq');
    }
  }

  /* ── MOVE INFO ────────────────── */
  function updateMoveInfo() {
    const el=$('tinfo');if(!el)return;
    if(curIdx<0){el.textContent='Start';return;}
    const mv=moves[curIdx];if(!mv)return;
    const n=Math.floor(curIdx/2)+1;
    el.textContent=`${n}. ${mv.color==='w'?'♔':'♚'} ${mv.san}`;
  }

  /* ── NAVIGATE ─────────────────── */
  function goTo(i) {
    i=Math.max(-1,Math.min(positions.length-2,i));
    curIdx=i; selSq=null; legalDests=[];
    renderBoard();
    updateEngineLines();
    updateClassifCard();
    updateMoveList();
    updateEvalGraphCursor();
  }

  /* ── ENGINE LINES [IMPROVED] ─────────────── */
  function updateEngineLines() {
    const wrap=$('eng-lines');
    if(!wrap) {
      logDebug('Engine lines element not found, skipping');
      return;
    }
    
    if(curIdx<0||!evals[curIdx]){
      wrap.innerHTML='<div style="font-size:11px;color:var(--muted);padding:4px">Navigate to a move to see engine lines</div>';
      return;
    }
    
    try {
      const e=activeEngine;
      const ev=evals[curIdx][e]||evals[curIdx]['sf'];
      if(!ev){wrap.innerHTML='';return;}
      
      // Update score
      updateEvalBar();
      
      // Engine name badge
      const nb=$('eng-name-b');
      if(nb){nb.textContent=ENGINES[activeEngine].short;nb.className='eng-name-badge '+ENGINES[activeEngine].badge;}
      
      const db=$('eng-depth-b');
      if(db){db.textContent=`depth ${ENGINES[activeEngine].depth}`;} 
      
      // Lines
      wrap.innerHTML='';
      const lines=(ev.lines||[]).sort((a,b)=>(a.mpv||1)-(b.mpv||1)).slice(0,3);
      
      if(!lines.length){
        const d=document.createElement('div');
        d.className='sfline line1';
        d.innerHTML=`<div class="sl-rank">1</div><div class="sl-eval ${ev.cp>=0?'pos':ev.cp<0?'neg':'eq'}">${ev.cp>=0?'+':''}${((ev.cp||0)/100).toFixed(2)}</div><div class="sl-moves">—</div>`;
        wrap.appendChild(d);
        return;
      }
      
      lines.forEach((ln,i)=>{
        const cp=ln.type==='mate'?null:ln.score;
        const mate=ln.type==='mate'?ln.score:null;
        const sc=mate!=null?(mate>0?`M${mate}`:`-M${Math.abs(mate)}`):(cp>=0?`+${(cp/100).toFixed(2)}`:`${(cp/100).toFixed(2)}`);
        const cls=cp==null?(mate>0?'pos':'neg'):cp>30?'pos':cp<-30?'neg':'eq';
        const pvs=(ln.pv||[]).slice(0,7);
        
        // IMPROVED: Filter illegal moves from engine suggestions
        const fen = positions[curIdx] || new Chess().fen();
        const legalPVs = pvs.filter(m => isLegalMove(fen, m));
        
        const pvHtml=legalPVs.map((m,j)=>j===0?`<span class="sl-best">${m}</span>`:m).join(' ');
        const d=document.createElement('div');
        d.className=`sfline line${i+1}`;
        d.innerHTML=`<div class="sl-rank">${i+1}</div><div class="sl-eval ${cls}">${sc}</div><div class="sl-moves">${pvHtml||'—'}</div>`;
        wrap.appendChild(d);
      });
      
      // Show engine comparison
      renderEngineComparison();
    } catch(e) {
      logError('Error updating engine lines', e);
    }
  }

  function renderEngineComparison() {
    const wrap=$('eng-compare');if(!wrap)return;
    if(curIdx<0||!evals[curIdx]){wrap.innerHTML='';return;}
    const ev=evals[curIdx];
    wrap.innerHTML='';
    ['sf','lc0','kd'].forEach(id=>{
      const e=ENGINES[id];
      const d=ev[id]||{cp:0,mate:null};
      const cp=d.cp||0,mate=d.mate;
      const sc=mate!=null?(mate>0?`M${mate}`:`-M${Math.abs(mate)}`):(cp>=0?`+${(cp/100).toFixed(2)}`:`${(cp/100).toFixed(2)}`);
      const col=document.createElement('div');
      col.className='ecol';
      col.innerHTML=`<div class="ecol-eng" style="color:${e.color}">${e.short}</div><div class="ecol-score" style="color:${cp>30?'var(--c-best)':cp<-30?'var(--c-blund)':'var(--muted2)'}">${sc}</div><div class="ecol-type">${engStatus[id]==='ready'?'Real WASM':'Simulated'}</div>`;
      wrap.appendChild(col);
    });
  }

  /* ── CLASSIFICATION CARD [IMPROVED] ──────── */
  function updateClassifCard() {
    const card=$('cl-card');
    if(!card)return;
    if(curIdx<0||!classifs[curIdx]){card.classList.add('hidden');return;}
    card.classList.remove('hidden');
    const key=classifs[curIdx],cl=CL[key],mv=moves[curIdx],loss=cpLoss[curIdx];
    if(!cl||!mv)return;
    
    $('cl-icon').textContent=cl.e;
    $('cl-icon').style.background=cl.bg;
    $('cl-icon').style.boxShadow=`0 0 0 2px ${cl.c}44`;
    $('cl-san').textContent=mv.san+(cl.sym?' '+cl.sym:'');
    $('cl-san').style.color=cl.c;
    card.style.borderColor=cl.c+'33';
    card.style.background=cl.bg;
    
    $('cl-label-name').textContent=cl.l;
    $('cl-label-name').style.color=cl.c;
    
    // IMPROVED DESC: More detailed explanation
    const descEl = $('cl-desc');
    if(descEl) {
      const context = {
        opening: Math.floor(curIdx/2) + 1 <= 12,
        majorDecision: evals[curIdx]?.sf?.lines?.length > 1
      };
      const explanation = getMoveExplanation(curIdx, key, loss, context);
      descEl.textContent = explanation;
    }
    
    const cpEl=$('cl-cp');
    if(loss!=null){
      cpEl.textContent=loss>0?`-${(loss/100).toFixed(1)}cp`:(loss<=-5?`+${(Math.abs(loss)/100).toFixed(1)}cp`:'✓ Best');
      cpEl.style.display='inline-block';
    } else {cpEl.style.display='none';}
    
    // IMPROVED ALT: Show best move with explanation
    const altEl=$('cl-alt');
    if(['inaccuracy','mistake','blunder'].includes(key)&&curIdx>0&&evals[curIdx-1]) {
      const prevEv=evals[curIdx-1];
      const line1=(prevEv[activeEngine]||prevEv['sf']||{}).lines?.find(l=>(l.mpv||1)===1);
      const bestPV=line1?.pv?.[0];
      const bestMoveScore = line1?.score || 0;
      
      if(bestPV && bestPV !== mv.san) {
        const scoreStr = bestMoveScore >= 0 ? `+${(bestMoveScore/100).toFixed(1)}` : `${(bestMoveScore/100).toFixed(1)}`;
        altEl.innerHTML = `<strong>Better was:</strong> <span class="alt-san">${bestPV}</span> (${scoreStr}cp)`;
        altEl.style.display='';
      } else {
        altEl.style.display='none';
      }
    } else {
      altEl.style.display='none';
    }
  }

  /* ── ANALYSIS ─────────────────── */
  async function analyse(pgn) {
    if(busy) {
      showErr('Analysis already in progress');
      return;
    }
    busy=true;
    
    try {
      const tmp=new Chess();
      const ok=tmp.load_pgn(pgn,{sloppy:true});
      if(!ok){
        const fc=new Chess();
        if(!fc.load(pgn)){
          showErr('Invalid PGN or FEN. Please check the format and try again.');
          busy=false;
          return;
        }
      }
      
      const hdr=tmp.header();
      players={w:hdr['White']||'White',b:hdr['Black']||'Black',wr:hdr['WhiteElo']||'?',br:hdr['BlackElo']||'?'};
      const hist=tmp.history({verbose:true});
      
      if(!hist.length){
        showErr('No moves found in the provided game.');
        busy=false;
        return;
      }
      
      logDebug(`Loaded game: ${players.w} vs ${players.b}, ${hist.length} moves`);
      positions=[]; moves=[]; evals=[]; classifs=[]; cpLoss=[];
      curIdx=-1; analysed=false;

      const wc=new Chess();
      positions.push(wc.fen());
      for(const mv of hist){wc.move(mv);positions.push(wc.fen());moves.push(mv);}

      showProgress();
      setStatus('running','Analysing…');
      setStage('evaluate');

      const N=hist.length;
      const depth=ENGINES[activeEngine].depth;

      // Evaluate every position
      const rawEvals=[];
      for(let i=0;i<=N;i++){
        onEngStatus('sf','thinking');
        try{
          rawEvals.push(await engines.evaluateFEN(positions[i],depth));
        } catch(e){
          logError(`Evaluation failed for position ${i}`, e);
          rawEvals.push(null);
        }
        setPct(Math.round((i/(N+5))*72));
      }
      onEngStatus('sf','ready');
      setStage('classify');
      setPct(75);

    // Compute CP loss and classifications
    for(let i=0;i<N;i++){
      const before=rawEvals[i], after=rawEvals[i+1];
      const isW=moves[i].color==='w';
      
      if(!before||!after){
        evals.push({sf:{cp:0},lc0:{cp:0},kd:{cp:0}});
        classifs.push('okay');
        cpLoss.push(0);
        continue;
      }
      
      // From mover's perspective
      const sfB=before['sf']||{cp:0}, sfA=after['sf']||{cp:0};
      const cpB=sfB.mate!=null?(sfB.mate>0?9999:-9999):(sfB.cp*(isW?1:-1));
      const cpA=sfA.mate!=null?(sfA.mate>0?-9999:9999):(sfA.cp*(isW?-1:1));
      const loss=cpB-cpA;
      
      evals.push(after);
      cpLoss.push(Math.round(loss));
      
      // IMPROVED CLASSIFICATION LOGIC
      // Check for illegal move suggestions from engine
      const bestMove = before['sf']?.best || before['sf']?.lines?.[0]?.pv?.[0];
      const isIllegal = bestMove && !isLegalMove(positions[i], bestMove);
      
      // Check if opening/theory move
      const moveNum = Math.floor(i/2) + 1;
      const isOpening = moveNum <= 12; // First 12 moves typically opening
      
      // Brilliant: Unexpected great sacrifice or tactical shot
      const isBrilliant = (loss < -80) && (bestMove !== moves[i].san) && engines.sfReady;
      
      // Major decision point: multiple legal moves with similar scores
      const topLine = before['sf']?.lines?.[0] || {};
      const secondLine = before['sf']?.lines?.[1] || {};
      const moveScoreDiff = (topLine.score||0) - (secondLine.score||0);
      const majorDecision = moveScoreDiff > 50; // Clear best move exists
      
      const context = {
        opening: isOpening,
        majorDecision: majorDecision,
        evalBefore: cpB,
        illegal: isIllegal
      };
      
      classifs.push(cpLossToClass(Math.max(0, loss), isBrilliant, context));
    }

    setStage('report'); setPct(95);
    await sleep(280); setPct(100); await sleep(180);
    busy=false; analysed=true;
    showResults();
    setStatus('done','Complete');
    goTo(0);
    } catch(e) {
      logError('Analysis error', e);
      showErr('Error during analysis: ' + e.message);
      busy=false;
    }
  }

  function cpLossToClass(loss, isBrilliant, context={}) {
    // Context helps determine classification:
    // - opening: are we in theory/opening book?
    // - evalBefore: what was eval before this move?
    // - majorDecision: was there a clear best move?
    
    // BRILLIANT: Great sacrifices, unexpected great moves, major tactical shots
    if (isBrilliant) return 'brilliant';
    
    // BEST: Only ONE good move exists and player found it (huge advantage)
    // Loss < 3 CP means you played essentially the only good move
    if (loss <= 3 && context.majorDecision) return 'best';
    
    // EXCELLENT: Very good move, no better alternatives nearby
    // Small mistakes that don't hurt much (3-15 CP loss)
    if (loss <= 15) return 'excellent';
    
    // GOOD/OKAY: Solid move, playable move
    if (loss <= 40) return 'okay';
    
    // INACCURACY: Small mistake, position still holdable
    // Lost some advantage but not critical (40-100 CP)
    if (loss <= 100) return 'inaccuracy';
    
    // MISTAKE: Clear error with better move available
    // Lost significant advantage (100-300 CP)
    if (loss <= 300) return 'mistake';
    
    // BLUNDER: Major tactical blunder
    // Typically after position was good, now lost (> 300 CP)
    return 'blunder';
  }

  /**
   * Check if a move in UCI format is legal in the given FEN
   */
  function isLegalMove(fen, uciMove) {
    try {
      const tmp = new Chess(fen);
      const moves = tmp.moves({verbose: true});
      const moveStr = uciMove.substring(0, 4); // e.g., "e2e4"
      return moves.some(m => (m.from + m.to) === moveStr);
    } catch(e) {
      return false;
    }
  }

  /**
   * Generate explanation for why a move was good/bad
   */
  function getMoveExplanation(moveIdx, classification, cpLoss, context={}) {
    const cp = cpLoss;
    const mv = moves[moveIdx];
    const before = evals[moveIdx];
    const after = evals[moveIdx+1];
    
    const explanations = {
      brilliant: `A brilliant move! You found ${mv.san} despite it looking counterintuitive. This is a great tactical shot or sacrifice that gains significant advantage.`,
      best: `The best move. ${mv.san} was the only truly good move in this position, and you found it. Clear move that maintains/improves your advantage.`,
      excellent: `An excellent move. ${mv.san} is very good with minimal loss (${cp}cp). You played almost as well as the engine.`,
      okay: `A reasonable move. ${mv.san} is solid and playable, though not the very best (${cp}cp loss). The position remains roughly equal.`,
      inaccuracy: `A minor inaccuracy. ${mv.san} loses about ${cp}cp - a small but unnecessary weakness. Better alternatives existed, but the position is still playable.`,
      mistake: `A significant mistake. ${mv.san} loses ${cp}cp. There was a better move available, and you missed a good opportunity.`,
      blunder: `A blunder! ${mv.san} loses ${cp}cp. This is a major tactical error. After being in a good position, this move significantly worsens your situation.`,
      theory: `Theory move. ${mv.san} follows established opening theory. This is the recommended move in this well-known position.`,
      forced: `A forced move. ${mv.san} was essentially the only legal move or the only way to avoid immediate disaster.`
    };
    
    return explanations[classification] || `${mv.san}: ${classification} (${cp}cp loss)`;
  }

  /* ── REPORT ───────────────────── */
  function renderAccuracies(){
    const acc=computeAcc();
    const wn=$('w-acc-player'),bn=$('b-acc-player');
    if(wn)wn.textContent=players.w;if(bn)bn.textContent=players.b;
    const wv=$('w-acc-val'),bv=$('b-acc-val');
    const wb=$('w-acc-bar'),bb=$('b-acc-bar');
    if(acc.w!=null&&wv){wv.textContent=acc.w.toFixed(1)+'%';setTimeout(()=>{if(wb)wb.style.width=acc.w+'%';},80);}
    if(acc.b!=null&&bv){bv.textContent=acc.b.toFixed(1)+'%';setTimeout(()=>{if(bb)bb.style.width=acc.b+'%';},80);}
  }

  function computeAcc(){
    let wl=0,bl=0,wn=0,bn=0;
    cpLoss.forEach((l,i)=>{const loss=Math.max(0,l);if(i%2===0){wl+=loss;wn++;}else{bl+=loss;bn++;}});
    const f=avg=>Math.max(0,Math.min(100,103.1668*Math.exp(-0.04354*avg)-3.1669));
    return{w:wn?f(wl/wn):null,b:bn?f(bl/bn):null};
  }

  function renderClassifTable(){
    const tb=$('ctbody');if(!tb)return;
    tb.innerHTML='';
    const wh=$('ct-wh'),bh=$('ct-bh');
    if(wh)wh.textContent=players.w;if(bh)bh.textContent=players.b;
    const keys=['brilliant','best','excellent','okay','inaccuracy','mistake','blunder','theory'];
    keys.forEach(k=>{
      const cl=CL[k];
      const wc=classifs.filter((_,i)=>_===k&&i%2===0).length;
      const bc=classifs.filter((_,i)=>_===k&&i%2===1).length;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><div class="cname"><div class="cdot" style="background:${cl.c}"></div><span style="font-size:13px">${cl.e}</span><span style="color:${cl.c};font-size:11px;font-weight:600">${cl.l}</span></div></td><td><span class="cnum" style="color:${cl.c}">${wc}</span></td><td style="font-size:10px;color:var(--muted)">${cl.sym||'—'}</td><td><span class="cnum" style="color:${cl.c}">${bc}</span></td>`;
      tb.appendChild(tr);
    });
  }

  function renderEvalGraph(){
    const svg=$('egraph');if(!svg)return;
    svg.innerHTML='';
    if(!evals.length)return;
    const cps=evals.map(e=>{const s=activeEngine,r=(e[s]||e['sf']||{cp:0});if(r.mate!=null)return r.mate>0?800:-800;return Math.max(-800,Math.min(800,r.cp||0));});
    const W=400,H=88,mid=H/2,ys=(mid-5)/800;
    const pts=cps.map((cp,i)=>[Math.round(i*(W/Math.max(cps.length-1,1))),Math.round(mid-cp*ys)]);
    const path=pts.map((p,i)=>(i===0?`M${p[0]},${p[1]}`:`L${p[0]},${p[1]}`)).join(' ');
    const ns='http://www.w3.org/2000/svg';
    const defs=document.createElementNS(ns,'defs');
    defs.innerHTML=`<linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8cfa0" stop-opacity=".55"/><stop offset="50%" stop-color="#e8cfa0" stop-opacity=".15"/><stop offset="100%" stop-color="#111" stop-opacity=".3"/></linearGradient>`;
    svg.appendChild(defs);
    const fill=document.createElementNS(ns,'path');fill.setAttribute('d',path+` L${W},${mid} L0,${mid} Z`);fill.setAttribute('fill','url(#gg)');svg.appendChild(fill);
    const line=document.createElementNS(ns,'path');line.setAttribute('d',path);line.setAttribute('stroke','#e8cfa0');line.setAttribute('stroke-width','1.5');line.setAttribute('fill','none');line.setAttribute('stroke-linejoin','round');svg.appendChild(line);
    const zero=document.createElementNS(ns,'line');zero.setAttribute('x1','0');zero.setAttribute('y1',mid);zero.setAttribute('x2',W);zero.setAttribute('y2',mid);zero.setAttribute('stroke','rgba(255,255,255,0.1)');zero.setAttribute('stroke-width','1');svg.appendChild(zero);
    // Classification dots
    pts.forEach((p,i)=>{
      const cl=CL[classifs[i]];if(!cl)return;
      const c=document.createElementNS(ns,'circle');
      c.setAttribute('cx',p[0]);c.setAttribute('cy',p[1]);c.setAttribute('r','3');
      c.setAttribute('fill',cl.c);c.setAttribute('opacity','0.85');c.style.cursor='pointer';
      c.addEventListener('click',()=>goTo(i));svg.appendChild(c);
    });
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    updateEvalGraphCursor();
  }

  function updateEvalGraphCursor(){
    const c=$('egcursor');if(!c||!evals.length||curIdx<0)return;
    const cw=$('egraph-wrap')?.offsetWidth||300;
    c.style.left=(curIdx/Math.max(evals.length-1,1)*cw)+'px';
  }

  function updateMoveList(){
    const list=$('mlist');if(!list)return;
    list.innerHTML='';
    for(let i=0;i<moves.length;i+=2){
      const pair=document.createElement('div');pair.className='mpair';
      const num=document.createElement('span');num.className='mnum';num.textContent=(i/2+1)+'.';pair.appendChild(num);
      [0,1].forEach(off=>{
        const idx=i+off;if(idx>=moves.length)return;
        const mv=moves[idx],cl=CL[classifs[idx]];
        const cell=document.createElement('div');
        cell.className='mcell'+(idx===curIdx?' cur':'');
        const dot=document.createElement('span');dot.className='md';dot.style.background=cl?cl.c:'transparent';
        const san=document.createTextNode(mv.san);
        cell.appendChild(dot);cell.appendChild(san);
        if(cl?.sym){const s=document.createElement('span');s.className='ms';s.textContent=cl.sym;cell.appendChild(s);}
        cell.addEventListener('click',()=>goTo(idx));
        pair.appendChild(cell);
      });
      list.appendChild(pair);
    }
    const cur=list.querySelector('.mcell.cur');if(cur)cur.scrollIntoView({block:'nearest',behavior:'smooth'});
  }

  function updatePlayerStrips(){
    const ws=document.querySelector('#wstrip .pname'),bs=document.querySelector('#bstrip .pname');
    const wr=document.querySelector('#wstrip .prat'),br=document.querySelector('#bstrip .prat');
    if(ws)ws.textContent=players.w;if(bs)bs.textContent=players.b;
    if(wr)wr.textContent=players.wr!=='?'?`(${players.wr})`:'';
    if(br)br.textContent=players.br!=='?'?`(${players.br})`:'';
  }

  /* ── UI STATE ─────────────────── */
  function showProgress(){
    $('import-card').classList.add('hidden');
    $('prog-card').classList.remove('hidden');
    $('eng-card').classList.add('hidden');
    $('cl-card').classList.add('hidden');
    $('report-card').classList.add('hidden');
    $('empty-state').classList.add('hidden');
  }

  function showResults(){
    $('prog-card').classList.add('hidden');
    $('eng-card').classList.remove('hidden');
    $('report-card').classList.remove('hidden');
    $('import-card').classList.remove('hidden');
    updatePlayerStrips();
    renderAccuracies();
    renderClassifTable();
    renderEvalGraph();
    updateMoveList();
  }

  function showErr(msg){
    logError('Analysis error', msg);
    const s=$('imp-status');
    if (s) {
      s.textContent = msg;
      s.className = 'imp-status err';
      s.style.display = '';
    }
    $('prog-card')?.classList.add('hidden');
    $('import-card')?.classList.remove('hidden');
    setStatus('error','Error');
  }
  function setStage(st){document.querySelectorAll('.pst').forEach(el=>{const s=el.dataset.stage;el.classList.remove('active','done');if(s===st)el.classList.add('active');else if((st==='classify'&&s==='evaluate')||(st==='report'&&(s==='evaluate'||s==='classify')))el.classList.add('done');});}
  function setPct(p){const f=$('pfill'),pe=$('ppct');if(f)f.style.width=p+'%';if(pe)pe.textContent=p+'%';}
  function setStatus(st,txt){
    const b=$('status-badge');if(!b)return;
    b.className='sbadge '+st;b.innerHTML='';
    if(st==='running'){const d=document.createElement('span');d.className='pdot';b.appendChild(d);}
    b.appendChild(document.createTextNode(' '+txt));
  }

  /* ── ENGINE TABS ──────────────── */
  function setupEngTabs(){
    document.querySelectorAll('.eng-tab').forEach(t=>{
      t.addEventListener('click',()=>{
        document.querySelectorAll('.eng-tab').forEach(x=>x.classList.remove('active'));
        t.classList.add('active');
        activeEngine=t.dataset.eng;
        // Refresh display with new engine perspective
        updateEvalBar();
        updateEngineLines();
        renderEvalGraph();
        updateClassifCard();
      });
    });
  }

  /* ── SIDEBAR ──────────────────── */
  function setupSidebar(){
    const cb=$('sb-collapse');
    if(cb)cb.addEventListener('click',e=>{e.preventDefault();$('sidebar').classList.toggle('collapsed');});
    const th=$('theme-toggle');
    if(th)th.addEventListener('click',e=>{e.preventDefault();const l=document.documentElement.classList.toggle('light-ui');th.querySelector('.theme-label').textContent=l?'Dark UI':'Light UI';});
    try{const p=JSON.parse(localStorage.getItem('playerProfile')||'{}');if(p.name)document.querySelectorAll('.pdn').forEach(el=>el.textContent=p.name);}catch(e){}
  }

  /* ── TRAVERSER ────────────────── */
  function setupTraverser(){
    $('btn-start').addEventListener('click',()=>goTo(-1));
    $('btn-prev' ).addEventListener('click',()=>goTo(curIdx-1));
    $('btn-next' ).addEventListener('click',()=>goTo(curIdx+1));
    $('btn-end'  ).addEventListener('click',()=>goTo(positions.length-2));
    $('btn-play' ).addEventListener('click',toggleAuto);
  }
  function toggleAuto(){
    const btn=$('btn-play');
    if(autoPlay){clearInterval(autoPlay);autoPlay=null;btn.innerHTML='<i class="fas fa-play"></i>';btn.classList.remove('on');}
    else{btn.innerHTML='<i class="fas fa-pause"></i>';btn.classList.add('on');
      autoPlay=setInterval(()=>{if(curIdx>=positions.length-2){clearInterval(autoPlay);autoPlay=null;btn.innerHTML='<i class="fas fa-play"></i>';btn.classList.remove('on');}else goTo(curIdx+1);},680);}
  }

  /* ── TOOLBAR ──────────────────── */
  function setupToolbar(){
    $('btn-flip').addEventListener('click',()=>{flipped=!flipped;renderBoard();});
    $('btn-share').addEventListener('click',()=>{navigator.clipboard?.writeText(location.href).then(()=>toast('Link copied!')).catch(()=>toast('Share: '+location.href));});
    $('btn-pgn').addEventListener('click',()=>{
      if(!moves.length)return;
      const tc=new Chess();moves.forEach(m=>tc.move(m));tc.header('White',players.w,'Black',players.b);
      const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([tc.pgn()],{type:'text/plain'}));a.download=`${players.w}_vs_${players.b}.pgn`;a.click();toast('PGN saved!');
    });
    $('btn-new').addEventListener('click',()=>{
      positions=[];moves=[];evals=[];classifs=[];cpLoss=[];curIdx=-1;
      players={w:'White',b:'Black',wr:'?',br:'?'};analysed=false;
      chess=new Chess();renderBoard();
      $('import-card').classList.remove('hidden');
      $('eng-card').classList.add('hidden');
      $('report-card').classList.add('hidden');
      $('cl-card').classList.add('hidden');
      $('empty-state').classList.remove('hidden');
      $('prog-card').classList.add('hidden');
      $('pgn-ta').value='';setStatus('idle','Ready');
    });
  }

  /* ── IMPORT ───────────────────── */
  const SAMPLE=`[Event "World Chess Championship Match"]\n[White "Kasparov, Garry"]\n[Black "Deep Blue"]\n[WhiteElo "2795"]\n[BlackElo "2800"]\n[Result "1-0"]\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxe5 Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21. Nc4 Nxc4 22. Bxc4 Nb6 23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7 27. Qe3 Qg5 28. Qxg5 hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33. f3 Bc8 34. Kf2 Bf5 35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5 40. Rd6 Kc5 41. Ra6 Nf2 42. g4 Bd3 43. Re6 1-0`;
  function setupImport(){
    document.querySelectorAll('.stab').forEach(t=>{
      t.addEventListener('click',()=>{
        document.querySelectorAll('.stab').forEach(x=>x.classList.remove('active'));t.classList.add('active');
        const ph={pgn:'Paste PGN here… or click Analyse for Kasparov vs Deep Blue sample',fen:'FEN string…',chessCom:'Chess.com username…',lichess:'Lichess username…'};
        $('pgn-ta').placeholder=ph[t.dataset.src]||'';
      });
    });
    $('abtn').addEventListener('click',async()=>{
      const pgn=$('pgn-ta').value.trim()||SAMPLE;
      $('pgn-ta').value=pgn;
      const s=$('imp-status');s.textContent='';s.style.display='none';
      $('abtn').disabled=true;$('abtn').innerHTML='⏳ Analysing…';
      await analyse(pgn);
      $('abtn').disabled=false;$('abtn').innerHTML='<i class="fas fa-magnifying-glass"></i>  Analyse Game';
    });
  }

  /* ── TABS ─────────────────────── */
  function setupTabs(){
    document.querySelectorAll('.ptab').forEach(t=>{
      t.addEventListener('click',()=>{
        const tgt=t.dataset.tab;
        document.querySelectorAll('.ptab').forEach(x=>x.classList.toggle('active',x===t));
        document.querySelectorAll('.tabpanel').forEach(p=>p.classList.toggle('hidden',p.dataset.tp!==tgt));
        if(tgt==='analysis')updateMoveList();
        if(tgt==='report')renderEvalGraph();
      });
    });
  }

  /* ── KEYBOARD ─────────────────── */
  function onKey(e){
    if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;
    if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();goTo(curIdx-1);}
    if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();goTo(curIdx+1);}
    if(e.key==='Home'){e.preventDefault();goTo(-1);}
    if(e.key==='End'){e.preventDefault();goTo(positions.length-2);}
    if(e.key==='f'||e.key==='F'){flipped=!flipped;renderBoard();}
  }

  /* ── TOAST ────────────────────── */
  function toast(msg){
    let c=$('toasts');if(!c){c=document.createElement('div');c.id='toasts';c.className='toasts';document.body.appendChild(c);}
    const t=document.createElement('div');t.className='toast';t.textContent=msg;c.appendChild(t);
    setTimeout(()=>t.remove(),2800);
  }
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

  return {boot};
})();

document.addEventListener('DOMContentLoaded',()=>{
  logDebug('DOM Content Loaded');
  
  if(typeof Chess==='undefined'){
    const err = 'Chess.js failed to load. Check network connection.';
    logError(err);
    document.body.innerHTML=`<div style="color:#e07070;padding:24px;font-family:monospace">${err}</div>`;
    return;
  }
  
  try {
    App.boot();
    logDebug('Application booted successfully');
  } catch(e) {
    const err = 'Failed to initialize application: ' + e.message;
    logError(err);
    document.body.innerHTML=`<div style="color:#e07070;padding:24px;font-family:monospace">${err}</div>`;
  }
});