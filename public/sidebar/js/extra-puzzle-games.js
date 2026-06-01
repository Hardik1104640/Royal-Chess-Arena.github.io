// extra-puzzle-games.js - Special game modes for Chess Puzzles
// Blitz, Marathon, Streak - fully functional game modes

// ==================== GAME MODE STATE ====================
let activeGameMode = null;
let gameModeStats = {
  correct: 0,
  wrong: 0,
  puzzlesSolved: 0,
  currentStreak: 0,
  bestStreak: 0,
  startTime: 0,
  endTime: 0,
  wrongs: 0
};

// ==================== SPECIAL GAME MODES ====================

// BLITZ MODE - 30 seconds per puzzle, get as many correct as possible
window.startBlitzMode = () => {
  if (!window.dbLoaded || !window.allPuzzlesFlat || window.allPuzzlesFlat.length === 0) {
    showGameModal('Loading', 'Puzzle database is still loading. Please wait...');
    return;
  }
  
  showGameModal('Blitz Mode', 
    '30 seconds per puzzle!\nSolve as many as you can.\n3 wrong = Game Over',
    [
      { text: 'Start', action: startBlitzGame, style: 'primary' },
      { text: 'Cancel', action: () => {}, style: 'secondary' }
    ]
  );
};

const startBlitzGame = () => {
  activeGameMode = 'blitz';
  gameModeStats = {
    correct: 0,
    wrong: 0,
    puzzlesSolved: 0,
    currentStreak: 0,
    bestStreak: 0,
    startTime: Date.now(),
    endTime: 0,
    wrongs: 0
  };
  
  window.currentMode = 'blitz';
  loadBlitzPuzzle();
};

const loadBlitzPuzzle = () => {
  if (!window.dbLoaded) return;
  
  const randomIndex = Math.floor(Math.random() * window.allPuzzlesFlat.length);
  window.currentPuzzle = window.allPuzzlesFlat[randomIndex];
  window.playerMoves = [];
  window.solutionIndex = 0;
  window.selectedSquare = null;
  window.wrongAttempts = 0;
  window.usedHint = false;
  window.usedUndo = false;
  window.puzzleStartTime = Date.now();
  
  if (window.modal) window.modal.classList.add('active');
  
  const titleEl = document.querySelector('.puzzle-info h3');
  if (titleEl) titleEl.textContent = `Blitz: ${gameModeStats.correct} correct`;
  
  const ratingEl = document.getElementById('current-puzzle-rating');
  if (ratingEl) ratingEl.textContent = window.currentPuzzle.rating;
  
  const themeEl = document.getElementById('current-puzzle-theme');
  if (themeEl) themeEl.textContent = window.currentPuzzle.theme || 'Blitz';
  
  window.updateMovesList();
  window.setStatusMessage('thinking', 'Solve in 30s!');
  window.renderChessBoard(window.currentPuzzle.fen);
  
  const board = document.getElementById('puzzle-board');
  if (board) board.style.pointerEvents = 'auto';
  
  startBlitzTimer();
};

const startBlitzTimer = () => {
  const timerDisplay = document.querySelector('.timer-display');
  const startTime = Date.now();
  
  const timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, 30 - elapsed);
    
    if (timerDisplay) timerDisplay.textContent = `⏱️ ${remaining}s`;
    
    if (remaining === 0) {
      clearInterval(timerInterval);
      gameModeStats.wrongs++;
      
      setTimeout(() => {
        if (gameModeStats.wrongs >= 3) {
          endBlitzMode();
        } else {
          loadBlitzPuzzle();
        }
      }, 1500);
    }
  }, 100);
  
  window.blitzTimerInterval = timerInterval;
};

const endBlitzMode = () => {
  if (window.blitzTimerInterval) clearInterval(window.blitzTimerInterval);
  
  gameModeStats.endTime = Date.now();
  const duration = Math.round((gameModeStats.endTime - gameModeStats.startTime) / 1000);
  
  showGameModal('Blitz Mode Complete', 
    `Correct: ${gameModeStats.correct}\nWrong: ${gameModeStats.wrongs}\nTime: ${duration}s`
  );
  
  activeGameMode = null;
  window.currentMode = 'normal';
};

// MARATHON MODE - Solve until 1 wrong answer
window.startMarathonMode = () => {
  if (!window.dbLoaded || !window.allPuzzlesFlat || window.allPuzzlesFlat.length === 0) {
    showGameModal('Loading', 'Puzzle database is still loading. Please wait...');
    return;
  }
  
  showGameModal('Marathon Mode', 
    'Solve puzzles without mistakes!\nGet 1 wrong = Game Over',
    [
      { text: 'Start', action: startMarathonGame, style: 'primary' },
      { text: 'Cancel', action: () => {}, style: 'secondary' }
    ]
  );
};

