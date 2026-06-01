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

<<<<<<< HEAD
=======
  // ==================== GLOBAL STATE ====================
  let globalLeaderboard = [];
  let dailyPuzzleOfDay = null; // Stores the selected daily puzzle for today (same for all users)
  
  // Load global leaderboard from localStorage
  const loadGlobalLeaderboard = () => {
    try {
      const saved = localStorage.getItem('globalLeaderboard');
      if (saved) {
        globalLeaderboard = JSON.parse(saved);
        // Keep only top 100
        globalLeaderboard = globalLeaderboard
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timeTaken - b.timeTaken;
          })
          .slice(0, 100);
      }
    } catch (e) { console.error('Error loading global leaderboard:', e); }
  };
  
  const saveGlobalLeaderboard = () => {
    try {
      globalLeaderboard = globalLeaderboard
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.timeTaken - b.timeTaken;
        })
        .slice(0, 100);
      localStorage.setItem('globalLeaderboard', JSON.stringify(globalLeaderboard));
    } catch (e) { console.error('Error saving global leaderboard:', e); }
  };

>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
    mistakesInRush: [], // Tracks mistakes made in Puzzle Rush - array of { puzzleId, rating, theme, moved, solution }
=======
    mistakesInRush: [], // Tracks mistakes made in Puzzle Rush - array of { puzzleId, rating, theme, yourMoves, solution, timestamp, improved, attempts }
    themeUsage: {}, // Track puzzles per theme
    difficultyUsage: {}, // Track puzzles per difficulty
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
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
=======
  // Seeded random for daily puzzles (same puzzle for everyone on same day)
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  const getDailyPuzzle = (theme = null) => {
    if (!dbLoaded || allPuzzlesFlat.length === 0) return null;
    
    // Check if user already played today
    const today = new Date().toDateString();
    if (puzzleStats.dailyPuzzleCompleted && puzzleStats.lastDailyDate === today) {
      showModal('Daily Puzzle Complete', 'You have already completed today\'s daily puzzle.\n\nCome back tomorrow for a new one!');
      return null;
    }
    
    // If daily puzzle not yet selected for today, select it now (same for all users)
    if (!dailyPuzzleOfDay || !dailyPuzzleOfDay.date || dailyPuzzleOfDay.date !== today) {
      // Create consistent seed from date - same for all users
      const dateParts = today.split(' '); // "Wed May 28 2026"
      const dayOfYear = Math.floor((new Date(today) - new Date(today.split(' ')[3], 0, 1)) / 86400000);
      const seed = dayOfYear + parseInt(today.split(' ')[3]); // Day of year + year
      
      // Get 2500+ rated puzzles only for daily
      const dailyPuzzles = allPuzzlesFlat.filter(p => p.rating >= 2500);
      if (dailyPuzzles.length === 0) {
        dailyPuzzleOfDay = { date: today, puzzle: allPuzzlesFlat[0] };
      } else {
        const randomIndex = seed % dailyPuzzles.length;
        dailyPuzzleOfDay = { date: today, puzzle: dailyPuzzles[randomIndex] };
      }
    }
    
    return dailyPuzzleOfDay.puzzle;
  };
  
  const getRandomPuzzle = (theme = null, minRating = null, maxRating = null, excludeSolved = true) => {
    if (!dbLoaded || allPuzzlesFlat.length === 0) return null;
    
    let puzzles = [];
    
    // Quick path: If theme specified, use pre-categorized theme bucket (FAST)
    if (theme && puzzleDatabase[theme] && puzzleDatabase[theme].length > 0) {
      puzzles = puzzleDatabase[theme].slice(); // Copy array
    } else {
      puzzles = allPuzzlesFlat.slice(); // Copy all puzzles
    }
    
    // Apply rating filter (FAST - binary search could be used but linear is fine)
    if (minRating !== null || maxRating !== null) {
      const min = minRating || 0;
      const max = maxRating || 5000;
      puzzles = puzzles.filter(p => p.rating >= min && p.rating <= max);
    }
    
    // Apply solved filter (FAST - Set lookup is O(1))
    if (excludeSolved) {
      puzzles = puzzles.filter(p => !solvedPuzzleIds.has(p.id));
    }
    
    // Return random or first available
    if (puzzles.length === 0) return null;
    return puzzles[Math.floor(Math.random() * puzzles.length)];
  };

  // ==================== MODAL HELPER ====================
  const showModal = (title, message, buttons = []) => {
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;';
    
    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: white; border-radius: 12px; padding: 24px; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); color: #333;';
    
    const titleEl = document.createElement('h2');
    titleEl.style.cssText = 'margin: 0 0 16px 0; font-size: 20px; font-weight: bold; color: #222;';
    titleEl.textContent = title;
    
    const messageEl = document.createElement('p');
    messageEl.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #555; white-space: pre-wrap;';
    messageEl.textContent = message;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';
    
    (buttons.length === 0 ? [{text: 'OK', action: () => {}}] : buttons).forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.text;
      button.style.cssText = 'padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; background: #4a90e2; color: white;';
      button.addEventListener('click', () => {
        btn.action?.();
        modalOverlay.remove();
      });
      buttonContainer.appendChild(button);
    });
    
    modalBox.appendChild(titleEl);
    modalBox.appendChild(messageEl);
    modalBox.appendChild(buttonContainer);
    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
=======
  let puzzleStartTime = 0; // Track when puzzle started
  let rushStartTime = 0; // Track when rush session started
  let rushPuzzleCount = 0; // Track puzzle # in rush (for ascending difficulty)
  let usedPuzzleIdsInRush = new Set(); // Avoid repeating same puzzle in rush
>>>>>>> ff605ed (improvements)

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

<<<<<<< HEAD
=======
  let wrongAttempts = 0; // Track wrong attempts on current puzzle
  
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
=======
      wrongAttempts = 0; // Reset on correct move
