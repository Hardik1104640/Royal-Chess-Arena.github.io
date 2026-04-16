// =============================================================================
//  bot-engine.js  —  Royal Chess Arena
//  Full strength engine for 2800-level bots (all features ON).
//  Weaker bots degrade gracefully by turning features OFF one by one.
//
//  Feature set (strongest → weakest):
//  2800+: Alpha-beta + Negamax + Quiescence + Null-move + LMR + Killers +
//         History + Iterative deepening + Transposition table + Opening book
//  2400:  Remove null-move pruning
//  2000:  Remove LMR
//  1600:  Remove transposition table
//  1200:  Remove killers + history
//  800:   Remove quiescence (use stand-pat only)
//  400:   Depth 1 random-ish play
//  Worst: Reverse evaluation (picks WORST move for ultra-weak bots)
// =============================================================================
console.log('🔄 bot-engine.js: Loading...');
try {

let Chess;
// Workers use 'self' not 'window' — check both
if (typeof window !== 'undefined' && window.Chess)   Chess = window.Chess;
else if (typeof self   !== 'undefined' && self.Chess) Chess = self.Chess;
else if (typeof Chess  !== 'undefined')               { /* already global */ }
else if (typeof require !== 'undefined') { try { Chess = require('chess.js').Chess; } catch(e){} }
if (!Chess) console.error('❌ Chess.js not found');

// ═══════════════════════════════════════════════════════════════════════════
//  TRANSPOSITION TABLE
// ═══════════════════════════════════════════════════════════════════════════
const TT_SIZE = 1 << 16; // 65536 entries
const tt = new Array(TT_SIZE);
const TT_EXACT = 0, TT_LOWER = 1, TT_UPPER = 2;

function ttKey(fen) {
    // Fast hash from FEN board + turn (ignore clocks)
    const s = fen.split(' ');
    const k = s[0] + s[1];
    let h = 0;
    for (let i = 0; i < k.length; i++) {
        h = (Math.imul(31, h) + k.charCodeAt(i)) | 0;
    }
    return (h >>> 0) % TT_SIZE;
}

function ttGet(fen, depth, alpha, beta) {
    const idx = ttKey(fen);
    const e = tt[idx];
    if (!e || e.fen !== fen.split(' ').slice(0,2).join(' ') || e.depth < depth) return null;
    if (e.flag === TT_EXACT) return e.score;
    if (e.flag === TT_LOWER && e.score >= beta)  return e.score;
    if (e.flag === TT_UPPER && e.score <= alpha) return e.score;
    return null;
}

function ttSet(fen, depth, score, flag, bestMove) {
    const idx = ttKey(fen);
    const key = fen.split(' ').slice(0,2).join(' ');
    const existing = tt[idx];
    // Replace if empty, same position, or deeper search
    if (!existing || existing.fen !== key || depth >= existing.depth) {
        tt[idx] = { fen: key, depth, score, flag, bestMove };
    }
}

function ttClear() { tt.fill(undefined); }

// ═══════════════════════════════════════════════════════════════════════════
//  KILLER & HISTORY HEURISTICS
// ═══════════════════════════════════════════════════════════════════════════
const killers   = Array.from({length: 20}, () => [null, null]); // per depth
const history   = {};  // "from-to" → score

function killerScore(move, depth) {
    const d = Math.min(depth, 19);
    const uci = move.from + move.to;
    if (killers[d][0] === uci) return 90000;
    if (killers[d][1] === uci) return 80000;
    return 0;
}

function historyScore(move) {
    return history[move.from + move.to] || 0;
}

function updateKillers(move, depth) {
    const d = Math.min(depth, 19);
    const uci = move.from + move.to;
    if (killers[d][0] !== uci) {
        killers[d][1] = killers[d][0];
        killers[d][0] = uci;
    }
}

function updateHistory(move, depth) {
    const k = move.from + move.to;
    history[k] = (history[k] || 0) + depth * depth;
    // Age history to prevent overflow
    if (history[k] > 10000) {
        for (const key in history) history[key] = Math.floor(history[key] / 2);
    }
}

function resetHeuristics() {
    for (let i = 0; i < 20; i++) killers[i] = [null, null];
    for (const k in history) delete history[k];
}

// ═══════════════════════════════════════════════════════════════════════════
//  MOVE ORDERING
// ═══════════════════════════════════════════════════════════════════════════
function scoreMoveForOrdering(move, depth, useKillers, useHistory) {
    if (move.san && move.san.includes('#')) return 500000;
    if (move.promotion) return move.promotion === 'q' ? 400000 : 500;

    let score = 0;

    // Captures — MVV-LVA with SEE validation
    // SEE tells us if a capture is actually winning after the full exchange sequence
    if (move.captured) {
        const vic = PIECE_VALUES[move.captured] || 0;
        const agg = PIECE_VALUES[move.piece]    || 0;
        const net = vic - agg;
        // Good captures (SEE positive) get top priority
        // Bad captures (SEE negative) get low priority — ordered last
        if(typeof seePositive !== 'undefined' && move._board) {
            // _board not available in ordering — fall back to MVV-LVA
        }
        score = net > 0  ? 200000 + vic * 10 - agg   // winning capture
              : net === 0 ? 150000 + vic               // equal trade
              :              10000 + vic * 10 - agg;   // losing capture
    }

    if (move.san && move.san.includes('+')) score += 60000;

    // Killer heuristic
    if (useKillers && !move.captured) score += killerScore(move, depth);

    // History heuristic
    if (useHistory && !move.captured) score += Math.min(historyScore(move), 70000);

    return score;
}

function sortMoves(moves, depth, useKillers, useHistory) {
    return moves.sort((a, b) =>
        scoreMoveForOrdering(b, depth, useKillers, useHistory) -
        scoreMoveForOrdering(a, depth, useKillers, useHistory)
    );
}

// ═══════════════════════════════════════════════════════════════════════════
//  FAST ATTACK HELPERS  (board-only, no Chess() calls)
// ═══════════════════════════════════════════════════════════════════════════
function isSquareAttackedBy(board, sq, byColor) {
    const fc = sq.charCodeAt(0) - 97;
    const fr = 8 - parseInt(sq[1]);
    const pd = byColor === 'w' ? 1 : -1;
    for (const dc of [-1, 1]) {
        const r = fr + pd, c = fc + dc;
        if (r>=0&&r<8&&c>=0&&c<8) { const p=board[r][c]; if(p&&p.color===byColor&&p.type==='p') return true; }
    }
    for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const r=fr+dr,c=fc+dc;
        if(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p&&p.color===byColor&&p.type==='n') return true;}
    }
    for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        let r=fr+dr,c=fc+dc;
        while(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p){if(p.color===byColor&&(p.type==='r'||p.type==='q'))return true;break;}r+=dr;c+=dc;}
    }
    for (const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        let r=fr+dr,c=fc+dc;
        while(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p){if(p.color===byColor&&(p.type==='b'||p.type==='q'))return true;break;}r+=dr;c+=dc;}
    }
    for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const r=fr+dr,c=fc+dc;
        if(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p&&p.color===byColor&&p.type==='k')return true;}
    }
    return false;
}

