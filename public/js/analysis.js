// Chess Game Analysis System
// Uses chess.js for game logic and Stockfish for evaluation
// Note: Other engines like RubiChess, Leela Chess Zero, Komodo Dragon are not available as JavaScript WebAssembly versions.
// Only Stockfish.js is used here. For higher accuracy, consider using native engines via server-side integration.

class StockfishEngine {
    constructor() {
        this.sf = null;
        this.ready = false;
    }

    async init() {
        if (this.ready) return;

        // Load Stockfish.js if not already loaded
        if (typeof window.Stockfish === 'undefined') {
            await this.loadStockfish();
        }

        this.sf = window.Stockfish();
        await this.waitForReady();
        this.ready = true;
    }

    loadStockfish() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    waitForReady() {
        return new Promise((resolve) => {
            const onMessage = (event) => {
                if (event.data === 'readyok') {
                    this.sf.removeEventListener('message', onMessage);
                    resolve();
                }
            };
            this.sf.addEventListener('message', onMessage);
            this.sf.postMessage('uci');
            this.sf.postMessage('isready');
        });
    }

    async evaluatePosition(fen, depth = 20) {
        if (!this.ready) await this.init();

        return new Promise((resolve) => {
            let bestScore = null;
            let isMate = false;
            let mateIn = null;
            let bestMove = null;

            const onMessage = (event) => {
                const line = event.data;
                if (line.startsWith('info')) {
                    const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
                    if (scoreMatch) {
                        if (scoreMatch[1] === 'mate') {
                            isMate = true;
                            mateIn = parseInt(scoreMatch[2]);
                        } else {
                            bestScore = parseInt(scoreMatch[2]);
                        }
                    }
                } else if (line.startsWith('bestmove')) {
                    const match = line.match(/^bestmove (\S+)/);
                    bestMove = match ? match[1] : null;
                    this.sf.removeEventListener('message', onMessage);
                    let score;
                    if (isMate) {
                        score = mateIn > 0 ? 10000 - mateIn : -10000 - mateIn;
                    } else {
                        score = bestScore;
                    }
                    // Adjust to white's perspective
                    const sideToMove = fen.split(' ')[1];
                    if (sideToMove === 'b') score = -score;
                    resolve({ score, isMate, mateIn, bestMove });
                }
            };

            this.sf.addEventListener('message', onMessage);
            this.sf.postMessage('position fen ' + fen);
            this.sf.postMessage('go depth ' + depth);
        });
    }

    async getBestMove(fen, depth = 15) {
        const { bestMove } = await this.evaluatePosition(fen, depth);
        return bestMove;
    }
}

class ChessAnalyzer {
    constructor() {
        this.engine = new StockfishEngine();
    }

    async analyzeGame(pgn) {
        // Load chess.js if not available
        if (typeof Chess === 'undefined') {
            await this.loadChessJS();
        }

        const game = new Chess();
        game.loadPgn(pgn);

        const moves = game.history();
        const results = [];

        // Reset to start
        game.reset();

        let previousEval = 0;

        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            const fenBefore = game.fen();

            // evalBefore is the eval from previous position
            const evalBefore = previousEval;

            // Evaluate position to get evalBest and bestMove
            const { score: evalBest, bestMove } = await this.engine.evaluatePosition(fenBefore);

            // Play the move
            game.move(move);

            // Evaluate after move
            const { score: evalAfter } = await this.engine.evaluatePosition(game.fen());

            // Update previousEval
            previousEval = evalAfter;

            // Calculate CPL
            const cpl = evalAfter - evalBest;

            // Classify move
            let classification = 'Best';
            if (isBrilliant) {
                classification = 'Brilliant';
            } else if (cpl > 0) {
                if (cpl <= 20) classification = 'Excellent';
                else if (cpl <= 50) classification = 'Good';
                else if (cpl <= 100) classification = 'Inaccuracy';
                else if (cpl <= 200) classification = 'Mistake';
                else classification = 'Blunder';
            }

            // Check if best move
            const isBest = bestMove === move;

            // Advanced detection
            let isBrilliant = false;
            let isMissedWin = false;

            if (isBest) {
                // Check for sacrifice
                const materialBefore = this.countMaterial(fenBefore);
                const materialAfter = this.countMaterial(game.fen());
                const materialDiff = materialAfter - materialBefore;

                if (materialDiff < 0 && evalAfter > evalBefore + 50) {
                    isBrilliant = true;
                }
            }

            if (evalBefore > 300 && evalAfter < 0) {
                isMissedWin = true;
                classification = 'Blunder'; // Override
            }

            results.push({
                move: move,
                bestMove: bestMove,
                evalBefore: evalBefore,
                evalAfter: evalAfter,
                cpl: cpl,
                classification: classification,
                isBrilliant: isBrilliant,
                isMissedWin: isMissedWin
            });
        }

        // Calculate accuracy
        const accuracyScores = {
            'Brilliant': 100,
            'Best': 100,
            'Excellent': 90,
            'Good': 75,
            'Inaccuracy': 50,
            'Mistake': 25,
            'Blunder': 0
        };