>>>>>>> ff605ed (improvements)
      solutionIndex++;
      if (solutionIndex >= currentPuzzle.solution.length) {
        handlePuzzleComplete(true);
      } else {
        // Play opponent reply
        const replyUCI = currentPuzzle.solution[solutionIndex];
        if (replyUCI) {
<<<<<<< HEAD
          setStatusMessage('correct-partial', '✓ Correct! Keep going…');
=======
          setStatusMessage('correct-partial', 'Correct! Keep going...');
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
      setStatusMessage('incorrect', 'Incorrect move. Try again or show solution.');
      handlePuzzleComplete(false);
=======
      wrongAttempts++;
      // Undo the wrong move
      const lastMove = playerMoves.pop();
      currentGame.undo();
      updateMovesList();
      updateBoardPieces();
      
      // DAILY MODE: Show "Wrong" message and undo only (don't auto-advance)
      if (currentMode === 'daily') {
        setStatusMessage('incorrect', 'Wrong move. Try again.');
        return;
      }
      
      // INSTANT: Count as wrong and immediately load next puzzle (no solution shown)
      if (currentMode === 'rush') {
        wrongCount++;
        
        // Check if 3 wrong = game over
        if (wrongCount >= 3) {
          clearInterval(timerInterval);
          const timeTaken = Math.round((Date.now() - rushStartTime) / 1000);
          const timeDisplay = `${Math.floor(timeTaken / 60)}:${(timeTaken % 60).toString().padStart(2, '0')}`;
          // Update leaderboard ONLY at end of rush session (3 wrongs)
          updateLeaderboard(correctCount, wrongCount, timeTaken);
          setStatusMessage('incorrect', `3 Wrong! Game Over!\nCorrect: ${correctCount} | Time: ${timeDisplay}`);
          setTimeout(() => {
            showModal('Puzzle Rush Over', `Correct: ${correctCount}\nWrong: ${wrongCount}\nTime: ${timeDisplay}`, [{text: 'OK', action: closePuzzleModal}]);
          }, 500);
          return;
        }
        
        // Load next puzzle immediately without showing solution
        setTimeout(() => { openPuzzleModal(); }, 300);
      } else {
        // Non-rush mode: Show message and load next
        setStatusMessage('incorrect', 'Wrong move. Loading next puzzle...');
        setTimeout(() => { openPuzzleModal(); }, 300);
      }
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
=======
    const timeTaken = Math.round((Date.now() - puzzleStartTime) / 1000); // Time in seconds
>>>>>>> ff605ed (improvements)
    
    // Don't count if hints were used
    if (usedHint || usedUndo) {
      setStatusMessage('incorrect', 'Friendly (Hints used - not counted)');
      const nextBtn = document.getElementById('next-puzzle-btn');
<<<<<<< HEAD
      if (nextBtn && currentMode !== 'rush') nextBtn.classList.remove('hidden');
      const undoBtn = document.getElementById('undo-btn');
      if (undoBtn) undoBtn.disabled = true;
      
      // Auto-load next puzzle in Puzzle Rush
      if (currentMode === 'rush' && timeRemaining > 0) {
=======
      const gameMode = currentMode === 'rush' || currentMode === 'blitz' || currentMode === 'marathon' || currentMode === 'streak';
      if (nextBtn && !gameMode) nextBtn.classList.remove('hidden');
      const undoBtn = document.getElementById('undo-btn');
      if (undoBtn) undoBtn.disabled = true;
      
      // Auto-load next puzzle in game modes
      if (gameMode && timeRemaining !== 0) {
        setTimeout(() => { loadNextRushPuzzle(); }, 1500);
      } else if (!gameMode) {
>>>>>>> ff605ed (improvements)
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
      
<<<<<<< HEAD
      // Track correct in Puzzle Rush
      if (currentMode === 'rush') {
        correctCount++;
      }
      
      updateLeaderboard();
      setStatusMessage('correct', '🎉 Brilliant! Puzzle Solved!');
=======
      // Mark daily puzzle as completed if in daily mode
      if (currentMode === 'daily') {
        puzzleStats.dailyPuzzleCompleted = true;
        puzzleStats.lastDailyDate = new Date().toDateString();
      }
      
      // Track correct in Puzzle Rush
      if (currentMode === 'rush') {
        correctCount++;
        // DON'T update leaderboard on each correct - only at session end
      }
      
      setStatusMessage('correct', 'Brilliant! Puzzle Solved!');
>>>>>>> ff605ed (improvements)
    } else {
      puzzleStats.battleStreak = 0;
      puzzleStats.battleRating = Math.max(100, puzzleStats.battleRating - 5);
      
<<<<<<< HEAD
      // Track mistakes in Puzzle Rush
      if (currentMode === 'rush' && currentPuzzle) {
=======
      // Track mistakes in game modes
      if ((currentMode === 'rush' || currentMode === 'blitz' || currentMode === 'marathon' || currentMode === 'streak') && currentPuzzle) {
>>>>>>> ff605ed (improvements)
        const mistake = {
          puzzleId: currentPuzzle.id,
          rating: currentPuzzle.rating,
          theme: currentPuzzle.theme,
<<<<<<< HEAD
          yourMoves: playerMoves.join(' → '),
          solution: currentPuzzle.solution.join(' → '),
          timestamp: new Date().toLocaleString(),
          improved: false // Will be set to true if they solve it later
=======
          fen: currentPuzzle.fen,
          solution: currentPuzzle.solution,
          yourMoves: playerMoves.join(' → '),
          timestamp: new Date().toLocaleString(),
          improved: false,
          attempts: 1 // Track retry attempts
>>>>>>> ff605ed (improvements)
        };
        if (!puzzleStats.mistakesInRush) puzzleStats.mistakesInRush = [];
        puzzleStats.mistakesInRush.push(mistake);
        
        wrongCount++;
<<<<<<< HEAD
        if (wrongCount >= 3) {
          clearInterval(timerInterval);
          setStatusMessage('incorrect', `❌ 3 Wrong Answers! Game Over!\n\nCorrect: ${correctCount}`);
          setTimeout(() => {
            alert(`❌ Game Over!\n\nCorrect Answers: ${correctCount}\nWrong Answers: ${wrongCount}`);
            closePuzzleModal();
=======
        
        // Streak mode: 1 wrong = game over
        if (currentMode === 'streak' && wrongCount >= 1) {
          clearInterval(timerInterval);
          const rushDuration = Math.round((Date.now() - rushStartTime) / 1000);
          setStatusMessage('incorrect', `Streak Broken! Perfect: ${correctCount}`);
          setTimeout(() => {
            showModal('Streak Broken!', `Perfect Streak: ${correctCount}\nTime: ${rushDuration}s`, [{text: 'OK', action: closePuzzleModal}]);
            currentMode = null;
          }, 1000);
          saveStats();
          return;
        }
        
        // Rush/Blitz/Marathon mode: 3 wrongs = game over
        if ((currentMode === 'rush' || currentMode === 'blitz' || currentMode === 'marathon') && wrongCount >= 3) {
          clearInterval(timerInterval);
          setStatusMessage('incorrect', `3 Wrong Answers! Game Over! Correct: ${correctCount}`);
          setTimeout(() => {
            showModal('Game Over', `Correct Answers: ${correctCount}\nWrong Answers: 3\nPuzzles: ${rushPuzzleCount}`, [{text: 'OK', action: closePuzzleModal}]);
            currentMode = null;
>>>>>>> ff605ed (improvements)
          }, 1000);
          saveStats();
          return;
        }
      }
      
<<<<<<< HEAD
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
=======
      setStatusMessage('incorrect', 'Incorrect. Better luck next time!');
    }
    saveStats();
    
    // Hide all control buttons EXCEPT Next (in non-rush modes)
    const nextBtn = document.getElementById('next-puzzle-btn');
    const gameMode = currentMode === 'rush' || currentMode === 'blitz' || currentMode === 'marathon' || currentMode === 'streak';
    const undoBtn = document.getElementById('undo-btn');
    const hintBtn = document.getElementById('hint-btn');
    const solutionBtn = document.getElementById('show-solution-btn');
    const skipBtn = document.getElementById('skip-puzzle-btn');
    
    if (!gameMode) {
      // Non-rush mode: Show ONLY Next button, hide all others
      if (nextBtn) nextBtn.classList.remove('hidden');
      if (undoBtn) undoBtn.style.display = 'none';
      if (hintBtn) hintBtn.style.display = 'none';
      if (solutionBtn) solutionBtn.style.display = 'none';
      if (skipBtn) skipBtn.style.display = 'none';
    } else {
      // Game modes: hide everything (auto-advance)
      if (nextBtn) nextBtn.classList.add('hidden');
    }
    
    // Auto-load next puzzle in game modes or regular puzzle
    if (gameMode && timeRemaining !== 0) {
      setTimeout(() => { loadNextRushPuzzle(); }, 1500);
    } else if (!gameMode) {
      // Don't auto-advance in normal mode - wait for Next click
>>>>>>> ff605ed (improvements)
    }
  };

  // ==================== PUZZLE MODAL ====================
  const modal = document.getElementById('puzzle-modal');
  const closeBtn = document.querySelector('.close-puzzle');

  const openPuzzleModal = (theme = null, minRating = null, maxRating = null) => {
    if (!dbLoaded) {
<<<<<<< HEAD
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
=======
      showModal('Loading', 'Puzzle database is still loading. Please wait a moment and try again.');
      return;
    }
    
    // Handle daily puzzle mode (checks for already completed today)
    if (currentMode === 'daily') {
      currentPuzzle = getDailyPuzzle();
      if (!currentPuzzle) return;  // getDailyPuzzle will show blocking modal if already done
    } else {
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
      
      // Check puzzle limits for theme mode
      if (currentMode === 'theme' && theme) {
        if (!puzzleStats.themeUsage) puzzleStats.themeUsage = {};
        const today = new Date().toDateString();
        const themeKey = `${theme}_${today}`;
        if (!puzzleStats.themeUsage[themeKey]) puzzleStats.themeUsage[themeKey] = 0;
        
        if (puzzleStats.themeUsage[themeKey] >= 30) {
          showModal('Theme Limit', `You have solved 30 puzzles for ${theme} today. Come back tomorrow!`);
          return;
        }
        puzzleStats.themeUsage[themeKey]++;
      }
      
      // Check puzzle limits for difficulty mode
      if (currentMode === 'difficulty' && currentDifficulty) {
        if (!puzzleStats.difficultyUsage) puzzleStats.difficultyUsage = {};
        const today = new Date().toDateString();
        const diffKey = `${currentDifficulty}_${today}`;
        if (!puzzleStats.difficultyUsage[diffKey]) puzzleStats.difficultyUsage[diffKey] = 0;
        
        if (puzzleStats.difficultyUsage[diffKey] >= 30) {
          showModal('Difficulty Limit', `You have solved 30 ${currentDifficulty} puzzles today. Come back tomorrow!`);
          return;
        }
        puzzleStats.difficultyUsage[diffKey]++;
      }
      
      currentPuzzle = getRandomPuzzle(theme, minRating, maxRating);
      if (!currentPuzzle) {
        showModal('No Puzzles', 'No unsolved puzzles found for this filter. Try a different theme or difficulty.');
        return;
      }
    }
    
    playerMoves = [];
    solutionIndex = 0;
    selectedSquare = null;
    wrongAttempts = 0; // Reset wrong attempts for new puzzle
    puzzleStartTime = Date.now(); // Start timing this puzzle
>>>>>>> ff605ed (improvements)

    // Update puzzle info
    const titleEl = document.querySelector('.puzzle-info h3');
    if (titleEl) titleEl.textContent = currentPuzzle.theme || 'Chess Puzzle';
    const ratingEl = document.getElementById('current-puzzle-rating');
    if (ratingEl) ratingEl.textContent = currentPuzzle.rating;
    const themeEl = document.getElementById('current-puzzle-theme');
    if (themeEl) themeEl.textContent = currentPuzzle.theme;

    updateMovesList();
<<<<<<< HEAD
    setStatusMessage('thinking', '🧠 Find the best move for your side!');
=======
    setStatusMessage('thinking', 'Find the best move for your side!');
>>>>>>> ff605ed (improvements)

    const nextBtn = document.getElementById('next-puzzle-btn');
    if (nextBtn && currentMode !== 'rush') nextBtn.classList.add('hidden');
    const undoBtn = document.getElementById('undo-btn');
    const hintBtn = document.getElementById('hint-btn');
<<<<<<< HEAD
    
    // Disable undo and hint in Puzzle Rush mode
    if (currentMode === 'rush') {
      if (undoBtn) undoBtn.style.display = 'none';
      if (hintBtn) hintBtn.style.display = 'none';
    } else {
      if (undoBtn) { undoBtn.style.display = 'block'; undoBtn.disabled = false; }
      if (hintBtn) hintBtn.style.display = 'block';
    }

    renderChessBoard(currentPuzzle.fen);
=======
    const solutionBtn = document.getElementById('show-solution-btn');
    
    // Disable undo, hint, and solution in Puzzle Rush mode
    if (currentMode === 'rush') {
      if (undoBtn) undoBtn.style.display = 'none';
      if (hintBtn) hintBtn.style.display = 'none';
      if (solutionBtn) solutionBtn.style.display = 'none';
    } else {
      if (undoBtn) { undoBtn.style.display = 'block'; undoBtn.disabled = false; }
      if (hintBtn) hintBtn.style.display = 'block';
      if (solutionBtn) solutionBtn.style.display = 'block';
    }

    renderChessBoard(currentPuzzle.fen);
    // Re-enable board for new puzzle
    const board = document.getElementById('puzzle-board');
    if (board) board.style.pointerEvents = 'auto';
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
    const today = new Date().toDateString();
    if (puzzleStats.dailyPuzzleCompleted && puzzleStats.lastDailyDate === today) {
      alert('Daily Puzzle Already Completed!\n\nCome back tomorrow for a new challenge!');
      return;
    }
    openPuzzleModal(null, 2500, 5000);
    puzzleStats.dailyPuzzleCompleted = true;
    puzzleStats.lastDailyDate = today;
    saveStats();
=======
    currentMode = 'daily';
    // Everyone gets the same puzzle every day using seeded random
    // No restriction on attempts - users can try multiple times
    openPuzzleModal(null, 2500, 5000);
>>>>>>> ff605ed (improvements)
  });

  // Custom Puzzle
  document.getElementById('custom-puzzle-btn')?.addEventListener('click', () => {
    const today = new Date().toDateString();
    if (puzzleStats.lastCustomDate !== today) {
      puzzleStats.customPuzzlesUsed = 0;
      puzzleStats.lastCustomDate = today;
    }
    if (puzzleStats.customPuzzlesUsed >= puzzleStats.customPuzzlesLimit) {
<<<<<<< HEAD
      alert(`Custom Puzzles Limit Reached!\n\nYou've used all ${puzzleStats.customPuzzlesLimit} custom puzzles for today.\nCome back tomorrow!`);
=======
      showModal('Limit Reached', `You have used all ${puzzleStats.customPuzzlesLimit} custom puzzles for today. Come back tomorrow!`);
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
      alert(`Puzzle Rush Daily Limit!\n\nCompleted: ${puzzleStats.dailyRushLimit}/${puzzleStats.dailyRushLimit}\n\nYou've used all free puzzles for today!`);
=======
      showModal('Daily Limit', `You have completed ${puzzleStats.dailyRushLimit} rushes today. Come back tomorrow!`);
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
          ▶ Play
        </button>
        <button class="rush-leaderboard-btn" style="width:100%;padding:14px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;font-size:16px;">
          🏆 Leaderboard
=======
          Play
        </button>
        <button class="rush-leaderboard-btn" style="width:100%;padding:14px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;font-size:16px;">
          Leaderboard
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
          ⏱ 3 Minutes
        </button>
        <button class="rush-time-btn" data-time="300" style="width:100%;padding:12px;margin-bottom:10px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;">
          ⏱ 5 Minutes
        </button>
        <button class="rush-time-btn" data-time="0" style="width:100%;padding:12px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;">
           ♾️ Survival (Unlimited)
=======
          3 Minutes
        </button>
        <button class="rush-time-btn" data-time="300" style="width:100%;padding:12px;margin-bottom:10px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;">
          5 Minutes
        </button>
        <button class="rush-time-btn" data-time="0" style="width:100%;padding:12px;background:var(--accent,#00d4ff);border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;">
           Survival (Unlimited)
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
    openPuzzleModal(null, null, null);
=======
    rushPuzzleCount = 0;
    usedPuzzleIdsInRush.clear();
    rushStartTime = Date.now(); // Track start of rush session
    
    // For ascending difficulty: start easy and get progressively harder
    loadNextRushPuzzle();
>>>>>>> ff605ed (improvements)
    
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
<<<<<<< HEAD
            <div class="timer-display ${timeRemaining < 30 ? 'warning' : ''}">⏱️ ${timeStr}</div>
            <div class="correct-count">✓ ${correctCount} | ✗ ${wrongCount}</div>`;
        }
        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          alert(`Time's Up!\n\nCorrect Answers: ${correctCount}\nWrong Answers: ${wrongCount}`);
          closePuzzleModal();
=======
            <div class="timer-display ${timeRemaining < 30 ? 'warning' : ''}">Time: ${timeStr}</div>
            <div class="correct-count">Correct: ${correctCount} | Wrong: ${wrongCount}</div>`;
        }
        if (timeRemaining <= 0) {
          clearInterval(timerInterval);
          const rushDuration = Math.round((Date.now() - rushStartTime) / 1000);
          // Update leaderboard ONLY at end of rush session
          updateLeaderboard(correctCount, wrongCount, rushDuration);
          showModal('Time Up', `Correct Answers: ${correctCount}\nWrong Answers: ${wrongCount}\nTime: ${rushDuration}s`, [{text: 'OK', action: closePuzzleModal}]);
>>>>>>> ff605ed (improvements)
        }
      }, 1000);
    } else {
      // Survival mode - no timer limit
      const timerEl = document.getElementById('puzzle-status');
      if (timerEl) {
<<<<<<< HEAD
        timerEl.innerHTML = `<div class="correct-count">✓ Correct: ${correctCount} | ✗ Wrong: ${wrongCount}</div>`;
=======
        timerEl.innerHTML = `<div class="correct-count">Correct: ${correctCount} | Wrong: ${wrongCount}</div>`;
>>>>>>> ff605ed (improvements)
      }
    }
    
    puzzleStats.dailyRushCompleted++;
    saveStats();
  };

<<<<<<< HEAD
  // Theme cards - stay in theme
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      currentMode = 'theme';
      currentTheme = card.dataset.theme;
      currentDifficulty = null;
      openPuzzleModal(card.dataset.theme);
=======
  // Load next puzzle in rush with ascending difficulty
  const loadNextRushPuzzle = () => {
    rushPuzzleCount++;
    
    // Ascending difficulty: 
    // Puzzles 1-3: Easy (0-1200)
    // Puzzles 4-6: Medium (1200-1800)
    // Puzzles 7-9: Hard (1800-2400)
    // Puzzles 10+: Expert (2400-5000)
    
    let minRating = 0, maxRating = 5000;
    if (rushPuzzleCount <= 3) {
      minRating = 0;
      maxRating = 1200;
    } else if (rushPuzzleCount <= 6) {
      minRating = 1200;
      maxRating = 1800;
    } else if (rushPuzzleCount <= 9) {
      minRating = 1800;
      maxRating = 2400;
    } else {
      minRating = 2400;
      maxRating = 5000;
    }
    
    // Preserve current mode if it's one of the game modes, otherwise set to 'rush'
    if (!currentMode || (currentMode !== 'streak' && currentMode !== 'marathon' && currentMode !== 'blitz')) {
      currentMode = 'rush';
    }
    
    // Find a puzzle in the rating range that hasn't been used yet
    let attempts = 0;
    while (attempts < 5) {
      currentPuzzle = getRandomPuzzle(null, minRating, maxRating);
      if (!currentPuzzle || usedPuzzleIdsInRush.has(currentPuzzle.id)) {
        attempts++;
        continue;
      }
      usedPuzzleIdsInRush.add(currentPuzzle.id);
      break;
    }
    
    if (!currentPuzzle) {
      showModal('No More Puzzles', 'All puzzles in this range have been used!');
      return;
    }
    
    playerMoves = [];
    solutionIndex = 0;
    selectedSquare = null;
    wrongAttempts = 0;
    puzzleStartTime = Date.now();

    // Update puzzle info
    const titleEl = document.querySelector('.puzzle-info h3');
    if (titleEl) titleEl.textContent = `Rush: Puzzle ${rushPuzzleCount}`;
    const ratingEl = document.getElementById('current-puzzle-rating');
    if (ratingEl) ratingEl.textContent = currentPuzzle.rating;
    const themeEl = document.getElementById('current-puzzle-theme');
    if (themeEl) themeEl.textContent = currentPuzzle.theme;

    updateMovesList();
    setStatusMessage('thinking', 'Find the best move for your side!');

    const nextBtn = document.getElementById('next-puzzle-btn');
    if (nextBtn) nextBtn.classList.add('hidden');
    const undoBtn = document.getElementById('undo-btn');
    const hintBtn = document.getElementById('hint-btn');
    const solutionBtn = document.getElementById('show-solution-btn');
    
    if (undoBtn) undoBtn.style.display = 'none';
    if (hintBtn) hintBtn.style.display = 'none';
    if (solutionBtn) solutionBtn.style.display = 'none';

    renderChessBoard(currentPuzzle.fen);
    const board = document.getElementById('puzzle-board');
    if (board) board.style.pointerEvents = 'auto';
    const modal = document.getElementById('puzzle-modal');
    if (modal) modal.classList.add('active');
  };

  // Theme cards - stay in theme
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dbLoaded) {
        showModal('Loading', 'Puzzle database is still loading. Please wait...');
        return;
      }
      currentMode = 'theme';
      currentTheme = card.dataset.theme;
      currentDifficulty = null;
      setTimeout(() => openPuzzleModal(card.dataset.theme), 100);
>>>>>>> ff605ed (improvements)
    });
  });

  // Difficulty cards - stay in difficulty
  document.querySelectorAll('.difficulty-card').forEach(card => {
<<<<<<< HEAD
    card.addEventListener('click', () => {
=======
    card.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dbLoaded) {
        showModal('Loading', 'Puzzle database is still loading. Please wait...');
        return;
      }
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
      openPuzzleModal(null, min, max);
=======
      setTimeout(() => openPuzzleModal(null, min, max), 100);
>>>>>>> ff605ed (improvements)
    });
  });

  // Game mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.mode-card');
<<<<<<< HEAD
      const modeName = card?.querySelector('.mode-name')?.textContent || 'Mode';
      if (btn.classList.contains('premium-btn')) {
        alert(`${modeName}\n\nREMIUM Feature\n\nUpgrade to unlock!`);
      } else if (btn.classList.contains('battle-btn')) {
        alert(`${modeName}\n\n1v1 Competition\n\nRating: ${puzzleStats.battleRating}\nStreak: ${puzzleStats.battleStreak}\n\nComing soon!`);
      } else {
        alert(`${modeName}\n\nComing soon!`);
=======
      
      if (btn.classList.contains('battle-btn')) {
        if (window.startBlitzMode) window.startBlitzMode();
      } else if (btn.classList.contains('race-btn')) {
        if (window.startMarathonMode) window.startMarathonMode();
      } else if (btn.classList.contains('survival-btn')) {
        if (window.startStreakMode) window.startStreakMode();
      } else if (btn.classList.contains('time-btn')) {
        if (window.startTimedMode) window.startTimedMode();
      } else if (btn.classList.contains('streak-btn')) {
        if (window.startPerfectStreakMode) window.startPerfectStreakMode();
      } else if (btn.classList.contains('premium-btn')) {
        const modeName = card?.querySelector('.mode-name')?.textContent || 'Mode';
        showModal('Premium Feature', `${modeName} is a premium feature. Upgrade to unlock!`);
      } else {
        const modeName = card?.querySelector('.mode-name')?.textContent || 'Mode';
        showModal('Coming Soon', `${modeName} is coming soon!`);
>>>>>>> ff605ed (improvements)
      }
    });
  });

  // Hint (disabled in Puzzle Rush)
  document.getElementById('hint-btn')?.addEventListener('click', () => {
    if (!currentPuzzle) return;
    const nextMove = currentPuzzle.solution[solutionIndex];
    if (nextMove) {
      usedHint = true;
<<<<<<< HEAD
      alert(`Hint:\nMove from ${nextMove.substring(0, 2)} to ${nextMove.substring(2, 4)}`);
=======
      showModal('Hint', `Move from ${nextMove.substring(0, 2)} to ${nextMove.substring(2, 4)}`);
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
    alert(`Solution:\n${currentPuzzle.solution.join(' → ')}\n\nThis counts as incorrect.`);
=======
    showModal('Solution', `${currentPuzzle.solution.join(' → ')}\n\nThis counts as incorrect.`);
>>>>>>> ff605ed (improvements)
    handlePuzzleComplete(false);
  });

  // Skip
<<<<<<< HEAD
  document.getElementById('skip-puzzle-btn')?.addEventListener('click', () => {
    if (confirm('Skip this puzzle?')) closePuzzleModal();
  });

  // Next Puzzle
  document.getElementById('next-puzzle-btn')?.addEventListener('click', () => {
    openPuzzleModal();
  });
=======
  // Next Puzzle
  document.getElementById('next-puzzle-btn')?.addEventListener('click', () => {
    // Reset puzzle state
    playerMoves = [];
    solutionIndex = 0;
    selectedSquare = null;
    wrongAttempts = 0;
    usedHint = false;
    usedUndo = false;
    // Load next puzzle with all buttons visible
    openPuzzleModal();
  });
  
  // Skip Puzzle Button (counts as incorrect in rush mode)
  document.getElementById('skip-puzzle-btn')?.addEventListener('click', () => {
    if (currentMode === 'rush') {
      wrongCount++;
      if (wrongCount >= 3) {
        clearInterval(timerInterval);
        const timeTaken = Math.round((Date.now() - rushStartTime) / 1000);
        updateLeaderboard(correctCount, wrongCount, timeTaken);
        setStatusMessage('incorrect', `3 Wrong! Game Over!`);
        setTimeout(() => { showModal('Puzzle Rush Over', `Score: ${correctCount * 2 - wrongCount}\nCorrect: ${correctCount}\nWrong: ${wrongCount}`, [{text: 'OK', action: closePuzzleModal}]); }, 500);
        return;
      }
      setTimeout(() => { loadNextRushPuzzle(); }, 300);
    } else if (currentMode === 'daily') {
      // Mark daily puzzle as completed when skipped
      puzzleStats.dailyPuzzleCompleted = true;
      puzzleStats.lastDailyDate = new Date().toDateString();
      const sessionKey = `puzzle_${sessionID}`;
      sessionStorage.setItem(sessionKey, JSON.stringify(puzzleStats));
      showModal('Daily Puzzle Complete', 'You have already completed today\'s daily puzzle.\n\nCome back tomorrow for a new one!', [{text: 'OK', action: closePuzzleModal}]);
    } else {
      openPuzzleModal();
    }
  });
>>>>>>> ff605ed (improvements)

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
<<<<<<< HEAD
      alert('Puzzle statistics reset!');
=======
      showModal('Reset Complete', 'Puzzle statistics have been reset.');
>>>>>>> ff605ed (improvements)
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

<<<<<<< HEAD
  // ==================== LEADERBOARD ====================
  const updateLeaderboard = () => {
    const entry = {
      date: new Date().toLocaleString(),
      solved: puzzleStats.solved,
      accuracy: puzzleStats.attempted > 0 ? Math.round((puzzleStats.solved / puzzleStats.attempted) * 100) : 0,
      rating: puzzleStats.battleRating
=======
  // ==================== DAILY PUZZLE ====================
  window.showDailyPuzzle = () => {
    if (!dbLoaded) {
      showModal('Loading', 'Puzzle database is still loading. Please wait...');
      return;
    }
    currentMode = 'daily';
    const dailyPuzzle = getDailyPuzzle();
    if (!dailyPuzzle) {
      showModal('No Puzzle', 'Could not load todays puzzle.');
      return;
    }
    currentPuzzle = dailyPuzzle;
    playerMoves = [];
    solutionIndex = 0;
    selectedSquare = null;
    wrongAttempts = 0;
    usedHint = false;
    usedUndo = false;
    puzzleStartTime = Date.now();
    
    const titleEl = document.querySelector('.puzzle-info h3');
    if (titleEl) titleEl.textContent = 'Daily Puzzle';
    const ratingEl = document.getElementById('current-puzzle-rating');
    if (ratingEl) ratingEl.textContent = dailyPuzzle.rating;
    const themeEl = document.getElementById('current-puzzle-theme');
    if (themeEl) themeEl.textContent = dailyPuzzle.theme || 'Daily Challenge';
    
    updateMovesList();
    setStatusMessage('thinking', 'Find the best move for your side!');
    
    const nextBtn = document.getElementById('next-puzzle-btn');
    if (nextBtn) nextBtn.classList.add('hidden');
    const undoBtn = document.getElementById('undo-btn');
    const hintBtn = document.getElementById('hint-btn');
    const solutionBtn = document.getElementById('show-solution-btn');
    if (undoBtn) { undoBtn.style.display = 'block'; undoBtn.disabled = false; }
    if (hintBtn) hintBtn.style.display = 'block';
    if (solutionBtn) solutionBtn.style.display = 'block';
    
    renderChessBoard(dailyPuzzle.fen);
    const board = document.getElementById('puzzle-board');
    if (board) board.style.pointerEvents = 'auto';
    if (modal) modal.classList.add('active');
  };

  // ==================== LEADERBOARD ====================
  const updateLeaderboard = (correct = 0, wrong = 0, timeTaken = 0) => {
    const username = document.querySelector('[class*="user"]')?.textContent || sessionID.substring(0, 10) || 'Anonymous';
    const entry = {
      username: username,
      date: new Date().toLocaleString(),
      solved: puzzleStats.solved,
      accuracy: puzzleStats.attempted > 0 ? Math.round((puzzleStats.solved / puzzleStats.attempted) * 100) : 0,
      rating: puzzleStats.battleRating,
      correct: correct,
      wrong: wrong,
      score: Math.max(0, correct * 2 - wrong), // Score formula: +2 for correct, -1 for wrong
      timeTaken: timeTaken // Time in seconds
>>>>>>> ff605ed (improvements)
    };
    
    if (!puzzleStats.leaderboard) puzzleStats.leaderboard = { personal: [], friends: [], global: [] };
    puzzleStats.leaderboard.personal = puzzleStats.leaderboard.personal || [];
    puzzleStats.leaderboard.personal.unshift(entry);
<<<<<<< HEAD
    puzzleStats.leaderboard.personal = puzzleStats.leaderboard.personal.slice(0, 10); // Keep top 10
=======
    
    // Sort by correct (descending), then by timeTaken (ascending)
    puzzleStats.leaderboard.personal.sort((a, b) => {
      if (b.correct !== a.correct) return b.correct - a.correct;
      return a.timeTaken - b.timeTaken;
    });
    
    puzzleStats.leaderboard.personal = puzzleStats.leaderboard.personal.slice(0, 10); // Keep top 10
    
    // ALSO ADD TO GLOBAL LEADERBOARD (for Puzzle Rush mode)
    if (currentMode === 'rush') {
      globalLeaderboard.push({
        username: username,
        timestamp: Date.now(),
        date: new Date().toLocaleString(),
        correct: correct,
        wrong: wrong,
        score: entry.score,
        timeTaken: timeTaken
      });
      saveGlobalLeaderboard();
    }
    
>>>>>>> ff605ed (improvements)
    saveStats();
  };
  
  window.showLeaderboard = () => {
    const mistakes = puzzleStats.mistakesInRush || [];
    const leaderboardModal = document.createElement('div');
    leaderboardModal.className = 'leaderboard-modal';
    leaderboardModal.innerHTML = `
      <div class="leaderboard-content">
        <div class="leaderboard-header">
<<<<<<< HEAD
          <h2>🏆 Leaderboard</h2>
          <div>
            <button id="download-btn" style="background: #4a90e2; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-right: 10px; font-weight: bold;">⬇️ Download Data</button>
            <button class="close-leaderboard" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">✕</button>
=======
          <h2>Leaderboard</h2>
          <div>
            <button id="download-btn" style="background: #4a90e2; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-right: 10px; font-weight: bold; font-size: 14px;">Download Data</button>
            <button class="close-leaderboard" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
                <th>Rank</th>
                <th>Solved</th>
                <th>Accuracy</th>
                <th>Rating</th>
                <th>Date</th>
=======
                <th style="color: #333;">Rank</th>
                <th style="color: #333;">Correct</th>
                <th style="color: #333;">Wrong</th>
                <th style="color: #333; cursor: help;" title="Score = (Correct × 2) - Wrong">Score</th>
                <th style="color: #333;">Time (s)</th>
                <th style="color: #333;">Username</th>
>>>>>>> ff605ed (improvements)
              </tr>
            </thead>
            <tbody>
              ${(puzzleStats.leaderboard?.personal || []).length > 0 
                ? (puzzleStats.leaderboard.personal || []).map((p, i) => `
                  <tr>
<<<<<<< HEAD
                    <td>${i+1}</td>
                    <td>${p.solved}</td>
                    <td>${p.accuracy}%</td>
                    <td>${p.rating}</td>
                    <td>${p.date}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="5" style="text-align: center; color: #999;">No records yet</td></tr>'
=======
                    <td style="color: #333; font-weight: bold;">${i+1}</td>
                    <td style="color: #22c55e; font-weight: bold;">${p.correct || 0}</td>
                    <td style="color: #ef4444; font-weight: bold;">${p.wrong || 0}</td>
                    <td style="color: #3b82f6; font-weight: bold; cursor: help;" title="Score = (Correct × 2) - Wrong">${p.score || 0}</td>
                    <td style="color: #8b5cf6; font-weight: bold;">${p.timeTaken || 0}s</td>
                    <td style="color: #666;">${p.username || 'Anonymous'}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="6" style="text-align: center; color: #999;">No records yet</td></tr>'
>>>>>>> ff605ed (improvements)
              }
            </tbody>
          </table>
        </div>
        
        <div id="friends-tab" class="tab-content">
<<<<<<< HEAD
          <p style="text-align: center; color: #999;">Friends feature coming soon</p>
        </div>
        
        <div id="global-tab" class="tab-content">
          <p style="text-align: center; color: #999;">Global rankings coming soon</p>
=======
          <p style="text-align: center; color: #999; font-size: 16px;">Friends feature coming soon</p>
        </div>
        
        <div id="global-tab" class="tab-content">
          <h3 style="color: #333; margin-bottom: 15px;">🏆 Top 100 Puzzle Rush Scores</h3>
          <table class="leaderboard-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #ddd;">
                <th style="color: #333; padding: 8px; text-align: left;">Rank</th>
                <th style="color: #333; padding: 8px; text-align: left;">Username</th>
                <th style="color: #333; padding: 8px; text-align: center;">Correct</th>
                <th style="color: #333; padding: 8px; text-align: center;">Wrong</th>
                <th style="color: #333; padding: 8px; text-align: center; cursor: help;" title="Score = (Correct × 2) - Wrong">Score</th>
                <th style="color: #333; padding: 8px; text-align: center;">Time (s)</th>
                <th style="color: #666; padding: 8px; text-align: left; font-size: 12px;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${globalLeaderboard.length > 0 
                ? globalLeaderboard.map((entry, i) => `
                  <tr style="border-bottom: 1px solid #eee; background: ${i === 0 ? '#fffacd' : i === 1 ? '#f5f5f5' : i === 2 ? '#ffe4e1' : 'white'};">
                    <td style="color: #333; padding: 8px; font-weight: bold;">${i+1}</td>
                    <td style="color: #333; padding: 8px;">${entry.username}</td>
                    <td style="color: #22c55e; padding: 8px; text-align: center; font-weight: bold;">${entry.correct}</td>
                    <td style="color: #ef4444; padding: 8px; text-align: center; font-weight: bold;">${entry.wrong}</td>
                    <td style="color: #3b82f6; padding: 8px; text-align: center; font-weight: bold;">${entry.score}</td>
                    <td style="color: #8b5cf6; padding: 8px; text-align: center; font-weight: bold;">${entry.timeTaken}s</td>
                    <td style="color: #666; padding: 8px; font-size: 12px;">${entry.date}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="7" style="text-align: center; color: #999; padding: 20px;">No puzzle rush scores yet. Complete a Puzzle Rush to appear on the global leaderboard!</td></tr>'
              }
            </tbody>
          </table>
>>>>>>> ff605ed (improvements)
        </div>
        
        <div id="mistakes-tab" class="tab-content">
          <div style="margin-bottom: 15px;">
<<<<<<< HEAD
            <button class="mistake-filter-btn active" data-filter="all" style="margin-right: 10px; padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">All (${mistakes.length})</button>
            <button class="mistake-filter-btn" data-filter="done" style="margin-right: 10px; padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">Done (${mistakes.filter(m => m.improved).length})</button>
            <button class="mistake-filter-btn" data-filter="not-done" style="padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px;">Not Done (${mistakes.filter(m => !m.improved).length})</button>
=======
            <button class="mistake-filter-btn active" data-filter="all" style="margin-right: 10px; padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; color: #333;">All (${mistakes.length})</button>
            <button class="mistake-filter-btn" data-filter="done" style="margin-right: 10px; padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; color: #333;">Done (${mistakes.filter(m => m.improved).length})</button>
            <button class="mistake-filter-btn" data-filter="not-done" style="padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; color: #333;">Not Done (${mistakes.filter(m => !m.improved).length})</button>
>>>>>>> ff605ed (improvements)
          </div>
          <div id="mistakes-list">
            ${mistakes.length === 0 
              ? '<p style="text-align: center; color: #999;">No mistakes yet! Great job!</p>'
              : mistakes.map((m, i) => `
<<<<<<< HEAD
                <div class="mistake-item" style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 10px; background: ${m.improved ? '#e8f5e9' : '#fff3e0'};">
                  <div style="font-weight: bold; color: #333;">Mistake ${i+1}: ${m.theme} (Rating: ${m.rating})</div>
                  <div style="font-size: 12px; color: #666; margin: 6px 0;">Your moves: ${m.yourMoves}</div>
                  <div style="font-size: 12px; color: #666;">Solution: ${m.solution}</div>
                  <div style="font-size: 11px; color: #999; margin-top: 6px;">${m.timestamp} ${m.improved ? '✅ Improved' : '⏳ Still Working'}</div>
=======
                <div class="mistake-item" style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 10px; background: ${m.improved ? '#e8f5e9' : '#fff3e0'}; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)'" onmouseout="this.style.boxShadow='none'" onclick="showMistakeDetail(${i})">
                  <div style="font-weight: bold; color: #333;">
                    ${m.improved ? '✅' : '❌'} ${m.theme} (Rating: ${m.rating})
                  </div>
                  <div style="font-size: 12px; color: #666; margin: 6px 0;">Your moves: ${m.yourMoves}</div>
                  <div style="font-size: 12px; color: #666;">Solution: ${m.solution.join(' → ')}</div>
                  <div style="font-size: 11px; color: #999; margin-top: 6px;">${m.timestamp} ${m.improved ? '(Solved)' : '(Not Solved - Click to review)'}</div>
>>>>>>> ff605ed (improvements)
                </div>
              `).join('')
            }
          </div>
<<<<<<< HEAD
=======
          <div id="mistake-detail-view" style="display: none; margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 6px; background: #f9f9f9;">
            <!-- Mistake detail with FEN board will be populated by JavaScript -->
          </div>
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
        max-height: 80vh; overflow-y: auto; padding: 20px;
      }
      .leaderboard-header {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
      }
      .leaderboard-header h2 { margin: 0; color: #333; }
=======
        max-height: 80vh; overflow-y: auto; padding: 20px; color: #333;
      }
      .leaderboard-content * { color: #333; }
      .leaderboard-header {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
      }
      .leaderboard-header h2 { margin: 0; color: #222; font-size: 24px; }
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
        background: #f5f5f5; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;
      }
      .leaderboard-table td {
        padding: 10px; border-bottom: 1px solid #eee;
=======
        background: #f5f5f5; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd; color: #222;
      }
      .leaderboard-table td {
        padding: 10px; border-bottom: 1px solid #eee; color: #333;
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
            item.style.display = item.textContent.includes('✅') ? 'block' : 'none';
          } else if (filter === 'not-done') {
            item.style.display = item.textContent.includes('⏳') ? 'block' : 'none';
=======
            item.style.display = item.textContent.includes('(Solved)') ? 'block' : 'none';
          } else if (filter === 'not-done') {
            item.style.display = item.textContent.includes('Not Solved') ? 'block' : 'none';
>>>>>>> ff605ed (improvements)
          }
        });
      });
    });
    
<<<<<<< HEAD
    leaderboardModal.querySelector('.close-leaderboard').addEventListener('click', () => leaderboardModal.remove());
  };
  
=======
    // Mistake retry handlers
    mistakes.forEach((m, i) => {
      const mistakeItem = leaderboardModal.querySelector(`.retry-btn-${i}`);
      if (mistakeItem && !m.improved) {
        mistakeItem.addEventListener('click', () => {
          leaderboardModal.remove();
          // Create a puzzle object from mistake data
          const retryPuzzle = {
            id: m.puzzleId,
            fen: m.fen,
            solution: m.solution,
            rating: m.rating,
            theme: m.theme
          };
          currentPuzzle = retryPuzzle;
          playerMoves = [];
          solutionIndex = 0;
          selectedSquare = null;
          puzzleStartTime = Date.now();
          
          // Update UI
          const titleEl = document.querySelector('.puzzle-info h3');
          if (titleEl) titleEl.textContent = retryPuzzle.theme || 'Chess Puzzle';
          const ratingEl = document.getElementById('current-puzzle-rating');
          if (ratingEl) ratingEl.textContent = retryPuzzle.rating;
          const themeEl = document.getElementById('current-puzzle-theme');
          if (themeEl) themeEl.textContent = retryPuzzle.theme;
          
          updateMovesList();
          setStatusMessage('thinking', 'Find the best move for your side!');
          
          // Show all buttons
          const undoBtn = document.getElementById('undo-btn');
          const hintBtn = document.getElementById('hint-btn');
          const solutionBtn = document.getElementById('show-solution-btn');
          if (undoBtn) { undoBtn.style.display = 'block'; undoBtn.disabled = false; }
          if (hintBtn) hintBtn.style.display = 'block';
          if (solutionBtn) solutionBtn.style.display = 'block';
          
          renderChessBoard(retryPuzzle.fen);
          if (modal) modal.classList.add('active');
          
          // Track retry attempt
          m.attempts = (m.attempts || 1) + 1;
          saveStats();
        });
      }
    });
    
    leaderboardModal.querySelector('.close-leaderboard').addEventListener('click', () => leaderboardModal.remove());
  };
  
  // Show mistake detail with FEN board replay
  window.showMistakeDetail = (index) => {
    const mistakes = puzzleStats.mistakesInRush || [];
    if (index < 0 || index >= mistakes.length) return;
    
    const mistake = mistakes[index];
    const detailView = document.getElementById('mistake-detail-view');
    if (!detailView) return;
    
    // Create a mini FEN board display
    detailView.innerHTML = `
      <div style="margin-bottom: 15px;">
        <button onclick="this.parentElement.parentElement.style.display='none'" style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Close</button>
      </div>
      <h3 style="color: #333; margin-top: 0;">Mistake Review: ${mistake.theme}</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h4 style="color: #333;">Position</h4>
          <div style="background: #f0f0f0; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; color: #555;">
            FEN: ${mistake.fen}
          </div>
          <h4 style="color: #333; margin-top: 15px;">Your Moves</h4>
          <div style="background: #fff3e0; padding: 10px; border-radius: 4px; color: #d84315;">
            ${mistake.yourMoves}
          </div>
          <h4 style="color: #333; margin-top: 15px;">Correct Solution</h4>
          <div style="background: #e8f5e9; padding: 10px; border-radius: 4px; color: #2e7d32; font-weight: bold;">
            ${mistake.solution.join(' → ')}
          </div>
        </div>
        <div>
          <h4 style="color: #333;">Details</h4>
          <table style="width: 100%; font-size: 14px; color: #555;">
            <tr>
              <td style="padding: 5px; font-weight: bold;">Rating:</td>
              <td style="padding: 5px;">${mistake.rating}</td>
            </tr>
            <tr>
              <td style="padding: 5px; font-weight: bold;">Theme:</td>
              <td style="padding: 5px;">${mistake.theme}</td>
            </tr>
            <tr>
              <td style="padding: 5px; font-weight: bold;">Timestamp:</td>
              <td style="padding: 5px;">${mistake.timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 5px; font-weight: bold;">Status:</td>
              <td style="padding: 5px; color: ${mistake.improved ? '#2e7d32' : '#d84315'}; font-weight: bold;">
                ${mistake.improved ? '✅ Solved' : '❌ Not Solved'}
              </td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 4px; border-left: 4px solid #1976d2; color: #1565c0;">
            <strong>💡 Tip:</strong> Review the correct solution and try this puzzle again from the leaderboard to improve your skills.
          </div>
        </div>
      </div>
    `;
    detailView.style.display = 'block';
  };
  
>>>>>>> ff605ed (improvements)
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
<<<<<<< HEAD
          <div class="timer-display ${timeRemaining < 3 ? 'warning' : ''}">⏱ ${timeRemaining}s</div>
          <div class="correct-count">✓ ${correctCount}</div>`;
      }
      if (timeRemaining <= 0) {
        clearInterval(speedInterval);
        alert(`⚡ Speed Challenge Complete!\\n\\nCorrect: ${correctCount}`);
        closePuzzleModal();
        currentMode = null;
=======
          <div class="timer-display ${timeRemaining < 3 ? 'warning' : ''}">Time: ${timeRemaining}s</div>
          <div class="correct-count">Correct: ${correctCount}</div>`;
      }
      if (timeRemaining <= 0) {
        clearInterval(speedInterval);
        showModal('Challenge Complete', `Correct: ${correctCount}`, [{text: 'OK', action: () => { closePuzzleModal(); currentMode = null; }}]);
>>>>>>> ff605ed (improvements)
      }
    }, 1000);
  };

