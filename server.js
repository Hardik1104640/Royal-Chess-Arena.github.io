// server.js
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { init, findUserByEmail, createUser } = require('./db');

// Device-based login tracking: deviceId -> { userId, sessionId, ws }
const activeDevices = new Map();

// Initialize database before starting server
(async () => {
    try {
        await init();
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
})();

const app = express();
const PORT = process.env.PORT || 8080;  // Use port 8080 instead of 3000

// Middleware
// Disable helmet's contentSecurityPolicy for local development so module loading works.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true if using https
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Auth middleware to protect routes
const requireAuth = (req, res, next) => {
  // Give the session a short moment to be properly set
  setTimeout(() => {
    console.log('Session check:', {
      hasSession: !!req.session,
      hasUser: req.session ? !!req.session.user : false,
      sessionID: req.sessionID,
      user: req.session ? req.session.user : null
    });

    if (req.session && req.session.user) {
      console.log('Auth successful for user:', req.session.user.email);
      return next();
    }

    // Auth failed: do NOT redirect to login page automatically.
    // Instead return a 401 so the client can decide what to do.
    console.log('Auth failed, returning 401 (no automatic redirect)');

    const accepts = req.headers.accept || '';
    if (req.xhr || accepts.includes('application/json')) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    // For normal browser navigation, send a simple 401 HTML page and let client handle redirect if desired
    return res.status(401).send('<!doctype html><html><head><meta charset="utf-8"><title>401 Unauthorized</title></head><body><h1>401 Unauthorized</h1><p>Please log in to access this page.</p></body></html>');
  }, 500); // small delay to allow session middleware to finish
};

// Serve static files with proper headers
app.use(express.static('public', {
  setHeaders: (res, path, stat) => {
    // Don't cache CSS/JS during development - allows mobile to get fresh files
    if (path.endsWith('.css') || path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Expose installed packages under /vendor so browser modules can import them
app.use('/vendor', express.static(path.join(__dirname, 'node_modules')));

// Protect welcome.html
app.get('/welcome.html', requireAuth);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Check for SQLite errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    if (err.message.includes('users.email')) {
      return res.status(409).json({
        error: 'EMAIL_EXISTS',
        message: 'This email is already registered. Please log in.'
      });
    }
    if (err.message.includes('users.display_name')) {
      return res.status(409).json({
        error: 'DISPLAY_NAME_EXISTS',
        message: 'This display name is already taken. Please choose another one.'
      });
    }
  }

  // Generic error response
  res.status(500).json({
    error: 'SERVER_ERROR',
    message: 'An unexpected error occurred. Please try again.'
  });
});

// static
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'Images')));

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    if (req.method === 'POST') {
        console.log('Request body:', req.body);
    }
    next();
});

// Routes
app.get('/profile', requireAuth, async (req,res)=>{
  try {
    const user = await findUserByEmail(req.session.userEmail);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found' });
    }
    res.json({ 
      success: true, 
      user: { 
        email: user.email, 
        display_name: user.display_name 
      } 
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Server error while fetching profile' });
  }
});

app.get('/logout', (req, res) => {
  // Allow the client to request a post-logout redirect destination via ?returnTo=/index.html
  const returnTo = typeof req.query.returnTo === 'string' && req.query.returnTo.length ? req.query.returnTo : '/';
  req.session.destroy(() => {
    res.clearCookie('sid');
    // Prevent open redirect vulnerabilities by only allowing same-origin paths
    if (returnTo.startsWith('/')) return res.redirect(returnTo);
    return res.redirect('/');
  });
});

// Endpoint: Handle account switch decision from existing device session
app.post('/device/switch-account', (req, res) => {
  try {
    const { deviceId, accepted, email, password } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'MISSING_DEVICE_ID', message: 'Device ID is required' });
    }

    console.log('Account switch response:', { deviceId, accepted, email });

    if (accepted) {
      // User accepted - clear old device session and allow new login
      activeDevices.delete(deviceId);
      console.log('Device session cleared, new account can now login:', { deviceId, email });
      
      res.status(200).json({
        success: true,
        message: 'Account switch accepted. Please login again with your new account.',
        action: 'RETRY_LOGIN'
      });
    } else {
      // User rejected - keep current account, deny new login
      console.log('User rejected account switch:', { deviceId, email });
      
      res.status(403).json({
        error: 'ACCOUNT_SWITCH_REJECTED',
        message: 'You chose to keep your current account. New login was rejected.',
        action: 'KEEP_CURRENT_ACCOUNT'
      });
    }
  } catch (err) {
    console.error('Switch account error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Error processing account switch' });
  }
});

