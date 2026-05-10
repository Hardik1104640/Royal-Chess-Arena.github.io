// bot.js — Royal Chess Arena  •  Bot selection + game interface
// Requires (in load order): chess.js → bot-data.js → bot-engine.js → bot-backend.js

document.addEventListener('DOMContentLoaded', () => {

const REGULAR_STYLES = [
    'Aggressive attacker','Solid defender','Tactical genius','Positional master',
    'Endgame specialist','Opening expert','Blitz specialist','Strategic thinker',
    'Dynamic play','Counter-attacking','Pressure builder','Patient grinder',
    'Quick developer','Fighting spirit','Balanced approach',
];

const botStyle = (b, idx) => {
    if (b.category === 'Chess GM')   return 'Chess Grandmaster';
    if (b.category === 'Engine')     return b.style || 'Chess engine';
    return REGULAR_STYLES[idx % REGULAR_STYLES.length];
};

const botsData = { chessFamous:[], adaptive:[], beginner:[], intermediate:[], advanced:[], engines:[] };

const buildBotsData = () => {
    botsData.chessFamous  = [];
    botsData.adaptive     = [];
    botsData.beginner     = [];
    botsData.intermediate = [];
    botsData.advanced     = [];
    botsData.engines      = [];

    if (typeof BOTS === 'undefined') {
        console.error('❌ BOTS global not found — bot-data.js must load before bot.js');
        return;
    }

    let regularIdx = 0;
    BOTS.forEach(b => {
        const uiBot = {
            id:      b.id,
            name:    b.name,
            rating:  b.elo,
            locked:  b.locked,
            crowns:  0,
            style:   botStyle(b, regularIdx),
        };

        switch (b.category) {
            case 'Chess GM':
                uiBot.isFamous  = true;
                uiBot.isChessGM = true;
                botsData.chessFamous.push(uiBot);
                break;
            case 'Engine':
                uiBot.isEngine = true;
                if (b.name === 'Royal Chess Arena Engine') uiBot.isCustomizable = true;
                const engineCodes = {
                    'Stockfish 18':'S18','Stockfish 17':'S17','Stockfish 16':'S16',
                    'Komodo Dragon 3':'KD3','Leela Chess Zero':'LC0','AlphaZero Style':'AZ',
                    'Houdini 6':'H6','Dragon 3.2':'D32','Ethereal 14':'E14','Berserk 12':'B12',
                    'Koivisto 9':'K9','RubiChess 3':'RC3','Torch 2':'T2','Caissa 1.15':'C15',
                    'Royal Chess Arena Engine':'RCA',
                };
                uiBot.code = engineCodes[b.name] || b.name.slice(0,3);
                botsData.engines.push(uiBot);
                break;
            case 'Regular':
            default:
                if (b.elo >= 1800) {
                    botsData.advanced.push(uiBot);
                } else if (b.elo >= 1000) {
                    botsData.intermediate.push(uiBot);
                } else if (b.elo >= 400) {
                    botsData.adaptive.push(uiBot);   // 400-999
                } else {
                    botsData.beginner.push(uiBot);   // 100-399
                }
                regularIdx++;
                break;
        }
    });
    console.log(`✅ botsData built from BOTS: ${Object.values(botsData).flat().length} bots`);
};

buildBotsData();

const updateFilterCounts = () => {
    const allBots = Object.values(botsData).flat();
    const counts = {
        all: allBots.length,
        beginner: allBots.filter(b => b.rating < 1000).length,
        intermediate: allBots.filter(b => b.rating >= 1000 && b.rating < 1800).length,
        advanced: allBots.filter(b => b.rating >= 1800 && b.rating < 2500).length,
        master: allBots.filter(b => b.rating >= 2500).length,
    };
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const filter = btn.dataset.filter;
        const countSpan = btn.querySelector('.filter-count');
        if (countSpan) countSpan.textContent = `(${counts[filter]})`;
    });
};

const updatePageSubtitle = (filterLevel, searchTerm, searchRating) => {
    const ps = document.querySelector('.page-subtitle');
    if (!ps) return;
    let allBots = Object.values(botsData).flat();
    if (filterLevel !== 'all') {
        if (filterLevel === 'beginner') allBots = allBots.filter(b => b.rating < 1000);
        if (filterLevel === 'intermediate') allBots = allBots.filter(b => b.rating >= 1000 && b.rating < 1800);
        if (filterLevel === 'advanced') allBots = allBots.filter(b => b.rating >= 1800 && b.rating < 2500);
        if (filterLevel === 'master') allBots = allBots.filter(b => b.rating >= 2500);
    }
    if (searchTerm) allBots = allBots.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (searchRating) { const t = parseInt(searchRating); if (!isNaN(t)) allBots = allBots.filter(b => Math.abs(b.rating - t) <= 100); }
    let subtitle = `Found <strong>${allBots.length}</strong> bot${allBots.length !== 1 ? 's' : ''}`;
    if (searchTerm) subtitle += ` matching "${searchTerm}"`;
    if (searchRating) subtitle += ` with rating ~${searchRating}`;
    if (filterLevel !== 'all') subtitle += ` (${filterLevel})`;
    ps.innerHTML = subtitle;
};

// ── DATABASE HELPERS ──────────────────────────────────────────────────────────
const getAllBotsDatabase = () => Object.values(botsData).flat().map(b => ({
    id:b.id, name:b.name, rating:b.rating,
    category: b.isChessGM?'Chess GM':b.isEngine?'Engine':'Regular',
    locked:b.locked, crowns:b.crowns,
}));
const logAllBotsDatabase = () => {
    const all = getAllBotsDatabase();
    console.log('\n'+'='.repeat(80)+'\n🤖 ROYAL CHESS ARENA - COMPLETE BOT DATABASE\n'+'='.repeat(80));
    all.forEach((b,i) => console.log(`${String(i+1).padEnd(3)} | ${b.name.padEnd(40)} | Elo:${String(b.rating).padEnd(5)} | ${b.category.padEnd(12)} | ${b.locked?'🔒 Premium':'✅ Free'}`));
    console.log(`\nFree: ${all.filter(b=>!b.locked).length} | Premium: ${all.filter(b=>b.locked).length}\n`+'='.repeat(80));
};
const exportBotsAsJSON = () => JSON.stringify(getAllBotsDatabase(), null, 2);
const exportBotsAsCSV  = () => {
    let csv = 'ID,Name,Rating,Category,Locked,Crowns\n';
    getAllBotsDatabase().forEach(b => { csv += `${b.id},"${b.name}",${b.rating},${b.category},${b.locked},${b.crowns}\n`; });
    return csv;
};

