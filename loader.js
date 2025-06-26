(async()=>{
  // -- Firebase SDK via CDN (load dynamically) --
  if(!window.firebase){
    await new Promise(res=>{
      const f=document.createElement('script');
      f.src='https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
      f.onload=()=>{
        const db=document.createElement('script');
        db.src='https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
        db.onload=res;
        document.head.appendChild(db);
      }
      document.head.appendChild(f);
    });
  }

  // -------- CONFIGURATION --------
  const firebaseConfig = {
    apiKey: "AIzaSyCXwHrbRRYwcpecxOjOOczmzm78Im4m4Pc",
    authDomain: "kvn-tools.firebaseapp.com",
    databaseURL: "https://kvn-tools-default-rtdb.firebaseio.com",
    projectId: "kvn-tools",
    storageBucket: "kvn-tools.firebasestorage.app",
    messagingSenderId: "790872924728",
    appId: "1:790872924728:web:8e2feab5882a3b717a7ccd"
  };
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1387577192564789309/pkPmG8DNjABABhyBEJUfYBMqhwy2afSgCvEdu5Kt4yHgA5R9rIWDqgcMbfgA4M5JDLlz";

  if(!firebase.apps.length){
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.database();

  // Reset ALL local storage to create fresh session
  localStorage.removeItem("kvnAccessCode");
  localStorage.removeItem("kvnSessionId");

  // Generate unique ID and random code
  const generateSessionId = () => 'sess-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
  const generateAccessCode = () => 'kvn-' + Math.random().toString(36).substring(2, 7);

  let sessionId = generateSessionId();
  let accessCode = generateAccessCode();

  localStorage.setItem("kvnSessionId", sessionId);
  localStorage.setItem("kvnAccessCode", accessCode);

  await db.ref(`accessCodes/${accessCode}`).set({ type: "free" });

  // Save session info to Firebase
  await db.ref(`sessions/${sessionId}`).set({
    accessCode,
    userAgent: navigator.userAgent,
    lastActive: Date.now()
  });

  // Webhook alert
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "KVN Tools",
        embeds: [{
          title: "New Session Started",
          color: 3447003,
          fields: [
            { name: "Access Code", value: accessCode, inline: true },
            { name: "Session ID", value: sessionId, inline: true },
            { name: "User Agent", value: navigator.userAgent, inline: false },
            { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
          ]
        }]
      })
    });
  } catch(e){
    console.warn("Webhook failed", e);
  }

  // --- Utilities ---
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const create = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for(const k in attrs){
      if(k === "style"){
        Object.assign(el.style, attrs[k]);
      } else if(k.startsWith("on") && typeof attrs[k] === "function"){
        el.addEventListener(k.substring(2), attrs[k]);
      } else if(k === "className"){
        el.className = attrs[k];
      } else {
        el.setAttribute(k, attrs[k]);
      }
    }
    children.forEach(c => {
      if(typeof c === "string") el.appendChild(document.createTextNode(c));
      else if(c) el.appendChild(c);
    });
    return el;
  };

  // Plugin code check
  async function checkPluginCode(code){
    const snap = await db.ref(`plugins/${code}`).once('value');
    return snap.exists() ? snap.val() : null;
  }

  // Access code check
  async function checkAccessCode(code){
    const snap = await db.ref(`accessCodes/${code}`).once('value');
    return snap.exists() ? snap.val() : null;
  }

  // Ban check
  async function checkBan(sessionId){
    const snap = await db.ref(`bans/${sessionId}`).once('value');
    return snap.exists() ? snap.val() : null;
  }

  // --- Style & UI Setup ---
  const styleTag = create('style', {}, `
    @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Text&display=swap');
    *{box-sizing:border-box;}
    body,html{margin:0;padding:0;overflow:hidden;font-family:'SF Pro Text',sans-serif;}
    #kvn-window {
      position: fixed; top: 10vh; left: 50%; transform: translateX(-50%);
      width: 600px; max-width: 90vw; height: 400px;
      background: var(--bg); border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.25);
      display: flex; flex-direction: column;
      color: var(--text); user-select: none;
      animation: fadeInScale 0.3s ease forwards;
      z-index: 999999999;
    }
    :root {
      --bg: #1e1e1e; --text: #e0e0e0;
      --btn-close: #ff5f56; --btn-min: #ffbd2e; --btn-max: #27c93f;
      --tab-active-bg: #2c2c2c; --tab-inactive-bg: transparent;
      --tab-hover-bg: #333;
    }
    [data-theme="light"] {
      --bg: #f9f9f9; --text: #111;
      --tab-active-bg: #ddd; --tab-hover-bg: #eee;
    }
    @keyframes fadeInScale {
      0%{opacity:0; transform: translateX(-50%) scale(0.85);}
      100%{opacity:1; transform: translateX(-50%) scale(1);}
    }
    #kvn-window-header {
      height: 28px; background: var(--bg); border-bottom: 1px solid #555;
      display: flex; align-items: center; padding: 0 10px; cursor: grab;
    }
    #kvn-window-header .btn {
      width: 12px; height: 12px; border-radius: 50%;
      margin-right: 8px; flex-shrink: 0; cursor: pointer;
    }
    #btn-close { background: var(--btn-close); }
    #btn-min, #btn-max { opacity:0.3; cursor:not-allowed; }
    #kvn-tabs { display: flex; border-bottom: 1px solid #555; background: var(--bg); }
    #kvn-tabs button {
      flex: 1; padding: 10px 0; background: var(--tab-inactive-bg);
      border: none; color: var(--text); cursor: pointer;
      font-weight: 600; transition: background 0.2s;
    }
    #kvn-tabs button:hover:not(.active) {
      background: var(--tab-hover-bg);
    }
    #kvn-tabs button.active {
      border-bottom: 2px solid #5865F2; background: var(--tab-active-bg);
    }
    #kvn-content {
      flex: 1; overflow-y: auto; padding: 15px; background: var(--bg);
    }
    input, button, textarea {
      font-family: inherit; font-size: 14px;
    }
    input[type="text"], textarea {
      width: 100%; padding: 8px 10px; margin: 8px 0;
      border-radius: 6px; border: 1px solid #555;
      background: var(--bg); color: var(--text); outline: none;
    }
    button {
      background: #5865F2; color: white; border: none;
      padding: 10px 16px; border-radius: 6px; cursor: pointer;
    }
    button:hover { background: #4752c4; }
    .locked { color: #ff4c4c; }
  `);
  document.head.appendChild(styleTag);

  // Main Window
  const root = create('div', {id: 'kvn-window', 'data-theme': 'dark'});
  root.innerHTML = `
    <div id="kvn-window-header">
      <div id="btn-close" class="btn" title="Close"></div>
      <div id="btn-min" class="btn" title="Minimize"></div>
      <div id="btn-max" class="btn" title="Maximize"></div>
    </div>
    <div id="kvn-tabs">
      <button data-tab="tools" class="active">Tools</button>
      <button data-tab="plugins">Plugins</button>
      <button data-tab="settings">Settings</button>
    </div>
    <div id="kvn-content">
      <div data-content="tools"></div>
      <div data-content="plugins" style="display:none;"></div>
      <div data-content="settings" style="display:none;"></div>
    </div>
  `;
  document.body.appendChild(root);

  // Tab Switching
  const tabs = root.querySelectorAll('#kvn-tabs button');
  const contents = root.querySelectorAll('#kvn-content > div');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.style.display='none');
      tab.classList.add('active');
      root.querySelector(`[data-content="${tab.dataset.tab}"]`).style.display = 'block';
    };
  });

  // Close button
  document.getElementById('btn-close').onclick = () => {
    root.remove();
  };

  // --- State ---
  accessCode = localStorage.getItem('kvnAccessCode') || "";
  let accessLevel = "none"; // "none", "free", "premium"
  let pluginsUnlocked = {};

  // --- Session Tracking ---
  async function updateSession(){
    const userAgent = navigator.userAgent;
    await db.ref(`sessions/${sessionId}`).set({
      lastActive: Date.now(),
      userAgent,
      accessCode: accessCode || null
    });
  }

  async function sendSessionToDiscord(sessionId, userAgent, accessCode){
    const payload = {
      username: "KVN Tools Sessions",
      embeds: [{
        title: "Session Started",
        color: 3447003,
        fields: [
          { name: "Session ID", value: sessionId, inline: true },
          { name: "User Agent", value: userAgent, inline: false },
          { name: "Access Code", value: accessCode || "None", inline: true },
          { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
        ]
      }]
    };
    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch(e){
      console.warn("Webhook failed:", e);
    }
  }

  // --- Ban UI ---
  async function showBanScreen(banData){
    root.innerHTML = `
      <div style="padding: 30px; text-align:center; color:#ff4c4c;">
        <h1>Access Denied</h1>
        <p><strong>Reason:</strong> ${banData.reason || "Unknown"}</p>
        <a href="https://discord.gg/EY9WnVQ8DC" target="_blank" style="color:#5865F2;">Appeal on Discord</a>
      </div>
    `;
  }

  // --- Access UI ---
  function renderAccessCodeUI(){
    const div = root.querySelector('[data-content="tools"]');
    div.innerHTML = '';

    const input = create('input', {type:'text', placeholder:'Enter access code', value: accessCode});
    const btn = create('button', {}, 'Submit');
    const random = create('button', {style:{marginLeft:'10px'}}, '🎲 Generate');
    const message = create('div', {className:'message'});

    btn.onclick = async () => {
      const code = input.value.trim();
      const data = await checkAccessCode(code);
      if(!data){ message.textContent = "Invalid code."; return; }
      accessCode = code;
      accessLevel = data.type || "free";
      localStorage.setItem('kvnAccessCode', code);
      message.textContent = "✅ Access granted.";
      await updateSession();
      renderToolsUI();
    };

    random.onclick = () => {
      const gen = Math.random().toString(36).substring(2, 10).toUpperCase();
      input.value = gen;
    };

    div.append(create('h3', {}, 'Enter Access Code:'), input, btn, random, message);
  }

  // --- Tools UI ---
  function renderToolsUI(){
    const div = root.querySelector('[data-content="tools"]');
    div.innerHTML = '';

    const tools = [
      {name:'Clipboard Logger', desc:'Basic clipboard history', premium:false},
      {name:'Link Vault', desc:'Save links across tabs', premium:false},
      {name:'Secure Notes', desc:'Simple locked note pad', premium:false},
      {name:'DNS Cloak', desc:'Hide DNS activity', premium:true},
      {name:'Macro Typer', desc:'Type stored responses', premium:true},
    ];

    div.append(create('h2', {}, 'Tools'));

    tools.forEach(t=>{
      const locked = t.premium && accessLevel !== "premium";
      const card = create('div', {style:{marginBottom:'10px', padding:'10px', background:locked?'#3a1f1f':'#2c2c2c', borderRadius:'6px'}},
        create('h3', {}, t.name),
        create('p', {}, t.desc),
        locked ? create('p', {className:'locked'}, '🔒 Premium') : ''
      );
      div.appendChild(card);
    });

    // Reset option
    const resetBtn = create('button', {}, '🗑️ Reset Session & History');
    resetBtn.onclick = () => {
      localStorage.removeItem('kvnAccessCode');
      localStorage.removeItem('kvnSessionId');
      location.reload();
    };
    div.append(resetBtn);
  }

  // --- Plugins UI ---
  function renderPluginsUI(){
    const div = root.querySelector('[data-content="plugins"]');
    div.innerHTML = '';

    const input = create('input', {type:'text', placeholder:'Plugin code'});
    const btn = create('button', {}, 'Unlock');
    const msg = create('div', {className:'message'});

    btn.onclick = async () => {
      const code = input.value.trim();
      const data = await checkPluginCode(code);
      if(!data){ msg.textContent = "Invalid plugin."; return; }
      pluginsUnlocked[code] = data;
      msg.textContent = `✅ Plugin "${data.name}" unlocked.`;
      input.value = '';
      renderPluginsUI();
    };

    div.append(create('h2', {}, 'Plugins'), input, btn, msg);

    if(Object.keys(pluginsUnlocked).length){
      const list = create('ul');
      for(const [k,v] of Object.entries(pluginsUnlocked)){
        list.append(create('li', {}, `${v.name} (${k})`));
      }
      div.append(list);
    }
  }

  // --- Settings UI ---
  function renderSettingsUI(){
    const div = root.querySelector('[data-content="settings"]');
    div.innerHTML = '';

    const toggle = create('input', {type:'checkbox'});
    const label = create('label', {}, ' Toggle Dark/Light Theme');
    label.prepend(toggle);

    const saved = localStorage.getItem('kvnTheme') || 'dark';
    root.setAttribute('data-theme', saved);
    toggle.checked = saved === 'light';

    toggle.onchange = () => {
      const theme = toggle.checked ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      localStorage.setItem('kvnTheme', theme);
    };

    div.append(create('h2', {}, 'Settings'), label);
  }

  // --- Main Init ---
  async function main(){
    const userAgent = navigator.userAgent;
    const banData = await checkBan(sessionId);
    if(banData){ await showBanScreen(banData); return; }

    if(accessCode){
      const codeData = await checkAccessCode(accessCode);
      if(codeData){ accessLevel = codeData.type; }
      else { accessLevel = "none"; localStorage.removeItem('kvnAccessCode'); }
    }

    await sendSessionToDiscord(sessionId, userAgent, accessCode);
    await updateSession();
    setInterval(updateSession, 2 * 60 * 1000);

    if(accessLevel === "none") renderAccessCodeUI();
    else renderToolsUI();

    renderPluginsUI();
    renderSettingsUI();
  }

  // --- Dragging ---
  const header = document.getElementById('kvn-window-header');
  let isDragging = false, offsetX = 0, offsetY = 0;
  header.addEventListener('mousedown', e => {
    isDragging = true;
    offsetX = e.clientX - root.offsetLeft;
    offsetY = e.clientY - root.offsetTop;
    header.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    root.style.left = `${e.clientX - offsetX}px`;
    root.style.top = `${e.clientY - offsetY}px`;
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
    header.style.cursor = 'grab';
  });

  // ✅ GO
  await main();

})();