<<<<<<< HEAD
  // ==================== INIT ====================
  loadStats();
=======
  // ==================== BLITZ MODE ====================
  // Fast-paced: 60 seconds, ascending difficulty, auto-advance
  window.startBlitzMode = () => {
    if (!dbLoaded || allPuzzlesFlat.length === 0) {
      showModal('Loading', 'Puzzle database is still loading. Please wait...');
      return;
    }
    currentMode = 'blitz';
    timeRemaining = 60;
    correctCount = 0;
    wrongCount = 0;
    rushPuzzleCount = 0;
    usedPuzzleIdsInRush.clear();
    rushStartTime = Date.now();
    
    loadNextRushPuzzle();
    
    const timerEl = document.getElementById('puzzle-status');
    timerInterval = setInterval(() => {
      timeRemaining--;
      if (timerEl) {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        timerEl.innerHTML = `
          <div class="timer-display ${timeRemaining < 15 ? 'warning' : ''}">⚡ Blitz: ${timeStr}</div>
          <div class="correct-count">✓ ${correctCount} | ✗ ${wrongCount}</div>`;
      }
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        const rushDuration = Math.round((Date.now() - rushStartTime) / 1000);
        showModal('Blitz Complete!', `Puzzles Solved: ${correctCount}\nWrong Answers: ${wrongCount}\nScore: ${correctCount - wrongCount}`, [{text: 'OK', action: closePuzzleModal}]);
        currentMode = null;
        saveStats();
      }
    }, 1000);
  };

  // ==================== MARATHON MODE ====================
  // Endurance: No time limit, ascending difficulty, auto-advance
  window.startMarathonMode = () => {
    if (!dbLoaded || allPuzzlesFlat.length === 0) {
      showModal('Loading', 'Puzzle database is still loading. Please wait...');
      return;
    }
    currentMode = 'marathon';
    timeRemaining = -1; // No time limit
    correctCount = 0;
    wrongCount = 0;
    rushPuzzleCount = 0;
    usedPuzzleIdsInRush.clear();
    rushStartTime = Date.now();
    
    loadNextRushPuzzle();
    
    const timerEl = document.getElementById('puzzle-status');
    if (timerEl) {
      timerEl.innerHTML = `
        <div class="timer-display" style="color: #8b5cf6;">🏃 Marathon</div>
        <div class="correct-count">✓ ${correctCount} | ✗ ${wrongCount}</div>`;
    }
  };

  // ==================== STREAK MODE ====================
  // Perfect streak: 1 wrong = game over, ascending difficulty
  window.startStreakMode = () => {
    if (!dbLoaded || allPuzzlesFlat.length === 0) {
      showModal('Loading', 'Puzzle database is still loading. Please wait...');
      return;
    }
    currentMode = 'streak';
    correctCount = 0;
    wrongCount = 0;
    rushPuzzleCount = 0;
    usedPuzzleIdsInRush.clear();
    rushStartTime = Date.now();
    
    // Override wrong count limit for streak mode
    const streakLimitCheck = (wrongCount) => {
      if (wrongCount >= 1) {
        clearInterval(timerInterval);
        const rushDuration = Math.round((Date.now() - rushStartTime) / 1000);
        showModal('Streak Broken!', `Perfect Streak: ${correctCount}\nTime: ${rushDuration}s`, [{text: 'OK', action: closePuzzleModal}]);
        currentMode = null;
        saveStats();
        return true;
      }
      return false;
    };
    
    window.streakLimitCheck = streakLimitCheck;
    loadNextRushPuzzle();
    
    const timerEl = document.getElementById('puzzle-status');
    if (timerEl) {
      timerEl.innerHTML = `
        <div class="timer-display" style="color: #f59e0b;">🔥 Streak: ${correctCount}</div>
        <div class="correct-count">ONE WRONG = GAME OVER</div>`;
    }
  };

  // ==================== TIMED MODE ====================
  // Puzzle Rush with time limit (original 15-second default)
  window.startTimedMode = () => {
    if (!dbLoaded || allPuzzlesFlat.length === 0) {
      showModal('Loading', 'Puzzle database is still loading. Please wait...');
      return;
    }
    startPuzzleRush(15);
  };

  // ==================== PERFECT STREAK MODE ====================
  // No timer, no wrong answers allowed, ascending difficulty
  window.startPerfectStreakMode = () => {
    if (!dbLoaded || allPuzzlesFlat.length === 0) {
      showModal('Loading', 'Puzzle database is still loading. Please wait...');
      return;
    }
    // This is same as Streak mode - no time limit but 1 wrong = game over
    window.startStreakMode();
  };

  // ==================== INIT ====================
  loadStats();
  loadGlobalLeaderboard();
>>>>>>> ff605ed (improvements)
  loadPuzzleDatabase().then(() => {
    console.log('✅ Puzzle system initialized!');
    if (dbLoaded) {
      console.log(`📊 Total puzzles: ${allPuzzlesFlat.length.toLocaleString()}`);
    }
<<<<<<< HEAD
    console.log('🎯 Daily limits: Rush 15, Custom 10');
=======
    console.log('Daily limits: Rush 15, Custom 10');
>>>>>>> ff605ed (improvements)
    console.log('⚙️ Using Chess.js library');
  });

});