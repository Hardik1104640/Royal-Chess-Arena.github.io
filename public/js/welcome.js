// welcome.js
// Builds the real 8×8 chessboard and places pieces using images/chesspieces/<code>.png
// home.js handles: session check, sidebar, topbar, theme toggle, collapse, logout — untouched.

document.addEventListener('DOMContentLoaded', () => {

  // ── Chess piece image path ──────────────────────────────────────────
  // Edit this if your images live in a different folder
<<<<<<< HEAD
  const PIECE_IMG_PATH = './../../images/Chesspieces/';
=======
  const PIECE_IMG_PATH = 'https://hardik1104640.github.io/Royal-Chess-Arena.github.io/Images/Chesspieces/';
>>>>>>> ff605ed (improvements)

  // Unicode fallbacks if an image fails to load
  const PIECE_UNICODE = {
    wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
    bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟'
  };

  // ── Starting position (rank 8 → rank 1, a-file → h-file) ────────────
  // Each entry: piece code string or null for empty square.
  // Row 0 = rank 8 (black back rank), Row 7 = rank 1 (white back rank)
  const START_POS = [
    // rank 8  — black back rank
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    // rank 7  — black pawns
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    // rank 6
    [null,null,null,null,null,null,null,null],
    // rank 5
    [null,null,null,null,null,null,null,null],
    // rank 4
    [null,null,null,null,null,null,null,null],
    // rank 3
    [null,null,null,null,null,null,null,null],
    // rank 2  — white pawns
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    // rank 1  — white back rank
    ['wR','wN','wB','wQ','wK','wB','wN','wR'],
  ];

  // ── Build board ──────────────────────────────────────────────────────
  const board = document.getElementById('chessboard');
  if (!board) return;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = document.createElement('div');
      // Classic chess.com colouring: a1 (row7,col0) is light
      const isLight = (row + col) % 2 === 0;
      sq.className = 'sq ' + (isLight ? 'light' : 'dark');

      const code = START_POS[row][col];
      if (code) {
        const img = document.createElement('img');
        img.src = PIECE_IMG_PATH + code + '.png';
        img.alt = code;
        img.draggable = false;

        // Fallback: swap to unicode span if image fails
        img.addEventListener('error', () => {
          const span = document.createElement('span');
          span.textContent = PIECE_UNICODE[code] || '?';
          span.style.cssText =
            'font-size:clamp(18px,4vw,40px);line-height:1;' +
            'filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));' +
            'user-select:none;';
          img.replaceWith(span);
        });

        sq.appendChild(img);
      }

      board.appendChild(sq);
    }
  }

   const board2 = document.getElementById('chessboard2');
  if (!board2) return;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = document.createElement('div');
      // Classic chess.com colouring: a1 (row7,col0) is light
      const isLight = (row + col) % 2 === 0;
      sq.className = 'sq ' + (isLight ? 'light' : 'dark');

      const code = START_POS[row][col];
      if (code) {
        const img = document.createElement('img');
        img.src = PIECE_IMG_PATH + code + '.png';
        img.alt = code;
        img.draggable = false;

        // Fallback: swap to unicode span if image fails
        img.addEventListener('error', () => {
          const span = document.createElement('span');
          span.textContent = PIECE_UNICODE[code] || '?';
          span.style.cssText =
            'font-size:clamp(18px,4vw,40px);line-height:1;' +
            'filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));' +
            'user-select:none;';
          img.replaceWith(span);
        });

        sq.appendChild(img);
      }

      board2.appendChild(sq);
    }
  }

  // ── Save last-clicked play mode for buttons ──────────────────────────
  document.querySelectorAll('.hbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        const url  = new URL(btn.href, location.href);
        const mode = url.searchParams.get('mode');
        if (mode) localStorage.setItem('lastPlayMode', mode);
      } catch (e) { /* ignore */ }
    });
  });

  // ── Boards become clickable areas as well ───────────────────────────
  if (board) {
    board.addEventListener('click', () => {
      localStorage.setItem('lastPlayMode', 'online');
      // navigation handled by enclosing anchor
    });
  }
  if (board2) {
    board2.addEventListener('click', () => {
      localStorage.setItem('lastPlayMode', 'bot');
      // anchor will take user to bot page
    });
  }

});