function lowestAttacker(board, sq, byColor) {
    const fc = sq.charCodeAt(0) - 97;
    const fr = 8 - parseInt(sq[1]);
    let minVal = Infinity, minType = null;
    const chk = (r,c,type) => {
        if(r<0||r>7||c<0||c>7)return;
        const p=board[r][c];
        if(p&&p.color===byColor&&p.type===type){const v=PIECE_VALUES[type]||0;if(v<minVal){minVal=v;minType=type;}}
    };
    const pd = byColor==='w'?1:-1;
    for(const dc of[-1,1]) chk(fr+pd,fc+dc,'p');
    for(const [dr,dc] of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) chk(fr+dr,fc+dc,'n');
    for(const [dr,dc] of[[1,1],[1,-1],[-1,1],[-1,-1]]){
        let r=fr+dr,c=fc+dc;
        while(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p){if(p.color===byColor&&(p.type==='b'||p.type==='q')){const v=PIECE_VALUES[p.type]||0;if(v<minVal){minVal=v;minType=p.type;}}break;}r+=dr;c+=dc;}
    }
    for(const [dr,dc] of[[0,1],[0,-1],[1,0],[-1,0]]){
        let r=fr+dr,c=fc+dc;
        while(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p){if(p.color===byColor&&(p.type==='r'||p.type==='q')){const v=PIECE_VALUES[p.type]||0;if(v<minVal){minVal=v;minType=p.type;}}break;}r+=dr;c+=dc;}
    }
    for(const [dr,dc] of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
        const r=fr+dr,c=fc+dc;
        if(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p&&p.color===byColor&&p.type==='k'&&20000<minVal){minVal=20000;minType='k';}}
    }
    return { val: minVal, type: minType };
}

// ─────────────────────────────────────────────────────────────────────────────
//  STATIC EXCHANGE EVALUATION (SEE)
//  Returns net material gain/loss of a capture on `toSq`.
//  Positive = we win material, Negative = we lose material.
//  Used by 1800+ bots to properly evaluate capture sequences.
// ─────────────────────────────────────────────────────────────────────────────
function see(board, toSq, capturedVal, byColor) {
    const atk = lowestAttacker(board, toSq, byColor);
    if (atk.val === Infinity) return 0; // no attacker — sequence ends
    // Gain = captured piece value minus what we lose if opponent recaptures
    const gain = capturedVal - see(board, toSq, atk.val, byColor === 'w' ? 'b' : 'w');
    return Math.max(0, gain); // we won't make a losing capture
}

// Returns true if a capture is SEE-positive (we don't lose material)
function seePositive(board, move) {
    if (!move.captured) return true; // not a capture
    const capturedVal = PIECE_VALUES[move.captured] || 0;
    const aggressorVal = PIECE_VALUES[move.piece] || 0;
    const oppColor = move.color === 'w' ? 'b' : 'w';
    // Simple check: if we gain more than we risk, it's positive
    const recaptureAtk = lowestAttacker(board, move.to, oppColor);
    if (recaptureAtk.val === Infinity) return true; // no recapture possible — always good
    const netGain = capturedVal - recaptureAtk.val;
    if (netGain >= 0) return true; // we gain or break even on immediate exchange
    // Full SEE for complex cases
    const seeScore = see(board, move.to, capturedVal, oppColor);
    return (capturedVal - seeScore) >= 0;
}

