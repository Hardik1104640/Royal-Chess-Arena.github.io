// main.js — Chessboard Arena
// Complete frontend chessboard with basic legal moves, promotion, move history, undo, flip

// Utilities
const el = (sel) => document.querySelector(sel);
const on = (sel, ev, fn) => document.querySelector(sel).addEventListener(ev, fn);
const create = (tag, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};

// Setup UI
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
const boardEl = el('#board');
const historyEl = el('#history');
const turnEl = el('#turn');

const MINI_BOARD = el('#mini-board');
const PUZZLE_BOARD = el('#puzzle-board');

// Theme toggle
const themeBtn = el('#theme-toggle');
themeBtn?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const pressed = document.body.classList.contains('dark');
  const icon = themeBtn.querySelector('i');
  if (icon) icon.className = pressed ? 'fas fa-sun' : 'fas fa-moon';
  themeBtn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
});

// ===== Guest account integration =====
document.addEventListener('DOMContentLoaded', () => {
  const headerBtn = document.getElementById('continue-guest-header');
  const heroBtn = document.getElementById('continue-guest-hero');
<<<<<<< HEAD
  const handler = (ev) => {
    if (window.GuestPool) GuestPool.assign();
=======
  const handler = async (ev) => {
    ev.preventDefault();
    if (!window.GuestPool) return;

    try {
      await GuestPool.assign();
      window.location.href = 'welcome.html';
    } catch (error) {
      alert(error.message || 'Unable to continue as guest. Please try again.');
    }
>>>>>>> ff605ed (improvements)
  };
  headerBtn?.addEventListener('click', handler);
  heroBtn?.addEventListener('click', handler);
});

// Basic chess representation
function deepCloneBoard(b) { return b.map(r => r.map(c => c ? {...c} : null)); }

function startingBoard() {
  const r = (c) => ({type:c, color:'b'});
  const R = (c) => ({type:c, color:'w'});
  return [
    [r('r'),r('n'),r('b'),r('q'),r('k'),r('b'),r('n'),r('r')],
    [r('p'),r('p'),r('p'),r('p'),r('p'),r('p'),r('p'),r('p')],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [R('p'),R('p'),R('p'),R('p'),R('p'),R('p'),R('p'),R('p')],
    [R('r'),R('n'),R('b'),R('q'),R('k'),R('b'),R('n'),R('r')]
  ];
}

// Global game state
let game = {
  board: startingBoard(),
  turn: 'w',
  selected: null,
  history: [],
  flipped: false
};

// Rendering helpers
const pieceToChar = (p) => {
  if (!p) return '';
  const map = { p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚' };
  const ch = map[p.type] || '?';
  return p.color === 'w'
    ? ch.replace('♟','♙').replace('♜','♖').replace('♞','♘').replace('♝','♗').replace('♛','♕').replace('♚','♔')
    : ch;
};

function renderBoard(targetEl, board, opts = {}) {
  if (!targetEl) return;
  targetEl.innerHTML = '';
  const small = targetEl.classList.contains('small') || targetEl.id === 'mini-board';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = create('div', 'square');
      const light = ((r + c) % 2 === 0);
      sq.classList.add(light ? 'light' : 'dark');
      sq.dataset.r = r; sq.dataset.c = c;
      if (game.selected && game.selected.r == r && game.selected.c == c) sq.classList.add('highlight');
      const piece = board[r][c];
      if (piece) {
        const pEl = create('div', 'piece');
        pEl.textContent = pieceToChar(piece);
        pEl.style.fontSize = small ? '18px' : '28px';
        sq.appendChild(pEl);
      }
      if (opts.moves) {
        for (const m of opts.moves) {
          if (m.r == r && m.c == c) sq.classList.add('highlight');
        }
      }
      targetEl.appendChild(sq);
    }
  }
}

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function generateMovesForSquare(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  const color = piece.color;
  const ally = (p) => p && p.color === color;
  const enemy = (p) => p && p.color !== color;

  if (piece.type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (inBounds(r+dir, c) && !board[r+dir][c]) moves.push({r:r+dir, c});
    if (r === startRow && !board[r+dir][c] && !board[r+2*dir][c]) moves.push({r:r+2*dir, c});
    for (const dc of [-1, 1]) {
      const nr = r+dir, nc = c+dc;
      if (inBounds(nr, nc) && enemy(board[nr][nc])) moves.push({r:nr, c:nc});
    }
    return moves;
  }
  if (piece.type === 'n') {
    const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of deltas) {
      const nr = r+dr, nc = c+dc;
      if (inBounds(nr, nc) && !ally(board[nr][nc])) moves.push({r:nr, c:nc});
    }
    return moves;
  }
  if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
    const dirs = [];
    if (piece.type === 'b' || piece.type === 'q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if (piece.type === 'r' || piece.type === 'q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
    for (const [dr, dc] of dirs) {
      let nr = r+dr, nc = c+dc;
      while (inBounds(nr, nc)) {
        if (!board[nr][nc]) { moves.push({r:nr, c:nc}); nr+=dr; nc+=dc; continue; }
        if (enemy(board[nr][nc])) moves.push({r:nr, c:nc});
        break;
      }
    }
    return moves;
  }
  if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r+dr, nc = c+dc;
      if (inBounds(nr, nc) && !ally(board[nr][nc])) moves.push({r:nr, c:nc});
    }
    return moves;
  }
  return moves;
}

