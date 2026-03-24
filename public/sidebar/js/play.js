// play.js - interactions for play.html

// Global socket for WebSocket communication
let socket = null;

// Device ID management - get device ID from main login
function getDeviceId() {
  return localStorage.getItem('device_id') || 'unknown';
}

// Handle logout request from server (device conflict)
function handleLogoutRequest(msg) {
  const modal = document.getElementById('logout-request-modal');
  const msgEl = document.getElementById('logout-request-message');
  const acceptBtn = document.getElementById('logout-accept-btn');
  const rejectBtn = document.getElementById('logout-reject-btn');
  
  if (!modal || !msgEl) return;
  
  // Update modal message
  msgEl.textContent = msg.message || 'Someone is trying to login with a different account from this device.';
  
  // Remove old listeners
  const newAcceptBtn = acceptBtn.cloneNode(true);
  const newRejectBtn = rejectBtn.cloneNode(true);
  acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
  rejectBtn.parentNode.replaceChild(newRejectBtn, rejectBtn);
  
  // Add new listeners
  newAcceptBtn.addEventListener('click', () => {
    // User accepts - send response to server and logout
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'logout_response',
        accepted: true,
        deviceId: msg.deviceId
      }));
    }
    
    // Show modal and logout after short delay
    modal.classList.add('hidden');
    alert('You have been logged out. Another account is logging in from this device.');
    window.location.href = '/login.html';
  });
  
  newRejectBtn.addEventListener('click', () => {
    // User rejects - send response to server
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'logout_response',
        accepted: false,
        deviceId: msg.deviceId
      }));
    }
    
    modal.classList.add('hidden');
    alert('Login request rejected. You remain logged in.');
  });
  
  // Show modal
  modal.classList.remove('hidden');
}

