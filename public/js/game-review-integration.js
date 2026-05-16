// game-review-integration.js - Integration between play.html and review-system

/**
 * Save the last played game to sessionStorage for review
 * This is called when a game ends
 */
window.saveGameForReview = function(gameData) {
  try {
    // Store in sessionStorage for quick access across pages
    sessionStorage.setItem('lastPlayedGame', JSON.stringify({
      ...gameData,
      savedAt: new Date().toISOString()
    }));
    
    // Also store the game ID for URL-based navigation
    if (gameData.id) {
      sessionStorage.setItem('lastGameId', gameData.id);
    }
    
    console.log('Game saved for review:', gameData.id);
  } catch (error) {
    console.error('Failed to save game for review:', error);
  }
};

/**
 * Get the last played game from sessionStorage
 */
window.getLastPlayedGame = function() {
  try {
    const gameData = sessionStorage.getItem('lastPlayedGame');
    return gameData ? JSON.parse(gameData) : null;
  } catch (error) {
    console.error('Failed to retrieve last played game:', error);
    return null;
  }
};

/**
 * Navigate to the review/analysis page with the game data
 * Can be called from play.html with or without a specific game ID
 */
window.openGameReview = function(gameId = null) {
  try {
    let url = '../../review-system/client/public/apps/features/analysis.html';
    
    if (gameId) {
      // Pass game ID as URL parameter
      url += '?gameId=' + encodeURIComponent(gameId);
      sessionStorage.setItem('requestedGameId', gameId);
    } else {
      // Use the last played game
      const lastGameId = sessionStorage.getItem('lastGameId');
      if (lastGameId) {
        url += '?gameId=' + encodeURIComponent(lastGameId);
      }
    }
    
    window.location.href = url;
  } catch (error) {
    console.error('Failed to open game review:', error);
  }
};

/**
 * Create a review button for the game controls
 * Should be called after a game ends
 */
window.addGameReviewButton = function() {
  const gameActions = document.getElementById('game-actions');
  if (!gameActions) return;
  
  // Check if review button already exists
  if (document.getElementById('review-game-btn')) return;
  
  const reviewBtn = document.createElement('button');
  reviewBtn.id = 'review-game-btn';
  reviewBtn.className = 'btn btn-primary';
  reviewBtn.textContent = 'Review Game';
  reviewBtn.style.marginLeft = '10px';
  
  reviewBtn.addEventListener('click', function() {
    window.openGameReview();
  });
  
  gameActions.appendChild(reviewBtn);
};

/**
 * Initialize the game review integration
 * Should be called when play.html loads
 */
window.initializeGameReviewIntegration = function() {
  // Update the game review link with the last game ID if available
  const reviewLink = document.querySelector('a[href*="analysis.html"]');
  if (reviewLink) {
    const lastGameId = sessionStorage.getItem('lastGameId');
    if (lastGameId) {
      reviewLink.href += '?gameId=' + encodeURIComponent(lastGameId);
    }
  }
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initializeGameReviewIntegration);
} else {
  window.initializeGameReviewIntegration();
}

console.log('Game review integration loaded');