function legalMoves(board, r, c) { return generateMovesForSquare(board, r, c); }

function viewCoords(r, c) {
  if (!game.flipped) return {r, c};
  return {r:7-r, c:7-c};
}

function buildInteractiveBoard() {
  renderBoard(boardEl, game.board);
  boardEl.addEventListener('click', (ev) => {
    const sq = ev.target.closest('.square');
    if (!sq) return;
    const r = parseInt(sq.dataset.r), c = parseInt(sq.dataset.c);
    handleSquareClick(r, c);
  });
}

function handleSquareClick(r, c) {
  const {r:vr, c:vc} = viewCoords(r, c);
  const piece = game.board[vr][vc];

  if (game.selected) {
    const {r:sr, c:sc} = game.selected;
    const moves = legalMoves(game.board, sr, sc);
    const ok = moves.some(m => m.r === vr && m.c === vc);
    if (ok) {
      const moving = game.board[sr][sc];
      const captured = game.board[vr][vc];
      let promotion = null;
      if (moving.type === 'p' && (vr === 0 || vr === 7)) promotion = 'q';
      game.board[vr][vc] = {...moving, type: promotion || moving.type};
      game.board[sr][sc] = null;
      game.history.push({from:{r:sr,c:sc}, to:{r:vr,c:vc}, piece:moving, captured, promotion});
      game.turn = (game.turn === 'w') ? 'b' : 'w';
      game.selected = null;
      updateUI();
    } else {
      if (piece && piece.color === game.turn) {
        game.selected = {r:vr, c:vc};
        updateUI();
      } else {
        game.selected = null;
        updateUI();
      }
    }
  } else {
    if (piece && piece.color === game.turn) {
      game.selected = {r:vr, c:vc};
      updateUI();
    }
  }
}

function updateUI() {
  renderBoard(boardEl, game.board, {moves: game.selected ? legalMoves(game.board, game.selected.r, game.selected.c) : null});
  renderBoard(MINI_BOARD, game.board);
  renderBoard(PUZZLE_BOARD, currentPuzzle.board, {moves: currentPuzzle.hintMoves || null});

  historyEl.innerHTML = '';
  for (let i = 0; i < game.history.length; i++) {
    const mv = game.history[i];
    const li = document.createElement('li');
    const san = `${i+1}. ${mv.piece.color}${mv.piece.type} ${String.fromCharCode(97+mv.from.c)}${8-mv.from.r} → ${String.fromCharCode(97+mv.to.c)}${8-mv.to.r}${mv.promotion ? '='+mv.promotion.toUpperCase() : ''}`;
    li.textContent = san;
    historyEl.appendChild(li);
  }
  turnEl.textContent = (game.turn === 'w') ? 'White to move' : 'Black to move';
}