// Handle account switch request (new message type)
function handleAccountSwitchRequest(msg) {
  const modal = document.getElementById('logout-request-modal');
  const msgEl = document.getElementById('logout-request-message');
  const acceptBtn = document.getElementById('logout-accept-btn');
  const rejectBtn = document.getElementById('logout-reject-btn');
  
  if (!modal || !msgEl) return;
  
  // Update modal message with account switch info
  msgEl.textContent = `${msg.newUserEmail} is trying to login on this device. Do you want to switch accounts?`;
  if (msg.newUserDisplayName) {
    msgEl.textContent += ` (${msg.newUserDisplayName})`;
  }
  
  // Update button labels
  acceptBtn.textContent = 'Switch Account';
  rejectBtn.textContent = 'Stay Logged In';
  
  // Remove old listeners
  const newAcceptBtn = acceptBtn.cloneNode(true);
  const newRejectBtn = rejectBtn.cloneNode(true);
  acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
  rejectBtn.parentNode.replaceChild(newRejectBtn, rejectBtn);
  
  // Add new listeners
  newAcceptBtn.addEventListener('click', () => {
    // User accepts switch
    console.log('User accepted account switch');
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'account_switch_response',
        accepted: true,
        deviceId: getDeviceId()
      }));
    }
    
    modal.classList.add('hidden');
    alert('Account switch accepted. Logging out...');
    window.location.href = '/login.html';
  });
  
  newRejectBtn.addEventListener('click', () => {
    // User rejects switch
    console.log('User rejected account switch');
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'account_switch_response',
        accepted: false,
        deviceId: getDeviceId()
      }));
    }
    
    modal.classList.add('hidden');
    alert('You kept your current account. New login was blocked.');
  });
  
  // Show the modal
  modal.classList.remove('hidden');
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
      // Lightweight fallback chess implementation (very basic, no legal move validation)
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
                // Check each pseudo-legal move to see if it's truly legal
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
        
        // Check if a move would leave king in check
        _isMoveLegal(fromR, fromC, toR, toC) {
          const piece = this._board[fromR][fromC];
          const target = this._board[toR][toC];
          
          // Simulate the move
          this._board[toR][toC] = piece;
          this._board[fromR][fromC] = null;
          
          // Check if king is in check after this move
          const inCheck = this._isInCheck(piece.color);
          
          // Undo the move
          this._board[fromR][fromC] = piece;
          this._board[toR][toC] = target;
          
          return !inCheck;
        }
        
        _isSquareAttacked(r, c, byColor) {
          for (let r2 = 0; r2 < 8; r2++) {
            for (let c2 = 0; c2 < 8; c2++) {
              const p = this._board[r2][c2];
              if (!p || p.color !== byColor) continue;
              
              // Check if this piece can attack the square
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
                // Diagonal
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
                // Straight (horizontal/vertical)
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
        
        // Get all legal moves for a square
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
            // Regular captures
            for (let dc of [-1, 1]) {
              const nr = fromR + dir, nc = fromC + dc;
              if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                const target = this._board[nr][nc];
                if (target && target.color !== piece.color) moves.push([nr, nc]);
              }
            }
            // En passant
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
            // Normal king moves
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
            
            // Castling
            if (!this._isInCheck(piece.color)) {
              const castleRights = this._castleRights[piece.color];
              
              // Kingside castling
              if (castleRights.k) {
                const rookC = 7;
                const rook = this._board[fromR][rookC];
                if (rook && rook.type === 'r' && !this._isSquareAttacked(fromR, 5, opponent) && !this._isSquareAttacked(fromR, 6, opponent)) {
                  if (!this._board[fromR][5] && !this._board[fromR][6]) {
                    moves.push([fromR, 6]);
                  }
                }
              }
              
              // Queenside castling
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
        
        isCheckmate(){
          return this._isInCheck(this._turn) && !this.hasLegalMoves();
        }
        
        isStalemate(){
          return !this._isInCheck(this._turn) && !this.hasLegalMoves();
        }
        
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
          // Reject move if game already over
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
          
          // Check if move would leave king in check
          if (!this._isMoveLegal(f.r, f.c, t.r, t.c)) {
            console.log('❌ Move would leave king in check:', from, 'to', to);
            return null;
          }
          
          const piece = this._board[f.r][f.c];
          const target = this._board[t.r][t.c];
          
          // Store position before move for repetition tracking
          this._positionHistory.push(this._getBoardHash());

          // Handle special moves
          let isEnPassant = false;
          let isCastling = false;
          let isPromotion = false;
          
          // En passant capture
          if (piece.type === 'p' && !target && t.c !== f.c) {
            isEnPassant = true;
            const captureR = f.r;
            this._board[captureR][t.c] = null;
          }
          
          // Castling
          if (piece.type === 'k' && Math.abs(t.c - f.c) === 2) {
            isCastling = true;
            if (t.c > f.c) { // Kingside
              const rook = this._board[f.r][7];
              this._board[f.r][5] = rook;
              this._board[f.r][7] = null;
            } else { // Queenside
              const rook = this._board[f.r][0];
              this._board[f.r][3] = rook;
              this._board[f.r][0] = null;
            }
            this._castleRights[piece.color] = {k: false, q: false};
          }
          
          // Move piece
          this._board[t.r][t.c] = piece;
          this._board[f.r][f.c] = null;
          
          // Pawn promotion
          if (piece.type === 'p' && (t.r === 0 || t.r === 7)) {
            isPromotion = true;
            const promoteTo = promotion || 'q';
            piece.type = promoteTo;
          }
          
          // Update castling rights
          if (piece.type === 'k') {
            this._castleRights[piece.color] = {k: false, q: false};
          }
          if (piece.type === 'r' || target?.type === 'r') {
            if (f.c === 0) this._castleRights[piece.color].q = false;
            if (f.c === 7) this._castleRights[piece.color].k = false;
            if (t.c === 0) this._castleRights[target.color].q = false;
            if (t.c === 7) this._castleRights[target.color].k = false;
          }
          
          // Track last move for en passant
          this._lastMove = {
            piece: piece.type,
            fromR: f.r,
            fromC: f.c,
            toR: t.r,
            toC: t.c
          };
          
          // Update halfmove counter for draw by 50 moves
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
  let isMatching = false; // true while waiting for an opponent
  let currentMatch = null; // store match info from server (room, color, opponent)
  
  // Store the current logged-in user's info (captured at load time)
  // This is done ONCE and never changes during gameplay to prevent account swapping
  let currentUserName = document.getElementById('sidebar-name')?.textContent?.trim() || 'Player';
  let currentUserRating = document.getElementById('sidebar-rating')?.textContent?.trim() || '1400';
  
  // Ensure we have valid user data by fetching from server if needed
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

  // Initialize WebSocket for online play
  try {
    const wsProto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    socket = new WebSocket(wsProto + window.location.host);
    socket.addEventListener('open', () => console.log('WS: connected'));
    socket.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(ev.data);
        handleServerMessage(data);
      } catch (err) {
        console.warn('WS: invalid message', err);
      }
    });
    socket.addEventListener('close', () => console.log('WS: closed'));
  } catch (e) {
    console.warn('WS init failed', e);
  }
  
  if (boardElement) {
    // create 8x8 squares - rank 8 at top, rank 1 at bottom, a-file at left, h-file at right
    for (let r = 8; r >= 1; r--) {
      for (let f = 1; f <= 8; f++) {
        const sq = document.createElement('div');
        sq.className = 'square';
        // Chessboard: light square on a1, so (r + f) % 2 === 1 means light
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
    // clear any existing pieces
    boardEl.querySelectorAll('.square').forEach(sq => {
      sq.innerHTML = '';
      delete sq.dataset.piece;
      delete sq.dataset.owner;
    });
    // starting position pieces
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

  // Start / handlers
  const status = document.getElementById('play-status') || document.createElement('div');
  let selectedTimeControl = '10 min'; // default
  let gameOver = false; // Track game state
  let timerInterval = null; // Track timer interval
  
  // Mark default time control button as selected on page load
  setTimeout(() => {
    const defaultBtn = document.querySelector('.time-btn[data-time="10 min"]');
    if (defaultBtn) {
      defaultBtn.classList.add('selected');
      selectedTimeControl = '10 min';
    }
  }, 100);
  
  // Time control button handlers - delegate at body level
  document.body.addEventListener('click', (e) => {
    const timeBtn = e.target.closest && e.target.closest('.time-btn');
    if (timeBtn) {
      e.stopPropagation();
      // Clear previous selection
      document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('selected'));
      // Mark current selection
      timeBtn.classList.add('selected');
      selectedTimeControl = timeBtn.dataset.time;
      console.log('Selected time control:', selectedTimeControl);
      return;
    }
  });

  // Show game end modal
  function showGameEndModal(lastTimeControl) {
    // Remove any existing modal
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
    
    // Close button
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
      // Redirect to play.html to reset everything
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
  
  // Start button handler
  document.body.addEventListener('click', (e) => {
    const startEl = e.target.closest && e.target.closest('#start-game');
    if (startEl) {
      const time = selectedTimeControl || '10 min';
      if (window.recordMatchTimeControl) window.recordMatchTimeControl(time);
      try {
        startEl.disabled = true;
        
        // Check for saved game and ask user if they want to resume
        const savedState = loadGameState();
        if (savedState && savedState.fen) {
          const resume = window.confirm('Do you want to resume your previous game?');
          if (!resume) {
            clearGameState(); // User wants a fresh game
          }
        }
        
        console.log('play.js: Start clicked, initializing game with time=', time);
        if (status) { status.style.display='block'; status.className='status-message info'; status.textContent = `Starting game as ${currentUserName}...` }
        startProperGame(time).catch(err => {
          console.error('startProperGame error:', err);
          if (status) { status.style.display='block'; status.className='status-message'; status.textContent = 'Could not start game — see console.' }
          startEl.disabled = false;
        });
        
        // Hide Start button and show game action buttons
        const actionsDiv = document.querySelector('.actions');
        if (actionsDiv) actionsDiv.style.display = 'none';
        const gameActionsDiv = document.getElementById('game-actions');
        if (gameActionsDiv) {
          gameActionsDiv.style.display = 'flex';
        }
      } catch (err) {
        console.error('play.js: startProperGame error', err);
        if (status) { status.style.display='block'; status.className='status-message'; status.textContent = 'Could not start game — see console.' }
        startEl.disabled = false;
      }
      return;
    }
    
    // Resign button handler
    const resignEl = e.target.closest && e.target.closest('#resign-btn');
    if (resignEl) {
      if (!game || gameOver) return;
      // Use player's color, not current turn
      const playerColor = currentMatch ? currentMatch.color : 'w';
      const playerColorName = playerColor === 'w' ? 'White' : 'Black';
      const winner = playerColor === 'w' ? 'Black' : 'White';
      
      showCustomAlert(`Resign as ${playerColorName}?`, `Are you sure you want to resign? ${winner} will win the game.`, () => {
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
        // Broadcast resignation with resigner color
        if (socket && socket.readyState === WebSocket.OPEN && currentMatch) {
          socket.send(JSON.stringify({ 
            type: 'game_end', 
            room: currentMatch.room || currentMatch.id,
            gameEnd: 'resignation',
            resignedPlayer: playerColorName,
            result: winner
          }));
        }
        setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
      });
      return;
    }
    
    // Offer Draw button handler
    const drawEl = e.target.closest && e.target.closest('#offer-draw-btn');
    if (drawEl) {
      if (!game || gameOver) return;
      const currentPlayer = game.turn() === 'w' ? 'White' : 'Black';
      
      showCustomAlert(`Offer Draw as ${currentPlayer}?`, `Are you sure you want to offer a draw?`, () => {
        // Send draw offer to opponent via WebSocket
        if (socket && socket.readyState === WebSocket.OPEN && currentMatch) {
          socket.send(JSON.stringify({ 
            type: 'draw_offer', 
            room: currentMatch.room || currentMatch.id,
            player: currentUserName,
            from: currentPlayer
          }));
          
          if (status) {
            status.style.display = 'block';
            status.className = 'status-message info';
            status.textContent = `${currentPlayer} offered a draw. Waiting for opponent...`;
          }
          
          // Disable resign and draw buttons while waiting
          const resignBtn = document.getElementById('resign-btn');
          const drawBtn = document.getElementById('offer-draw-btn');
          if (resignBtn) resignBtn.disabled = true;
          if (drawBtn) drawBtn.disabled = true;
        }
      });
      return;
    }
  });

  // Pass & Play button - quick local two-player session
  const passPlayBtn = document.getElementById('pass-play');
  if (passPlayBtn) {
    passPlayBtn.addEventListener('click', () => {
      const sel = document.getElementById('time-select');
      const time = sel ? sel.value : '10 min';
      // record preference
      if (window.recordMatchTimeControl) window.recordMatchTimeControl(time);
      // redirect to mini pass-and-play page with params
      const url = `/sidebar/minis/game.html?mode=passplay&time=${encodeURIComponent(time)}`;
      window.location.href = url;
    });
  }

  // Helper functions for game state management
  function saveGameState() {
    if (!game) return;
    try {
      localStorage.setItem('chessGameState', JSON.stringify({
        moves: moves,
        fen: game.fen ? game.fen() : null
      }));
    } catch (e) {
      console.warn('Could not save game state', e);
    }
  }

  function loadGameState() {
    try {
      const data = localStorage.getItem('chessGameState');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Could not load game state', e);
      return null;
    }
  }

  function clearGameState() {
    try {
      localStorage.removeItem('chessGameState');
    } catch (e) {
      console.warn('Could not clear game state', e);
    }
  }

  function updateMovesDisplay() {
    const movesList = document.getElementById('moves-list');
    if (!movesList) return;
    
    // Piece symbols for notation
    const pieceSymbols = {
      'p': '♟',  // Pawn
      'n': '♞',  // Knight
      'b': '♝',  // Bishop
      'r': '♜',  // Rook
      'q': '♛',  // Queen
      'k': '♚'   // King
    };
    
    movesList.innerHTML = '';
    let currentMoveNumber = 1;
    let isWhiteMove = true;
    
    moves.forEach((move, index) => {
      // Only create a wrapper for move pair (white + black)
      let moveWrapper;
      if (isWhiteMove) {
        moveWrapper = document.createElement('div');
        moveWrapper.style.display = 'flex';
        moveWrapper.style.gap = '8px';
        moveWrapper.style.marginBottom = '8px';
        
        // Add move number
        const moveNumberEl = document.createElement('span');
        moveNumberEl.textContent = currentMoveNumber + '.';
        moveNumberEl.style.fontWeight = 'bold';
        moveNumberEl.style.color = '#fff';
        moveNumberEl.style.minWidth = '30px';
        moveWrapper.appendChild(moveNumberEl);
        
        movesList.appendChild(moveWrapper);
      } else {
        moveWrapper = movesList.lastChild;
        currentMoveNumber++;
      }
      
      // Create move element
      const moveEl = document.createElement('div');
      moveEl.className = 'move-item';
      moveEl.style.padding = '4px 6px';
      moveEl.style.backgroundColor = isWhiteMove ? '#555' : '#444';
      moveEl.style.borderRadius = '3px';
      moveEl.style.fontSize = '13px';
      moveEl.style.color = '#fff';
      moveEl.style.display = 'flex';
      moveEl.style.alignItems = 'center';
      moveEl.style.gap = '6px';
      moveEl.style.flex = '1';
      
      // Piece image
      const pieceCode = (move.color === 'w' ? 'w' : 'b') + move.piece.toUpperCase();
      const img = document.createElement('img');
      img.src = `../../Images/Chesspieces/${pieceCode}.png`;
      img.alt = pieceCode;
      img.style.width = '16px';
      img.style.height = '16px';
      moveEl.appendChild(img);
      
      // Move notation - just final square and special move symbols
      let notation = '';
      console.log('Processing move:', move.san, 'Piece:', move.piece);
      
      if (move.isCastling) {
        // 0-0 for kingside, 0-0-0 for queenside
        const toFile = move.to.charCodeAt(0);
        notation = toFile > 100 ? '0-0' : '0-0-0';  // 'e' is ASCII 101, kingside is to g, queenside is to c
      } else {
        // Just show final position
        notation = move.to;
      }
      
      // Add capture symbol
      if (move.capture && !move.isCastling) notation = 'x' + notation;
      
      // Add check/checkmate (if available)
      if (move.isPromotion) notation += `=${pieceSymbols[move.promotion] || move.promotion.toUpperCase()}`;
      
      // Check if this is a checkmate move (look at SAN notation which includes # for checkmate)
      if (move.san && move.san.includes('#')) {
        console.log('✓ Checkmate detected! Adding # symbol');
        notation += '#';
      } else if (move.san && move.san.includes('+')) {
        console.log('✓ Check detected! Adding + symbol');
        notation += '+';
      }
      
      console.log('Final notation:', notation);
      
      const span = document.createElement('span');
      span.textContent = notation;
      span.style.fontWeight = 'bold';
      moveEl.appendChild(span);
      
      moveWrapper.appendChild(moveEl);
      
      isWhiteMove = !isWhiteMove;
    });
  }

  function parseTimeControl(timeStr) {
    // Parse "10 min", "5 min + 3 sec", etc.
    const match = timeStr.match(/(\d+)\s*min(?:\s*\+\s*(\d+)\s*sec)?/i);
    if (!match) return { baseTime: 600, increment: 0 };
    const baseTime = parseInt(match[1]) * 60;
    const increment = match[2] ? parseInt(match[2]) : 0;
    return { baseTime, increment };
  }

  function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  // Make the sidebar interactive: highlight active nav item and handle navigation
  const sidebarNav = document.querySelector('.sidebar .nav');
  if (sidebarNav) {
    const links = Array.from(sidebarNav.querySelectorAll('.nav-item'));
    // set active based on pathname (simple heuristic)
    const path = window.location.pathname.replace(/\/+$/, '');
    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href && href !== '#' && href === path) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
      // click behavior: navigate when href is a real path
      a.addEventListener('click', (e) => {
        const h = a.getAttribute('href');
        if (!h || h === '#') {
          e.preventDefault();
          // toggle active class locally
          links.forEach(l=>l.classList.remove('active'));
          a.classList.add('active');
        } else {
          // let browser navigate normally; ensure active class set
          links.forEach(l=>l.classList.remove('active'));
          a.classList.add('active');
        }
      });
    });
  }

  // Show opponent matching screen (with cancel button)
  function showOpponentMatchingScreen(timeControl) {
    // Remove any existing matching screen
    const existing = document.getElementById('opponent-matching');
    if (existing) existing.remove();
    
    isMatching = true;
    const matchingScreen = document.createElement('div');
    matchingScreen.id = 'opponent-matching';
    matchingScreen.className = 'opponent-matching';
    matchingScreen.innerHTML = `
      <div class="matching-content">
        <div class="matching-spinner"></div>
        <div class="matching-title">Finding an Opponent...</div>
        <div class="matching-subtitle">Time Control: <strong>${timeControl}</strong></div>
        <div style="margin-top:18px;display:flex;gap:8px;justify-content:center">
          <button id="cancel-match-btn" class="btn-secondary">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(matchingScreen);

    // Cancel handler
    const cancelBtn = document.getElementById('cancel-match-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => cancelMatch());
  }

  function hidePanels() {
    document.querySelector('.side-extra')?.style.setProperty('display','none','important');
    document.querySelector('.controls')?.style.setProperty('display','none','important');
    // Also hide inline time selection area if present
    document.querySelector('.time-control-section')?.style.setProperty('display','none','important');
  }

  function restoreLayout() {
    // Show side panels again
    document.querySelector('.side-extra')?.style.removeProperty('display');
    document.querySelector('.controls')?.style.removeProperty('display');
    document.querySelector('.time-control-section')?.style.removeProperty('display');
    // Remove players-right column and board-top/bottom placeholders if present
    document.querySelector('.players-section')?.remove();
    document.getElementById('board-top-player')?.remove();
    document.getElementById('board-bottom-player')?.remove();
    // re-enable start button
    const startBtn = document.getElementById('start-game');
    if (startBtn) startBtn.disabled = false;
    // tell server we have left the game room (if any)
    if (currentMatch && socket && socket.readyState === WebSocket.OPEN) {
      try { socket.send(JSON.stringify({ type: 'leave_room', room: currentMatch.room || currentMatch.id })); } catch (e) { /* ignore */ }
    }
    currentMatch = null;
    isMatching = false;
  }

  function cancelMatch() {
    // cancel the matching process
    isMatching = false;
    document.getElementById('opponent-matching')?.remove();
    // tell server we left queue
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'leave_queue' }));
    }
    restoreLayout();
  }

  // Handle messages from server
  function handleServerMessage(msg) {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case 'match_found':
        // msg: { room, color, opponent:{name, rating}, time }
        console.log('Match found', msg);
        document.getElementById('opponent-matching')?.remove();
        startGameAfterMatching(msg);
        break;
      case 'opponent_move':
        // msg.move: object from server
        if (!game) return;
        try {
          const m = msg.move;
          const moveObj = { from: m.from, to: m.to, promotion: m.promotion };
          const res = game.move(moveObj);
          if (res) {
            moves.push(res);
            updateMovesDisplay();
            // re-render board
            const boardElem = document.getElementById('play-board') || document.getElementById('chessboard');
            if (boardElem) {
              const newBoard = boardElem.querySelectorAll('.square');
              newBoard.forEach(sq => { sq.innerHTML = ''; delete sq.dataset.piece; delete sq.dataset.owner; });
              const nb = game.board();
              // Correct coordinate conversion: board[0] = rank 8, board[7] = rank 1
              for (let r = 8; r >= 1; r--) {
                for (let f = 1; f <= 8; f++) {
                  const file = String.fromCharCode(96 + f);
                  const boardRow = 8 - r;
                  const boardCol = f - 1;
                  const p = nb[boardRow][boardCol];
                  if (!p) continue;
                  const sqName = `${file}${r}`;
                  const sqEl = boardElem.querySelector(`.square[data-square='${sqName}']`);
                  if (sqEl) {
                    const code = (p.color === 'w' ? 'w' : 'b') + p.type.toUpperCase();
                    const img = document.createElement('img');
                    img.className = 'piece-img';
                    img.src = `../../Images/Chesspieces/${code}.png`;
                    img.alt = code;
                    img.style.display = 'block';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    sqEl.appendChild(img);
                    sqEl.dataset.piece = code;
                    sqEl.dataset.owner = p.color;
                  }
                }
              }
            }
            // update active clock immediately based on whose turn it is
            const whiteTimeEl = document.getElementById('white-time');
            const blackTimeEl = document.getElementById('black-time');
            if (whiteTimeEl && blackTimeEl) {
              if (game.turn() === 'w') {
                whiteTimeEl.classList.add('active');
                blackTimeEl.classList.remove('active');
              } else {
                blackTimeEl.classList.add('active');
                whiteTimeEl.classList.remove('active');
              }
            }
            
            // Update status message for current player
            if (game.isCheck()) {
              if (status) {
                status.style.display = 'block';
                status.textContent = `⚠️ Check! ${game.turn() === 'w' ? 'White' : 'Black'} to move.`;
                status.className = 'status-message warning';
              }
            } else {
              if (status) {
                status.style.display = 'block';
                status.textContent = `${game.turn() === 'w' ? '♔ White' : '♚ Black'} to move.`;
                status.className = 'status-message info';
              }
            }
          }
        } catch (e) { console.warn('Failed to apply opponent move', e); }
        break;
      case 'game_end':
        // Opponent's game has ended, show result
        console.log('Game end received:', msg.gameEnd, msg.result);
        gameOver = true;
        clearInterval(timerInterval);
        const boardElem = document.getElementById('chessboard');
        if (boardElem) boardElem.style.pointerEvents = 'none';
        
        if (msg.gameEnd === 'checkmate') {
          if (status) {
            status.style.display = 'block';
            status.textContent = `🏆 Checkmate! ${msg.result} wins! 🏆`;
            status.className = 'status-message success';
          }
        } else if (msg.gameEnd === 'draw') {
          if (status) {
            status.style.display = 'block';
            status.textContent = `Draw! ${msg.result}`;
            status.className = 'status-message info';
          }
        } else if (msg.gameEnd === 'resignation') {
          if (status) {
            status.style.display = 'block';
            status.textContent = `Opponent resigned. ${msg.result} wins!`;
            status.className = 'status-message success';
          }
        }
        
        clearGameState();
        setTimeout(() => {
          showGameEndModal(selectedTimeControl);
        }, 1500);
        break;
      case 'opponent_left':
        // opponent disconnected during play or before matching
        if (status) { status.style.display = 'block'; status.className = 'status-message info'; status.textContent = 'Opponent left the game.'; }
        restoreLayout();
        break;
      case 'draw_offer':
        // Opponent offered a draw
        console.log('Draw offer received from:', msg.from);
        showCustomAlert(`Draw Offer from ${msg.from}`, `${msg.from} offers a draw. Do you accept?`, () => {
          // Accept draw
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
            status.textContent = 'Game drawn by agreement.';
          }
          clearGameState();
          // Broadcast draw acceptance
          if (socket && socket.readyState === WebSocket.OPEN && currentMatch) {
            socket.send(JSON.stringify({ 
              type: 'game_end', 
              room: currentMatch.room || currentMatch.id,
              gameEnd: 'draw',
              result: 'agreement'
            }));
          }
          setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
        }, () => {
          // Reject draw - re-enable buttons
          const resignBtn = document.getElementById('resign-btn');
          const drawBtn = document.getElementById('offer-draw-btn');
          if (resignBtn) resignBtn.disabled = false;
          if (drawBtn) drawBtn.disabled = false;
        });
        break;
      case 'logout_request':
        // Device conflict: another user trying to login on this device (deprecated)
        handleLogoutRequest(msg);
        break;
      case 'account_switch_request':
        // New account trying to login on this device - ask user to confirm switch
        console.log('Account switch request received:', msg);
        handleAccountSwitchRequest(msg);
        break;
      case 'force_logout':
        // Server force-logged out this session (new account logged in on same device)
        console.log('Force logout received:', msg);
        alert(msg.message || 'Your session has been logged out. Another account is logging in from this device.');
        window.location.href = '/login.html';
        break;
      case 'chat':
        // Opponent sent a chat message
        console.log('💬 Received chat message:', msg);
        if (msg.player && msg.message) {
          try {
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
              console.log('📮 Adding opponent message to chat');
              addChatMessage(msg.player, msg.message, false);
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          } catch (e) {
            console.warn('Failed to add chat message', e);
          }
        }
        break;
      case 'error':
        console.error('❌ Server error:', msg.message, 'Full message:', msg);
        break;
      default:
        console.log('Unhandled WS message:', msg);
    }
  }
  
  // Start a proper chess game: place images, hide controls, add full-rule click-to-move (via chess.js)
  async function startProperGame(timeControl) {
    // Hide extraneous UI and show matching overlay
    hidePanels();
    const startBtn = document.getElementById('start-game');
    if (startBtn) startBtn.disabled = true;
    showOpponentMatchingScreen(timeControl);

    // Send join request to server using the stored current user info
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ 
        type: 'join_queue', 
        time: timeControl, 
        name: currentUserName, 
        rating: currentUserRating,
        deviceId: getDeviceId()
      }));
    } else {
      // Fallback to simulated matching when WS not available
      const waitTime = 2000 + Math.random() * 3000;
      setTimeout(() => {
        if (!isMatching) return;
        startGameAfterMatching({ color: 'w', opponent: { name: 'Opponent', rating: '1600' }, time: timeControl });
      }, waitTime);
    }
  }
  
  // Start game after opponent is matched
  async function startGameAfterMatching(timeControlOrMatch) {
    // Accept either a timeControl string or a match object
    let timeControl = selectedTimeControl;
    let match = null;
    if (typeof timeControlOrMatch === 'object') {
      match = timeControlOrMatch;
      currentMatch = match; // remember for server comms
      timeControl = match.time || selectedTimeControl;
    } else if (typeof timeControlOrMatch === 'string') {
      timeControl = timeControlOrMatch;
    }

    // Remove matching screen
    document.getElementById('opponent-matching')?.remove();
    
    // Ensure Chess library is available
    const chessReady = await ensureChessAvailable();
    if (!chessReady) {
      if (status) { status.style.display='block'; status.className='status-message'; status.textContent = 'Chess library failed to load'; }
      restoreLayout();
      return;
    }
    
    if (!game) {
      try { game = new window.Chess(); } catch (e) { console.error('Failed to create Chess instance:', e); game = null; }
    }
    if (!game) {
      if (status) { status.style.display='block'; status.className='status-message'; status.textContent = 'Failed to initialize game'; }
      restoreLayout();
      return;
    }
    
    game.reset();
    moves = [];
    gameOver = false;
    
    // Use and remember selected time control
    selectedTimeControl = timeControl;
    
    // Parse time control
    const timeControlObj = parseTimeControl(timeControl);
    let whiteTimeLeft = timeControlObj.baseTime;
    let blackTimeLeft = timeControlObj.baseTime;
    const incrementSeconds = timeControlObj.increment;
    
    // Get elements
    const boardElem = document.getElementById('chessboard');
    const boardWrap = boardElem.parentElement;
    
    if (!boardElem) return;
    
    // Resize board for play
    boardElem.style.width = '800px';
    boardElem.style.height = '800px';
    // Ensure board is interactive
    boardElem.style.pointerEvents = 'auto';
    boardElem.style.opacity = '1';
    
    // Show moves panel (find existing panel if present)
    const movesPanel = document.querySelector('.moves-panel') || document.getElementById('moves-panel');
    if (movesPanel) movesPanel.style.display = 'block';
    
    // Format time display helper
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    // Restructure board wrap for new layout
    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-container';
    
    const boardSection = document.createElement('div');
    boardSection.className = 'board-section';
    boardSection.appendChild(boardElem);
    
    // Create two-column layout for moves and chat
    const sidePanel = document.createElement('div');
    sidePanel.className = 'side-panel';
    sidePanel.style.display = 'flex';
    sidePanel.style.gap = '10px';
    sidePanel.style.height = '800px';
    
    // Moves column
    const movesColumn = document.createElement('div');
    movesColumn.className = 'moves-column';
    movesColumn.style.flex = '1';
    movesColumn.style.display = 'flex';
    movesColumn.style.flexDirection = 'column';
    movesColumn.style.minWidth = '200px';
    movesColumn.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #fff; font-size: 14px;">Moves</h3>
      <div class="moves-list" id="moves-list" style="flex: 1; overflow-y: auto; border: 1px solid #666; border-radius: 5px; padding: 8px;"></div>
    `;
    sidePanel.appendChild(movesColumn);
    
    // Chat column
    const chatColumn = document.createElement('div');
    chatColumn.className = 'chat-column';
    chatColumn.style.flex = '1';
    chatColumn.style.display = 'flex';
    chatColumn.style.flexDirection = 'column';
    chatColumn.style.minWidth = '200px';
    chatColumn.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #fff; font-size: 14px;">Chat</h3>
      <div class="chat-messages" id="chat-messages" style="flex: 1; overflow-y: auto; border: 1px solid #666; border-radius: 5px; padding: 8px; margin-bottom: 8px; background: #333; font-size: 12px; display: flex; flex-direction: column;">
        <div style="color: #aaa; text-align: center; padding: 10px; font-style: italic;">Please talk nicely in the chat.<br>Abusive language can be reported.</div>
      </div>
      <div style="display: flex; gap: 5px;">
        <input type="text" id="chat-input" placeholder="Type message..." style="flex: 1; padding: 6px; border: 1px solid #666; border-radius: 3px; background: #555; color: #fff; font-size: 12px;">
        <button id="chat-send-btn" style="padding: 6px 12px; background: #3a99ff; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Send</button>
      </div>
    `;
    sidePanel.appendChild(chatColumn);
    
    // Use the stored current user info (captured at load time, not from DOM which may change)
    let opponentName = 'Opponent';
    let opponentRating = String(1600 + Math.floor(Math.random() * 201) - 100); // placeholder
    if (match && match.opponent) {
      opponentName = match.opponent.name || opponentName;
      opponentRating = match.opponent.rating || opponentRating;
    }    // Determine which player is black (top) and white (bottom)
    const clientIsWhite = match ? (match.color === 'w') : true;
    const whitePlayer = clientIsWhite ? { name: currentUserName, rating: currentUserRating } : { name: opponentName, rating: opponentRating };
    const blackPlayer = clientIsWhite ? { name: opponentName, rating: opponentRating } : { name: currentUserName, rating: currentUserRating };
    
    // Flip board if player is black
    if (!clientIsWhite) {
      boardElem.style.transform = 'rotate(180deg)';
      boardElem.style.transition = 'transform 0.3s ease';
      
      // Add CSS to counter-rotate all piece images
      if (!document.getElementById('piece-rotation-style')) {
        const style = document.createElement('style');
        style.id = 'piece-rotation-style';
        style.textContent = `
          #chessboard.board-rotated .piece-img {
            transform: rotate(180deg);
          }
        `;
        document.head.appendChild(style);
      }
      boardElem.classList.add('board-rotated');
    }

    // Create black player info
    const blackInfo = document.createElement('div');
    blackInfo.id = 'black-info';
    blackInfo.className = 'player-info-display';
    blackInfo.innerHTML = `
      <div class="player-header">
        <div class="opponent-avatar">◉</div>
        <div class="player-names">
          <div class="opponent-name" style="font-size: 12px; color: #aaa; margin-bottom: 2px;">Black</div>
          <div class="opponent-name">${blackPlayer.name}</div>
        </div>
      </div>
      <div class="player-stats">
        <div class="player-time active" id="black-time">${formatTime(blackTimeLeft)}</div>
        <div class="player-rating" id="black-rating">Rating: ${blackPlayer.rating}</div>
      </div>
    `;

    // Create white player (bottom right)
    const whiteInfo = document.createElement('div');
    whiteInfo.id = 'white-info';
    whiteInfo.className = 'player-info-display';
    whiteInfo.innerHTML = `
      <div class="player-header">
        <div class="your-avatar">●</div>
        <div class="player-names">
          <div class="your-name" style="font-size: 12px; color: #aaa; margin-bottom: 2px;">White</div>
          <div class="your-name">${whitePlayer.name}</div>
        </div>
      </div>
      <div class="player-stats">
        <div class="player-time" id="white-time">${formatTime(whiteTimeLeft)}</div>
        <div class="player-rating" id="white-rating">Rating: ${whitePlayer.rating}</div>
      </div>
    `;

    // Create centered top and bottom name blocks above/below board
    const boardTopPlayer = document.createElement('div');
    boardTopPlayer.id = 'board-top-player';
    boardTopPlayer.className = 'board-player-top';
    // top player should be black
    boardTopPlayer.innerHTML = `<div class="player-center"><div class="opponent-avatar">◉</div><div class="player-center-name">${blackPlayer.name}</div></div>`;

    const boardBottomPlayer = document.createElement('div');
    boardBottomPlayer.id = 'board-bottom-player';
    boardBottomPlayer.className = 'board-player-bottom';
    // bottom player should be white (you)
    boardBottomPlayer.innerHTML = `<div class="player-center"><div class="your-avatar">●</div><div class="player-center-name" title="You: ${whitePlayer.name}">${whitePlayer.name}</div></div>`;
    // Update sidebar to show current user name
    const sidebarName = document.getElementById('sidebar-name');
    if (sidebarName) sidebarName.textContent = currentUserName;

    // Create players info panel to display in side
    const playersInfoPanel = document.createElement('div');
    playersInfoPanel.className = 'players-info-panel';
    playersInfoPanel.style.display = 'flex';
    playersInfoPanel.style.flexDirection = 'column';
    playersInfoPanel.style.gap = '8px';
    playersInfoPanel.style.padding = '10px';
    playersInfoPanel.style.backgroundColor = '#2a2a2a';
    playersInfoPanel.style.borderRadius = '5px';
    playersInfoPanel.style.marginBottom = '10px';
    playersInfoPanel.style.border = '1px solid #555';
    
    // Style the player info displays
    const stylePlayerInfo = document.createElement('style');
    if (!document.getElementById('player-info-style')) {
      stylePlayerInfo.id = 'player-info-style';
      stylePlayerInfo.textContent = `
        .player-info-display {
          padding: 8px;
          background: #1a1a1a;
          border-radius: 3px;
          border-left: 3px solid #555;
        }
        .player-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .opponent-avatar, .your-avatar {
          font-size: 20px;
        }
        .player-names {
          flex: 1;
        }
        .opponent-name, .your-name {
          color: #fff;
          font-weight: bold;
          font-size: 12px;
        }
        .player-stats {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        .player-time {
          color: #aaa;
          padding: 2px 6px;
          background: #333;
          border-radius: 2px;
        }
        .player-time.active {
          color: #7eff7e;
          background: #3a5f33;
          font-weight: bold;
        }
        .player-rating {
          color: #888;
        }
      `;
      document.head.appendChild(stylePlayerInfo);
    }
    
    playersInfoPanel.appendChild(blackInfo);
    playersInfoPanel.appendChild(whiteInfo);
    
    // Create game action buttons container (resign + draw) - inline with panel
    const gameActionsContainer = document.createElement('div');
    gameActionsContainer.style.display = 'flex';
    gameActionsContainer.style.gap = '5px';
    gameActionsContainer.style.justifyContent = 'center';
    gameActionsContainer.style.marginTop = '8px';
    
    const resignBtn = document.createElement('button');
    resignBtn.id = 'resign-btn';
    resignBtn.className = 'btn';
    resignBtn.textContent = 'Resign';
    resignBtn.style.padding = '6px 12px';
    resignBtn.style.fontSize = '12px';
    resignBtn.style.background = '#c44';
    resignBtn.style.color = 'white';
    resignBtn.style.border = 'none';
    resignBtn.style.borderRadius = '3px';
    resignBtn.style.cursor = 'pointer';
    resignBtn.style.flex = '1';
    
    const drawBtn = document.createElement('button');
    drawBtn.id = 'offer-draw-btn';
    drawBtn.className = 'btn';
    drawBtn.textContent = 'Draw';
    drawBtn.style.padding = '6px 12px';
    drawBtn.style.fontSize = '12px';
    drawBtn.style.background = '#484';
    drawBtn.style.color = 'white';
    drawBtn.style.border = 'none';
    drawBtn.style.borderRadius = '3px';
    drawBtn.style.cursor = 'pointer';
    drawBtn.style.flex = '1';
    
    gameActionsContainer.appendChild(resignBtn);
    gameActionsContainer.appendChild(drawBtn);
    playersInfoPanel.appendChild(gameActionsContainer);
    
    // Insert players info at the top of the side panel
    const movesColumnElement = sidePanel.querySelector('.moves-column');
    if (movesColumnElement) {
      sidePanel.insertBefore(playersInfoPanel, movesColumnElement);
    } else {
      sidePanel.appendChild(playersInfoPanel);
    }

    // Restructure the board area (clear and append top, board container, bottom)
    boardWrap.innerHTML = '';
    boardWrap.appendChild(boardTopPlayer);
    gameContainer.appendChild(boardSection);
    gameContainer.appendChild(sidePanel);
    
    boardWrap.appendChild(gameContainer);
    boardWrap.appendChild(boardBottomPlayer);
    
    // Get the new timer elements
    const blackTimeEl = document.getElementById('black-time');
    const whiteTimeEl = document.getElementById('white-time');
    
    // Render the board pieces from the initial position
    const boardSquares = boardElem.querySelectorAll('.square');
    console.log('Game started - found', boardSquares.length, 'squares on board');
    boardSquares.forEach(sq => {
      sq.innerHTML = '';
      delete sq.dataset.piece;
      delete sq.dataset.owner;
    });
    
    const boardState = game.board();
    console.log('Initial board state:', boardState);
    console.log('Rendering initial pieces...');
    
    // Board squares are created with ranks 8->1 (top to bottom) and files a->h (left to right)
    // game.board() returns array where [0] is rank 8, [7] is rank 1
    // and [x][0] is file 'a', [x][7] is file 'h'
    for (let r = 8; r >= 1; r--) {
      for (let f = 1; f <= 8; f++) {
        const file = String.fromCharCode(96 + f); // 'a' to 'h'
        const sqName = `${file}${r}`;
        const boardRow = 8 - r; // Array index for this rank
        const boardCol = f - 1;  // Array index for this file
        
        const piece = boardState[boardRow][boardCol];
        if (!piece) continue;
        
        const sqEl = boardElem.querySelector(`.square[data-square='${sqName}']`);
        if (!sqEl) {
          console.warn('Initial render: square not found:', sqName);
          continue;
        }
        
        const code = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase();
        const img = document.createElement('img');
        img.className = 'piece-img';
        img.src = `../../Images/Chesspieces/${code}.png`;
        img.alt = code;
        img.style.display = 'block';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        sqEl.appendChild(img);
        sqEl.dataset.piece = code;
        sqEl.dataset.owner = piece.color;
        console.log('✓ Initial render:', code, 'at', sqName);
      }
    }
    console.log('Initial board rendering complete');
    
    // Update display
    if (blackTimeEl) blackTimeEl.textContent = formatTime(blackTimeLeft);
    if (whiteTimeEl) whiteTimeEl.textContent = formatTime(whiteTimeLeft);
    
    // Clear any old timer interval
    if (timerInterval) clearInterval(timerInterval);
    
    // Start timer
    timerInterval = setInterval(() => {
      if (gameOver) {
        clearInterval(timerInterval);
        return;
      }
      
      const currentTurn = game.turn();
      if (currentTurn === 'w') {
        whiteTimeLeft--;
        if (whiteTimeEl) whiteTimeEl.textContent = formatTime(whiteTimeLeft);
        // Update active state
        if (blackTimeEl && whiteTimeEl) {
          whiteTimeEl.classList.add('active');
          blackTimeEl.classList.remove('active');
        }
        if (whiteTimeLeft <= 0) {
          gameOver = true;
          clearInterval(timerInterval);
          if (status) {
            status.style.display = 'block';
            status.textContent = 'Time up! Black wins!';
            status.className = 'status-message success';
          }
          boardElem.style.pointerEvents = 'none';
          boardElem.style.opacity = '0.5';
          broadcastGameEnd('timeout', 'Black');
          clearGameState();
          setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
        }
      } else {
        blackTimeLeft--;
        if (blackTimeEl) blackTimeEl.textContent = formatTime(blackTimeLeft);
        // Update active state
        if (blackTimeEl && whiteTimeEl) {
          blackTimeEl.classList.add('active');
          whiteTimeEl.classList.remove('active');
        }
        if (blackTimeLeft <= 0) {
          gameOver = true;
          clearInterval(timerInterval);
          if (status) {
            status.style.display = 'block';
            status.textContent = 'Time up! White wins!';
            status.className = 'status-message success';
          }
          boardElem.style.pointerEvents = 'none';
          boardElem.style.opacity = '0.5';
          broadcastGameEnd('timeout', 'White');
          clearGameState();
          setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
        }
      }
    }, 1000);
    
    // Setup chat functionality
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    function addChatMessage(playerName, message, isOwnMessage = false) {
      const msgEl = document.createElement('div');
      msgEl.style.marginBottom = '8px';
      msgEl.style.paddingBottom = isOwnMessage ? '0px' : '4px';
      msgEl.style.borderRadius = '5px';
      msgEl.style.wordWrap = 'break-word';
      msgEl.style.display = 'flex';
      msgEl.style.flexDirection = 'column';
      msgEl.style.maxWidth = '90%';
      
      if (isOwnMessage) {
        // Own message - right aligned, green
        msgEl.style.marginLeft = 'auto';
        msgEl.style.alignItems = 'flex-end';
      } else {
        // Opponent message - left aligned, red
        msgEl.style.marginRight = 'auto';
        msgEl.style.alignItems = 'flex-start';
      }
      
      const textContainer = document.createElement('div');
      textContainer.style.backgroundColor = isOwnMessage ? '#3a5f33' : '#4a3f3f';
      textContainer.style.padding = '8px 10px';
      textContainer.style.borderRadius = '5px';
      textContainer.style.display = 'flex';
      textContainer.style.flexDirection = 'column';
      textContainer.style.gap = '2px';
      
      const nameSpan = document.createElement('strong');
      nameSpan.textContent = playerName;
      nameSpan.style.color = isOwnMessage ? '#7eff7e' : '#ff9999';
      nameSpan.style.fontSize = '11px';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = message;
      textSpan.style.color = '#fff';
      textSpan.style.fontSize = '12px';
      
      textContainer.appendChild(nameSpan);
      textContainer.appendChild(textSpan);
      msgEl.appendChild(textContainer);
      
      // Add report button below message for opponent messages only
      if (!isOwnMessage) {
        const reportBtn = document.createElement('button');
        reportBtn.textContent = '🚩 Report';
        reportBtn.title = 'Report abusive message';
        reportBtn.style.marginTop = '4px';
        reportBtn.style.marginLeft = '0px';
        reportBtn.style.padding = '2px 6px';
        reportBtn.style.fontSize = '11px';
        reportBtn.style.background = 'transparent';
        reportBtn.style.border = 'none';
        reportBtn.style.cursor = 'pointer';
        reportBtn.style.color = '#ff6666';
        reportBtn.style.textAlign = 'left';
        reportBtn.onclick = (e) => {
          e.stopPropagation();
          // Two-step confirmation
          showCustomAlert('Report Message?', `Are you sure you want to report this message for saying: "${message}"?`, () => {
            showCustomAlert('Report Sent', `Message from ${playerName} has been reported.\n\nThank you for helping keep the community safe.`, () => {});
          });
        };
        msgEl.appendChild(reportBtn);
      }
      
      chatMessages.appendChild(msgEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function sendChatMessage() {
      const message = chatInput.value.trim();
      if (!message) return;
      
      console.log('📨 Sending chat message:', message);
      console.log('DEBUG: socket=', socket);
      console.log('DEBUG: socket.readyState=', socket?.readyState, '(OPEN=1)');
      console.log('DEBUG: currentMatch=', currentMatch);
      console.log('DEBUG: currentMatch.room=', currentMatch?.room);
      
      // Add to local chat
      addChatMessage(currentUserName, message, true);
      
      // Send to opponent via WebSocket
      try {
        const isSocketReady = socket && socket.readyState === WebSocket.OPEN;
        const hasMatch = !!currentMatch;
        
        console.log('Conditions - isSocketReady:', isSocketReady, 'hasMatch:', hasMatch);
        
        if (isSocketReady && hasMatch) {
          console.log('🌐 Broadcasting to room:', currentMatch.room || currentMatch.id);
          const chatPayload = { 
            type: 'chat', 
            room: currentMatch.room || currentMatch.id, 
            player: currentUserName,
            message: message 
          };
          console.log('📤 Payload:', JSON.stringify(chatPayload));
          socket.send(JSON.stringify(chatPayload));
        } else {
          console.warn('Cannot send chat - Socket ready:', isSocketReady, 'Has match:', hasMatch);
          if (!isSocketReady) console.warn('  → Socket not ready (state=' + socket?.readyState + ')');
          if (!hasMatch) console.warn('  → No currentMatch');
        }
      } catch (e) {
        console.warn('Failed to send chat message', e);
      }
      
      chatInput.value = '';
      chatInput.focus();
    }
    
    if (chatSendBtn) {
      chatSendBtn.addEventListener('click', sendChatMessage);
    }
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
      });
    }
    
    // Add click handlers to squares
    let selectedSquare = null;
    
    function clearHighlights() {
      document.querySelectorAll('.square.legal-move').forEach(sq => sq.classList.remove('legal-move'));
    }
    
    function showLegalMoves(fromSquare) {
      clearHighlights();
      const sqName = fromSquare.dataset.square;
      const file = sqName.charCodeAt(0) - 97;
      const rank = parseInt(sqName[1]);
      const fromR = 8 - rank;
      const fromC = file;
      
      try {
        const pseudoLegalMoves = game._getLegalMoves(fromR, fromC);
        // Filter to only show moves that don't leave king in check (pinned pieces)
        pseudoLegalMoves.forEach(([toR, toC]) => {
          // Check if this move is legal (doesn't leave king in check)
          if (game._isMoveLegal(fromR, fromC, toR, toC)) {
            const toRank = 8 - toR;
            const toFile = String.fromCharCode(97 + toC);
            const toSquareName = `${toFile}${toRank}`;
            const toSquare = boardElem.querySelector(`.square[data-square='${toSquareName}']`);
            if (toSquare) toSquare.classList.add('legal-move');
          }
        });
      } catch (e) {
        console.error('Error showing legal moves:', e);
      }
    }
    
    function showPawnPromotionDialog(fromSquare, toSquare) {
      return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = '#333';
        dialog.style.border = '3px solid gold';
        dialog.style.borderRadius = '10px';
        dialog.style.padding = '20px';
        dialog.style.zIndex = '10000';
        dialog.style.textAlign = 'center';
        dialog.style.color = 'white';
        dialog.style.fontFamily = 'Arial, sans-serif';
        
        const title = document.createElement('h3');
        title.textContent = 'Pawn Promotion - Choose a piece:';
        title.style.marginBottom = '15px';
        dialog.appendChild(title);
        
        const pieces = [
          {code: 'Q', name: '👑 Queen', promotion: 'q'},
          {code: 'R', name: '♜ Rook', promotion: 'r'},
          {code: 'B', name: '♝ Bishop', promotion: 'b'},
          {code: 'N', name: '♞ Knight', promotion: 'n'}
        ];
        
        pieces.forEach(piece => {
          const btn = document.createElement('button');
          btn.textContent = piece.name;
          btn.style.margin = '5px';
          btn.style.padding = '10px 15px';
          btn.style.fontSize = '16px';
          btn.style.backgroundColor = '#666';
          btn.style.color = 'white';
          btn.style.border = '2px solid gold';
          btn.style.borderRadius = '5px';
          btn.style.cursor = 'pointer';
          btn.style.transition = 'all 0.2s';
          
          btn.onmouseover = () => {
            btn.style.backgroundColor = '#888';
            btn.style.transform = 'scale(1.05)';
          };
          btn.onmouseout = () => {
            btn.style.backgroundColor = '#666';
            btn.style.transform = 'scale(1)';
          };
          
          btn.onclick = () => {
            document.body.removeChild(dialog);
            resolve(piece.promotion);
          };
          
          dialog.appendChild(btn);
        });
        
        document.body.appendChild(dialog);
      });
    }
    
    boardSquares.forEach(square => {
      square.addEventListener('click', () => {
        if (gameOver) return;
        
        const hasPiece = !!square.dataset.piece;
        const currentTurn = game.turn();
        
        // Determine player's color (if in match, use match.color, else assume white)
        const playerColor = currentMatch ? currentMatch.color : 'w';
        
        // If it's not the player's turn, don't allow moves
        if (currentTurn !== playerColor) {
          if (status) {
            status.style.display = 'block';
            status.className = 'status-message warning';
            status.textContent = `Waiting for opponent's move...`;
          }
          return;
        }
        
        console.log('Square clicked:', square.dataset.square, 'hasPiece:', hasPiece, 'owner:', square.dataset.owner, 'turn:', currentTurn, 'playerColor:', playerColor, 'game exists:', !!game);
        
        // Click on own piece - select it
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
        
        // Click same square - deselect
        if (selectedSquare === square) {
          square.classList.remove('selected');
          clearHighlights();
          selectedSquare = null;
          if (status) status.style.display = 'none';
          return;
        }
        
        // Click other own piece - switch selection
        if (selectedSquare && hasPiece && square.dataset.owner === currentTurn) {
          selectedSquare.classList.remove('selected');
          clearHighlights();
          selectedSquare = square;
          square.classList.add('selected');
          showLegalMoves(square);
          return;
        }
        
        // Try to move
        if (selectedSquare) {
          const fromSquare = selectedSquare.dataset.square;
          const toSquare = square.dataset.square;
          
          // Check if this is a pawn promotion
          const piece = selectedSquare.dataset.piece;
          let promotion = 'q';
          
          if (piece && piece.endsWith('P')) {
            const rank = parseInt(toSquare[1]);
            if ((piece.startsWith('w') && rank === 8) || (piece.startsWith('b') && rank === 1)) {
              // Need pawn promotion
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
        console.log('Attempting move from', fromSquare, 'to', toSquare, 'promotion:', promotion, 'playerColor:', playerColor);
        
        const moveResult = game.move({ from: fromSquare, to: toSquare, promotion: promotion });
        console.log('Move result:', moveResult);
        if (moveResult) {
          console.log('✓ Move accepted by engine, updating UI...');
          clearHighlights();
          
          // Avoid duplicate pushes of the same SAN
          const lastMove = moves.length ? moves[moves.length-1] : null;
          if (!lastMove || lastMove.san !== moveResult.san) {
            console.log('Adding move to display');
            moves.push(moveResult);
            updateMovesDisplay();
            console.log('✓ Move display updated');
          } else {
            console.log('Duplicate move blocked:', moveResult.san);
          }

          console.log('About to remove selected square styling...');
          selectedSquare.classList.remove('selected');
          selectedSquare = null;
          console.log('✓ Selection cleared');
              
          // *** CRITICAL: Re-render board immediately ***
          console.log('🔄 Starting board re-render...');
          const squares = boardElem.querySelectorAll('.square');
          console.log('Found', squares.length, 'squares');
          
          // Clear all squares
          squares.forEach(sq => {
            sq.innerHTML = '';
            delete sq.dataset.piece;
            delete sq.dataset.owner;
          });
          console.log('✓ Cleared all squares');
          
          // Get board state
          const boardState = game.board();
          console.log('✓ Got new board state');
          
          // Render all pieces
          let piecesRendered = 0;
          for (let r = 8; r >= 1; r--) {
            for (let f = 1; f <= 8; f++) {
              const file = String.fromCharCode(96 + f);
              const sqName = `${file}${r}`;
              const boardRow = 8 - r;
              const boardCol = f - 1;
              
              const p = boardState[boardRow][boardCol];
              if (!p) continue;
              
              const sqEl = boardElem.querySelector(`.square[data-square='${sqName}']`);
              if (!sqEl) {
                console.error('Square not found:', sqName);
                continue;
              }
              
              const code = (p.color === 'w' ? 'w' : 'b') + p.type.toUpperCase();
              const img = document.createElement('img');
              img.className = 'piece-img';
              img.src = `../../Images/Chesspieces/${code}.png`;
              img.alt = code;
              img.style.display = 'block';
              img.style.width = '100%';
              img.style.height = '100%';
              img.style.objectFit = 'contain';
              
              sqEl.appendChild(img);
              sqEl.dataset.piece = code;
              sqEl.dataset.owner = p.color;
              piecesRendered++;
            }
          }
          console.log('✓ Board re-render complete! Rendered', piecesRendered, 'pieces');
          
          // Send move to server (for online games)
          try {
            if (socket && socket.readyState === WebSocket.OPEN && currentMatch) {
              socket.send(JSON.stringify({ type: 'move', room: currentMatch.room || currentMatch.id || null, move: moveResult }));
              console.log('✓ Move sent to server');
            }
          } catch (e) {
            console.warn('Failed to send move to server', e);
          }
          
          // Check for game end conditions
          checkAndHandleGameEnd();
            } else {
              if (status) {
                status.style.display = 'block';
                status.textContent = 'Invalid move!';
                status.className = 'status-message error';
              }
            }
        } catch (e) {
          console.error('Error in attemptMove:', e);
          if (status) {
            status.style.display = 'block';
            status.textContent = 'Invalid move!';
            status.className = 'status-message error';
          }
        }
    }
    
    // Check for game end conditions and handle them
    function checkAndHandleGameEnd() {
      if (game.isDrawByInsufficientMaterial()) {
        gameOver = true;
        boardElem.style.pointerEvents = 'none';
        clearInterval(timerInterval);
        if (status) {
          status.style.display = 'block';
          status.textContent = 'Draw! Insufficient material!';
          status.className = 'status-message info';
        }
        broadcastGameEnd('draw', 'Insufficient material');
        clearGameState();
        setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
      } else if (game.isThreefoldRepetition()) {
        gameOver = true;
        boardElem.style.pointerEvents = 'none';
        clearInterval(timerInterval);
        if (status) {
          status.style.display = 'block';
          status.textContent = 'Draw! 3-fold repetition!';
          status.className = 'status-message info';
        }
        broadcastGameEnd('draw', '3-fold repetition');
        clearGameState();
        setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
      } else if (game.isDraw50Moves()) {
        gameOver = true;
        boardElem.style.pointerEvents = 'none';
        clearInterval(timerInterval);
        if (status) {
          status.style.display = 'block';
          status.textContent = 'Draw! 50-move rule!';
          status.className = 'status-message info';
        }
        broadcastGameEnd('draw', '50-move rule');
        clearGameState();
        setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
      } else if (game.isCheckmate()) {
        gameOver = true;
        boardElem.style.pointerEvents = 'none';
        clearInterval(timerInterval);
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        if (status) {
          status.style.display = 'block';
          status.textContent = `🏆 Checkmate! ${winner} wins! 🏆`;
          status.className = 'status-message success';
        }
        broadcastGameEnd('checkmate', winner);
        clearGameState();
        setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
      } else if (game.isStalemate()) {
        gameOver = true;
        boardElem.style.pointerEvents = 'none';
        clearInterval(timerInterval);
        if (status) {
          status.style.display = 'block';
          status.textContent = 'Draw! Stalemate!';
          status.className = 'status-message info';
        }
        broadcastGameEnd('draw', 'Stalemate');
        clearGameState();
        setTimeout(() => { showGameEndModal(selectedTimeControl); }, 1500);
      } else if (game.isCheck()) {
        if (status) {
          status.style.display = 'block';
          status.textContent = `⚠️ Check! ${game.turn() === 'w' ? 'White' : 'Black'} to move.`;
          status.className = 'status-message warning';
        }
      } else {
        if (status) {
          status.style.display = 'block';
          status.textContent = `${game.turn() === 'w' ? 'White to move' : 'Black to move'}`;
          status.className = 'status-message info';
        }
      }
    }
    
    // Broadcast game end to opponent
    function broadcastGameEnd(type, result) {
      try {
        if (socket && socket.readyState === WebSocket.OPEN && currentMatch) {
          socket.send(JSON.stringify({ type: 'game_end', room: currentMatch.room || currentMatch.id, gameEnd: type, result: result }));
          console.log('✓ Game end broadcasted:', type, result);
        }
      } catch (e) {
        console.warn('Failed to broadcast game end', e);
      }
    }
  }

  // parse URL params to auto-start game when requested
  try {
    const params = new URLSearchParams(window.location.search);
    const time = params.get('time');
    const auto = params.get('auto');
    if (time && auto === '1') {
      setTimeout(() => startProperGame(time), 200);
    }
  } catch (e) {
    // ignore URL parsing errors
    console.warn('play.js: could not parse URL params', e);
  }
});
