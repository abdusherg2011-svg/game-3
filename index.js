import * as THREE from "three";

// ==========================================
// FC MANAGER 26 — ANTI-GRAVITY SOCCER
// ==========================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE_KEY = "fc-manager-26-save";

const defaultState = {
  club: "NOVA UNITED",
  color: "#b7ff39",
  emblem: "✦",
  coins: 12500,
  wins: 2,
  goals: 8,
  season: 1,
  division: 3,
  trophies: [],
  played: 3,
  squad: [
    { id: 1, name: "A. Morgan", pos: "GK", ovr: 78, num: 1, flag: "🇺🇿", pac: 65, sho: 45, pas: 74, dri: 67, def: 78, phy: 81 },
    { id: 2, name: "J. Carter", pos: "DEF", ovr: 76, num: 4, flag: "🇬🇧", pac: 73, sho: 48, pas: 70, dri: 66, def: 80, phy: 78 },
    { id: 3, name: "D. Silva", pos: "DEF", ovr: 80, num: 5, flag: "🇧🇷", pac: 78, sho: 52, pas: 76, dri: 72, def: 82, phy: 79 },
    { id: 4, name: "M. Karimov", pos: "DEF", ovr: 75, num: 3, flag: "🇺🇿", pac: 77, sho: 44, pas: 69, dri: 68, def: 77, phy: 76 },
    { id: 5, name: "L. Moreau", pos: "DEF", ovr: 77, num: 2, flag: "🇫🇷", pac: 82, sho: 51, pas: 75, dri: 73, def: 76, phy: 74 },
    { id: 6, name: "A. Torres", pos: "MID", ovr: 81, num: 8, flag: "🇦🇷", pac: 76, sho: 72, pas: 84, dri: 82, def: 70, phy: 73 },
    { id: 7, name: "S. Rahimov", pos: "MID", ovr: 74, num: 6, flag: "🇺🇿", pac: 71, sho: 65, pas: 76, dri: 74, def: 72, phy: 75 },
    { id: 8, name: "K. Johnson", pos: "MID", ovr: 79, num: 10, flag: "🇬🇧", pac: 81, sho: 74, pas: 82, dri: 84, def: 61, phy: 69 },
    { id: 9, name: "R. Costa", pos: "FWD", ovr: 83, num: 7, flag: "🇧🇷", pac: 89, sho: 85, pas: 75, dri: 87, def: 34, phy: 77 },
    { id: 10, name: "A. Karim", pos: "FWD", ovr: 85, num: 9, flag: "🇺🇿", pac: 87, sho: 89, pas: 78, dri: 85, def: 35, phy: 82 },
    { id: 11, name: "N. Laurent", pos: "FWD", ovr: 80, num: 11, flag: "🇫🇷", pac: 84, sho: 81, pas: 74, dri: 82, def: 30, phy: 72 },
    { id: 12, name: "T. Walker", pos: "MID", ovr: 73, num: 14, flag: "🇬🇧", pac: 72, sho: 69, pas: 75, dri: 73, def: 68, phy: 70 },
    { id: 13, name: "P. Santos", pos: "DEF", ovr: 72, num: 15, flag: "🇧🇷", pac: 69, sho: 43, pas: 65, dri: 61, def: 74, phy: 76 },
    { id: 14, name: "M. Lee", pos: "FWD", ovr: 76, num: 19, flag: "🇫🇷", pac: 82, sho: 77, pas: 68, dri: 79, def: 32, phy: 71 }
  ]
};

let state;

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  state = saved
    ? { ...structuredClone(defaultState), ...saved }
    : structuredClone(defaultState);
} catch {
  state = structuredClone(defaultState);
}

let selectedPlayerId = null;
let swapPlayerId = null;
let currentFormation = 0;
let homeScore = 0;
let awayScore = 0;
let matchSeconds = 0;
let matchRunning = true;
let matchStarted = false;
let soundOn = true;
let shotCharge = 0;
let charging = false;
let lastTime = performance.now();
let toastTimer;
let eventTimer;
let gameScene, gameCamera, renderer, playerMesh, ballMesh, ballVelocity;
let teammateMeshes = [];
let opponentMeshes = [];
let keys = {};
let audioContext = null;

const formations = [
  { name: "4-3-3", positions: [
    [50,88],[20,70],[40,74],[60,74],[80,70],
    [32,51],[50,56],[68,51],
    [20,27],[50,20],[80,27]
  ]},
  { name: "4-4-2", positions: [
    [50,88],[20,70],[40,74],[60,74],[80,70],
    [20,49],[40,53],[60,53],[80,49],
    [37,25],[63,25]
  ]},
  { name: "3-5-2", positions: [
    [50,88],[28,72],[50,75],[72,72],
    [16,51],[34,48],[50,55],[66,48],[84,51],
    [38,25],[62,25]
  ]}
];

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Не удалось сохранить прогресс", error);
  }
}

function toast(message) {
  const element = $("#toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2600);
}

function showEvent(message) {
  const element = $("#gameEvent");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(eventTimer);
  eventTimer = setTimeout(() => element.classList.remove("show"), 1800);
}

function playTone(frequency = 180, duration = 0.12, type = "sine") {
  if (!soundOn) return;

  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();

    if (audioContext.state === "suspended") audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.06, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.warn("Audio недоступен", error);
  }
}