// Debug middleware for signup requests
app.use('/signup', (req, res, next) => {
  console.log('Signup Request Body:', req.body);
  next();
});

// Test endpoint to check if CSS files are being served
app.get('/test-css', (req, res) => {
  res.json({ 
    status: 'Server is running on port ' + PORT,
    css_files: [
      '/css/styles-sign_in.css',
      '/css/styles-sign_up.css', 
      '/css/home.css',
      '/css/index.css',
      '/sidebar/css/play.css'
    ],
    message: 'If CSS files are not loading on mobile, try: Ctrl+Shift+R (Windows) or Cmd+Option+R (Mac) or Settings > Clear Cache on mobile browser'
  });
});

// Signup
app.post('/signup', async (req,res)=>{
  try {
    console.log('Processing signup request:', req.body);
    
    const { email, password, display_name, deviceId } = req.body;
    
    // Validation
    if(!email || !password || !display_name) {
      console.log('Missing fields:', { email: !!email, password: !!password, display_name: !!display_name });
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Email, password and display name are required'
      });
    }

    // CHECK: Device already has an active account - block signup
    if (deviceId && activeDevices.has(deviceId)) {
      const existingSession = activeDevices.get(deviceId);
      console.warn('Signup blocked: Device already has active account', { 
        deviceId, 
        existingEmail: existingSession.email 
      });
      return res.status(403).json({
        error: 'DEVICE_HAS_ACTIVE_ACCOUNT',
        message: `This device already has an active account (${existingSession.email}). Please log out first or switch accounts on the login page.`,
        existingEmail: existingSession.email,
        action: 'LOG_OUT_FIRST'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Please enter a valid email address'
      });
    }

    // Display name validation (no spaces, as we set up in the frontend)
    const displayNameRegex = /^[A-Za-z0-9_-]+$/;
    if(!displayNameRegex.test(display_name)) {
      return res.status(400).json({
        error: 'INVALID_DISPLAY_NAME',
        message: 'Display name can only contain letters, numbers, underscores and hyphens'
      });
    }

    // Password strength validation
    if(password.length < 8) {
      return res.status(400).json({
        error: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters long'
      });
    }

    try {
      // Hash password
      const saltRounds = 12;
      const hash = await bcrypt.hash(password, saltRounds);
      
      // Try to create user
      const user = await createUser({ 
        email, 
        password_hash: hash, 
        display_name
      });

      // Create session
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.displayName = user.display_name;

      // Send success response
      res.status(200).json({
        success: true,
        message: 'Signup successful',
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name
        }
      });

    } catch(err) {
      // Handle specific database errors
      if(err.message === 'EMAIL_EXISTS') {
        return res.status(409).json({
          error: 'EMAIL_EXISTS',
          message: 'This email is already registered. Please log in or use a different email.'
        });
      }
      if(err.message === 'DISPLAY_NAME_EXISTS') {
        return res.status(409).json({
          error: 'DISPLAY_NAME_EXISTS',
          message: 'This display name is already taken. Please choose another one.'
        });
      }
      throw err; // Re-throw unexpected errors
    }
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again.'
    });
  }
});