        const totalScore = results.reduce((sum, r) => sum + accuracyScores[r.classification], 0);
        const accuracy = totalScore / results.length;

        return {
            results: results,
            accuracy: Math.round(accuracy * 100) / 100
        };
    }

    countMaterial(fen) {
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        const boardStr = fen.split(' ')[0];
        let material = 0;

        // Expand the FEN board string
        const expanded = boardStr.replace(/\d/g, (match) => ' '.repeat(parseInt(match)));
        
        for (const char of expanded) {
            if (char === ' ') continue;
            const value = pieceValues[char.toLowerCase()];
            if (value !== undefined) {
                if (char === char.toUpperCase()) {
                    material += value; // White
                } else {
                    material -= value; // Black
                }
            }
        }

        return material;
    }

    loadChessJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME IMPORT & DISPLAY SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

// Global game loader
window.GameLoader = {
    // Fetch all saved games for current user
    async fetchGames() {
        try {
            const response = await fetch('/api/list-games');
            if (!response.ok) throw new Error(`Failed to fetch games: ${response.statusText}`);
            const games = await response.json();
            console.log(`📊 Loaded ${games.length} games for analysis`);
            return games;
        } catch (err) {
            console.error('❌ Error fetching games:', err);
            return [];
        }
    },

    // Load full game data by ID
    async loadGameData(gameId) {
        try {
            const response = await fetch(`/api/game-data/${gameId}`);
            if (!response.ok) throw new Error(`Failed to load game: ${response.statusText}`);
            const gameData = await response.json();
            console.log(`✅ Loaded game data:`, gameData);
            return gameData;
        } catch (err) {
            console.error('❌ Error loading game data:', err);
            return null;
        }
    },

    // Display games in a container - IDENTICAL to home.js
    displayGames(games, containerId = 'games-container') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container #${containerId} not found`);
            return;
        }

        if (!games || games.length === 0) {
            container.innerHTML = '<p style="color:#999;padding:20px;">No games found. Play some games to analyze them!</p>';
            return;
        }
        
        // Sort by date descending (newest first)
        const sortedGames = [...games].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        container.innerHTML = sortedGames.map(g => {
            const gameType = g.type === 'bot' ? '🤖 Bot' : '🌐 Online';
            // Determine opponent name with fallback - SAME as home.js
            const opponentName = g.opponent || (g.players && Array.isArray(g.players) ? g.players.join(' vs ') : (g.players || 'N/A'));
            const resultColor = g.result === 'Win' ? '#22b14c' : g.result === 'Loss' ? '#ff6b6b' : '#fbbf24';
            
            return `
                <div class="game-entry ${g.type}" data-game-id="${g.id}" style="
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-left: 4px solid ${g.type === 'bot' ? '#ff9800' : '#2196f3'};
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                " onmouseover="this.style.background='#333'" onmouseout="this.style.background='#2a2a2a'">
                    <div><b>Date:</b> ${g.date ? new Date(g.date).toLocaleString() : 'Unknown'}</div>
                    <div><b>Type:</b> ${gameType}</div>
                    <div><b>Opponent:</b> ${opponentName}</div>
                    <div><b>Result:</b> <span style="color: ${resultColor}; font-weight: bold;">${g.result || 'N/A'}</span></div>
                    <button class="analyze-btn" data-game-id="${g.id}" style="
                        margin-top: 10px;
                        padding: 8px 14px;
                        background: #3a9eff;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#2196f3'" onmouseout="this.style.background='#3a9eff'">📖 Analyze</button>
                </div>
            `;
        }).join('');
        
        // Add event listeners to all analyze buttons
        document.querySelectorAll('.analyze-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const gameId = btn.getAttribute('data-game-id');
                console.log(`📖 Analyzing game: ${gameId}`);
                await window.GameLoader.prepareForAnalysis(gameId);
            });
        });

        console.log(`✅ Displayed ${sortedGames.length} games with working Analyze buttons`);
    },

    // Prepare game for analysis (load and show board)
    async prepareForAnalysis(gameId) {
        console.log(`⏳ Loading game ${gameId} for analysis...`);
        const gameData = await this.loadGameData(gameId);
        
        if (!gameData) {
            alert('Failed to load game data');
            return;
        }

        // Store in session for analysis board to use
        sessionStorage.setItem('selectedGame', JSON.stringify(gameData));
        console.log(`✅ Game ready for analysis. Stored in sessionStorage.`);
        
        // Fire event for any listening components
        window.dispatchEvent(new CustomEvent('gameSelectedForAnalysis', { detail: gameData }));
        
        // Navigate to review page if available
        const reviewUrl = '/sidebar/html/review.html?gameId=' + encodeURIComponent(gameId);
        console.log(`📍 Navigating to: ${reviewUrl}`);
        window.location.href = reviewUrl;
    }
};


// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessAnalyzer;
} else if (typeof window !== 'undefined') {
    window.ChessAnalyzer = ChessAnalyzer;
}