// play.js - interactions for play.html (offline / single-device mode)

// Global socket for WebSocket communication (kept but never opened on this page)
let socket = null;

// Flag: online play disabled on this page
const ONLINE_PLAY_DISABLED = true;

// Device ID management - get device ID from main login
function getDeviceId() {
  return localStorage.getItem('device_id') || 'unknown';
}

// Handle logout request from server (device conflict)
// In offline mode this will never be called because we never open a socket,
// but we keep the function so other scripts that reference it do not break.
function handleLogoutRequest(msg) {
  console.log('handleLogoutRequest called in offline mode, ignoring.', msg);
}

// Handle account switch request (new message type)
function handleAccountSwitchRequest(msg) {
  console.log('handleAccountSwitchRequest called in offline mode, ignoring.', msg);
}

// Game state persistence
function saveGameState(fen, whiteTime, blackTime, timeControl, moves) {
  const state = { fen, whiteTime, blackTime, timeControl, moves };
  localStorage.setItem('chessGameState', JSON.stringify(state));
}

function loadGameState() {
  const saved = localStorage.getItem('chessGameState');
  return saved ? JSON.parse(saved) : null;
}

function clearGameState() {
  localStorage.removeItem('chessGameState');
}

function parseTimeControl(timeStr) {
  if (timeStr.includes('|')) {
    // Format: "1|1" (minutes|increment)
    const [mins, inc] = timeStr.split('|').map(Number);
    return { baseTime: mins * 60, increment: inc };
  } else {
    // Format: "10 min"
    const match = timeStr.match(/(\d+)\s*min/);
    const baseTime = match ? parseInt(match[1]) * 60 : 600;
    return { baseTime, increment: 0 };
  }
}

function getPieceImage(piece, color) {
  const pieceMap = { p: 'P', r: 'R', n: 'N', b: 'B', q: 'Q', k: 'K' };
  const img = pieceMap[piece] || piece.toUpperCase();
  return `../../Images/Chesspieces/${color}${img}.png`;
}