// Login
app.post('/login', async (req,res)=>{
  try {
        const { email, password, deviceId } = req.body;
        
        // Validation
        if(!email || !password) {
          return res.status(400).json({
            error: 'MISSING_FIELDS',
            message: 'Email and password are required'
          });
        }

        console.log('Login request received:', { email, passwordProvided: !!password, deviceId });

        // Find user
        const user = await findUserByEmail(email);
        if (!user) {
            console.warn('Login failed: email not found:', email);
            return res.status(404).json({
                error: 'EMAIL_NOT_FOUND',
                message: 'Email does not exist. Please sign up.'
            });
        }

        console.log('User found:', { email: user.email, displayName: user.display_name });

        // Check password
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
            console.warn('Login failed: incorrect password for email:', email);
            return res.status(401).json({
                error: 'WRONG_PASSWORD',
                message: 'Incorrect password. Please try again.'
            });
        }

        // Check device conflict: if device is already logged in with different user
        if (deviceId && activeDevices.has(deviceId)) {
            const existingSession = activeDevices.get(deviceId);
            if (existingSession.userId !== user.id) {
                console.log('Device conflict detected:', { 
                    deviceId, 
                    existingUserId: existingSession.userId, 
                    newUserId: user.id,
                    existingEmail: existingSession.email,
                    newEmail: email
                });
                
                // DON'T auto-logout. Instead, ask user for confirmation
                // Send switch account request to existing session via WebSocket
                if (existingSession.ws && existingSession.ws.readyState === 1) { // 1 = OPEN
                    try {
                        existingSession.ws.send(JSON.stringify({
                            type: 'account_switch_request',
                            message: `Different account attempting to login on this device`,
                            newUserEmail: email,
                            newUserDisplayName: user.display_name,
                            currentUserEmail: existingSession.email
                        }));
                    } catch (e) {
                        console.warn('Could not send switch request to WebSocket:', e.message);
                    }
                }
                
                // Return error asking user to wait or try again
                return res.status(409).json({
                    error: 'DEVICE_CONFLICT',
                    message: `Another account (${existingSession.email}) is currently active on this device. The user has been asked to confirm the account switch.`,
                    existingEmail: existingSession.email,
                    newEmail: email,
                    action: 'WAIT_FOR_SWITCH_CONFIRMATION'
                });
            }
        }

        // Successful login
        req.session.user = { id: user.id, email: user.email, displayName: user.display_name };
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({
                    error: 'SESSION_ERROR',
                    message: 'Failed to create session'
                });
            }
            
            // Store device info for this login
            if (deviceId) {
                activeDevices.set(deviceId, {
                    userId: user.id,
                    email: user.email,
                    sessionId: req.sessionID,
                    ws: null // Will be set when WebSocket connects
                });
                console.log('Device registered:', { deviceId, userId: user.id });
            }
            
            // Verify session was saved
            req.session.reload((reloadErr) => {
                if (reloadErr) {
                    console.error('Session reload error:', reloadErr);
                    return res.status(500).json({
                        error: 'SESSION_ERROR',
                        message: 'Failed to verify session'
                    });
                }
                
                console.log('Login successful, session verified for:', email);
                return res.status(200).json({ 
                    message: 'Login successful',
                    user: {
                        email: user.email,
                        displayName: user.display_name
                    }
                });
            });
        });
    } catch (err) {
        console.error('Unexpected error during login:', err);
        return res.status(500).json({
            error: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred. Please try again later.'
        });
    }
});

// minimal endpoints for debug
app.get('/whoami', (req,res) => {
  // Return user info from session if available. Support both older `userEmail` and new `user` shape.
  if (req.session) {
    if (req.session.user && req.session.user.email) {
      return res.json({ email: req.session.user.email, displayName: req.session.user.displayName || null });
    }
    if (req.session.userEmail) {
      return res.json({ email: req.session.userEmail });
    }
  }
  res.json({ email: null });
});

// Save game endpoint (POST)
app.post('/api/save-game', requireAuth, (req, res) => {
  try {
    const gameData = req.body;
    if (!gameData || !gameData.id) {
      return res.status(400).json({ error: 'MISSING_DATA', message: 'Game data or ID missing' });
    }
    // Attach user email to the game data
    const userEmail = req.session.user && req.session.user.email ? req.session.user.email : null;
    if (!userEmail) {
      return res.status(401).json({ error: 'NO_USER', message: 'User not authenticated' });
    }
    gameData.userEmail = userEmail;
    const filePath = path.join(__dirname, 'database', `${gameData.id}.json`);
    fs.writeFile(filePath, JSON.stringify(gameData, null, 2), (err) => {
      if (err) {
        console.error('Failed to save game:', err);
        return res.status(500).json({ error: 'SAVE_FAILED', message: 'Could not save game' });
      }
      res.json({ success: true });
    });
  } catch (e) {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Unexpected error' });
  }
});