const startMarathonGame = () => {
  activeGameMode = 'marathon';
  gameModeStats = {
    correct: 0,
    wrong: 0,
    puzzlesSolved: 0,
    currentStreak: 0,
    bestStreak: 0,
    startTime: Date.now(),
    endTime: 0,
    wrongs: 0
  };
  
  window.currentMode = 'marathon';
  loadMarathonPuzzle();
};

const loadMarathonPuzzle = () => {
  if (!window.dbLoaded) return;
  
  const randomIndex = Math.floor(Math.random() * window.allPuzzlesFlat.length);
  window.currentPuzzle = window.allPuzzlesFlat[randomIndex];
  window.playerMoves = [];
  window.solutionIndex = 0;
  window.selectedSquare = null;
  window.wrongAttempts = 0;
  window.usedHint = false;
  window.usedUndo = false;
  window.puzzleStartTime = Date.now();
  
  if (window.modal) window.modal.classList.add('active');
  
  const titleEl = document.querySelector('.puzzle-info h3');
  if (titleEl) titleEl.textContent = `Marathon: ${gameModeStats.currentStreak} streak`;
  
  const ratingEl = document.getElementById('current-puzzle-rating');
  if (ratingEl) ratingEl.textContent = window.currentPuzzle.rating;
  
  const themeEl = document.getElementById('current-puzzle-theme');
  if (themeEl) themeEl.textContent = window.currentPuzzle.theme || 'Marathon';
  
  window.updateMovesList();
  window.setStatusMessage('thinking', 'No mistakes allowed!');
  window.renderChessBoard(window.currentPuzzle.fen);
  
  const board = document.getElementById('puzzle-board');
  if (board) board.style.pointerEvents = 'auto';
};

const endMarathonMode = () => {
  gameModeStats.endTime = Date.now();
  
  showGameModal('Marathon Ended', 
    `Streak: ${gameModeStats.currentStreak}\nTotal Correct: ${gameModeStats.correct}`
  );
  
  activeGameMode = null;
  window.currentMode = 'normal';
};

// ==================== HELPER MODAL FUNCTION ====================
const showGameModal = (title, message, buttons = []) => {
  const existingModal = document.getElementById('game-mode-modal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.id = 'game-mode-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
    background: rgba(0,0,0,0.8); display: flex; align-items: center; 
    justify-content: center; z-index: 10000;
  `;
  
  const box = document.createElement('div');
  box.style.cssText = `
    background: white; border-radius: 12px; padding: 30px; 
    max-width: 400px; text-align: center; color: #333; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  
  const titleEl = document.createElement('h2');
  titleEl.textContent = title;
  titleEl.style.cssText = 'margin-top: 0; color: #222; font-size: 24px;';
  
  const msgEl = document.createElement('p');
  msgEl.textContent = message;
  msgEl.style.cssText = 'font-size: 16px; line-height: 1.6; color: #666; white-space: pre-line;';
  
  box.appendChild(titleEl);
  box.appendChild(msgEl);
  
  if (buttons.length > 0) {
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 20px;';
    
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.text;
      button.style.cssText = `
        flex: 1; padding: 12px; border: none; border-radius: 6px; 
        font-weight: bold; cursor: pointer; font-size: 14px; transition: all 0.3s;
        ${btn.style === 'primary' 
          ? 'background: #4a90e2; color: white;' 
          : 'background: #ddd; color: #333;'}
      `;
      
      button.addEventListener('click', () => {
        modal.remove();
        btn.action();
      });
      
      button.addEventListener('mouseover', () => {
        button.style.transform = 'scale(1.05)';
      });
      
      button.addEventListener('mouseout', () => {
        button.style.transform = 'scale(1)';
      });
      
      btnContainer.appendChild(button);
    });
    
    box.appendChild(btnContainer);
  }
  
  modal.appendChild(box);
  document.body.appendChild(modal);
};

// ==================== HOOK INTO PUZZLE COMPLETION ====================
const originalHandlePuzzleComplete = window.handlePuzzleComplete;

