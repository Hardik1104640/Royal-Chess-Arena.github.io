// =============================================================================
//  bot-worker.js  —  Royal Chess Arena
//  Runs the chess engine in a Web Worker so the main thread never freezes.
//  The worker loads bot-data.js and bot-engine.js then waits for move requests.
//
//  Message protocol:
//    Main → Worker:  { type:'move', fen, elo, id }
//    Worker → Main:  { type:'move', move, fen, elo, id }
//    Worker → Main:  { type:'ready' }
//    Worker → Main:  { type:'error', message, id }
// =============================================================================

// ── Load dependencies inside the worker ──────────────────────────────────────
// importScripts is available in Web Workers
// Paths are relative to the worker file location (Chess-Bots/)
try {
    // Step 1: Load chess.js — try local file first, then CDN
    let chessLoaded = false;
    try {
        importScripts('./chess.min.js');
        chessLoaded = true;
    } catch(e1) {
        try {
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');
            chessLoaded = true;
        } catch(e2) {
            postMessage({ type: 'error', message: 'chess.js failed to load in worker. Place chess.min.js in Chess-Bots/ folder.', id: null });
        }
    }

    // Step 2: chess.min.js sets Chess on 'self' (the worker global)
    // Make it available as a plain global so bot-engine.js can find it
    if (typeof Chess === 'undefined' && typeof self.Chess !== 'undefined') {
        Chess = self.Chess;
    }

    // Step 3: Load bot-data.js and bot-engine.js
    if (chessLoaded) {
        importScripts('./bot-data.js', './bot-engine.js');
    }
} catch(e) {
    postMessage({ type: 'error', message: 'Worker load failed: ' + e.message, id: null });
}

// ── Verify globals loaded ─────────────────────────────────────────────────────
const ready = (typeof Chess !== 'undefined') &&
              (typeof BOTS  !== 'undefined') &&
              (typeof findBestMove !== 'undefined');

if (ready) {
    postMessage({ type: 'ready' });
} else {
    postMessage({ type: 'error', message: 'Chess engine globals missing after import', id: null });
}

// ── Handle move requests ──────────────────────────────────────────────────────
self.onmessage = function(e) {
    const { type, fen, elo, id } = e.data;

    if (type !== 'move') return;

    try {
        // Validate FEN
        const game = new Chess();
        if (!game.load(fen)) {
            postMessage({ type: 'error', message: 'Invalid FEN', id });
            return;
        }

        if (game.in_checkmate() || game.in_stalemate() ||
            game.in_draw()      || game.insufficient_material()) {
            postMessage({ type: 'move', move: null, fen, elo, id });
            return;
        }

        const legal = game.moves({ verbose: true });
        if (!legal.length) {
            postMessage({ type: 'move', move: null, fen, elo, id });
            return;
        }

        // Get skill profile and find best move
        const profile = typeof _skillProfile !== 'undefined'
            ? _skillProfile(elo)
            : { depth: 3, pool: 1, blunder_rate: 0.05, noise: 0, mate_depth: 1,
                opts: { useTT: false, useNullMove: false, useLMR: false,
                        useKillers: false, useHistory: false, useQuiesce: false } };

        const move = findBestMove(game, profile);

        postMessage({ type: 'move', move: move || null, fen, elo, id });

    } catch(err) {
        postMessage({ type: 'error', message: err.message, id });
    }
};