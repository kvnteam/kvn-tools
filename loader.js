(async()=>{

  // --- Firebase SDK via CDN ---
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

  // --- Helpers ---
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const create = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for(const k in attrs){
      if(k === "style") Object.assign(el.style, attrs[k]);
      else if(k.startsWith("on") && typeof attrs[k] === "function") el.addEventListener(k.substring(2), attrs[k]);
      else if(k === "className") el.className = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    children.forEach(c => {
      if(typeof c === "string") el.appendChild(document.createTextNode(c));
      else if(c) el.appendChild(c);
    });
    return el;
  };

  // --- Session management ---
  function generateSessionId(){ return 'sess-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now(); }
  let sessionId = localStorage.getItem('kvnSessionId');
  if(!sessionId){ sessionId = generateSessionId(); localStorage.setItem('kvnSessionId', sessionId); }

  async function checkBan(id){ const snap = await db.ref(`bans/${id}`).once('value'); return snap.exists() ? snap.val() : null; }
  async function checkAccessCode(code){ const snap = await db.ref(`accessCodes/${code}`).once('value'); return snap.exists() ? snap.val() : null; }
  async function checkPluginCode(code){ const snap = await db.ref(`plugins/${code}`).once('value'); return snap.exists() ? snap.val() : null; }

  // --- Style and UI ---
  const styleTag = create('style', {}, `
    @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Text&display=swap');
    *{box-sizing:border-box;}
    body,html{margin:0;padding:0;overflow:hidden;font-family:'SF Pro Text',sans-serif;background:#121212;color:#eee;}
    #kvn-window {
      position: fixed; top: 10vh; left: 50%; transform: translateX(-50%);
      width: 600px; max-width: 90vw; height: 400px;
      background: #1e1e1e; border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.25);
      display: flex; flex-direction: column;
      color: #e0e0e0; user-select: none;
      animation: fadeInScale 0.3s ease forwards;
      z-index: 999999999;
    }
    @keyframes fadeInScale {
      0%{opacity:0; transform: translateX(-50%) scale(0.85);}
      100%{opacity:1; transform: translateX(-50%) scale(1);}
    }
    #kvn-window-header {
      height: 28px; background: #1e1e1e; border-bottom: 1px solid #555;
      display: flex; align-items: center; padding: 0 10px; cursor: grab;
    }
    #kvn-window-header .btn {
      width: 12px; height: 12px; border-radius: 50%;
      margin-right: 8px; flex-shrink: 0; cursor: pointer;
    }
    #btn-close { background: #ff5f56; }
    #btn-min, #btn-max { opacity:0.3; cursor:not-allowed; }
    #kvn-tabs { display: flex; border-bottom: 1px solid #555; background: #1e1e1e; }
    #kvn-tabs button {
      flex: 1; padding: 10px 0; background: transparent;
      border: none; color: #e0e0e0; cursor: pointer;
      font-weight: 600; transition: background 0.2s;
    }
    #kvn-tabs button:hover:not(.active) {
      background: #333;
    }
    #kvn-tabs button.active {
      border-bottom: 2px solid #5865F2; background: #2c2c2c;
    }
    #kvn-content {
      flex: 1; overflow-y: auto; padding: 15px; background: #1e1e1e;
    }
    input, button, textarea {
      font-family: inherit; font-size: 14px;
    }
    input[type="text"], textarea {
      width: 100%; padding: 8px 10px; margin: 8px 0;
      border-radius: 6px; border: 1px solid #555;
      background: #1e1e1e; color: #e0e0e0; outline: none;
    }
    button {
      background: #5865F2; color: white; border: none;
      padding: 10px 16px; border-radius: 6px; cursor: pointer;
    }
    button:hover { background: #4752c4; }
    .locked { color: #ff4c4c; }
  `);
  document.head.appendChild(styleTag);

  // --- Main Window ---
  const root = create('div', {id: 'kvn-window'});
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

  // --- Tab Switching ---
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
  document.getElementById('btn-close').onclick = () => { root.remove(); };

  // --- Session & Access ---
  let accessCode = localStorage.getItem('kvnAccessCode') || "";
  let accessLevel = "none"; // "none", "free", "premium"
  // Plugins unlocked is now handled below

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

  // --- Ban Screen ---
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

  // --- 20 Tools Data & Logic ---
  const tools = [
    { id: 'clipboardLogger', name: 'Clipboard Logger', desc: 'Basic clipboard history', premium:false },
    { id: 'linkVault', name: 'Link Vault', desc: 'Save links across tabs', premium:false },
    { id: 'secureNotes', name: 'Secure Notes', desc: 'Simple locked notepad', premium:false },
    { id: 'dnsCloak', name: 'DNS Cloak', desc: 'Hide DNS activity', premium:true },
    { id: 'macroTyper', name: 'Macro Typer', desc: 'Type stored responses', premium:true },
    { id: 'autoClicker', name: 'Auto Clicker', desc: 'Automate clicks', premium:true },
    { id: 'colorPicker', name: 'Color Picker', desc: 'Pick and save colors', premium:false },
    { id: 'pageReloader', name: 'Page Reloader', desc: 'Reload pages at intervals', premium:false },
    { id: 'tabManager', name: 'Tab Manager', desc: 'Manage open tabs', premium:true },
    { id: 'cookieEditor', name: 'Cookie Editor', desc: 'Edit browser cookies', premium:true },
    { id: 'networkSniffer', name: 'Network Sniffer', desc: 'Monitor network requests', premium:true },
    { id: 'screenRecorder', name: 'Screen Recorder', desc: 'Record screen', premium:true },
    { id: 'vpnToggle', name: 'VPN Toggle', desc: 'Toggle VPN connections', premium:true },
    { id: 'passwordGenerator', name: 'Password Generator', desc: 'Generate strong passwords', premium:false },
    { id: 'taskScheduler', name: 'Task Scheduler', desc: 'Schedule tasks & reminders', premium:false },
    { id: 'adBlocker', name: 'Ad Blocker', desc: 'Block ads on pages', premium:true },
    { id: 'darkMode', name: 'Dark Mode', desc: 'Force dark mode on sites', premium:false },
    { id: 'proxySwitcher', name: 'Proxy Switcher', desc: 'Switch proxies', premium:true },
    { id: 'vpnDetector', name: 'VPN Detector', desc: 'Detect VPN usage', premium:true },
    { id: 'cookieCleaner', name: 'Cookie Cleaner', desc: 'Clean cookies', premium:false },
  ];

  const toolStates = {};

  // Render tools UI with buttons
  function renderToolsUI(){
    const div = root.querySelector('[data-content="tools"]');
    div.innerHTML = '';
    div.append(create('h2', {}, 'Tools'));

    tools.forEach(t=>{
      const locked = t.premium && accessLevel !== "premium";
      const card = create('div', {
        style: {
          marginBottom: '10px',
          padding: '10px',
          background: locked ? '#3a1f1f' : '#2c2c2c',
          borderRadius: '6px',
          cursor: locked ? 'not-allowed' : 'pointer',
          userSelect: 'none'
        },
        onClick: () => {
          if(locked) return alert('🔒 Premium feature. Upgrade to access.');
          launchTool(t.id);
        }
      },
      create('h3', {}, t.name),
      create('p', {}, t.desc),
      locked ? create('p', {className:'locked'}, '🔒 Premium') : ''
      );
      div.appendChild(card);
    });

    const resetBtn = create('button', {style:{marginTop:'10px'}}, '🗑️ Reset Session & History');
    resetBtn.onclick = () => {
      if(confirm('Reset session data and access code?')){
        localStorage.removeItem('kvnAccessCode');
        localStorage.removeItem('kvnSessionId');
        location.reload();
      }
    };
    div.append(resetBtn);
  }

  // Main tool launcher — simple demo logic per tool
  function launchTool(toolId){
    const toolsDiv = root.querySelector('[data-content="tools"]');
    toolsDiv.innerHTML = '';
    toolsDiv.append(create('h2', {}, `Tool: ${toolId}`));
    const output = create('pre', {style:{whiteSpace:'pre-wrap', height:'300px', overflowY:'auto', background:'#111', padding:'10px', borderRadius:'6px'}});
    toolsDiv.append(output);

    switch(toolId){
      case 'clipboardLogger':
        startClipboardLogger(output);
        break;
      case 'linkVault':
        startLinkVault(output);
        break;
      case 'secureNotes':
        startSecureNotes(output);
        break;
      case 'dnsCloak':
        startDnsCloak(output);
        break;
      case 'macroTyper':
        startMacroTyper(output);
        break;
      // Add stubs for all others...
      default:
        output.textContent = 'Tool not implemented yet.';
    }
  }

  // --- Tool implementations (basic stubs) ---
  // 1) Clipboard Logger
  function startClipboardLogger(output){
    output.textContent = 'Listening for clipboard changes...\n';
    if(!navigator.clipboard){
      output.textContent += 'Clipboard API not supported in this browser.';
      return;
    }
    navigator.clipboard.readText().then(text=>{
      output.textContent += `Current clipboard: ${text}\n`;
    });
    document.addEventListener('copy', async e => {
      const clip = await navigator.clipboard.readText();
      output.textContent += `Copied: ${clip}\n`;
    });
  }

  // 2) Link Vault
  function startLinkVault(output){
    output.textContent = 'Storing links you enter...\n';
    let links = JSON.parse(localStorage.getItem('kvnLinkVault')||'[]');
    function showLinks(){
      output.textContent = 'Saved links:\n' + links.join('\n');
    }
    showLinks();
    const input = prompt('Enter a link to save:');
    if(input){
      links.push(input);
      localStorage.setItem('kvnLinkVault', JSON.stringify(links));
      output.textContent += `\nAdded link: ${input}\n`;
      showLinks();
    }
  }

  // 3) Secure Notes
  function startSecureNotes(output){
    let notes = localStorage.getItem('kvnSecureNotes') || '';
    let newNotes = prompt('Enter your notes:', notes);
    if(newNotes !== null){
      localStorage.setItem('kvnSecureNotes', newNotes);
      output.textContent = 'Notes saved.';
    } else {
      output.textContent = 'No changes made.';
    }
  }

  // 4) DNS Cloak (stub)
  function startDnsCloak(output){
    output.textContent = 'DNS Cloak activated (stub - requires system level privileges).';
  }

  // 5) Macro Typer
  function startMacroTyper(output){
    let macro = prompt('Enter text to auto-type:');
    if(!macro){
      output.textContent = 'No macro set.';
      return;
    }
    output.textContent = `Macro set: "${macro}"\nPress Ctrl+M to type it into focused input.`;
    function typeMacro(e){
      if(e.ctrlKey && e.key.toLowerCase() === 'm'){
        e.preventDefault();
        const active = document.activeElement;
        if(active && ['INPUT','TEXTAREA'].includes(active.tagName)){
          active.value += macro;
          output.textContent += `\nTyped macro into ${active.tagName}`;
        } else {
          output.textContent += '\nFocus an input or textarea to type macro.';
        }
      }
    }
    document.addEventListener('keydown', typeMacro);
    toolStates['macroTyperListener'] = typeMacro;
  }

  // --- GoGuardian Screenshot Blocker ---
  function startGoGuardianBlocker(){
    const blocker = create('div', {
      style: {
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: '#000',
        opacity: '0.01',
        pointerEvents: 'none',
        zIndex: 9999999999,
        mixBlendMode: 'multiply',
        transition: 'opacity 0.2s ease'
      }
    });
    document.body.appendChild(blocker);

    let visible = false;
    setInterval(() => {
      visible = !visible;
      blocker.style.opacity = visible ? '0.05' : '0.01';
    }, 2300);
  }
  startGoGuardianBlocker();

  // --- Plugins UI ---
  const pluginsUnlocked = {};

  async function checkPluginCode(code){
    const snap = await db.ref(`plugins/${code}`).once('value');
    return snap.exists() ? snap.val() : null;
  }

  function renderPluginsUI(){
    const div = root.querySelector('[data-content="plugins"]');
    div.innerHTML = '';

    const heading = create('h2', {}, 'Plugins');
    const input = create('input', {type:'text', placeholder:'Enter plugin code'});
    const btn = create('button', {}, 'Unlock Plugin');
    const msg = create('div', {className:'message'});

    btn.onclick = async () => {
      const code = input.value.trim();
      if(!code){
        msg.textContent = 'Please enter a plugin code.';
        return;
      }
      const data = await checkPluginCode(code);
      if(!data){
        msg.textContent = 'Invalid plugin code.';
        return;
      }
      pluginsUnlocked[code] = data;
      msg.textContent = `✅ Plugin "${data.name}" unlocked.`;
      input.value = '';
      renderPluginsUI();
    };

    div.append(heading, input, btn, msg);

    if(Object.keys(pluginsUnlocked).length > 0){
      const list = create('ul');
      for(const [code,data] of Object.entries(pluginsUnlocked)){
        list.append(create('li', {}, `${data.name} (${code})`));
      }
      div.append(create('h3', {}, 'Unlocked Plugins:'), list);
    }
  }

  // --- Settings UI ---
  function addResetHistory(settingsDiv) {
    const resetBtn = create('button', { style: { marginTop: '20px', background: '#ff5f56' } }, 'Reset All History');
    resetBtn.onclick = () => {
      if (confirm("Reset all session data and access codes?")) {
        localStorage.clear();
        location.reload();
      }
    };
    settingsDiv.appendChild(resetBtn);
  }

  function renderSettingsUI(){
    const div = root.querySelector('[data-content="settings"]');
    div.innerHTML = '';

    const heading = create('h2', {}, 'Settings');

    // Theme toggle
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
    themeLabel.prepend(themeToggle);

    div.append(heading, themeLabel);
    addResetHistory(div);
  }

  // --- Main Init ---
  async function main(){
    const banData = await checkBan(sessionId);
    if(banData){
      await showBanScreen(banData);
      return;
    }

    if(accessCode){
      const codeData = await checkAccessCode(accessCode);
      if(codeData) accessLevel = codeData.type || "free";
      else {
        accessLevel = "none";
        localStorage.removeItem('kvnAccessCode');
      }
    }

    await sendSessionToDiscord(sessionId, navigator.userAgent, accessCode);
    await updateSession();
    setInterval(updateSession, 2*60*1000);

    if(accessLevel === "none") renderAccessCodeUI();
    else renderToolsUI();

    renderPluginsUI();
    renderSettingsUI();
  }

  await main();

  window.renderToolsUI = renderToolsUI;
  window.renderPluginsUI = renderPluginsUI;
  window.renderSettingsUI = renderSettingsUI;

})();
