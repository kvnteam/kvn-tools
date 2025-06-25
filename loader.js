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

  // -------- CONFIGURATION: FILL THESE IN! --------
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

  // Initialize Firebase
  if(!firebase.apps.length){
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.database();

  // Utilities
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

  // Generate or load sessionId
  function generateSessionId() {
    return 'sess-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
  }

  let sessionId = localStorage.getItem('kvnSessionId');
  if(!sessionId){
    sessionId = generateSessionId();
    localStorage.setItem('kvnSessionId', sessionId);
  }

  // Ban check
  async function checkBan(sessionId){
    const snap = await db.ref(`bans/${sessionId}`).once('value');
    return snap.exists() ? snap.val() : null;
  }

  // Access code check
  async function checkAccessCode(code){
    const snap = await db.ref(`accessCodes/${code}`).once('value');
    return snap.exists() ? snap.val() : null;
  }

  // Plugin code check
  async function checkPluginCode(code){
    const snap = await db.ref(`plugins/${code}`).once('value');
    return snap.exists() ? snap.val() : null;
  }

  // Send session info to Discord webhook
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
      console.warn("Failed to send webhook", e);
    }
  }

  // --- Style: macOS window + animations (dark/light mode toggle) ---
  const styleContent = `
  @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Text&display=swap');
  *{box-sizing:border-box;}
  body,html{margin:0;padding:0;overflow:hidden;font-family:'SF Pro Text',-apple-system, BlinkMacSystemFont, sans-serif;}
  #kvn-window {
    position: fixed;
    top: 10vh; left: 50%; transform: translateX(-50%);
    width: 600px; max-width: 90vw; height: 400px; background: var(--bg);
    border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.25);
    display: flex; flex-direction: column;
    color: var(--text);
    user-select: none;
    animation: fadeInScale 0.3s ease forwards;
    z-index: 999999999;
  }
  :root {
    --bg: #1e1e1e;
    --text: #e0e0e0;
    --btn-close: #ff5f56;
    --btn-min: #ffbd2e;
    --btn-max: #27c93f;
    --tab-active-bg: #2c2c2c;
    --tab-inactive-bg: transparent;
    --tab-hover-bg: #333;
  }
  [data-theme="light"] {
    --bg: #f9f9f9;
    --text: #111;
    --btn-close: #ff5f56;
    --btn-min: #ffbd2e;
    --btn-max: #27c93f;
    --tab-active-bg: #ddd;
    --tab-inactive-bg: transparent;
    --tab-hover-bg: #eee;
  }
  @keyframes fadeInScale {
    0%{opacity:0; transform: translateX(-50%) scale(0.85);}
    100%{opacity:1; transform: translateX(-50%) scale(1);}
  }
  #kvn-window-header {
    height: 28px; background: var(--bg); border-bottom: 1px solid #555;
    display: flex; align-items: center; padding: 0 10px;
    user-select:none;
    -webkit-app-region: drag;
  }
  #kvn-window-header .btn {
    width: 12px; height: 12px; border-radius: 50%;
    margin-right: 8px;
    flex-shrink: 0;
    cursor: pointer;
  }
  #btn-close { background: var(--btn-close); }
  #btn-min { background: var(--btn-min); }
  #btn-max { background: var(--btn-max); }
  #kvn-tabs {
    display: flex;
    border-bottom: 1px solid #555;
    background: var(--bg);
  }
  #kvn-tabs button {
    flex: 1;
    padding: 10px 0;
    background: var(--tab-inactive-bg);
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text);
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s, border-color 0.2s;
  }
  #kvn-tabs button:hover:not(.active) {
    background: var(--tab-hover-bg);
  }
  #kvn-tabs button.active {
    border-bottom: 2px solid #5865F2;
    background: var(--tab-active-bg);
  }
  #kvn-content {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    background: var(--bg);
  }
  input, button, textarea {
    font-family: inherit;
    font-size: 14px;
  }
  input[type="text"], input[type="password"], textarea {
    width: 100%;
    padding: 8px 10px;
    margin: 8px 0;
    border-radius: 6px;
    border: 1px solid #555;
    background: var(--bg);
    color: var(--text);
    outline: none;
  }
  button {
    background: #5865F2;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.3s ease;
  }
  button:hover {
    background: #4752c4;
  }
  .message {
    margin: 10px 0;
    font-weight: 600;
  }
  .locked {
    color: #ff4c4c;
  }
  `;

  const styleTag = create('style', {}, styleContent);
  document.head.appendChild(styleTag);

  // --- Window HTML ---
  const root = create('div', {id: 'kvn-window', 'data-theme': 'dark'});
  document.body.appendChild(root);

  root.innerHTML = `
    <div id="kvn-window-header">
      <div id="btn-close" class="btn" title="Close"></div>
      <div id="btn-min" class="btn" title="Minimize" style="opacity:0.3; cursor: not-allowed;"></div>
      <div id="btn-max" class="btn" title="Maximize" style="opacity:0.3; cursor: not-allowed;"></div>
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

  // Close button works
  document.getElementById('btn-close').onclick = () => {
    root.remove();
    window.kvnToolsLoaded = false;
  };

  // Disable min and max buttons
  // They have opacity 0.3 and no cursor pointer set already

  // Tab switching logic
  const tabs = root.querySelectorAll('#kvn-tabs button');
  const contents = root.querySelectorAll('#kvn-content > div');

  tabs.forEach(tab=>{
    tab.onclick = () => {
      tabs.forEach(t=>t.classList.remove('active'));
      contents.forEach(c=>c.style.display='none');
      tab.classList.add('active');
      root.querySelector(`[data-content="${tab.dataset.tab}"]`).style.display = 'block';
    }
  });

  // --- Application State ---
  let accessCode = localStorage.getItem('kvnAccessCode') || "";
  let accessLevel = "none"; // "free", "premium"
  let pluginsUnlocked = {};

  // --- Helper to update session data to Firebase ---
  async function updateSession(){
    const userAgent = navigator.userAgent;
    await db.ref(`sessions/${sessionId}`).set({
      lastActive: Date.now(),
      userAgent,
      accessCode: accessCode || null
    });
  }

  // --- Ban Screen ---
  async function showBanScreen(banData){
    root.innerHTML = `
      <div style="padding: 30px; text-align:center; color:#ff4c4c;">
        <h1>Access Denied</h1>
        <p>You have been banned from using KVN Tools.</p>
        <p><strong>Reason:</strong> ${banData.reason || "No reason provided"}</p>
        <p>If you believe this is a mistake, please join the Discord server:</p>
        <a href="https://discord.gg/EY9WnVQ8DC" target="_blank" style="color:#5865F2; text-decoration:none;">https://discord.gg/EY9WnVQ8DC</a>
      </div>
    `;
  }

  // --- Access Code Input UI ---
  function renderAccessCodeUI(){
    const toolsDiv = root.querySelector('[data-content="tools"]');
    toolsDiv.innerHTML = '';

    const info = create('p', {}, 'Enter your access code below:');
    const input = create('input', {type:'text', placeholder:'Enter access code', value: accessCode});
    const btn = create('button', {}, 'Submit');

    const message = create('div', {className:'message'});

    btn.onclick = async () => {
      const code = input.value.trim();
      if(!code){
        message.textContent = "Please enter a code.";
        return;
      }
      const codeData = await checkAccessCode(code);
      if(!codeData){
        message.textContent = "Invalid access code.";
        return;
      }
      accessCode = code;
      accessLevel = codeData.type || "free";
      localStorage.setItem('kvnAccessCode', code);
      message.textContent = `Access code accepted. Level: ${accessLevel}`;
      await updateSession();
      renderToolsUI();
    };

    toolsDiv.append(info, input, btn, message);

    if(accessCode){
      // Auto check if already logged in
      checkAccessCode(accessCode).then(codeData=>{
        if(codeData){
          accessLevel = codeData.type || "free";
          message.textContent = `Welcome back! Access level: ${accessLevel}`;
          renderToolsUI();
        } else {
          accessLevel = "none";
          localStorage.removeItem('kvnAccessCode');
          message.textContent = "Your saved code is invalid.";
        }
      });
    }
  }

  // --- Tools UI ---
  function renderToolsUI(){
    const toolsDiv = root.querySelector('[data-content="tools"]');
    toolsDiv.innerHTML = '';

    const heading = create('h2', {}, 'Available Tools');

    // Tool list with free and premium split
    // Free tools (always available)
    const freeTools = [
      {name:'Tabset Manager', desc:'Save and reopen tab groups'},
      {name:'Clipboard Logger', desc:'Limited recent clipboard items'},
      {name:'Link Vault', desc:'Save and organize links'},
      {name:'Secure Notes', desc:'One note page with basic lock'},
      {name:'Text Expander', desc:'Basic typing shortcuts'}
    ];

    // Premium tools (locked if accessLevel!="premium")
    const premiumTools = [
      {name:'Domain Redirector', desc:'Bypass blocked sites'},
      {name:'AltDNS Tunneler', desc:'Advanced DNS switching'},
      {name:'Site Cloak Engine', desc:'Disguised browsing'},
      {name:'Surveillance Watchdog', desc:'Detect monitoring'},
      {name:'Script Injector', desc:'Inject custom bypass scripts'},
      {name:'Autotype Macro Tool', desc:'Auto-type answers and macros'},
      {name:'Quick Close All', desc:'Emergency close risky tabs'},
      {name:'Network Bypass Finder', desc:'Find mirrors and proxies'},
      {name:'Tab Spoof Utility', desc:'Spoof tab info to appear safe'},
      {name:'Web Snapshot Tool', desc:'Save pages offline'},
      {name:'Offline Page Loader', desc:'Replay saved snapshots'},
      {name:'Quick Launch Bar', desc:'Create shortcut button bar'},
      {name:'Tab Lock Simulator', desc:'Freeze tab with test cover'},
      {name:'DNS Leak Test Utility', desc:'Check DNS leaks'},
      {name:'Form Auto-Completer (AI)', desc:'Smart form fills'},
      {name:'Text Feedback Generator', desc:'AI-generated replies'},
      {name:'Prompt Notebook', desc:'Save GPT prompts'},
      {name:'DOM Inspector+', desc:'Inspect/edit blocked sites'}
    ];

    toolsDiv.append(heading);

    const createToolCard = (tool, locked) => {
      const card = create('div', {style:{border:'1px solid #555', borderRadius:'8px', padding:'10px', margin:'8px 0', background:locked?'#3a1f1f':'#222'}});
      const title = create('h3', {}, tool.name);
      const desc = create('p', {}, tool.desc);
      card.append(title, desc);
      if(locked){
        const lockedLabel = create('p', {className:'locked'}, 'Locked - Premium only');
        card.append(lockedLabel);
      }
      return card;
    };

    freeTools.forEach(t => toolsDiv.append(createToolCard(t,false)));

    if(accessLevel === "premium"){
      premiumTools.forEach(t => toolsDiv.append(createToolCard(t,false)));
    } else {
      premiumTools.forEach(t => toolsDiv.append(createToolCard(t,true)));
    }

  }

  // --- Plugins UI ---
  function renderPluginsUI(){
    const pluginsDiv = root.querySelector('[data-content="plugins"]');
    pluginsDiv.innerHTML = '';

    const heading = create('h2', {}, 'Plugins');
    const info = create('p', {}, 'Enter a plugin code to unlock features:');
    const input = create('input', {type:'text', placeholder:'Enter plugin code'});
    const btn = create('button', {}, 'Unlock Plugin');
    const message = create('div', {className:'message'});

    btn.onclick = async () => {
      const code = input.value.trim();
      if(!code){
        message.textContent = 'Please enter a plugin code.';
        return;
      }
      if(pluginsUnlocked[code]){
        message.textContent = 'Plugin already unlocked.';
        return;
      }
      const pluginData = await checkPluginCode(code);
      if(!pluginData){
        message.textContent = 'Invalid plugin code.';
        return;
      }
      pluginsUnlocked[code] = pluginData;
      message.textContent = `Plugin "${pluginData.name}" unlocked!`;
      input.value = '';
      // Optionally trigger plugin feature activation here
    };

    pluginsDiv.append(heading, info, input, btn, message);

    if(Object.keys(pluginsUnlocked).length > 0){
      const ul = create('ul');
      for(const [code,data] of Object.entries(pluginsUnlocked)){
        const li = create('li', {}, `${data.name} (Code: ${code})`);
        ul.appendChild(li);
      }
      pluginsDiv.append(ul);
    }
  }

  // --- Settings UI ---
  function renderSettingsUI(){
    const settingsDiv = root.querySelector('[data-content="settings"]');
    settingsDiv.innerHTML = '';

    const heading = create('h2', {}, 'Settings');
    const themeLabel = create('label', {}, 'Toggle Dark/Light Theme: ');
    const themeToggle = create('input', {type:'checkbox'});
    const savedTheme = localStorage.getItem('kvnTheme') || 'dark';
    root.setAttribute('data-theme', savedTheme);
    themeToggle.checked = (savedTheme === 'light');

    themeToggle.onchange = () => {
      if(themeToggle.checked){
        root.setAttribute('data-theme', 'light');
        localStorage.setItem('kvnTheme', 'light');
      } else {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('kvnTheme', 'dark');
      }
    };

    themeLabel.appendChild(themeToggle);
    settingsDiv.append(heading, themeLabel);
  }

  // --- Main Init Flow ---

  async function main(){
    const userAgent = navigator.userAgent;

    // Check ban first
    const banData = await checkBan(sessionId);
    if(banData){
      await showBanScreen(banData);
      return;
    }

    // Check saved access code
    if(accessCode){
      const codeData = await checkAccessCode(accessCode);
      if(!codeData){
        accessCode = "";
        localStorage.removeItem('kvnAccessCode');
        accessLevel = "none";
      } else {
        accessLevel = codeData.type || "free";
      }
    }

    // Send session info to Discord webhook
    await sendSessionToDiscord(sessionId, userAgent, accessCode);

    // Update session heartbeat every 2 minutes
    setInterval(updateSession, 120000);
    await updateSession();

    // Render UI
    if(accessLevel === "none"){
      renderAccessCodeUI();
    } else {
      renderToolsUI();
    }
    renderPluginsUI();
    renderSettingsUI();
  }

  await main();

})();