function setCoins(amount) {
  state.coins = Math.max(0, amount);
  $("#coins").textContent = state.coins.toLocaleString("en-US");
  saveState();
}

function applyClubStyle() {
  document.documentElement.style.setProperty("--club", state.color);
  $("#clubNameSide").textContent = state.club;
  $("#clubBadge").textContent = state.emblem;
  $("#clubInput").value = state.club;
  $("#clubColor").value = state.color;
  $("#clubEmblem").value = state.emblem;
  $("#coins").textContent = state.coins.toLocaleString("en-US");
}

function openModal(id) {
  $("#" + id)?.classList.add("open");
}

function closeModal(modal) {
  modal.classList.remove("open");
}

$$("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    closeModal(button.closest(".modal-backdrop"));
  });
});

$$(".modal-backdrop").forEach(backdrop => {
  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) closeModal(backdrop);
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    $$(".modal-backdrop.open").forEach(closeModal);
  }
});

// ==========================================
// NAVIGATION
// ==========================================

function navigate(viewName) {
  $$(".view").forEach(view => view.classList.remove("active"));
  $$(".nav-item").forEach(button => button.classList.remove("active"));

  $("#view-" + viewName)?.classList.add("active");
  $(`.nav-item[data-view="${viewName}"]`)?.classList.add("active");

  if (viewName === "match") {
    matchStarted = true;
    resizeGame();
  }

  if (viewName === "squad") renderSquad();
  if (viewName === "transfers") renderTransfers();
  if (viewName === "challenges") renderChallenges();
  if (viewName === "trophies") renderTrophies();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$("[data-view]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.view));
});

$$("[data-goto]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.goto));
});

// ==========================================
// SQUAD BUILDER
// ==========================================

function getPosition(index) {
  return formations[currentFormation].positions[index] || [50,50];
}

function makePlayerCard(player, index, onPitch = true) {
  const position = getPosition(index);

  if (onPitch) {
    return `
      <button class="pitch-player ${selectedPlayerId === player.id ? "selected" : ""}"
        data-player-id="${player.id}"
        style="left:${position[0]}%;top:${position[1]}%"
        aria-label="${player.name}">
        <span class="shirt"><span class="player-face">👤</span></span>
        <strong>${escapeHTML(player.name)}</strong>
        <small>${player.pos} · ${player.ovr}</small>
      </button>`;
  }

  return `
    <button class="bench-player ${selectedPlayerId === player.id ? "selected" : ""}"
      data-player-id="${player.id}">
      <span class="bench-number">${player.ovr}</span>
      <span><strong>${escapeHTML(player.name)}</strong><small>${player.pos} · ${player.flag}</small></span>
    </button>`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function renderSquad() {
  const starting = state.squad.slice(0, 11);
  const bench = state.squad.slice(11);

  $("#pitchPlayers").innerHTML = starting
    .map((player, index) => makePlayerCard(player, index))
    .join("");

  $("#benchPlayers").innerHTML = bench
    .map(player => makePlayerCard(player, 0, false))
    .join("");

  $$("[data-player-id]").forEach(button => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.playerId);

      if (swapPlayerId !== null && swapPlayerId !== id) {
        const first = state.squad.findIndex(p => p.id === swapPlayerId);
        const second = state.squad.findIndex(p => p.id === id);

        if (first >= 0 && second >= 0) {
          [state.squad[first], state.squad[second]] =
            [state.squad[second], state.squad[first]];
          toast("Игроки поменялись местами");
        }

        swapPlayerId = null;
        selectedPlayerId = id;
      } else {
        selectedPlayerId = id;
        swapPlayerId = id;
        renderPlayerDetails(state.squad.find(p => p.id === id));
      }

      saveState();
      renderSquad();
      renderFeatured();
    });
  });

  $("#formationBtn").innerHTML = `▦ <span>СХЕМА: ${formations[currentFormation].name}</span>`;
}

function renderPlayerDetails(player) {
  if (!player) return;

  const details = $("#playerDetails");

  details.innerHTML = `
    <p class="eyebrow">PLAYER PROFILE</p>
    <div class="detail-avatar">${player.flag}</div>
    <h2>${escapeHTML(player.name)}</h2>
    <p class="muted">${player.pos} · Номер ${player.num} · Рейтинг ${player.ovr}</p>
    <div class="player-stats">
      ${statHTML("PAC", player.pac)}
      ${statHTML("SHO", player.sho)}
      ${statHTML("PAS", player.pas)}
      ${statHTML("DRI", player.dri)}
      ${statHTML("DEF", player.def)}
      ${statHTML("PHY", player.phy)}
    </div>
    <button class="outline-btn full" id="createPlayerBtn">＋ СОЗДАТЬ ИГРОКА</button>`;

  $("#createPlayerBtn").addEventListener("click", () => openModal("playerModal"));
}