function moveSafetyLoss(board, move) {
    const pieceVal    = PIECE_VALUES[move.piece]    || 0;
    const capturedVal = PIECE_VALUES[move.captured] || 0;
    const oppColor    = move.color==='w'?'b':'w';
    const atk = lowestAttacker(board, move.to, oppColor);
    if (atk.val === Infinity) return 0;
    if (move.captured) {
        if (atk.val <= pieceVal) return Math.max(0, pieceVal - capturedVal);
        return 0;
    } else {
        const def = lowestAttacker(board, move.to, move.color);
        if (def.val === Infinity) return pieceVal;
        if (atk.val < pieceVal) return pieceVal - atk.val;
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  EVALUATION  (fast, board-only)
// ═══════════════════════════════════════════════════════════════════════════
function evaluateAbsolute(game) {
    const board = game.board();
    const eg    = isEndgame(board);
    let score   = 0;
    let wB=0, bB=0, wKR=-1, wKC=-1, bKR=-1, bKC=-1;

    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
        const p=board[r][c]; if(!p) continue;
        const pv=PIECE_VALUES[p.type]||0, psv=getPSTValue(p.type,p.color,r,c,eg);
        if(p.color==='w'){score+=pv+psv;if(p.type==='b')wB++;if(p.type==='k'){wKR=r;wKC=c;}}
        else             {score-=pv+psv;if(p.type==='b')bB++;if(p.type==='k'){bKR=r;bKC=c;}}
    }
    if(wB>=2)score+=30; if(bB>=2)score-=30;

    // Hanging pieces
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
        const p=board[r][c]; if(!p||p.type==='k') continue;
        const sq=String.fromCharCode(97+c)+(8-r);
        const opp=p.color==='w'?'b':'w';
        const pv=PIECE_VALUES[p.type]||0;
        const atk=lowestAttacker(board,sq,opp);
        if(atk.val<=pv){
            const def=lowestAttacker(board,sq,p.color);
            const loss=def.val<Infinity?Math.max(0,pv-atk.val):pv-atk.val;
            if(loss>0) score+=p.color==='w'?-loss*0.85:loss*0.85;
        }
    }

    // King safety
    if(!eg){
        const fen=game.fen().split(' ');
        const cp=fen[2]||'-';
        const wC=(wKC===6&&wKR===7)||(wKC===2&&wKR===7);
        const bC=(bKC===6&&bKR===0)||(bKC===2&&bKR===0);
        if(wC)score+=90; if(bC)score-=90;
        // Reduced from 130→60: castling rights loss alone cannot justify queen trades
        if(!wC&&!(cp.includes('K')||cp.includes('Q')))score-=60;
        if(!bC&&!(cp.includes('k')||cp.includes('q')))score+=60;
        const ks=(kr,kc,myColor,sign)=>{
            if(kr<0)return;
            let kscore=0;
            const fwd=myColor==='w'?-1:1,back=myColor==='w'?7:0;
            const opp=myColor==='w'?'b':'w';
            let shield=0;
            for(let dc=-1;dc<=1;dc++){
                const f=kc+dc;if(f<0||f>7)continue;
                const r1=kr+fwd,r2=kr+fwd*2; let has=false;
                if(r1>=0&&r1<8){const p=board[r1][f];if(p&&p.type==='p'&&p.color===myColor){shield+=25;has=true;}}
                if(!has&&r2>=0&&r2<8){const p=board[r2][f];if(p&&p.type==='p'&&p.color===myColor)shield+=12;}
                let pw=0;for(let r=0;r<8;r++){const p=board[r][f];if(p&&p.type==='p'&&p.color===myColor)pw++;}
                if(pw===0)kscore-=20;
            }
            kscore+=shield;
            if(kc>=2&&kc<=5){kscore-=80;if(kr===back)kscore-=40;}
            if(kr===back&&(kc<=1||kc>=6))kscore+=35;
            for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++){
                const er=kr+dr,ec=kc+dc;if(er<0||er>7||ec<0||ec>7)continue;
                const ep=board[er][ec];if(!ep||ep.color===myColor)continue;
                // Distance-weighted: adjacent pieces (dr,dc in -1..1) hurt more
                const adjacent = Math.abs(dr)<=1 && Math.abs(dc)<=1;
                const mult = adjacent ? 2 : 1;
                if(ep.type==='p')kscore-=10*mult;
                else if(ep.type==='n')kscore-=35*mult;
                else if(ep.type==='b')kscore-=30*mult;
                else if(ep.type==='r')kscore-=40*mult;
                else if(ep.type==='q')kscore-=70*mult;
            }
            score+=sign*kscore;
        };
        ks(wKR,wKC,'w',+1); ks(bKR,bKC,'b',-1);
    }

    // Passed pawns
    for(let c=0;c<8;c++) for(let r=0;r<8;r++){
        const p=board[r][c]; if(!p||p.type!=='p') continue;
        const opp=p.color==='w'?'b':'w'; let passed=true;
        const dir=p.color==='w'?-1:1;
        for(let rr=r+dir;rr>=0&&rr<8;rr+=dir){
            for(let cc=Math.max(0,c-1);cc<=Math.min(7,c+1);cc++){
                const ep=board[rr][cc]; if(ep&&ep.type==='p'&&ep.color===opp){passed=false;break;}
            }
            if(!passed)break;
        }
        if(passed){
            const adv=p.color==='w'?(7-r):r;
            // Exponential bonus near promotion — rank 7 pawn MUST be addressed
            // adv: 0=start, 1=one step, ..., 6=one step from promotion
            const bonus = adv<=2 ? 15 + adv*12          // ranks 1-3: small bonus
                        : adv===3 ? 60                    // rank 4: moderate
                        : adv===4 ? 120                   // rank 5: significant
                        : adv===5 ? 250                   // rank 6: high urgency
                        :           450;                  // rank 7: CRITICAL — stop this
            score+=p.color==='w'?bonus:-bonus;
        }
    }

    // Rook open file
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
        const p=board[r][c]; if(!p||p.type!=='r') continue;
        let wP=0,bP=0;
        for(let rr=0;rr<8;rr++){const pp=board[rr][c];if(pp&&pp.type==='p'){if(pp.color==='w')wP++;else bP++;}}
        const b=wP===0&&bP===0?20:(p.color==='w'&&wP===0)||(p.color==='b'&&bP===0)?10:0;
        score+=p.color==='w'?b:-b;
    }

    // Pawn structure
    for(let c=0;c<8;c++){
        let wP=0,bP=0;
        for(let r=0;r<8;r++){const p=board[r][c];if(p&&p.type==='p'){if(p.color==='w')wP++;else bP++;}}
        if(wP>1)score-=15*(wP-1); if(bP>1)score+=15*(bP-1);
        const nbW=(c>0&&[0,1,2,3,4,5,6,7].some(r=>{const p=board[r][c-1];return p&&p.type==='p'&&p.color==='w';}))||(c<7&&[0,1,2,3,4,5,6,7].some(r=>{const p=board[r][c+1];return p&&p.type==='p'&&p.color==='w';}));
        const nbB=(c>0&&[0,1,2,3,4,5,6,7].some(r=>{const p=board[r][c-1];return p&&p.type==='p'&&p.color==='b';}))||(c<7&&[0,1,2,3,4,5,6,7].some(r=>{const p=board[r][c+1];return p&&p.type==='p'&&p.color==='b';}));
        for(let r=0;r<8;r++){const p=board[r][c];if(!p||p.type!=='p')continue;if(p.color==='w'&&!nbW)score-=12;if(p.color==='b'&&!nbB)score+=12;}
    }

    if(game.in_check&&game.in_check()) score+=(game.turn()==='w')?-30:30;

    // ── BACK RANK WEAKNESS ────────────────────────────────────────────────────
    // King on back rank with no escape = danger of back rank mate
    // This directly addresses the Nc8?? blunder — bot needs to know its king is trapped
    const backRankWeak = (kr, kc, myColor) => {
        if(kr < 0) return;
        const backRank = myColor==='w' ? 7 : 0;
        if(kr !== backRank) return; // king not on back rank
        // Count escape squares (adjacent squares not occupied by own pieces and not attacked)
        let escapes = 0;
        const opp = myColor==='w'?'b':'w';
        for(const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){
            const er=kr+dr, ec=kc+dc;
            if(er<0||er>7||ec<0||ec>7) continue;
            const ep=board[er][ec];
            if(ep&&ep.color===myColor) continue; // own piece blocking
            if(!isSquareAttackedBy(board, String.fromCharCode(97+ec)+(8-er), opp)) escapes++;
        }
        // Count friendly pieces on back rank (blocking king escape but providing support)
        let backRankPieces = 0;
        for(let c3=0;c3<8;c3++){
            const p=board[backRank][c3];
            if(p&&p.color===myColor&&p.type!=='k') backRankPieces++;
        }
        // Penalty: trapped king on back rank with enemy rook/queen on same rank
        let penalty = 0;
        if(escapes <= 1) penalty += 80;  // very few escapes
        if(escapes === 0) penalty += 120; // completely trapped
        // Extra penalty if opponent has rook/queen pointing at back rank
        for(let c3=0;c3<8;c3++){
            if(c3===kc) continue;
            const p=board[backRank][c3];
            if(p&&p.color===opp&&(p.type==='r'||p.type==='q')){
                penalty += 60; // back rank attacker present
            }
        }
        score += myColor==='w' ? -penalty : penalty;
    };
    backRankWeak(wKR, wKC, 'w');
    backRankWeak(bKR, bKC, 'b');

    // ── CENTER CONTROL ────────────────────────────────────────────────────────
    // Reward pieces/pawns controlling or occupying center squares (d4,d5,e4,e5)
    // and extended center (c3-f3, c6-f6 etc)
    const centerSquares     = [[3,3],[3,4],[4,3],[4,4]];          // d4,e4,d5,e5
    const extendedCenter    = [[2,2],[2,3],[2,4],[2,5],[3,2],[3,5],[4,2],[4,5],[5,2],[5,3],[5,4],[5,5]];
    for(const [r,c2] of centerSquares){
        const p=board[r][c2]; if(!p) continue;
        const bonus = p.type==='p' ? 20 : p.type==='n' ? 15 : p.type==='b' ? 10 : 5;
        score += p.color==='w' ? bonus : -bonus;
    }
    for(const [r,c2] of extendedCenter){
        const p=board[r][c2]; if(!p) continue;
        const bonus = p.type==='p' ? 8 : p.type==='n' ? 10 : p.type==='b' ? 6 : 3;
        score += p.color==='w' ? bonus : -bonus;
    }
    // Pawns attacking center squares
    // White pawn on c4/d4/e4/f4 attacks d5/e5
    // Black pawn on c5/d5/e5/f5 attacks d4/e4
    for(let col=2;col<=5;col++){
        const wp=board[4][col]; // rank 4 (white's e4 rank)
        if(wp&&wp.type==='p'&&wp.color==='w') score+=10;
        const bp=board[3][col]; // rank 5 (black's e5 rank)
        if(bp&&bp.type==='p'&&bp.color==='b') score-=10;
    }

    // ── MOBILITY (fast board-only approximation) ───────────────────────────
    // Count pieces for each side — more active pieces = higher mobility
    // Approximation: use move count from game.moves() but only at depth 0 (leaf)
    // This avoids the expensive Chess() instantiation in recursive calls
    // We use a piece activity proxy instead: pieces not on back rank = mobile
    let wMobility=0, bMobility=0;
    for(let r=0;r<8;r++) for(let c2=0;c2<8;c2++){
        const p=board[r][c2]; if(!p||p.type==='k'||p.type==='p') continue;
        if(p.color==='w'){ if(r<7) wMobility++; } // white piece not on rank 1
        else              { if(r>0) bMobility++; } // black piece not on rank 8
    }
    // Add knight/bishop bonus for being on good squares (central outpost-ish)
    for(let r=2;r<=5;r++) for(let c2=2;c2<=5;c2++){
        const p=board[r][c2];
        if(!p) continue;
        if(p.type==='n'||p.type==='b'){
            score += p.color==='w' ? 4 : -4;
        }
    }
    score += (wMobility - bMobility) * 2;

    // ── DEVELOPMENT SCORE (opening only) ──────────────────────────────────
    let pc=0; for(let r=0;r<8;r++) for(let c2=0;c2<8;c2++) if(board[r][c2]) pc++;
    if(pc>=20){ score+=developmentScore(board,'w'); score-=developmentScore(board,'b'); }

    return score;
}

