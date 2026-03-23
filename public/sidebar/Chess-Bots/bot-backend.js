// =============================================================================
//  bot-backend.js  —  Royal Chess Arena
//  Load order: chess.js → bot-data.js → bot-engine.js → bot-backend.js
// =============================================================================
console.log('🔄 bot-backend.js: Loading...');
try {

let Chess;
if(typeof window!=='undefined'&&window.Chess) Chess=window.Chess;
else if(typeof require!=='undefined'){try{Chess=require('chess.js').Chess;}catch(e){}}
if(!Chess) console.error('❌ Chess.js not found');

// ═══════════════════════════════════════════════════════════════════════════
//  STOCKFISH LOADER  (loads once, shared across all bots)
// ═══════════════════════════════════════════════════════════════════════════
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
        ];

        const tryNext=(i)=>{
            if(i>=srcs.length){
                console.warn('⚠️ Stockfish.js not found. Download stockfish.js to your Chess-Bots folder for best play.');
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
                            console.log(`✅ Stockfish ready (${srcs[i]})`);
                            _sfCBs.forEach(cb=>cb(sf));_sfCBs=[];
                        }
                    };
                    if(typeof sf.addEventListener==='function') sf.addEventListener('message',onMsg);
                    else sf.onmessage=onMsg;
                    sf.postMessage('uci');
                    sf.postMessage('setoption name Hash value 64');
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

// ═══════════════════════════════════════════════════════════════════════════
//  STOCKFISH QUERY
// ═══════════════════════════════════════════════════════════════════════════
function eloToSFSettings(elo){
    if(elo<1320){
        const skill=Math.max(0,Math.min(20,Math.round((elo-400)/55)));
        const mt=elo<600?50:elo<800?100:elo<1000?200:350;
        return{mode:'skill',skillLevel:skill,movetime:mt};
    }
    const mt=elo<1600?500:elo<2000?800:elo<2400?1200:1500;
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
        timer=setTimeout(()=>finish(null),s.movetime+3000);
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

// ═══════════════════════════════════════════════════════════════════════════
//  OPENING BOOK
// ═══════════════════════════════════════════════════════════════════════════
function tryBook(game,elo){
    // Book chance: lower elo bots follow book less consistently
    const chance=elo<600?0.15:elo<800?0.4:elo<1000?0.65:elo<1400?0.85:1.0;
    if(Math.random()>chance)return null;
    try{
        if(typeof lookupBook==='undefined')return null;
        const fp=game.fen().split(' ');
        const fullMove=parseInt(fp[5]||1);
        // Stop book after move 10 — let engine calculate from there
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

// ═══════════════════════════════════════════════════════════════════════════
//  CHESSBOT CLASS
// ═══════════════════════════════════════════════════════════════════════════
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
        loadStockfish().then(sf=>{ if(sf) console.log(`✅ SF ready for ${this.name}`); });
        console.log(`♟ ChessBot: ${this.name} (${this.elo})`);
    }

    async getMove(fen){
        if(!fen)return null;
        let game;
        try{game=new Chess();if(!game.load(fen))return null;}catch(e){return null;}
        if(game.in_checkmate()||game.in_stalemate()||game.in_draw()||game.insufficient_material())return null;
        const legal=game.moves({verbose:true}); if(!legal.length)return null;

        // 1. Opening book
        const book=tryBook(game,this.elo);
        if(book){console.log(`  📖 [${this.name}: ${book}]`);return book;}

        // 2. Stockfish (for Engine bots or when available)
        if(this.isEngine||this.elo>=1200){
            try{
                const sf=await loadStockfish();
                if(sf){
                    const move=await querySF(sf,fen,this.elo);
                    if(move){
                        const mo=game.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]||'q'});
                        if(mo){game.undo();console.log(`  ⚙️ [${this.name} SF: ${mo.san}]`);return move;}
                    }
                }
            }catch(e){console.warn(`SF error for ${this.name}:`,e.message);}
        }

        // 3. Built-in engine (for weak bots or SF fallback)
        if(typeof findBestMove!=='undefined'){
            const move=findBestMove(game,this.profile);
            if(move)return move;
        }

        // 4. Last resort random
        const pick=legal[Math.floor(Math.random()*legal.length)];
        return pick.from+pick.to+(pick.promotion||'');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SERVER STATUS CHECK
// ═══════════════════════════════════════════════════════════════════════════
async function checkLocalServer(){
    // No more chess_server.js — just check if Stockfish is loaded
    const sf=_sf&&_sfReady;
    return{online:sf,workers:sf?1:0,stockfish:sf?'loaded':'not loaded'};
}

// ═══════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
function listBots({category,locked}={}){
    let list=BOTS;
    if(category!==undefined)list=list.filter(b=>b.category.toLowerCase()===category.toLowerCase());
    if(locked!==undefined)list=list.filter(b=>b.locked===locked);
    console.log(`\nTotal: ${list.length} bots`);
    list.forEach(b=>console.log(`${String(b.id).padStart(3)} | ${b.name.padEnd(35)} | ${String(b.elo).padEnd(5)} | ${b.category.padEnd(10)} | ${b.locked?'🔒':'✅'}`));
}
function getBotById(id){return BOTS.find(b=>b.id===id)??null;}
function getBotByName(name){return BOTS.find(b=>b.name.toLowerCase()===name.toLowerCase())??null;}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
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
    console.log('✅ bot-backend.js ready');
}
}catch(err){
    console.error('🔴 FATAL in bot-backend.js:',err.message,err.stack);
    if(typeof window!=='undefined'){window._BotBackendLoaded=false;window._BotBackendError=err.message;}
}