// ── PROGRESS ──────────────────────────────────────────────────────────────────
const loadBotProgress = () => {
    try {
        const p = JSON.parse(localStorage.getItem('botProgress') || '{}');
        Object.values(botsData).flat().forEach(b => { if (p[b.id] !== undefined) b.crowns = p[b.id]; });
    } catch(e) {}
};
const saveBotProgress = () => {
    try {
        const p = {};
        Object.values(botsData).flat().forEach(b => { p[b.id] = b.crowns; });
        localStorage.setItem('botProgress', JSON.stringify(p));
        updateStatistics();
    } catch(e) {}
};
const updateStatistics = () => {
    const all      = Object.values(botsData).flat();
    const total    = all.length;
    const unlocked = all.filter(b => !b.locked).length;
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('total-bots', total);
    set('unlocked-bots', unlocked);
    set('premium-bots', total - unlocked);
    set('completed-bots', all.filter(b=>b.crowns===3).length);
    const ps = document.querySelector('.page-subtitle');
    if (ps) ps.textContent = `Choose from ${total} bot personalities (${unlocked} available, ${total-unlocked} premium)`;
};

// ── BOT CARD ──────────────────────────────────────────────────────────────────
const createBotCard = (bot) => {
    const initial    = bot.code || bot.name.charAt(0).toUpperCase();
    const crownsHTML = [1,2,3].map(i => `<i class="fas fa-crown crown ${bot.crowns>=i?'earned':''}"></i>`).join('');
    let badge = '';
    if      (bot.isChessGM) badge = '<div class="famous-badge gm-badge"><i class="fas fa-chess-king"></i> GM</div>';
    else if (bot.isEngine)  badge = '<div class="engine-badge"><i class="fas fa-microchip"></i> Engine</div>';
    const btnText = bot.locked ? 'Premium Only' : bot.isCustomizable ? 'Customize & Play' : 'Play';
    return `
        <div class="bot-card ${bot.locked?'locked':''} ${bot.isFamous?'famous-bot':''} ${bot.isEngine?'engine-bot':''} ${bot.isChessGM?'chess-gm':''}"
             data-bot-id="${bot.id}" data-bot-rating="${bot.rating}" data-bot-name="${bot.name.toLowerCase()}">
            <div class="bot-avatar ${bot.isEngine?'engine-avatar':''}">${initial}</div>
            ${badge}
            <h3 class="bot-name">${bot.name}</h3>
            <p class="bot-rating">Rating: <span>${bot.rating}</span></p>
            <p class="bot-description">${bot.style}</p>
            <div class="bot-crowns">${crownsHTML}</div>
            <button class="play-button" ${bot.locked?'disabled':''}>
                <i class="fas ${bot.locked?'fa-lock':'fa-play'}"></i> ${btnText}
            </button>
        </div>`;
};

// ── SHOW MORE / LESS STATE ─────────────────────────────────────────────────────
// Per-category expanded state — toggling one section never affects others
const expandedState = {};
const ITEMS_PER_PAGE = 15;

// ── RENDER ────────────────────────────────────────────────────────────────────
const renderBots = (filterLevel='all', searchTerm='', searchRating='') => {
    const map = {
        'chess-famous-bots':'chessFamous',
        'engine-bots':'engines',
        'adaptive-bots':'adaptive',
        'beginner-bots':'beginner',
        'intermediate-bots':'intermediate',
        'advanced-bots':'advanced',
    };

    Object.keys(map).forEach(gridId => {
        const category = map[gridId];
        const grid = document.getElementById(gridId);
        if (!grid) return;

        let bots = botsData[category];

        // Apply filters
        if (filterLevel !== 'all') bots = bots.filter(b => {
            if (filterLevel==='beginner')     return b.rating < 1000;
            if (filterLevel==='intermediate') return b.rating >= 1000 && b.rating < 1800;
            if (filterLevel==='advanced')     return b.rating >= 1800 && b.rating < 2500;
            if (filterLevel==='master')       return b.rating >= 2500;
            return true;
        });
        if (searchTerm)   bots = bots.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (searchRating) { const t=parseInt(searchRating); if(!isNaN(t)) bots=bots.filter(b=>Math.abs(b.rating-t)<=100); }

        // ── Adaptive bots: 4 in right column, rest below with show more ────────
        if (gridId === 'adaptive-bots') {
            const remainingGrid      = document.getElementById('remaining-adaptive-bots');
            const remainingContainer = document.getElementById('remaining-bots-container');
            const rightColBots  = bots.slice(0, 4);
            const remainingBots = bots.slice(4);

            grid.innerHTML = rightColBots.length
                ? rightColBots.map(createBotCard).join('')
                : '<p class="no-bots-message">No adaptive bots</p>';

            if (remainingBots.length > 0 && remainingGrid && remainingContainer) {
                const isExpanded    = !!expandedState['adaptive-remaining'];
                const limit         = isExpanded ? remainingBots.length : ITEMS_PER_PAGE;
                const hasMore       = remainingBots.length > ITEMS_PER_PAGE;

                remainingGrid.innerHTML = remainingBots.slice(0, limit).map(createBotCard).join('');
                remainingContainer.style.display = 'block';

                // Show More / Show Less button
                let smc = remainingContainer.querySelector('.show-more-container');
                if (hasMore) {
                    if (!smc) { smc = document.createElement('div'); smc.className = 'show-more-container'; remainingContainer.appendChild(smc); }
                    const hidden = remainingBots.length - ITEMS_PER_PAGE;
                    smc.innerHTML = isExpanded
                        ? `<button class="show-more-btn" data-category="adaptive-remaining" data-expanded="true"><i class="fas fa-chevron-up"></i> Show Less</button>`
                        : `<button class="show-more-btn" data-category="adaptive-remaining" data-expanded="false"><i class="fas fa-chevron-down"></i> Show ${hidden} More Bots</button>`;
                } else if (smc) { smc.remove(); }
            } else if (remainingContainer) {
                remainingContainer.style.display = 'none';
            }

            const countEl = document.getElementById('adaptive-count');
            if (countEl) countEl.textContent = `(${bots.length})`;
            return;
        }

        // ── Normal categories ─────────────────────────────────────────────────
        const isExpanded = !!expandedState[category];
        const limit      = isExpanded ? bots.length : ITEMS_PER_PAGE;
        const hasMore    = bots.length > ITEMS_PER_PAGE;

        grid.innerHTML = bots.length
            ? bots.slice(0, limit).map(createBotCard).join('')
            : '<p class="no-bots-message">No bots match your filters</p>';

        // Show More / Show Less button
        let smc = grid.parentElement.querySelector('.show-more-container');
        if (hasMore) {
            if (!smc) { smc = document.createElement('div'); smc.className = 'show-more-container'; grid.parentElement.appendChild(smc); }
            const hidden = bots.length - ITEMS_PER_PAGE;
            smc.innerHTML = isExpanded
                ? `<button class="show-more-btn" data-category="${category}" data-expanded="true"><i class="fas fa-chevron-up"></i> Show Less</button>`
                : `<button class="show-more-btn" data-category="${category}" data-expanded="false"><i class="fas fa-chevron-down"></i> Show ${hidden} More Bots</button>`;
        } else if (smc) { smc.remove(); }

        // Update count badge
        const countEl = document.getElementById(gridId.replace('-bots','-count'));
        if (countEl) countEl.textContent = (searchTerm||searchRating||filterLevel!=='all')
            ? `(${bots.length}/${botsData[category].length})`
            : `(${botsData[category].length})`;
    });

    attachPlayButtonListeners();
    attachShowMoreListeners();
    updateStatistics();
    updateFilterCounts();
    updatePageSubtitle(filterLevel, searchTerm, searchRating);
};