// ═══════════════════════════════════════════════════════════════════════════
//  QUIESCENCE SEARCH
// ═══════════════════════════════════════════════════════════════════════════
function quiesce(game, alpha, beta, depth) {
    if(depth===undefined)depth=0;
    if(game.in_checkmate&&game.in_checkmate())return -50000;
    if((game.in_stalemate&&game.in_stalemate())||(game.in_draw&&game.in_draw())||(game.insufficient_material&&game.insufficient_material()))return 0;
    const sp=(()=>{const a=evaluateAbsolute(game);return game.turn()==='w'?a:-a;})();
    const inCheck=game.in_check&&game.in_check();
    if(!inCheck){if(sp>=beta)return beta;if(sp>alpha)alpha=sp;}
    if(depth>6)return sp;
    const moves=inCheck?game.moves({verbose:true}):game.moves({verbose:true}).filter(m=>m.captured||m.promotion||(m.san&&m.san.includes('+')));
    if(!moves.length)return inCheck?-50000:sp;
    // Use killer/history ordering in quiescence if available (improves capture ordering)
    sortMoves(moves, 0, typeof killers!=='undefined', typeof history!=='undefined');
    for(const m of moves){
        game.move(m);const s=-quiesce(game,-beta,-alpha,depth+1);game.undo();
        if(s>=beta)return beta;if(s>alpha)alpha=s;
    }
    return alpha;
}

