/*
 * Link — moteur IA de Jwar-code
 * ------------------------------------
 * Ce module ne nécessite aucune clé API. Il fait deux choses :
 *  1. Il reconnaît une liste de gabarits d'applications courantes (todo, calculatrice,
 *     landing page, formulaire de contact, compteur, horloge, quiz…) et génère
 *     directement les fichiers correspondants.
 *  2. Pour toute autre demande, il interprète le texte comme une recherche, interroge
 *     Wikipédia (API publique, sans clé, autorisée en CORS via origin=*) et applique
 *     le résultat sous forme de modification dans un fichier du projet, entre des
 *     marqueurs <!-- link:start --> / <!-- link:end --> qu'il sait
 *     retrouver et remplacer lors d'une prochaine demande.
 *
 * Usage :
 *   const result = await Link.process(userText, files, activeFile);
 *   // result = { filesToWrite: {path: content, ...}, message: "...", targetFile: "..." }
 */
const Link = (function () {
  "use strict";

  const TEMPLATES = [
    { keys: ["todo", "tâche", "liste de tâches", "to-do"], name: "Liste de tâches",
      files: {
        "index.html": `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Liste de tâches</title><link rel="stylesheet" href="style.css"></head>
<body><main>
  <h1>Mes tâches</h1>
  <form id="form"><input id="input" placeholder="Nouvelle tâche…" autocomplete="off"><button type="submit">Ajouter</button></form>
  <ul id="list"></ul>
</main><script src="app.js"></script></body></html>`,
        "style.css": `:root{--accent:#ff8a3d}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#14110f;color:#ede4d9;font-family:-apple-system,sans-serif;display:flex;justify-content:center;padding:48px 16px}
main{width:100%;max-width:420px}h1{color:var(--accent)}
#form{display:flex;gap:8px;margin-bottom:16px}
#input{flex:1;padding:10px;border-radius:6px;border:1px solid #332a23;background:#1b1714;color:#ede4d9}
button{padding:10px 14px;border:none;border-radius:6px;background:var(--accent);color:#1a1108;font-weight:600;cursor:pointer}
#list{list-style:none;padding:0}
#list li{display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid #332a23}
#list li.done span{text-decoration:line-through;opacity:.5}
#list li button{background:transparent;color:#9a8d7d;padding:2px 8px}`,
        "app.js": `const form=document.getElementById('form'),input=document.getElementById('input'),list=document.getElementById('list');
form.addEventListener('submit',e=>{e.preventDefault();const v=input.value.trim();if(!v)return;addTask(v);input.value='';});
function addTask(text){
  const li=document.createElement('li');
  const span=document.createElement('span');span.textContent=text;
  span.addEventListener('click',()=>li.classList.toggle('done'));
  const del=document.createElement('button');del.textContent='✕';del.addEventListener('click',()=>li.remove());
  li.append(span,del);list.appendChild(li);
}`
      }
    },
    { keys: ["calculatrice", "calculator", "calcul"], name: "Calculatrice",
      files: {
        "index.html": `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Calculatrice</title><link rel="stylesheet" href="style.css"></head>
<body><main>
  <div id="display">0</div>
  <div id="keys"></div>
</main><script src="app.js"></script></body></html>`,
        "style.css": `*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#14110f;display:flex;justify-content:center;align-items:center;font-family:-apple-system,sans-serif}
main{width:280px}#display{background:#1b1714;color:#ede4d9;font-size:32px;text-align:right;padding:18px;border-radius:8px 8px 0 0;font-family:monospace}
#keys{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:6px}
button{padding:18px 0;border:none;border-radius:6px;background:#211b17;color:#ede4d9;font-size:16px;cursor:pointer}
button.op{background:#ff8a3d;color:#1a1108;font-weight:600}`,
        "app.js": `const display=document.getElementById('display'),keys=document.getElementById('keys');
const layout=['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','C'];
let expr='';
layout.forEach(k=>{
  const b=document.createElement('button');b.textContent=k;
  if('/*-+='.includes(k)) b.classList.add('op');
  b.addEventListener('click',()=>{
    if(k==='C'){expr='';}
    else if(k==='='){try{expr=String(Function('"use strict";return('+expr+')')());}catch(e){expr='Erreur';}}
    else{expr+=k;}
    display.textContent=expr||'0';
  });
  keys.appendChild(b);
});`
      }
    },
    { keys: ["landing", "page d'accueil", "site vitrine", "vitrine"], name: "Landing page",
      files: {
        "index.html": `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Mon produit</title><link rel="stylesheet" href="style.css"></head>
<body>
<header><h1>Un produit qui simplifie ton quotidien</h1><p>Décris ici la promesse principale en une phrase claire.</p><button>Commencer gratuitement</button></header>
<section class="features">
  <div class="card"><h3>Rapide</h3><p>Mets en avant un premier bénéfice concret.</p></div>
  <div class="card"><h3>Simple</h3><p>Mets en avant un deuxième bénéfice concret.</p></div>
  <div class="card"><h3>Fiable</h3><p>Mets en avant un troisième bénéfice concret.</p></div>
</section>
<footer><p>© 2026 — Ton entreprise</p></footer>
</body></html>`,
        "style.css": `*{box-sizing:border-box;margin:0}body{font-family:-apple-system,sans-serif;background:#14110f;color:#ede4d9}
header{padding:90px 20px;text-align:center;background:linear-gradient(180deg,#1d1814,#14110f)}
header h1{font-size:34px;max-width:640px;margin:0 auto 14px;color:#ff8a3d}
header p{color:#9a8d7d;margin-bottom:24px}
header button{padding:12px 22px;background:#ff8a3d;color:#1a1108;border:none;border-radius:8px;font-weight:600;cursor:pointer}
.features{display:flex;gap:20px;padding:50px 20px;max-width:900px;margin:0 auto;flex-wrap:wrap;justify-content:center}
.card{background:#1b1714;border:1px solid #332a23;border-radius:10px;padding:24px;width:240px}
.card h3{color:#ff8a3d;margin-bottom:8px}
.card p{color:#9a8d7d;font-size:14px}
footer{text-align:center;padding:24px;color:#5d5043;font-size:12px}`,
        "app.js": `// Pas de logique nécessaire pour cette landing page statique.`
      }
    },
    { keys: ["formulaire de contact", "contact form", "contact"], name: "Formulaire de contact",
      files: {
        "index.html": `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Contact</title><link rel="stylesheet" href="style.css"></head>
<body><main>
  <h1>Contacte-nous</h1>
  <form id="form">
    <label>Nom<input required name="nom"></label>
    <label>E-mail<input required type="email" name="email"></label>
    <label>Message<textarea required name="message" rows="5"></textarea></label>
    <button type="submit">Envoyer</button>
  </form>
  <p id="confirm" hidden>Merci, ton message a bien été pris en compte.</p>
</main><script src="app.js"></script></body></html>`,
        "style.css": `*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#14110f;color:#ede4d9;font-family:-apple-system,sans-serif;display:flex;justify-content:center;padding:48px 16px}
main{width:100%;max-width:420px}h1{color:#ff8a3d}
form{display:flex;flex-direction:column;gap:14px}
label{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#9a8d7d}
input,textarea{padding:10px;border-radius:6px;border:1px solid #332a23;background:#1b1714;color:#ede4d9;font-family:inherit}
button{padding:12px;border:none;border-radius:6px;background:#ff8a3d;color:#1a1108;font-weight:600;cursor:pointer}
#confirm{margin-top:14px;color:#7fbf6a}`,
        "app.js": `document.getElementById('form').addEventListener('submit', e=>{
  e.preventDefault();
  e.target.hidden=true;
  document.getElementById('confirm').hidden=false;
});`
      }
    },
    { keys: ["compteur", "counter"], name: "Compteur",
      files: {
        "index.html": `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Compteur</title><link rel="stylesheet" href="style.css"></head>
<body><main>
  <div id="value">0</div>
  <div class="row"><button id="dec">-</button><button id="reset">Réinitialiser</button><button id="inc">+</button></div>
</main><script src="app.js"></script></body></html>`,
        "style.css": `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#14110f;color:#ede4d9;font-family:-apple-system,sans-serif}
#value{font-size:64px;font-weight:700;color:#ff8a3d}
.row{display:flex;gap:10px}
button{padding:12px 18px;border:none;border-radius:8px;background:#211b17;color:#ede4d9;font-size:16px;cursor:pointer}
#inc,#dec{background:#ff8a3d;color:#1a1108;font-weight:700}`,
        "app.js": `let n=0;const el=document.getElementById('value');
const render=()=>el.textContent=n;
document.getElementById('inc').addEventListener('click',()=>{n++;render();});
document.getElementById('dec').addEventListener('click',()=>{n--;render();});
document.getElementById('reset').addEventListener('click',()=>{n=0;render();});`
      }
    },
    { keys: ["horloge", "clock", "heure"], name: "Horloge",
      files: {
        "index.html": `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Horloge</title><link rel="stylesheet" href="style.css"></head>
<body><main><div id="clock">00:00:00</div><div id="date"></div></main><script src="app.js"></script></body></html>`,
        "style.css": `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#14110f;color:#ede4d9;font-family:-apple-system,sans-serif}
#clock{font-size:56px;font-family:monospace;color:#ff8a3d}
#date{color:#9a8d7d;margin-top:8px}`,
        "app.js": `function tick(){
  const d=new Date();
  document.getElementById('clock').textContent=d.toLocaleTimeString('fr-FR');
  document.getElementById('date').textContent=d.toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}
tick();setInterval(tick,1000);`
      }
    },
    { keys: ["quiz", "questionnaire"], name: "Quiz",
      files: {
        "index.html": `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Quiz</title><link rel="stylesheet" href="style.css"></head>
<body><main>
  <h1 id="question">Question</h1>
  <div id="options"></div>
  <p id="score"></p>
</main><script src="app.js"></script></body></html>`,
        "style.css": `*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#14110f;color:#ede4d9;font-family:-apple-system,sans-serif;display:flex;justify-content:center;padding:48px 16px}
main{width:100%;max-width:420px;text-align:center}h1{color:#ff8a3d;margin-bottom:20px}
#options{display:flex;flex-direction:column;gap:10px}
#options button{padding:12px;border:1px solid #332a23;background:#1b1714;color:#ede4d9;border-radius:8px;cursor:pointer}
#options button.correct{border-color:#7fbf6a;color:#7fbf6a}
#options button.wrong{border-color:#e1604f;color:#e1604f}
#score{margin-top:20px;color:#9a8d7d}`,
        "app.js": `const data=[
  {q:"Quelle est la capitale de la France ?",opts:["Lyon","Paris","Marseille"],a:1},
  {q:"Combien font 6 x 7 ?",opts:["42","36","48"],a:0},
  {q:"Quelle planète est la plus proche du soleil ?",opts:["Mars","Vénus","Mercure"],a:2}
];
let i=0,score=0;
const qEl=document.getElementById('question'),optsEl=document.getElementById('options'),scoreEl=document.getElementById('score');
function render(){
  if(i>=data.length){qEl.textContent="Terminé !";optsEl.innerHTML="";scoreEl.textContent="Score : "+score+"/"+data.length;return;}
  qEl.textContent=data[i].q;optsEl.innerHTML="";
  data[i].opts.forEach((opt,idx)=>{
    const b=document.createElement('button');b.textContent=opt;
    b.addEventListener('click',()=>{
      b.classList.add(idx===data[i].a?'correct':'wrong');
      if(idx===data[i].a)score++;
      [...optsEl.children].forEach(c=>c.disabled=true);
      setTimeout(()=>{i++;render();},700);
    });
    optsEl.appendChild(b);
  });
  scoreEl.textContent="";
}
render();`
      }
    }
  ];

  function matchTemplate(text) {
    const lower = text.toLowerCase();
    return TEMPLATES.find(t => t.keys.some(k => lower.includes(k)));
  }

  // Recherche réelle sur le web via l'API publique de Wikipédia (CORS autorisé via origin=*)
  async function searchWeb(query) {
    const lang = /^[a-z]/i.test(query) ? "fr" : "fr"; // recherche en français par défaut
    const findUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`;
    const findResp = await fetch(findUrl);
    if (!findResp.ok) throw new Error("La recherche web a échoué (" + findResp.status + ").");
    const findData = await findResp.json();
    const title = findData[1] && findData[1][0];
    if (!title) return null;

    const sumUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const sumResp = await fetch(sumUrl);
    if (!sumResp.ok) throw new Error("Impossible de récupérer le résumé de la page trouvée.");
    const sum = await sumResp.json();
    return {
      title: sum.title,
      extract: sum.extract,
      url: sum.content_urls && sum.content_urls.desktop ? sum.content_urls.desktop.page : findData[3][0]
    };
  }

  function pickTargetFile(userText, files, activeFile) {
    const named = Object.keys(files).find(name => userText.toLowerCase().includes(name.toLowerCase()));
    if (named) return named;
    if (activeFile && activeFile.endsWith(".html")) return activeFile;
    const anyHtml = Object.keys(files).find(f => f.endsWith(".html"));
    return anyHtml || "index.html";
  }

  function applyToHtml(currentContent, result, query) {
    const block = `<!-- link:start -->
<section class="link-research">
  <h2>${escapeHtml(result.title)}</h2>
  <p>${escapeHtml(result.extract || "Aucun résumé disponible.")}</p>
  <p><small>Source : <a href="${result.url}" target="_blank" rel="noopener">${result.url}</a> (via Link)</small></p>
</section>
<!-- link:end -->`;
    const marker = /<!-- link:start -->[\s\S]*?<!-- link:end -->/;
    if (marker.test(currentContent)) {
      return currentContent.replace(marker, block);
    }
    if (currentContent.includes("</body>")) {
      return currentContent.replace("</body>", block + "\n</body>");
    }
    return currentContent + "\n" + block;
  }

  function applyToOther(currentContent, result) {
    const comment = `/* link: recherche sur "${result.title}" — ${result.url} */\n/* ${result.extract ? result.extract.slice(0, 280) : ""} */\n`;
    return comment + currentContent;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function process(userText, files, activeFile) {
    const template = matchTemplate(userText);
    if (template) {
      return {
        filesToWrite: template.files,
        targetFile: Object.keys(template.files)[0],
        message: `Base "${template.name}" générée sans connexion (gabarit local).`
      };
    }

    let result;
    try {
      result = await searchWeb(userText);
    } catch (err) {
      throw new Error("Recherche web impossible : " + err.message);
    }

    if (!result) {
      const names = TEMPLATES.map(t => t.name).join(", ");
      return {
        filesToWrite: {},
        targetFile: null,
        message: `Je n'ai trouvé aucun résultat pour cette recherche, et aucun gabarit local ne correspond. Gabarits disponibles : ${names}. Tu peux aussi reformuler ta recherche.`
      };
    }

    const targetFile = pickTargetFile(userText, files, activeFile);
    const current = files[targetFile] || "";
    const updated = targetFile.endsWith(".html") ? applyToHtml(current, result, userText) : applyToOther(current, result);

    return {
      filesToWrite: { [targetFile]: updated },
      targetFile,
      message: `Recherche effectuée : "${result.title}". Résultat appliqué dans ${targetFile}.`
    };
  }

  return { process, searchWeb, matchTemplate, TEMPLATES };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Link;


