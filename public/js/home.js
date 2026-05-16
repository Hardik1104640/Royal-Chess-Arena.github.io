// home.js - handles welcome page user rendering and session checks
document.addEventListener('DOMContentLoaded', () => {
    const userWelcome = document.getElementById('user-welcome');
    const topRight = document.getElementById('top-right');

    // current rating tracked client-side; initial value will be set from server data or default
    let currentRating = 1200;

    // Star thresholds (each star is full when rating > threshold)
    const STAR_THRESHOLDS = [2000, 2200, 2400, 2600, 2800];

    const renderUser = (data) => {
        // Resolve name from common server fields in priority order
        const gamesPlayed = (data && Number.isFinite(Number(data.gamesPlayed))) ? Number(data.gamesPlayed) : 0;
        const resolvedName = (data && (data.displayName || data.name || data.username || data.email)) ?
            (data.displayName || data.name || data.username || data.email) : 'Player';
        const name = resolvedName;
        const isGuest = window.GuestPool && GuestPool.isGuest();
        const welcomeText = isGuest ? `Welcome ${escapeHtml(name)}!` : `Welcome back, ${escapeHtml(name)}!`;
        
        if (userWelcome) {
            userWelcome.innerHTML = `
            <div class="welcome-card card">
                <h2>${welcomeText}</h2>
                <p class="muted">Ready for your next challenge?</p>
                <div class="welcome-actions">
                    <a class="btn primary" href="/sidebar/html/play.html"><i class="fas fa-play"></i> Play Now</a>
                    <a class="btn" href="/profile"><i class="fas fa-user"></i> Profile</a>
                </div>
            </div>
        `;
        }
        // render avatar initial and name (topbar)
        const avatar = document.getElementById('user-avatar');
        const userNameEl = document.getElementById('user-name');
        if (avatar) {
            const initial = String(name || 'P').trim().charAt(0).toUpperCase();
            avatar.textContent = initial;
        }
        if (userNameEl) userNameEl.textContent = name;

    // Preferred time control handling: update the Quick Play tile with the user's preferred time
    const preferredTile = document.querySelector('.tile.preferred-time');
    const preferredLabelEl = preferredTile ? preferredTile.querySelector('.preferred-label') : null;
    const timeLabelEl = preferredTile ? preferredTile.querySelector('.time-label') : null;
    // Determine preferred time: server-supplied, local history, or default
    const preferred = resolvePreferredTime(data);
    if (timeLabelEl) timeLabelEl.textContent = `Play ${preferred}`;
    if (preferredLabelEl) preferredLabelEl.textContent = (preferred === '10 min') ? 'Default time control' : 'Your preferred time control';

        // Update sidebar user info if present
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        const sidebarName = document.getElementById('sidebar-name');
        const sidebarStatus = document.getElementById('sidebar-status');
        const sidebarStars = document.getElementById('sidebar-stars');
        const sidebarRating = document.getElementById('sidebar-rating');
        const sidebarGames = document.getElementById('sidebar-games');

        // Display player avatar initial and display name (use resolved `name` variable)
        if (sidebarAvatar) sidebarAvatar.textContent = (String(name).trim().charAt(0) || 'P').toUpperCase();
        if (sidebarName) sidebarName.textContent = name;
        // update hidden rating/games fields if present (keeps DOM present for any scripts)
        if (sidebarRating) sidebarRating.textContent = String(currentRating || 0);
        if (sidebarGames) sidebarGames.textContent = String(gamesPlayed || 0);

        // Determine rating and status
        const rating = (data && data.rating !== undefined && data.rating !== null) ? Number(data.rating) : currentRating;
        // sync currentRating
        currentRating = Number(rating) || currentRating;

        let statusText = 'New to Chess';
        if (currentRating <= 800) statusText = 'New to Chess';
        else if (currentRating <= 1200) statusText = 'Beginner';
        else if (currentRating <= 1500) statusText = 'Intermediate';
        else if (currentRating <= 2000) statusText = 'Advance';
        else statusText = 'Expert';
        if (sidebarStatus) sidebarStatus.textContent = statusText;

        // Stars shading logic (only show stars for rating > 2000)
        if (sidebarStars) {
            const stars = Array.from(sidebarStars.querySelectorAll('.star'));
            if (currentRating > STAR_THRESHOLDS[0]) {
                sidebarStars.classList.remove('hidden');
                stars.forEach((el,i) => {
                    const threshold = STAR_THRESHOLDS[i] || 99999;
                    const fill = (currentRating > threshold) ? 100 : 0; // full star when over threshold
                    el.style.setProperty('--fill', fill + '%');
                });
            } else {
                sidebarStars.classList.add('hidden');
                // clear fills
                stars.forEach(el => el.style.setProperty('--fill', '0%'));
            }
        }

        // Ensure rating display and internal state are synced
        updateRatingDisplay(rating);
        
        // Fetch and display the user's saved games
        setTimeout(fetchAndDisplayGames, 100);
    };

    // Preferred time control helpers
    function resolvePreferredTime(serverData) {
        // Priority: server-provided preferredTime or preferred_time, then localStorage history, then default '10 min'
        const serverPref = serverData && (serverData.preferredTime || serverData.preferred_time || serverData.preferredTimeControl);
        if (serverPref) return String(serverPref);
        const local = getPreferredFromHistory();
        if (local) return local;
        return '10 min';
    }

    function getPreferredFromHistory() {
        try {
            const raw = localStorage.getItem('playedTimeControls');
            if (!raw) return null;
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr) || arr.length === 0) return null;
            // compute most frequent
            const freq = {};
            arr.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
            let best = null; let bestCount = 0;
            Object.keys(freq).forEach(k => {
                if (freq[k] > bestCount) { best = k; bestCount = freq[k]; }
            });
            return best;
        } catch (e) {
            return null;
        }
    }

    // Call this after a finished match to record the time control used (e.g., '10 min', '5 min')
    function recordMatchTimeControl(timeControl) {
        try {
            const key = 'playedTimeControls';
            const raw = localStorage.getItem(key);
            const arr = raw ? JSON.parse(raw) : [];
            arr.push(String(timeControl));
            // keep last 50
            const trimmed = arr.slice(-50);
            localStorage.setItem(key, JSON.stringify(trimmed));
            // update UI if present
            const preferredTile = document.querySelector('.tile.preferred-time');
            const preferredLabelEl = preferredTile ? preferredTile.querySelector('.preferred-label') : null;
            const timeLabelEl = preferredTile ? preferredTile.querySelector('.time-label') : null;
            const newPref = getPreferredFromHistory() || '10 min';
            if (timeLabelEl) timeLabelEl.textContent = `Play ${newPref}`;
            if (preferredLabelEl) preferredLabelEl.textContent = (newPref === '10 min') ? 'Default time control' : 'Your preferred time control';
        } catch (e) {
            console.error('recordMatchTimeControl error', e);
        }
    }

    // Expose recorder for other scripts (safe, no ability to override internal vars)
    window.recordMatchTimeControl = recordMatchTimeControl;

    const showStatus = (msg, type='info') => {
        // Prefer a stable placeholder element if present
        const placeholder = document.getElementById('status-placeholder');
        if (placeholder) {
            placeholder.className = `status-message ${type}`;
            placeholder.textContent = msg;
            return;
        }

        // Fallback: create a transient status element (older behavior)
        let statusDiv = document.getElementById('status-message');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'status-message';
            const contentEl = document.querySelector('.content');
            try {
                if (contentEl && userWelcome && contentEl.contains(userWelcome)) {
                    contentEl.insertBefore(statusDiv, userWelcome);
                } else if (contentEl) {
                    contentEl.appendChild(statusDiv);
                } else {
                    document.body.appendChild(statusDiv);
                }
            } catch (e) {
                document.body.appendChild(statusDiv);
            }
        }
        statusDiv.className = `status-message ${type}`;
        statusDiv.textContent = msg;
    };

    const maxAttempts = 3;
    let attempts = 0;

    // Helper to update rating UI + status + stars
    function updateRatingDisplay(newRating) {
        currentRating = Number(newRating) || 0;
        const ratingEl = document.getElementById('rating-value');
        if (ratingEl) ratingEl.textContent = currentRating.toString();

        // Update sidebar status text
        const sidebarStatus = document.getElementById('sidebar-status');
        if (sidebarStatus) {
            let statusText = 'New to Chess';
            if (currentRating <= 800) statusText = 'New to Chess';
            else if (currentRating <= 1200) statusText = 'Beginner';
            else if (currentRating <= 1500) statusText = 'Intermediate';
            else if (currentRating <= 2000) statusText = 'Advance';
            else statusText = 'Expert';
            sidebarStatus.textContent = statusText;
        }

        // Update stars (reuse thresholds from renderUser)
        const sidebarStars = document.getElementById('sidebar-stars');
        if (sidebarStars) {
            const stars = Array.from(sidebarStars.querySelectorAll('.star'));
            if (currentRating > STAR_THRESHOLDS[0]) {
                sidebarStars.classList.remove('hidden');
                stars.forEach((el,i) => {
                    const threshold = STAR_THRESHOLDS[i] || 99999;
                    const fill = (currentRating > threshold) ? 100 : 0;
                    el.style.setProperty('--fill', fill + '%');
                });
            } else {
                sidebarStars.classList.add('hidden');
                stars.forEach(el => el.style.setProperty('--fill', '0%'));
            }
        }
    }

    const tryWhoami = () => {
        attempts++;
        showStatus(`Checking session (attempt ${attempts}/${maxAttempts})...`, 'info');
        console.log('home.js whoami attempt', attempts);
        fetch('/whoami')
            .then(r => r.json())
            .then(d => {
                if (d && d.email) {
                    showStatus('', 'success');
                    renderUser(d);
                    return;
                }
                if (attempts < maxAttempts) {
                    const delay = Math.pow(2, attempts - 1) * 1000; // 1s,2s,4s
                    setTimeout(tryWhoami, delay);
                } else {
                    showStatus('Not logged in — redirecting to login...', 'error');
                    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
                }
            })
            .catch(err => {
                console.error('whoami error', err);
                if (attempts < maxAttempts) {
                    const delay = Math.pow(2, attempts - 1) * 1000;
                    setTimeout(tryWhoami, delay);
                } else {
                    showStatus('Unable to verify session. Redirecting to login...', 'error');
                    setTimeout(() => { window.location.href = '/login.html'; }, 1200);
                }
            });
    };

    // escape helper
    function escapeHtml(str){
        return String(str).replace(/[&<>\"]/g, s=>({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
        }[s]));
    }

    // Handle logout - redirect back to current page when possible
    const logoutLink = document.querySelector('.nav-item.logout');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Release guest account if active
            if(window.GuestPool) GuestPool.releaseCurrentAndClear();
            const returnTo = window.location.pathname || '/index.html';
            window.location.href = '/logout?returnTo=' + encodeURIComponent(returnTo);
        });
    }

    // Top-right logout button (if present)
    const topLogout = document.getElementById('top-logout');
    if (topLogout) {
        topLogout.addEventListener('click', (e) => {
            e.preventDefault();
            // Release guest account if active
            if(window.GuestPool) GuestPool.releaseCurrentAndClear();
            const returnTo = window.location.pathname || '/index.html';
            window.location.href = '/logout?returnTo=' + encodeURIComponent(returnTo);
        });
    }

    // Theme toggle (Dark <-> Light)
    const themeToggle = document.getElementById('theme-toggle');
    function applyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'light') html.classList.add('light-ui');
        else html.classList.remove('light-ui');
        // Update toggle label to indicate the action (switch to opposite)
        const label = theme === 'light' ? 'Dark UI' : 'Light UI';
        if (themeToggle) themeToggle.innerHTML = `<i class="fas fa-adjust"></i> ${label}`;
        if (themeToggle) themeToggle.setAttribute('aria-pressed', theme === 'light');
    }

    // Initialize theme from localStorage (default dark)
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const current = document.documentElement.classList.contains('light-ui') ? 'light' : 'dark';
            const next = current === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', next);
            applyTheme(next);
        });
    }

    // Sidebar collapse/expand
    const sidebarEl = document.querySelector('.sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse');
    function applySidebarCollapsed(collapsed) {
        if (!sidebarEl) return;
        if (collapsed) sidebarEl.classList.add('collapsed');
        else sidebarEl.classList.remove('collapsed');
        // change icon
        if (collapseBtn) {
            const icon = collapseBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-compress', 'fa-expand');
                icon.classList.add(collapsed ? 'fa-expand' : 'fa-compress');
            }
            collapseBtn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        }
    }

    // initialize from localStorage
    const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    applySidebarCollapsed(savedCollapsed);

    if (collapseBtn) {
        collapseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isCollapsed = sidebarEl && sidebarEl.classList.contains('collapsed');
            const next = !isCollapsed;
            localStorage.setItem('sidebarCollapsed', String(next));
            applySidebarCollapsed(next);
        });
    }

    // ── Fetch and display user's saved games ──
    const fetchAndDisplayGames = () => {
    fetch('/api/list-games')
        .then(res => {
            if (!res.ok) {
                // Server returned 401/403/500 etc — don't parse as JSON
                console.warn(`⚠️ Games API returned ${res.status} — user may not be logged in.`);
                return null;
            }
            return res.json();
        })
        .then(games => {
            if (!games) {
                // Auth failed or no data — hide section, show zeros
                const section = document.getElementById('games-list-section');
                if (section) section.style.display = 'none';
                const gamesPlayedStat = document.getElementById('games-played');
                const winRateStat = document.getElementById('win-rate');
                if (gamesPlayedStat) gamesPlayedStat.textContent = '0';
                if (winRateStat) winRateStat.textContent = '—';
                return;
            }

            const list = document.getElementById('games-list');
            const section = document.getElementById('games-list-section');
            const gamesPlayedStat = document.getElementById('games-played');
            const winRateStat = document.getElementById('win-rate');

            if (!list || !section) return;

            if (!Array.isArray(games) || games.length === 0) {
                section.style.display = 'none';
                if (gamesPlayedStat) gamesPlayedStat.textContent = '0';
                if (winRateStat) winRateStat.textContent = '0%';
                return;
            }

            // Separate online and bot games
            const onlineGames = games.filter(g => g.type === 'online');
            const botGames    = games.filter(g => g.type === 'bot');

            // Sort all games by date descending
            const allGames = [...games].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

            section.style.display = '';
            list.innerHTML = allGames.map(g => {
                const gameType     = g.type === 'bot' ? '🤖 Bot' : '🌐 Online';
                const opponentName = g.opponent || (g.players && Array.isArray(g.players)
                    ? g.players.join(' vs ')
                    : (g.players || 'N/A'));
                return `
                    <div class="game-entry ${g.type}">
                        <div><b>Date:</b> ${g.date ? new Date(g.date).toLocaleString() : 'Unknown'}</div>
                        <div><b>Type:</b> ${gameType}</div>
                        <div><b>Opponent:</b> ${opponentName}</div>
                        <div><b>Result:</b> <span style="color: ${
                            g.result === 'Win'  ? '#22b14c' :
                            g.result === 'Loss' ? '#ff6b6b' : '#fbbf24'
                        }">${g.result || 'N/A'}</span></div>
                        ${g.type === 'online' ? `<a class="review-link" href="#" data-game-id="${g.id}">Review</a>` : ''}
                    </div>
                `;
            }).join('');

            // Total games played
            if (gamesPlayedStat) gamesPlayedStat.textContent = String(games.length);

            // Win rate — online games only
            if (onlineGames.length > 0) {
                const onlineWins    = onlineGames.filter(g => g.result === 'Win').length;
                const onlineWinRate = Math.round((onlineWins / onlineGames.length) * 100);
                if (winRateStat) winRateStat.textContent = `${onlineWinRate}%`;
                console.log(`📊 Total: ${games.length} | Online: ${onlineGames.length} | Bots: ${botGames.length} | Win Rate: ${onlineWinRate}%`);
            } else {
                if (winRateStat) winRateStat.textContent = '—';
                console.log(`📊 Total: ${games.length} | Online: 0 | Bots: ${botGames.length} | Win Rate: N/A`);
            }
        })
        .catch(err => {
            // Network error or JSON parse failure
            console.warn('Games could not be loaded:', err.message);
            const section = document.getElementById('games-list-section');
            if (section) section.style.display = 'none';
            const gamesPlayedStat = document.getElementById('games-played');
            const winRateStat     = document.getElementById('win-rate');
            if (gamesPlayedStat) gamesPlayedStat.textContent = '0';
            if (winRateStat)     winRateStat.textContent = '—';
        });
};

    // Check if guest account is active; if so, load profile directly
    setTimeout(() => {
        if(window.GuestPool && GuestPool.isGuest()) {
            try {
                const profile = JSON.parse(localStorage.getItem('userProfile') || 'null');
                if(profile && profile.guest) {
                    renderUser(profile);
                    fetchAndDisplayGames();
                    return;
                }
            } catch(e) {}
        }
        // If not guest, check regular server session
        tryWhoami();
        }, 300);
    
    // Expose game fetcher to be called after games are saved
    window.fetchAndDisplayGames = fetchAndDisplayGames;
});
