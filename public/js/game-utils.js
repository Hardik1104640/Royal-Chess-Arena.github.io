// game-utils.js - Utilities for saving and managing games

// Save a game to the database on the server
window.saveGameToDatabase = function(gameData) {
  // Generate a unique ID if not provided
  if (!gameData.id) {
    gameData.id = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Add timestamp if not present
  if (!gameData.date) {
    gameData.date = new Date().toISOString();
  }
  
  console.log('Saving game:', gameData);
  
  fetch('/api/save-game', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(gameData)
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Game saved successfully');
      // Refresh the games list on the home page if the function is available
      if (window.fetchAndDisplayGames) {
        setTimeout(window.fetchAndDisplayGames, 300);
      }
    }
  })
  .catch(err => {
    console.error('❌ Failed to save game:', err);
  });
};

// Helper to create a standard game data object with detailed information
window.createGameData = function(options = {}) {
  return {
    id: options.id || `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: options.date || new Date().toISOString(),
    type: options.type || 'online', // 'bot' or 'online' - IMPORTANT for win rate calculation
    
    // GAME PARTICIPANTS
    whitePlayer: options.whitePlayer || 'Player 1',
    blackPlayer: options.blackPlayer || 'Player 2',
    opponent: options.opponent || 'Opponent', // For single view
    yourColor: options.yourColor || 'white', // 'white' or 'black'
    
    // GAME RESULT
    result: options.result || 'Draw', // 'Win', 'Loss', 'Draw'
    resultReason: options.resultReason || 'Normal', // 'Checkmate', 'Resignation', 'Time', 'Draw', etc.
    
    // GAME MOVES & POSITIONS
    moves: options.moves || [], // Array of moves in algebraic notation
    movesDetailed: options.movesDetailed || [], // Detailed moves with all info
    pgn: options.pgn || '', // Full PGN notation
    startFen: options.startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    endFen: options.endFen || '', // Final board position for review
    allFens: options.allFens || [], // All FEN positions for full replay
    
    // TIME & CONTROL
    timeControl: options.timeControl || '10+0',
    whiteTime: options.whiteTime || 600,
    blackTime: options.blackTime || 600,
    timeUsed: options.timeUsed || 0,
    
    // RATINGS & LEVELS
    yourRating: options.yourRating || 1200,
    opponentRating: options.opponentRating || 1200,
    ratingChange: options.ratingChange || 0,
    
    // BOT SPECIFIC
    botName: options.botName || null,
    botLevel: options.botLevel || null, // 'beginner', 'intermediate', 'advanced', etc.
    
    // ADDITIONAL METADATA
    duration: options.duration || 0, // Game duration in seconds
    totalMoves: options.totalMoves || 0,
    openingName: options.openingName || 'Unknown Opening',
    ecoCode: options.ecoCode || '', // ECO code for opening
    
    // FOR DISPLAY
    displayName: options.displayName || 'Game' // How to show in list
  };
};