function statHTML(label, value) {
  return `<div class="player-stat"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderFeatured() {
  $("#featuredPlayers").innerHTML = state.squad.slice(8, 12).map(player => `
    <button class="featured-player" data-featured-id="${player.id}">
      <div class="player-art">${player.flag}</div>
      <strong>${escapeHTML(player.name)}</strong>
      <small>${player.pos} · ${player.ovr} OVR</small>
    </button>
  `).join("");

  $$("[data-featured-id]").forEach(button => {
    button.addEventListener("click", () => {
      navigate("squad");
      const player = state.squad.find(p => p.id === Number(button.dataset.featuredId));
      if (player) {
        selectedPlayerId = player.id;
        renderSquad();
        renderPlayerDetails(player);
      }
    });
  });
}

$("#formationBtn").addEventListener("click", () => {
  currentFormation = (currentFormation + 1) % formations.length;
  renderSquad();
  toast("Тактика: " + formations[currentFormation].name);
});

// ==========================================
// TRANSFERS AND PLAYER CREATOR
// ==========================================

const marketPlayers = [
  { name: "Leo Ventura", pos: "FWD", ovr: 88, price: 4500, flag: "🇦🇷", pac: 91, sho: 89, pas: 78, dri: 88, def: 31, phy: 76 },
  { name: "Daniel Okoro", pos: "MID", ovr: 84, price: 3200, flag: "🇬🇧", pac: 82, sho: 77, pas: 87, dri: 83, def: 72, phy: 78 },
  { name: "Rafael Costa", pos: "DEF", ovr: 82, price: 2800, flag: "🇧🇷", pac: 79, sho: 46, pas: 72, dri: 69, def: 86, phy: 85 },
  { name: "Ibrahim Aziz", pos: "FWD", ovr: 86, price: 3900, flag: "🇺🇿", pac: 88, sho: 86, pas: 75, dri: 84, def: 37, phy: 80 },
  { name: "Hugo Martin", pos: "GK", ovr: 80, price: 2400, flag: "🇫🇷", pac: 50, sho: 20, pas: 63, dri: 40, def: 82, phy: 78 },
  { name: "Mateo Ruiz", pos: "MID", ovr: 81, price: 2600, flag: "🇪🇸", pac: 78, sho: 74, pas: 82, dri: 80, def: 67, phy: 71 }
];

function renderTransfers() {
  $("#transferGrid").innerHTML = marketPlayers.map((player, index) => `
    <article class="transfer-card">
      <div class="transfer-art">${player.flag}</div>
      <div class="ovr-badge">${player.ovr}</div>
      <div class="position-tag">${player.pos}</div>
      <h3>${player.name}</h3>
      <p>${player.flag} · Перспективный игрок</p>
      <div class="player-attributes">
        <span>PAC ${player.pac}</span>
        <span>SHO ${player.sho}</span>
        <span>PAS ${player.pas}</span>
        <span>DRI ${player.dri}</span>
      </div>
      <div class="transfer-price">
        <strong>◆ ${player.price.toLocaleString("en-US")}</strong>
        <button class="primary-btn" data-buy="${index}">ПОДПИСАТЬ</button>
      </div>
    </article>
  `).join("");

  $$("[data-buy]").forEach(button => {
    button.addEventListener("click", () => {
      const player = marketPlayers[Number(button.dataset.buy)];

      if (state.coins < player.price) {
        toast("Недостаточно FC Coins!");
        return;
      }

      if (state.squad.some(p => p.name === player.name)) {
        toast("Этот игрок уже в твоём клубе");
        return;
      }

      setCoins(state.coins - player.price);

      state.squad.push({
        ...player,
        id: Date.now(),
        num: Math.floor(Math.random() * 90) + 10
      });

      saveState();
      renderTransfers();
      renderSquad();
      renderFeatured();
      toast(`${player.name} подписан в клуб!`);
    });
  });
}

$("#createPlayerBtn").addEventListener("click", () => openModal("playerModal"));
$("#createPlayerBtn2").addEventListener("click", () => openModal("playerModal"));

$("#playerForm").addEventListener("submit", event => {
  event.preventDefault();

  if (state.coins < 500) {
    toast("Нужно 500 FC Coins");
    return;
  }

  const name = $("#newPlayerName").value.trim();
  if (!name) return;

  const position = $("#newPlayerPos").value;
  const style = $("#newPlayerStyle").value;
  const base = style === "attack" ? 77 : style === "defense" ? 75 : 74;
  const variation = () => Math.min(95, base + Math.floor(Math.random() * 12));

  const player = {
    id: Date.now(),
    name,
    pos: position,
    num: Math.max(1, Math.min(99, Number($("#newPlayerNumber").value) || 27)),
    flag: $("#newPlayerCountry").value,
    ovr: base + Math.floor(Math.random() * 8),
    pac: variation(),
    sho: variation(),
    pas: variation(),
    dri: variation(),
    def: variation(),
    phy: variation()
  };

  setCoins(state.coins - 500);
  state.squad.push(player);
  saveState();

  $("#playerForm").reset();
  closeModal($("#playerModal"));
  renderSquad();
  renderFeatured();
  renderTransfers();

  toast(`${player.name} создан!`);
});

// ==========================================
// CLUB SETTINGS
// ==========================================

$("#clubBadge").addEventListener("click", () => openModal("clubModal"));
$("#clubNameSide").addEventListener("click", () => openModal("clubModal"));

$("#clubForm").addEventListener("submit", event => {
  event.preventDefault();

  state.club = $("#clubInput").value.trim() || "NOVA UNITED";
  state.color = $("#clubColor").value;
  state.emblem = $("#clubEmblem").value;

  applyClubStyle();
  saveState();
  closeModal($("#clubModal"));
  toast("Настройки клуба сохранены");
});

// ==========================================
// NATIONAL TEAMS AND CHALLENGES
// ==========================================

const challenges = [
  { flag: "🇺🇿", name: "Узбекистан", desc: "Выведи национальную сборную на вершину мирового футбола.", level: "СБОРНАЯ", rating: 76 },
  { flag: "🇦🇷", name: "Аргентина", desc: "Техника, характер и борьба за международный трофей.", level: "СБОРНАЯ", rating: 89 },
  { flag: "🇫🇷", name: "Франция", desc: "Собери звёздный состав и доминируй на поле.", level: "СБОРНАЯ", rating: 90 },
  { flag: "🇧🇷", name: "Бразилия", desc: "Дриблинг, скорость и атакующий футбол.", level: "СБОРНАЯ", rating: 88 },
  { flag: "🏆", name: "World Cup", desc: "Международный турнир. Пройди путь до финала.", level: "ТУРНИР", rating: 90 },
  { flag: "⭐", name: "Champions League", desc: "Проверь свой клуб против лучших соперников.", level: "КЛУБНЫЙ ТУРНИР", rating: 92 }
];

function renderChallenges() {
  $("#challengeGrid").innerHTML = challenges.map((item, index) => `
    <article class="challenge-card">
      <div class="flag">${item.flag}</div>
      <h3>${item.name}</h3>
      <p>${item.desc}</p>
      <p>${item.level} · ${item.rating} OVR</p>
      <button class="outline-btn" data-challenge="${index}">ВЫБРАТЬ ВЫЗОВ ↗</button>
    </article>
  `).join("");

  $$("[data-challenge]").forEach(button => {
    button.addEventListener("click", () => {
      const challenge = challenges[Number(button.dataset.challenge)];
      toast(`Выбран вызов: ${challenge.name}`);
      navigate("match");
      showEvent(challenge.name.toUpperCase());
    });
  });
}

// ==========================================
// TROPHIES AND LEAGUE TABLE
// ==========================================

function renderTrophies() {
  const trophies = [
    { name: "Division 3 Cup", emoji: "🏆", desc: "Первый дивизионный трофей" },
    { name: "Golden Boot", emoji: "🥇", desc: "Награда лучшему бомбардиру" },
    { name: "World Champion", emoji: "🌍", desc: "Победа на мировом уровне" },
    { name: "Club Legend", emoji: "⭐", desc: "История великого клуба" },
    { name: "Undefeated", emoji: "🛡️", desc: "Сезон без поражений" },
    { name: "Rising Star", emoji: "✨", desc: "Создай нового футбольного таланта" }
  ];

  $("#trophyGrid").innerHTML = trophies.map((trophy, index) => {
    const earned = state.trophies.includes(trophy.name) || (index === 0 && state.wins >= 3);

    return `
      <article class="trophy-card ${earned ? "earned" : ""}">
        <div class="cup">${trophy.emoji}</div>
        <h3>${trophy.name}</h3>
        <p>${trophy.desc}</p>
        <span class="earned-label">${earned ? "✓ ПОЛУЧЕНО" : "ЗАБЛОКИРОВАНО"}</span>
      </article>`;
  }).join("");

  const count = trophies.filter((trophy, index) =>
    state.trophies.includes(trophy.name) || (index === 0 && state.wins >= 3)
  ).length;

  $("#trophyCount").textContent = String(count).padStart(2, "0");
  $("#trophyTotal").textContent = String(count).padStart(2, "0");

  const clubs = [
    { name: state.club, played: state.played, wins: state.wins, points: state.wins * 3 },
    { name: "METRO CITY FC", played: 4, wins: 2, points: 7 },
    { name: "ROYAL ATHLETIC", played: 4, wins: 2, points: 6 },
    { name: "TITAN UNITED", played: 4, wins: 1, points: 4 },
    { name: "NORTH STARS", played: 4, wins: 1, points: 3 },
    { name: "RED VALLEY", played: 4, wins: 0, points: 1 }
  ].sort((a, b) => b.points - a.points);

  $("#leagueTable").innerHTML = clubs.map((club, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHTML(club.name)}</td>
      <td>${club.played}</td>
      <td>${club.wins}</td>
      <td>${Math.max(0, club.played - club.wins - 1)}</td>
      <td>${Math.max(0, club.played - club.wins)}</td>
      <td>${club.wins * 2}</td>
      <td>${club.points}</td>
    </tr>
  `).join("");
}

