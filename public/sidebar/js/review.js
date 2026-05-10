// review.js - Comprehensive Game Review & Analysis System
// Handles board display, move analysis, game phases, and detailed statistics

class GameReview {
  constructor() {
    this.game = null;
    this.analyzer = null;
    this.analysisData = null;
    this.currentMoveIndex = -1;
    this.currentPGN = '';
    this.currentGameData = null;
    this.initialized = false;
    this.errorLog = [];
    this.moveClassifications = {};
    this.reviewMode = null; // 'game' or 'fen' - cannot be both
  }

  // Safe error logging
  logError(message, error = null) {
    const fullMessage = `[Review] ${message}`;
    console.error(fullMessage, error || '');
    this.errorLog.push(fullMessage);
  }

  // Initialize system
  async init() {
    try {
      await this.waitForChess();
      await this.waitForAnalyzer();

      this.game = new Chess();
      this.analyzer = new ChessAnalyzer();

      this.initializeBoard();
      this.updateBoard();
      
      // Show starting FEN position (rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1)
      const fenDisplay = document.getElementById('fen-display');
      if (fenDisplay) {
        fenDisplay.textContent = this.game.fen();
      }
      
      this.setupEventListeners();
      this.loadSavedGames();
      this.initialized = true;
      console.log('[Review] Initialization complete');
    } catch (error) {
      this.logError('Initialization failed', error);
      this.showStatus('Error initializing review system. Please refresh the page.', 'error');
    }
  }