function updateMovesDisplay() {
  try {
    console.log('📝 updateMovesDisplay called, finding moves-list elements...');
    const movesLists = document.querySelectorAll('#moves-list');
    console.log('Found', movesLists.length, 'moves-list elements');
    
    movesLists.forEach((movesList, listIndex) => {
      try {
        movesList.innerHTML = '';
        let globalIndex = 0;
        moves.forEach((move) => {
          const moveNumber = Math.floor(globalIndex / 2) + 1;
          const isWhite = globalIndex % 2 === 0;
          const prefix = isWhite ? `${moveNumber}. ` : `${moveNumber}... `;
          const item = document.createElement('div');
          item.className = 'move-item';
          const img = document.createElement('img');
          img.src = getPieceImage(move.piece, move.color);
          img.alt = move.piece;
          const span = document.createElement('span');
          span.textContent = prefix + move.san;
          item.appendChild(img);
          item.appendChild(span);
          movesList.appendChild(item);
          globalIndex++;
        });
        console.log('✓ Updated moves-list #' + listIndex);
      } catch (e) {
        console.error('Error updating moves-list #' + listIndex, e);
      }
    });
  } catch (e) {
    console.error('ERROR in updateMovesDisplay:', e);
    throw e;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Helper to create beautiful confirmation dialogs
  function showCustomAlert(title, message, onConfirm, onCancel) {
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = '#2a2a2a';
    dialog.style.border = '2px solid rgb(58, 160, 255)';
    dialog.style.borderRadius = '10px';
    dialog.style.padding = '25px';
    dialog.style.zIndex = '9999';
    dialog.style.textAlign = 'center';
    dialog.style.color = 'white';
    dialog.style.minWidth = '280px';
    dialog.style.fontFamily = 'Arial, sans-serif';
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.marginTop = '0';
    titleEl.style.marginBottom = '15px';
    titleEl.style.color = 'rgb(58, 160, 255)';
    dialog.appendChild(titleEl);
    
    const msgEl = document.createElement('p');
    msgEl.textContent = message;
    msgEl.style.marginBottom = '20px';
    msgEl.style.fontSize = '14px';
    msgEl.style.color = '#ccc';
    dialog.appendChild(msgEl);
    
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '10px';
    btnContainer.style.justifyContent = 'center';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Yes';
    confirmBtn.style.padding = '10px 25px';
    confirmBtn.style.background = 'rgb(58, 160, 255)';
    confirmBtn.style.color = 'white';
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '5px';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.style.fontSize = '14px';
    confirmBtn.style.fontWeight = 'bold';
    confirmBtn.onclick = () => {
      document.body.removeChild(dialog);
      if (onConfirm) onConfirm();
    };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'No';
    cancelBtn.style.padding = '10px 25px';
    cancelBtn.style.background = '#555';
    cancelBtn.style.color = 'white';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '5px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '14px';
    cancelBtn.style.fontWeight = 'bold';
    cancelBtn.onclick = () => {
      document.body.removeChild(dialog);
      if (onCancel) onCancel();
    };
    
    btnContainer.appendChild(confirmBtn);
    btnContainer.appendChild(cancelBtn);
    dialog.appendChild(btnContainer);
    
    document.body.appendChild(dialog);
  }

  // Helper to wait for Chess library to be available
  async function ensureChessAvailable() {
    let attempts = 0;
    while (!window.Chess && attempts < 20) {  // Reduced from 50 to 20 (2 seconds instead of 5)
      console.log('Waiting for Chess library...', attempts);
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (!window.Chess) {
      console.warn('Chess library failed to load after 2 seconds — attaching fallback engine');
      // Lightweight fallback chess implementation (full basic rules, from your original file)
      class MiniChess {
        constructor(){ this.reset(); }
        reset(){
          const r = (c) => ({type:c,color:'b'});
          const R = (c) => ({type:c,color:'w'});
          this._board = [
            [r('r'),r('n'),r('b'),r('q'),r('k'),r('b'),r('n'),r('r')],
            [r('p'),r('p'),r('p'),r('p'),r('p'),r('p'),r('p'),r('p')],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            [R('p'),R('p'),R('p'),R('p'),R('p'),R('p'),R('p'),R('p')],
            [R('r'),R('n'),R('b'),R('q'),R('k'),R('b'),R('n'),R('r')]
          ];
          this._turn = 'w';
          this._halfMoveCount = 0;
          this._moveHistory = [];
          this._positionHistory = [];
          this._castleRights = {w: {k: true, q: true}, b: {k: true, q: true}};
          this._enPassantSquare = null;
          this._lastMove = null;
        }
        _coords(sq){
          const file = sq[0]; const rank = parseInt(sq[1],10);
          const c = file.charCodeAt(0) - 97; const r = 8 - rank; return {r,c};
        }
        board(){ return this._board.map(row => row.map(cell => cell ? { ...cell } : null)); }
        turn(){ return this._turn; }
        
        _getBoardHash() {
          let hash = '';
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const p = this._board[r][c];
              hash += p ? (p.color + p.type) : '-';
            }
          }
          return hash + this._turn;
        }
        
        _hasInsufficientMaterial() {
          const pieces = {w: {p:0, n:0, b:0, r:0, q:0}, b: {p:0, n:0, b:0, r:0, q:0}};
          const bishops = {w: [], b: []};
          
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const p = this._board[r][c];
              if (p && p.type !== 'k') {
                pieces[p.color][p.type]++;
                if (p.type === 'b') {
                  bishops[p.color].push({r, c});
                }
              }
            }
          }
          
          const wP = pieces.w, bP = pieces.b;
          
          // K vs K
          if (wP.p === 0 && wP.n === 0 && wP.b === 0 && wP.r === 0 && wP.q === 0 &&
              bP.p === 0 && bP.n === 0 && bP.b === 0 && bP.r === 0 && bP.q === 0) return true;
          
          // K+N vs K or K+B vs K
          const wPieces = wP.n + wP.b;
          const bPieces = bP.n + bP.b;
          
          if (wP.p === 0 && wP.r === 0 && wP.q === 0 && bP.p === 0 && bP.n === 0 && bP.b === 0 && bP.r === 0 && bP.q === 0 && wPieces <= 1) return true;
          if (bP.p === 0 && bP.r === 0 && bP.q === 0 && wP.p === 0 && wP.n === 0 && wP.b === 0 && wP.r === 0 && wP.q === 0 && bPieces <= 1) return true;
          
          // K+N vs K+N
          if (wP.p === 0 && wP.b === 0 && wP.r === 0 && wP.q === 0 && wP.n === 1 &&
              bP.p === 0 && bP.b === 0 && bP.r === 0 && bP.q === 0 && bP.n === 1) return true;
          
          // K+B vs K+B (same color bishops)
          if (wP.p === 0 && wP.n === 0 && wP.r === 0 && wP.q === 0 && wP.b === 1 &&
              bP.p === 0 && bP.n === 0 && bP.r === 0 && bP.q === 0 && bP.b === 1) {
            const wBishopColor = (bishops.w[0].r + bishops.w[0].c) % 2;
            const bBishopColor = (bishops.b[0].r + bishops.b[0].c) % 2;
            if (wBishopColor === bBishopColor) return true;
          }
          
          return false;
        }
        
        hasLegalMoves(){
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              if (this._board[r][c] && this._board[r][c].color === this._turn) {
                const pseudoMoves = this._getLegalMoves(r, c);
                for (let [toR, toC] of pseudoMoves) {
                  if (this._isMoveLegal(r, c, toR, toC)) {
                    return true;
                  }
                }
              }
            }
          }
          return false;
        }
        
        _isMoveLegal(fromR, fromC, toR, toC) {
          const piece = this._board[fromR][fromC];
          const target = this._board[toR][toC];
          this._board[toR][toC] = piece;
          this._board[fromR][fromC] = null;
          const inCheck = this._isInCheck(piece.color);
          this._board[fromR][fromC] = piece;
          this._board[toR][toC] = target;
          return !inCheck;
        }
        
        _isSquareAttacked(r, c, byColor) {
          for (let r2 = 0; r2 < 8; r2++) {
            for (let c2 = 0; c2 < 8; c2++) {
              const p = this._board[r2][c2];
              if (!p || p.color !== byColor) continue;
              
              if (p.type === 'p') {
                const dir = byColor === 'w' ? -1 : 1;
                if (r2 + dir === r && (c2 - 1 === c || c2 + 1 === c)) return true;
              } else if (p.type === 'n') {
                const diffs = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                for (let [dr, dc] of diffs) {
                  if (r2 + dr === r && c2 + dc === c) return true;
                }
              } else if (p.type === 'k') {
                if (Math.abs(r2 - r) <= 1 && Math.abs(c2 - c) <= 1) return true;
              } else if (p.type === 'b' || p.type === 'q') {
                const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
                for (let [dr, dc] of dirs) {
                  for (let dist = 1; dist < 8; dist++) {
                    const nr = r2 + dr*dist, nc = c2 + dc*dist;
                    if (nr === r && nc === c) return true;
                    if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
                    if (this._board[nr][nc]) break;
                  }
                }
                if (p.type === 'b') continue;
              }
              if (p.type === 'r' || p.type === 'q') {
                const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
                for (let [dr, dc] of dirs) {
                  for (let dist = 1; dist < 8; dist++) {
                    const nr = r2 + dr*dist, nc = c2 + dc*dist;
                    if (nr === r && nc === c) return true;
                    if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
                    if (this._board[nr][nc]) break;
                  }
                }
              }
            }
          }
          return false;
        }
        
        _getLegalMoves(fromR, fromC) {
          const piece = this._board[fromR][fromC];
          if (!piece || piece.color !== this._turn) return [];
          
          const moves = [];
          const isWhite = piece.color === 'w';
          const directions = {
            'p': isWhite ? [[-1,0],[-2,0],[-1,-1],[-1,1]] : [[1,0],[2,0],[1,-1],[1,1]],
            'n': [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
            'b': [[-1,-1],[-1,1],[1,-1],[1,1]],
            'r': [[-1,0],[1,0],[0,-1],[0,1]],
            'q': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
            'k': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
          };
          
          const dirs = directions[piece.type] || [];
          const opponent = isWhite ? 'b' : 'w';
          
          if (piece.type === 'p') {
            const dir = isWhite ? -1 : 1;
            const newR = fromR + dir;
            if (newR >= 0 && newR <= 7 && !this._board[newR][fromC]) {
              moves.push([newR, fromC]);
              const startR = isWhite ? 6 : 1;
              if (fromR === startR && !this._board[fromR + 2*dir][fromC]) {
                moves.push([fromR + 2*dir, fromC]);
              }
            }
            for (let dc of [-1, 1]) {
              const nr = fromR + dir, nc = fromC + dc;
              if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                const target = this._board[nr][nc];
                if (target && target.color !== piece.color) moves.push([nr, nc]);
              }
            }
            if (this._lastMove && this._lastMove.piece === 'p' && Math.abs(this._lastMove.fromR - this._lastMove.toR) === 2) {
              if (fromR === this._lastMove.toR && Math.abs(fromC - this._lastMove.toC) === 1) {
                const epR = this._lastMove.toR + (isWhite ? 1 : -1);
                const epC = this._lastMove.toC;
                moves.push([fromR + dir, epC]);
              }
            }
          } else if (piece.type === 'n') {
            for (let [dr, dc] of dirs) {
              const nr = fromR + dr, nc = fromC + dc;
              if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                const target = this._board[nr][nc];
                if (!target || target.color !== piece.color) moves.push([nr, nc]);
              }
            }
          } else if (['b','r','q'].includes(piece.type)) {
            for (let [dr, dc] of dirs) {
              for (let dist = 1; dist < 8; dist++) {
                const nr = fromR + dr*dist, nc = fromC + dc*dist;
                if (nr < 0 || nr > 7 || nc < 0 || nc > 7) break;
                const target = this._board[nr][nc];
                if (!target) moves.push([nr, nc]);
                else {
                  if (target.color !== piece.color) moves.push([nr, nc]);
                  break;
                }
              }
            }
          } else if (piece.type === 'k') {
            for (let [dr, dc] of dirs) {
              const nr = fromR + dr, nc = fromC + dc;
              if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                const target = this._board[nr][nc];
                if (!target || target.color !== piece.color) {
                  if (!this._isSquareAttacked(nr, nc, opponent)) {
                    moves.push([nr, nc]);
                  }
                }
              }
            }
            if (!this._isInCheck(piece.color)) {
              const castleRights = this._castleRights[piece.color];
              if (castleRights.k) {
                const rookC = 7;
                const rook = this._board[fromR][rookC];
                if (rook && rook.type === 'r' && !this._isSquareAttacked(fromR, 5, opponent) && !this._isSquareAttacked(fromR, 6, opponent)) {
                  if (!this._board[fromR][5] && !this._board[fromR][6]) {
                    moves.push([fromR, 6]);
                  }
                }
              }
              if (castleRights.q) {
                const rookC = 0;
                const rook = this._board[fromR][rookC];
                if (rook && rook.type === 'r' && !this._isSquareAttacked(fromR, 3, opponent) && !this._isSquareAttacked(fromR, 2, opponent)) {
                  if (!this._board[fromR][1] && !this._board[fromR][2] && !this._board[fromR][3]) {
                    moves.push([fromR, 2]);
                  }
                }
              }
            }
          }
          
          return moves;
        }
        
        _isInCheck(color) {
          let kingPos = null;
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              if (this._board[r][c] && this._board[r][c].type === 'k' && this._board[r][c].color === color) {
                kingPos = {r, c};
                break;
              }
            }
            if (kingPos) break;
          }
          if (!kingPos) return false;
          const opponent = color === 'w' ? 'b' : 'w';
          return this._isSquareAttacked(kingPos.r, kingPos.c, opponent);
        }
        
        isCheck(){ return this._isInCheck(this._turn); }
        isCheckmate(){ return this._isInCheck(this._turn) && !this.hasLegalMoves(); }
        isStalemate(){ return !this._isInCheck(this._turn) && !this.hasLegalMoves(); }
        isDraw50Moves(){ return this._halfMoveCount >= 100; }
        isThreefoldRepetition() {
          const currentHash = this._getBoardHash();
          let count = 0;
          for (let h of this._positionHistory) {
            if (h === currentHash) count++;
          }
          return count >= 3;
        }
        isDrawByInsufficientMaterial() {
          return this._hasInsufficientMaterial();
        }
        
        move({from,to,promotion}){
          if (this.isCheckmate() || this.isStalemate() || this.isDraw50Moves() || this.isThreefoldRepetition() || this.isDrawByInsufficientMaterial()) {
            return null;
          }
          
          let f, t;
          try { f = this._coords(from); t = this._coords(to); } catch(e) { return null; }
          if (f.r < 0 || f.r > 7 || f.c < 0 || f.c > 7 || t.r < 0 || t.r > 7 || t.c < 0 || t.c > 7) return null;
          
          const legalMoves = this._getLegalMoves(f.r, f.c);
          if (!legalMoves.some(m => m[0] === t.r && m[1] === t.c)) {
            console.log('❌ Illegal move:', from, 'to', to);
            return null;
          }
          
          if (!this._isMoveLegal(f.r, f.c, t.r, t.c)) {
            console.log('❌ Move would leave king in check:', from, 'to', to);
            return null;
          }
          
          const piece = this._board[f.r][f.c];
          const target = this._board[t.r][t.c];
          
          this._positionHistory.push(this._getBoardHash());
          
          let isEnPassant = false;
          let isCastling = false;
          let isPromotion = false;
          
          if (piece.type === 'p' && !target && t.c !== f.c) {
            isEnPassant = true;
            const captureR = f.r;
            this._board[captureR][t.c] = null;
          }
          
          if (piece.type === 'k' && Math.abs(t.c - f.c) === 2) {
            isCastling = true;
            if (t.c > f.c) {
              const rook = this._board[f.r][7];
              this._board[f.r][5] = rook;
              this._board[f.r][7] = null;
            } else {
              const rook = this._board[f.r][0];
              this._board[f.r][3] = rook;
              this._board[f.r][0] = null;
            }
            this._castleRights[piece.color] = {k: false, q: false};
          }
          
          this._board[t.r][t.c] = piece;
          this._board[f.r][f.c] = null;
          
          if (piece.type === 'p' && (t.r === 0 || t.r === 7)) {
            isPromotion = true;
            const promoteTo = promotion || 'q';
            piece.type = promoteTo;
          }
          
          if (piece.type === 'k') {
            this._castleRights[piece.color] = {k: false, q: false};
          }
          if (piece.type === 'r' || target?.type === 'r') {
            if (f.c === 0) this._castleRights[piece.color].q = false;
            if (f.c === 7) this._castleRights[piece.color].k = false;
            if (t.c === 0 && target) this._castleRights[target.color].q = false;
            if (t.c === 7 && target) this._castleRights[target.color].k = false;
          }
          
          this._lastMove = {
            piece: piece.type,
            fromR: f.r,
            fromC: f.c,
            toR: t.r,
            toC: t.c
          };
          
          if (target || piece.type === 'p') {
            this._halfMoveCount = 0;
          } else {
            this._halfMoveCount++;
          }
          
          const san = `${from}-${to}${isPromotion ? '=' + promotion : ''}`;
          this._moveHistory.push(san);
          this._turn = this._turn === 'w' ? 'b' : 'w';
          
          return { san, piece: piece.type, color: piece.color, from, to, capture: !!target, isEnPassant, isCastling, isPromotion };
        }
      }
      window.Chess = MiniChess;
      return true;
    }
    console.log('Chess library is available');
    return true;
  }
  
  // shared state for the play game
  let game = null; // chess.js instance (initialized when available)
  let pulseInterval = null;
  let moves = []; // array to store moves
  let isMatching = false; // kept for compatibility
  let currentMatch = null; // kept for compatibility
  
  // User info
  let currentUserName = document.getElementById('sidebar-name')?.textContent?.trim() || 'Player';
  let currentUserRating = document.getElementById('sidebar-rating')?.textContent?.trim() || '1400';
  
  // Try to improve user data from server (non-critical)
  fetch('/whoami')
    .then(r => r.json())
    .then(data => {
      if (data.displayName) {
        currentUserName = data.displayName;
        console.log('Updated user name from server:', currentUserName);
      }
    })
    .catch(e => console.warn('Could not fetch user from /whoami', e));
  
  const boardElement = document.getElementById('chessboard');
  console.log('play.js: DOMContentLoaded, board element:', boardElement);
  console.log('Current user:', currentUserName, 'Rating:', currentUserRating);

  // IMPORTANT: WebSocket initialization is REMOVED for this page
  // (socket stays null, so no online communication happens)

  if (boardElement) {
    // create 8x8 squares - rank 8 at top, rank 1 at bottom, a-file at left, h-file at right
    for (let r = 8; r >= 1; r--) {
      for (let f = 1; f <= 8; f++) {
        const sq = document.createElement('div');
        sq.className = 'square';
        const isLight = (r + f) % 2 === 1;
        sq.classList.add(isLight ? 'light' : 'dark');
        sq.dataset.square = `${String.fromCharCode(96+f)}${r}`;
        boardElement.appendChild(sq);
      }
    }
    console.log('play.js: Created 64 squares');

    // render starting position on board (display mode, no moves)
    renderStartingPosition(boardElement);
  }
  
  function renderStartingPosition(boardEl) {
    boardEl.querySelectorAll('.square').forEach(sq => {
      sq.innerHTML = '';
      delete sq.dataset.piece;
      delete sq.dataset.owner;
    });
    const startingPieces = {
      a8: 'bR', b8: 'bN', c8: 'bB', d8: 'bQ', e8: 'bK', f8: 'bB', g8: 'bN', h8: 'bR',
      a7: 'bP', b7: 'bP', c7: 'bP', d7: 'bP', e7: 'bP', f7: 'bP', g7: 'bP', h7: 'bP',
      a2: 'wP', b2: 'wP', c2: 'wP', d2: 'wP', e2: 'wP', f2: 'wP', g2: 'wP', h2: 'wP',
      a1: 'wR', b1: 'wN', c1: 'wB', d1: 'wQ', e1: 'wK', f1: 'wB', g1: 'wN', h1: 'wR'
    };
    for (const [sqName, code] of Object.entries(startingPieces)) {
      const sqEl = boardEl.querySelector(`.square[data-square='${sqName}']`);
      if (sqEl) {
        const img = document.createElement('img');
        img.className = 'piece-img';
        img.src = `../../Images/Chesspieces/${code}.png`;
        img.alt = code;
        sqEl.appendChild(img);
        sqEl.dataset.piece = code;
        sqEl.dataset.owner = code[0];
      }
    }
  }

  // Set up board interaction and game logic (local only)
  const boardSquares = document.querySelectorAll('#chessboard .square');
  const status = document.getElementById('play-status') || document.createElement('div');
  let selectedTimeControl = '10 min';
  let gameOver = false;
  let timerInterval = null;

  // Default time control selection
  setTimeout(() => {
    const defaultBtn = document.querySelector('.time-btn[data-time="10 min"]');
    if (defaultBtn) {
      defaultBtn.classList.add('selected');
      selectedTimeControl = '10 min';
    }
  }, 100);

  // Time control buttons
  document.body.addEventListener('click', (e) => {
    const timeBtn = e.target.closest && e.target.closest('.time-btn');
    if (timeBtn) {
      e.stopPropagation();
      document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('selected'));
      timeBtn.classList.add('selected');
      selectedTimeControl = timeBtn.dataset.time;
      console.log('Selected time control:', selectedTimeControl);
      return;
    }
  });

  // Game end modal (unchanged)
  function showGameEndModal(lastTimeControl) {
    const oldModal = document.getElementById('game-end-modal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'game-end-modal';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    modal.style.border = '3px solid rgb(58, 160, 255)';
    modal.style.borderRadius = '10px';
    modal.style.padding = '30px';
    modal.style.zIndex = '10000';
    modal.style.textAlign = 'center';
    modal.style.color = 'white';
    modal.style.minWidth = '300px';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '0';
    closeBtn.style.width = '30px';
    closeBtn.style.height = '30px';
    closeBtn.onclick = () => {
      modal.remove();
      window.location.href = './play.html';
    };
    modal.appendChild(closeBtn);
    
    const title = document.createElement('h2');
    title.textContent = 'Game Ended';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    modal.appendChild(title);
    
    const btn1 = document.createElement('button');
    btn1.className = 'btn';
    btn1.style.background = 'rgb(84, 48, 130)';
    btn1.style.color = 'white';
    btn1.style.padding = '12px 20px';
    btn1.style.margin = '10px';
    btn1.style.fontSize = '14px';
    btn1.style.borderRadius = '5px';
    btn1.style.border = 'none';
    btn1.style.cursor = 'pointer';
    btn1.textContent = 'New Game (Different Time)';
    btn1.onclick = () => {
      window.location.href = './play.html';
    };

    const btn2 = document.createElement('button');
    btn2.className = 'btn';
    btn2.style.background = 'rgb(58, 160, 255)';
    btn2.style.color = 'white';
    btn2.style.padding = '12px 20px';
    btn2.style.margin = '10px';
    btn2.style.fontSize = '14px';
    btn2.style.borderRadius = '5px';
    btn2.style.border = 'none';
    btn2.style.cursor = 'pointer';
    btn2.textContent = 'New Game (Same Time)';
    btn2.onclick = () => {
      window.location.href = './play.html';
    };

    modal.appendChild(btn1);
    modal.appendChild(btn2);
    document.body.appendChild(modal);
  }

  // Start / resign / draw handlers (draw & resign are now local-only)
  document.body.addEventListener('click', (e) => {
    const startEl = e.target.closest && e.target.closest('#start-game');
    if (startEl) {
      const time = selectedTimeControl || '10 min';
      if (window.recordMatchTimeControl) window.recordMatchTimeControl(time);
      try {
        startEl.disabled = true;
        const savedState = loadGameState();
        if (savedState && savedState.fen) {
          const resume = window.confirm('Do you want to resume your previous game?');
          if (!resume) {
            clearGameState();
          }
        }
        console.log('play.js: Start clicked, initializing game with time=', time);
        if (status) {
          status.style.display='block';
          status.className='status-message info';
          status.textContent = `Starting offline game as ${currentUserName}...`;
        }
        startProperGame(time).catch(err => {
          console.error('startProperGame error:', err);
          if (status) {
            status.style.display='block';
            status.className='status-message';
            status.textContent = 'Could not start game — see console.';
          }
          startEl.disabled = false;
        });

        const actionsDiv = document.querySelector('.actions');
        if (actionsDiv) actionsDiv.style.display = 'none';
        const gameActionsDiv = document.getElementById('game-actions');
        if (gameActionsDiv) {
          gameActionsDiv.style.display = 'flex';
        }
      } catch (err) {
        console.error('play.js: startProperGame error', err);
        if (status) {
          status.style.display='block';
          status.className='status-message';
          status.textContent = 'Could not start game — see console.';
        }
        startEl.disabled = false;
      }
      return;
    }
    
    const resignEl = e.target.closest && e.target.closest('#resign-btn');
    if (resignEl) {
      if (!game || gameOver) return;
      const playerColor = currentMatch ? currentMatch.color : 'w';
      const playerColorName = playerColor === 'w' ? 'White' : 'Black';
      const winner = playerColor === 'w' ? 'Black' : 'White';
      
      showCustomAlert(
        `Resign as ${playerColorName}?`,
        `Are you sure you want to resign? ${winner} will win the game.`,
        () => {
          gameOver = true;
          clearInterval(timerInterval);
          const boardEl = document.getElementById('chessboard');
          if (boardEl) {
            boardEl.style.pointerEvents = 'none';
            boardEl.style.opacity = '0.6';
          }
          if (status) {
            status.style.display = 'block';
            status.className = 'status-message info';
            status.textContent = `You resigned. ${winner} wins!`;
          }
          clearGameState();
          // No WebSocket broadcast in offline mode
          setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
        }
      );
      return;
    }
    
    const drawEl = e.target.closest && e.target.closest('#offer-draw-btn');
    if (drawEl) {
      if (!game || gameOver) return;
      const currentPlayer = game.turn() === 'w' ? 'White' : 'Black';
      
      showCustomAlert(
        `Offer Draw as ${currentPlayer}?`,
        `Are you sure you want to offer a draw?`,
        () => {
          // In offline mode, immediately treat as accepted draw
          gameOver = true;
          clearInterval(timerInterval);
          if (status) {
            status.style.display = 'block';
            status.className = 'status-message info';
            status.textContent = `Draw agreed. Game is a draw.`;
          }
          clearGameState();
          setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
        }
      );
      return;
    }
  });

  // Implement startProperGame, board click handling, timers etc.
  async function startProperGame(timeControlStr) {
    await ensureChessAvailable();
    const ChessEngine = window.Chess;
    game = new ChessEngine();
    moves = [];
    gameOver = false;

    const tc = parseTimeControl(timeControlStr);
    let whiteTime = tc.baseTime;
    let blackTime = tc.baseTime;
    let activeColor = 'w';

    const whiteClockEl = document.getElementById('white-clock') || document.querySelector('.white-clock');
    const blackClockEl = document.getElementById('black-clock') || document.querySelector('.black-clock');

    function renderClock(el, seconds) {
      if (!el) return;
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }

    renderClock(whiteClockEl, whiteTime);
    renderClock(blackClockEl, blackTime);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (gameOver) return;
      if (activeColor === 'w') {
        whiteTime = Math.max(0, whiteTime - 1);
        renderClock(whiteClockEl, whiteTime);
        if (whiteTime === 0) {
          gameOver = true;
          clearInterval(timerInterval);
          if (status) {
            status.style.display = 'block';
            status.className = 'status-message info';
            status.textContent = 'White lost on time. Black wins!';
          }
          clearGameState();
          setTimeout(() => { showGameEndModal(timeControlStr); }, 1500);
        }
      } else {
        blackTime = Math.max(0, blackTime - 1);
        renderClock(blackClockEl, blackTime);
        if (blackTime === 0) {
          gameOver = true;
          clearInterval(timerInterval);
          if (status) {
            status.style.display = 'block';
            status.className = 'status-message info';
            status.textContent = 'Black lost on time. White wins!';
          }
          clearGameState();
          setTimeout(() => { showGameEndModal(timeControlStr); }, 1500);
        }
      }
    }, 1000);

    // board click logic
    let selectedSquare = null;

    function clearHighlights() {
      boardSquares.forEach(sq => {
        sq.classList.remove('selected', 'valid-move', 'legal-move');
      });
    }

    function showLegalMoves(fromSquareEl) {
      clearHighlights();
      const from = fromSquareEl.dataset.square;
      const boardCopy = game.board();
      const coords = (sq) => {
        const file = sq[0]; const rank = parseInt(sq[1], 10);
        const c = file.charCodeAt(0) - 97; const r = 8 - rank; return {r, c};
      };
      const { r, c } = coords(from);
      const piece = boardCopy[r][c];
      if (!piece) return;
      const isWhite = piece.color === 'w';
      const legalMoves = game._getLegalMoves ? game._getLegalMoves(r, c) : [];
      legalMoves.forEach(([tr, tc]) => {
        const sqName = `${String.fromCharCode(97 + tc)}${8 - tr}`;
        const sqEl = document.querySelector(`.square[data-square='${sqName}']`);
        if (sqEl) {
          sqEl.classList.add('legal-move');
        }
      });
      fromSquareEl.classList.add('selected');
    }

    boardSquares.forEach(square => {
      square.addEventListener('click', () => {
        if (gameOver || !game) return;
        
        const hasPiece = !!square.dataset.piece;
        const currentTurn = game.turn();
        const playerColor = currentMatch ? currentMatch.color : 'w';

        if (currentTurn !== playerColor) {
          if (status) {
            status.style.display = 'block';
            status.className = 'status-message warning';
            status.textContent = `Waiting for opponent's move... (offline note: you can still move as both sides)`;
          }
          // In pure offline local mode, you might actually allow both sides;
          // here we keep the same behavior as your original code.
          return;
        }

        if (!selectedSquare && hasPiece && square.dataset.owner === playerColor) {
          selectedSquare = square;
          square.classList.add('selected');
          showLegalMoves(square);
          if (status) {
            status.style.display = 'block';
            status.className = 'status-message info';
            status.textContent = `Selected piece on ${square.dataset.square}`;
          }
          return;
        }

        if (selectedSquare === square) {
          square.classList.remove('selected');
          clearHighlights();
          selectedSquare = null;
          if (status) status.style.display = 'none';
          return;
        }

        if (selectedSquare && hasPiece && square.dataset.owner === currentTurn) {
          selectedSquare.classList.remove('selected');
          clearHighlights();
          selectedSquare = square;
          square.classList.add('selected');
          showLegalMoves(square);
          return;
        }

        if (selectedSquare) {
          const fromSquare = selectedSquare.dataset.square;
          const toSquare = square.dataset.square;

          const piece = selectedSquare.dataset.piece;
          let promotion = 'q';
          if (piece && piece.endsWith('P')) {
            const rank = parseInt(toSquare[1]);
            if ((piece.startsWith('w') && rank === 8) || (piece.startsWith('b') && rank === 1)) {
              showPawnPromotionDialog(selectedSquare, square).then(promotionChoice => {
                promotion = promotionChoice;
                attemptMove(fromSquare, toSquare, promotion);
              });
              return;
            }
          }
          attemptMove(fromSquare, toSquare, promotion);
        }
      });
    });

    async function attemptMove(fromSquare, toSquare, promotion) {
      try {
        const playerColor = currentMatch ? currentMatch.color : 'w';
        const moveResult = game.move({ from: fromSquare, to: toSquare, promotion: promotion });
        if (moveResult) {
          clearHighlights();

          const lastMove = moves.length ? moves[moves.length-1] : null;
          if (!lastMove || lastMove.san !== moveResult.san) {
            moves.push(moveResult);
            updateMovesDisplay();
          }

          // Update pieces on board DOM
          const fromEl = document.querySelector(`.square[data-square='${fromSquare}']`);
          const toEl = document.querySelector(`.square[data-square='${toSquare}']`);
          if (fromEl && toEl) {
            const pieceCode = fromEl.dataset.piece;
            fromEl.innerHTML = '';
            delete fromEl.dataset.piece;
            delete fromEl.dataset.owner;
            if (pieceCode) {
              const img = document.createElement('img');
              img.className = 'piece-img';
              img.src = `../../Images/Chesspieces/${pieceCode}.png`;
              img.alt = pieceCode;
              toEl.innerHTML = '';
              toEl.appendChild(img);
              toEl.dataset.piece = pieceCode;
              toEl.dataset.owner = pieceCode[0];
            }
          }

          selectedSquare = null;

          if (game.isCheckmate && game.isCheckmate()) {
            gameOver = true;
            clearInterval(timerInterval);
            if (status) {
              status.style.display = 'block';
              status.className = 'status-message info';
              status.textContent = `Checkmate! ${playerColor === 'w' ? 'White' : 'Black'} delivered mate.`;
            }
            clearGameState();
            setTimeout(() => { showGameEndModal(timeControlStr); }, 1500);
          } else if (game.isStalemate && game.isStalemate()) {
            gameOver = true;
            clearInterval(timerInterval);
            if (status) {
              status.style.display = 'block';
              status.className = 'status-message info';
              status.textContent = 'Stalemate! The game is a draw.';
            }
            clearGameState();
            setTimeout(() => { showGameEndModal(timeControlStr); }, 1500);
          } else {
            // Switch active color and apply increment
            if (activeColor === 'w') {
              whiteTime += tc.increment;
              activeColor = 'b';
            } else {
              blackTime += tc.increment;
              activeColor = 'w';
            }
            renderClock(whiteClockEl, whiteTime);
            renderClock(blackClockEl, blackTime);
            saveGameState(game.fen ? game.fen() : '', whiteTime, blackTime, timeControlStr, moves);
          }
        } else {
          if (status) {
            status.style.display = 'block';
            status.className = 'status-message warning';
            status.textContent = 'Illegal move.';
          }
        }
      } catch (e) {
        console.error('attemptMove error', e);
      }
    }
  }

  // Pawn promotion dialog
  function showPawnPromotionDialog(fromSquareEl, toSquareEl) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('promotion-dialog');
      if (!dialog) {
        resolve('q');
        return;
      }
      dialog.style.display = 'flex';
      const pieces = dialog.querySelectorAll('.promotion-piece');
      const handler = (e) => {
        const piece = e.currentTarget.dataset.piece || 'q';
        pieces.forEach(p => p.removeEventListener('click', handler));
        dialog.style.display = 'none';
        resolve(piece);
      };
      pieces.forEach(p => p.addEventListener('click', handler));
    });
  }

  // Pass & Play — local two-player mode
  const passPlayBtn = document.getElementById('pass-play');
  if (passPlayBtn) {
    passPlayBtn.addEventListener('click', () => {
      showCustomAlert(
        'Pass & Play',
        'This will start a local two-player game on this device only.',
        () => {
          window.location.href = './play.html';
        }
      );
    });
  }

  // If someone somehow calls handleServerMessage, keep a safe stub
  function handleServerMessage(msg) {
    console.log('handleServerMessage called in offline mode, ignoring.', msg);
  }
});