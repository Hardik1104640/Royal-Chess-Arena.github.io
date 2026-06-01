<<<<<<< HEAD
// guest-account.js — Shared guest account pool management
// Separates guest pool logic so it can be used across all pages

const GUEST_POOL_KEY = 'guestPool_v1';
=======
// guest-account.js - Shared guest account session management

>>>>>>> ff605ed (improvements)
const CURRENT_GUEST_KEY = 'currentGuest';
const USER_PROFILE_KEY = 'userProfile';

window.GuestPool = {
<<<<<<< HEAD
  generateGuests(startIndex, count){
    const arr = [];
    for(let i=0;i<count;i++) arr.push({name:`guest_${startIndex + i}`, occupied:false});
    return arr;
  },

  loadPool(){
    const raw = localStorage.getItem(GUEST_POOL_KEY);
    if(!raw) {
      const pool = this.generateGuests(1, 200); // initial 200 guests
      localStorage.setItem(GUEST_POOL_KEY, JSON.stringify(pool));
      return pool;
    }
    try{ return JSON.parse(raw) || []; } catch(e){ return []; }
  },

  savePool(pool){ 
    localStorage.setItem(GUEST_POOL_KEY, JSON.stringify(pool)); 
  },

  ensureMoreIfNeeded(){
    const pool = this.loadPool();
    const free = pool.filter(g=>!g.occupied).length;
    if(free < 100){
      const nextIndex = pool.length + 1;
      const more = this.generateGuests(nextIndex, 10000);
      pool.push(...more);
      this.savePool(pool);
    }
  },

  assign(){
    const pool = this.loadPool();
    let idx = pool.findIndex(g => !g.occupied);
    if(idx === -1){
      // create more and pick first
      const nextIndex = pool.length + 1;
      const more = this.generateGuests(nextIndex, 1000);
      pool.push(...more);
      idx = pool.findIndex(g => !g.occupied);
    }
    const guest = pool[idx];
    pool[idx].occupied = true;
    this.savePool(pool);
    // persist in session
    sessionStorage.setItem(CURRENT_GUEST_KEY, guest.name);
    // initialize guest-scoped data
    localStorage.setItem(`guestdata:${guest.name}`, JSON.stringify({created:Date.now()}));
    // store user profile
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify({username:guest.name, guest:true}));
    // replenish if needed
    this.ensureMoreIfNeeded();
    console.log('Assigned guest account:', guest.name);
    return guest.name;
=======
  async assign(){
    const response = await fetch('/guest-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : { message: 'Guest login route is not loaded yet. Please restart the server and refresh the page.' };

    if(!response.ok || !data.guestName) {
      throw new Error(data.message || 'Unable to continue as guest. Please try again.');
    }

    const guestName = data.guestName;
    sessionStorage.setItem(CURRENT_GUEST_KEY, guestName);
    localStorage.setItem(`guestdata:${guestName}`, JSON.stringify({created: Date.now()}));
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify({username: guestName, guest: true}));
    console.log('Assigned guest account:', guestName);
    return guestName;
>>>>>>> ff605ed (improvements)
  },

  release(guestName){
    if(!guestName) return;
<<<<<<< HEAD
    const pool = this.loadPool();
    const idx = pool.findIndex(g => g.name === guestName);
    if(idx !== -1){ 
      pool[idx].occupied = false; 
      this.savePool(pool); 
      console.log('Released guest account:', guestName);
    }
    // clear guest data keys
=======

>>>>>>> ff605ed (improvements)
    const prefix = `guestdata:${guestName}`;
    for(const k of Object.keys(localStorage)){
      if(k.startsWith(prefix)) localStorage.removeItem(k);
    }
<<<<<<< HEAD
    // clear current guest marker
=======

>>>>>>> ff605ed (improvements)
    if(sessionStorage.getItem(CURRENT_GUEST_KEY) === guestName) {
      sessionStorage.removeItem(CURRENT_GUEST_KEY);
    }
  },

  getCurrent(){
<<<<<<< HEAD
    // prefer session storage
    const s = sessionStorage.getItem(CURRENT_GUEST_KEY);
    if(s) return s;
    // fallback to profile
=======
    const s = sessionStorage.getItem(CURRENT_GUEST_KEY);
    if(s) return s;

>>>>>>> ff605ed (improvements)
    try{
      const p = JSON.parse(localStorage.getItem(USER_PROFILE_KEY) || 'null');
      if(p && p.guest && p.username) return p.username;
    }catch(e){}
<<<<<<< HEAD
=======

>>>>>>> ff605ed (improvements)
    return null;
  },

  isGuest(){
    const name = this.getCurrent();
<<<<<<< HEAD
    return name && name.startsWith('guest_');
=======
    return /^guest_\d+$/.test(name || '');
>>>>>>> ff605ed (improvements)
  },

  releaseCurrentAndClear(){
    const name = this.getCurrent();
    if(name){
      this.release(name);
      try{ localStorage.removeItem(USER_PROFILE_KEY); }catch(e){}
      console.log('Cleared guest profile:', name);
    }
  }
};
