// =============================================================================
//  bot-backend.js  â€”  Royal Chess Arena
//  Load order: chess.js â†’ bot-data.js â†’ bot-engine.js â†’ bot-backend.js
// =============================================================================
console.log('ðŸ”„ bot-backend.js: Loading...');
try {

let Chess;
if(typeof window!=='undefined'&&window.Chess) Chess=window.Chess;
else if(typeof require!=='undefined'){try{Chess=require('chess.js').Chess;}catch(e){}}
if(!Chess) console.error('âŒ Chess.js not found');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SIMPLE MOVE LOGGING (lightweight, no external database)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const moveLogs = []; // Keep last 1000 moves in memory
function logMove(botName, move, elo, time) {
    moveLogs.push({ botName, move, elo, time, timestamp: Date.now() });
    if(moveLogs.length > 1000) moveLogs.shift(); // Keep memory lean
    console.log(`ðŸ“‹ [${botName}] moved ${move} (${time}ms)`);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  STOCKFISH LOADER  (loads once, shared across all bots)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _sf=null, _sfReady=false, _sfLoading=false, _sfCBs=[];

function loadStockfish(){
    return new Promise(resolve=>{
        if(_sf&&_sfReady){resolve(_sf);return;}
        _sfCBs.push(resolve);
        if(_sfLoading)return;
        _sfLoading=true;

        // CDN sources for Stockfish.js
        // To use local file: download stockfish.js from cdnjs and place in Chess-Bots folder,
        // then add './stockfish.js' as first entry in this array
        const srcs=[
            'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js',
            'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js',
            'https://unpkg.com/stockfish.js@10.0.2/stockfish.js'
        ];

        const tryNext=(i)=>{
            if(i>=srcs.length){
                console.warn('âš ï¸ Stockfish.js not found. Download stockfish.js to your Chess-Bots folder for best play.');
                _sfLoading=false;
                _sfCBs.forEach(cb=>cb(null));
                _sfCBs=[];
                return;
            }
            const s=document.createElement('script');
            s.src=srcs[i];
            s.onload=()=>{
                try{
                    const sf=window.Stockfish?window.Stockfish():null;
                    if(!sf){tryNext(i+1);return;}
                    _sf=sf;
                    const onMsg=line=>{
                        const msg=typeof line==='string'?line:(line.data??'');
                        if(msg.includes('readyok')){
                            _sfReady=true;
                            if(typeof sf.removeEventListener==='function') sf.removeEventListener('message',onMsg);
                            else sf.onmessage=null;
                            console.log(`âœ… Stockfish ready (${srcs[i]})`);
                            _sfCBs.forEach(cb=>cb(sf));_sfCBs=[];
                        }
                    };
                    if(typeof sf.addEventListener==='function') sf.addEventListener('message',onMsg);
                    else sf.onmessage=onMsg;
                    sf.postMessage('uci');
                    sf.postMessage('setoption name Hash value 128');
                    sf.postMessage('setoption name Threads value 1');
                    sf.postMessage('isready');
                }catch(e){tryNext(i+1);}
            };
            s.onerror=()=>tryNext(i+1);
            document.head.appendChild(s);
        };
        if(typeof window!=='undefined') tryNext(0);
        else{_sfLoading=false;_sfCBs.forEach(cb=>cb(null));_sfCBs=[];}
    });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  STOCKFISH QUERY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function eloToSFSettings(elo){
    // Only use Stockfish for VERY high-rated bots (2600+)
    // Built-in engine is 10x faster
    if(elo<2600){
        return null; // Skip Stockfish, use built-in engine
    }
    // For ultra-high bots: minimal thinking time
    const mt = elo<2800 ? 50 : elo<3000 ? 75 : 100; // Max 100ms
    return{mode:'limit',uciElo:Math.min(3190,Math.max(1320,elo)),movetime:mt};
}

function querySF(sf,fen,elo){
    const s=eloToSFSettings(elo);
    return new Promise(resolve=>{
        let settled=false,timer=null;
        const finish=move=>{
            if(settled)return;settled=true;
            clearTimeout(timer);detach();resolve(move);
        };
        const onMsg=line=>{
            const msg=typeof line==='string'?line:(line.data??String(line));
            if(!msg)return;
            if(msg.startsWith('bestmove')){
                const m=msg.match(/^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
                finish(m?m[1]:null);
            }
        };
        const attach=()=>{if(typeof sf.addEventListener==='function')sf.addEventListener('message',onMsg);else sf.onmessage=onMsg;};
        const detach=()=>{if(typeof sf.removeEventListener==='function')sf.removeEventListener('message',onMsg);else sf.onmessage=null;};
        timer=setTimeout(()=>finish(null),s.movetime+50);
        try{
            attach();
            sf.postMessage('ucinewgame');
            if(s.mode==='skill'){
                sf.postMessage('setoption name UCI_LimitStrength value false');
                sf.postMessage(`setoption name Skill Level value ${s.skillLevel}`);
            } else {
                sf.postMessage('setoption name UCI_LimitStrength value true');
                sf.postMessage(`setoption name UCI_Elo value ${s.uciElo}`);
            }
            sf.postMessage('isready');
            sf.postMessage(`position fen ${fen}`);
            sf.postMessage(`go movetime ${s.movetime}`);
        }catch(e){finish(null);}
    });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  WEB WORKER POOL  â€” runs findBestMove off the main thread
//  One shared worker handles all built-in engine calls.
//  This is what prevents the page from freezing during deep searches.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _worker      = null;   // the Web Worker instance
let _workerReady = false;  // true once worker sends 'ready'
let _workerPending = {};   // id â†’ { resolve, reject, timer }
let _workerMsgId = 0;

function getWorker() {
    if (_worker && _workerReady) return Promise.resolve(_worker);

    return new Promise((resolve) => {
        // If already loading, wait
        if (_worker && !_workerReady) {
            const waitInterval = setInterval(() => {
                if (_workerReady) { clearInterval(waitInterval); resolve(_worker); }
            }, 50);
            return;
        }

        try {
            _worker = new Worker('./bot-worker.js');

            _worker.onmessage = (e) => {
                const { type, move, id, message } = e.data;

                if (type === 'ready') {
                    _workerReady = true;
                    console.log('âœ… bot-worker.js ready');
                    resolve(_worker);
                    return;
                }

                if (type === 'move' || type === 'error') {
                    const pending = _workerPending[id];
                    if (!pending) return;
                    clearTimeout(pending.timer);
                    delete _workerPending[id];
                    if (type === 'error') {
                        console.warn('Worker error:', message);
                        pending.resolve(null); // fall back gracefully
                    } else {
                        pending.resolve(move);
                    }
                }
            };

            _worker.onerror = (e) => {
                console.warn('âš ï¸ Web Worker failed:', e.message);
                _worker = null; _workerReady = false;
                // Reject all pending
                for (const id in _workerPending) {
                    const p = _workerPending[id];
                    clearTimeout(p.timer);
                    p.resolve(null);
                }
                _workerPending = {};
                resolve(null); // signal worker unavailable
            };

        } catch(e) {
            console.warn('âš ï¸ Workers not supported:', e.message);
            _worker = null;
            resolve(null);
        }
    });
}

// Ask the worker for a move â€” returns a Promise<uci_string|null>
function workerGetMove(fen, elo, timeoutMs) {
    return new Promise(async (resolve) => {
        const worker = await getWorker();
        if (!worker) { resolve(null); return; } // worker unavailable â€” caller will fallback

        const id = ++_workerMsgId;
        const timer = setTimeout(() => {
            // Worker took too long â€” resolve null so caller falls back
            delete _workerPending[id];
            console.warn(`â± Worker timeout for elo=${elo}`);
            resolve(null);
        }, (timeoutMs || 3000) + 50); // tight timeout

        _workerPending[id] = { resolve, timer };
        worker.postMessage({ type: 'move', fen, elo, id });
    });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  OPENING BOOK
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function tryBook(game,elo){
    // Book chance: lower elo bots follow book less consistently
    const chance=elo<600?0.15:elo<800?0.4:elo<1000?0.65:elo<1400?0.85:1.0;
    if(Math.random()>chance)return null;
    try{
        if(typeof lookupBook==='undefined')return null;
        const fp=game.fen().split(' ');
        const fullMove=parseInt(fp[5]||1);
        // Stop book after move 10 â€” let engine calculate from there
        if(fullMove>10)return null;
        // lookupBook already checks for tactics internally and returns null if found
        const bm=lookupBook(game);
        if(!bm)return null;
        // Validate the move is legal
        const r=game.move({from:bm.slice(0,2),to:bm.slice(2,4),promotion:bm[4]||'q'});
        if(r){game.undo();return bm;}
    }catch(e){}
    return null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CHESSBOT CLASS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class ChessBot{
    constructor(botNameOrId,botColor,stockfish,opts={}){
        if(!Chess)throw new Error('Chess library not loaded');
        const bot=typeof botNameOrId==='number'
            ?BOTS.find(b=>b.id===botNameOrId)
            :BOTS.find(b=>b.name.toLowerCase()===String(botNameOrId).toLowerCase());
        if(!bot)throw new Error(`Bot not found: "${botNameOrId}"`);
        if(bot.locked&&!opts.ignoreLocked)throw new Error(`"${bot.name}" is locked`);
        this.bot=bot; this.name=bot.name; this.elo=bot.elo;
        this.color=botColor==='w'?'w':'b';
        this.isEngine=(bot.category==='Engine');
        this.profile=typeof _skillProfile!=='undefined'?_skillProfile(bot.elo):{depth:3,pool:1,blunder_rate:0.05,noise:0,mate_depth:1,opts:{}};
        // Pre-load Stockfish in background (doesn't block)
        loadStockfish().then(sf=>{ if(sf) console.log(`âœ… SF ready for ${this.name}`); });
        console.log(`â™Ÿ ChessBot: ${this.name} (${this.elo})`);
    }

    async getMove(fen){
        if(!fen)return null;
        let game;
        try{game=new Chess();if(!game.load(fen))return null;}catch(e){return null;}
        if(game.in_checkmate()||game.in_stalemate()||game.in_draw()||game.insufficient_material())return null;
        const legal=game.moves({verbose:true}); if(!legal.length)return null;

        const startTime = Date.now();
        let moveResult = null;
        let evaluation = 0;
        let moveSource = 'unknown';

        // 1. Opening book
        const book=tryBook(game,this.elo);
        if(book){
            moveResult = book;
            moveSource = 'book';
            console.log(`  ðŸ“– [${this.name}: ${book}]`);
        }

        // 2. Stockfish (only for ultra-high-rated bots 2600+ to avoid CDN slowdown)
        if(!moveResult && this.isEngine && this.elo >= 2600){
            try{
                const sfSetting = eloToSFSettings(this.elo);
                if(sfSetting){
                    const sf=await loadStockfish();
                    if(sf){
                        const move=await querySF(sf,fen,this.elo);
                        if(move){
                            const mo=game.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]||'q'});
                            if(mo){
                                game.undo();
                                moveResult = move;
                                moveSource = 'stockfish';
                                console.log(`  ⚙️ [${this.name} SF: ${mo.san}]`);
                            }
                        }
                    }
                }
            }catch(e){console.warn(`SF error for ${this.name}:`,e.message);}
        }

        // 3. Built-in engine via Web Worker (never blocks the main thread)
        if(!moveResult) {
            try {
                const timeoutMs = (this.profile && this.profile.timeMs) ? this.profile.timeMs + 20 : 100;
                const workerMove = await workerGetMove(fen, this.elo, timeoutMs);
                if (workerMove) {
                    // Validate
                    const mo = game.move({ from: workerMove.slice(0,2), to: workerMove.slice(2,4), promotion: workerMove[4]||'q' });
                    if (mo) {
                        game.undo();
                        moveResult = workerMove;
                        moveSource = 'worker';
                        console.log(`  ðŸ”§ [${this.name} worker: ${mo.san}]`);
                    }
                }
            } catch(e) {
                console.warn('Worker move failed:', e.message);
            }
        }

        // 4. Last resort: direct findBestMove on main thread (only if worker unavailable)
        if(!moveResult && typeof findBestMove!=='undefined'){
            console.warn(`  âš ï¸ [${this.name}] falling back to main-thread engine`);
            const move=findBestMove(game,this.profile);
            if(move){
                moveResult = move;
                moveSource = 'fallback';
            }
        }

        // 5. Last resort random
        if(!moveResult) {
            const pick=legal[Math.floor(Math.random()*legal.length)];
            moveResult = pick.from+pick.to+(pick.promotion||'');
            moveSource = 'random';
        }

        // Log the move (lightweight, non-blocking)
        const thinkingTime = Date.now() - startTime;
        if(moveResult) {
            logMove(this.name, moveResult, this.elo, thinkingTime);
        }

        return moveResult;
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  SERVER STATUS CHECK
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function checkLocalServer(){
    // No more chess_server.js â€” just check if Stockfish is loaded
    const sf=_sf&&_sfReady;
    return{online:sf,workers:sf?1:0,stockfish:sf?'loaded':'not loaded'};
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  UTILITIES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function listBots({category,locked}={}){
    let list=BOTS;
    if(category!==undefined)list=list.filter(b=>b.category.toLowerCase()===category.toLowerCase());
    if(locked!==undefined)list=list.filter(b=>b.locked===locked);
    console.log(`\nTotal: ${list.length} bots`);
    list.forEach(b=>console.log(`${String(b.id).padStart(3)} | ${b.name.padEnd(35)} | ${String(b.elo).padEnd(5)} | ${b.category.padEnd(10)} | ${b.locked?'ðŸ”’':'âœ…'}`));
}
function getBotById(id){return BOTS.find(b=>b.id===id)??null;}
function getBotByName(name){return BOTS.find(b=>b.name.toLowerCase()===name.toLowerCase())??null;}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  EXPORTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
if(typeof module!=='undefined'&&module.exports!==undefined){
    module.exports={ChessBot,BOTS,listBots,getBotById,getBotByName,checkLocalServer,loadStockfish};
}
if(typeof window!=='undefined'){
    window.ChessBot=ChessBot;
    window.listBots=listBots;
    window.getBotById=getBotById;
    window.getBotByName=getBotByName;
    window.checkLocalServer=checkLocalServer;
    window.loadStockfish=loadStockfish;
    window._BotBackendLoaded=true;
    console.log('âœ… bot-backend.js ready');
}
}catch(err){
    console.error('ðŸ”´ FATAL in bot-backend.js:',err.message,err.stack);
    if(typeof window!=='undefined'){window._BotBackendLoaded=false;window._BotBackendError=err.message;}
}