// ── SHOW MORE / LESS LISTENERS ────────────────────────────────────────────────
const attachShowMoreListeners = () => {
    document.querySelectorAll('.show-more-btn[data-category]').forEach(btn => {
        // Clone to remove any old listener
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        fresh.addEventListener('click', (e) => {
            e.stopPropagation();
            const cat     = fresh.dataset.category;
            const wasOpen = fresh.dataset.expanded === 'true';
            expandedState[cat] = !wasOpen;
            renderBots(
                document.querySelector('.filter-btn.active')?.dataset.filter || 'all',
                document.getElementById('bot-search')?.value  || '',
                document.getElementById('rating-search')?.value || ''
            );
            // Scroll to top of section when collapsing
            if (!expandedState[cat]) {
                const scrollTargets = {
                    'chessFamous':         'chess-famous-bots',
                    'engines':             'engine-bots',
                    'beginner':            'beginner-bots',
                    'intermediate':        'intermediate-bots',
                    'advanced':            'advanced-bots',
                    'adaptive-remaining':  'remaining-bots-container',
                };
                const targetId = scrollTargets[cat];
                if (targetId) {
                    const el = document.getElementById(targetId);
                    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
                }
            }
        });
    });
};

const attachPlayButtonListeners = () => {
    document.querySelectorAll('.bot-card:not(.locked) .play-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card  = btn.closest('.bot-card');
            const found = Object.values(botsData).flat().find(b => b.id === parseInt(card.dataset.botId));
            if (found) openModal(found);
        });
    });
    const rcaBtn = document.querySelector('.play-button[data-bot="rca-engine"]');
    if (rcaBtn) {
        rcaBtn.addEventListener('click', () => {
            const strength = parseInt(document.getElementById('rca-engine-strength')?.value || 1500);
            openModal({ name:'Royal Chess Arena Engine', rating:strength, code:'RCA', style:'Custom adjustable strength engine', crowns:0, isEngine:true, isRCA:true });
        });
    }
};

// ── STOCKFISH LOADER ──────────────────────────────────────────────────────────
const loadStockfishAsync = (botName) => {
    if (typeof Stockfish !== 'undefined') return;  // Already loaded
    
    const cdns = [
        './stockfish.js',
        'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js',
        'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js',
    ];
    
    let tried = 0;
    const tryNext = () => {
        if (tried >= cdns.length) {
            console.warn(`⚠️ Stockfish.js not found. Using fallback inline AI for "${botName}" (will work but slower)`);
            return;
        }
        const s = document.createElement('script');
        s.src = cdns[tried];
        s.onload = () => console.log(`✅ Stockfish loaded from: ${cdns[tried]}`);
        s.onerror = () => { tried++; tryNext(); };
        s.timeout = 5000;  // 5 second timeout per CDN
        document.head.appendChild(s);
    };
    tryNext();
};

// ── CHESSBOT FACTORY ──────────────────────────────────────────────────────────
const createBotInstance = (bot, botColor) => {
    if (typeof ChessBot !== 'undefined' && bot.id && typeof bot.id === 'number' && bot.id !== 9999) {
        try {
            const instance = new ChessBot(bot.id, botColor, null, { ignoreLocked: true });
            console.log(`✅ ChessBot id=${bot.id} "${bot.name}" (${bot.rating}) plays ${botColor}`);
            return instance;
        } catch(err) {
            console.warn(`ChessBot id=${bot.id} failed: ${err.message}`);
        }
    }
    // Fallback: inline skill AI using bot-engine.js globals
    const elo     = bot.rating || 1500;
    const profile = typeof _skillProfile !== 'undefined' ? _skillProfile(elo) : { depth:3, blunder_rate:0.05, noise:0, pool:1, mate_depth:1 };
    console.log(`✅ Inline skill AI: "${bot.name}" (${elo}) depth=${profile.depth}`);
    return {
        name: bot.name, elo, profile, color: botColor,
        getMove: async function(fen) {
            if (typeof Chess === 'undefined') return null;
            const g = new Chess();
            if (!g.load(fen)) return null;
            if (g.in_checkmate() || g.in_stalemate() || g.in_draw()) return null;
            const legal = g.moves({ verbose: true });
            if (!legal.length) return null;

            // Use Web Worker if available — never block the main thread
            if (typeof workerGetMove !== 'undefined') {
                try {
                    const timeoutMs = (profile.timeMs || 600) + 500;
                    const wm = await workerGetMove(fen, elo, timeoutMs);
                    if (wm) {
                        const mo = g.move({ from: wm.slice(0,2), to: wm.slice(2,4), promotion: wm[4]||'q' });
                        if (mo) { g.undo(); return wm; }
                    }
                } catch(e) {}
            }

            // Fallback: use findBestMove if available
            if (typeof findBestMove !== 'undefined') {
                const move = findBestMove(g, profile);
                if (move) return move;
            }

            // Last resort: random
            const pick = legal[Math.floor(Math.random() * legal.length)];
            return pick.from + pick.to + (pick.promotion || '');
        },
    };
};

// ── PIECE IMAGE HELPER ────────────────────────────────────────────────────────
const pieceImg = (color, type, size = '80%') => {
    const img = document.createElement('img');
    img.src   = `../../../Images/Chesspieces/${color}${type.toUpperCase()}.png`;
    img.style.cssText = `width:${size};height:${size};object-fit:contain;pointer-events:none;`;
    img.alt   = `${color}${type}`;
    img.onerror = () => {
        const map = { wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙', bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟' };
        const sp  = document.createElement('span');
        sp.textContent = map[color+type.toUpperCase()] || '?';
        sp.style.cssText = 'font-size:1.5em;line-height:1;';
        img.replaceWith(sp);
    };
    return img;
};