(function(){
  "use strict";

  /* ---------------- State ---------------- */
  const DEFAULT_FILES = {
    "index.html": `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Mon application</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <h1>Bienvenue dans Jwar-code</h1>
    <p>Demande un gabarit à Link, à gauche, ou modifie ce fichier directement.</p>
    <button id="btn">Cliquer ici</button>
  </main>
  <script src="app.js"><\/script>
</body>
</html>`,
    "style.css": `:root{ --accent:#ff8a3d; }
*{box-sizing:border-box;}
body{
  margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
  background:#14110f; color:#ede4d9; font-family:-apple-system,sans-serif; text-align:center;
}
main{ max-width:480px; padding:32px; }
h1{ color:var(--accent); }
button{
  margin-top:16px; padding:10px 18px; border:none; border-radius:8px;
  background:var(--accent); color:#1a1108; font-weight:600; cursor:pointer;
}
`,
    "app.js": `document.getElementById('btn').addEventListener('click', () => {
  alert("Ca marche ! Demande a Link de transformer cette app.");
});
`
  };

  let files = JSON.parse(JSON.stringify(DEFAULT_FILES));
  let activeFile = "index.html";
  let online = navigator.onLine;

  /* ---------------- DOM refs ---------------- */
  const $ = (id) => document.getElementById(id);
  const filelistEl = $("filelist");
  const editorEl = $("editor");
  const linenumsEl = $("linenums");
  const activefilenameEl = $("activefilename");
  const chatlogEl = $("chatlog");
  const chatinputEl = $("chatinput");
  const previewframeEl = $("previewframe");
  const consoleEl = $("console");
  const statusdotEl = $("statusdot");
  const netnoteEl = $("netnote");
  const modelrowEl = $("modelrow");
  const modelSelectEl = $("modelSelect");
  const cloudkeyrowEl = $("cloudkeyrow");
  const cloudApiKeyEl = $("cloudApiKey");
  const googlerowEl = $("googlerow");
  const backendUrlInputEl = $("backendUrlInput");
  const googleStatusNoteEl = $("googleStatusNote");
  const gsiContainerTopEl = $("gsiContainerTop");
  const googleUserInfoTopEl = $("googleUserInfoTop");

  /* ---------------- Mode IA (local / cloud-clé / cloud-google) ---------------- */
  let aiMode = "local";
  let cloudApiKey = "";
  let cloudModel = "claude-sonnet-4-6";
  let backendUrl = "";
  let googleIdToken = "";
  let googleUser = null;
  try{ aiMode = localStorage.getItem("jwarcode-aimode") || "local"; }catch(e){}
  try{ cloudApiKey = localStorage.getItem("jwarcode-cloudkey") || ""; }catch(e){}
  try{ cloudModel = localStorage.getItem("jwarcode-model") || "claude-sonnet-4-6"; }catch(e){}
  try{ backendUrl = localStorage.getItem("jwarcode-backendurl") || ""; }catch(e){}

  function applyAiMode(mode){
    aiMode = mode;
    $("modeLocal").classList.toggle("active", mode==="local");
    $("modeCloud").classList.toggle("active", mode==="cloud");
    $("modeGoogle").classList.toggle("active", mode==="google");
    modelrowEl.style.display = (mode==="cloud"||mode==="google") ? "flex" : "none";
    cloudkeyrowEl.style.display = (mode==="cloud") ? "flex" : "none";
    googlerowEl.style.display = (mode==="google") ? "block" : "none";
    if(mode==="local"){
      netnoteEl.textContent = "Link · aucune clé API requise";
    }else if(mode==="cloud"){
      netnoteEl.textContent = cloudApiKey ? "Cloud · clé API enregistrée localement" : "Cloud · entre ta clé API Anthropic ci-dessus";
    }else{
      netnoteEl.textContent = googleUser ? `Connecté en tant que ${googleUser.email}` : "Connecte-toi avec Google (en haut à droite) pour utiliser ce mode";
      updateGoogleStatusNote();
    }
    try{ localStorage.setItem("jwarcode-aimode", mode); }catch(e){}
  }
  $("modeLocal").addEventListener("click", ()=>applyAiMode("local"));
  $("modeCloud").addEventListener("click", ()=>applyAiMode("cloud"));
  $("modeGoogle").addEventListener("click", ()=>applyAiMode("google"));

  modelSelectEl.value = cloudModel;
  modelSelectEl.addEventListener("change", ()=>{
    cloudModel = modelSelectEl.value;
    try{ localStorage.setItem("jwarcode-model", cloudModel); }catch(e){}
  });

  cloudApiKeyEl.value = cloudApiKey;
  $("btnSaveKey").addEventListener("click", ()=>{
    cloudApiKey = cloudApiKeyEl.value.trim();
    try{ localStorage.setItem("jwarcode-cloudkey", cloudApiKey); }catch(e){}
    applyAiMode("cloud");
  });

  backendUrlInputEl.value = backendUrl;
  $("btnSaveBackend").addEventListener("click", ()=>{
    backendUrl = backendUrlInputEl.value.trim().replace(/\/$/,"");
    try{ localStorage.setItem("jwarcode-backendurl", backendUrl); }catch(e){}
    applyAiMode("google");
  });

  function updateGoogleStatusNote(){
    if(!googleStatusNoteEl) return;
    if(!googleUser){
      googleStatusNoteEl.textContent = "Connecte-toi avec le bouton Google en haut à droite de l'application.";
    }else if(!backendUrl){
      googleStatusNoteEl.textContent = "Connecté en tant que " + googleUser.email + ". Configure ton serveur relais ci-dessus pour activer ce mode.";
    }else{
      googleStatusNoteEl.textContent = "Connecté en tant que " + googleUser.email + " · prêt à discuter.";
    }
  }

  applyAiMode(aiMode);

  /* ---------------- Connexion Google globale (Google Identity Services) ----------------
     Une seule connexion au niveau de l'application (topbar), réutilisée par tous les
     modes qui en ont besoin (ici, "Cloud (Google)"). Nécessite un Client ID OAuth Google
     (gratuit, à créer sur console.cloud.google.com) et un serveur relais (voir worker.js
     fourni) qui vérifie le jeton et appelle Claude. */
  const googleConfigRowEl = $("googleConfigRow");
  const googleClientIdInputEl = $("googleClientIdInput");
  let GOOGLE_CLIENT_ID = "";
  try{ GOOGLE_CLIENT_ID = localStorage.getItem("jwarcode-googleclientid") || ""; }catch(e){}
  let gsiScriptLoaded = false;
  let gsiInitialized = false;

  function loadGsiScript(){
    if(gsiScriptLoaded) return Promise.resolve();
    gsiScriptLoaded = true;
    return loadScript("https://accounts.google.com/gsi/client");
  }

  function renderNotConfigured(){
    gsiContainerTopEl.innerHTML = `<button class="topbtn" id="notconfigured" title="Cliquer pour configurer la connexion Google">Connecter Google ▾</button>`;
    $("notconfigured").addEventListener("click", ()=>{
      googleClientIdInputEl.value = GOOGLE_CLIENT_ID;
      googleConfigRowEl.style.display = googleConfigRowEl.style.display==="flex" ? "none" : "flex";
      googleClientIdInputEl.focus();
    });
  }

  function initGoogleSignIn(){
    if(gsiInitialized || !window.google) return;
    gsiInitialized = true;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: onGoogleCredential,
      auto_select: true
    });
    gsiContainerTopEl.innerHTML = "";
    google.accounts.id.renderButton(gsiContainerTopEl, { theme:"outline", size:"medium" });
    google.accounts.id.prompt(); // propose la connexion automatique (popup One Tap) si une session existe déjà
  }

  function ensureGsiLoaded(){
    if(!GOOGLE_CLIENT_ID){
      renderNotConfigured();
      return;
    }
    loadGsiScript().then(()=>{
      if(!window.google){
        gsiContainerTopEl.innerHTML = `<small style="color:var(--text-dim)">Google Sign-In indisponible</small>`;
        return;
      }
      initGoogleSignIn();
    }).catch(()=>{
      gsiContainerTopEl.innerHTML = `<small style="color:var(--text-dim)">Google Sign-In indisponible (hors-ligne ?)</small>`;
    });
  }

  $("btnSaveGoogleClientId").addEventListener("click", ()=>{
    const val = googleClientIdInputEl.value.trim();
    if(!val) return;
    GOOGLE_CLIENT_ID = val;
    try{ localStorage.setItem("jwarcode-googleclientid", GOOGLE_CLIENT_ID); }catch(e){}
    googleConfigRowEl.style.display = "none";
    gsiInitialized = false;
    ensureGsiLoaded(); // déclenche le vrai popup de connexion Google dès que le Client ID est valide
  });

  function parseJwt(token){
    try{
      const base = token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
      return JSON.parse(decodeURIComponent(atob(base).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join("")));
    }catch(e){ return null; }
  }

  function onGoogleCredential(resp){
    googleIdToken = resp.credential;
    googleUser = parseJwt(googleIdToken);
    if(googleUser){
      googleUserInfoTopEl.style.display = "flex";
      googleUserInfoTopEl.innerHTML =
        `<img src="${googleUser.picture||""}" alt=""><span>${googleUser.email}</span><button class="signout" id="btnGoogleSignout">Déconnexion</button>`;
      $("btnGoogleSignout").addEventListener("click", googleSignOut);
      gsiContainerTopEl.style.display = "none";
    }
    if(aiMode==="google") applyAiMode("google");
    else updateGoogleStatusNote();
  }

  function googleSignOut(){
    googleIdToken = ""; googleUser = null;
    googleUserInfoTopEl.style.display = "none";
    gsiContainerTopEl.style.display = "block";
    if(window.google) google.accounts.id.disableAutoSelect();
    if(aiMode==="google") applyAiMode("google");
    else updateGoogleStatusNote();
  }

  // La connexion Google est proposée dès le démarrage de l'app, au niveau de la topbar,
  // indépendamment du mode IA choisi — comme un vrai compte d'application.
  ensureGsiLoaded();

  /* Appelle directement l'API Anthropic depuis le navigateur (mode "cloud", clé perso) */
  async function callCloudAI(userText, filesObj, activeFileName){
    if(!cloudApiKey){
      throw new Error("Aucune clé API Anthropic enregistrée. Saisis-la dans le champ ci-dessus.");
    }
    const systemPrompt = buildSystemPrompt(filesObj, activeFileName);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cloudApiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: cloudModel,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userText }]
      })
    });
    if(!response.ok){
      const errBody = await response.text();
      throw new Error("Erreur API (" + response.status + ") : " + errBody.slice(0,200));
    }
    const data = await response.json();
    return parseAiJson((data.content || []).map(b=>b.text||"").join("\n").trim());
  }

  /* Appelle ton serveur relais (worker.js) qui vérifie le compte Google et utilise SA clé API (mode "google", gratuit pour l'utilisateur) */
  async function callGoogleCloudAI(userText, filesObj, activeFileName){
    if(!googleIdToken){
      throw new Error("Connecte-toi avec Google d'abord.");
    }
    if(!backendUrl){
      throw new Error("Configure l'URL de ton serveur relais ci-dessus (voir worker.js).");
    }
    const systemPrompt = buildSystemPrompt(filesObj, activeFileName);
    const response = await fetch(backendUrl + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_token: googleIdToken,
        model: cloudModel,
        system: systemPrompt,
        message: userText
      })
    });
    if(!response.ok){
      const errBody = await response.text();
      throw new Error("Erreur serveur relais (" + response.status + ") : " + errBody.slice(0,200));
    }
    const data = await response.json();
    if(data.error) throw new Error(data.error);
    return parseAiJson(data.text || "");
  }

  function buildSystemPrompt(filesObj, activeFileName){
    return `Tu es l'assistant intégré d'un éditeur de code web (HTML/CSS/JS). Réponds UNIQUEMENT avec un objet JSON valide,
sans texte avant ni après, sans balises markdown, au format exact :
{"message": "explication courte en français", "targetFile": "nom_du_fichier_modifié_ou_créé", "filesToWrite": {"nom_fichier": "contenu_complet_du_fichier", ...}}
Le fichier actif est "${activeFileName}". Voici les fichiers actuels du projet :
${Object.entries(filesObj).map(([n,c])=>`--- ${n} ---\n${c}`).join("\n\n")}
Si la demande ne nécessite aucune modification de fichier, renvoie un objet filesToWrite vide.`;
  }

  function parseAiJson(text){
    const clean = text.replace(/^```json\s*|^```\s*|```$/g,"").trim();
    let parsed;
    try{ parsed = JSON.parse(clean); }
    catch(e){ throw new Error("Réponse du modèle illisible : " + text.slice(0,200)); }
    return {
      message: parsed.message || "",
      filesToWrite: parsed.filesToWrite || {},
      targetFile: parsed.targetFile
    };
  }

  /* ---------------- Tabs ---------------- */
  document.querySelectorAll(".tabbtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tabbtn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      $("chatpane").style.display = tab==="chat" ? "flex" : "none";
      $("filespane").style.display = tab==="files" ? "flex" : "none";
    });
  });

  /* ---------------- File list rendering ---------------- */
  function iconFor(name){
    if(name.endsWith(".html")) return "◆";
    if(name.endsWith(".css")) return "❖";
    if(name.endsWith(".js")) return "✦";
    if(name.endsWith(".json")) return "{}";
    return "·";
  }

  function renderFileList(){
    filelistEl.innerHTML = "";
    Object.keys(files).sort().forEach(name=>{
      const row = document.createElement("div");
      row.className = "fileitem" + (name===activeFile ? " active" : "");
      row.innerHTML = `<span>${iconFor(name)}</span><span>${name}</span><span class="del" title="Supprimer">✕</span>`;
      row.addEventListener("click",(e)=>{
        if(e.target.classList.contains("del")){
          e.stopPropagation();
          if(Object.keys(files).length<=1) return;
          delete files[name];
          if(activeFile===name) activeFile = Object.keys(files)[0];
          renderFileList(); loadEditor(); renderPreview();
          return;
        }
        activeFile = name; renderFileList(); loadEditor();
      });
      filelistEl.appendChild(row);
    });
  }

  $("newfileinput").addEventListener("keydown",(e)=>{
    if(e.key==="Enter"){
      const name = e.target.value.trim();
      if(!name) return;
      if(!files[name]) files[name] = "";
      activeFile = name;
      e.target.value = "";
      renderFileList(); loadEditor();
    }
  });

  /* ---------------- Editor ---------------- */
  function updateLineNumbers(){
    const lines = editorEl.value.split("\n").length;
    let out = "";
    for(let i=1;i<=lines;i++) out += i + "\n";
    linenumsEl.textContent = out;
    syncScroll();
  }

  function syncScroll(){
    linenumsEl.scrollTop = editorEl.scrollTop;
  }

  function loadEditor(){
    activefilenameEl.textContent = activeFile;
    editorEl.value = files[activeFile] || "";
    editorEl.scrollTop = 0;
    editorEl.scrollLeft = 0;
    linenumsEl.scrollTop = 0;
    updateLineNumbers();
  }

  editorEl.addEventListener("input", ()=>{
    files[activeFile] = editorEl.value;
    updateLineNumbers();
  });
  editorEl.addEventListener("scroll", syncScroll);
  window.addEventListener("resize", syncScroll);
  editorEl.addEventListener("keydown",(e)=>{
    if(e.key==="Tab"){
      e.preventDefault();
      const s=editorEl.selectionStart, en=editorEl.selectionEnd;
      editorEl.value = editorEl.value.slice(0,s)+"  "+editorEl.value.slice(en);
      editorEl.selectionStart=editorEl.selectionEnd=s+2;
      files[activeFile]=editorEl.value; updateLineNumbers();
    }
  });

  /* ---------------- Preview ---------------- */
  function log(msg, isErr){
    const line = document.createElement("div");
    line.className = isErr ? "err" : "log";
    line.textContent = (isErr?"✕ ":"› ") + msg;
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function buildPreviewDoc(){
    const htmlName = Object.keys(files).find(f=>f.toLowerCase()==="index.html") || Object.keys(files).find(f=>f.endsWith(".html"));
    if(!htmlName) return "<body style='font-family:sans-serif;padding:20px;color:#555'>Aucun fichier .html trouvé.</body>";
    let html = files[htmlName];

    html = html.replace(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi, (m, href)=>{
      const clean = href.replace(/^\.\//,"");
      if(files[clean]!==undefined) return `<style>\n${files[clean]}\n</style>`;
      return m;
    });
    html = html.replace(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi, (m, src)=>{
      const clean = src.replace(/^\.\//,"");
      if(files[clean]!==undefined) return `<script>\n${files[clean]}\n<\/script>`;
      return m;
    });

    const bridge = `<script>
      (function(){
        const send=(type,args)=>parent.postMessage({__jwar:true,type,args:Array.from(args).map(a=>{
          try{return typeof a==='object'?JSON.stringify(a):String(a);}catch(e){return String(a);}
        })}, '*');
        ['log','warn','info'].forEach(k=>{const o=console[k];console[k]=function(){send('log',arguments);o.apply(console,arguments);};});
        window.addEventListener('error', e=> send('error',[e.message]));
      })();
    <\/script>`;
    if(html.includes("</head>")) html = html.replace("</head>", bridge+"</head>");
    else html = bridge + html;
    return html;
  }

  function renderPreview(){
    consoleEl.innerHTML = "";
    const doc = buildPreviewDoc();
    previewframeEl.srcdoc = doc;
    $("previewstate").textContent = "mis à jour " + new Date().toLocaleTimeString();
  }

  window.addEventListener("message",(e)=>{
    if(e.data && e.data.__jwar){
      log(e.data.args.join(" "), e.data.type==="error");
    }
  });

  $("btnRun").addEventListener("click", renderPreview);

  /* ---------------- Export (zip avec fichiers séparés) ---------------- */
  async function exportProject(){
    try{
      if(!window.JSZip){
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
      }
      const zip = new JSZip();
      Object.entries(files).forEach(([name,content])=> zip.file(name, content));
      const blob = await zip.generateAsync({type:"blob"});
      downloadBlob(blob, "jwar-code-project.zip");
    }catch(err){
      Object.entries(files).forEach(([name,content])=>{
        downloadBlob(new Blob([content],{type:"text/plain"}), name);
      });
      log("Export hors-ligne : fichiers téléchargés individuellement (html/css/js séparés).", false);
    }
  }
  function loadScript(src){
    return new Promise((res,rej)=>{
      const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej;
      document.head.appendChild(s);
    });
  }
  function downloadBlob(blob, name){
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=name; a.click();
    URL.revokeObjectURL(url);
  }
  $("btnExport").addEventListener("click", exportProject);

  $("btnNewProject").addEventListener("click", ()=>{
    if(!confirm("Créer un nouveau projet ? Le projet actuel sera perdu s'il n'est pas exporté.")) return;
    files = JSON.parse(JSON.stringify(DEFAULT_FILES));
    activeFile = "index.html";
    chatlogEl.innerHTML = "";
    renderFileList(); loadEditor(); renderPreview();
    welcomeMessage();
  });

  /* ---------------- Chat / Link ---------------- */
  function addMsg(role, html){
    const div = document.createElement("div");
    div.className = "msg " + role;
    div.innerHTML = `<div class="role">${role==="user"?"Toi":"Link"}</div><div class="bubble"></div>`;
    div.querySelector(".bubble").innerHTML = html;
    chatlogEl.appendChild(div);
    chatlogEl.scrollTop = chatlogEl.scrollHeight;
    return div;
  }

  function escapeHtml(s){
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  async function handleSend(){
    const text = chatinputEl.value.trim();
    if(!text) return;
    chatinputEl.value = "";
    addMsg("user", escapeHtml(text));
    const thinkingLabel = aiMode==="local" ? "recherche / génération en cours…" : "appel du modèle dans le cloud…";
    const thinkingDiv = addMsg("assistant", `<span class="thinking">${thinkingLabel}</span>`);

    try{
      let result;
      if(aiMode==="cloud") result = await callCloudAI(text, files, activeFile);
      else if(aiMode==="google") result = await callGoogleCloudAI(text, files, activeFile);
      else result = await Link.process(text, files, activeFile);
      let html = escapeHtml(result.message || "").replace(/\n/g,"<br>");
      const written = Object.keys(result.filesToWrite || {});
      if(written.length){
        written.forEach(name=>{ files[name] = result.filesToWrite[name]; });
        html += `<div style="margin-top:8px;">` + written.map(f=>`<span class="filetag">${f}</span>`).join("") + `</div>`;
        renderFileList();
        activeFile = result.targetFile || written[0];
        loadEditor();
        renderPreview();
      }
      thinkingDiv.querySelector(".bubble").innerHTML = html || "<i>(aucune modification)</i>";
    }catch(err){
      thinkingDiv.querySelector(".bubble").innerHTML =
        `<span style="color:var(--red)">${escapeHtml(err.message)}</span>`;
    }
  }

  $("btnSend").addEventListener("click", handleSend);
  chatinputEl.addEventListener("keydown",(e)=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      handleSend();
    }
  });

  /* ---------------- Network status ---------------- */
  function updateOnlineStatus(){
    online = navigator.onLine;
    statusdotEl.classList.toggle("online", online);
    statusdotEl.title = online ? "En ligne — recherche web disponible" : "Hors ligne — gabarits locaux disponibles, recherche web indisponible";
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);

  function welcomeMessage(){
    addMsg("assistant", "Salut, je suis Link. Demande-moi un gabarit (todo, calculatrice, landing page, formulaire de contact, compteur, horloge, quiz…) ou pose-moi une question — je cherche sur le web et j'applique le résultat directement dans le fichier actif.");
  }

  /* ---------------- Thème jour / nuit ---------------- */
  function applyTheme(theme){
    document.documentElement.setAttribute("data-theme", theme);
    $("btnTheme").textContent = theme === "dark" ? "☾" : "☀";
    try{ localStorage.setItem("jwarcode-theme", theme); }catch(e){}
  }
  function initTheme(){
    let saved = "dark";
    try{ saved = localStorage.getItem("jwarcode-theme") || "dark"; }catch(e){}
    applyTheme(saved);
  }
  $("btnTheme").addEventListener("click", ()=>{
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });
  initTheme();

  /* ---------------- Init ---------------- */
  $("btnStart").addEventListener("click", ()=>{
    $("welcome").style.display = "none";
  });

  renderFileList();
  loadEditor();
  renderPreview();
  updateOnlineStatus();
  welcomeMessage();

})();
