// puzzles.js - Royal Chess Arena Puzzles Page
// Using Chess.js library for chess logic
// Database loaded from: ../../database/puzzles.json
// Format: { fen, moves (space-separated UCI), rating, themes (space-separated string) }

document.addEventListener('DOMContentLoaded', () => {

  // ==================== DATABASE LOADING ====================
  let puzzleDatabase = {
    'mate-in-1': [], 'mate-in-2': [], 'mate-in-3': [],
    'fork': [], 'pin': [], 'skewer': [], 'discovered-attack': [],
    'sacrifice': [], 'endgame': [], 'double-attack': [],
    'deflection': []
  };
  let allPuzzlesFlat = [];
  let solvedPuzzleIds = new Set();
  let dbLoaded = false;

  // Theme keyword → database key mapping
  const THEME_MAP = {
    'mateIn1': 'mate-in-1', 'mateIn2': 'mate-in-2', 'mateIn3': 'mate-in-3',
    'fork': 'fork', 'knightFork': 'fork', 'centralFork': 'fork',
    'pin': 'pin', 'absolutePin': 'pin', 'relativePin': 'pin',
    'skewer': 'skewer',
    'discoveredAttack': 'discovered-attack', 'discoveredCheck': 'discovered-attack',
    'sacrifice': 'sacrifice', 'knightSacrifice': 'sacrifice',
    'endgame': 'endgame', 'pawnEndgame': 'endgame', 'rookEndgame': 'endgame',
    'doubleAttack': 'double-attack', 'doubleCheck': 'double-attack',
    'deflection': 'deflection', 'removeDefender': 'deflection',
    'backRankMate': 'mate-in-1', 'attackingF2F7': 'sacrifice',
    'advantage': 'fork', 'interference': 'deflection', 'intermezzo': 'deflection',
    'advancedPawn': 'endgame', 'zugzwang': 'endgame',
    'middlegame': 'fork', 'opening': 'fork', 'long': 'mate-in-3', 'short': 'mate-in-1'
  };

  // Convert flat DB record → original format
  const convertPuzzle = (p, index) => {
    const movesArr = p.moves ? p.moves.trim().split(' ') : [];
    const themesArr = p.themes ? p.themes.trim().split(' ') : [];
    // Find primary theme key
    let themeKey = 'fork';
    for (const t of themesArr) {
      if (THEME_MAP[t]) { themeKey = THEME_MAP[t]; break; }
    }
    const themeLabel = themeKey.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    return {
      id: index + 1,
      fen: p.fen,
      solution: movesArr,
      rating: p.rating || 1200,
      theme: themeLabel,
      themeKey: themeKey,
      themes: p.themes || '',
      description: themesArr.slice(0, 3).join(', ')
    };
  };

  const DB_PATHS = [
    '../../database/puzzles.json',
    '../database/puzzles.json',
    '/database/puzzles.json',
    './database/puzzles.json',
    './puzzles.json'
  ];

  const loadPuzzleDatabase = async () => {
    let loaded = false;
    for (const path of DB_PATHS) {
      try {
        const res = await fetch(path);
        if (!res.ok) continue;
        const data = await res.json();
        const raw = Array.isArray(data) ? data : Object.values(data).flat();
        // Convert and categorise
        raw.forEach((p, i) => {
          const puzzle = convertPuzzle(p, i);
          // Add to themed bucket
          if (puzzleDatabase[puzzle.themeKey]) {
            puzzleDatabase[puzzle.themeKey].push(puzzle);
          } else {
            puzzleDatabase['fork'].push(puzzle); // default bucket
          }
          allPuzzlesFlat.push(puzzle);
        });
        // Sort all puzzles by rating (ascending) and then by theme
        Object.keys(puzzleDatabase).forEach(theme => {
          puzzleDatabase[theme].sort((a, b) => a.rating - b.rating);
        });
        allPuzzlesFlat.sort((a, b) => a.rating - b.rating);
        dbLoaded = true;
        console.log(`✅ Loaded ${allPuzzlesFlat.length.toLocaleString()} puzzles from: ${path}`);
        console.log('📊 Themes:', Object.fromEntries(Object.entries(puzzleDatabase).map(([k,v])=>[k,v.length])));
        loaded = true;
        break;
      } catch (_) { continue; }
    }
    if (!loaded) {
      console.error('Could not load puzzles.json from any path.');
      console.error('Place puzzles.json at: Chess project/database/puzzles.json');
      const banner = document.getElementById('db-error-banner');
      if (banner) {
        banner.innerHTML = 'Puzzle database not found. Place <b>puzzles.json</b> at <code>database/puzzles.json</code>';
        banner.style.display = 'block';
      }
    }
  };

  // ==================== SESSION MANAGEMENT ====================
  // Generate unique session ID for each user to prevent data sharing between guests
  let sessionID = sessionStorage.getItem('puzzleSessionID');
  if (!sessionID) {
    sessionID = 'puzzle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('puzzleSessionID', sessionID);
  }

  // ==================== STATISTICS ====================
  let puzzleStats = {
    solved: 0, attempted: 0, accuracy: 0,
    dailyRushCompleted: 0, dailyRushLimit: 3,
    customPuzzlesUsed: 0, customPuzzlesLimit: 10,
    battleRating: 1200, battleWins: 0, battleLosses: 0,
    battleStreak: 0, bestBattleStreak: 0,
    themeProgress: {},
    dailyPuzzleCompleted: false,
    lastDailyDate: null, lastRushDate: null, lastCustomDate: null,
    solvedPuzzleIds: [],
    leaderboard: { personal: [], friends: [], global: [] },
    puzzlesWithHints: [],
    mistakesInRush: [], // Tracks mistakes made in Puzzle Rush - array of { puzzleId, rating, theme, moved, solution }
  };

  const loadStats = () => {
    try {
      // Load from sessionStorage for this session only (prevents guest data sharing)
      const sessionKey = `puzzleStats_${sessionID}`;
      const saved = sessionStorage.getItem(sessionKey);
      if (saved) puzzleStats = { ...puzzleStats, ...JSON.parse(saved) };
      
      // Load solved puzzle IDs from session storage
      const solvedKey = `solvedPuzzles_${sessionID}`;
      const solvedSaved = sessionStorage.getItem(solvedKey);
      if (solvedSaved) {
        solvedPuzzleIds = new Set(JSON.parse(solvedSaved));
      }
    } catch (e) { console.error('Error loading puzzle stats:', e); }
    updateStatsDisplay();
  };

  const saveStats = () => {
    try { 
      // Save to sessionStorage for this session only
      const sessionKey = `puzzleStats_${sessionID}`;
      puzzleStats.solvedPuzzleIds = Array.from(solvedPuzzleIds);
      sessionStorage.setItem(sessionKey, JSON.stringify(puzzleStats));
      
      // Also save solved puzzle IDs separately for easy access
      const solvedKey = `solvedPuzzles_${sessionID}`;
      sessionStorage.setItem(solvedKey, JSON.stringify(Array.from(solvedPuzzleIds)));
    } catch (e) {}
    updateStatsDisplay();
  };

  const updateStatsDisplay = () => {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('puzzles-solved', puzzleStats.solved);
    set('accuracy-rate', puzzleStats.attempted > 0
      ? Math.round((puzzleStats.solved / puzzleStats.attempted) * 100) + '%' : '0%');
    set('daily-completed', `${puzzleStats.dailyRushCompleted}/${puzzleStats.dailyRushLimit}`);
    set('battle-wins', puzzleStats.battleWins);
    set('battle-rating', puzzleStats.battleRating);
    set('battle-streak', puzzleStats.battleStreak);
  };

  // ==================== PUZZLE SELECTION ====================
  const getRandomPuzzle = (theme = null, minRating = null, maxRating = null, excludeSolved = true) => {
    if (!dbLoaded || allPuzzlesFlat.length === 0) return null;
    let puzzles = [];
    if (theme && puzzleDatabase[theme] && puzzleDatabase[theme].length > 0) {
      puzzles = puzzleDatabase[theme];
    } else if (theme) {
      // Try flat search by themes string
      puzzles = allPuzzlesFlat.filter(p => p.themes && p.themes.includes(theme));
    }
    if (puzzles.length === 0) puzzles = allPuzzlesFlat;
    if (minRating !== null && maxRating !== null) {
      const filtered = puzzles.filter(p => p.rating >= minRating && p.rating <= maxRating);
      if (filtered.length > 0) puzzles = filtered;
    }
    // Filter out solved puzzles if requested
    if (excludeSolved) {
      const unsolvedPuzzles = puzzles.filter(p => !solvedPuzzleIds.has(p.id));
      if (unsolvedPuzzles.length > 0) puzzles = unsolvedPuzzles;
    }
    return puzzles.length > 0 ? puzzles[Math.floor(Math.random() * puzzles.length)] : null;
  };

  // ==================== CHESS BOARD RENDERING ====================
  let currentPuzzle = null;
  let currentGame = null;
  let playerMoves = [];
  let solutionIndex = 0;
  let selectedSquare = null;
  let currentMode = null; // 'theme', 'difficulty', 'daily', 'rush', 'custom'
  let currentTheme = null; // Store selected theme
  let currentDifficulty = null; // Store selected difficulty
  let usedHint = false; // Track if hint was used
  let usedUndo = false; // Track if undo was used
  let timerInterval = null; // Timer for Puzzle Rush
  let timeRemaining = 0; // In seconds
  let correctCount = 0; // Correct puzzles in rush mode
  let wrongCount = 0; // Wrong answers in rush mode

  const PIECES = {
    wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
    bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟'
  };
  
  // Real chess piece images from Images/Chesspieces/
  const PIECE_IMAGES = {
    wK: '../../../Images/Chesspieces/wK.png',
    wQ: '../../../Images/Chesspieces/wQ.png',
    wR: '../../../Images/Chesspieces/wR.png',
    wB: '../../../Images/Chesspieces/wB.png',
    wN: '../../../Images/Chesspieces/wN.png',
    wP: '../../../Images/Chesspieces/wP.png',
    bK: '../../../Images/Chesspieces/bK.png',
    bQ: '../../../Images/Chesspieces/bQ.png',
    bR: '../../../Images/Chesspieces/bR.png',
    bB: '../../../Images/Chesspieces/bB.png',
    bN: '../../../Images/Chesspieces/bN.png',
    bP: '../../../Images/Chesspieces/bP.png'
  };
  const FILES = ['a','b','c','d','e','f','g','h'];
  const RANKS = [8,7,6,5,4,3,2,1];

  const renderChessBoard = (fen) => {
    const board = document.getElementById('puzzle-board');
    if (!board) return;
    if (typeof Chess === 'undefined') {
      board.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Chess.js not loaded</div>';
      return;
    }
    currentGame = new Chess(fen);
    selectedSquare = null;
    usedHint = false;
    usedUndo = false;
    
    // System plays first move
    if (currentPuzzle && currentPuzzle.solution.length > 0) {
      const firstMove = currentPuzzle.solution[0];
      const move = currentGame.move({
        from: firstMove.slice(0, 2),
        to: firstMove.slice(2, 4),
        promotion: 'q'
      });
      if (move) {
        playerMoves.push(move.san);
        solutionIndex = 1;
        updateMovesList();
      }
    }
    
    updateBoardPieces();
  };

  const updateBoardPieces = () => {
    const board = document.getElementById('puzzle-board');
    if (!board || !currentGame) return;
    let html = '<div class="chess-grid">';
    
    // Get legal moves for highlighting
    const legalMovesSquares = [];
    if (selectedSquare && solutionIndex > 0) { // Only after first move played
      const moves = currentGame.moves({ square: selectedSquare, verbose: true });
      moves.forEach(m => legalMovesSquares.push(m.to));
    }
    
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = FILES[f] + RANKS[r];
        const isLight = (r + f) % 2 === 0;
        const piece = currentGame.get(sq);
        const pieceKey = piece ? (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase() : null;
        const pieceSrc = pieceKey ? PIECE_IMAGES[pieceKey] : '';
        const isSelected = sq === selectedSquare;
        const isLegalMove = legalMovesSquares.includes(sq);
        
        html += `<div class="square ${isLight ? 'light' : 'dark'}${isSelected ? ' selected' : ''}${isLegalMove ? ' legal-move' : ''}" data-square="${sq}">
          ${pieceSrc ? `<img class="piece" src="${pieceSrc}" alt="">` : ''}
          ${isLegalMove ? '<span class="legal-dot"></span>' : ''}
        </div>`;
      }
    }
    html += '</div>';
    board.innerHTML = html;
    
    // Add turn indicator
    const turnEl = document.getElementById('puzzle-to-move');
    if (turnEl) {
      const turn = currentGame.turn() === 'w' ? 'White to Move' : 'Black to Move';
      turnEl.textContent = turn;
    }
    
    board.querySelectorAll('.square').forEach(sq => {
      sq.addEventListener('click', () => handleSquareClick(sq.dataset.square));
    });
  };

  const handleSquareClick = (square) => {
    if (!currentGame || !currentPuzzle) return;
    const piece = currentGame.get(square);
    if (!selectedSquare) {
      if (piece && piece.color === currentGame.turn()) {
        selectedSquare = square;
        updateBoardPieces();
      }
    } else {
      if (square === selectedSquare) {
        selectedSquare = null;
        updateBoardPieces();
        return;
      }
      attemptMove(selectedSquare, square);
      selectedSquare = null;
    }
  };

  const attemptMove = (from, to) => {
    if (!currentGame || !currentPuzzle) return;
    const expectedMove = currentPuzzle.solution[solutionIndex];
    const move = currentGame.move({ from, to, promotion: 'q' });
    if (!move) { updateBoardPieces(); return; }

    playerMoves.push(move.san);
    updateMovesList();
    updateBoardPieces();

    const madeMove = from + to;
    if (madeMove === expectedMove) {
      solutionIndex++;
      if (solutionIndex >= currentPuzzle.solution.length) {
        handlePuzzleComplete(true);
      } else {
        // Play opponent reply
        const replyUCI = currentPuzzle.solution[solutionIndex];
        if (replyUCI) {
          setStatusMessage('correct-partial', '✓ Correct! Keep going…');
          setTimeout(() => {
            const replyMove = currentGame.move({
              from: replyUCI.slice(0, 2),
              to: replyUCI.slice(2, 4),
              promotion: 'q'
            });
            if (replyMove) {
              playerMoves.push(replyMove.san);
              solutionIndex++;
              updateMovesList();
              updateBoardPieces();
              if (solutionIndex >= currentPuzzle.solution.length) {
                handlePuzzleComplete(true);
              }
            }
          }, 500);
        }
      }
    } else {
      setStatusMessage('incorrect', 'Incorrect move. Try again or show solution.');
      handlePuzzleComplete(false);
    }
  };

  const updateMovesList = () => {
    const movesContent = document.getElementById('moves-content');
    if (!movesContent) return;
    if (playerMoves.length === 0) {
      movesContent.innerHTML = '<p class="no-moves">Make your first move</p>';
    } else {
      movesContent.innerHTML = playerMoves.map((m, i) =>
        `<div class="move-item"><span class="move-number">${i + 1}.</span><span class="move-san">${m}</span></div>`
      ).join('');
    }
  };

  const setStatusMessage = (type, message) => {
    const statusEl = document.getElementById('puzzle-status');
    if (!statusEl) return;
    const icons = { thinking: '', correct: '<i class="fa-solid fa-check"></i>', incorrect: '<i class="fa-solid fa-xmark"></i>', 'correct-partial': '<i class="fa-solid fa-thumbs-up"></i>' };
    statusEl.innerHTML = `
      <div class="status-message ${type}">
        <span class="status-icon" style="font-size:2em">${icons[type] || 'ℹ️'}</span>
        <p>${message}</p>
      </div>`;
  };

  const handlePuzzleComplete = (success) => {
    puzzleStats.attempted++;
    
    // Don't count if hints were used
    if (usedHint || usedUndo) {
      setStatusMessage('incorrect', 'Friendly (Hints used - not counted)');
      const nextBtn = document.getElementById('next-puzzle-btn');
      if (nextBtn && currentMode !== 'rush') nextBtn.classList.remove('hidden');
      const undoBtn = document.getElementById('undo-btn');
      if (undoBtn) undoBtn.disabled = true;
      
      // Auto-load next puzzle in Puzzle Rush
      if (currentMode === 'rush' && timeRemaining > 0) {
        setTimeout(() => { openPuzzleModal(); }, 1500);
      }
      return;
    }
    
    if (success) {
      puzzleStats.solved++;
      puzzleStats.battleStreak++;
      if (puzzleStats.battleStreak > puzzleStats.bestBattleStreak) {
        puzzleStats.bestBattleStreak = puzzleStats.battleStreak;
      }
      puzzleStats.battleRating += 10;
      if (currentPuzzle) {
        solvedPuzzleIds.add(currentPuzzle.id);
      }
      
      // Track correct in Puzzle Rush
      if (currentMode === 'rush') {
        correctCount++;
      }
      
      updateLeaderboard();
      setStatusMessage('correct', '🎉 Brilliant! Puzzle Solved!');
    } else {
      puzzleStats.battleStreak = 0;
      puzzleStats.battleRating = Math.max(100, puzzleStats.battleRating - 5);
      
      // Track mistakes in Puzzle Rush
      if (currentMode === 'rush' && currentPuzzle) {
        const mistake = {
          puzzleId: currentPuzzle.id,
          rating: currentPuzzle.rating,
          theme: currentPuzzle.theme,
          yourMoves: playerMoves.join(' → '),
          solution: currentPuzzle.solution.join(' → '),
          timestamp: new Date().toLocaleString(),
          improved: false // Will be set to true if they solve it later
        };
        if (!puzzleStats.mistakesInRush) puzzleStats.mistakesInRush = [];
        puzzleStats.mistakesInRush.push(mistake);
        
        wrongCount++;
        if (wrongCount >= 3) {
          clearInterval(timerInterval);
          setStatusMessage('incorrect', `❌ 3 Wrong Answers! Game Over!\n\nCorrect: ${correctCount}`);
          setTimeout(() => {
            alert(`❌ Game Over!\n\nCorrect Answers: ${correctCount}\nWrong Answers: ${wrongCount}`);
            closePuzzleModal();
          }, 1000);
          saveStats();
          return;
        }
      }
      
      setStatusMessage('incorrect', '❌ Incorrect. Better luck next time!');
    }
    saveStats();
    
    const nextBtn = document.getElementById('next-puzzle-btn');
    if (nextBtn && currentMode !== 'rush') nextBtn.classList.remove('hidden');
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) undoBtn.disabled = true;
    
    // Auto-load next puzzle in Puzzle Rush
    if (currentMode === 'rush' && timeRemaining > 0) {
      setTimeout(() => { openPuzzleModal(); }, 1500);
    }
  };

  // ==================== PUZZLE MODAL ====================
  const modal = document.getElementById('puzzle-modal');
  const closeBtn = document.querySelector('.close-puzzle');

  const openPuzzleModal = (theme = null, minRating = null, maxRating = null) => {
    if (!dbLoaded) {
      alert('⏳ Puzzle database is still loading, please wait a moment and try again.');
      return;
    }
    
    // Use mode-specific parameters if in theme or difficulty mode
    if (currentMode === 'theme' && currentTheme) {
      theme = currentTheme;
    } else if (currentMode === 'difficulty' && currentDifficulty) {
      const ranges = {
        easy:   [0,    1200],
        medium: [1200, 1800],
        hard:   [1800, 2400],
        expert: [2400, 5000]
      };
      [minRating, maxRating] = ranges[currentDifficulty] || [0, 5000];
    }
    
    currentPuzzle = getRandomPuzzle(theme, minRating, maxRating);
    if (!currentPuzzle) {
      alert('No unsolved puzzles found for this filter. Try a different theme or difficulty.');
      return;
    }
    playerMoves = [];
    solutionIndex = 0;
    selectedSquare = null;

    // Update puzzle info
    const titleEl = document.querySelector('.puzzle-info h3');
    if (titleEl) titleEl.textContent = currentPuzzle.theme || 'Chess Puzzle';
    const ratingEl = document.getElementById('current-puzzle-rating');
    if (ratingEl) ratingEl.textContent = currentPuzzle.rating;
    const themeEl = document.getElementById('current-puzzle-theme');
    if (themeEl) themeEl.textContent = currentPuzzle.theme;

    updateMovesList();
    setStatusMessage('thinking', '🧠 Find the best move for your side!');

    const nextBtn = document.getElementById('next-puzzle-btn');
    if (nextBtn && currentMode !== 'rush') nextBtn.classList.add('hidden');
    const undoBtn = document.getElementById('undo-btn');
    const hintBtn = document.getElementById('hint-btn');
    
    // Disable undo and hint in Puzzle Rush mode
    if (currentMode === 'rush') {
      if (undoBtn) undoBtn.style.display = 'none';
      if (hintBtn) hintBtn.style.display = 'none';
    } else {
      if (undoBtn) { undoBtn.style.display = 'block'; undoBtn.disabled = false; }
      if (hintBtn) hintBtn.style.display = 'block';
    }

    renderChessBoard(currentPuzzle.fen);
    if (modal) modal.classList.add('active');
  };

  const closePuzzleModal = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (modal) modal.classList.remove('active');
    currentPuzzle = null;
    if (currentMode === 'rush') {
      currentMode = null;
      correctCount = 0;
      wrongCount = 0;
    }
  };

  closeBtn?.addEventListener('click', closePuzzleModal);
  // FIXED: Modal should NOT close by clicking outside - only by X button
  // Removed: modal?.addEventListener('click', (e) => { if (e.target === modal) closePuzzleModal(); });

  // ==================== EVENT LISTENERS ====================

  // Daily Puzzle (2500+ rated)
  document.getElementById('daily-puzzle-btn')?.addEventListener('click', () => {
    const today = new Date().toDateString();
    if (puzzleStats.dailyPuzzleCompleted && puzzleStats.lastDailyDate === today) {
      alert('Daily Puzzle Already Completed!\n\nCome back tomorrow for a new challenge!');
      return;
    }
    openPuzzleModal(null, 2500, 5000);
    puzzleStats.dailyPuzzleCompleted = true;
    puzzleStats.lastDailyDate = today;
    saveStats();
  });

  // Custom Puzzle
  document.getElementById('custom-puzzle-btn')?.addEventListener('click', () => {
    const today = new Date().toDateString();
    if (puzzleStats.lastCustomDate !== today) {
      puzzleStats.customPuzzlesUsed = 0;
      puzzleStats.lastCustomDate = today;
    }
    if (puzzleStats.customPuzzlesUsed >= puzzleStats.customPuzzlesLimit) {
      alert(`Custom Puzzles Limit Reached!\n\nYou've used all ${puzzleStats.customPuzzlesLimit} custom puzzles for today.\nCome back tomorrow!`);
      return;
    }
    showCustomPuzzleModal();
  });

  // Puzzle Rush with time options
  document.getElementById('puzzle-rush-btn')?.addEventListener('click', () => {
    const today = new Date().toDateString();
    if (puzzleStats.lastRushDate !== today) {
      puzzleStats.dailyRushCompleted = 0;
      puzzleStats.lastRushDate = today;
    }
    if (puzzleStats.dailyRushCompleted >= puzzleStats.dailyRushLimit) {
      alert(`Puzzle Rush Daily Limit!\n\nCompleted: ${puzzleStats.dailyRushLimit}/${puzzleStats.dailyRushLimit}\n\nYou've used all free puzzles for today!`);
      return;
    }
    showRushStartScreen();
  });
  
  const showRushStartScreen = () => {
    const startModal = document.createElement('div');
    startModal.className = 'puzzle-modal active';
    startModal.innerHTML = `
      <div class="puzzle-modal-content" style="max-width:460px;padding:32px;border-radius:20px;background:var(--card, #1e1e2e);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <h3 style="margin:0;color:var(--text, #fff);">Puzzle Rush</h3>
          <button class="close-rush-start-modal" style="background:none;border:none;color:var(--text-muted,#888);font-size:2em;cursor:pointer;line-height:1">×</button>
        </div>
        <p style="color:var(--text-muted,#888);margin-bottom:24px;text-align:center;">Choose an option:</p>
        <button class="rush-play-btn" style="width:100%;padding:14px;margin-bottom:14px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;font-size:16px;">
          ▶ Play
        </button>
        <button class="rush-leaderboard-btn" style="width:100%;padding:14px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;font-size:16px;">
          🏆 Leaderboard
        </button>
      </div>
    `;
    document.body.appendChild(startModal);
    
    startModal.querySelector('.close-rush-start-modal').addEventListener('click', () => startModal.remove());
    startModal.querySelector('.rush-play-btn').addEventListener('click', () => {
      startModal.remove();
      showRushTimeModal();
    });
    startModal.querySelector('.rush-leaderboard-btn').addEventListener('click', () => {
      startModal.remove();
      showLeaderboard();
    });
  };
  
  const showRushTimeModal = () => {
    const rushModal = document.createElement('div');
    rushModal.className = 'puzzle-modal active';
    rushModal.innerHTML = `
      <div class="puzzle-modal-content" style="max-width:460px;padding:32px;border-radius:20px;background:var(--card, #1e1e2e);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <h3 style="margin:0;color:var(--text, #fff);">Choose Time Limit</h3>
          <button class="close-rush-modal" style="background:none;border:none;color:var(--text-muted,#888);font-size:2em;cursor:pointer;line-height:1">×</button>
        </div>
        <p style="color:var(--text-muted,#888);margin-bottom:20px;">Pick your challenge:</p>
        <button class="rush-time-btn" data-time="180" style="width:100%;padding:12px;margin-bottom:10px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;">
          ⏱ 3 Minutes
        </button>
        <button class="rush-time-btn" data-time="300" style="width:100%;padding:12px;margin-bottom:10px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;">
          ⏱ 5 Minutes
        </button>
        <button class="rush-time-btn" data-time="0" style="width:100%;padding:12px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;">
           ♾️ Survival (Unlimited)
        </button>
      </div>`;
    
    document.body.appendChild(rushModal);
    
    rushModal.querySelector('.close-rush-modal').addEventListener('click', () => {
      document.body.removeChild(rushModal);
    });
    
    rushModal.querySelectorAll('.rush-time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const timeLimit = parseInt(btn.dataset.time);
        document.body.removeChild(rushModal);
        startPuzzleRush(timeLimit);
      });
    });
  };
  
  const startPuzzleRush = (timeLimit) => {
    currentMode = 'rush';
    timeRemaining = timeLimit;
    correctCount = 0;
    wrongCount = 0;
    openPuzzleModal(null, null, null);
    
    if (timeLimit > 0) {
      // Start timer
      const timerEl = document.getElementById('puzzle-status');
      timerInterval = setInterval(() => {
        timeRemaining--;
        if (timerEl) {
          const mins = Math.floor(timeRemaining / 60);
          const secs = timeRemaining % 60;
          const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
          timerEl.innerHTML = `
            <div class="timer-display ${timeRemaining < 30 ? 'warning' : ''}">⏱️ ${timeStr}</div>
            <div class="correct-count">✓ ${correctCount} | ✗ ${wrongCount}</div>`;
        }
        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          alert(`Time's Up!\n\nCorrect Answers: ${correctCount}\nWrong Answers: ${wrongCount}`);
          closePuzzleModal();
        }
      }, 1000);
    } else {
      // Survival mode - no timer limit
      const timerEl = document.getElementById('puzzle-status');
      if (timerEl) {
        timerEl.innerHTML = `<div class="correct-count">✓ Correct: ${correctCount} | ✗ Wrong: ${wrongCount}</div>`;
      }
    }
    
    puzzleStats.dailyRushCompleted++;
    saveStats();
  };

  // Theme cards - stay in theme
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      currentMode = 'theme';
      currentTheme = card.dataset.theme;
      currentDifficulty = null;
      openPuzzleModal(card.dataset.theme);
    });
  });

  // Difficulty cards - stay in difficulty
  document.querySelectorAll('.difficulty-card').forEach(card => {
    card.addEventListener('click', () => {
      const ranges = {
        easy:   [0,    1200],
        medium: [1200, 1800],
        hard:   [1800, 2400],
        expert: [2400, 5000]
      };
      const [min, max] = ranges[card.dataset.difficulty] || [0, 5000];
      currentMode = 'difficulty';
      currentDifficulty = card.dataset.difficulty;
      currentTheme = null;
      openPuzzleModal(null, min, max);
    });
  });

  // Game mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.mode-card');
      const modeName = card?.querySelector('.mode-name')?.textContent || 'Mode';
      if (btn.classList.contains('premium-btn')) {
        alert(`${modeName}\n\nREMIUM Feature\n\nUpgrade to unlock!`);
      } else if (btn.classList.contains('battle-btn')) {
        alert(`${modeName}\n\n1v1 Competition\n\nRating: ${puzzleStats.battleRating}\nStreak: ${puzzleStats.battleStreak}\n\nComing soon!`);
      } else {
        alert(`${modeName}\n\nComing soon!`);
      }
    });
  });

  // Hint (disabled in Puzzle Rush)
  document.getElementById('hint-btn')?.addEventListener('click', () => {
    if (!currentPuzzle) return;
    const nextMove = currentPuzzle.solution[solutionIndex];
    if (nextMove) {
      usedHint = true;
      alert(`Hint:\nMove from ${nextMove.substring(0, 2)} to ${nextMove.substring(2, 4)}`);
    }
  });

  // Undo
  document.getElementById('undo-btn')?.addEventListener('click', () => {
    if (!currentGame || playerMoves.length === 0) return;
    currentGame.undo();
    playerMoves.pop();
    if (solutionIndex > 0) solutionIndex--;
    updateBoardPieces();
    updateMovesList();
  });

  // Show Solution
  document.getElementById('show-solution-btn')?.addEventListener('click', () => {
    if (!currentPuzzle) return;
    alert(`Solution:\n${currentPuzzle.solution.join(' → ')}\n\nThis counts as incorrect.`);
    handlePuzzleComplete(false);
  });

  // Skip
  document.getElementById('skip-puzzle-btn')?.addEventListener('click', () => {
    if (confirm('Skip this puzzle?')) closePuzzleModal();
  });

  // Next Puzzle
  document.getElementById('next-puzzle-btn')?.addEventListener('click', () => {
    openPuzzleModal();
  });

  // ==================== CUSTOM PUZZLE MODAL ====================
  const showCustomPuzzleModal = () => {
    const themeOptions = Object.keys(puzzleDatabase)
      .map(k => {
        const label = k.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
        return `<option value="${k}">${label} (${puzzleDatabase[k].length})</option>`;
      }).join('');

    const customModal = document.createElement('div');
    customModal.className = 'puzzle-modal active';
    customModal.innerHTML = `
      <div class="puzzle-modal-content" style="max-width:460px;padding:32px;border-radius:20px;background:var(--card, #1e1e2e);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <h3 style="margin:0;color:var(--text, #fff);">Custom Puzzle</h3>
          <button class="close-custom-modal" style="background:none;border:none;color:var(--text-muted,#888);font-size:2em;cursor:pointer;line-height:1">×</button>
        </div>
        <label style="display:block;color:var(--text-muted,#888);font-size:.88em;margin-bottom:6px;">THEME</label>
        <select id="custom-theme" style="width:100%;padding:10px 14px;background:var(--bg,#13131a);border:2px solid var(--border,#333);border-radius:8px;color:var(--text,#fff);margin-bottom:20px;font-size:1em;">
          <option value="random">Random</option>
          ${themeOptions}
        </select>
        <label style="display:block;color:var(--text-muted,#888);font-size:.88em;margin-bottom:6px;">
          TARGET RATING: <strong id="rating-display">1200</strong>
        </label>
        <input type="range" id="custom-rating" min="400" max="2800" value="1200" step="50"
          style="width:100%;accent-color:var(--accent,#00d4ff);margin-bottom:24px;">
        <button id="start-custom-puzzle"
          style="width:100%;padding:14px;background:var(--accent,#00d4ff);border:none;border-radius:10px;color:#000;font-size:1.05em;font-weight:700;cursor:pointer;">
          ♟ Start Puzzle
        </button>
      </div>`;

    document.body.appendChild(customModal);

    const ratingSlider = customModal.querySelector('#custom-rating');
    const ratingDisplay = customModal.querySelector('#rating-display');
    ratingSlider.addEventListener('input', (e) => { ratingDisplay.textContent = e.target.value; });

    customModal.querySelector('.close-custom-modal').addEventListener('click', () => {
      document.body.removeChild(customModal);
    });

    customModal.querySelector('#start-custom-puzzle').addEventListener('click', () => {
      const rating = parseInt(ratingSlider.value);
      const theme = customModal.querySelector('#custom-theme').value;
      const minRating = Math.max(100, rating - 150);
      const maxRating = Math.min(4250, rating + 150);
      puzzleStats.customPuzzlesUsed++;
      saveStats();
      document.body.removeChild(customModal);
      
      // Set mode for custom puzzles
      currentMode = 'custom';
      if (theme !== 'random') {
        currentTheme = theme;
      }
      
      openPuzzleModal(theme === 'random' ? null : theme, minRating, maxRating);
    });
  };

  // ==================== RESET STATS ====================
  window.resetPuzzleStats = () => {
    if (confirm('Reset all puzzle statistics?')) {
      localStorage.removeItem('puzzleStats');
      puzzleStats = {
        solved: 0, attempted: 0, accuracy: 0,
        dailyRushCompleted: 0, dailyRushLimit: 3,
        customPuzzlesUsed: 0, customPuzzlesLimit: 10,
        battleRating: 1200, battleWins: 0, battleLosses: 0,
        battleStreak: 0, bestBattleStreak: 0,
        themeProgress: {},
        dailyPuzzleCompleted: false,
        lastDailyDate: null, lastRushDate: null, lastCustomDate: null,
        solvedPuzzleIds: [],
        leaderboard: { personal: [], friends: [], global: [] },
        puzzlesWithHints: []
      };
      solvedPuzzleIds.clear();
      saveStats();
      alert('Puzzle statistics reset!');
    }
  };

  // ==================== BOARD CSS ====================
  const style = document.createElement('style');
  style.textContent = `
    .chess-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      grid-template-rows: repeat(8, 1fr);
      width: 100%;
      aspect-ratio: 1 / 1;
      border: 3px solid var(--border, #333);
      border-radius: 8px;
      overflow: hidden;
      background: #f0d9b5;
    }
    .square {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: filter 0.1s;
      min-height: 0;
      min-width: 0;
      aspect-ratio: 1 / 1;
    }
    .square.light { background: #f0d9b5; }
    .square.dark  { background: #b58863; }
    .square.selected { box-shadow: inset 0 0 0 4px rgba(80,160,255,0.9); }
    .square:hover { filter: brightness(1.15); }
    .piece {
      font-size: 3.5rem;
      cursor: grab;
      user-select: none;
      pointer-events: none;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .piece:active { cursor: grabbing; }
    .move-item {
      display: flex;
      gap: 8px;
      padding: 4px 0;
      font-size: 0.9em;
      border-bottom: 1px solid var(--border, #333);
    }
    .move-number { color: var(--text-muted, #888); min-width: 24px; }
    .move-san    { font-weight: 600; color: var(--text, #fff); }
    .status-message {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status-message p { margin: 0; font-size: 1em; color: var(--text, #fff); }
    .no-moves { color: var(--text-muted, #888); font-size: 0.9em; margin: 0; }
    .timer-display {
      font-size: 2em;
      font-weight: bold;
      color: var(--accent, #00d4ff);
      text-align: center;
      padding: 10px;
    }
    .timer-display.warning { color: #ff6b6b; }
    .correct-count {
      font-size: 1.5em;
      font-weight: bold;
      color: #22c55e;
      text-align: center;
      padding: 10px;
    }
  `;
  document.head.appendChild(style);

  // ==================== LEADERBOARD ====================
  const updateLeaderboard = () => {
    const entry = {
      date: new Date().toLocaleString(),
      solved: puzzleStats.solved,
      accuracy: puzzleStats.attempted > 0 ? Math.round((puzzleStats.solved / puzzleStats.attempted) * 100) : 0,
      rating: puzzleStats.battleRating
    };
    
    if (!puzzleStats.leaderboard) puzzleStats.leaderboard = { personal: [], friends: [], global: [] };
    puzzleStats.leaderboard.personal = puzzleStats.leaderboard.personal || [];
    puzzleStats.leaderboard.personal.unshift(entry);
    puzzleStats.leaderboard.personal = puzzleStats.leaderboard.personal.slice(0, 10); // Keep top 10
    saveStats();
  };
  
  window.showLeaderboard = () => {
    const mistakes = puzzleStats.mistakesInRush || [];
    const leaderboardModal = document.createElement('div');
    leaderboardModal.className = 'leaderboard-modal';
    leaderboardModal.innerHTML = `
      <div class="leaderboard-content">
        <div class="leaderboard-header">
          <h2>🏆 Leaderboard</h2>
          <div>
            <button id="download-btn" style="background: #4a90e2; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-right: 10px; font-weight: bold;">⬇️ Download Data</button>
            <button class="close-leaderboard" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">✕</button>
          </div>
        </div>
        
        <div class="leaderboard-tabs">
          <button class="tab-btn active" data-tab="personal">Personal</button>
          <button class="tab-btn" data-tab="friends">Friends</button>
          <button class="tab-btn" data-tab="global">Global</button>
          <button class="tab-btn" data-tab="mistakes">Mistakes (${mistakes.length})</button>
        </div>
        
        <div id="personal-tab" class="tab-content active">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Solved</th>
                <th>Accuracy</th>
                <th>Rating</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${(puzzleStats.leaderboard?.personal || []).length > 0 
                ? (puzzleStats.leaderboard.personal || []).map((p, i) => `
                  <tr>
                    <td>${i+1}</td>
                    <td>${p.solved}</td>
                    <td>${p.accuracy}%</td>
                    <td>${p.rating}</td>
                    <td>${p.date}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="5" style="text-align: center; color: #999;">No records yet</td></tr>'
              }
            </tbody>
          </table>
        </div>
        
        <div id="friends-tab" class="tab-content">
          <p style="text-align: center; color: #999;">Friends feature coming soon</p>
        </div>
        
        <div id="global-tab" class="tab-content">
          <p style="text-align: center; color: #999;">Global rankings coming soon</p>
        </div>
        
        <div id="mistakes-tab" class="tab-content">
          <div style="margin-bottom: 15px;">
            <button class="mistake-filter-btn active" data-filter="all" style="margin-right: 10px; padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">All (${mistakes.length})</button>
            <button class="mistake-filter-btn" data-filter="done" style="margin-right: 10px; padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">Done (${mistakes.filter(m => m.improved).length})</button>
            <button class="mistake-filter-btn" data-filter="not-done" style="padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">Not Done (${mistakes.filter(m => !m.improved).length})</button>
          </div>
          <div id="mistakes-list">
            ${mistakes.length === 0 
              ? '<p style="text-align: center; color: #999;">No mistakes yet! Great job!</p>'
              : mistakes.map((m, i) => `
                <div class="mistake-item" style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 10px; background: ${m.improved ? '#e8f5e9' : '#fff3e0'};">
                  <div style="font-weight: bold; color: #333;">Mistake ${i+1}: ${m.theme} (Rating: ${m.rating})</div>
                  <div style="font-size: 12px; color: #666; margin: 6px 0;">Your moves: ${m.yourMoves}</div>
                  <div style="font-size: 12px; color: #666;">Solution: ${m.solution}</div>
                  <div style="font-size: 11px; color: #999; margin-top: 6px;">${m.timestamp} ${m.improved ? '✅ Improved' : '⏳ Still Working'}</div>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>
    `;
    
    const style = document.createElement('style');
    style.innerHTML = `
      .leaderboard-modal {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
        z-index: 10000;
      }
      .leaderboard-content {
        background: white; border-radius: 8px; width: 90%; max-width: 700px;
        max-height: 80vh; overflow-y: auto; padding: 20px;
      }
      .leaderboard-header {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
      }
      .leaderboard-header h2 { margin: 0; color: #333; }
      .leaderboard-header div { display: flex; align-items: center; gap: 10px; }
      .close-leaderboard {
        background: none; border: none; font-size: 24px; cursor: pointer; color: #666;
      }
      .leaderboard-tabs {
        display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #ddd; flex-wrap: wrap;
      }
      .tab-btn {
        background: none; border: none; padding: 10px 16px; cursor: pointer;
        font-size: 14px; color: #666; border-bottom: 2px solid transparent;
      }
      .tab-btn.active {
        color: #4a90e2; border-bottom-color: #4a90e2; font-weight: bold;
      }
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      .leaderboard-table {
        width: 100%; border-collapse: collapse; font-size: 13px;
      }
      .leaderboard-table th {
        background: #f5f5f5; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;
      }
      .leaderboard-table td {
        padding: 10px; border-bottom: 1px solid #eee;
      }
      .leaderboard-table tr:hover {
        background: #f9f9f9;
      }
      .mistake-filter-btn.active {
        background: #4a90e2 !important; color: white !important; border-color: #4a90e2 !important;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(leaderboardModal);
    
    // Download handler
    leaderboardModal.querySelector('#download-btn').addEventListener('click', () => {
      const allPuzzlesData = {
        timestamp: new Date().toLocaleString(),
        stats: puzzleStats,
        solvedPuzzles: Array.from(solvedPuzzleIds),
        sessionId: sessionID
      };
      const dataStr = JSON.stringify(allPuzzlesData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `puzzle-data-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    
    // Tab switching
    leaderboardModal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        leaderboardModal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        leaderboardModal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.dataset.tab + '-tab';
        document.getElementById(tabId).classList.add('active');
      });
    });
    
    // Mistake filter
    leaderboardModal.querySelectorAll('.mistake-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        leaderboardModal.querySelectorAll('.mistake-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const mistakesList = leaderboardModal.querySelector('#mistakes-list');
        const items = mistakesList.querySelectorAll('.mistake-item');
        items.forEach(item => {
          if (filter === 'all') {
            item.style.display = 'block';
          } else if (filter === 'done') {
            item.style.display = item.textContent.includes('✅') ? 'block' : 'none';
          } else if (filter === 'not-done') {
            item.style.display = item.textContent.includes('⏳') ? 'block' : 'none';
          }
        });
      });
    });
    
    leaderboardModal.querySelector('.close-leaderboard').addEventListener('click', () => leaderboardModal.remove());
  };
  
  // Special Game Mode: Speed Challenge
  window.startSpeedChallenge = () => {
    currentMode = 'speed';
    timeRemaining = 10; // 10 seconds per puzzle
    correctCount = 0;
    openPuzzleModal();
    
    const speedInterval = setInterval(() => {
      timeRemaining--;
      const timerEl = document.getElementById('puzzle-status');
      if (timerEl) {
        timerEl.innerHTML = `
          <div class="timer-display ${timeRemaining < 3 ? 'warning' : ''}">⏱ ${timeRemaining}s</div>
          <div class="correct-count">✓ ${correctCount}</div>`;
      }
      if (timeRemaining <= 0) {
        clearInterval(speedInterval);
        alert(`⚡ Speed Challenge Complete!\\n\\nCorrect: ${correctCount}`);
        closePuzzleModal();
        currentMode = null;
      }
    }, 1000);
  };

  // ==================== INIT ====================
  loadStats();
  loadPuzzleDatabase().then(() => {
    console.log('✅ Puzzle system initialized!');
    if (dbLoaded) {
      console.log(`📊 Total puzzles: ${allPuzzlesFlat.length.toLocaleString()}`);
    }
    console.log('🎯 Daily limits: Rush 15, Custom 10');
    console.log('⚙️ Using Chess.js library');
  });

});