// List saved games endpoint (GET)
app.get('/api/list-games', requireAuth, (req, res) => {
  const dbDir = path.join(__dirname, 'database');
  const userEmail = req.session.user && req.session.user.email ? req.session.user.email : null;
  if (!userEmail) {
    return res.status(401).json({ error: 'NO_USER', message: 'User not authenticated' });
  }
  fs.readdir(dbDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'LIST_FAILED', message: 'Could not list games' });
    }
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const games = [];
    let completed = 0;
    
    if (jsonFiles.length === 0) return res.json([]);
    
    jsonFiles.forEach(f => {
      fs.readFile(path.join(dbDir, f), 'utf8', (err, data) => {
        completed++;
        if (!err) {
          try {
            const game = JSON.parse(data);
            if (game.userEmail === userEmail) {
              // Detect game type with multiple checks
              let gameType = 'online';
              if (game.type === 'bot' || game.botName || (game.players && game.players[1] && game.players[1].includes('bot'))) {
                gameType = 'bot';
              }
              
              // Extract opponent with multiple fallbacks
              let opponentName = 'Unknown';
              if (game.opponent && game.opponent !== 'Unknown') {
                opponentName = game.opponent;  // New format: explicit opponent field
              } else if (game.botName) {
                opponentName = game.botName;   // Old bot format
              } else if (game.players && Array.isArray(game.players)) {
                // Old format: players array like ["You (Black)", "Viktor"]
                const playerInfo = game.players.find(p => !p.includes('You'));
                if (playerInfo) {
                  // Clean up player string
                  opponentName = playerInfo.replace(/\s*\(.*?\)\s*/g, '').trim();
                }
              }
              
              games.push({ 
                id: game.id, 
                type: gameType,
                date: game.date,
                result: game.result,
                opponent: opponentName || 'Unknown',
                totalMoves: game.totalMoves,
                timeControl: game.timeControl,
                endFen: game.endFen
              });
            }
          } catch (e) {
            console.error(`Error parsing ${f}:`, e.message);
          }
        }
        
        // Send response only when all files are processed
        if (completed === jsonFiles.length) {
          res.json(games);
        }
      });
    });
  });
});

// ─── GET full game data by ID ────────────────────────────────────────────────
app.get('/api/game-data/:gameId', requireAuth, (req, res) => {
  const dbDir = path.join(__dirname, 'database');
  const gameId = req.params.gameId;
  const userEmail = req.session.user && req.session.user.email ? req.session.user.email : null;
  
  if (!userEmail) {
    return res.status(401).json({ error: 'NOT_AUTH', message: 'User not authenticated' });
  }
  
  if (!gameId || gameId.includes('..') || gameId.includes('/')) {
    return res.status(400).json({ error: 'INVALID_ID', message: 'Invalid game ID' });
  }
  
  const gamePath = path.join(dbDir, `${gameId}.json`);
  
  fs.readFile(gamePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Game not found' });
      }
      return res.status(500).json({ error: 'READ_ERROR', message: 'Could not read game data' });
    }
    
    try {
      const gameData = JSON.parse(data);
      
      // Verify ownership
      if (gameData.userEmail !== userEmail) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'You do not own this game' });
      }
      
      res.json(gameData);
    } catch (e) {
      res.status(500).json({ error: 'PARSE_ERROR', message: 'Could not parse game data' });
    }
  });
});

// Try to load SSL certificates for HTTPS, otherwise use HTTP only
const os = require('os');
const ifaces = os.networkInterfaces();
let ipAddr = 'localhost';
for (const name of Object.keys(ifaces)) {
  for (const iface of ifaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      ipAddr = iface.address;
      break;
    }
  }
}

// Check if SSL certificates exist
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

let server;

server = app.listen(PORT, '0.0.0.0', ()=> {
  console.log(`🚀 Chess Server running on http://localhost:${PORT} and http://${ipAddr}:${PORT}`);
  console.log(`📱 Access from phone: http://${ipAddr}:${PORT}`);
  console.log('✅ Game features: Login • Signup • Matchmaking • Real-time moves • Chat');
});

// WebSocket server (simple matchmaking + move forwarding)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

const matchQueue = []; // { ws, time }
const rooms = new Map(); // roomId -> { players: [ws, ws] }

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