const sanNode = (san, color) => {
    const pieceLetters = { K:'k', Q:'q', R:'r', B:'b', N:'n' };
    const span = document.createElement('span');
    span.style.cssText = 'display:inline-flex;align-items:center;gap:1px;';
    const first = san[0];
    if (pieceLetters[first]) {
        const img = pieceImg(color, pieceLetters[first], '14px');
        img.style.cssText += 'vertical-align:middle;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));';
        span.appendChild(img);
        span.appendChild(document.createTextNode(san.slice(1)));
    } else {
        span.textContent = san;
    }
    return span;
};

// ── PLAY WITH BOT ─────────────────────────────────────────────────────────────
const playWithBot = (bot, playerColor='white', timeMinutes=10, savedGameData=null) => {
    const playerColorCode = playerColor === 'white' ? 'w' : 'b';
    const botColorCode    = playerColorCode === 'w'  ? 'b' : 'w';
    const isTimed         = timeMinutes > 0;

    const botsContainer = document.querySelector('.bots-container');
    if (botsContainer) botsContainer.style.display = 'none';

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) { alert('Game container not found. Please refresh.'); return; }

    const isEngineBotFlag = bot.isEngine || bot.rating >= 3300;
    if (isEngineBotFlag) loadStockfishAsync(bot.name);
    const botInstance = createBotInstance(bot, botColorCode);

    const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    const initTime = fmtTime(timeMinutes * 60);

    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-container';
    gameContainer.style.cssText = 'padding:20px;max-width:1200px;margin:0 auto;color:var(--text);';
    gameContainer.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div>
                <h2 style="margin:0;font-size:1.25rem;">vs ${bot.name}</h2>
                <p style="margin:4px 0 0;color:var(--muted);font-size:13px;">Rating: ${bot.rating} &bull; You play: <strong>${playerColor}</strong></p>
            </div>
            <button id="game-exit-btn" style="padding:9px 18px;background:rgba(255,80,80,0.18);color:#ff6b6b;border:1px solid rgba(255,80,80,0.4);border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;"><i class="fas fa-times"></i> Exit</button>
        </div>
        <div id="game-layout" style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">
            <div style="flex:1;min-width:300px;">
                <div id="timer-opp" style="display:${isTimed?'flex':'none'};align-items:center;justify-content:space-between;background:rgba(0,0,0,0.22);border:1px solid rgba(255,255,255,0.07);border-radius:8px 8px 4px 4px;padding:10px 16px;margin-bottom:6px;">
                    <div>
                        <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.6px;">${bot.name}</div>
                        <div style="font-size:11px;color:var(--muted);margin-top:2px;">${botColorCode==='b'?'Black':'White'} &bull; ${bot.rating}</div>
                    </div>
                    <div id="opp-time" style="font-size:2.1rem;font-weight:700;font-family:monospace;color:var(--text);letter-spacing:1px;">${initTime}</div>
                </div>
                <div id="game-board" style="width:100%;aspect-ratio:1;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);box-shadow:0 8px 32px rgba(0,0,0,0.55);border-radius:${isTimed?'4px':'8px'};overflow:hidden;"></div>
                <div id="timer-you" style="display:${isTimed?'flex':'none'};align-items:center;justify-content:space-between;background:rgba(0,0,0,0.22);border:1px solid rgba(255,255,255,0.07);border-radius:4px 4px 8px 8px;padding:10px 16px;margin-top:6px;">
                    <div>
                        <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.6px;">You</div>
                        <div style="font-size:11px;color:var(--muted);margin-top:2px;">${playerColorCode==='w'?'White':'Black'}</div>
                    </div>
                    <div id="you-time" style="font-size:2.1rem;font-weight:700;font-family:monospace;color:var(--text);letter-spacing:1px;">${initTime}</div>
                </div>
            </div>
            <div style="width:260px;display:flex;flex-direction:column;gap:10px;">
                <div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px 14px;">
                    <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px;">Status</div>
                    <div id="game-status" style="font-size:13px;font-weight:600;color:var(--text);">Starting...</div>
                    <div id="engine-status" style="font-size:11px;color:var(--muted);margin-top:3px;">⏳ Connecting...</div>
                </div>
                <button id="game-resign-btn" style="padding:11px;background:rgba(255,80,80,0.18);color:#ff6b6b;border:1px solid rgba(255,80,80,0.4);border-radius:7px;cursor:pointer;font-weight:600;font-size:13px;"><i class="fas fa-flag"></i> Resign</button>
                <button id="game-save-btn" style="padding:11px;background:rgba(34,177,76,0.18);color:#22b14c;border:1px solid rgba(34,177,76,0.4);border-radius:7px;cursor:pointer;font-weight:600;font-size:13px;"><i class="fas fa-save"></i> Save Game</button>
                <div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;flex:1;min-height:180px;max-height:340px;">
                    <div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px;">Moves</div>
                    <div id="moves-display" style="overflow-y:auto;flex:1;font-family:monospace;font-size:12px;line-height:1.75;"></div>
                </div>
            </div>
        </div>`;

    mainContent.appendChild(gameContainer);

    if (typeof Chess === 'undefined') { alert('Chess library not loaded. Please refresh.'); return; }

    const game          = new Chess();
    const gameStartTime = Date.now();  // ← CRITICAL: Track game start for duration calculation
    let selectedSq      = null;
    let movesList       = savedGameData ? [...savedGameData.moves] : [];
    let whiteTime       = savedGameData ? savedGameData.whiteTime  : timeMinutes * 60;
    let blackTime       = savedGameData ? savedGameData.blackTime  : timeMinutes * 60;
    let timerInt        = null;
    let gameActive      = true;
    let botThinking     = false;  // prevents double bot moves
    let isPlayerTurn;

    if (savedGameData?.fen) { game.load(savedGameData.fen); isPlayerTurn = (game.turn() === playerColorCode); }
    else isPlayerTurn = (playerColorCode === 'w');

    const stopTimer = () => { clearInterval(timerInt); timerInt = null; };
    const isOver    = () => game.in_checkmate() || game.in_stalemate() || game.in_draw() || game.insufficient_material();

    const updateTimerDisplay = () => {
        const youSecs = playerColorCode==='w' ? whiteTime : blackTime;
        const oppSecs = playerColorCode==='w' ? blackTime : whiteTime;
        const ytEl = document.getElementById('you-time');
        const otEl = document.getElementById('opp-time');
        if (ytEl) { ytEl.textContent=fmtTime(Math.max(0,youSecs)); ytEl.style.color=youSecs<=30?'#ff4444':youSecs<=60?'#ffaa00':'var(--text)'; }
        if (otEl) { otEl.textContent=fmtTime(Math.max(0,oppSecs)); otEl.style.color=oppSecs<=30?'#ff4444':oppSecs<=60?'#ffaa00':'var(--text)'; }
    };

    const startTimer = () => {
        if (!isTimed) return;
        stopTimer();
        timerInt = setInterval(() => {
            if (!gameActive) { stopTimer(); return; }
            if (game.turn()==='w') whiteTime=Math.max(0,whiteTime-1);
            else                   blackTime=Math.max(0,blackTime-1);
            updateTimerDisplay();
            if (whiteTime<=0) endGame(playerColorCode==='w'?'Opponent':'You','Time out');
            if (blackTime<=0) endGame(playerColorCode==='b'?'Opponent':'You','Time out');
        }, 1000);
    };

    const updateMovesDisplay = () => {
        const el = document.getElementById('moves-display');
        if (!el) return;
        el.innerHTML = '';
        if (!movesList.length) { el.innerHTML='<span style="color:var(--muted)">No moves yet</span>'; return; }
        for (let i=0; i<movesList.length; i+=2) {
            const row=document.createElement('div'); row.style.cssText='display:flex;align-items:center;gap:5px;padding:1px 0;';
            const num=document.createElement('span'); num.style.cssText='color:#3a9eff;font-weight:700;min-width:24px;font-size:11px;'; num.textContent=`${Math.floor(i/2)+1}.`; row.appendChild(num);
            const wCell=document.createElement('span'); wCell.style.cssText='min-width:60px;display:inline-flex;align-items:center;'; wCell.appendChild(sanNode(movesList[i],'w')); row.appendChild(wCell);
            if (movesList[i+1]) { const bCell=document.createElement('span'); bCell.style.cssText='display:inline-flex;align-items:center;'; bCell.appendChild(sanNode(movesList[i+1],'b')); row.appendChild(bCell); }
            el.appendChild(row);
        }
        el.scrollTop = el.scrollHeight;
    };

    const renderBoard = () => {
        const boardEl = document.getElementById('game-board');
        if (!boardEl) return;
        boardEl.innerHTML = '';
        const flipped = playerColorCode === 'b';
        for (let row=0; row<8; row++) {
            for (let col=0; col<8; col++) {
                const r = flipped ? row : (7-row);
                const c = flipped ? (7-col) : col;
                const sq = String.fromCharCode(97+c)+(r+1);
                const isLight = (r+c)%2===0;
                const sqEl = document.createElement('div');
                sqEl.className = 'board-square';
                sqEl.dataset.square = sq;
                sqEl.dataset.light  = isLight ? 'true' : 'false';
                sqEl.style.cssText  = `background:${isLight?'#f0d9b5':'#b58863'};display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:background .12s;`;
                if (col===0) { const lbl=document.createElement('span'); lbl.style.cssText=`position:absolute;top:2px;left:3px;font-size:9px;font-weight:700;color:${isLight?'#b58863':'#f0d9b5'};pointer-events:none;line-height:1;`; lbl.textContent=r+1; sqEl.appendChild(lbl); }
                if (row===7) { const lbl=document.createElement('span'); lbl.style.cssText=`position:absolute;bottom:2px;right:3px;font-size:9px;font-weight:700;color:${isLight?'#b58863':'#f0d9b5'};pointer-events:none;line-height:1;`; lbl.textContent=String.fromCharCode(97+c); sqEl.appendChild(lbl); }
                const dot = document.createElement('div');
                dot.className = 'move-dot';
                dot.style.cssText = 'position:absolute;width:30%;height:30%;background:rgba(0,0,0,0.22);border-radius:50%;opacity:0;pointer-events:none;transition:opacity .1s;';
                sqEl.appendChild(dot);
                const piece = game.get(sq);
                if (piece) { const img=pieceImg(piece.color,piece.type,'80%'); img.style.cssText+='filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35));'; sqEl.appendChild(img); }
                sqEl.addEventListener('click', () => handleSquareClick(sq));
                boardEl.appendChild(sqEl);
            }
        }
    };

    const clearHighlights = () => {
        document.querySelectorAll('#game-board .board-square').forEach(s => {
            s.style.background = s.dataset.light==='true' ? '#f0d9b5' : '#b58863';
            s.style.outline = '';
            const d = s.querySelector('.move-dot');
            if (d) d.style.opacity = '0';
        });
    };

    // ── PROMOTION DIALOG ─────────────────────────────────────────────────────
    const showPromotionDialog = (from, to) => {
        const existing = document.getElementById('promo-dialog');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'promo-dialog';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';

        const box = document.createElement('div');
        box.style.cssText = 'background:#2a2a2a;border:2px solid #555;border-radius:12px;padding:24px;text-align:center;';
        box.innerHTML = '<div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:16px;">Choose promotion piece</div>';

        const pieces = [
            { type:'q', label:'Queen',  symbol: playerColorCode==='w'?'♕':'♛' },
            { type:'r', label:'Rook',   symbol: playerColorCode==='w'?'♖':'♜' },
            { type:'b', label:'Bishop', symbol: playerColorCode==='w'?'♗':'♝' },
            { type:'n', label:'Knight', symbol: playerColorCode==='w'?'♘':'♞' },
        ];
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:12px;justify-content:center;';
        pieces.forEach(p => {
            const btn = document.createElement('button');
            btn.style.cssText = 'width:64px;height:64px;font-size:2.2em;background:#333;border:2px solid #555;border-radius:8px;cursor:pointer;color:#fff;transition:all .15s;';
            btn.textContent = p.symbol;
            btn.title = p.label;
            btn.onmouseover = () => { btn.style.borderColor='#81b64c'; btn.style.background='#444'; };
            btn.onmouseout  = () => { btn.style.borderColor='#555'; btn.style.background='#333'; };
            btn.addEventListener('click', () => {
                overlay.remove();
                const move = game.move({ from, to, promotion: p.type });
                if (!move) { renderBoard(); return; }
                movesList.push(move.san);
                updateMovesDisplay(); renderBoard(); stopTimer();
                if (isOver()) { endGame('You', game.in_checkmate()?'Checkmate!':'Draw'); return; }
                isPlayerTurn = false;
                const st = document.getElementById('game-status');
                if (st) { st.textContent='Bot thinking...'; st.style.color='var(--muted)'; }
                setTimeout(requestBotMove, 250);
            });
            row.appendChild(btn);
        });
        box.appendChild(row);
        overlay.appendChild(box);
        // Click outside to cancel
        overlay.addEventListener('click', e => { if (e.target===overlay) { overlay.remove(); selectedSq=null; clearHighlights(); } });
        document.body.appendChild(overlay);
    };

    const handleSquareClick = (square) => {
        if (!gameActive || !isPlayerTurn || botThinking) return;
        const sqEl = document.querySelector(`#game-board .board-square[data-square="${square}"]`);
        if (!selectedSq) {
            const piece = game.get(square);
            if (!piece || piece.color !== playerColorCode) return;
            selectedSq = square;
            if (sqEl) { sqEl.style.background='#acd742'; sqEl.style.outline='2px solid #7db128'; }
            game.moves({ square, verbose:true }).forEach(m => {
                const t = document.querySelector(`#game-board .board-square[data-square="${m.to}"]`);
                if (!t) return;
                const d = t.querySelector('.move-dot');
                if (d) d.style.opacity = '1';
                if (game.get(m.to)) t.style.background = t.dataset.light==='true'?'#e8c84d':'#c8a83d';
            });
            return;
        }
        const from = selectedSq; selectedSq = null; clearHighlights();
        if (from === square) return;
        const target = game.get(square);
        if (target && target.color === playerColorCode) {
            selectedSq = square;
            if (sqEl) { sqEl.style.background='#acd742'; sqEl.style.outline='2px solid #7db128'; }
            game.moves({ square, verbose:true }).forEach(m => {
                const t = document.querySelector(`#game-board .board-square[data-square="${m.to}"]`);
                if (t) { const d=t.querySelector('.move-dot'); if(d) d.style.opacity='1'; }
            });
            return;
        }
        // Check if this is a pawn promotion move
        const movingPiece = game.get(from);
        const isPromotion = movingPiece && movingPiece.type === 'p' &&
            ((playerColorCode === 'w' && square[1] === '8') ||
             (playerColorCode === 'b' && square[1] === '1'));

        if (isPromotion) {
            showPromotionDialog(from, square);
            return;
        }
        const move = game.move({ from, to:square, promotion:'q' });
        if (!move) { renderBoard(); return; }
        movesList.push(move.san);
        updateMovesDisplay(); renderBoard(); stopTimer();
        if (isOver()) { endGame('You', game.in_checkmate()?'Checkmate!':'Draw'); return; }
        isPlayerTurn = false;
        const st = document.getElementById('game-status');
        if (st) { st.textContent='Bot thinking...'; st.style.color='var(--muted)'; }
        setTimeout(requestBotMove, 250);
    };

    const requestBotMove = async () => {
        if (!gameActive || botThinking) return;
        botThinking = true;
        const fenAtStart = game.fen(); // capture FEN before async wait
        try {
            const uci = await botInstance.getMove(fenAtStart);
            // After await: check game is still alive and position hasn't changed
            if (!gameActive) { botThinking = false; return; }
            if (game.fen() !== fenAtStart) { botThinking = false; return; } // position changed (shouldn't happen but safety)
            if (uci) { botThinking = false; applyBotMove(uci); return; }
        } catch(e) {
            console.error('Bot error:', e);
        }
        botThinking = false;
        if (gameActive) applyFallback();
    };

    const applyBotMove = (uci) => {
        if (!gameActive) return; // game ended while bot was thinking
        if (!uci || uci.length < 4) { applyFallback(); return; }
        try {
            const mo = game.move({ from:uci.slice(0,2), to:uci.slice(2,4), promotion:uci[4]||'q' });
            if (!mo) { applyFallback(); return; }
            console.log(`✅ ${bot.name} plays: ${mo.san}`);
            movesList.push(mo.san);
            updateMovesDisplay(); renderBoard();
            const st = document.getElementById('game-status');
            if (st) { st.textContent='Your turn'; st.style.color='var(--text)'; }
            // Update engine source label
            const es = document.getElementById('engine-status');
            if (es && typeof _localServerAvailable !== 'undefined') {
                es.textContent = _localServerAvailable ? '🖥️ Local Stockfish' : '🌐 Browser Stockfish';
            }
            if (isOver()) { endGame(game.in_checkmate()?'Opponent':'Draw', game.in_checkmate()?'Checkmate!':'Draw'); return; }
            isPlayerTurn = true; startTimer();
        } catch(e) { if (gameActive) applyFallback(); }
    };

    const applyFallback = () => {
        if (!gameActive) return; // game ended while bot was thinking
        const moves = game.moves({ verbose:true });
        if (!moves.length) { endGame('Draw','No legal moves'); return; }
        const pick = moves[Math.floor(Math.random()*moves.length)];
        const mo = game.move({ from:pick.from, to:pick.to, promotion:pick.promotion||'q' });
        if (mo) {
            movesList.push(mo.san); updateMovesDisplay(); renderBoard();
            if (isOver()) { endGame(game.in_checkmate()?'Opponent':'Draw', game.in_checkmate()?'Checkmate!':'Draw'); return; }
            isPlayerTurn = true; startTimer();
        }
    };

    const endGame = (winner, reason) => {
        gameActive = false; botThinking = false; stopTimer();
        const st = document.getElementById('game-status');
        if (st) { st.textContent=`${winner} — ${reason}`; st.style.color=winner==='You'?'#22b14c':'#ff6b6b'; }
        const rb = document.getElementById('game-resign-btn');
        if (rb) rb.disabled = true;

        // Determine game result
        const gameResult = winner === 'You' ? 'Win' : winner === 'Draw' ? 'Draw' : 'Loss';
        
        // Create detailed game data for bot games (friendly/practice)
        const gameData = {
            id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: new Date().toISOString(),
            type: 'bot', // IMPORTANT: Bot games DON'T count toward online rating/win rate
            
            // Participants
            whitePlayer: playerColor === 'w' ? 'You' : bot.name,
            blackPlayer: playerColor === 'b' ? 'You' : bot.name,
            opponent: bot.name,
            yourColor: playerColor === 'w' ? 'white' : 'black',
            
            // Result info
            result: gameResult,
            resultReason: reason,
            
            // Moves and positions for review
            moves: movesList,
            pgn: game.pgn(),
            startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            endFen: game.fen(),
            
            // Time info
            timeControl: '10+0',
            duration: Math.round((Date.now() - gameStartTime) / 1000),
            
            // Bot info
            botName: bot.name,
            botRating: bot.rating,
            botLevel: bot.category || 'Regular',
            botStyle: bot.style || 'Standard',
            
            // Metadata
            totalMoves: movesList.length,
            displayName: `${playerColor === 'w' ? 'White' : 'Black'} vs ${bot.name}`
        };
        
        // Call save function if available
        if (typeof window.saveGameToDatabase === 'function') {
            window.saveGameToDatabase(gameData);
            console.log('✅ Bot game saved:', gameData);
        }

        // Non-blocking in-page result overlay (replaces alert() which hangs browser)
        setTimeout(() => {
            if (document.getElementById('game-result-overlay')) return;
            const overlay = document.createElement('div');
            overlay.id = 'game-result-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9998;display:flex;align-items:center;justify-content:center;';
            const isWin  = winner === 'You';
            const isDraw = winner === 'Draw';
            const color  = isWin ? '#22b14c' : isDraw ? '#fbbf24' : '#ff6b6b';
            const emoji  = isWin ? '🏆' : isDraw ? '🤝' : '😞';
            const title  = isWin ? 'You Win!' : isDraw ? 'Draw' : `${winner} Wins`;
            overlay.innerHTML = `
                <div style="background:#2a2a2a;border:2px solid ${color};border-radius:14px;padding:36px 44px;text-align:center;max-width:340px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.6);">
                    <div style="font-size:3em;margin-bottom:12px;">${emoji}</div>
                    <div style="font-size:1.7em;font-weight:800;color:${color};margin-bottom:8px;">${title}</div>
                    <div style="font-size:1em;color:#aaa;margin-bottom:24px;">${reason}</div>
                    <div style="display:flex;gap:12px;justify-content:center;">
                        <button id="result-new-game" style="padding:11px 24px;background:${color};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">New Game</button>
                        <button id="result-close"    style="padding:11px 24px;background:rgba(255,255,255,0.1);color:#ccc;border:1px solid #555;border-radius:8px;font-size:14px;cursor:pointer;">Close</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            document.getElementById('result-new-game').onclick = () => {
                overlay.remove();
                gameContainer.remove();
                if (botsContainer) botsContainer.style.display = 'block';
            };
            document.getElementById('result-close').onclick = () => overlay.remove();
        }, 300);
    };

    document.getElementById('game-exit-btn').addEventListener('click', () => {
        if (!confirm('Exit the current game?')) return;
        gameActive = false; botThinking = false; stopTimer();
        // Remove result overlay if present
        document.getElementById('game-result-overlay')?.remove();
        gameContainer.remove();
        if (botsContainer) botsContainer.style.display = 'block';
    });
    document.getElementById('game-resign-btn').addEventListener('click', () => {
        if (!gameActive || !confirm('Resign this game?')) return;
        botThinking = false; endGame('Opponent','Resignation');
    });
    document.getElementById('game-save-btn').addEventListener('click', () => {
        if (!gameActive) { alert('Game already finished!'); return; }
        localStorage.setItem('savedChessGame', JSON.stringify({
            botName:bot.name, botRating:bot.rating, playerColor,
            fen:game.fen(), moves:movesList, whiteTime, blackTime,
            timestamp: new Date().toISOString(),
        }));
        alert('Game saved! Resume it next time you visit.');
    });

    console.log(`\n🤖 Game started: You vs ${bot.name} (${bot.rating}) | You play: ${playerColor}`);
    renderBoard(); updateMovesDisplay(); updateTimerDisplay();
    const st = document.getElementById('game-status');
    if (st) st.textContent = isPlayerTurn ? 'Your turn' : 'Bot thinking...';
    if (isTimed) startTimer();
    if (!isPlayerTurn) setTimeout(requestBotMove, 500);
};

// ── MODAL ─────────────────────────────────────────────────────────────────────
const modal = document.getElementById('game-setup-modal');
let selectedBot = null;
const openModal = (bot) => {
    selectedBot = bot;
    modal.classList.add('active');
    const av = document.getElementById('modal-bot-avatar');
    if (av) { av.textContent=bot.code||bot.name.charAt(0); av.className='bot-avatar-large'+(bot.isEngine?' engine-avatar':''); }
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('modal-bot-name', bot.name);
    set('modal-bot-rating', bot.rating);
    set('modal-bot-style', bot.style);
};
const closeModalFn = () => { modal.classList.remove('active'); selectedBot = null; };
document.querySelector('.close-modal')?.addEventListener('click', closeModalFn);
document.getElementById('cancel-game')?.addEventListener('click', closeModalFn);
modal?.addEventListener('click', e => { if (e.target===modal) closeModalFn(); });
document.getElementById('timed-game')?.addEventListener('change', e => {
    const tg = document.getElementById('time-control-group');
    if (tg) tg.style.display = e.target.checked ? 'block' : 'none';
});
document.querySelectorAll('[data-color]').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('[data-color]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); });
});
document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('[data-mode]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); });
});
document.getElementById('start-game')?.addEventListener('click', () => {
    if (!selectedBot) return;
    let color = document.querySelector('[data-color].active')?.dataset.color || 'white';
    if (color==='random') color = Math.random()>0.5?'white':'black';
    const timed       = document.getElementById('timed-game')?.checked || false;
    const timeMinutes = timed ? parseInt(document.getElementById('time-select')?.value||'10') : 0;
    const b = selectedBot; closeModalFn();
    playWithBot(b, color, timeMinutes);
});

// ── FILTERS & SEARCH ──────────────────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        renderBots(btn.dataset.filter, document.getElementById('bot-search')?.value||'', document.getElementById('rating-search')?.value||'');
    });
});
document.getElementById('bot-search')?.addEventListener('input', e => {
    renderBots(document.querySelector('.filter-btn.active')?.dataset.filter||'all', e.target.value, document.getElementById('rating-search')?.value||'');
});
document.getElementById('rating-search')?.addEventListener('input', e => {
    renderBots(document.querySelector('.filter-btn.active')?.dataset.filter||'all', document.getElementById('bot-search')?.value||'', e.target.value);
});
const rcaSlider = document.getElementById('rca-engine-strength');
const rcaValue  = document.getElementById('rca-engine-value');
if (rcaSlider && rcaValue) rcaSlider.addEventListener('input', e => { rcaValue.textContent = e.target.value; });

// ── RESUME SAVED GAME ─────────────────────────────────────────────────────────
const checkForResumedGame = () => {
    const saved = localStorage.getItem('savedChessGame');
    if (!saved) return;
    try {
        const gd     = JSON.parse(saved);
        const banner = document.getElementById('resume-game-banner');
        if (!banner) return;
        banner.style.display = 'flex';
        const ri = document.getElementById('resume-game-info');
        if (ri) ri.textContent = `Resume vs ${gd.botName} (${gd.botRating}) — ${gd.moves.length} moves`;
        const rb = document.getElementById('resume-game-btn');
        if (rb) rb.onclick = () => {
            const b = Object.values(botsData).flat().find(x=>x.name===gd.botName&&x.rating===gd.botRating)
                   || { name:gd.botName, rating:gd.botRating, style:'Resumed game', crowns:0 };
            banner.style.display = 'none';
            localStorage.removeItem('savedChessGame');
            playWithBot(b, gd.playerColor, Math.ceil((gd.whiteTime||600)/60), gd);
        };
    } catch(e) {}
};

// ── SERVER STATUS BADGE ──────────────────────────────────────────────────────
const createServerBadge = () => {
    const existing = document.getElementById('server-status-badge');
    if (existing) return existing;
    const badge = document.createElement('div');
    badge.id = 'server-status-badge';
    badge.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .3s;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    badge.title = 'Click to check server status';
    badge.onclick = () => checkServerStatus(true);
    document.body.appendChild(badge);
    return badge;
};

const setServerBadge = (online, workers) => {
    const badge = createServerBadge();
    if (online) {
        badge.style.background = 'rgba(34,177,76,0.2)';
        badge.style.border = '1px solid rgba(34,177,76,0.5)';
        badge.style.color = '#22b14c';
        badge.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#22b14c;display:inline-block;"></span> Local Server · ${workers} workers`;
    } else {
        badge.style.background = 'rgba(255,170,0,0.15)';
        badge.style.border = '1px solid rgba(255,170,0,0.4)';
        badge.style.color = '#ffaa00';
        badge.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#ffaa00;display:inline-block;"></span> Browser Stockfish`;
    }
};

const checkServerStatus = async (showFeedback = false) => {
    if (typeof checkLocalServer === 'undefined') return;
    const status = await checkLocalServer();
    setServerBadge(status.online, status.workers);
    if (showFeedback) {
        const badge = document.getElementById('server-status-badge');
        if (badge) {
            const orig = badge.innerHTML;
            badge.innerHTML = status.online
                ? `<span style="width:8px;height:8px;border-radius:50%;background:#22b14c;display:inline-block;"></span> ✅ Connected · ${status.workers} workers ready`
                : `<span style="width:8px;height:8px;border-radius:50%;background:#ffaa00;display:inline-block;"></span> ⚠️ Server offline — run: node chess_server.js`;
            setTimeout(() => { if (badge) badge.innerHTML = orig; }, 3000);
        }
    }
};

// Register server status callback for live updates during games
if (typeof window !== 'undefined') {
    window._onServerStatus = (online) => setServerBadge(online, online ? '?' : 0);
}

// ── INIT ──────────────────────────────────────────────────────────────────────
loadBotProgress();
renderBots();
updateFilterCounts();
updatePageSubtitle('all','','');
checkForResumedGame();
logAllBotsDatabase();
// Check server status on load (non-blocking)
setTimeout(() => checkServerStatus(), 1000);

// ── GLOBAL EXPORTS ────────────────────────────────────────────────────────────
window.scrollToRCAEngine    = () => document.querySelector('.rca-engine-card')?.scrollIntoView({ behavior:'smooth', block:'center' });
window.openCustomBotCreator = () => alert('Custom Bot Creator — PREMIUM ONLY.\nUpgrade to Premium to unlock!');
window.updateBotCrowns      = (id,c) => { const b=Object.values(botsData).flat().find(x=>x.id===id); if(b){b.crowns=Math.max(b.crowns,c);saveBotProgress();renderBots();} };
window.resetBotProgress     = () => { if(!confirm('Reset all progress?'))return; localStorage.removeItem('botProgress'); Object.values(botsData).flat().forEach(b=>b.crowns=0); renderBots(); alert('Reset!'); };
window.getAllBots            = getAllBotsDatabase;
window.exportBotsJSON       = () => { const j=exportBotsAsJSON(); navigator.clipboard?.writeText(j).then(()=>alert('Copied!')); return j; };
window.exportBotsCSV        = () => { const c=exportBotsAsCSV(); const b=new Blob([c],{type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='bots.csv'; a.click(); URL.revokeObjectURL(u); return c; };
window.logBotsDatabase      = logAllBotsDatabase;
window.findBotByRating      = r => { const res=getAllBotsDatabase().filter(b=>Math.abs(b.rating-r)<=50); console.log(res); return res; };
window.findBotByName        = n => { const res=getAllBotsDatabase().filter(b=>b.name.toLowerCase().includes(n.toLowerCase())); console.log(res); return res; };

console.log('\n✅ bot.js ready\n');

// ── DEMO CHESSBOARD ───────────────────────────────────────────────────────────
const renderDemoBoard = () => {
    const boardEl = document.getElementById('demo-board');
    if (!boardEl) return;
    if (typeof Chess === 'undefined') { console.warn('⚠️ Chess library not loaded — demo board unavailable'); return; }
    const game = new Chess();
    boardEl.innerHTML = '';
    for (let row=0; row<8; row++) {
        for (let col=0; col<8; col++) {
            const r=7-row, c=col;
            const sq=String.fromCharCode(97+c)+(r+1);
            const isLight=(r+c)%2===0;
            const sqEl=document.createElement('div');
            sqEl.className='board-square';
            sqEl.dataset.square=sq;
            sqEl.dataset.light=isLight?'true':'false';
            sqEl.style.cssText=`background:${isLight?'#f0d9b5':'#b58863'};display:flex;align-items:center;justify-content:center;cursor:default;position:relative;`;
            if (col===0){const lbl=document.createElement('span');lbl.style.cssText=`position:absolute;top:2px;left:3px;font-size:9px;font-weight:700;color:${isLight?'#b58863':'#f0d9b5'};pointer-events:none;`;lbl.textContent=r+1;sqEl.appendChild(lbl);}
            if (row===7){const lbl=document.createElement('span');lbl.style.cssText=`position:absolute;bottom:2px;right:3px;font-size:9px;font-weight:700;color:${isLight?'#b58863':'#f0d9b5'};pointer-events:none;`;lbl.textContent=String.fromCharCode(97+c);sqEl.appendChild(lbl);}
            const piece=game.get(sq);
            if (piece){const img=pieceImg(piece.color,piece.type,'80%');img.style.cssText+='filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35));';sqEl.appendChild(img);}
            boardEl.appendChild(sqEl);
        }
    }
    console.log('✅ Demo chessboard rendered');
};
if (typeof Chess !== 'undefined') { renderDemoBoard(); }
else { setTimeout(() => typeof Chess !== 'undefined' && renderDemoBoard(), 500); }

}); // end DOMContentLoaded