// ==========================================
// THREE.JS — 3D STADIUM
// ==========================================

function createMaterial(color, roughness = 0.8) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function addBox(parent, width, height, depth, color, x, y, z, material = null) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material || createMaterial(color)
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addLine(parent, x1, z1, x2, z2, color = "#e6ffe9") {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x1, 0.035, z1),
    new THREE.Vector3(x2, 0.035, z2)
  ]);

  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })
  );

  parent.add(line);
}

function makeGoal(scene, z, direction) {
  const white = createMaterial("#f5fff8", 0.45);
  const goal = new THREE.Group();

  addBox(goal, 6, .16, .16, "#f5fff8", 0, 2, 0, white);
  addBox(goal, .16, 2, .16, "#f5fff8", -3, 1, 0, white);
  addBox(goal, .16, 2, .16, "#f5fff8", 3, 1, 0, white);
  addBox(goal, 6, .06, 2.4, "#d6e9db", 0, .8, direction * 1.1);

  for (let x = -2.5; x <= 2.5; x += .5) {
    addLine(goal, x, direction * .1, x, direction * 2.2, "#d7e6da");
  }

  goal.position.z = z;
  scene.add(goal);
  return goal;
}

function makeStadium() {
  gameScene = new THREE.Scene();
  gameScene.background = new THREE.Color("#07110f");
  gameScene.fog = new THREE.Fog("#07110f", 45, 100);

  gameCamera = new THREE.PerspectiveCamera(48, 1, .1, 180);
  gameCamera.position.set(0, 23, 31);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  $("#gameCanvasWrap").prepend(renderer.domElement);

  gameScene.add(new THREE.HemisphereLight("#c7f8dc", "#0c2418", 2.0));

  const mainLight = new THREE.DirectionalLight("#ffffff", 3.0);
  mainLight.position.set(-12, 28, 12);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);
  mainLight.shadow.camera.left = -35;
  mainLight.shadow.camera.right = 35;
  mainLight.shadow.camera.top = 35;
  mainLight.shadow.camera.bottom = -35;
  gameScene.add(mainLight);

  for (const x of [-22, 22]) {
    const flood = new THREE.PointLight("#d8f7ff", 95, 48);
    flood.position.set(x, 14, 0);
    gameScene.add(flood);

    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, .3, 2.5),
      new THREE.MeshBasicMaterial({ color: "#efffff" })
    );
    lamp.position.set(x, 14, 0);
    gameScene.add(lamp);
  }

  // Ground
  addBox(gameScene, 120, .4, 120, "#101c18", 0, -.35, 0);

  // Grass field: 32 x 52
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 52),
    createMaterial("#176b3b", 1)
  );
  field.rotation.x = -Math.PI / 2;
  field.receiveShadow = true;
  gameScene.add(field);

  // Grass stripes
  for (let i = 0; i < 10; i++) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 52),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? "#1c7542" : "#155e34",
        transparent: true,
        opacity: .5
      })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(-14.4 + i * 3.2, .012, 0);
    gameScene.add(stripe);
  }

  // Field markings
  addLine(gameScene, -16, -26, 16, -26);
  addLine(gameScene, -16, 26, 16, 26);
  addLine(gameScene, -16, -26, -16, 26);
  addLine(gameScene, 16, -26, 16, 26);
  addLine(gameScene, -16, 0, 16, 0);

  const circle = new THREE.Mesh(
    new THREE.RingGeometry(4.7, 4.82, 80),
    new THREE.MeshBasicMaterial({ color: "#d8f3dc", side: THREE.DoubleSide })
  );
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = .025;
  gameScene.add(circle);

  for (const z of [-26, 26]) {
    const box = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 6),
      new THREE.MeshBasicMaterial({ color: "#c5f7d6", side: THREE.DoubleSide })
    );
    box.rotation.x = -Math.PI / 2;
    box.position.set(0, .02, z > 0 ? 22 : -22);
    gameScene.add(box);

    addLine(gameScene, -9, z > 0 ? 22 : -22, 9, z > 0 ? 22 : -22);
    addLine(gameScene, -9, z > 0 ? 22 : -22, -9, z > 0 ? 26 : -26);
    addLine(gameScene, 9, z > 0 ? 22 : -22, 9, z > 0 ? 26 : -26);
  }

  makeGoal(gameScene, -26, -1);
  makeGoal(gameScene, 26, 1);

  // Stadium stands and audience
  for (const side of [-1, 1]) {
    for (let row = 0; row < 5; row++) {
      addBox(
        gameScene,
        7,
        1.2,
        56,
        row % 2 ? "#172b2a" : "#213735",
        side * (19 + row * .9),
        .5 + row * .85,
        0
      );

      for (let i = 0; i < 75; i++) {
        const colors = ["#b7ff39", "#e4f3eb", "#31d8ff", "#d8b5ff", "#f3bc68"];
        const fan = new THREE.Mesh(
          new THREE.BoxGeometry(.18, .28, .16),
          createMaterial(colors[(i + row) % colors.length])
        );

        fan.position.set(
          side * (17 + row * .9 + Math.random() * 3),
          1.4 + row * .8 + Math.random() * .6,
          -26 + Math.random() * 52
        );

        gameScene.add(fan);
      }
    }
  }

  // Stadium advertising boards
  for (const z of [-28, 28]) {
    for (let i = 0; i < 14; i++) {
      const board = addBox(
        gameScene, 2.2, .65, .18,
        i % 2 ? "#b7ff39" : "#31d8ff",
        -14 + i * 2.15, .5, z
      );

      board.material = new THREE.MeshStandardMaterial({
        color: i % 2 ? "#b7ff39" : "#31d8ff",
        emissive: i % 2 ? "#244600" : "#00303e"
      });
    }
  }

  // Players
  playerMesh = makePlayer(state.color, "#b7835e", 10, 0, 10, true);

  const teamPositions = [
    [-7, 5], [-3, 7], [3, 7], [7, 5],
    [-8, 0], [-3, -2], [4, -1], [8, 0],
    [-5, -7], [5, -7]
  ];

  teammateMeshes = teamPositions.map((position, index) =>
    makePlayer(state.color, ["#b7835e", "#e1b58d", "#8c5c43"][index % 3],
      index + 2, position[0], position[1], false)
  );

  const opponentPositions = [
    [-7, -12], [-3, -15], [3, -15], [7, -12],
    [-9, -7], [-4, -9], [4, -9], [9, -7],
    [-5, -19], [5, -19], [0, -22]
  ];

  opponentMeshes = opponentPositions.map((position, index) =>
    makePlayer("#f2f4f0", ["#b7835e", "#e1b58d", "#8c5c43"][index % 3],
      index + 1, position[0], position[1], false)
  );

  // Ball and its shadow
  ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(.32, 20, 16),
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .4 })
  );
  ballMesh.position.set(.5, .32, 8);
  ballMesh.castShadow = true;
  gameScene.add(ballMesh);

  ballVelocity = new THREE.Vector3();

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(.38, 20),
    new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: .3 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .035;
  gameScene.add(shadow);
  ballMesh.userData.shadow = shadow;

  resizeGame();

  $("#gameLoading").classList.add("hidden");
  setTimeout(() => {
    $("#gameLoading").style.display = "none";
  }, 600);

  lastTime = performance.now();
  requestAnimationFrame(animate);
}