wss.on('connection', (ws, req) => {
  ws.id = makeId();
  ws.isAlive = true;

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'invalid_json' }));
      return;
    }

    console.log('📨 Server received message type:', data.type, 'Type length:', data.type?.length, 'Char codes:', Array.from(data.type || '').map(c => c.charCodeAt(0)));
    console.log('📨 Full data:', JSON.stringify(data));
    
    switch (data.type) {
      case 'join_queue': {
        // Expect { type: 'join_queue', time, name, rating, deviceId }
        const time = data.time || '10 min';
        const playerName = data.name || 'Anonymous';
        const playerRating = data.rating || 1500;
        const deviceId = data.deviceId;
        
        // Update device tracking with WebSocket connection
        if (deviceId && activeDevices.has(deviceId)) {
          activeDevices.get(deviceId).ws = ws;
          console.log('Updated WebSocket for device:', deviceId);
        }
        
        // Add to queue with player info
        matchQueue.push({ ws, time, name: playerName, rating: playerRating });
        
        // Try to find opponent
        const idx = matchQueue.findIndex(item => item.ws !== ws && item.time === time);
        if (idx !== -1) {
          const opponent = matchQueue.splice(idx,1)[0];
          // Remove current from queue as well
          const selfIdx = matchQueue.findIndex(item => item.ws === ws);
          if (selfIdx !== -1) matchQueue.splice(selfIdx,1);

          const roomId = makeId();
          // track players and readiness set
          rooms.set(roomId, { players: [ws, opponent.ws], ready: new Set() });

          // Assign colors randomly
          const assign = Math.random() < 0.5;
          const msgA = { type: 'match_found', room: roomId, color: assign ? 'w' : 'b', opponent: { name: opponent.name, rating: opponent.rating }, time };
          const msgB = { type: 'match_found', room: roomId, color: assign ? 'b' : 'w', opponent: { name: playerName, rating: playerRating }, time };
          ws.send(JSON.stringify(msgA));
          opponent.ws.send(JSON.stringify(msgB));
          
          // note: clocks will start once both players send a "player_ready" message
          console.log('Room', roomId, 'created; awaiting ready signals');
        }
        break;
      }
      case 'leave_queue': {
        const idx = matchQueue.findIndex(item => item.ws === ws);
        if (idx !== -1) matchQueue.splice(idx,1);
        ws.send(JSON.stringify({ type: 'left_queue' }));
        break;
      }
      case 'move': {
        // Expect { type: 'move', room, move }
        const roomId = data.room;
        if (!roomId || !rooms.has(roomId)) return;
        const room = rooms.get(roomId);
        // Find opponent
        const opponent = room.players.find(p => p !== ws);
        if (opponent && opponent.readyState === WebSocket.OPEN) {
          opponent.send(JSON.stringify({ type: 'opponent_move', move: data.move }));
        }
        break; // keep existing behavior
      }
      case 'player_ready': {
        // client tells server it's ready to start clocks
        const roomId = data.room;
        if (!roomId || !rooms.has(roomId)) break;
        const room = rooms.get(roomId);
        room.ready.add(ws);
        // when both players have indicated ready, broadcast start_game
        if (room.ready.size >= 2) {
          const startMsg = { type: 'game_start', room: roomId, timestamp: Date.now() };
          room.players.forEach(p => {
            if (p && p.readyState === WebSocket.OPEN) p.send(JSON.stringify(startMsg));
          });
          console.log('Room', roomId, 'both players ready - sent game_start');
        }
        break;
      }
      case 'leave_room': {
        const roomId = data.room;
        if (!roomId || !rooms.has(roomId)) return;
        const room = rooms.get(roomId);
        const opponent = room.players.find(p => p !== ws);
        if (opponent && opponent.readyState === WebSocket.OPEN) {
          opponent.send(JSON.stringify({ type: 'opponent_left' }));
        }
        rooms.delete(roomId);
        break;
      }
      case 'account_switch_response': {
        // Handle user's response to account switch request
        const deviceId = data.deviceId;
        const accepted = data.accepted;
        
        console.log('Account switch response from WebSocket:', { deviceId, accepted });
        
        if (accepted && deviceId && activeDevices.has(deviceId)) {
          // User accepted switch - clear old session and allow new login
          const oldSession = activeDevices.get(deviceId);
          console.log('User accepted account switch, clearing device session:', { deviceId, oldEmail: oldSession.email });
          activeDevices.delete(deviceId);
          
          ws.send(JSON.stringify({ 
            type: 'account_switch_confirmed',
            message: 'You have been logged out. New account can now login.',
            action: 'REDIRECT_TO_LOGIN'
          }));
          
          // Close the old WebSocket after confirming
          setTimeout(() => ws.close(), 500);
        } else if (!accepted && deviceId) {
          // User rejected switch - keep current session active
          console.log('User rejected account switch request');
          ws.send(JSON.stringify({ 
            type: 'account_switch_rejected',
            message: 'You kept your current account. New login was blocked.',
            action: 'CONTINUE_CURRENT_SESSION'
          }));
        }
        break;
      }
      case 'logout_response': {
        // Handle user's response to logout request
        const deviceId = data.deviceId;
        const accepted = data.accepted;
        
        console.log('Logout response:', { deviceId, accepted });
        
        if (accepted && deviceId && activeDevices.has(deviceId)) {
          // User accepted - proceed with logout
          const oldSession = activeDevices.get(deviceId);
          console.log('User accepted logout request, clearing device session');
          activeDevices.delete(deviceId);
          
          // If we had pending login info, we would process it here
          // For now, just acknowledge
          ws.send(JSON.stringify({ type: 'logout_accepted' }));
        } else if (!accepted && deviceId) {
          // User rejected logout request - deny new login
          console.log('User rejected logout request');
          ws.send(JSON.stringify({ 
            type: 'login_denied',
            message: 'Device conflict: existing session rejected your login request'
          }));
        }
        break;
      }
      case 'chat': {
        // Handle chat messages - broadcast to all players in the room (except sender)
        const roomId = data.room;
        const playerName = data.player;
        const message = data.message;
        
        console.log('💬 Chat message received in room', roomId, 'from', playerName, ':', message);
        
        if (!roomId || !rooms.has(roomId)) {
          console.warn('Chat: Room not found:', roomId);
          return;
        }
        
        const room = rooms.get(roomId);
        
        // Send message to opponent (other player in room)
        room.players.forEach(player => {
          if (player && player !== ws && player.readyState === WebSocket.OPEN) {
            player.send(JSON.stringify({ 
              type: 'chat', 
              player: playerName, 
              message: message,
              room: roomId 
            }));
            console.log('📤 Chat message sent to opponent');
          }
        });
        break;
      }
      case 'draw_offer': {
        // Handle draw offer - send to opponent
        const roomId = data.room;
        const playerName = data.player;
        const fromColor = data.from;
        
        console.log('🤝 Draw offer received in room', roomId, 'from', fromColor);
        
        if (!roomId || !rooms.has(roomId)) {
          console.warn('Draw offer: Room not found:', roomId);
          return;
        }
        
        const room = rooms.get(roomId);
        const opponent = room.players.find(p => p !== ws);
        
        if (opponent && opponent.readyState === WebSocket.OPEN) {
          opponent.send(JSON.stringify({ 
            type: 'draw_offer', 
            player: playerName,
            from: fromColor,
            room: roomId 
          }));
          console.log('✅ Draw offer sent to opponent');
        }
        break;
      }
      case 'game_end': {
        // Handle game end notification - broadcast to opponent
        const roomId = data.room;
        const gameEnd = data.gameEnd;
        const result = data.result;
        const resignedPlayer = data.resignedPlayer;
        
        console.log('🏁 Game end received in room', roomId, 'Result:', gameEnd, result);
        
        if (!roomId || !rooms.has(roomId)) {
          console.warn('Game end: Room not found:', roomId);
          return;
        }
        
        const room = rooms.get(roomId);
        const opponent = room.players.find(p => p !== ws);
        
        if (opponent && opponent.readyState === WebSocket.OPEN) {
          opponent.send(JSON.stringify({ 
            type: 'game_end', 
            gameEnd: gameEnd,
            resignedPlayer: resignedPlayer,
            result: result,
            room: roomId 
          }));
          console.log('✅ Game end message sent to opponent');
        }
        break;
      }
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'unknown_type' }));
    }
  });

  ws.on('close', () => {
    // Remove from queue if present
    const idx = matchQueue.findIndex(item => item.ws === ws);
    if (idx !== -1) matchQueue.splice(idx,1);

    // If in a room, notify opponent
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.includes(ws)) {
        const opponent = room.players.find(p => p !== ws);
        if (opponent && opponent.readyState === WebSocket.OPEN) {
          opponent.send(JSON.stringify({ type: 'opponent_left' }));
        }
        rooms.delete(roomId);
        break;
      }
    }
  });

  // heartbeat
  ws.on('pong', () => ws.isAlive = true);
});

// Periodically clean dead sockets
setInterval(() => {
  wss.clients.forEach(client => {
    if (!client.isAlive) return client.terminate();
    client.isAlive = false;
    client.ping();
  });
}, 30000);
 