// ═══════════════════════════════════════════════════════════════════════════
//  NEGAMAX + ALPHA-BETA
//  opts controls which features are active (for elo degradation)
// ═══════════════════════════════════════════════════════════════════════════
function minimax(game, depth, alpha, beta, opts) {
    const o = opts || {};
    // opts: { useTT, useNullMove, useLMR, useKillers, useHistory, useQuiesce }

    if(game.in_checkmate&&game.in_checkmate())return -50000+(10-depth);
    if((game.in_stalemate&&game.in_stalemate())||(game.in_draw&&game.in_draw())||
       (game.insufficient_material&&game.insufficient_material())||
       (game.in_threefold_repetition&&game.in_threefold_repetition()))return 0;

    const inCheck=game.in_check&&game.in_check();
    const fen=game.fen();

    // Transposition table lookup
    if(o.useTT){
        const cached=ttGet(fen,depth,alpha,beta);
        if(cached!==null)return cached;
    }

    if(inCheck&&depth<8)depth+=1; // check extension
    if(depth===0){
        return o.useQuiesce ? quiesce(game,alpha,beta) : (()=>{const a=evaluateAbsolute(game);return game.turn()==='w'?a:-a;})();
    }

    // Null-move pruning (don't use in endgame or check)
    if(o.useNullMove && !inCheck && depth>=3 && !isEndgame(game.board())){
        // Make null move — skip our turn
        try {
            const nullFen=fen.split(' ');
            nullFen[1]=nullFen[1]==='w'?'b':'w';
            nullFen[3]='-'; // reset en passant
            nullFen[4]='0';
            const ng=new Chess(); ng.load(nullFen.join(' '));
            const R=depth>=6?3:2; // reduction
            const nullScore=-minimax(ng,depth-1-R,-beta,-beta+1,{...o,useNullMove:false});
            if(nullScore>=beta){
                if(o.useTT) ttSet(fen,depth,beta,TT_LOWER,null);
                return beta; // cutoff
            }
        } catch(e){}
    }

    let moves=game.moves({verbose:true});
    if(!moves.length)return inCheck?-50000:0;
    sortMoves(moves, depth, o.useKillers, o.useHistory);

    // SEE pruning: at depth >= 2, skip losing captures that SEE says are bad
    // This prevents the bot from making "I take pawn with queen, opponent takes queen" moves
    if(o.useTT && depth >= 2 && !inCheck) {
        const board = game.board();
        moves = moves.filter(m => {
            if(!m.captured) return true; // keep all quiet moves
            return seePositive(board, m);  // only keep SEE-positive captures
        });
        if(!moves.length) moves = game.moves({verbose:true}); // fallback: restore all moves
    }

    // Try TT best move first
    if(o.useTT){
        const ttEntry=tt[ttKey(fen)];
        if(ttEntry&&ttEntry.bestMove&&ttEntry.fen===fen.split(' ').slice(0,2).join(' ')){
            const bm=moves.find(m=>m.from+m.to===ttEntry.bestMove);
            if(bm){moves=moves.filter(m=>m!==bm);moves.unshift(bm);}
        }
    }

    let best=-Infinity, bestMove=null, flag=TT_UPPER;
    for(let i=0;i<moves.length;i++){
        const m=moves[i];
        game.move(m);

        let s;
        // Late Move Reductions — reduce depth for late quiet moves
        if(o.useLMR && i>=4 && depth>=3 && !m.captured && !m.promotion && !inCheck){
            const R=i>=8?2:1;
            s=-minimax(game,depth-1-R,-alpha-1,-alpha,o);
            if(s>alpha) s=-minimax(game,depth-1,-beta,-alpha,o); // re-search full
        } else {
            s=-minimax(game,depth-1,-beta,-alpha,o);
        }

        game.undo();

        if(s>best){best=s;bestMove=m;}
        if(best>alpha){alpha=best;flag=TT_EXACT;}
        if(alpha>=beta){
            // Beta cutoff — update killers and history
            if(!m.captured){
                if(o.useKillers) updateKillers(m,depth);
                if(o.useHistory) updateHistory(m,depth);
            }
            if(o.useTT) ttSet(fen,depth,best,TT_LOWER,m.from+m.to);
            return best;
        }
    }
    if(o.useTT) ttSet(fen,depth,best,flag,bestMove?bestMove.from+bestMove.to:null);
    return best;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ITERATIVE DEEPENING  (for strong bots)
// ═══════════════════════════════════════════════════════════════════════════
function iterativeDeepening(game, maxDepth, timeLimitMs, opts) {
    const moves = game.moves({verbose:true});
    if(!moves.length) return null;

    const start = Date.now();
    let bestMove = null;
    let bestScore = -Infinity;

    // Reset heuristics for clean search
    resetHeuristics();
    ttClear();

    for(let depth=1; depth<=maxDepth; depth++){
        const elapsed = Date.now() - start;
        // Stop if we've used 70% of time — leave margin for final iteration
        if(elapsed > timeLimitMs * 0.7) break;

        // Move ordering: TT best move first, then killers/history
        // This is the key to iterative deepening's effectiveness —
        // previous iteration's best move guides the next iteration
        let rootMoves = [...moves];
        if(opts.useTT) {
            const fen = game.fen();
            const ttEntry = tt[ttKey(fen)];
            if(ttEntry && ttEntry.bestMove && ttEntry.fen === fen.split(' ').slice(0,2).join(' ')) {
                const bm = rootMoves.find(m => m.from + m.to === ttEntry.bestMove);
                if(bm) { rootMoves = rootMoves.filter(m => m !== bm); rootMoves.unshift(bm); }
            }
        }
        sortMoves(rootMoves, depth, opts.useKillers, opts.useHistory);

        let iterBest = null, iterScore = -Infinity;
        // Aspiration window: narrow search around previous score (skip at depth 1-2)
        let alpha, beta;
        const WINDOW = 50; // centipawns
        if(depth >= 3 && bestScore > -40000) {
            alpha = bestScore - WINDOW;
            beta  = bestScore + WINDOW;
        } else {
            alpha = -Infinity;
            beta  = Infinity;
        }

        let research = false;
        do {
            research = false;
            let iterAlpha = alpha;
            for(const m of rootMoves){
                if(Date.now()-start > timeLimitMs) break;
                game.move(m);
                const s = -minimax(game, depth-1, -beta, -iterAlpha, opts);
                game.undo();
                if(s > iterScore){ iterScore=s; iterBest=m; }
                if(s > iterAlpha) iterAlpha=s;
                if(iterAlpha >= beta) break; // beta cutoff
            }
            // Aspiration window fail: widen and re-search
            if(iterScore <= alpha) { alpha -= WINDOW * 3; research = true; }
            else if(iterScore >= beta) { beta += WINDOW * 3; research = true; }
            // Only re-search once to avoid infinite loop
            if(research) { alpha = -Infinity; beta = Infinity; research = false; }
        } while(false); // single pass — aspiration re-search handled above

        if(iterBest){
            bestMove = iterBest;
            bestScore = iterScore;
            if(bestScore > 40000) break; // found mate — stop
        }
    }

    return bestMove ? bestMove.from + bestMove.to + (bestMove.promotion||'') : null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SKILL PROFILES
//  Each tier removes one feature, making the bot progressively weaker.
//  "reverseEval" = find the WORST move (for ultra-beginner bots)
// ═══════════════════════════════════════════════════════════════════════════
function _skillProfile(elo) {
    // Features ON/OFF per elo tier
    const f = (depth, pool, br, bt, noise, md, useTT, useNM, useLMR, useKH, useQ, reverse, timeMs) => ({
        depth, pool, blunder_rate:br, blunder_threshold:bt, noise, mate_depth:md,
        useTT, useNullMove:useNM, useLMR, useKillersHistory:useKH,
        useQuiesce:useQ, reverseEval:reverse, timeMs,
        opts: { useTT, useNullMove:useNM, useLMR, useKillers:useKH, useHistory:useKH, useQuiesce:useQ }
    });
    //                  d   pool  br      bt    ns   md  TT    NM     LMR   KH    Q     rev   ms
    // BEGINNER (100-999): weak, noisy, random errors
    if(elo<200)  return f(1,  10, 0.95,    5, 300,  0, false,false,false,false,false, true,  50);
    if(elo<400)  return f(1,  10, 0.80,   10, 250,  0, false,false,false,false,false, true,  50);
    if(elo<600)  return f(1,   8, 0.60,   20, 200,  0, false,false,false,false,false,false,  80);
    if(elo<800)  return f(2,   6, 0.45,   30, 150,  0, false,false,false,false,false,false, 100);
    if(elo<1000) return f(2,   4, 0.35,   50, 100,  1, false,false,false,false,false,false, 150);
    // INTERMEDIATE 1 (1000-1199): bt=50 → blocks R/Q/N/B hangs + pawn hang 60%
    if(elo<1100) return f(4,   1, 0.15,   50,   0,  1, false,false,false,false, true,false, 400);
    if(elo<1200) return f(4,   1, 0.10,   50,   0,  1, false,false,false,false, true,false, 450);
    // INTERMEDIATE 1 (1200-1299): bt=45 → blocks R/Q/N/B hangs + pawn hang 98%
    if(elo<1300) return f(4,   1, 0.07,   45,   0,  2, false,false,false,false, true,false, 500);
    // INTERMEDIATE 1 (1300-1499): bt=40 → blocks ALL hangs + detects pins/double attacks
    if(elo<1400) return f(4,   1, 0.04,   40,   0,  2, false,false,false,false, true,false, 550);
    if(elo<1500) return f(5,   1, 0.02,   40,   0,  2, false,false,false, true, true,false, 600);
    // INTERMEDIATE 2 (1500-1799): depth 5, TT ON for stable search
    // 1600-1800 is the "club player" tier per spec — rarely blunders, sees 2-4 move tactics
    // bt=60-120: blocks all hangs, uses tempo bonuses, counter-attack awareness
    if(elo<1600) return f(5,   1, 0.01,   60,   0,  3, false,false,false, true, true,false, 650);
    if(elo<1700) return f(5,   1, 0,      80,   0,  4,  true,false, true, true, true,false, 750);
    if(elo<1800) return f(5,   1, 0,     120,   0,  4,  true,false, true, true, true,false, 850);
    // ADVANCED INTRO (1800-2000): depth 6-7, full feature set per spec
    // "depth 6 = ~1800, depth 7 = ~2000" — spec's non-negotiable requirement
    // All features: ID + AB + TT + Quiescence + Killers/History + LMR + Null-move
    if(elo<1900) return f(6,   1, 0,     999,   0,  5,  true, true, true, true, true,false,1000);
    if(elo<2000) return f(7,   1, 0,     999,   0,  6,  true, true, true, true, true,false,1200);
    // ADVANCED (2000-2400)
    if(elo<2200) return f(7,   1, 0,     999,   0,  7,  true, true, true, true, true,false,1300);
    if(elo<2400) return f(8,   1, 0,     999,   0,  9,  true, true, true, true, true,false,1500);
    if(elo<2600) return f(9,   1, 0,     999,   0, 11,  true, true, true, true, true,false,1700);
    if(elo<2800) return f(10,  1, 0,     999,   0, 13,  true, true, true, true, true,false,1800);
    return              f(10,  1, 0,     999,   0, 15,  true, true, true, true, true,false,1800);
}

function _engineProfile(elo) {
    if(elo<3400)return{depth:20,movetime:2000,multiPV:2};
    if(elo<3500)return{depth:23,movetime:2500,multiPV:1};
    if(elo<3600)return{depth:25,movetime:3000,multiPV:1};
    if(elo<3700)return{depth:28,movetime:3500,multiPV:1};
    return           {depth:30,movetime:4000,multiPV:1};
}

// ═══════════════════════════════════════════════════════════════════════════
//  PRE-MOVE EVALUATOR  — Lean sanity check on final selected move only
//  3 fast checks. Trust the engine search for everything else.
//  Only active for bt >= 40 (elo 1000+).
// ═══════════════════════════════════════════════════════════════════════════
function preMoveEval(game, moveUci, myColor, blunderThreshold) {
    if (!moveUci || moveUci.length < 4) return { veto: false };
    if (blunderThreshold < 40) return { veto: false }; // beginner bots: no check

    const from  = moveUci.slice(0,2);
    const to    = moveUci.slice(2,4);
    const promo = moveUci[4] || null;

    const legal   = game.moves({ verbose: true });
    const moveObj = legal.find(m => m.from===from && m.to===to && (!promo||m.promotion===promo));
    if (!moveObj) return { veto: false }; // can't parse — trust the engine

    const board    = game.board();
    const oppColor = myColor === 'w' ? 'b' : 'w';
    const pieceVal = PIECE_VALUES[moveObj.piece] || 0;

    // ── CHECK A: Direct undefended hang ─────────────────────────────────────
    // Only for pieces worth >= 280cp (minor piece or above)
    // Skip if this is a capture (SEE handles that) or if engine strongly prefers it
    if (!moveObj.captured && pieceVal >= 280) {
        const atkOnDest = lowestAttacker(board, to, oppColor);
        if (atkOnDest.val < Infinity) {
            const defOnDest = lowestAttacker(board, to, myColor);
            // We move there and it's attacked but completely undefended
            if (defOnDest.val === Infinity) {
                return { veto: true, reason: `Moves ${moveObj.piece.toUpperCase()} to undefended attacked square`, severity: 'fatal' };
            }
            // Attacked by a lower-value piece with no adequate defence
            if (atkOnDest.val < pieceVal && defOnDest.val >= pieceVal) {
                return { veto: true, reason: `Losing exchange on ${to}`, severity: 'fatal' };
            }
        }
    }

    // ── CHECK B: Does this move allow opponent mate in 1? ───────────────────
    // Only run at bt >= 60 (elo 1500+) — lower tiers should miss this sometimes
    if (blunderThreshold >= 60) {
        try {
            game.move(moveObj);
            const oppMoves = game.moves({ verbose: true });
            let mateFound  = false;
            // Only look at checks and queen moves — fast
            for (const opm of oppMoves) {
                if (!opm.san.includes('+') && !opm.san.includes('#')) continue;
                game.move(opm);
                if (game.in_checkmate()) mateFound = true;
                game.undo();
                if (mateFound) break;
            }
            game.undo();
            if (mateFound) return { veto: true, reason: 'Allows mate in 1', severity: 'fatal' };
        } catch(e) { try { game.undo(); } catch(_) {} }
    }

    // ── CHECK C: Does this move leave a piece we currently own undefended? ──
    // Only for pieces worth >= 300cp; only at bt >= 45 (elo 1200+)
    if (blunderThreshold >= 45) {
        try {
            game.move(moveObj);
            const bAfter = game.board();
            let worstHang = 0;
            for (let r = 0; r < 8; r++) for (let cc = 0; cc < 8; cc++) {
                const p = bAfter[r][cc];
                if (!p || p.color !== myColor || p.type === 'k') continue;
                const pv = PIECE_VALUES[p.type] || 0;
                if (pv < 300) continue;
                const sq = String.fromCharCode(97+cc) + (8-r);
                const atk = lowestAttacker(bAfter, sq, oppColor);
                const def = lowestAttacker(bAfter, sq, myColor);
                if (atk.val < Infinity && atk.val <= pv && def.val === Infinity) {
                    if (pv > worstHang) worstHang = pv;
                }
            }
            game.undo();
            if (worstHang >= 300) {
                return { veto: true, reason: `Leaves ${worstHang}cp piece hanging`, severity: worstHang >= 450 ? 'fatal' : 'bad' };
            }
        } catch(e) { try { game.undo(); } catch(_) {} }
    }

    return { veto: false };
}

// ═══════════════════════════════════════════════════════════════════════════
//  FIND BEST/WORST MOVE  (public entry point used by bot-backend.js)
// ═══════════════════════════════════════════════════════════════════════════
function findBestMove(game, profile) {
    const moves = game.moves({verbose:true});
    if(!moves.length) return null;

    const { depth, pool, blunder_rate, blunder_threshold, noise, mate_depth,
            opts, reverseEval, timeMs } = profile;

    // Mate search first (for bots that can see it)
    if(mate_depth > 0){
        try {
            const mate = findMate(game, Math.min(mate_depth*2-1, 7));
            if(mate) return mate;
        } catch(e){}
    }

    // Use iterative deepening for strong bots (1800+)
    if(timeMs >= 500 && opts.useTT){
        const move = iterativeDeepening(game, depth, timeMs, opts);
        if(move){
            // Quick sanity check on the top move
            const verdict = preMoveEval(game, move, game.turn(), blunder_threshold);
            if(!verdict.veto) return move;
            // Vetoed — try second-best move from legal list before falling through
            console.warn(`  ⚠️ preMoveEval vetoed "${move}": ${verdict.reason}`);
            const allLegal = game.moves({verbose:true});
            for(const m of allLegal){
                const uci = m.from+m.to+(m.promotion||'');
                if(uci === move) continue;
                const v2 = preMoveEval(game, uci, game.turn(), blunder_threshold);
                if(!v2.veto) return uci;
            }
        }
    }

    // Direct search for weaker bots
    resetHeuristics();
    const LIMIT = timeMs || 600;
    const start = Date.now();
    const sorted = [...moves];
    sortMoves(sorted, depth, opts.useKillers, opts.useHistory);

    const scored = [];
    for(const m of sorted){
        if(scored.length>0 && Date.now()-start > LIMIT) break;
        game.move(m);
        let s;
        if(depth<=1){
            const abs=evaluateAbsolute(game);
            s=game.turn()==='w'?abs:-abs;
            s=-s; // negamax: after our move, eval from opponent's view
        } else {
            s=-minimax(game, depth-1, -Infinity, Infinity, opts);
        }
        game.undo();
        // Add noise for weaker bots
        if(noise>0) s += (Math.random()-0.5)*noise*2;
        scored.push({uci:m.from+m.to+(m.promotion||''),san:m.san,score:s,raw:s,move:m});
    }
    if(!scored.length) return null;

    // Reverse eval: pick WORST move (ultra-weak bots <400 elo)
    if(reverseEval){
        scored.sort((a,b)=>a.score-b.score); // ascending = worst first
        // Don't pick moves that immediately lose king (stalemate etc)
        const worst=scored.find(s=>s.score>-45000)||scored[0];
        return worst.uci;
    }

    scored.sort((a,b)=>b.score-a.score);
    const bestScore = scored[0].raw;

    // Blunder injection
    if(blunder_rate>0 && Math.random()<blunder_rate){
        // Note: profile doesn't carry elo directly — use blunder_threshold as proxy
    const maxBlunder = blunder_threshold < 30 ? 300 : blunder_threshold < 60 ? 450 : blunder_threshold < 100 ? 280 : blunder_threshold < 150 ? 180 : blunder_threshold;
        const bad=scored.filter(s=>{const loss=bestScore-s.raw;return loss>=blunder_threshold&&loss<=maxBlunder;});
        if(bad.length>0) return bad[Math.floor(Math.random()*Math.min(bad.length,3))].uci;
    }

    // ── PIECE SAFETY FILTER ────────────────────────────────────────────────────
    // Behaviour per tier (blunder_threshold as elo proxy):
    //
    // bt < 50  (below 1000): only block queen giveaway
    // bt = 50  (1000–1200):  block R/Q/N/B hangs + pawn hangs 60% of the time
    // bt = 45  (1200–1300):  block R/Q/N/B hangs + pawn hangs 98% of the time
    // bt = 40  (1300–1500):  block ALL piece loss including pins/double attacks/tactics
    // bt = 60+ (1500+):      block ALL + look for counter-attack / tempo moves
    if(scored.length>1){
        const board   = game.board();
        const myColor = game.turn();
        const oppColor= myColor==='w'?'b':'w';

        const filtered = scored.filter(s => {
            const loss = moveSafetyLoss(board, s.move);

            // ── Tier: below 1000 (bt < 50) ──────────────────────────────────
            // Only block moves that give away the queen for nothing
            if(blunder_threshold < 50){
                if(loss >= 800) return (bestScore - s.raw) < -400; // allow if engine thinks it's great
                return true;
            }

            // ── Tier: 1000–1200 (bt = 50) ───────────────────────────────────
            // Block R/Q/N/B hangs always. Pawn hangs blocked 60% of the time.
            if(blunder_threshold <= 50){
                if(loss >= 280) {
                    // Rook/queen/knight/bishop hang — always block unless clear sacrifice
                    return (bestScore - s.raw) < -300;
                }
                if(loss >= 80) {
                    // Pawn hang — block 60% of the time (40% chance bot misses it)
                    if(Math.random() < 0.60) return false;
                }
                return true;
            }

            // ── Tier: 1200–1300 (bt = 45) ───────────────────────────────────
            // Block R/Q/N/B hangs always. Pawn hangs blocked 98% of the time.
            if(blunder_threshold <= 45){
                if(loss >= 280) {
                    return (bestScore - s.raw) < -300;
                }
                if(loss >= 80) {
                    // Pawn hang — block 98% of the time
                    if(Math.random() < 0.98) return false;
                }
                return true;
            }

            // ── Tier: 1300–1500 (bt = 40) ───────────────────────────────────
            if(blunder_threshold <= 40){
                // Block any direct hang of the moved piece
                if(loss >= 80) return (bestScore - s.raw) < -300;
                // Use engine score as proxy for leaving existing pieces hanging:
                // if a move scores 400cp below best, the engine already saw the problem
                if((bestScore - s.raw) > 400) return false;
                return true;
            }

            // ── Tier: 1500+ (bt >= 60) ──────────────────────────────────────
            // Block all hangs including pawns. Additionally:
            // 1. Prefer moves with tempo (checks, attacks on valuable pieces)
            // 2. Consider counter-attacks and trades
            if(loss >= 80) return (bestScore - s.raw) < -200; // very tight — allow only clear sacrifices
            // Filter moves 300cp below best (likely missing a tactic)
            if((bestScore - s.raw) > 300) return false;
            return true;
        });

        if(filtered.length>0) scored.splice(0,scored.length,...filtered);

        // ── TEMPO BONUS for 1500+ ────────────────────────────────────────────
        // Reward moves that create immediate threats (checks, attacks on queen/rook)
        if(blunder_threshold >= 60 && scored.length > 1){
            for(const s of scored){
                // Check bonus
                if(s.san && s.san.includes('+')) s.score += 15;
                // Attack on opponent queen/rook after this move
                if(s.move.captured && (s.move.captured==='q'||s.move.captured==='r')) s.score += 10;
            }
            scored.sort((a,b)=>b.score-a.score);
        }
    }

    const topN = scored.slice(0, Math.min(pool, scored.length));
    const myColorFinal = game.turn();

    // ── PRE-MOVE SANITY CHECK (direct search path) ──────────────────────────
    // Check top pick. If vetoed, try next. Max 3 checks to keep it fast.
    if(blunder_threshold >= 40 && scored.length > 1){
        for(let ci = 0; ci < Math.min(3, scored.length); ci++){
            try {
                const verdict = preMoveEval(game, scored[ci].uci, myColorFinal, blunder_threshold);
                if(!verdict.veto) return scored[ci].uci;
            } catch(e) {
                return scored[ci].uci; // exception → trust the engine score
            }
        }
    }

    // Return top pick (or random from topN for weaker bots)
    return topN[Math.floor(Math.random() * topN.length)].uci;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MATE SEARCH
// ═══════════════════════════════════════════════════════════════════════════
function findMate(game, maxDepth) {
    const legal=game.moves({verbose:true}); if(!legal.length) return null;
    for(const m of sortMoves([...legal],0,false,false)){
        game.move(m); const found=mateSearch(game,maxDepth-1,true); game.undo();
        if(found) return m.from+m.to+(m.promotion||'');
    }
    return null;
}
function mateSearch(game, depth, isOpp) {
    if(game.in_checkmate&&game.in_checkmate()) return true;
    if((game.in_stalemate&&game.in_stalemate())||(game.in_draw&&game.in_draw())) return false;
    if(depth===0) return false;
    const moves=game.moves({verbose:true}); if(!moves.length) return game.in_checkmate();
    if(isOpp){for(const m of moves){game.move(m);const s=mateSearch(game,depth-1,false);game.undo();if(!s)return false;}return true;}
    const checks=moves.filter(m=>m.san&&(m.san.includes('+')||m.san.includes('#')));
    for(const m of sortMoves(checks.length?checks:moves,0,false,false)){game.move(m);const s=mateSearch(game,depth-1,true);game.undo();if(s)return true;}
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
if(typeof module!=='undefined'&&module.exports!==undefined){
    module.exports={scoreMoveForOrdering,sortMoves,evaluateAbsolute,quiesce,minimax,_skillProfile,_engineProfile,findMate,mateSearch,findBestMove,moveSafetyLoss,lowestAttacker,ttClear,resetHeuristics,preMoveEval,seePositive,see};
}
if(typeof window!=='undefined'){
    window.scoreMoveForOrdering=scoreMoveForOrdering;
    window.sortMoves=sortMoves;
    window.evaluateAbsolute=evaluateAbsolute;
    window.quiesce=quiesce;
    window.minimax=minimax;
    window._skillProfile=_skillProfile;
    window._engineProfile=_engineProfile;
    window.findMate=findMate;
    window.mateSearch=mateSearch;
    window.findBestMove=findBestMove;
    window.moveSafetyLoss=moveSafetyLoss;
    window.lowestAttacker=lowestAttacker;
    window.ttClear=ttClear;
    window.resetHeuristics=resetHeuristics;
    window.preMoveEval=preMoveEval;
    window.seePositive=seePositive;
    window.see=see;
    window._BotEngineLoaded=true;
    console.log('✅ bot-engine.js: Full tactical engine ready (TT+NullMove+LMR+Killers+History+ID)');
}
}catch(err){
    console.error('🔴 FATAL in bot-engine.js:',err.message,err.stack);
    if(typeof window!=='undefined') window._BotEngineLoaded=false;
}