function makePlayer(kitColor, skinColor, number, x, z, isUser) {
  const group = new THREE.Group();
  const shirtMaterial = createMaterial(kitColor, .65);
  const skinMaterial = createMaterial(skinColor, .85);
  const shortsMaterial = createMaterial(isUser ? "#101710" : "#202a25", .9);
  const shoeMaterial = createMaterial("#e8f1e8", .7);

  // Body
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(.43, .65, 4, 8),
    shirtMaterial
  );
  torso.position.y = 1.15;
  torso.castShadow = true;
  group.add(torso);

  // Shorts
  const shorts = new THREE.Mesh(
    new THREE.BoxGeometry(.65, .35, .4),
    shortsMaterial
  );
  shorts.position.y = .65;
  group.add(shorts);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(.28, 20, 18),
    skinMaterial
  );
  head.position.y = 1.95;
  head.castShadow = true;
  group.add(head);

  // Hair
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(.29, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    createMaterial(number % 2 ? "#171713" : "#493326")
  );
  hair.position.y = 2.04;
  group.add(hair);

  // Face features: eyes and nose
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: "#171717" });

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(.035, 8, 8),
      eyeMaterial
    );
    eye.position.set(side * .09, 1.98, .25);
    group.add(eye);
  }

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(.045, 8, 8),
    skinMaterial
  );
  nose.position.set(0, 1.91, .275);
  group.add(nose);

  // Arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(.105, .48, 3, 6),
      skinMaterial
    );
    arm.position.set(side * .52, 1.35, 0);
    arm.rotation.z = side * -.15;
    group.add(arm);
  }

  // Legs and shoes
  const legs = [];

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(.12, .48, 3, 6),
      skinMaterial
    );
    leg.position.set(side * .2, .4, 0);
    group.add(leg);
    legs.push(leg);

    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(.2, .11, .34),
      shoeMaterial
    );
    shoe.position.set(side * .2, .12, .1);
    group.add(shoe);
  }

  // Jersey number
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.font = "bold 66px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(number), 64, 66);

  const texture = new THREE.CanvasTexture(canvas);
  const numberMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(.35, .35),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  );
  numberMesh.position.set(0, 1.4, .43);
  group.add(numberMesh);

  group.position.set(x, 0, z);
  group.userData = {
    isUser,
    legs,
    baseX: x,
    baseZ: z
  };

  gameScene.add(group);
  return group;
}