  // Wait for Chess library
  waitForChess() {
    return new Promise((resolve, reject) => {
      const maxAttempts = 30;
      let attempts = 0;
      const check = () => {
        if (typeof Chess !== 'undefined') {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, 200);
        } else {
          reject(new Error('Chess library failed to load'));
        }
      };
      check();
    });
  }

  // Wait for ChessAnalyzer
  waitForAnalyzer() {
    return new Promise((resolve, reject) => {
      const maxAttempts = 30;
      let attempts = 0;
      const check = () => {
        if (typeof ChessAnalyzer !== 'undefined') {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(check, 200);
        } else {
          reject(new Error('ChessAnalyzer failed to load'));
        }
      };
      check();
    });
  }

  // Initialize chessboard
  initializeBoard() {
    const chessboard = document.getElementById('chessboard');
    if (!chessboard) {
      this.logError('Chessboard element not found');
      return;
    }

    chessboard.innerHTML = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
        square.dataset.square = String.fromCharCode(97 + col) + (8 - row);
        chessboard.appendChild(square);
      }
    }
  }

  // Update board display
  updateBoard() {
    if (!this.game) return;

    try {
      const board = this.game.board();
      const squares = document.querySelectorAll('#chessboard .square');

      squares.forEach(square => {
        const piece = square.querySelector('img');
        if (piece) piece.remove();
      });

      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece) {
            const squareName = String.fromCharCode(97 + col) + (8 - row);
            const square = document.querySelector(`[data-square="${squareName}"]`);
            if (square) {
              const img = document.createElement('img');
              const pieceName = `${piece.color}${piece.type.toUpperCase()}`;
              img.src = `../../../Images/Chesspieces/${pieceName}.png`;
              img.alt = pieceName;
              img.style.maxWidth = '80%';
              img.style.maxHeight = '80%';
              square.appendChild(img);
            }
          }
        }
      }
    } catch (error) {
      this.logError('Failed to update board', error);
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Navigation buttons
    const startBtn = document.getElementById('start-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const endBtn = document.getElementById('end-btn');
    const reviewBtn = document.getElementById('start-review-btn');
    const uploadBtn = document.getElementById('upload-fen-btn');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.showPosition(-1));
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentMoveIndex > -1) {
          this.showPosition(this.currentMoveIndex - 1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.analysisData && this.currentMoveIndex < this.analysisData.moves.length - 1) {
          this.showPosition(this.currentMoveIndex + 1);
        }
      });
    }

    if (endBtn) {
      endBtn.addEventListener('click', () => {
        if (this.analysisData) {
          this.showPosition(this.analysisData.moves.length - 1);
        }
      });
    }

    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => {
        if (this.currentGameData || this.currentPGN) {
          this.startAnalysis();
        }
      });
    }

    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => this.handleFENUpload());
    }
  }

  // Load saved games
  async loadSavedGames() {
    try {
      const gamesList = document.getElementById('games-list');
      if (!gamesList) return;

      if (typeof window.GameLoader === 'undefined') {
        gamesList.innerHTML = '<p style="color:#ff6b6b;">GameLoader API not available</p>';
        return;
      }

      const games = await window.GameLoader.fetchGames();

      if (!games || games.length === 0) {
        gamesList.innerHTML = `
          <div style="text-align:center;padding:20px;color:#999;">
            <p><i class="fas fa-inbox" style="margin-right:8px;"></i>No games yet</p>
          </div>
        `;
        return;
      }

      // Sort by date
      const sortedGames = [...games].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      gamesList.innerHTML = sortedGames.map(g => {
        const gameType = g.type === 'bot' ? '<i class="fas fa-robot"></i> Bot' : '<i class="fas fa-globe"></i> Online';
        const opponentName = g.opponent || (g.players && Array.isArray(g.players) ? g.players.join(' vs ') : (g.players || 'N/A'));
        
        return `
          <div class="game-entry ${g.type}" data-game-id="${g.id}" style="cursor:pointer;" onclick="gameReview.selectGame('${g.id}', this)">
            <div><b><i class="fas fa-calendar" style="margin-right:6px;"></i>Date:</b> ${g.date ? new Date(g.date).toLocaleString() : 'Unknown'}</div>
            <div><b><i class="fas fa-chess-knight" style="margin-right:6px;"></i>Type:</b> ${gameType}</div>
            <div><b><i class="fas fa-user" style="margin-right:6px;"></i>Opponent:</b> ${opponentName}</div>
            <div><b><i class="fas fa-trophy" style="margin-right:6px;"></i>Result:</b> <span style="color:${g.result === 'Win' ? '#22b14c' : g.result === 'Loss' ? '#ff6b6b' : '#fbbf24'}">${g.result || 'N/A'}</span></div>
          </div>
        `;
      }).join('');

      console.log(`✓ Loaded ${sortedGames.length} games`);
    } catch (error) {
      this.logError('Failed to load games', error);
    }
  }

  // Select a game from the list
  async selectGame(gameId, element) {
    try {
      // Switch to game mode - disable FEN mode
      this.reviewMode = 'game';
      
      // Disable FEN upload button
      const uploadBtn = document.getElementById('upload-fen-btn');
      if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.style.opacity = '0.4';
        uploadBtn.style.cursor = 'not-allowed';
      }
      
      // Update UI - highlight selected game
      document.querySelectorAll('.game-entry').forEach(el => el.classList.remove('selected'));
      element.classList.add('selected');

      // Load full game data
      if (typeof window.GameLoader === 'undefined') {
        this.showStatus('GameLoader API not available', 'error');
        return;
      }

      const gameData = await window.GameLoader.loadGameData(gameId);
      if (gameData) {
        this.currentGameData = gameData;
        this.currentPGN = gameData.pgn;
        
        // Show game info
        this.displayGameInfo(gameData);
        
        // Enable review button
        const reviewBtn = document.getElementById('start-review-btn');
        if (reviewBtn) reviewBtn.disabled = false;
        
        this.showStatus(`✓ Loaded: ${gameData.opponent || 'Game'}`, 'success');
      }
    } catch (error) {
      this.logError('Failed to select game', error);
      this.showStatus('Error loading game', 'error');
    }
  }

  // Display game info
  displayGameInfo(gameData) {
    const infoBar = document.getElementById('game-info-bar');
    if (infoBar) {
      infoBar.style.display = 'block';
      document.getElementById('game-opponent').textContent = gameData.opponent || 'Unknown';
      document.getElementById('game-rating').textContent = gameData.userRating || '--';
      document.getElementById('game-date').textContent = gameData.date ? new Date(gameData.date).toLocaleString() : '--';
    }
  }

  // Handle FEN upload
  handleFENUpload() {
    const fen = prompt('Enter FEN position:');
    if (fen && fen.trim()) {
      try {
        this.game.load(fen);
        this.updateBoard();
        
        // Switch to FEN mode - disable game selection
        this.reviewMode = 'fen';
        
        // Clear game selection
        document.querySelectorAll('.game-entry').forEach(el => el.classList.remove('selected'));
        this.currentGameData = null;
        
        // Disable games panel - make entries non-clickable
        document.querySelectorAll('.game-entry').forEach(el => {
          el.style.opacity = '0.4';
          el.style.pointerEvents = 'none';
          el.style.cursor = 'default';
        });
        
        const fenDisplay = document.getElementById('fen-display');
        if (fenDisplay) fenDisplay.textContent = fen;
        
        // Hide game info bar
        const infoBar = document.getElementById('game-info-bar');
        if (infoBar) infoBar.style.display = 'none';
        
        // Enable review button
        const reviewBtn = document.getElementById('start-review-btn');
        if (reviewBtn) reviewBtn.disabled = false;
        
        this.currentPGN = this.game.pgn();
        this.showStatus('✓ FEN loaded', 'success');
      } catch (error) {
        this.showStatus('Invalid FEN position', 'error');
      }
    }
  }

  // Start analysis
  async startAnalysis() {
    try {
      // Hide games panel when review starts
      const gamesPanel = document.getElementById('games-panel');
      if (gamesPanel) {
        gamesPanel.style.display = 'none';
      }

      // Handle FEN mode - no moves to analyze, just show position
      if (this.reviewMode === 'fen') {
        this.showStatus('✓ FEN position loaded - no moves to analyze', 'success');
        this.updateBoard();
        
        const fenDisplay = document.getElementById('fen-display');
        if (fenDisplay) {
          fenDisplay.textContent = this.game.fen();
        }
        
        // Show empty analysis for FEN
        this.analysisData = {
          moves: [],
          classifications: {},
          accuracy: 0,
          phases: { opening: 0, middlegame: 0, endgame: 0 },
          moveStats: {
            brilliant: 0,
            best: 0,
            good: 0,
            okay: 0,
            inaccuracy: 0,
            mistake: 0,
            blunder: 0
          },
          evaluations: []
        };
        this.displayAnalysis();
        this.displayMovesList();
        return;
      }

      // Handle game mode - analyze all moves
      if (!this.currentPGN || !this.currentGameData) {
        this.showStatus('No game to analyze', 'error');
        return;
      }

      this.showStatus('Analyzing game...', 'info');
      
      // Parse moves from PGN
      this.game.reset();
      this.game.loadPgn(this.currentPGN);
      const moves = this.game.history({ verbose: true });
      
      if (!moves || moves.length === 0) {
        this.showStatus('No moves in game', 'error');
        return;
      }
      
      // Create analysis data with evaluations
      const evaluations = this.calculateEvaluations(moves);
      
      this.analysisData = {
        moves: moves,
        classifications: this.classifyMoves(moves, evaluations),
        accuracy: 0, // Will be calculated after classifications
        phases: this.detectGamePhases(moves),
        moveStats: {},
        evaluations: evaluations
      };

      // Calculate accuracy after classifications
      this.analysisData.accuracy = this.calculateAccuracy();
      this.analysisData.moveStats = this.calculateMoveStats();

      this.displayAnalysis();
      this.displayMovesList();
      this.drawEvaluationChart();
      this.showPosition(-1);
      this.showStatus('✅ Analysis complete', 'success');
    } catch (error) {
      this.logError('Analysis failed', error);
      this.showStatus('Analysis error: ' + error.message, 'error');
    }
  }

  // Calculate evaluations for moves (simple evaluation based on move patterns)
  calculateEvaluations(moves) {
    const evaluations = [];
    let currentEval = 0; // Start at 0 (equal position)
    
    moves.forEach((move, index) => {
      // Simple evaluation change based on move characteristics
      let evalChange = 0;
      
      if (move.flags && move.flags.includes('c')) {
        // Capture - slightly positive
        evalChange = 0.5;
      }
      if (move.flags && move.flags.includes('+')) {
        // Check - positive
        evalChange = 0.3;
      }
      if (move.flags && move.flags.includes('#')) {
        // Checkmate - very positive
        evalChange = 10;
      }
      
      // Alternate perspective for black's moves
      if (index % 2 === 1) {
        evalChange = -evalChange;
      }
      
      currentEval += evalChange;
      evaluations.push(currentEval);
    });
    
    return evaluations;
  }

  // Classify moves based on move quality with better logic
  classifyMoves(moves, evaluations) {
    const classifications = {};
    
    moves.forEach((move, index) => {
      // Get evaluation before and after this move
      const evalBefore = index > 0 ? evaluations[index - 1] : 0;
      const evalAfter = evaluations[index];
      const evalDiff = Math.abs(evalAfter - evalBefore);
      
      // Classify based on characteristics
      let classification = 'Okay';
      
      if (move.flags && move.flags.includes('#')) {
        // Checkmate
        classification = 'Brilliant';
      } else if (move.flags && move.flags.includes('c')) {
        // Capture
        if (evalDiff > 0.5) {
          classification = 'Best';
        } else {
          classification = 'Good';
        }
      } else if (move.flags && move.flags.includes('+')) {
        // Check
        classification = 'Good';
      } else if (evalDiff > 1.5) {
        // Significant eval loss
        classification = 'Blunder';
      } else if (evalDiff > 0.8) {
        // Moderate eval loss
        classification = 'Mistake';
      } else if (evalDiff > 0.3) {
        // Small eval loss
        classification = 'Inaccuracy';
      } else if (evalDiff > 0.1) {
        // Good move
        classification = 'Good';
      }
      
      classifications[index] = classification;
    });
    
    return classifications;
  }

  // Calculate accuracy
  calculateAccuracy() {
    if (!this.analysisData || !this.analysisData.classifications) return 0;
    
    const stats = this.calculateMoveStats();
    const goodMoves = stats.best + stats.good + stats.brilliant;
    const totalMoves = Object.keys(this.analysisData.classifications).length;
    
    return totalMoves > 0 ? Math.round((goodMoves / totalMoves) * 100) : 0;
  }

  // Calculate move statistics
  calculateMoveStats() {
    const stats = {
      brilliant: 0,
      best: 0,
      good: 0,
      okay: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0
    };

    if (!this.analysisData || !this.analysisData.classifications) {
      return stats;
    }

    Object.values(this.analysisData.classifications).forEach(classification => {
      const key = classification.toLowerCase().replace(/\s/g, '');
      if (stats.hasOwnProperty(key)) {
        stats[key]++;
      }
    });

    return stats;
  }

  // Detect game phases (opening, middle game, endgame)
  detectGamePhases(moves) {
    return {
      opening: { moveCount: Math.min(moves.length, 12), performance: 'Good' },
      middlegame: { moveCount: Math.max(0, Math.min(moves.length - 12, moves.length - 20)), performance: 'Okay' },
      endgame: { moveCount: Math.max(0, moves.length - 20), performance: 'Good' }
    };
  }

  // Display analysis
  displayAnalysis() {
    try {
      // Show analysis sections
      document.getElementById('move-quality-section').style.display = 'block';
      document.getElementById('game-phases-section').style.display = 'block';
      document.getElementById('accuracy-section').style.display = 'block';
      document.getElementById('board-controls').style.display = 'flex';
      document.getElementById('fen-section').style.display = 'block';
      document.getElementById('chart-section').style.display = 'block';
      document.getElementById('moves-section').style.display = 'block';

      // Update statistics
      const stats = this.calculateMoveStats();
      document.getElementById('stat-brilliant').textContent = stats.brilliant;
      document.getElementById('stat-best').textContent = stats.best;
      document.getElementById('stat-good').textContent = stats.good;
      document.getElementById('stat-okay').textContent = stats.okay;
      document.getElementById('stat-inaccuracy').textContent = stats.inaccuracy;
      document.getElementById('stat-mistake').textContent = stats.mistake;
      document.getElementById('stat-blunder').textContent = stats.blunder;

      // Update game phases
      document.getElementById('phase-opening').textContent = 'Good';
      document.getElementById('phase-middle').textContent = 'Good';
      document.getElementById('phase-endgame').textContent = 'Good';

      // Update accuracy
      const accuracy = this.calculateAccuracy();
      document.getElementById('accuracy-display').textContent = `${accuracy}%`;

      // Update move counter
      if (this.analysisData && this.analysisData.moves) {
        document.getElementById('move-counter').textContent = `0 / ${this.analysisData.moves.length}`;
      }

      console.log('✓ Analysis displayed');
    } catch (error) {
      this.logError('Failed to display analysis', error);
    }
  }

  // Show specific position
  showPosition(moveIndex) {
    try {
      if (!this.game || !this.currentPGN || !this.analysisData) return;

      this.game.reset();
      this.game.loadPgn(this.currentPGN);
      const moves = this.game.history();

      // Reset and replay moves
      this.game.reset();
      for (let i = 0; i <= moveIndex; i++) {
        if (i < moves.length) {
          this.game.move(moves[i]);
        }
      }

      this.updateBoard();
      this.currentMoveIndex = moveIndex;

      // Update FEN display
      const fenDisplay = document.getElementById('fen-display');
      if (fenDisplay) {
        fenDisplay.textContent = this.game.fen();
      }

      // Update move info
      const moveInfo = document.getElementById('move-info');
      const moveClass = document.getElementById('move-classification');
      const moveCounter = document.getElementById('move-counter');

      if (moveIndex >= 0 && this.analysisData.moves[moveIndex]) {
        const move = this.analysisData.moves[moveIndex];
        const moveNumber = Math.floor(moveIndex / 2) + 1;
        const color = moveIndex % 2 === 0 ? 'White' : 'Black';
        
        moveInfo.textContent = `${moveNumber}. ${move.san} (${color})`;
        moveClass.textContent = this.analysisData.classifications[moveIndex] || 'Standard';
        moveCounter.textContent = `${moveIndex + 1} / ${this.analysisData.moves.length}`;
      } else {
        moveInfo.textContent = 'Starting position';
        moveClass.textContent = '';
        moveCounter.textContent = `0 / ${this.analysisData.moves.length}`;
      }
    } catch (error) {
      this.logError('Failed to show position', error);
    }
  }

  // Display moves list with quality indicators
  displayMovesList() {
    try {
      const movesListContainer = document.getElementById('moves-list');
      if (!movesListContainer || !this.analysisData || !this.analysisData.moves) return;

      if (this.analysisData.moves.length === 0) {
        movesListContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No moves to display</div>';
        return;
      }

      const movesList = this.analysisData.moves.map((move, index) => {
        const moveNumber = Math.floor(index / 2) + 1;
        const color = index % 2 === 0 ? 'White' : 'Black';
        const quality = this.analysisData.classifications[index] || 'Standard';
        const qualityColor = this.getQualityColor(quality);
        
        return `
          <div class="move-item" onclick="gameReview.showPosition(${index})" style="cursor: pointer;">
            <span class="move-number">${moveNumber}${index % 2 === 0 ? '.' : '...'}</span>
            <span class="move-notation">${move.san}</span>
            <span class="move-quality" style="background-color: ${qualityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; white-space: nowrap;">
              ${quality}
            </span>
          </div>
        `;
      }).join('');

      movesListContainer.innerHTML = movesList;
      console.log('✓ Moves list displayed');
    } catch (error) {
      this.logError('Failed to display moves list', error);
    }
  }

  // Get color for move quality indicator
  getQualityColor(quality) {
    const colors = {
      'Brilliant': '#FFD700',  // Gold
      'Best': '#00FF00',       // Green
      'Good': '#00AAFF',       // Cyan
      'Okay': '#CCCCCC',       // Gray
      'Inaccuracy': '#FFAA00', // Orange
      'Mistake': '#FF3333',    // Red
      'Blunder': '#FF0000'     // Dark Red
    };
    return colors[quality] || '#CCCCCC';
  }

  // Draw evaluation chart
  drawEvaluationChart() {
    try {
      const chartCanvas = document.getElementById('evaluation-chart');
      if (!chartCanvas || !this.analysisData || !this.analysisData.evaluations) return;

      const ctx = chartCanvas.getContext('2d');
      const evaluations = this.analysisData.evaluations;
      
      if (evaluations.length === 0) return;

      const width = chartCanvas.width;
      const height = chartCanvas.height;
      const padding = 30;
      const graphWidth = width - 2 * padding;
      const graphHeight = height - 2 * padding;

      // Find min/max evaluations
      const minEval = Math.min(...evaluations);
      const maxEval = Math.max(...evaluations);
      const evalRange = maxEval - minEval || 1;

      // Clear canvas
      ctx.fillStyle = 'rgba(15, 23, 32, 0.8)';
      ctx.fillRect(0, 0, width, height);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (graphHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // Draw center line (0 evaluation)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      const centerY = padding + (graphHeight * (maxEval / evalRange));
      ctx.beginPath();
      ctx.moveTo(padding, centerY);
      ctx.lineTo(width - padding, centerY);
      ctx.stroke();

      // Draw evaluation line
      ctx.strokeStyle = '#6c6cff';
      ctx.lineWidth = 3;
      ctx.beginPath();

      evaluations.forEach((evalValue, index) => {
        const x = padding + (graphWidth / evaluations.length) * index;
        const y = padding + graphHeight - ((evalValue - minEval) / evalRange * graphHeight);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw points
      ctx.fillStyle = '#3aa0ff';
      evaluations.forEach((evalValue, index) => {
        const x = padding + (graphWidth / evaluations.length) * index;
        const y = padding + graphHeight - ((evalValue - minEval) / evalRange * graphHeight);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw axes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();

      // Draw labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Moves', width / 2, height - 5);
      
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Evaluation', 0, 0);
      ctx.restore();

      console.log('✓ Evaluation chart drawn');
    } catch (error) {
      this.logError('Failed to draw chart', error);
    }
  }

  // Show status message
  showStatus(message, type = 'info') {
    try {
      const statusEl = document.getElementById('play-status');
      if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `status-message show ${type}`;
        
        if (type === 'success' || type === 'error') {
          setTimeout(() => {
            statusEl.classList.remove('show');
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Failed to show status', error);
    }
  }
}

// Global instance
let gameReview = null;

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', async () => {
  gameReview = new GameReview();
  await gameReview.init();
});

// Also handle if script is loaded after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    if (!gameReview) {
      gameReview = new GameReview();
      await gameReview.init();
    }
  });
} else {
  // DOM is already loaded
  setTimeout(async () => {
    if (!gameReview) {
      gameReview = new GameReview();
      await gameReview.init();
    }
  }, 100);
}
