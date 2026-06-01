// mini-board.js — replace data-piece squares with image assets when available
(function(){
  const pieceSquares = document.querySelectorAll('.mini-board .square[data-piece]');
  if(!pieceSquares.length) return;

  // candidate directories (relative to public/index.html)
  const dirs = [
<<<<<<< HEAD
    '../../images/Chesspieces/',  // primary path first - matches our Express route
    '../...images/Chesspieces/',
    '../../images/Chesspieces/',
    '../../Images/Chesspieces/',
    '../../Images/Chesspieces/'
=======
    '/images/Chesspieces/',  // primary path first - matches our Express route
    './images/Chesspieces/',
    '../images/Chesspieces/',
    './Images/Chesspieces/',
    '/Images/Chesspieces/'
>>>>>>> ff605ed (improvements)
  ];
  
  // Debug which directory we're checking
  try {
    console.info('mini-board: searching directories:', dirs);
    // Log the full URL we're trying to load for the first piece
    if (pieceSquares.length > 0) {
      const firstPiece = pieceSquares[0].getAttribute('data-piece');
      console.info('Example piece load attempt:', firstPiece);
      console.info('Full URL example:', window.location.origin + dirs[0] + firstPiece + '.png');
    }
  } catch(e){
    console.error('Logging error:', e);
  }

  // candidate filename patterns for a given code like wK or bP
  function candidates(code){
    const p = code.toLowerCase(); // wk, bp etc
    const color = p[0];
    const piece = p[1];
    const longColor = color === 'w' ? 'white' : 'black';
    const longMap = {k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
    const longPiece = longMap[piece] || piece;

    // common filename patterns (case variations)
    const patterns = [
      // Direct piece codes: wK, bP etc
      code, p,
      // Color_Piece patterns
      `${longColor}_${longPiece}`,
      `${longColor}-${longPiece}`,
      `${longPiece}_${longColor}`,
      `${longPiece}-${longColor}`,
      // Just the piece name
      longPiece
    ];

    // Try each pattern with common extensions and casing
    return patterns.flatMap(pat => [
      // Original case
      `${pat}.png`, `${pat}.svg`, `${pat}.jpg`,
      // Uppercase
      `${pat.toUpperCase()}.png`, `${pat.toUpperCase()}.svg`,
      // Lowercase
      `${pat.toLowerCase()}.png`, `${pat.toLowerCase()}.svg`
    ]);
  }

  // test image URL by creating Image and listening to onload/onerror
  function testUrl(url){
    return new Promise((resolve)=>{
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  async function findSrc(code){
    const names = candidates(code);
    for(const d of dirs){
      for(const n of names){
        const url = d + n;
        // try headless quick test by creating image
        // on some servers, missing files might still return 200 but this is best-effort
        // Use await to keep sequential (avoid spamming requests)
        // eslint-disable-next-line no-await-in-loop
        const ok = await testUrl(url);
        if(ok) return url;
      }
    }
    return null;
  }

  // find all unique piece codes used
  const codes = Array.from(new Set(Array.from(pieceSquares).map(s=>s.dataset.piece)));
  const found = {};

  // Try to find src for each code in parallel (but each code runs sequential search)
  Promise.all(codes.map(async(code)=>{
    const src = await findSrc(code);
    found[code] = src;
  })).then(()=>{
    // debug: log what we found for each unique code
    try{
      // eslint-disable-next-line no-console
      console.info('mini-board: piece -> src mapping', found);
    }catch(e){}

    // apply images where found, otherwise fallback to a simple glyph
    pieceSquares.forEach(sq=>{
      const code = sq.dataset.piece;
      const src = found[code];
      if(src){
        const img = document.createElement('img');
        img.src = src;
        img.alt = code;
        img.className = 'mini-piece-img';
        // make image decode/load nicely
        img.loading = 'lazy';
        img.decoding = 'async';
        // clear any text and append
        sq.textContent = '';
        sq.appendChild(img);
      } else {
        // fallback glyph mapping
        const glyphMap = {bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟',wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙'};
        sq.textContent = glyphMap[code] || '';
      }
    });
  });
})();
