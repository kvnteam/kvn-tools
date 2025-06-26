(async () => {
  // Load Firebase SDK
  if (!window.firebase) {
    await new Promise(res => {
      const f = document.createElement('script');
      f.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
      f.onload = () => {
        const db = document.createElement('script');
        db.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
        db.onload = res;
        document.head.appendChild(db);
      };
      document.head.appendChild(f);
    });
  }

  // Firebase config
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

  // Init Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.database();

  const sessionId = 'sess-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
  const accessCode = "kvn-free";
  localStorage.setItem("kvnSessionId", sessionId);
  localStorage.setItem("kvnAccessCode", accessCode);

  await db.ref(`sessions/${sessionId}`).set({
    accessCode,
    userAgent: navigator.userAgent,
    lastActive: Date.now()
  });

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "KVN Tools",
        embeds: [{
          title: "Session Started",
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
  } catch (e) {
    console.warn("Webhook failed", e);
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const create = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const k in attrs) {
      if (k === "style") Object.assign(el.style, attrs[k]);
      else if (k.startsWith("on") && typeof attrs[k] === "function") el.addEventListener(k.substring(2), attrs[k]);
      else if (k === "className") el.className = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    children.forEach(c => typeof c === "string" ? el.appendChild(document.createTextNode(c)) : c && el.appendChild(c));
    return el;
  };

  const styleTag = create('style', {}, `
    @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Text&display=swap');
    *{box-sizing:border-box;} html,body{margin:0;padding:0;overflow:hidden;font-family:'SF Pro Text',sans-serif;}
    #kvn-window{position:fixed;top:10vh;left:50%;transform:translateX(-50%);width:600px;max-width:90vw;height:400px;background:#1e1e1e;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,0.25);display:flex;flex-direction:column;color:#e0e0e0;z-index:9999999}
    #kvn-window-header{height:28px;background:#1e1e1e;border-bottom:1px solid #555;display:flex;align-items:center;padding:0 10px;cursor:grab;}
    #kvn-window-header .btn{width:12px;height:12px;border-radius:50%;margin-right:8px;flex-shrink:0;}
    #btn-close{background:#ff5f56;}
    #kvn-tabs{display:flex;border-bottom:1px solid #555;background:#1e1e1e}
    #kvn-tabs button{flex:1;padding:10px 0;background:none;border:none;color:#e0e0e0;cursor:pointer;font-weight:600}
    #kvn-tabs button.active{border-bottom:2px solid #5865F2;background:#2c2c2c}
    #kvn-content{flex:1;overflow:auto;padding:15px}
    button,input[type="text"]{font-family:inherit;font-size:14px;border-radius:6px;padding:8px 10px;margin:6px 0;}
    button{background:#5865F2;color:#fff;border:none;cursor:pointer}
    button:hover{background:#4752c4}
    .tool-card{background:#2c2c2c;padding:10px;margin-bottom:10px;border-radius:6px}
  `);
  document.head.appendChild(styleTag);

  const root = create('div', { id: 'kvn-window' }, `
    <div id="kvn-window-header">
      <div id="btn-close" class="btn" title="Close"></div>
    </div>
    <div id="kvn-tabs">
      <button data-tab="tools" class="active">Tools</button>
      <button data-tab="plugins">Plugins</button>
    </div>
    <div id="kvn-content">
      <div data-content="tools"></div>
      <div data-content="plugins" style="display:none;"></div>
    </div>
  `);
  document.body.appendChild(root);

  document.getElementById('btn-close').onclick = () => root.remove();

  // Tab logic
  const tabs = root.querySelectorAll('#kvn-tabs button');
  const contents = root.querySelectorAll('#kvn-content > div');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      root.querySelector(`[data-content="${tab.dataset.tab}"]`).style.display = 'block';
    };
  });

  // Tools logic
  const toolsList = [
    {
      name: "Clipboard Logger",
      desc: "Save and view your clipboard entries",
      action: () => alert("📋 Clipboard Logger not yet implemented.")
    },
    {
      name: "Secure Notes",
      desc: "Type and lock private notes",
      action: () => alert("📝 Secure Notes not yet implemented.")
    },
    {
      name: "Link Vault",
      desc: "Store links for quick access",
      action: () => alert("🔗 Link Vault not yet implemented.")
    }
  ];
  const renderToolsUI = () => {
    const div = root.querySelector('[data-content="tools"]');
    div.innerHTML = '<h2>All Tools</h2>';
    toolsList.forEach(t => {
      const card = create('div', { className: 'tool-card' },
        create('h3', {}, t.name),
        create('p', {}, t.desc),
        create('button', { onclick: t.action }, 'Launch')
      );
      div.appendChild(card);
    });
  };

  // Plugins
  const pluginsUnlocked = {};
  const checkPluginCode = async (code) => {
    const snap = await db.ref(`plugins/${code}`).once('value');
    return snap.exists() ? snap.val() : null;
  };
  const renderPluginsUI = () => {
    const div = root.querySelector('[data-content="plugins"]');
    div.innerHTML = '';
    const input = create('input', { type: 'text', placeholder: 'Plugin code' });
    const btn = create('button', {}, 'Unlock');
    const msg = create('div', {});
    btn.onclick = async () => {
      const code = input.value.trim();
      const data = await checkPluginCode(code);
      if (!data) {
        msg.textContent = "Invalid plugin.";
        return;
      }
      pluginsUnlocked[code] = data;
      msg.textContent = `✅ Plugin "${data.name}" unlocked.`;
      renderPluginsUI();
      if (code === "goguardian-limiter") {
        toolsList.push({
          name: "GoGuardian Limiter",
          desc: "Tries to disable or block GoGuardian JS",
          action: () => {
            const iframeKill = () => {
              const scripts = Array.from(document.querySelectorAll("script[src*='goguardian']"));
              scripts.forEach(s => s.remove());
              console.clear();
              console.log("✅ GoGuardian limiter ran.");
            };
            iframeKill();
            alert("✅ GoGuardian scripts blocked (if detected).");
          }
        });
        renderToolsUI();
      }
    };
    div.append(input, btn, msg);
    if (Object.keys(pluginsUnlocked).length) {
      const list = create('ul');
      for (const [k, v] of Object.entries(pluginsUnlocked)) {
        list.append(create('li', {}, `${v.name} (${k})`));
      }
      div.append(list);
    }
  };

  renderToolsUI();
  renderPluginsUI();
})();