function resizeGame() {
  if (!renderer || !gameCamera) return;

  const container = $("#gameCanvasWrap");
  const width = container.clientWidth;
  const height = container.clientHeight;

  if (!width || !height) return;

  renderer.setSize(width, height);
  gameCamera.aspect = width / height;
  gameCamera.updateProjectionMatrix();
}

// ==========================================
// MATCH CONTROLS AND GAME LOOP
// ==========================================

function animate(now) {
  requestAnimationFrame(animate);

  if (!renderer || !gameScene) return;

  const delta = Math.min((now - lastTime) / 1000, .04);
  lastTime = now;

  if (matchRunning && matchStarted && playerMesh) {
    let dx = 0;
    let dz = 0;

    if (keys.KeyW || keys.ArrowUp) dz -= 1;
    if (keys.KeyS || keys.ArrowDown) dz += 1;
    if (keys.KeyA || keys.ArrowLeft) dx -= 1;
    if (keys.KeyD || keys.ArrowRight) dx += 1;

    const magnitude = Math.hypot(dx, dz) || 1;
    const sprint = keys.ShiftLeft || keys.ShiftRight;
    const speed = (sprint ? 8 : 5) * delta;

    playerMesh.position.x = THREE.MathUtils.clamp(
      playerMesh.position.x + dx / magnitude * speed, -15, 15
    );
    playerMesh.position.z = THREE.MathUtils.clamp(
      playerMesh.position.z + dz / magnitude * speed, -25, 25
    );

    if (dx || dz) {
      playerMesh.rotation.y = Math.atan2(dx, -dz);

      playerMesh.userData.legs.forEach((leg, index) => {
        leg.rotation.x = Math.sin(now * .014 + index * Math.PI) * .55;
      });
    } else {
      playerMesh.userData.legs.forEach(leg => {
        leg.rotation.x *= .8;
      });
    }

    // Ball follows the player while nearby
    const distance = playerMesh.position.distanceTo(ballMesh.position);

    if (distance < 1.5 && ballVelocity.length() < 1) {
      ballMesh.position.x += (playerMesh.position.x - ballMesh.position.x) * .15;
      ballMesh.position.z += (playerMesh.position.z - ballMesh.position.z) * .15;
    }

    // Opponent AI movement
    opponentMeshes.forEach((opponent, index) => {
      const targetX = index % 2 === 0
        ? playerMesh.position.x * .25
        : opponent.userData.baseX;

      const targetZ = playerMesh.position.z < 0
        ? -8 - (index % 4) * 2
        : -3 - (index % 4) * 2;

      opponent.position.x += (targetX - opponent.position.x) * delta * .8;
      opponent.position.z += (targetZ - opponent.position.z) * delta * .8;
    });

    // Teammates move slightly to create activity
    teammateMeshes.forEach((teammate, index) => {
      teammate.position.x = teammate.userData.baseX + Math.sin(now * .0006 + index) * .7;
      teammate.position.z = teammate.userData.baseZ + Math.cos(now * .0005 + index) * .4;
    });

    // Follow camera
    gameCamera.position.x += (playerMesh.position.x * .18 - gameCamera.position.x) * delta * 1.5;
    gameCamera.position.z += (24 + playerMesh.position.z * .22 - gameCamera.position.z) * delta * 1.3;
    gameCamera.lookAt(playerMesh.position.x * .22, 0, playerMesh.position.z * .35);
  }

  // Ball movement and friction
  if (ballMesh && ballVelocity) {
    ballMesh.position.addScaledVector(ballVelocity, delta);
    ballVelocity.multiplyScalar(Math.pow(.94, delta * 60));

    if (ballMesh.position.y > .32) {
      ballMesh.position.y -= delta * 2;
      if (ballMesh.position.y < .32) ballMesh.position.y = .32;
    }

    ballMesh.position.x = THREE.MathUtils.clamp(ballMesh.position.x, -16, 16);
    ballMesh.position.z = THREE.MathUtils.clamp(ballMesh.position.z, -27, 27);

    if (ballMesh.userData.shadow) {
      ballMesh.userData.shadow.position.x = ballMesh.position.x;
      ballMesh.userData.shadow.position.z = ballMesh.position.z;
    }
  }

  renderer.render(gameScene, gameCamera);
  drawMiniMap();
}