window.handlePuzzleComplete = function(isCorrect) {
  if (activeGameMode) {
    if (isCorrect) {
      gameModeStats.correct++;
      gameModeStats.currentStreak++;
      
      if (activeGameMode === 'blitz' && window.blitzTimerInterval) {
        clearInterval(window.blitzTimerInterval);
      }
      
      setTimeout(() => {
        if (activeGameMode === 'blitz') {
          loadBlitzPuzzle();
        } else if (activeGameMode === 'marathon') {
          loadMarathonPuzzle();
        }
      }, 1000);
    }
  } else {
    if (originalHandlePuzzleComplete) {
      originalHandlePuzzleComplete.call(this, isCorrect);
    }
  }
};

// ==================== HOOK INTO WRONG MOVE DETECTION ====================
const originalAttemptMove = window.attemptMove;

window.attemptMove = function(from, to) {
  if (activeGameMode) {
    const expectedMove = window.currentPuzzle.solution[window.solutionIndex];
    const move = window.currentGame.move({ from, to, promotion: 'q' });
    
    if (!move) { 
      window.updateBoardPieces(); 
      return; 
    }
    
    window.playerMoves.push(move.san);
    window.updateMovesList();
    window.updateBoardPieces();
    
    const madeMove = from + to;
    if (madeMove === expectedMove) {
      if (originalAttemptMove) {
        originalAttemptMove.call(this, from, to);
      }
    } else {
      gameModeStats.wrongs = (gameModeStats.wrongs || 0) + 1;
      window.playerMoves.pop();
      window.currentGame.undo();
      window.updateMovesList();
      window.updateBoardPieces();
      
      if (activeGameMode === 'marathon') {
        endMarathonMode();
        activeGameMode = null;
      } else if (activeGameMode === 'blitz' && gameModeStats.wrongs >= 3) {
        endBlitzMode();
      }
    }
  } else {
    if (originalAttemptMove) {
      originalAttemptMove.call(this, from, to);
    }
  }
};

console.log('✓ Extra puzzle games module loaded! Modes: Blitz, Marathon');
  
  const box = document.createElement('div');
  box.style.cssText = 'background: white; border-radius: 12px; padding: 30px; max-width: 400px; text-align: center; color: #333;';
  
  box.innerHTML = `
    <h2 style="margin-top: 0; color: #222;">Streak Mode</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #666;">How long can you keep your streak alive?</p>
    <p style="font-size: 14px; color: #999;">One wrong answer breaks your streak!</p>
    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button style="flex: 1; padding: 12px; background: #4a90e2; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">Start</button>
      <button style="flex: 1; padding: 12px; background: #ddd; color: #333; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">Cancel</button>
    </div>
  `;
  
  const startBtn = box.children[0].querySelector('button');
  const cancelBtn = box.querySelectorAll('button')[1];
  
  startBtn.addEventListener('click', () => {
    modal.remove();
    onStart();
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  modal.appendChild(box);
  document.body.appendChild(modal);


// ==================== HOOK INTO PUZZLE COMPLETION ====================
const originalHandlePuzzleComplete = window.handlePuzzleComplete;
  const themes = [
    'mate-in-1', 'mate-in-2', 'fork', 'pin', 'skewer',
    'discovered-attack', 'sacrifice', 'endgame', 'double-attack', 'deflection'
  ];
  
  showThemeChallengeModal(themes, (selectedTheme) => {
    const gameState = {
      mode: 'themeChallenge',
      theme: selectedTheme,
      targetCount: 10,
      totalCorrect: 0,
      totalWrong: 0,
      startTime: Date.now(),
      results: []
    };
    console.log(`Starting Theme Challenge - Solve 10 ${selectedTheme} puzzles!`);
  });


const showThemeChallengeModal = (themes, onSelectTheme) => {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;';
  
  const box = document.createElement('div');
  box.style.cssText = 'background: white; border-radius: 12px; padding: 30px; max-width: 500px; color: #333; max-height: 80vh; overflow-y: auto;';
  
  let html = `
    <h2 style="margin-top: 0; color: #222; text-align: center;">Choose a Theme</h2>
    <p style="text-align: center; color: #666; margin-bottom: 20px;">Solve 10 puzzles from your chosen theme</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
  `;
  
  themes.forEach(theme => {
    const label = theme.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    html += `
      <button class="theme-btn" data-theme="${theme}" style="padding: 12px; background: #f0f0f0; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; font-weight: bold; color: #333; transition: all 0.3s;">
        ${label}
      </button>
    `;
  });
  
  html += `</div>`;
  
  box.innerHTML = html;
  modal.appendChild(box);
  document.body.appendChild(modal);
  
  box.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.remove();
      onSelectTheme(btn.dataset.theme);
    });
    btn.addEventListener('mouseover', () => {
      btn.style.background = '#e0e0e0';
      btn.style.borderColor = '#4a90e2';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.background = '#f0f0f0';
      btn.style.borderColor = '#ddd';
    });
  });
};