// Controls — YOUR ORIGINAL UNCHANGED
const newGameBtn = el('#new-game');
if (newGameBtn) newGameBtn.addEventListener('click', () => {
  game.board = startingBoard(); game.turn = 'w'; game.selected = null; game.history = []; updateUI();
});
const resetBtn = el('#reset-btn');
if (resetBtn) resetBtn.addEventListener('click', () => {
  game.board = startingBoard(); game.turn = 'w'; game.selected = null; game.history = []; updateUI();
});
const undoBtn = el('#undo-btn');
if (undoBtn) undoBtn.addEventListener('click', () => {
  const last = game.history.pop();
  if (!last) return;
  game.board[last.from.r][last.from.c] = last.piece;
  game.board[last.to.r][last.to.c] = last.captured || null;
  game.turn = last.piece.color;
  game.selected = null;
  updateUI();
});
const flipBtn = el('#flip-btn');
if (flipBtn) flipBtn.addEventListener('click', () => {
  game.flipped = !game.flipped;
  boardEl.style.transform = game.flipped ? 'rotate(180deg)' : 'none';
  const pieces = boardEl.querySelectorAll('.piece');
  pieces.forEach(p => p.style.transform = game.flipped ? 'rotate(180deg)' : 'none');
});
const exportPgnBtn = el('#export-pgn');
if (exportPgnBtn) exportPgnBtn.addEventListener('click', () => {
  const pgnMoves = game.history.map(m =>
    `${String.fromCharCode(97+m.from.c)}${8-m.from.r}${m.captured?'x':'-'}${String.fromCharCode(97+m.to.c)}${8-m.to.r}${m.promotion?'='+m.promotion:''}`
  ).join(' ');
  const txt = `[Event "Local Game"]\n\n1. ${pgnMoves}`;
  const blob = new Blob([txt], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'game.pgn'; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

// Puzzles — YOUR ORIGINAL UNCHANGED
const PUZZLES = [
  {
    id:1, title:'Fork Tactics', desc:'White to move and win material (simple knight fork).',
    board: (()=>{
      const b = [
        [null,null,null,null,{type:'k',color:'b'},null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,{type:'q',color:'b'},null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,{type:'n',color:'w'},null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [{type:'k',color:'w'},null,null,null,null,null,null,null]
      ]; return b;
    })(),
    solution: [{from:{r:4,c:1},to:{r:2,c:2}}]
  },
  {
    id:2, title:'Queen Trap', desc:'White to move and trap the black queen.',
    board: (()=>{
      const b = [
        [null,null,null,null,{type:'k',color:'b'},null,null,null],
        [null,null,{type:'q',color:'b'},null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,{type:'p',color:'w'},null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [{type:'k',color:'w'},null,null,null,null,null,null,null]
      ]; return b;
    })(),
    solution: [{from:{r:4,c:1},to:{r:5,c:1}}]
  }
];

let puzzleIndex = 0;
let currentPuzzle = {board: startingBoard(), title:'', desc:'', solution:[]};

function loadPuzzle(idx) {
  currentPuzzle = JSON.parse(JSON.stringify(PUZZLES[idx] || PUZZLES[0]));
  const b = currentPuzzle.board;
  for (let r = 0; r < 8; r++) {
    if (!b[r]) b[r] = Array(8).fill(null);
    else for (let c = 0; c < 8; c++) if (typeof b[r][c] === 'undefined') b[r][c] = null;
  }
  currentPuzzle.hintMoves = currentPuzzle.solution && currentPuzzle.solution.length ? [currentPuzzle.solution[0].to] : null;
  renderBoard(PUZZLE_BOARD, currentPuzzle.board);
  el('#puzzle-title').textContent = currentPuzzle.title || `Puzzle ${idx+1}`;
  el('#puzzle-desc').textContent = currentPuzzle.desc || '';
}

const puzzleNextBtn = el('#puzzle-next');
if (puzzleNextBtn) puzzleNextBtn.addEventListener('click', () => {
  puzzleIndex = (puzzleIndex + 1) % PUZZLES.length;
  loadPuzzle(puzzleIndex);
});
const puzzleSolveBtn = el('#puzzle-solve');
if (puzzleSolveBtn) puzzleSolveBtn.addEventListener('click', () => {
  const sol = currentPuzzle.solution && currentPuzzle.solution[0];
  if (!sol) return;
  renderBoard(PUZZLE_BOARD, currentPuzzle.board, {moves:[sol.from, sol.to]});
  setTimeout(() => renderBoard(PUZZLE_BOARD, currentPuzzle.board), 1200);
});

renderBoard(MINI_BOARD, startingBoard());
buildInteractiveBoard();
updateUI();
loadPuzzle(0);

el('#login-btn')?.addEventListener('click', () => {
  alert('This is a prototype — login not implemented.');
});

// ==========================================================
// PHONE-ONLY JS — Added below, touches nothing above
// ==========================================================

// ── Hamburger drawer open/close ──
const mobileMenuBtn  = el('#mobile-menu-btn');
const mobileOverlay  = el('#mobile-nav-overlay');
const mobileDrawer   = el('#mobile-nav-drawer');
const drawerCloseBtn = el('#drawer-close');

function openDrawer() {
  mobileDrawer?.classList.add('open');
  mobileOverlay?.classList.add('open');
  document.body.style.overflow = 'hidden';
  mobileMenuBtn?.setAttribute('aria-expanded', 'true');
}
function closeDrawer() {
  mobileDrawer?.classList.remove('open');
  mobileOverlay?.classList.remove('open');
  document.body.style.overflow = '';
  mobileMenuBtn?.setAttribute('aria-expanded', 'false');
}

mobileMenuBtn?.addEventListener('click', openDrawer);
drawerCloseBtn?.addEventListener('click', closeDrawer);
mobileOverlay?.addEventListener('click', closeDrawer);
document.querySelectorAll('#mobile-nav-drawer a').forEach(a => a.addEventListener('click', closeDrawer));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

// ── Phone bottom nav active highlight on scroll ──
const pbnItems = document.querySelectorAll('.pbn-item');
const navSections = ['#play', '#features', '#membership', '#variants'];

function updatePhoneNav() {
  const scrollY = window.scrollY + 120;
  let active = navSections[0];
  navSections.forEach(id => {
    const sec = el(id);
    if (sec && sec.offsetTop <= scrollY) active = id;
  });
  pbnItems.forEach(item => {
    item.classList.toggle('active', item.getAttribute('href') === active);
  });
}

window.addEventListener('scroll', updatePhoneNav, { passive: true });

// ── Sticky header shadow on scroll ──
window.addEventListener('scroll', () => {
  el('#site-header')?.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

// ── Smooth scroll for anchor links ──
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const target = el(link.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  window.scrollTo({ top: target.offsetTop - 68, behavior: 'smooth' });
});

// ── Add bottom padding on phone so bottom nav doesn't cover content ──
function adjustBodyPadding() {
  const phoneNav = el('#phone-bottom-nav');
  if (!phoneNav) return;
  const visible = window.getComputedStyle(phoneNav).display !== 'none';
  document.body.style.paddingBottom = visible ? (phoneNav.offsetHeight + 4) + 'px' : '';
}
window.addEventListener('resize', adjustBodyPadding, { passive: true });
<<<<<<< HEAD
adjustBodyPadding();
=======
adjustBodyPadding();
>>>>>>> ff605ed (improvements)