function drawMiniMap() {
  const canvas = $("#miniMap");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#17452d";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "#c9e7d1";
  context.lineWidth = 1;
  context.strokeRect(4, 4, width - 8, height - 8);

  context.beginPath();
  context.moveTo(width / 2, 4);
  context.lineTo(width / 2, height - 4);
  context.stroke();

  context.beginPath();
  context.arc(width / 2, height / 2, 11, 0, Math.PI * 2);
  context.stroke();

  function dot(x, z, color, radius = 2) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(
      width / 2 + x / 34 * (width - 12),
      height / 2 + z / 52 * (height - 12),
      radius, 0, Math.PI * 2
    );
    context.fill();
  }

  if (playerMesh) dot(playerMesh.position.x, playerMesh.position.z, "#b7ff39", 3);
  teammateMeshes.forEach(player => dot(player.position.x, player.position.z, "#b7ff39", 2));
  opponentMeshes.forEach(player => dot(player.position.x, player.position.z, "#f1f4ef", 2));
  if (ballMesh) dot(ballMesh.position.x, ballMesh.position.z, "#31d8ff", 2);
}

function kickBall(power = 1) {
  if (!playerMesh || !ballMesh || !ballVelocity) return;

  const distance = playerMesh.position.distanceTo(ballMesh.position);

  if (distance > 3.5) {
    showEvent("ПОДОЙДИ К МЯЧУ");
    return;
  }

  const direction = playerMesh.rotation.y;
  const forwardX = Math.sin(direction);
  const forwardZ = -Math.cos(direction);

  ballMesh.position.x = playerMesh.position.x + forwardX * 1.2;
  ballMesh.position.z = playerMesh.position.z + forwardZ * 1.2;
  ballMesh.position.y = .32;

  ballVelocity.set(
    forwardX * power * 13,
    power * 2.5,
    forwardZ * power * 13
  );

  const goalDirection = playerMesh.position.z < 0 ? -1 : 1;
  const goalChance =
    Math.abs(ballMesh.position.x) < 3.5 &&
    ((goalDirection < 0 && forwardZ < 0) ||
     (goalDirection > 0 && forwardZ > 0));

  playTone(130 + power * 90, .14, "triangle");

  if (goalChance && power > .65) {
    homeScore++;
    state.goals++;
    setCoins(state.coins + 250);

    $("#homeScore").textContent = homeScore;
    $("#goals").textContent = state.goals;

    showEvent("ГООООЛ!");
    playTone(600, .3, "triangle");
    setTimeout(() => playTone(820, .35, "triangle"), 130);

    ballMesh.position.set(0, .32, 8);
    ballVelocity.set(0, 0, 0);
    playerMesh.position.set(0, 0, 10);

    saveState();
  }
}