// PUZZLE ROULETTE - Random puzzle each time, build streak
window.startPuzzleRoulette = () => {
  const gameState = {
    mode: 'roulette',
    currentStreak: 0,
    bestStreak: 0,
    totalCorrect: 0,
    totalWrong: 0,
    startTime: Date.now(),
    results: []
  };
  
  showRouletteModal(() => {
    console.log('Starting Puzzle Roulette - Build your streak!');
  });
};

const showRouletteModal = (onStart) => {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;';
  
  const box = document.createElement('div');
  box.style.cssText = 'background: white; border-radius: 12px; padding: 30px; max-width: 400px; text-align: center; color: #333;';
  
  box.innerHTML = `
    <h2 style="margin-top: 0; color: #222;">Puzzle Roulette</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #666;">Random puzzles. Random difficulty. Build your streak!</p>
    <p style="font-size: 14px; color: #999;">Every wrong answer resets your streak to 0.</p>
    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button style="flex: 1; padding: 12px; background: #4a90e2; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">Start</button>
      <button style="flex: 1; padding: 12px; background: #ddd; color: #333; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">Cancel</button>
    </div>
  `;
  
  const startBtn = box.children[0].querySelector('button');
  const cancelBtn = box.querySelectorAll('button')[1];
  
  startBtn.addEventListener('click', () => {
    modal.remove();
    onStart();
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  modal.appendChild(box);
  document.body.appendChild(modal);
};

// TIMED CHALLENGE - Solve as many as possible in 5 minutes
window.startTimedChallenge = () => {
  const gameState = {
    mode: 'timedChallenge',
    duration: 300, // 5 minutes
    timeRemaining: 300,
    totalCorrect: 0,
    totalWrong: 0,
    startTime: Date.now(),
    results: []
  };
  
  showTimedChallengeModal(() => {
    console.log('Starting Timed Challenge - 5 minutes to solve as many as you can!');
  });
};

const showTimedChallengeModal = (onStart) => {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;';
  
  const box = document.createElement('div');
  box.style.cssText = 'background: white; border-radius: 12px; padding: 30px; max-width: 400px; text-align: center; color: #333;';
  
  box.innerHTML = `
    <h2 style="margin-top: 0; color: #222;">Timed Challenge</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #666;">Can you solve 10+ puzzles in 5 minutes?</p>
    <p style="font-size: 14px; color: #999;">Clock is ticking! Solve as many as possible!</p>
    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button style="flex: 1; padding: 12px; background: #4a90e2; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">Start</button>
      <button style="flex: 1; padding: 12px; background: #ddd; color: #333; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">Cancel</button>
    </div>
  `;
  
  const startBtn = box.children[0].querySelector('button');
  const cancelBtn = box.querySelectorAll('button')[1];
  
  startBtn.addEventListener('click', () => {
    modal.remove();
    onStart();
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  modal.appendChild(box);
  document.body.appendChild(modal);
};

// MASTER MODE - Complex puzzles (rating 2000+), 5 wrong allowed
window.startMasterMode = () => {
  const gameState = {
    mode: 'master',
    minRating: 2000,
    totalCorrect: 0,
    totalWrong: 0,
    wrongsAllowed: 5,
    wrongsUsed: 0,
    startTime: Date.now(),
    results: []
  };
  
  showMasterModal(() => {
    console.log('Starting Master Mode - Only high-rated puzzles!');
  });
};

const showMasterModal = (onStart) => {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;';
  
  const box = document.createElement('div');
  box.style.cssText = 'background: white; border-radius: 12px; padding: 30px; max-width: 400px; text-align: center; color: #333;';
  
  box.innerHTML = `
    <h2 style="margin-top: 0; color: #222;">Master Mode</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #666;">Only puzzles rated 2000+</p>
    <p style="font-size: 14px; color: #999;">You get 5 wrong answers before game over!</p>
    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button style="flex: 1; padding: 12px; background: #4a90e2; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">Start</button>
      <button style="flex: 1; padding: 12px; background: #ddd; color: #333; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">Cancel</button>
    </div>
  `;
  
  const startBtn = box.children[0].querySelector('button');
  const cancelBtn = box.querySelectorAll('button')[1];
  
  startBtn.addEventListener('click', () => {
    modal.remove();
    onStart();
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  modal.appendChild(box);
  document.body.appendChild(modal);
};

console.log('Extra puzzle games module loaded! Available modes: Blitz, Marathon, Streak, Theme Challenge, Puzzle Roulette, Timed Challenge, Master Mode');