function passBall(through = false) {
  if (!playerMesh || !ballMesh || !ballVelocity) return;

  if (playerMesh.position.distanceTo(ballMesh.position) > 3.5) {
    showEvent("ПОДОЙДИ К МЯЧУ");
    return;
  }

  const teammate = teammateMeshes.reduce((best, player) =>
    playerMesh.position.distanceTo(player.position) <
    playerMesh.position.distanceTo(best.position) ? player : best,
    teammateMeshes[0]
  );

  ballMesh.position.x = teammate.position.x;
  ballMesh.position.z = teammate.position.z + (through ? -3 : 0);
  ballVelocity.set(0, 0, 0);

  playTone(through ? 260 : 190, .1);
  showEvent(through ? "ПАС ВРАЗРЕЗ" : "ПАС!");
}

window.addEventListener("keydown", event => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }

  keys[event.code] = true;

  if (event.code === "Space" && !event.repeat) {
    charging = true;
    shotCharge = 0;
  }

  if (event.code === "KeyU" && !event.repeat) passBall(false);
  if (event.code === "KeyJ" && !event.repeat) passBall(true);

  if (event.code === "KeyI" && !event.repeat) {
    kickBall(.7);
    showEvent("НАВЕС!");
  }
});

window.addEventListener("keyup", event => {
  keys[event.code] = false;

  if (event.code === "Space" && charging) {
    charging = false;
    kickBall(Math.max(.35, Math.min(1.5, .45 + shotCharge)));
    shotCharge = 0;
    $("#shotPower").style.width = "0%";
  }
});

// Charge bar
function powerLoop() {
  if (charging) {
    shotCharge = Math.min(1.5, shotCharge + .015);
    $("#shotPower").style.width = `${shotCharge / 1.5 * 100}%`;
  }

  requestAnimationFrame(powerLoop);
}

// Match clock: 90 virtual minutes over approximately 3 real minutes
setInterval(() => {
  if (!$("#view-match").classList.contains("active") || !matchRunning || !matchStarted) return;

  matchSeconds++;

  const virtualMinutes = Math.floor(matchSeconds / 2);
  const seconds = (matchSeconds % 2) * 30;

  $("#matchClock").textContent =
    `${String(virtualMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  if (matchSeconds >= 180) finishMatch();
}, 1000);

function finishMatch() {
  matchRunning = false;
  state.played++;
  showEvent("КОНЕЦ МАТЧА");

  if (homeScore > awayScore) {
    state.wins++;
    setCoins(state.coins + 1200);
    toast("Победа! +1,200 FC Coins");

    if (state.wins >= 3 && !state.trophies.includes("Division 3 Cup")) {
      state.trophies.push("Division 3 Cup");
      showEvent("НОВЫЙ ТРОФЕЙ!");
      toast("Ты получил Division 3 Cup!");
    }
  } else {
    toast("Матч завершён. Попробуй ещё раз!");
  }

  $("#wins").innerHTML = `${state.wins} <em>/ 12</em>`;
  saveState();
  renderTrophies();
}

$("#pauseBtn").addEventListener("click", () => {
  matchRunning = !matchRunning;
  $("#pauseBtn").textContent = matchRunning ? "Ⅱ ПАУЗА" : "▶ ПРОДОЛЖИТЬ";
  toast(matchRunning ? "Матч продолжен" : "Матч на паузе");
});

$("#restartBtn").addEventListener("click", () => {
  homeScore = 0;
  awayScore = 0;
  matchSeconds = 0;
  matchRunning = true;
  matchStarted = true;

  $("#homeScore").textContent = "0";
  $("#awayScore").textContent = "0";
  $("#matchClock").textContent = "00:00";
  $("#pauseBtn").textContent = "Ⅱ ПАУЗА";

  if (playerMesh) playerMesh.position.set(0, 0, 10);
  if (ballMesh) ballMesh.position.set(.5, .32, 8);
  if (ballVelocity) ballVelocity.set(0, 0, 0);

  showEvent("МАТЧ НАЧАЛСЯ");
  toast("Новый матч начался");
});

$("#soundBtn").addEventListener("click", () => {
  soundOn = !soundOn;
  $("#soundBtn").textContent = soundOn ? "♫ SOUND ON" : "♫ SOUND OFF";
  if (soundOn) playTone(440, .1);
});

// ==========================================
// STARTUP
// ==========================================

function init() {
  applyClubStyle();

  $("#wins").innerHTML = `${state.wins} <em>/ 12</em>`;
  $("#goals").textContent = state.goals;

  renderSquad();
  renderFeatured();
  renderTransfers();
  renderChallenges();
  renderTrophies();

  try {
    makeStadium();
    powerLoop();
  } catch (error) {
    console.error("Ошибка Three.js:", error);
    $("#gameLoading").innerHTML = `
      <strong>3D ENGINE НЕ ЗАГРУЗИЛСЯ</strong>
      <small>Проверь интернет, WebGL и поддержку браузера.</small>`;
  }
}

window.addEventListener("resize", resizeGame);
window.addEventListener("beforeunload", saveState);

init();