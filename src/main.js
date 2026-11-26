import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { StatusBar } from "@capacitor/status-bar";

(() => {

  const LEVELS = [
    {
      level: 1,
      name: "Livello 1",
      description: "Griglia 3 × 3 (9 tasselli)."
    },
    {
      level: 2,
      name: "Livello 2",
      description: "Griglia 3 × 4 o 4 × 3 (12 tasselli)."
    },
    {
      level: 3,
      name: "Livello 3",
      description: "Griglia 4 × 4 (16 tasselli)."
    },
    {
      level: 4,
      name: "Livello 4",
      description: "Griglia 4 × 5 o 5 × 4 (20 tasselli)."
    },
    {
      level: 5,
      name: "Livello 5",
      description: "Griglia 5 × 5 (25 tasselli)."
    },
    {
      level: 6,
      name: "Livello 6",
      description: "Griglia 5 × 6 o 6 × 5 (30 tasselli)."
    },
    {
      level: 7,
      name: "Livello 7",
      description: "Griglia 5 × 7 o 7 × 5 (35 tasselli)."
    }
  ];

  /*
   * Chiave per la v1.20 (con fallback di ripristino per versioni precedenti).
   */
  const STORAGE_KEY = "puzzleMagic_autosave_v120";
  const PREV_STORAGE_KEY_V119 = "puzzleMagic_autosave_v119";
  const PREV_STORAGE_KEY_V118 = "puzzleMagic_autosave_v118";
  const PREV_STORAGE_KEY_V117 = "puzzleMagic_autosave_v117";
  const PREV_STORAGE_KEY_V116 = "puzzleMagic_autosave_v116";
  const PREV_STORAGE_KEY = "puzzleMagic_autosave_v115";
  const PREV_STORAGE_KEY_V114 = "puzzleMagic_autosave_v114";
  const PREV_STORAGE_KEY_V113 = "puzzleMagic_autosave_v113";

  function getHeroDataUrl(index, fallback) {
    try {
      if (typeof window !== "undefined" && window.HERO_DATA_URLS && window.HERO_DATA_URLS[index]) {
        return window.HERO_DATA_URLS[index];
      }
    } catch (_) {}
    return fallback;
  }

  function resolveHeroUrl(relPath) {
    if (!relPath) return "";
    if (relPath.startsWith("data:") || relPath.startsWith("blob:")) {
      return relPath;
    }
    try {
      const clean = relPath.replace(/^\.?\//, "");
      return new URL(clean, document.baseURI || window.location.href).href;
    } catch (_) {
      return relPath;
    }
  }

  const HEROES = [
    {
      name: "Spider-Man",
      tagline: "L'amichevole eroe di quartiere",
      type: "spiderman",
      glow: "#fee2e2",
      accent: "#ef4444",
      dark: "#1e3a8a",
      power: "Senso di ragno & ragnatele",
      image: getHeroDataUrl(0, "./assets/aistudio/Livello_1_d004bcb3.jpg"),
      objectPosition: "center center"
    },
    {
      name: "Venom",
      tagline: "La potenza del costume simbiotico",
      type: "symbiote",
      glow: "#ccfbf1",
      accent: "#0d9488",
      dark: "#042f2e",
      power: "Energia oscura & super riflessi",
      image: getHeroDataUrl(1, "./assets/aistudio/Livello_2_a50f1e7a.jpg"),
      objectPosition: "center 25%"
    },
    {
      name: "Batman",
      tagline: "Il Cavaliere Oscuro di Gotham",
      type: "batman",
      glow: "#fef3c7",
      accent: "#eab308",
      dark: "#0f172a",
      power: "Intelligenza tattica & bat-gadget",
      image: getHeroDataUrl(2, "./assets/aistudio/Livello_3_0edbdf4e.jpg"),
      objectPosition: "center 20%"
    },
    {
      name: "Superman",
      tagline: "L'Uomo d'Acciaio di Metropolis",
      type: "superman",
      glow: "#dbeafe",
      accent: "#3b82f6",
      dark: "#dc2626",
      power: "Super forza solare & volo",
      image: getHeroDataUrl(3, "./assets/aistudio/Livello_4_2ea5ea85.jpg"),
      objectPosition: "center 25%"
    }
  ];

  /* Precaricamento e decodifica anticipata nel DOM per eliminare lag a fine livello (v. 1.23) */
window._preloadedHeroImgs = [];
const heroBlobCache = new Map();
const heroStageImgs = new Map();
let trainingCelebrationImg = null;
let trainingCelebrationUrl = "";

function getTrainingCandidateUrls(){
  const rawList = [
    "./assets/aistudio/training_celebration.jpg",
    "/assets/aistudio/training_celebration.jpg",
    "./public/assets/aistudio/training_celebration.jpg"
  ];
  const seen = new Set();
  const out = [];
  rawList.forEach(item => {
    const resolved = resolveHeroUrl(item);
    if(resolved && !seen.has(resolved)){
      seen.add(resolved);
      out.push(resolved);
    }
  });
  return out;
}

function getHeroCandidateUrls(heroIdx){
  const hero = HEROES[heroIdx];
  if(!hero) return [];
  const rawList = [
    getHeroDataUrl(heroIdx, ""),
    hero.image,
    "/" + String(hero.image || "").replace(/^\.?\//, ""),
    "./public/" + String(hero.image || "").replace(/^\.?\//, "")
  ].filter(Boolean);
  const seen = new Set();
  const out = [];
  rawList.forEach(item => {
    const resolved = resolveHeroUrl(item);
    if(resolved && !seen.has(resolved)){
      seen.add(resolved);
      out.push(resolved);
    }
  });
  return out;
}

function initPreloadedHeroElements(){
  const stageEl = document.getElementById("heroStage");
  HEROES.forEach((h, idx) => {
    const candidates = getHeroCandidateUrls(idx);
    if(!candidates.length) return;
    const preImg = document.createElement("img");
    preImg.className = "hero-photo-pre";
    preImg.alt = h.name;
    preImg.decoding = "sync";
    preImg.loading = "eager";
    try { preImg.fetchPriority = "high"; } catch(_){}
    preImg.style.objectFit = "cover";
    preImg.style.objectPosition = idx === 0 ? "center center" : (h.objectPosition || "center top");

    let candIdx = 0;
    const tryLoadCandidate = () => {
      if(candIdx >= candidates.length) return;
      preImg.src = candidates[candIdx++];
    };
    preImg.addEventListener("error", tryLoadCandidate);
    preImg.addEventListener("load", () => {
      heroBlobCache.set(idx, preImg.currentSrc || preImg.src);
      if(preImg.decode){
        preImg.decode().catch(() => {});
      }
    });
    tryLoadCandidate();

    if(stageEl){
      stageEl.appendChild(preImg);
    }
    heroStageImgs.set(idx, preImg);
    window._preloadedHeroImgs.push(preImg);
  });

  // Precarica anche l'immagine di celebrazione per i primi 3 livelli con fallback multipli
  const trainCandidates = getTrainingCandidateUrls();
  if(trainCandidates.length){
    const trainImg = document.createElement("img");
    trainImg.className = "hero-photo-pre";
    trainImg.alt = "Livello completato";
    trainImg.decoding = "sync";
    trainImg.loading = "eager";
    try { trainImg.fetchPriority = "high"; } catch(_){}
    trainImg.style.objectFit = "cover";
    trainImg.style.objectPosition = "center center";

    let tIdx = 0;
    const tryNextTrain = () => {
      if(tIdx >= trainCandidates.length) return;
      trainImg.src = trainCandidates[tIdx++];
    };
    trainImg.addEventListener("error", tryNextTrain);
    trainImg.addEventListener("load", () => {
      trainingCelebrationUrl = trainImg.currentSrc || trainImg.src;
      if(trainImg.decode){
        trainImg.decode().catch(() => {});
      }
    });
    tryNextTrain();

    if(stageEl){
      stageEl.appendChild(trainImg);
    }
    trainingCelebrationImg = trainImg;
    window._preloadedHeroImgs.push(trainImg);
  }
}

try {
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initPreloadedHeroElements, { once: true });
  } else {
    initPreloadedHeroElements();
  }
} catch (_) {}

  const $ = id => document.getElementById(id);

  /* Elementi della Schermata Principale (v. 1.24) */
  const homeView = $("homeView");
  const levelsGrid = $("levelsGrid");
  const uploadPhotoBtn = $("uploadPhotoBtn");
  const cropPreviewBox = $("cropPreviewBox");
  const cropEmptyMessage = $("cropEmptyMessage");
  const cropSourceImg = $("cropSourceImg");
  const cropSelectionFrame = $("cropSelectionFrame");
  const cropGridOverlay = $("cropGridOverlay");
  const cropZoomSlider = $("cropZoomSlider");
  const cropZoomResetBtn = $("cropZoomResetBtn");
  const cropCenterBtn = $("cropCenterBtn");
  const homePlayBtn = $("homePlayBtn");
  const openRecordsBtn = $("openRecordsBtn");
  const appExitBtn = $("appExitBtn");

  /* Modale Nome Giocatore con Tastiera Virtuale (v. 1.28) */
  const playerNameOverlay = $("playerNameOverlay");
  const playerNameCloseBtn = $("playerNameCloseBtn");
  const playerNameDisplay = $("playerNameDisplay");
  const playerNameTip = $("playerNameTip");
  const virtualKeyboardLetters = $("virtualKeyboardLetters");
  const vkBackspaceBtn = $("vkBackspaceBtn");
  const vkSpaceBtn = $("vkSpaceBtn");
  const vkOkBtn = $("vkOkBtn");

  /* Modale Record & Reset Classifiche (v. 1.28) */
  const recordsOverlay = $("recordsOverlay");
  const recordsCrest = $("recordsCrest");
  const recordsInfoBtn = $("recordsInfoBtn");
  const recordsInfoPopover = $("recordsInfoPopover");
  const recordsCloseBtn = $("recordsCloseBtn");
  const recordsLevelHeading = $("recordsLevelHeading");
  const recordsLevelTabs = $("recordsLevelTabs");
  const recordsPodiumStage = $("recordsPodiumStage");
  const recordsLevelList = $("recordsLevelList");
  const recordsPinOverlay = $("recordsPinOverlay");
  const recordsPinBoxes = $("recordsPinBoxes");
  const recordsPinError = $("recordsPinError");
  const recordsPinCancelBtn = $("recordsPinCancelBtn");
  const recordsResetOverlay = $("recordsResetOverlay");
  const recordsResetMenuPanel = $("recordsResetMenuPanel");
  const resetLevelPicker = $("resetLevelPicker");
  const resetLevelBtn = $("resetLevelBtn");
  const resetAllLevelsBtn = $("resetAllLevelsBtn");
  const resetSessionBtn = $("resetSessionBtn");
  const resetAllBtn = $("resetAllBtn");
  const resetCancelBtn = $("resetCancelBtn");
  const recordsResetConfirmPanel = $("recordsResetConfirmPanel");
  const recordsResetConfirmText = $("recordsResetConfirmText");
  const resetConfirmBackBtn = $("resetConfirmBackBtn");
  const resetConfirmExecBtn = $("resetConfirmExecBtn");

  /* Modale Ritaglio / Zoom Nuovo Livello (v. 1.24) */
  const nextLevelCropOverlay = $("nextLevelCropOverlay");
  const nextCropBadge = $("nextCropBadge");
  const nlCropPreviewBox = $("nlCropPreviewBox");
  const nlCropSourceImg = $("nlCropSourceImg");
  const nlCropSelectionFrame = $("nlCropSelectionFrame");
  const nlCropGridOverlay = $("nlCropGridOverlay");
  const nlCropZoomSlider = $("nlCropZoomSlider");
  const nlCropZoomResetBtn = $("nlCropZoomResetBtn");
  const nlCropCenterBtn = $("nlCropCenterBtn");
  const nlCropCancelBtn = $("nlCropCancelBtn");
  const nlCropConfirmBtn = $("nlCropConfirmBtn");

  /* Finestra Galleria Foto Interna (v. 1.26) */
  const galleryOverlay = $("galleryOverlay");
  const galleryQuotaLabel = $("galleryQuotaLabel");
  const galleryCloseBtn = $("galleryCloseBtn");
  const galleryAddPhotoBtn = $("galleryAddPhotoBtn");
  const galleryCancelSelectBtn = $("galleryCancelSelectBtn");
  const galleryDeleteSelectedBtn = $("galleryDeleteSelectedBtn");
  const galleryLimitAlert = $("galleryLimitAlert");
  const galleryScrollBody = $("galleryScrollBody");
  const galleryDeleteConfirmOverlay = $("galleryDeleteConfirmOverlay");
  const galleryDeleteConfirmTitle = $("galleryDeleteConfirmTitle");
  const galleryDeleteConfirmText = $("galleryDeleteConfirmText");
  const cancelGalleryDeleteBtn = $("cancelGalleryDeleteBtn");
  const confirmGalleryDeleteBtn = $("confirmGalleryDeleteBtn");

  /* Elementi di Gioco a Schermo Intero */
  const board = $("board");
  const boardWrap = board ? board.parentElement : null;
  const boardPauseVeil = $("boardPauseVeil");
  const photoInput = $("photoInput");
  const newPhotoBtn = $("newPhotoBtn");
  const restartLevelBtn = $("restartLevelBtn");
  const restartConfirmOverlay = $("restartConfirmOverlay");
  const confirmRestartBtn = $("confirmRestartBtn");
  const cancelRestartBtn = $("cancelRestartBtn");

  const mixBtn = $("mixBtn");
  const previewTile = $("previewTile");
  const previewZoomStage = $("previewZoomStage");
  const previewResetBtn = $("previewResetBtn");
  const previewBtn = previewTile || $("previewBtn");
  const gamePanel = $("gamePanel");
  const fullscreenToggleBtn = $("fullscreenToggleBtn");
  const fullscreenExitBtn = $("fullscreenExitBtn");

  /* Controlli top bar Schermo Intero Verticale e Orizzontale */
  const fsPortraitTopBar = $("fsPortraitTopBar");
  const fsPortraitHelpBtn = $("fsPortraitHelpBtn");
  const fsPortraitHelpToggleState = $("fsPortraitHelpToggleState");
  const fsPortraitMixBtn = $("fsPortraitMixBtn");
  const fsPortraitExitBtn = $("fsPortraitExitBtn");
  const fsLandscapeTopBar = $("fsLandscapeTopBar");
  const fsLandscapeMixBtn = $("fsLandscapeMixBtn");
  const fsLandscapeExitBtn = $("fsLandscapeExitBtn");
  const fullscreenPortraitThumb = $("fullscreenPortraitThumb");

  /* Dialog Uscita Partita & Applicazione (ESCI) */
  const exitConfirmOverlay = $("exitConfirmOverlay");
  const confirmExitBtn = $("confirmExitBtn");
  const cancelExitBtn = $("cancelExitBtn");
  const appExitConfirmOverlay = $("appExitConfirmOverlay");
  const confirmAppExitBtn = $("confirmAppExitBtn");
  const cancelAppExitBtn = $("cancelAppExitBtn");
  const appExitedOverlay = $("appExitedOverlay");
  const reopenAppBtn = $("reopenAppBtn");

  const closePreviewBtn = $("closePreviewBtn");

  const previewOverlay = $("previewOverlay");
  const winOverlay = $("winOverlay");
  const actionChoiceOverlay = $("actionChoiceOverlay");
  const actionNewPhotoBtn = $("actionNewPhotoBtn");
  const actionCancelBtn = $("actionCancelBtn");
  const levelChoiceOverlay = $("levelChoiceOverlay");

  const levelChoiceGrid = $("levelChoiceGrid");
  const confirmLevelBtn = $("confirmLevelBtn");
  const cancelLevelChoiceBtn = $("cancelLevelChoiceBtn");

  const levelValue = $("levelValue");
  const difficultyValue = $("difficultyValue");
  const movesValue = $("movesValue");
  const timerValue = $("timerValue");
  const timerPauseBtn = $("timerPauseBtn");
  const pauseBtnIcon = $("pauseBtnIcon");
  const formatBadge = $("formatBadge");

  const soundToggleBtn = $("soundToggleBtn");
  const soundIcon = $("soundIcon");
  const toggleCorrectBtn = $("toggleCorrectBtn");
  const toggleStateLabel = $("toggleStateLabel");
  const formatChoiceGrid = $("formatChoiceGrid");
  const winStatsSummary = $("winStatsSummary");
  const winScoreWidget = $("winScoreWidget");
  const winActionsTop = $("winActionsTop");
  const winExitBtn = $("winExitBtn");
  const homeLevelRecord = $("homeLevelRecord");

  const gameSummaryOverlay = $("gameSummaryOverlay");
  const summaryTop3Banner = $("summaryTop3Banner");
  const summaryPlayerSub = $("summaryPlayerSub");
  const summaryStatsGrid = $("summaryStatsGrid");
  const summaryMedalsList = $("summaryMedalsList");
  const summaryExitBtn = $("summaryExitBtn");
  const summaryRecordsBtn = $("summaryRecordsBtn");

  const heroStage = $("heroStage");
  const heroPhoto = $("heroPhoto");
  const winParticlesCanvas = $("winParticlesCanvas");
  const screenTransitionCurtain = $("screenTransitionCurtain");
  const heroArt = $("heroArt");
  const heroRank = $("heroRank");
  const heroName = $("heroName");
  const heroTagline = $("heroTagline");

  const levelIndicators = $("levelIndicators");
  const gameTitle = $("gameTitle");
  const levelDescription = $("levelDescription");
  const gameStatus = $("gameStatus");
  const hint = $("hint");

  let levelIndex = 0;
  let photoData = null;
  let rawPhotoUrl = "";
  let pieces = [];
  let moves = 0;

  let mixed = false;
  let locked = false;
  let gameCompleted = false;
  let selectedTile = null;
  let activeDrag = null;

  let suppressClickUntil = 0;
  let lastStorageWarning = false;
  let activeOverlay = "";

  let photoLoadMode = "newGame";
  let selectedStartLevel = 0;
  let inGameSession = false;

  /*
   * Gestione selezione livello, ritaglio e zoom foto (v. 1.24)
   */
  let selectedLevel = 0; // 0..6
  let isPortraitPhoto = false;
  let cropZoom = 1;
  let cropPanX = 0;
  let cropPanY = 0;
  let cropPanRatioX = 0;
  let cropPanRatioY = 0;
  let isPanningCrop = false;
  let startCropPointerX = 0;
  let startCropPointerY = 0;
  let initialCropPanX = 0;
  let initialCropPanY = 0;
  let frameDims = { left: 0, top: 0, width: 100, height: 100 };
  let imgScaledDims = { width: 100, height: 100, scale: 1 };

  /*
   * Stato ritaglio foto per livello successivo da "Cambia foto" (v. 1.24)
   */
  let nlCropTargetLevel = 0;
  let nlCropPhotoUrl = "";
  let nlIsPortraitPhoto = false;
  let nlCropZoom = 1;
  let nlCropPanX = 0;
  let nlCropPanY = 0;
  let nlCropPanRatioX = 0;
  let nlCropPanRatioY = 0;
  let nlRestoreWinOnCancel = false;

  /*
   * Stato Galleria Foto Interna (v. 1.24)
   */
  const DEFAULT_HOME_PHOTO = "./assets/gallery/amalfi_coast.jpg";
  const STARTER_GALLERY_ITEMS = [
    { id: "starter_amalfi", url: "./assets/gallery/amalfi_coast.jpg", daysAgo: 0 },
    { id: "starter_alpine", url: "./assets/gallery/alpine_lake.jpg", daysAgo: 0 },
    { id: "starter_nebula", url: "./assets/gallery/cosmic_nebula.jpg", daysAgo: 1 },
    { id: "starter_botanical", url: "./assets/gallery/botanical_bloom.jpg", daysAgo: 2 }
  ];
  const GALLERY_DB_NAME = "puzzleMagic_gallery_db";
  const GALLERY_DB_VERSION = 1;
  const GALLERY_STORE_NAME = "photos";
  const GALLERY_SEEDED_KEY = "puzzleMagic_gallerySeeded_v1";
  const GALLERY_MAX_BYTES = 75 * 1024 * 1024;
  let galleryMode = "home"; // "home" | "nextLevel"
  let galleryTargetLevel = 0;
  let galleryRestoreWinOnCancel = false;
  let galleryBusy = false;
  let gallerySelectionMode = false;
  const gallerySelectedIds = new Set();
  let galleryLongPressTimer = null;
  let suppressGalleryClickUntil = 0;

  /*
   * Sistema Punteggio, Classifiche Top 3 e Sessione (v. 1.24)
   */
  const RECORDS_STORAGE_KEY = "puzzleMagic_records_v1";
  const LEADERBOARDS_STORAGE_KEY = "puzzleMagic_leaderboards_v1";
  const PLAYER_NAME_STORAGE_KEY = "puzzleMagic_playerName_v1";
  const MAX_RECORD_NAME_LEN = 12;
  const LATIN_LETTER_ROWS = [
    ["A", "B", "C", "D", "E", "F", "G"],
    ["H", "I", "J", "K", "L", "M", "N"],
    ["O", "P", "Q", "R", "S", "T", "U"],
    ["V", "W", "X", "Y", "Z"]
  ];

  let lastWinScore = null;
  let lastWinIsNewRecord = false;
  let lastWinRank = null;
  let levelRecords = {};
  try {
    const parsedRec = JSON.parse(localStorage.getItem(RECORDS_STORAGE_KEY) || "{}");
    if(parsedRec && typeof parsedRec === "object") levelRecords = parsedRec;
  } catch(_) { levelRecords = {}; }

  let levelLeaderboards = {};
  let sessionLeaderboard = [];
  try {
    const parsedLb = JSON.parse(localStorage.getItem(LEADERBOARDS_STORAGE_KEY) || "{}");
    if(parsedLb && typeof parsedLb === "object"){
      if(parsedLb.levels && typeof parsedLb.levels === "object") levelLeaderboards = parsedLb.levels;
      if(Array.isArray(parsedLb.sessions)) sessionLeaderboard = parsedLb.sessions;
    }
  } catch(_) {
    levelLeaderboards = {};
    sessionLeaderboard = [];
  }

  // Migrazione automatica dei vecchi record singoli in Top 3 per ciascun livello
  Object.keys(levelRecords).forEach(lvlKey => {
    const legacy = levelRecords[lvlKey];
    if(legacy && typeof legacy === "object" && typeof legacy.score === "number"){
      if(!Array.isArray(levelLeaderboards[lvlKey]) || levelLeaderboards[lvlKey].length === 0){
        levelLeaderboards[lvlKey] = [{
          score: legacy.score,
          name: String(legacy.name || "Giocatore").slice(0, MAX_RECORD_NAME_LEN),
          date: legacy.date || "",
          timestamp: legacy.timestamp || 0,
          moves: legacy.moves || 0,
          time: legacy.time || 0
        }];
      }
    }
  });
  // Mantiene in memoria esclusivamente i primi 3 punteggi per ciascuna classifica
  Object.keys(levelLeaderboards).forEach(lvlKey => {
    if(Array.isArray(levelLeaderboards[lvlKey])){
      levelLeaderboards[lvlKey] = levelLeaderboards[lvlKey]
        .filter(item => item && typeof item.score === "number")
        .sort((a, b) => (b.score - a.score) || ((a.timestamp || 0) - (b.timestamp || 0)))
        .slice(0, 3);
    }
  });
  sessionLeaderboard = sessionLeaderboard
    .filter(item => item && typeof item.score === "number")
    .sort((a, b) => (b.score - a.score) || ((a.timestamp || 0) - (b.timestamp || 0)))
    .slice(0, 3);

  let savedPlayerName = (localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || "").slice(0, MAX_RECORD_NAME_LEN);
  let currentPlayerName = savedPlayerName;
  let playerNameBuffer = "";
  let playerNameCursorPos = 0;
  let playerNameCaretVisible = false;
  let currentSessionScore = 0;
  let currentSessionLevelsCleared = 0;
  let currentSessionMoves = 0;
  let currentSessionTime = 0;
  let currentSessionDetails = [];
  let lastSessionRank = null;
  let sessionFinalized = false;
  let recordsViewLevel = 0;

  /*
   * Nuove funzionalità v1.09
   */
  let selectedFormat = "auto";
  let currentAspectRatio = "1:1";
  let showNumbers = false;
  let showCorrect = true;

  let timerSeconds = 0;
  let timerInterval = null;
  let timerRunning = false;
  let isPaused = false;
  let isFullscreen = false;
  let pendingWinTimer = null;

  function clearPendingWinReveal(){
    if(pendingWinTimer){
      clearTimeout(pendingWinTimer);
      pendingWinTimer = null;
    }
  }

  let soundEnabled = localStorage.getItem("puzzleMagic_sound") !== "off";
  let audioCtx = null;


  function getAudioContext(){
    if(!audioCtx){
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if(AudioCtxClass) audioCtx = new AudioCtxClass();
    }
    if(audioCtx && audioCtx.state === "suspended"){
      audioCtx.resume();
    }
    return audioCtx;
  }


  function playSound(type){
    if(!soundEnabled) return;

    try{
      const ctx = getAudioContext();
      if(!ctx) return;

      const now = ctx.currentTime;

      if(type === "swap"){
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.07);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);

      }else if(type === "correct"){
        const notes = [
          { freq: 659.25, start: 0, dur: 0.09, vol: 0.18 },
          { freq: 987.77, start: 0.055, dur: 0.14, vol: 0.2 }
        ];
        notes.forEach(n => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(n.freq, now + n.start);
          gain.gain.setValueAtTime(0.001, now + n.start);
          gain.gain.linearRampToValueAtTime(n.vol, now + n.start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.start);
          osc.stop(now + n.start + n.dur + 0.01);
        });

      }else if(type === "soundOn"){
        const notes = [
          { freq: 783.99, start: 0, dur: 0.11, vol: 0.14, wave: "sine" },
          { freq: 1046.50, start: 0.055, dur: 0.16, vol: 0.16, wave: "triangle" },
          { freq: 1318.51, start: 0.11, dur: 0.24, vol: 0.15, wave: "sine" }
        ];
        notes.forEach(n => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = n.wave;
          osc.frequency.setValueAtTime(n.freq, now + n.start);
          gain.gain.setValueAtTime(0.001, now + n.start);
          gain.gain.linearRampToValueAtTime(n.vol, now + n.start + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.start);
          osc.stop(now + n.start + n.dur + 0.02);
        });

      }else if(type === "splash"){
        playSplashMusic();

      }else if(type === "win"){
        playVictorySound();
      }
    }catch(_){}
  }

  let victoryMasterGain = null;
  let victoryNodes = [];

  function stopVictorySound(fadeSeconds = 0.08){
    try{
      const masterToStop = victoryMasterGain;
      victoryMasterGain = null;
      const nodesToStop = victoryNodes.slice();
      victoryNodes = [];
      if(!masterToStop && nodesToStop.length === 0) return;

      if(masterToStop && audioCtx){
        const now = audioCtx.currentTime;
        const g = masterToStop.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(Math.max(0.0001, g.value), now);
        g.linearRampToValueAtTime(0.0001, now + Math.max(0.03, fadeSeconds));
      }
      setTimeout(() => {
        nodesToStop.forEach(n => {
          try{ n.stop(); }catch(_){}
          try{ n.disconnect(); }catch(_){}
        });
        if(masterToStop){
          try{ masterToStop.disconnect(); }catch(_){}
        }
      }, Math.round((fadeSeconds + 0.08) * 1000));
    }catch(_){}
  }

  function playVictorySound(){
    if(!soundEnabled) return;
    try{
      const ctx = getAudioContext();
      if(!ctx) return;

      const startVictoryMelody = () => {
        if(!soundEnabled) return;
        stopVictorySound(0.03);

        const now = ctx.currentTime + 0.015;
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.9, now);
        master.connect(ctx.destination);
        victoryMasterGain = master;

        const leadFilter = ctx.createBiquadFilter();
        leadFilter.type = "lowpass";
        leadFilter.frequency.setValueAtTime(3400, now);
        leadFilter.Q.setValueAtTime(0.9, now);
        leadFilter.connect(master);

        const scheduleNote = (freq, start, dur, vol, wave = "triangle", dest = leadFilter, attack = 0.014) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = wave;
          osc.frequency.setValueAtTime(freq, now + start);
          gain.gain.setValueAtTime(0.0008, now + start);
          gain.gain.linearRampToValueAtTime(vol, now + start + Math.min(attack, dur * 0.3));
          gain.gain.exponentialRampToValueAtTime(0.0008, now + start + dur);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(now + start);
          osc.stop(now + start + dur + 0.03);
          victoryNodes.push(osc);
        };

        // Melodia di vittoria livello: arpeggio eroico ascendente + cadenza finale
        const melody = [
          { f: 523.25, t: 0.00, d: 0.14, v: 0.22 }, // Do5
          { f: 659.25, t: 0.10, d: 0.14, v: 0.22 }, // Mi5
          { f: 783.99, t: 0.20, d: 0.14, v: 0.24 }, // Sol5
          { f: 1046.50, t: 0.31, d: 0.24, v: 0.26 }, // Do6
          { f: 783.99, t: 0.50, d: 0.12, v: 0.21 }, // Sol5
          { f: 880.00, t: 0.61, d: 0.12, v: 0.23 }, // La5
          { f: 1046.50, t: 0.73, d: 0.68, v: 0.28 } // Do6 finale trionfale
        ];

        melody.forEach(n => {
          scheduleNote(n.f, n.t, n.d, n.v, "triangle", leadFilter, 0.012);
          scheduleNote(n.f * 2, n.t, n.d * 0.85, n.v * 0.22, "sine", leadFilter, 0.015);
        });

        // Basso morbido di supporto
        scheduleNote(261.63, 0.00, 0.44, 0.16, "sine", master, 0.018); // Do4
        scheduleNote(196.00, 0.50, 0.22, 0.15, "sine", master, 0.015); // Sol3
        scheduleNote(261.63, 0.73, 0.70, 0.18, "sine", master, 0.02);  // Do4

        // Accordo brillante di chiusura
        [523.25, 659.25, 783.99].forEach(chordFreq => {
          scheduleNote(chordFreq, 0.73, 0.66, 0.09, "sine", master, 0.025);
        });
      };

      if(ctx.state === "suspended" && typeof ctx.resume === "function"){
        ctx.resume().then(startVictoryMelody).catch(() => {});
      }else{
        startVictoryMelody();
      }
    }catch(_){}
  }

  let splashMusicMasterGain = null;
  let splashMusicNodes = [];

  function stopSplashMusic(fadeSeconds = 0.5){
    try{
      const masterToStop = splashMusicMasterGain;
      splashMusicMasterGain = null;
      const nodesToStop = splashMusicNodes.slice();
      splashMusicNodes = [];
      if(!masterToStop && nodesToStop.length === 0) return;

      if(masterToStop && audioCtx){
        const now = audioCtx.currentTime;
        const g = masterToStop.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(Math.max(0.0001, g.value), now);
        g.linearRampToValueAtTime(0.0001, now + Math.max(0.05, fadeSeconds));
      }
      setTimeout(() => {
        nodesToStop.forEach(n => {
          try{ n.stop(); }catch(_){}
          try{ n.disconnect(); }catch(_){}
        });
        if(masterToStop){
          try{ masterToStop.disconnect(); }catch(_){}
        }
      }, Math.round((fadeSeconds + 0.1) * 1000));
    }catch(_){}
  }

  function playSplashMusic(maxDurationSec = 6.0){
    if(!soundEnabled) return;
    try{
      const ctx = getAudioContext();
      if(!ctx || ctx.state !== "running") return;
      stopSplashMusic(0.05);

      const now = ctx.currentTime + 0.03;
      const durLimit = Math.max(0.5, Math.min(6.0, maxDurationSec));
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.001, now);
      master.gain.linearRampToValueAtTime(0.86, now + 0.10);
      if(durLimit > 0.7){
        master.gain.setValueAtTime(0.86, now + durLimit - 0.50);
        master.gain.linearRampToValueAtTime(0.001, now + durLimit);
      }
      master.connect(ctx.destination);
      splashMusicMasterGain = master;

      // Filtri caldi stile synth analogico anni '80
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = "lowpass";
      bassFilter.frequency.setValueAtTime(520, now);
      bassFilter.Q.setValueAtTime(2.2, now);
      bassFilter.connect(master);

      const leadFilter = ctx.createBiquadFilter();
      leadFilter.type = "lowpass";
      leadFilter.frequency.setValueAtTime(2500, now);
      leadFilter.Q.setValueAtTime(1.4, now);
      leadFilter.connect(master);

      const scheduleSynth = (freq, start, dur, vol, wave, dest, attack = 0.015) => {
        if(start >= durLimit) return;
        const clippedDur = Math.min(dur, durLimit - start);
        if(clippedDur <= 0.035) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.0008, now + start);
        gain.gain.linearRampToValueAtTime(vol, now + start + Math.min(attack, clippedDur * 0.35));
        gain.gain.exponentialRampToValueAtTime(0.0008, now + start + clippedDur);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now + start);
        osc.stop(now + start + clippedDur + 0.03);
        splashMusicNodes.push(osc);
      };

      // Synth-Pop Retro Avventura anni '80 (6.0s a 125 BPM - progressione F -> C -> Dm -> Bb -> C -> F)
      const step8 = 0.24; // ottavo a 125 BPM

      // 1) Basso synth pulsante in ottavi (ottave alternanti)
      const bassRoots = [
        // 0.00 - 1.44s: F2/F3 (6 ottavi)
        { f: 87.31, n: 0 }, { f: 174.61, n: 1 }, { f: 87.31, n: 2 }, { f: 174.61, n: 3 }, { f: 87.31, n: 4 }, { f: 174.61, n: 5 },
        // 1.44 - 2.40s: C2/C3 (4 ottavi)
        { f: 65.41, n: 6 }, { f: 130.81, n: 7 }, { f: 65.41, n: 8 }, { f: 130.81, n: 9 },
        // 2.40 - 3.36s: D2/D3 (4 ottavi)
        { f: 73.42, n: 10 }, { f: 146.83, n: 11 }, { f: 73.42, n: 12 }, { f: 146.83, n: 13 },
        // 3.36 - 4.32s: Bb1/Bb2 (4 ottavi)
        { f: 58.27, n: 14 }, { f: 116.54, n: 15 }, { f: 58.27, n: 16 }, { f: 116.54, n: 17 },
        // 4.32 - 5.28s: C2/C3 (4 ottavi)
        { f: 65.41, n: 18 }, { f: 130.81, n: 19 }, { f: 65.41, n: 20 }, { f: 130.81, n: 21 },
        // 5.28 - 6.00s: F2/F3 chiusura potente
        { f: 87.31, n: 22 }, { f: 174.61, n: 23 }, { f: 87.31, n: 24 }
      ];
      bassRoots.forEach(b => {
        const t = b.n * step8;
        const d = b.n === 24 ? 0.45 : 0.19;
        scheduleSynth(b.f, t, d, 0.16, "sawtooth", bassFilter, 0.01);
        scheduleSynth(b.f, t, d, 0.09, "triangle", master, 0.01);
      });

      // 2) Tappeto Pad analogico caldo (accordi sostenuti)
      const pads = [
        { notes: [349.23, 440.00, 523.25], t: 0.00, d: 1.44 }, // F
        { notes: [261.63, 329.63, 392.00], t: 1.44, d: 0.96 }, // C
        { notes: [293.66, 349.23, 440.00], t: 2.40, d: 0.96 }, // Dm
        { notes: [233.08, 293.66, 349.23], t: 3.36, d: 0.96 }, // Bb
        { notes: [261.63, 329.63, 392.00], t: 4.32, d: 0.96 }, // C
        { notes: [349.23, 440.00, 523.25], t: 5.28, d: 0.72 }  // F
      ];
      pads.forEach(p => {
        p.notes.forEach(freq => {
          scheduleSynth(freq, p.t, p.d, 0.032, "triangle", master, 0.08);
          scheduleSynth(freq * 1.003, p.t, p.d, 0.018, "sine", master, 0.08);
        });
      });

      // 3) Melodia Lead Synth-Pop eroica anni '80
      const lead = [
        { f: 523.25, t: 0.00, d: 0.34, v: 0.11 }, // Do5
        { f: 587.33, t: 0.36, d: 0.22, v: 0.11 }, // Re5
        { f: 698.46, t: 0.60, d: 0.42, v: 0.13 }, // Fa5
        { f: 880.00, t: 1.08, d: 0.32, v: 0.13 }, // La5
        { f: 783.99, t: 1.44, d: 0.44, v: 0.13 }, // Sol5 (su C)
        { f: 659.25, t: 1.92, d: 0.40, v: 0.12 }, // Mi5

        { f: 587.33, t: 2.40, d: 0.24, v: 0.12 }, // Re5 (su Dm)
        { f: 698.46, t: 2.64, d: 0.24, v: 0.12 }, // Fa5
        { f: 880.00, t: 2.88, d: 0.44, v: 0.14 }, // La5
        { f: 932.33, t: 3.36, d: 0.34, v: 0.14 }, // Sib5 (su Bb)
        { f: 880.00, t: 3.72, d: 0.22, v: 0.13 }, // La5
        { f: 698.46, t: 3.96, d: 0.32, v: 0.12 }, // Fa5

        { f: 783.99, t: 4.32, d: 0.28, v: 0.13 }, // Sol5 (su C)
        { f: 880.00, t: 4.62, d: 0.28, v: 0.13 }, // La5
        { f: 1046.50, t: 4.92, d: 0.34, v: 0.14 }, // Do6
        { f: 1396.91, t: 5.28, d: 0.72, v: 0.15 }  // Fa6 finale trionfale
      ];
      lead.forEach(n => {
        scheduleSynth(n.f, n.t, n.d, n.v, "sawtooth", leadFilter, 0.02);
        scheduleSynth(n.f, n.t, n.d, n.v * 0.55, "triangle", master, 0.015);
      });
    }catch(_){}
  }


  function updateSoundUI(){
    if(soundIcon){
      soundIcon.innerHTML = soundEnabled
        ? `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="14.5 7.4 10.7 10.1 7.9 10.1 7.9 13.9 10.7 13.9 14.5 16.6 14.5 7.4" fill="rgba(71, 85, 105, 0.1)" stroke="#475569" stroke-width="1.6"/><line x1="6.4" y1="6.4" x2="17.6" y2="17.6" stroke="#f8fafc" stroke-width="3"/><circle cx="12" cy="12" r="9.6" stroke="#dc4c4c" stroke-width="1.6" stroke-opacity="0.85"/><line x1="5.3" y1="5.3" x2="18.7" y2="18.7" stroke="#dc4c4c" stroke-width="1.6" stroke-opacity="0.85"/></svg>`;
    }
    if(soundToggleBtn){
      soundToggleBtn.classList.toggle("is-muted", !soundEnabled);
      soundToggleBtn.setAttribute(
        "aria-label",
        soundEnabled ? "Disattiva audio" : "Attiva audio"
      );
    }
  }


  function formatTime(totalSec){
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }


  function updateTimerDisplay(){
    const formatted = formatTime(timerSeconds);
    if(timerValue){
      timerValue.textContent = formatted;
    }
    const fsTimer = $("fullscreenTimerVal");
    if(fsTimer){
      fsTimer.textContent = formatted;
    }
  }


  function startTimer(){
    if(timerRunning || locked) return;
    timerRunning = true;
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
    }, 1000);
  }


  function stopTimer(){
    timerRunning = false;
    if(timerInterval){
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }


  function resetTimer(){
    stopTimer();
    timerSeconds = 0;
    isPaused = false;
    updateTimerDisplay();
    updatePauseBtnUI();
  }


  function updatePauseBtnUI(){
    const canPause = Boolean(photoData && mixed && !locked);
    const pauseItems = [
      { btn: timerPauseBtn, icon: pauseBtnIcon },
      { btn: $("fullscreenPauseBtn"), icon: $("fullscreenPauseIcon") }
    ];

    pauseItems.forEach(item => {
      if(!item.btn) return;
      item.btn.disabled = !canPause;
      if(isPaused){
        if(item.icon) item.icon.textContent = "▶️";
        item.btn.title = "Riprendi il timer";
        item.btn.setAttribute("aria-label", "Riprendi il timer");
        item.btn.classList.add("is-paused");
      } else {
        if(item.icon) item.icon.textContent = "⏸️";
        item.btn.title = "Metti in pausa il timer";
        item.btn.setAttribute("aria-label", "Metti in pausa il timer");
        item.btn.classList.remove("is-paused");
      }
    });

    const showPauseVeil = Boolean(canPause && isPaused);
    if(boardWrap){
      boardWrap.classList.toggle("is-paused", showPauseVeil);
    }
    if(boardPauseVeil){
      boardPauseVeil.setAttribute("aria-hidden", String(!showPauseVeil));
    }
  }


  function pauseGame(){
    if(!photoData || !mixed || locked || isPaused) return;
    isPaused = true;
    stopTimer();
    updatePauseBtnUI();
    if(gameStatus){
      gameStatus.textContent = "IN PAUSA";
    }
    setHint("Timer in pausa. Tocca il riquadro o ▶️ per riprendere.");
  }


  function resumeFromPause(){
    if(isPaused){
      isPaused = false;
      startTimer();
      updatePauseBtnUI();
      if(gameStatus && mixed && !locked){
        gameStatus.textContent = "IN CORSO";
      }
      setHint("Partita ripresa!");
    } else if(!timerRunning && photoData && mixed && !locked){
      startTimer();
      updatePauseBtnUI();
    }
  }


  function currentLevel(){
    return LEVELS[levelIndex] || LEVELS[0];
  }

  function getGridDimensions(lvlIdx){
    const idx = typeof lvlIdx === "number" ? lvlIdx : levelIndex;
    switch(idx){
      case 0:
        return { cols: 3, rows: 3 }; // Livello 1: 3x3
      case 1:
        return isPortraitPhoto ? { cols: 3, rows: 4 } : { cols: 4, rows: 3 }; // Livello 2: 3x4 o 4x3
      case 2:
        return { cols: 4, rows: 4 }; // Livello 3: 4x4
      case 3:
        return isPortraitPhoto ? { cols: 4, rows: 5 } : { cols: 5, rows: 4 }; // Livello 4: 4x5 o 5x4
      case 4:
        return { cols: 5, rows: 5 }; // Livello 5: 5x5
      case 5:
        return isPortraitPhoto ? { cols: 5, rows: 6 } : { cols: 6, rows: 5 }; // Livello 6: 5x6 o 6x5
      case 6:
        return isPortraitPhoto ? { cols: 5, rows: 7 } : { cols: 7, rows: 5 }; // Livello 7: 5x7 o 7x5
      default:
        return { cols: 3, rows: 3 };
    }
  }

  function totalTiles(){
    const { cols, rows } = getGridDimensions(levelIndex);
    return cols * rows;
  }

  function getCropAspectRatio(lvlIdx){
    const { cols, rows } = getGridDimensions(lvlIdx);
    return cols / rows;
  }

  function updateCropGridOverlay(){
    if(!cropGridOverlay) return;
    const { cols, rows } = getGridDimensions(selectedLevel);
    cropGridOverlay.innerHTML = "";
    const frag = document.createDocumentFragment();
    for(let c = 1; c < cols; c++){
      const vLine = document.createElement("div");
      vLine.className = "crop-grid-line-v";
      vLine.style.left = `${(c / cols) * 100}%`;
      frag.appendChild(vLine);
    }
    for(let r = 1; r < rows; r++){
      const hLine = document.createElement("div");
      hLine.className = "crop-grid-line-h";
      hLine.style.top = `${(r / rows) * 100}%`;
      frag.appendChild(hLine);
    }
    cropGridOverlay.appendChild(frag);
  }

  function updateCropZoomUI(){
    const clamped = Math.max(1, Math.min(4, cropZoom || 1));
    if(cropZoomResetBtn){
      const label = clamped <= 1.02 ? "1×" : `${clamped.toFixed(1)}×`;
      cropZoomResetBtn.textContent = label;
    }
    if(cropZoomSlider){
      cropZoomSlider.value = String(clamped);
      const pct = ((clamped - 1) / 3) * 100;
      cropZoomSlider.style.setProperty("--zoom-pct", `${pct.toFixed(1)}%`);
    }
  }

  function setCropZoom(nextZoom, anchorSave = false){
    const prevZoom = cropZoom;
    const clampedZoom = Math.max(1, Math.min(4, nextZoom));
    if(Math.abs(clampedZoom - prevZoom) < 0.001) return;
    cropZoom = clampedZoom;
    if(prevZoom > 0){
      cropPanX = cropPanX * (clampedZoom / prevZoom);
      cropPanY = cropPanY * (clampedZoom / prevZoom);
    }
    updateCropFrameAndImage(true);
    updateCropZoomUI();
    if(anchorSave) saveGame();
  }

  function centerCropImage(anchorSave = false){
    cropZoom = 1;
    cropPanX = 0;
    cropPanY = 0;
    cropPanRatioX = 0;
    cropPanRatioY = 0;
    updateCropFrameAndImage(false);
    updateCropZoomUI();
    if(anchorSave) saveGame();
  }

  function formatShortDate(dateObj = new Date()){
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const y = String(dateObj.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
  }

  function calculateScore(lvlIdx, moveCount, seconds){
    const { cols, rows } = getGridDimensions(lvlIdx);
    const total = cols * rows;
    const base = total * 120;
    const raw = base - (moveCount * 12) - (seconds * 3);
    return Math.max(50, Math.round(raw));
  }

  function sortLeaderboardEntries(list){
    return list
      .slice()
      .sort((a, b) => (b.score - a.score) || ((a.timestamp || 0) - (b.timestamp || 0)))
      .slice(0, 3);
  }

  function qualifiesForTop3(sortedTop3, entry){
    if(!entry || typeof entry.score !== "number") return false;
    if(!Array.isArray(sortedTop3) || sortedTop3.length < 3) return true;
    const third = sortedTop3[2];
    if(entry.score > third.score) return true;
    if(entry.score === third.score && (entry.timestamp || 0) < (third.timestamp || 0)) return true;
    return false;
  }

  function getLevelTop3(lvlIdx){
    const arr = levelLeaderboards && levelLeaderboards[String(lvlIdx)];
    if(!Array.isArray(arr)) return [];
    return sortLeaderboardEntries(arr.filter(item => item && typeof item.score === "number"));
  }

  function getLevelRecord(lvlIdx){
    const top3 = getLevelTop3(lvlIdx);
    if(top3.length > 0) return top3[0];
    const rec = levelRecords && levelRecords[String(lvlIdx)];
    if(!rec || typeof rec !== "object" || typeof rec.score !== "number") return null;
    return rec;
  }

  function persistRecords(){
    try {
      // Sincronizza il primo posto in levelRecords e mantiene solo i primi 3 punteggi
      Object.keys(levelLeaderboards).forEach(k => {
        const sorted = sortLeaderboardEntries((levelLeaderboards[k] || []).filter(item => item && typeof item.score === "number"));
        if(sorted.length > 0){
          levelLeaderboards[k] = sorted;
          levelRecords[k] = sorted[0];
        } else {
          delete levelLeaderboards[k];
          delete levelRecords[k];
        }
      });
      sessionLeaderboard = sortLeaderboardEntries((sessionLeaderboard || []).filter(item => item && typeof item.score === "number"));
      localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(levelRecords));
      localStorage.setItem(LEADERBOARDS_STORAGE_KEY, JSON.stringify({
        levels: levelLeaderboards,
        sessions: sessionLeaderboard
      }));
    } catch(_) {}
  }

  function recordLevelScore(lvlIdx, entry){
    const key = String(lvlIdx);
    const currentList = getLevelTop3(lvlIdx);
    const prevTop = currentList[0] || null;
    // A parità di punteggio vince il più vecchio (timestamp minore)
    const isNewTop = !prevTop || entry.score > prevTop.score || (entry.score === prevTop.score && (entry.timestamp || 0) < (prevTop.timestamp || 0));
    if(!qualifiesForTop3(currentList, entry)){
      return { isNewTop: false, rank: null };
    }
    currentList.push(entry);
    const sorted = sortLeaderboardEntries(currentList);
    levelLeaderboards[key] = sorted;
    const posIdx = sorted.indexOf(entry);
    const rank = posIdx >= 0 && posIdx < 3 ? posIdx + 1 : null;
    persistRecords();
    updateHomeLevelRecordUI();
    return { isNewTop, rank };
  }

  function finalizeSessionScore(){
    if(sessionFinalized || currentSessionScore <= 0 || currentSessionLevelsCleared <= 0) return lastSessionRank;
    sessionFinalized = true;
    const cleanName = (currentPlayerName || savedPlayerName || "Giocatore").trim().slice(0, MAX_RECORD_NAME_LEN) || "Giocatore";
    const entry = {
      score: currentSessionScore,
      name: cleanName,
      date: formatShortDate(),
      timestamp: Date.now(),
      levelsCleared: currentSessionLevelsCleared
    };
    const currentTop = sortLeaderboardEntries(sessionLeaderboard || []);
    if(!qualifiesForTop3(currentTop, entry)){
      lastSessionRank = null;
      return null;
    }
    currentTop.push(entry);
    const sorted = sortLeaderboardEntries(currentTop);
    sessionLeaderboard = sorted;
    const posIdx = sorted.indexOf(entry);
    lastSessionRank = posIdx >= 0 && posIdx < 3 ? posIdx + 1 : null;
    persistRecords();
    return lastSessionRank;
  }

  function formatSingleLineRecord(rec, prefix = "🏆 Record:"){
    if(!rec) return `${prefix} nessun punteggio salvato`;
    const cleanName = String(rec.name || "Giocatore").trim().slice(0, MAX_RECORD_NAME_LEN) || "Giocatore";
    const cleanDate = rec.date || formatShortDate();
    return `${prefix} ${rec.score} pt · ${cleanName} · ${cleanDate}`;
  }

  function updateHomeLevelRecordUI(){
    if(!homeLevelRecord) return;
    const rec = getLevelRecord(selectedLevel);
    if(!rec){
      homeLevelRecord.classList.add("is-empty");
      homeLevelRecord.textContent = "🏆 Record: nessun punteggio salvato";
      return;
    }
    homeLevelRecord.classList.remove("is-empty");
    const cleanName = String(rec.name || "Giocatore").trim().slice(0, MAX_RECORD_NAME_LEN) || "Giocatore";
    const cleanDate = rec.date || formatShortDate();
    homeLevelRecord.innerHTML = "";
    const iconSpan = document.createElement("span");
    iconSpan.textContent = "🏆 Record:";
    const scoreSpan = document.createElement("span");
    scoreSpan.className = "rec-score";
    scoreSpan.textContent = `${rec.score} pt`;
    const sep1 = document.createElement("span");
    sep1.textContent = "·";
    const nameSpan = document.createElement("span");
    nameSpan.className = "rec-name";
    nameSpan.textContent = cleanName;
    const sep2 = document.createElement("span");
    sep2.textContent = "·";
    const dateSpan = document.createElement("span");
    dateSpan.className = "rec-date";
    dateSpan.textContent = cleanDate;
    homeLevelRecord.append(iconSpan, scoreSpan, sep1, nameSpan, sep2, dateSpan);
  }

  /*
   * Finestra Record Fissa Verticale (v. 1.25)
   */
  function toggleRecordsInfoPopover(forceState){
    if(!recordsInfoPopover || !recordsInfoBtn) return;
    const shouldShow = typeof forceState === "boolean" ? forceState : !recordsInfoPopover.classList.contains("show");
    recordsInfoPopover.classList.toggle("show", shouldShow);
    recordsInfoPopover.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    recordsInfoBtn.setAttribute("aria-expanded", shouldShow ? "true" : "false");
    if(shouldShow){
      const arrow = recordsInfoPopover.querySelector(".records-info-popover-arrow");
      if(arrow){
        const btnRect = recordsInfoBtn.getBoundingClientRect();
        const popRect = recordsInfoPopover.getBoundingClientRect();
        if(popRect.width > 0){
          const leftPx = Math.max(12, Math.min(popRect.width - 24, (btnRect.left - popRect.left) + (btnRect.width / 2) - 6));
          arrow.style.left = `${leftPx}px`;
        }
      }
    } else {
      recordsInfoBtn.blur();
    }
  }

  function renderRecordsModal(lvlIdx = recordsViewLevel){
    recordsViewLevel = Math.max(0, Math.min(LEVELS.length - 1, lvlIdx));
    if(recordsLevelHeading){
      recordsLevelHeading.textContent = `Classifica Livello ${recordsViewLevel + 1}`;
    }

    if(recordsLevelTabs){
      recordsLevelTabs.innerHTML = "";
      for(let i = 0; i < LEVELS.length; i++){
        const dims = getGridDimensions(i);
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = "level-btn-3d" + (i === recordsViewLevel ? " is-selected" : "");
        tab.dataset.level = String(i);
        tab.setAttribute("aria-label", `Livello ${i + 1}: ${dims.cols} per ${dims.rows}`);

        const numSpan = document.createElement("span");
        numSpan.className = "lvl-num";
        numSpan.textContent = String(i + 1);

        const gridSpan = document.createElement("span");
        gridSpan.className = "lvl-grid";
        gridSpan.textContent = `${dims.cols}×${dims.rows}`;

        tab.append(numSpan, gridSpan);
        tab.addEventListener("click", () => renderRecordsModal(i));
        recordsLevelTabs.appendChild(tab);
      }
    }

    if(recordsPodiumStage){
      const topSessions = sortLeaderboardEntries(sessionLeaderboard || []);
      const slots = [
        { rankIdx: 1, medal: "🥈", cls: "rank-2" },
        { rankIdx: 0, medal: "🥇", cls: "rank-1" },
        { rankIdx: 2, medal: "🥉", cls: "rank-3" }
      ];
      recordsPodiumStage.innerHTML = "";
      slots.forEach(slot => {
        const entry = topSessions[slot.rankIdx] || null;
        const col = document.createElement("div");
        col.className = `podium-col ${slot.cls}` + (entry ? "" : " is-empty");

        const playerDiv = document.createElement("div");
        playerDiv.className = "podium-player";
        const nameDiv = document.createElement("div");
        nameDiv.className = "podium-name";
        nameDiv.textContent = entry ? (entry.name || "Giocatore") : "—";
        playerDiv.appendChild(nameDiv);
        if(entry && entry.date){
          const metaDiv = document.createElement("div");
          metaDiv.className = "podium-meta";
          metaDiv.textContent = entry.date;
          playerDiv.appendChild(metaDiv);
        }

        const blockDiv = document.createElement("div");
        blockDiv.className = "podium-block";
        const medalDiv = document.createElement("div");
        medalDiv.className = "podium-medal";
        medalDiv.textContent = slot.medal;
        const scoreDiv = document.createElement("div");
        scoreDiv.className = "podium-score";
        scoreDiv.textContent = entry ? `${entry.score} pt` : "---";
        const levelsDiv = document.createElement("div");
        levelsDiv.className = "podium-levels";
        if(entry){
          const lvls = entry.levelsCleared || 1;
          levelsDiv.textContent = lvls === 1 ? "1 livello" : `${lvls} livelli`;
        } else {
          levelsDiv.textContent = "\u00A0";
          levelsDiv.setAttribute("aria-hidden", "true");
        }
        blockDiv.append(medalDiv, scoreDiv, levelsDiv);

        col.append(playerDiv, blockDiv);
        recordsPodiumStage.appendChild(col);
      });
    }

    if(recordsLevelList){
      const top3 = getLevelTop3(recordsViewLevel);
      const badges = ["🥇", "🥈", "🥉"];
      const rowClasses = ["rank-1", "rank-2", "rank-3"];
      recordsLevelList.innerHTML = "";
      for(let i = 0; i < 3; i++){
        const entry = top3[i] || null;
        const row = document.createElement("div");
        row.className = `session-rank-row ${rowClasses[i]}`;

        const badgeSpan = document.createElement("span");
        badgeSpan.className = "session-rank-badge";
        badgeSpan.textContent = badges[i];

        const infoDiv = document.createElement("div");
        infoDiv.className = "session-rank-info";
        const nameDiv = document.createElement("div");
        nameDiv.className = "session-rank-name";
        nameDiv.textContent = entry ? (entry.name || "Giocatore") : "Nessun record salvato";
        const metaDiv = document.createElement("div");
        metaDiv.className = "session-rank-meta";
        if(entry){
          const parts = [];
          if(typeof entry.moves === "number" && entry.moves > 0) parts.push(`${entry.moves} mosse`);
          if(typeof entry.time === "number" && entry.time > 0) parts.push(formatTime(entry.time));
          if(entry.date) parts.push(entry.date);
          metaDiv.textContent = parts.length > 0 ? parts.join(" · ") : "Record livello";
        } else {
          metaDiv.textContent = "Completa il livello per entrare in classifica";
        }
        infoDiv.append(nameDiv, metaDiv);

        const scoreDiv = document.createElement("div");
        scoreDiv.className = "session-rank-score";
        scoreDiv.textContent = entry ? `${entry.score} pt` : "—";

        row.append(badgeSpan, infoDiv, scoreDiv);
        recordsLevelList.appendChild(row);
      }
    }
  }

  let recordsCrestLongPressTimer = null;
  let recordsPinPendingFocus = false;
  let resetTargetLevel = 0;
  let pendingResetAction = "";

  function getTodayPinGGMMAA(){
    const now = new Date();
    const gg = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const aa = String(now.getFullYear()).slice(-2);
    return `${gg}${mm}${aa}`;
  }

  function getPinInputs(){
    return recordsPinBoxes ? Array.from(recordsPinBoxes.querySelectorAll(".pin-digit-input")) : [];
  }

  function clearPinInputs(focusFirst = true){
    const inputs = getPinInputs();
    inputs.forEach(inp => {
      inp.value = "";
      inp.dataset.digit = "";
    });
    if(focusFirst && inputs[0]){
      try { inputs[0].focus(); } catch(_) {}
    }
  }

  function openRecordsPinModal(){
    toggleRecordsInfoPopover(false);
    if(recordsPinError) recordsPinError.textContent = "";
    if(recordsPinBoxes) recordsPinBoxes.classList.remove("is-shake");
    clearPinInputs(false);
    recordsPinPendingFocus = true;
    activeOverlay = "recordsPin";
    if(recordsPinOverlay) recordsPinOverlay.classList.add("show");
    const inputs = getPinInputs();
    if(inputs[0]){
      try { inputs[0].focus(); } catch(_) {}
      requestAnimationFrame(() => {
        if(recordsPinOverlay && recordsPinOverlay.classList.contains("show")){
          try { inputs[0].focus(); } catch(_) {}
        }
      });
    }
  }

  function closeRecordsPinModal(){
    recordsPinPendingFocus = false;
    if(recordsPinOverlay) recordsPinOverlay.classList.remove("show");
    if(recordsOverlay && recordsOverlay.classList.contains("show")){
      activeOverlay = "records";
    } else if(activeOverlay === "recordsPin"){
      activeOverlay = "";
    }
  }

  function renderResetLevelPicker(){
    if(resetLevelPicker){
      resetLevelPicker.innerHTML = "";
      for(let i = 0; i < LEVELS.length; i++){
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "reset-lvl-pill" + (i === resetTargetLevel ? " is-selected" : "");
        btn.textContent = String(i + 1);
        btn.setAttribute("aria-label", `Livello ${i + 1}`);
        btn.addEventListener("click", () => {
          resetTargetLevel = i;
          renderResetLevelPicker();
        });
        resetLevelPicker.appendChild(btn);
      }
    }
    if(resetLevelBtn){
      resetLevelBtn.textContent = `Resetta la classifica del livello ${resetTargetLevel + 1}`;
    }
  }

  function openRecordsResetModal(){
    resetTargetLevel = recordsViewLevel;
    pendingResetAction = "";
    if(recordsResetMenuPanel) recordsResetMenuPanel.style.display = "";
    if(recordsResetConfirmPanel) recordsResetConfirmPanel.style.display = "none";
    renderResetLevelPicker();
    activeOverlay = "recordsReset";
    if(recordsResetOverlay) recordsResetOverlay.classList.add("show");
  }

  function closeRecordsResetModal(){
    pendingResetAction = "";
    if(recordsResetOverlay) recordsResetOverlay.classList.remove("show");
    if(recordsOverlay && recordsOverlay.classList.contains("show")){
      activeOverlay = "records";
    } else if(activeOverlay === "recordsReset"){
      activeOverlay = "";
    }
  }

  function showRecordsResetConfirm(actionType){
    pendingResetAction = actionType;
    if(recordsResetConfirmText){
      if(actionType === "level"){
        recordsResetConfirmText.textContent = `Confermi l'azzeramento della classifica del Livello ${resetTargetLevel + 1}? I record eliminati non potranno essere recuperati.`;
      } else if(actionType === "allLevels"){
        recordsResetConfirmText.textContent = "Confermi l'azzeramento della classifica di TUTTI i livelli (1-7)? La classifica Partita Completa resterà invariata.";
      } else if(actionType === "session"){
        recordsResetConfirmText.textContent = "Confermi l'azzeramento della classifica Partita Completa? I record eliminati non potranno essere recuperati.";
      } else {
        recordsResetConfirmText.textContent = "Confermi l'azzeramento di TUTTE le classifiche (tutti i livelli e Partita Completa)?";
      }
    }
    if(recordsResetMenuPanel) recordsResetMenuPanel.style.display = "none";
    if(recordsResetConfirmPanel) recordsResetConfirmPanel.style.display = "";
  }

  function executeRecordsReset(){
    if(pendingResetAction === "level"){
      const key = String(resetTargetLevel);
      delete levelLeaderboards[key];
      delete levelRecords[key];
    } else if(pendingResetAction === "allLevels"){
      levelLeaderboards = {};
      levelRecords = {};
    } else if(pendingResetAction === "session"){
      sessionLeaderboard = [];
    } else if(pendingResetAction === "all"){
      levelLeaderboards = {};
      levelRecords = {};
      sessionLeaderboard = [];
    } else {
      return;
    }
    persistRecords();
    updateHomeLevelRecordUI();
    renderRecordsModal(recordsViewLevel);
    closeRecordsResetModal();
  }

  function openRecordsModal(lvlIdx = selectedLevel){
    toggleRecordsInfoPopover(false);
    renderRecordsModal(lvlIdx);
    activeOverlay = "records";
    if(recordsOverlay) recordsOverlay.classList.add("show");
  }

  function closeRecordsModal(){
    if(recordsCrestLongPressTimer){
      clearTimeout(recordsCrestLongPressTimer);
      recordsCrestLongPressTimer = null;
    }
    closeRecordsResetModal();
    closeRecordsPinModal();
    toggleRecordsInfoPopover(false);
    if(recordsOverlay) recordsOverlay.classList.remove("show");
    if(activeOverlay === "records") activeOverlay = "";
  }

  function updateLevelButtonsUI(){
    const btn1 = $("lvlGridLabel1");
    const btn3 = $("lvlGridLabel3");
    const btn5 = $("lvlGridLabel5");
    const btn6 = $("lvlGridLabel6");
    if(btn1) btn1.textContent = isPortraitPhoto ? "3×4" : "4×3";
    if(btn3) btn3.textContent = isPortraitPhoto ? "4×5" : "5×4";
    if(btn5) btn5.textContent = isPortraitPhoto ? "5×6" : "6×5";
    if(btn6) btn6.textContent = isPortraitPhoto ? "5×7" : "7×5";

    if(levelsGrid){
      levelsGrid.querySelectorAll(".level-btn-3d").forEach(btn => {
        const lvl = Number(btn.dataset.level);
        btn.classList.toggle("is-selected", lvl === selectedLevel);
      });
    }

    updateHomeLevelRecordUI();
    updateCropGridOverlay();
    updateCropZoomUI();
  }

  function updateCropFrameAndImage(syncRatioFromPixels = false){
    if(!cropPreviewBox || !cropSourceImg || !cropSelectionFrame) return;
    const boxW = cropPreviewBox.clientWidth;
    const boxH = cropPreviewBox.clientHeight;
    if(!boxW || !boxH || boxW < 20 || boxH < 20) return;

    const natW = cropSourceImg.naturalWidth || 600;
    const natH = cropSourceImg.naturalHeight || 600;

    const targetRatio = getCropAspectRatio(selectedLevel); // cols / rows

    const maxFrameW = Math.max(40, boxW - 24);
    const maxFrameH = Math.max(40, boxH - 24);

    let frameW = maxFrameW;
    let frameH = frameW / targetRatio;
    if(frameH > maxFrameH){
      frameH = maxFrameH;
      frameW = frameH * targetRatio;
    }

    const frameLeft = (boxW - frameW) / 2;
    const frameTop = (boxH - frameH) / 2;

    cropSelectionFrame.style.width = `${frameW}px`;
    cropSelectionFrame.style.height = `${frameH}px`;
    cropSelectionFrame.style.left = `${frameLeft}px`;
    cropSelectionFrame.style.top = `${frameTop}px`;

    frameDims = { left: frameLeft, top: frameTop, width: frameW, height: frameH };

    // Scala l'immagine in modo che copra interamente il riquadro di selezione, moltiplicata per cropZoom
    const baseScale = Math.max(frameW / natW, frameH / natH);
    const scale = baseScale * Math.max(1, Math.min(4, cropZoom || 1));
    const imgW = natW * scale;
    const imgH = natH * scale;
    imgScaledDims = { width: imgW, height: imgH, scale };

    cropSourceImg.style.width = `${imgW}px`;
    cropSourceImg.style.height = `${imgH}px`;

    // Clamping dello spostamento (pan) per non lasciare mai vuoti dentro al riquadro
    const maxPanX = Math.max(0, (imgW - frameW) / 2);
    const maxPanY = Math.max(0, (imgH - frameH) / 2);

    if(syncRatioFromPixels){
      cropPanX = Math.max(-maxPanX, Math.min(maxPanX, cropPanX));
      cropPanY = Math.max(-maxPanY, Math.min(maxPanY, cropPanY));
      cropPanRatioX = maxPanX > 0 ? cropPanX / maxPanX : 0;
      cropPanRatioY = maxPanY > 0 ? cropPanY / maxPanY : 0;
    } else {
      cropPanRatioX = Math.max(-1, Math.min(1, cropPanRatioX || 0));
      cropPanRatioY = Math.max(-1, Math.min(1, cropPanRatioY || 0));
      cropPanX = cropPanRatioX * maxPanX;
      cropPanY = cropPanRatioY * maxPanY;
    }

    const imgLeft = frameLeft + (frameW - imgW) / 2 + cropPanX;
    const imgTop = frameTop + (frameH - imgH) / 2 + cropPanY;

    cropSourceImg.style.left = `${imgLeft}px`;
    cropSourceImg.style.top = `${imgTop}px`;
    if(cropCenterBtn){
      cropCenterBtn.classList.toggle("is-shifted", Math.abs(cropPanX) > 1 || Math.abs(cropPanY) > 1 || (cropZoom || 1) > 1.02);
    }
  }

  function generateCroppedPhoto(targetLvlIdx){
    if(!cropSourceImg || !cropSourceImg.naturalWidth) return photoData;
    const natW = cropSourceImg.naturalWidth;
    const natH = cropSourceImg.naturalHeight;
    const lvl = typeof targetLvlIdx === "number" ? targetLvlIdx : selectedLevel;
    const { cols, rows } = getGridDimensions(lvl);
    const targetRatio = cols / rows;

    let baseSw, baseSh;
    if(natW / natH > targetRatio){
      baseSh = natH;
      baseSw = natH * targetRatio;
    } else {
      baseSw = natW;
      baseSh = natW / targetRatio;
    }

    const zoom = Math.max(1, Math.min(4, cropZoom || 1));
    const sw = Math.min(natW, Math.max(1, baseSw / zoom));
    const sh = Math.min(natH, Math.max(1, baseSh / zoom));

    const maxSrcPanX = Math.max(0, (natW - sw) / 2);
    const maxSrcPanY = Math.max(0, (natH - sh) / 2);
    const ratioX = Math.max(-1, Math.min(1, cropPanRatioX || 0));
    const ratioY = Math.max(-1, Math.min(1, cropPanRatioY || 0));

    const sx = Math.max(0, Math.min(natW - sw, (natW - sw) / 2 - ratioX * maxSrcPanX));
    const sy = Math.max(0, Math.min(natH - sh, (natH - sh) / 2 - ratioY * maxSrcPanY));

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cols * 240);
    canvas.height = Math.round(rows * 240);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(cropSourceImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.88);
  }

  function setHint(message){
    if(hint) hint.textContent = message;
  }

  function shouldUseLandscapeGameView(lvlIdx = levelIndex){
    const { cols, rows } = getGridDimensions(lvlIdx);
    return rows < cols;
  }

  function isStandaloneDisplayMode(){
    try {
      return Capacitor.isNativePlatform() || (window.matchMedia && (
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: standalone)").matches
      )) || window.navigator.standalone === true;
    } catch(_) {
      return false;
    }
  }

  let pendingFullscreenPromise = null;

  function requestNativeFullscreen(){
    if(isStandaloneDisplayMode()) return Promise.resolve();
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if(fsEl) return Promise.resolve();
    if(pendingFullscreenPromise) return pendingFullscreenPromise;
    const docEl = document.documentElement;
    try {
      if(docEl && typeof docEl.requestFullscreen === "function"){
        const p = docEl.requestFullscreen({ navigationUI: "hide" });
        if(p && typeof p.then === "function"){
          pendingFullscreenPromise = p.finally(() => { pendingFullscreenPromise = null; });
          return pendingFullscreenPromise;
        }
        return Promise.resolve();
      }
      const legacyReq = docEl && (docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen);
      if(typeof legacyReq === "function"){
        legacyReq.call(docEl);
      }
    } catch(_) {}
    return Promise.resolve();
  }

  function exitNativeFullscreen(){
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if(!fsEl) return Promise.resolve();
    try {
      if(typeof document.exitFullscreen === "function"){
        const p = document.exitFullscreen();
        return p && typeof p.then === "function" ? p : Promise.resolve();
      }
      const legacyExit = document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if(typeof legacyExit === "function"){
        legacyExit.call(document);
      }
    } catch(_) {}
    return Promise.resolve();
  }

  let pendingOrientationPromise = null;
  let pendingOrientationTarget = "";

  function syncScreenOrientation(active, isLandscape){
    const isUnlock = active === "unlock";
    const target = isUnlock ? "unlock" : ((active && isLandscape) ? "landscape" : "portrait");
    try {
      const isNative = Capacitor.isNativePlatform();
      const orientationApi = window.screen && window.screen.orientation;
      const canWebLock = Boolean(orientationApi && typeof orientationApi.lock === "function");
      const canWebUnlock = Boolean(orientationApi && typeof orientationApi.unlock === "function");
      if(!isNative && (isUnlock ? !canWebUnlock : !canWebLock)) return Promise.resolve();
      if(pendingOrientationPromise && pendingOrientationTarget === target){
        return pendingOrientationPromise;
      }
      pendingOrientationTarget = target;
      const tasks = [];
      if(isUnlock){
        if(isNative){
          tasks.push(Promise.resolve(ScreenOrientation.unlock()).catch(() => {}));
        }
        if(canWebUnlock){
          tasks.push(Promise.resolve().then(() => orientationApi.unlock()).catch(() => {}));
        }
      } else {
        if(isNative){
          tasks.push(Promise.resolve(ScreenOrientation.lock({ orientation: target })).catch(() => {}));
        }
        if(canWebLock){
          tasks.push(Promise.resolve(orientationApi.lock(target)).catch(() => {}));
        }
      }
      const p = Promise.all(tasks)
        .catch(() => {})
        .finally(() => {
          if(pendingOrientationPromise === p){
            pendingOrientationPromise = null;
          }
        });
      pendingOrientationPromise = p;
      return p;
    } catch(_) {
      return Promise.resolve();
    }
  }

  function syncFullscreenTopBarsAlignment(){
    if(!gamePanel || !isFullscreen){
      if(fsPortraitTopBar){
        fsPortraitTopBar.style.width = "";
        fsPortraitTopBar.style.transform = "";
      }
      if(fsLandscapeTopBar) fsLandscapeTopBar.style.width = "";
      return;
    }

    const isLandscape = gamePanel.classList.contains("fs-layout-landscape");
    if(isLandscape){
      if(fsPortraitTopBar){
        fsPortraitTopBar.style.width = "";
        fsPortraitTopBar.style.transform = "";
      }
      if(fsLandscapeTopBar && previewTile){
        const rect = previewTile.getBoundingClientRect();
        if(rect.width > 0){
          const minNeeded = fsLandscapeTopBar.scrollWidth;
          const targetW = Math.max(Math.round(rect.width), minNeeded > 0 ? Math.min(minNeeded, Math.round(rect.width)) : 0);
          fsLandscapeTopBar.style.width = `${targetW}px`;
        }
      }
    } else {
      if(fsLandscapeTopBar) fsLandscapeTopBar.style.width = "";
      if(fsPortraitTopBar && board){
        const { cols } = getGridDimensions(levelIndex);
        const firstTile = board.firstElementChild;
        const lastTopTile = cols > 0 && board.children.length >= cols ? board.children[cols - 1] : null;
        let puzzleWidth = 0;
        let puzzleLeft = 0;
        if(firstTile && lastTopTile){
          const firstRect = firstTile.getBoundingClientRect();
          const lastRect = lastTopTile.getBoundingClientRect();
          puzzleWidth = lastRect.right - firstRect.left;
          puzzleLeft = firstRect.left;
        }
        if(puzzleWidth <= 0){
          const rect = board.getBoundingClientRect();
          if(rect.width > 4){
            puzzleWidth = rect.width - 4;
            puzzleLeft = rect.left + 2;
          }
        }
        if(puzzleWidth > 0){
          fsPortraitTopBar.style.transform = "";
          fsPortraitTopBar.style.width = `${puzzleWidth.toFixed(2)}px`;
          if(puzzleLeft > 0){
            const barRect = fsPortraitTopBar.getBoundingClientRect();
            const deltaX = puzzleLeft - barRect.left;
            if(Math.abs(deltaX) > 0.25 && Math.abs(deltaX) < 16){
              fsPortraitTopBar.style.transform = `translateX(${deltaX.toFixed(2)}px)`;
            }
          }
        }
      }
    }
  }

  function applyFullscreenLayoutClass(isHorizontal){
    if(!gamePanel) return;
    gamePanel.classList.toggle("fs-layout-landscape", isHorizontal);
    gamePanel.classList.toggle("fs-layout-portrait", !isHorizontal);
    requestAnimationFrame(() => syncFullscreenTopBarsAlignment());
  }

  /*
   * Schermo intero immersivo con blocco orientamento e rimozione barra indirizzi (v. 1.27)
   */
  function toggleFullscreen(enable){
    const prevFullscreen = isFullscreen;
    isFullscreen = typeof enable === "boolean" ? enable : !isFullscreen;

    gamePanel.classList.toggle("is-fullscreen", isFullscreen);
    document.body.classList.toggle("is-fullscreen", isFullscreen);

    let settlePromise = Promise.resolve();

    if (isFullscreen) {
      const useLandscape = shouldUseLandscapeGameView(levelIndex);
      applyFullscreenLayoutClass(useLandscape);
      requestNativeFullscreen()
        .catch(() => {})
        .finally(() => {
          syncScreenOrientation(true, useLandscape);
          setTimeout(() => {
            if(inGameSession && isFullscreen){
              applyFullscreenLayoutClass(shouldUseLandscapeGameView(levelIndex));
              renderBoard();
            }
          }, 120);
        });
      window.scrollTo(0, 0);
      resetPreviewZoom();
    } else {
      const wasLandscapeLayout = gamePanel.classList.contains("fs-layout-landscape") || (prevFullscreen && shouldUseLandscapeGameView(levelIndex));
      const hasNativeFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      gamePanel.classList.remove("fs-layout-landscape", "fs-layout-portrait");
      const orientPromise = syncScreenOrientation(false, false);

      if(hasNativeFs || wasLandscapeLayout){
        settlePromise = Promise.race([
          orientPromise,
          new Promise(resolve => setTimeout(resolve, 250))
        ]).finally(() => {
          return exitNativeFullscreen()
            .catch(() => {})
            .then(() => new Promise(resolve => setTimeout(resolve, 100)))
            .finally(() => {
              if(!inGameSession){
                updateCropFrameAndImage();
              }
            });
        });
      } else {
        exitNativeFullscreen().catch(() => {});
        if(!inGameSession){
          requestAnimationFrame(() => updateCropFrameAndImage());
        }
      }
    }

    if(fullscreenToggleBtn){
      fullscreenToggleBtn.setAttribute("aria-pressed", String(isFullscreen));
    }

    updateUI();
    return settlePromise;
  }

  function getVisibleOverlay(){
    if(isExitingToSummary)
      return "gameSummary";

    if(playerNameOverlay && playerNameOverlay.classList.contains("show"))
      return "playerName";

    if(galleryDeleteConfirmOverlay && galleryDeleteConfirmOverlay.classList.contains("show"))
      return "galleryDeleteConfirm";

    if(galleryOverlay && galleryOverlay.classList.contains("show"))
      return "gallery";

    if(nextLevelCropOverlay && nextLevelCropOverlay.classList.contains("show"))
      return "nextCrop";

    if(recordsResetOverlay && recordsResetOverlay.classList.contains("show"))
      return "recordsReset";

    if(recordsPinOverlay && recordsPinOverlay.classList.contains("show"))
      return "recordsPin";

    if(recordsOverlay && recordsOverlay.classList.contains("show"))
      return "records";

    if(appExitedOverlay && appExitedOverlay.classList.contains("show"))
      return "appExited";

    if(appExitConfirmOverlay && appExitConfirmOverlay.classList.contains("show"))
      return "appExitConfirm";

    if(exitConfirmOverlay && exitConfirmOverlay.classList.contains("show"))
      return "exitConfirm";

    if(previewOverlay && previewOverlay.classList.contains("show"))
      return "preview";

    if(restartConfirmOverlay && restartConfirmOverlay.classList.contains("show"))
      return "restartConfirm";

    if(actionChoiceOverlay && actionChoiceOverlay.classList.contains("show"))
      return "actionChoice";

    if(gameSummaryOverlay && gameSummaryOverlay.classList.contains("show"))
      return "gameSummary";

    if(winOverlay && winOverlay.classList.contains("show"))
      return "win";

    return "";
  }

  function isGameFinished(){
    return gameCompleted || (levelIndex >= LEVELS.length - 1 && locked && isSolved());
  }

  function saveGame(){
    try{
      const data = {
        version: 4,
        photoData,
        rawPhotoUrl,
        levelIndex,
        selectedLevel,
        isPortraitPhoto,
        cropZoom,
        cropPanX,
        cropPanY,
        cropPanRatioX,
        cropPanRatioY,
        currentPlayerName,
        currentSessionScore,
        currentSessionLevelsCleared,
        currentSessionMoves,
        currentSessionTime,
        currentSessionDetails,
        lastSessionRank,
        lastWinScore,
        lastWinRank,
        sessionFinalized,
        inGameSession,
        pieces,
        moves,
        timerSeconds,
        currentAspectRatio,
        showNumbers,
        showCorrect,
        mixed,
        locked,
        gameCompleted: isGameFinished(),
        overlay: getVisibleOverlay(),
        savedAt: Date.now()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      lastStorageWarning = false;
      return true;
    }catch(error){
      console.warn("Salvataggio automatico non riuscito:", error);
      if(!lastStorageWarning){
        lastStorageWarning = true;
        setHint("Attenzione: il browser non è riuscito a salvare la partita.");
      }
      return false;
    }
  }

  function isValidSavedGame(data){
    if(!data || typeof data !== "object") return false;

    if(!Number.isInteger(data.levelIndex) || data.levelIndex < 0 || data.levelIndex >= LEVELS.length){
      return false;
    }

    if(!Number.isInteger(data.moves) || data.moves < 0){
      return false;
    }

    if(typeof data.photoData !== "string" || !data.photoData.startsWith("data:image/")){
      return false;
    }

    const { cols, rows } = getGridDimensions(data.levelIndex);
    const expected = cols * rows;

    if(!Array.isArray(data.pieces) || data.pieces.length !== expected){
      return false;
    }

    const seen = new Set();
    for(const piece of data.pieces){
      if(!Number.isInteger(piece) || piece < 0 || piece >= expected || seen.has(piece)){
        return false;
      }
      seen.add(piece);
    }

    return typeof data.mixed === "boolean" && typeof data.locked === "boolean";
  }

  function restoreGame(){
    try{
      const raw =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(PREV_STORAGE_KEY_V119) ||
        localStorage.getItem(PREV_STORAGE_KEY_V118) ||
        localStorage.getItem(PREV_STORAGE_KEY_V117) ||
        localStorage.getItem(PREV_STORAGE_KEY_V116) ||
        localStorage.getItem(PREV_STORAGE_KEY) ||
        localStorage.getItem(PREV_STORAGE_KEY_V114) ||
        localStorage.getItem(PREV_STORAGE_KEY_V113);

      if(!raw) return false;

      const data = JSON.parse(raw);

      if(data.inGameSession && data.photoData && typeof data.rawPhotoUrl === "string" && data.rawPhotoUrl){
        rawPhotoUrl = data.rawPhotoUrl;
        if(cropSourceImg) cropSourceImg.src = rawPhotoUrl;
        syncHomePhotoEmptyUI();
      } else {
        rawPhotoUrl = "";
        if(cropSourceImg){
          cropSourceImg.onload = null;
          cropSourceImg.removeAttribute("src");
        }
        syncHomePhotoEmptyUI();
      }
      if(Number.isInteger(data.selectedLevel)){
        selectedLevel = Math.max(0, Math.min(data.selectedLevel, LEVELS.length - 1));
      }
      if(typeof data.isPortraitPhoto === "boolean"){
        isPortraitPhoto = data.isPortraitPhoto;
      }
      if(typeof data.cropZoom === "number" && data.cropZoom >= 1 && data.cropZoom <= 4){
        cropZoom = data.cropZoom;
      }
      if(typeof data.cropPanX === "number") cropPanX = data.cropPanX;
      if(typeof data.cropPanY === "number") cropPanY = data.cropPanY;
      if(typeof data.cropPanRatioX === "number") cropPanRatioX = data.cropPanRatioX;
      if(typeof data.cropPanRatioY === "number") cropPanRatioY = data.cropPanRatioY;
      if(typeof data.currentPlayerName === "string" && data.currentPlayerName.trim()){
        currentPlayerName = data.currentPlayerName.trim().slice(0, MAX_RECORD_NAME_LEN);
      }
      if(Number.isFinite(data.currentSessionScore)){
        currentSessionScore = Math.max(0, Math.round(data.currentSessionScore));
      }
      if(Number.isInteger(data.currentSessionLevelsCleared)){
        currentSessionLevelsCleared = Math.max(0, data.currentSessionLevelsCleared);
      }
      if(Number.isFinite(data.currentSessionMoves)){
        currentSessionMoves = Math.max(0, Math.round(data.currentSessionMoves));
      }
      if(Number.isFinite(data.currentSessionTime)){
        currentSessionTime = Math.max(0, Math.round(data.currentSessionTime));
      }
      if(Array.isArray(data.currentSessionDetails)){
        currentSessionDetails = data.currentSessionDetails;
      }
      if(data.lastSessionRank === 1 || data.lastSessionRank === 2 || data.lastSessionRank === 3){
        lastSessionRank = data.lastSessionRank;
      } else {
        lastSessionRank = null;
      }
      if(Number.isFinite(data.lastWinScore)){
        lastWinScore = Math.round(data.lastWinScore);
      }
      if(data.lastWinRank === 1 || data.lastWinRank === 2 || data.lastWinRank === 3){
        lastWinRank = data.lastWinRank;
      } else {
        lastWinRank = null;
      }
      if(typeof data.sessionFinalized === "boolean"){
        sessionFinalized = data.sessionFinalized;
      }

      updateLevelButtonsUI();

      if(!isValidSavedGame(data)){
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      photoData = data.photoData;
      levelIndex = data.levelIndex;
      pieces = data.pieces.slice();
      moves = data.moves;
      timerSeconds = Number.isInteger(data.timerSeconds) ? data.timerSeconds : 0;
      currentAspectRatio = typeof data.currentAspectRatio === "string" ? data.currentAspectRatio : "1:1";
      showNumbers = Boolean(data.showNumbers);
      showCorrect = Boolean(data.inGameSession) && typeof data.showCorrect === "boolean"
        ? data.showCorrect
        : true;
      mixed = data.mixed;
      locked = data.locked;
      gameCompleted = Boolean(data.gameCompleted || (data.levelIndex >= LEVELS.length - 1 && data.locked));
      selectedTile = null;
      inGameSession = Boolean(data.inGameSession);

      updateTimerDisplay();

      const imgEl = $("previewImage");
      if(imgEl) imgEl.src = photoData;
      const thumbEl = $("previewThumb");
      if(thumbEl) thumbEl.src = photoData;

      const savedOverlay = data.overlay || "";

      if(savedOverlay === "gameSummary" && currentSessionLevelsCleared > 0){
        openGameSummaryModal(false);
        return true;
      }

      if(inGameSession && photoData){
        if(homeView){
          homeView.classList.add("is-hidden");
          homeView.style.display = "none";
        }
        if(gamePanel){
          gamePanel.style.display = "";
          gamePanel.classList.remove("hidden-initial");
        }
        document.body.classList.add("in-game");
        toggleFullscreen(true);
        renderBoard();

        if(savedOverlay === "exitConfirm"){
          if(locked) showWinDialog(false);
          exitConfirmReturnToWin = Boolean(locked);
          activeOverlay = "exitConfirm";
          if(exitConfirmOverlay) exitConfirmOverlay.classList.add("show");
        }else if(savedOverlay === "win" && locked){
          showWinDialog(false);
        }else if(locked){
          showWinDialog(false);
        }

        if(!mixed && !locked){
          shufflePieces(true);
        }else{
          if(moves > 0 && !locked){
            startTimer();
          }
          saveGame();
        }

        setHint("Partita ripristinata: puoi continuare da dove avevi lasciato.");
        return true;
      }

      return false;
    }catch(error){
      console.warn("Non è stato possibile ripristinare la partita:", error);
      return false;
    }
  }

  function updateCorrectTogglesUI(){
    const list = [
      { btn: toggleCorrectBtn, lbl: $("toggleStateLabel") },
      { btn: $("fsHelpBtn"), lbl: $("fsHelpToggleStateLabel") },
      { btn: fsPortraitHelpBtn, lbl: fsPortraitHelpToggleState }
    ];
    const loaded = Boolean(photoData);
    list.forEach(item => {
      if(item.btn){
        item.btn.disabled = !loaded;
        item.btn.classList.toggle("active", showCorrect);
        item.btn.setAttribute("aria-checked", String(showCorrect));
        item.btn.setAttribute("aria-pressed", String(showCorrect));
      }
      if(item.lbl){
        item.lbl.textContent = showCorrect ? "ON" : "OFF";
      }
    });
  }

  function updateUI(){
    const level = currentLevel();
    const { cols, rows } = getGridDimensions(levelIndex);
    const loaded = Boolean(photoData);

    if(levelValue){
      levelValue.textContent = `${levelIndex + 1} / ${LEVELS.length}`;
    }

    if(difficultyValue){
      difficultyValue.textContent = `${cols} × ${rows}`;
    }

    if(movesValue){
      movesValue.textContent = String(moves);
    }
    const fsMoves = $("fullscreenMovesVal");
    if(fsMoves){
      fsMoves.textContent = String(moves);
    }

    if(levelIndicators){
      levelIndicators.querySelectorAll(".level-square").forEach((square, index) => {
        square.classList.toggle("active", index <= levelIndex);
      });
    }

    if(gameTitle){
      gameTitle.textContent = `Livello ${levelIndex + 1} · ${level.name}`;
    }

    if(levelDescription){
      levelDescription.textContent = `Griglia ${cols} × ${rows} - ${cols * rows} tasselli.`;
    }

    if(gameStatus){
      gameStatus.textContent = !loaded
        ? "IN ATTESA"
        : locked
          ? "COMPLETATO"
          : isPaused
            ? "IN PAUSA"
            : mixed
              ? "IN CORSO"
              : "PRONTO";
    }

    /* MIX è disponibile soltanto prima della prima mossa */
    const canMix = loaded && !locked && moves === 0;
    if(mixBtn) mixBtn.disabled = !canMix;
    if(fsPortraitMixBtn) fsPortraitMixBtn.disabled = !canMix;
    if(fsLandscapeMixBtn) fsLandscapeMixBtn.disabled = !canMix;

    if(restartLevelBtn) restartLevelBtn.disabled = !loaded || locked;
    if(previewBtn) previewBtn.disabled = !loaded;
    if(previewResetBtn) previewResetBtn.disabled = !loaded;

    updateCorrectTogglesUI();

    const thumbEl = $("previewThumb");
    if(thumbEl && photoData){
      thumbEl.src = photoData;
    }

    const previewImg = $("previewImage");
    if(previewImg && photoData){
      previewImg.src = photoData;
    }

    if(fullscreenToggleBtn){
      fullscreenToggleBtn.disabled = !loaded;
    }

    updatePauseBtnUI();
    updateTimerDisplay();
  }

  function emptyState(){
    board.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-icon" aria-hidden="true">🖼️</div>' +
        '<strong>Scegli la tua foto</strong>' +
        '<p>Carica un\'immagine per iniziare la partita.</p>' +
      '</div>';
  }

  function createSolvedPieces(){
    pieces = Array.from({ length: totalTiles() }, (_, i) => i);
    selectedTile = null;
  }

  function renderBoard(newlyCorrect = []){
    const { cols, rows } = getGridDimensions(levelIndex);

    board.innerHTML = "";
    board.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    board.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;

    const aspectCss = `${cols} / ${rows}`;
    const aspectNum = cols / rows;
    board.style.setProperty("--board-aspect", aspectCss);
    board.style.setProperty("--board-aspect-num", String(aspectNum));
    document.documentElement.style.setProperty("--board-aspect", aspectCss);
    document.documentElement.style.setProperty("--board-aspect-num", String(aspectNum));

    board.classList.toggle("show-correct", showCorrect);
    board.classList.toggle("is-solved-reveal", Boolean(locked && photoData && isSolved()));
    updateCorrectTogglesUI();

    if(!photoData){
      emptyState();
      updateUI();
      return;
    }

    const fragment = document.createDocumentFragment();

    pieces.forEach((piece, position) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.setAttribute("aria-label", `Tassello ${position + 1}`);
      tile.dataset.position = String(position);
      tile.dataset.piece = String(piece);
      tile.draggable = false;

      tile.style.backgroundImage = `url("${photoData}")`;
      tile.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;

      const col = piece % cols;
      const row = Math.floor(piece / cols);

      const posX = cols === 1 ? 0 : (col / (cols - 1)) * 100;
      const posY = rows === 1 ? 0 : (row / (rows - 1)) * 100;
      tile.style.backgroundPosition = `${posX}% ${posY}%`;

      if(piece === position){
        tile.classList.add("is-correct");
      }

      /* Animazione scuotimento e bagliore se il tassello è appena stato posizionato correttamente */
      if(newlyCorrect.includes(position)){
        tile.classList.add("tile-pulse");
        tile.addEventListener("animationend", e => {
          if(e.animationName === "tilePulseCorrect"){
            tile.classList.remove("tile-pulse");
          }
        });
      }

      if(selectedTile === position){
        tile.classList.add("selected");
      }

      /* Indicatore discreto di posizione corretta */
      const markSpan = document.createElement("span");
      markSpan.className = "tile-correct-mark";
      markSpan.textContent = "✓";
      tile.appendChild(markSpan);

      tile.addEventListener("click", () => handleTileClick(position));
      tile.addEventListener("pointerdown", onTilePointerDown);

      fragment.appendChild(tile);
    });

    board.appendChild(fragment);
    updateUI();
    syncFullscreenTopBarsAlignment();
    requestAnimationFrame(() => syncFullscreenTopBarsAlignment());
  }


  /*
   * Apertura della schermata di scelta livello e formato.
   */
  function openLevelChoice(
    mode="newGame",
    defaultLevel=0
  ){

    photoLoadMode=mode;

    selectedStartLevel=
      Math.max(
        0,
        Math.min(
          defaultLevel,
          LEVELS.length-1
        )
      );


    levelChoiceGrid
      .querySelectorAll(".level-choice-option")
      .forEach(button=>{

        const index=
          Number(button.dataset.level);

        button.classList.toggle(
          "active",
          index===selectedStartLevel
        );

      });


    if(formatChoiceGrid){
      formatChoiceGrid
        .querySelectorAll(".format-choice-option")
        .forEach(button=>{

          const fmt=button.dataset.format;

          button.classList.toggle(
            "active",
            fmt===selectedFormat
          );

        });
    }


    activeOverlay="levelChoice";

    levelChoiceOverlay.classList.add("show");
  }


  function downscaleImageDataUrl(imgEl, maxDim = 1920){
    const w = imgEl.naturalWidth || 1;
    const h = imgEl.naturalHeight || 1;
    if(Math.max(w, h) <= maxDim){
      return null;
    }
    const ratio = maxDim / Math.max(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * ratio));
    canvas.height = Math.max(1, Math.round(h * ratio));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  /*
   * Gestione Ritaglio/Zoom Nuovo Livello (Cambia foto) + Galleria IndexedDB (v. 1.24)
   */
  function generateCroppedPhotoFromImg(imgEl, targetLvlIdx, zoomVal, ratioXVal, ratioYVal){
    if(!imgEl || !imgEl.naturalWidth) return photoData;
    const natW = imgEl.naturalWidth;
    const natH = imgEl.naturalHeight;
    const lvl = typeof targetLvlIdx === "number" ? targetLvlIdx : selectedLevel;
    const { cols, rows } = getGridDimensionsForImg(lvl, natH > natW);
    const targetRatio = cols / rows;

    let baseSw, baseSh;
    if(natW / natH > targetRatio){
      baseSh = natH;
      baseSw = natH * targetRatio;
    } else {
      baseSw = natW;
      baseSh = natW / targetRatio;
    }

    const zoom = Math.max(1, Math.min(4, zoomVal || 1));
    const sw = Math.min(natW, Math.max(1, baseSw / zoom));
    const sh = Math.min(natH, Math.max(1, baseSh / zoom));

    const maxSrcPanX = Math.max(0, (natW - sw) / 2);
    const maxSrcPanY = Math.max(0, (natH - sh) / 2);
    const rx = Math.max(-1, Math.min(1, ratioXVal || 0));
    const ry = Math.max(-1, Math.min(1, ratioYVal || 0));

    const sx = Math.max(0, Math.min(natW - sw, (natW - sw) / 2 - rx * maxSrcPanX));
    const sy = Math.max(0, Math.min(natH - sh, (natH - sh) / 2 - ry * maxSrcPanY));

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cols * 240);
    canvas.height = Math.round(rows * 240);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.88);
  }

  function getGridDimensionsForImg(lvlIdx, portraitFlag){
    switch(lvlIdx){
      case 0: return { cols: 3, rows: 3 };
      case 1: return portraitFlag ? { cols: 3, rows: 4 } : { cols: 4, rows: 3 };
      case 2: return { cols: 4, rows: 4 };
      case 3: return portraitFlag ? { cols: 4, rows: 5 } : { cols: 5, rows: 4 };
      case 4: return { cols: 5, rows: 5 };
      case 5: return portraitFlag ? { cols: 5, rows: 6 } : { cols: 6, rows: 5 };
      case 6: return portraitFlag ? { cols: 5, rows: 7 } : { cols: 7, rows: 5 };
      default: return { cols: 3, rows: 3 };
    }
  }

  function updateNlCropGridOverlay(){
    if(!nlCropGridOverlay) return;
    const { cols, rows } = getGridDimensionsForImg(nlCropTargetLevel, nlIsPortraitPhoto);
    nlCropGridOverlay.innerHTML = "";
    const frag = document.createDocumentFragment();
    for(let c = 1; c < cols; c++){
      const vLine = document.createElement("div");
      vLine.className = "crop-grid-line-v";
      vLine.style.left = `${(c / cols) * 100}%`;
      frag.appendChild(vLine);
    }
    for(let r = 1; r < rows; r++){
      const hLine = document.createElement("div");
      hLine.className = "crop-grid-line-h";
      hLine.style.top = `${(r / rows) * 100}%`;
      frag.appendChild(hLine);
    }
    nlCropGridOverlay.appendChild(frag);
    if(nextCropBadge){
      nextCropBadge.textContent = `Livello ${nlCropTargetLevel + 1} · ${cols}×${rows}`;
    }
  }

  function updateNlCropZoomUI(){
    const clamped = Math.max(1, Math.min(4, nlCropZoom || 1));
    if(nlCropZoomResetBtn){
      nlCropZoomResetBtn.textContent = clamped <= 1.02 ? "1×" : `${clamped.toFixed(1)}×`;
    }
    if(nlCropZoomSlider){
      nlCropZoomSlider.value = String(clamped);
      const pct = ((clamped - 1) / 3) * 100;
      nlCropZoomSlider.style.setProperty("--zoom-pct", `${pct.toFixed(1)}%`);
    }
  }

  function updateNlCropFrameAndImage(syncRatioFromPixels = false){
    if(!nlCropPreviewBox || !nlCropSourceImg || !nlCropSelectionFrame) return;
    const boxW = nlCropPreviewBox.clientWidth;
    const boxH = nlCropPreviewBox.clientHeight;
    if(!boxW || !boxH || boxW < 20 || boxH < 20) return;

    const natW = nlCropSourceImg.naturalWidth || 600;
    const natH = nlCropSourceImg.naturalHeight || 600;
    const { cols, rows } = getGridDimensionsForImg(nlCropTargetLevel, nlIsPortraitPhoto);
    const targetRatio = cols / rows;

    const maxFrameW = Math.max(40, boxW - 24);
    const maxFrameH = Math.max(40, boxH - 24);
    let frameW = maxFrameW;
    let frameH = frameW / targetRatio;
    if(frameH > maxFrameH){
      frameH = maxFrameH;
      frameW = frameH * targetRatio;
    }

    const frameLeft = (boxW - frameW) / 2;
    const frameTop = (boxH - frameH) / 2;
    nlCropSelectionFrame.style.width = `${frameW}px`;
    nlCropSelectionFrame.style.height = `${frameH}px`;
    nlCropSelectionFrame.style.left = `${frameLeft}px`;
    nlCropSelectionFrame.style.top = `${frameTop}px`;

    const baseScale = Math.max(frameW / natW, frameH / natH);
    const scale = baseScale * Math.max(1, Math.min(4, nlCropZoom || 1));
    const imgW = natW * scale;
    const imgH = natH * scale;
    nlCropSourceImg.style.width = `${imgW}px`;
    nlCropSourceImg.style.height = `${imgH}px`;

    const maxPanX = Math.max(0, (imgW - frameW) / 2);
    const maxPanY = Math.max(0, (imgH - frameH) / 2);

    if(syncRatioFromPixels){
      nlCropPanX = Math.max(-maxPanX, Math.min(maxPanX, nlCropPanX));
      nlCropPanY = Math.max(-maxPanY, Math.min(maxPanY, nlCropPanY));
      nlCropPanRatioX = maxPanX > 0 ? nlCropPanX / maxPanX : 0;
      nlCropPanRatioY = maxPanY > 0 ? nlCropPanY / maxPanY : 0;
    } else {
      nlCropPanRatioX = Math.max(-1, Math.min(1, nlCropPanRatioX || 0));
      nlCropPanRatioY = Math.max(-1, Math.min(1, nlCropPanRatioY || 0));
      nlCropPanX = nlCropPanRatioX * maxPanX;
      nlCropPanY = nlCropPanRatioY * maxPanY;
    }

    nlCropSourceImg.style.left = `${frameLeft + (frameW - imgW) / 2 + nlCropPanX}px`;
    nlCropSourceImg.style.top = `${frameTop + (frameH - imgH) / 2 + nlCropPanY}px`;
    if(nlCropCenterBtn){
      nlCropCenterBtn.classList.toggle("is-shifted", Math.abs(nlCropPanX) > 1 || Math.abs(nlCropPanY) > 1 || (nlCropZoom || 1) > 1.02);
    }
  }

  function setNlCropZoom(nextZoom){
    const prevZoom = nlCropZoom;
    const clampedZoom = Math.max(1, Math.min(4, nextZoom));
    if(Math.abs(clampedZoom - prevZoom) < 0.001) return;
    nlCropZoom = clampedZoom;
    if(prevZoom > 0){
      nlCropPanX = nlCropPanX * (clampedZoom / prevZoom);
      nlCropPanY = nlCropPanY * (clampedZoom / prevZoom);
    }
    updateNlCropFrameAndImage(true);
    updateNlCropZoomUI();
  }

  function centerNlCropImage(){
    nlCropZoom = 1;
    nlCropPanX = 0;
    nlCropPanY = 0;
    nlCropPanRatioX = 0;
    nlCropPanRatioY = 0;
    updateNlCropFrameAndImage(false);
    updateNlCropZoomUI();
  }

  function openNextLevelCropModal(photoUrl, targetLevel, restoreWin = true){
    nlCropTargetLevel = Math.max(0, Math.min(LEVELS.length - 1, targetLevel));
    nlCropPhotoUrl = photoUrl;
    nlRestoreWinOnCancel = restoreWin;
    nlCropZoom = 1;
    nlCropPanX = 0;
    nlCropPanY = 0;
    nlCropPanRatioX = 0;
    nlCropPanRatioY = 0;

    stopWinParticles();
    if(winOverlay) winOverlay.classList.remove("show");
    if(nextLevelCropOverlay) nextLevelCropOverlay.classList.add("show");
    if(nlCropCenterBtn) nlCropCenterBtn.classList.remove("is-shifted");
    activeOverlay = "nextCrop";
    updateNlCropZoomUI();

    if(nlCropSourceImg){
      nlCropSourceImg.onload = () => {
        nlIsPortraitPhoto = nlCropSourceImg.naturalHeight > nlCropSourceImg.naturalWidth;
        updateNlCropGridOverlay();
        requestAnimationFrame(() => updateNlCropFrameAndImage());
      };
      nlCropSourceImg.src = photoUrl;
      if(nlCropSourceImg.complete && nlCropSourceImg.naturalWidth > 0){
        nlIsPortraitPhoto = nlCropSourceImg.naturalHeight > nlCropSourceImg.naturalWidth;
        updateNlCropGridOverlay();
        requestAnimationFrame(() => updateNlCropFrameAndImage());
      }
    }
  }

  function closeNextLevelCropModal(restoreWin = false){
    if(nextLevelCropOverlay) nextLevelCropOverlay.classList.remove("show");
    if(restoreWin && nlRestoreWinOnCancel){
      if(winOverlay) winOverlay.classList.add("show");
      activeOverlay = "win";
    } else {
      activeOverlay = "";
    }
  }

  function hasLoadedHomePhoto(){
    return Boolean(
      rawPhotoUrl &&
      cropSourceImg &&
      cropSourceImg.getAttribute("src") &&
      cropSourceImg.complete &&
      cropSourceImg.naturalWidth > 0
    );
  }

  function syncHomePhotoEmptyUI(){
    const hasPhoto = Boolean(rawPhotoUrl && cropSourceImg && cropSourceImg.getAttribute("src"));
    if(cropPreviewBox){
      cropPreviewBox.classList.toggle("is-empty", !hasPhoto);
    }
    if(cropEmptyMessage){
      cropEmptyMessage.style.display = hasPhoto ? "none" : "";
    }
    if(cropZoomSlider){
      cropZoomSlider.disabled = !hasPhoto;
    }
  }

  function clearHomePhoto(){
    rawPhotoUrl = "";
    photoData = null;
    isPortraitPhoto = false;
    cropZoom = 1;
    cropPanX = 0;
    cropPanY = 0;
    cropPanRatioX = 0;
    cropPanRatioY = 0;
    if(cropSourceImg){
      cropSourceImg.onload = null;
      cropSourceImg.removeAttribute("src");
    }
    updateCropZoomUI();
    syncHomePhotoEmptyUI();
  }

  function applyHomePhotoFromDataUrl(dataUrl){
    if(!dataUrl) return;
    rawPhotoUrl = dataUrl;
    if(cropSourceImg){
      cropSourceImg.onload = () => {
        isPortraitPhoto = cropSourceImg.naturalHeight > cropSourceImg.naturalWidth;
        cropZoom = 1;
        cropPanX = 0;
        cropPanY = 0;
        cropPanRatioX = 0;
        cropPanRatioY = 0;
        syncHomePhotoEmptyUI();
        updateLevelButtonsUI();
        updateCropFrameAndImage();
        saveGame();
      };
      cropSourceImg.src = dataUrl;
      syncHomePhotoEmptyUI();
    }
  }

  function openGalleryDB(){
    return new Promise((resolve, reject) => {
      if(!window.indexedDB){
        reject(new Error("IndexedDB non supportato"));
        return;
      }
      const req = indexedDB.open(GALLERY_DB_NAME, GALLERY_DB_VERSION);
      req.onupgradeneeded = event => {
        const db = event.target.result;
        if(!db.objectStoreNames.contains(GALLERY_STORE_NAME)){
          const store = db.createObjectStore(GALLERY_STORE_NAME, { keyPath: "id" });
          store.createIndex("addedAt", "addedAt", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Errore IndexedDB"));
    });
  }

  async function getAllGalleryPhotos(){
    const db = await openGalleryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GALLERY_STORE_NAME, "readonly");
      const store = tx.objectStore(GALLERY_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = Array.isArray(req.result) ? req.result : [];
        items.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function putGalleryPhoto(item){
    const db = await openGalleryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GALLERY_STORE_NAME, "readwrite");
      const store = tx.objectStore(GALLERY_STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteGalleryPhotoById(id){
    const db = await openGalleryDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GALLERY_STORE_NAME, "readwrite");
      const store = tx.objectStore(GALLERY_STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function estimateDataUrlBytes(dataUrl){
    if(!dataUrl || typeof dataUrl !== "string") return 0;
    const commaIdx = dataUrl.indexOf(",");
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    return Math.round((base64.length * 3) / 4);
  }

  function encodeImageToOptimizedDataUrl(imgEl, maxDim = 1600, quality = 0.85){
    const w = imgEl.naturalWidth || 1;
    const h = imgEl.naturalHeight || 1;
    const ratio = Math.max(w, h) > maxDim ? (maxDim / Math.max(w, h)) : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * ratio));
    canvas.height = Math.max(1, Math.round(h * ratio));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  }

  function loadImageFromUrl(srcUrl){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Immagine non caricabile"));
      img.src = srcUrl;
    });
  }

  function getDateKeyFromTs(ts){
    const d = new Date(ts || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatGalleryDateHeading(dateKey){
    const todayKey = getDateKeyFromTs(Date.now());
    const yesterdayKey = getDateKeyFromTs(Date.now() - 86400000);
    if(dateKey === todayKey) return "Oggi";
    if(dateKey === yesterdayKey) return "Ieri";
    const parts = String(dateKey).split("-");
    if(parts.length === 3){
      const months = [
        "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
      ];
      const mIdx = Math.max(0, Math.min(11, parseInt(parts[1], 10) - 1));
      return `${parseInt(parts[2], 10)} ${months[mIdx]} ${parts[0]}`;
    }
    return dateKey;
  }

  async function ensureStarterGallerySeeded(){
    try {
      const already = localStorage.getItem(GALLERY_SEEDED_KEY) === "1";
      const existing = await getAllGalleryPhotos();
      if(already || existing.length > 0){
        if(!already) localStorage.setItem(GALLERY_SEEDED_KEY, "1");
        return;
      }
      const now = Date.now();
      for(let i = 0; i < STARTER_GALLERY_ITEMS.length; i++){
        const starter = STARTER_GALLERY_ITEMS[i];
        try {
          const imgEl = await loadImageFromUrl(resolveHeroUrl(starter.url));
          const dataUrl = encodeImageToOptimizedDataUrl(imgEl, 1400, 0.84);
          const addedAt = now - (starter.daysAgo * 86400000) - (i * 60000);
          await putGalleryPhoto({
            id: starter.id,
            dataUrl,
            byteSize: estimateDataUrlBytes(dataUrl),
            addedAt,
            dateKey: getDateKeyFromTs(addedAt)
          });
        } catch(_) {}
      }
      localStorage.setItem(GALLERY_SEEDED_KEY, "1");
    } catch(_) {}
  }

  function showGalleryAlert(message){
    if(!galleryLimitAlert) return;
    if(!message){
      galleryLimitAlert.textContent = "";
      galleryLimitAlert.classList.remove("show");
      return;
    }
    galleryLimitAlert.textContent = message;
    galleryLimitAlert.classList.add("show");
  }

  function clearGalleryLongPressTimer(){
    if(galleryLongPressTimer){
      clearTimeout(galleryLongPressTimer);
      galleryLongPressTimer = null;
    }
  }

  function syncGallerySelectionUI(){
    if(galleryScrollBody){
      galleryScrollBody.classList.toggle("is-selection-mode", gallerySelectionMode);
      galleryScrollBody.querySelectorAll(".gallery-thumb-card").forEach(card => {
        const id = card.dataset.photoId;
        const checked = Boolean(id && gallerySelectedIds.has(id));
        card.classList.toggle("is-checked", checked);
        const box = card.querySelector(".gallery-check-box");
        if(box){
          box.textContent = checked ? "✓" : "";
          box.setAttribute("aria-checked", String(checked));
        }
      });
    }

    const count = gallerySelectedIds.size;
    if(galleryAddPhotoBtn){
      galleryAddPhotoBtn.style.display = gallerySelectionMode ? "none" : "";
    }
    if(galleryCancelSelectBtn){
      galleryCancelSelectBtn.style.display = gallerySelectionMode ? "" : "none";
    }
    if(galleryDeleteSelectedBtn){
      galleryDeleteSelectedBtn.style.display = (gallerySelectionMode && count > 0) ? "" : "none";
      galleryDeleteSelectedBtn.textContent = count > 1 ? `🗑️ Elimina (${count})` : "🗑️ Elimina";
    }
  }

  function enterGallerySelectionMode(initialId){
    gallerySelectionMode = true;
    gallerySelectedIds.clear();
    if(initialId) gallerySelectedIds.add(initialId);
    try {
      if(navigator.vibrate) navigator.vibrate(20);
    } catch(_) {}
    syncGallerySelectionUI();
  }

  function exitGallerySelectionMode(){
    clearGalleryLongPressTimer();
    gallerySelectionMode = false;
    gallerySelectedIds.clear();
    syncGallerySelectionUI();
  }

  function toggleGalleryPhotoSelection(id){
    if(!id) return;
    if(gallerySelectedIds.has(id)){
      gallerySelectedIds.delete(id);
    } else {
      gallerySelectedIds.add(id);
    }
    syncGallerySelectionUI();
  }

  function openGalleryDeleteConfirm(){
    const count = gallerySelectedIds.size;
    if(count <= 0) return;
    if(galleryDeleteConfirmTitle){
      galleryDeleteConfirmTitle.textContent = count === 1 ? "Eliminare la foto?" : `Eliminare ${count} foto?`;
    }
    if(galleryDeleteConfirmText){
      galleryDeleteConfirmText.textContent = count === 1
        ? "La foto selezionata verrà rimossa definitivamente dalla Galleria."
        : `Le ${count} foto selezionate verranno rimosse definitivamente dalla Galleria.`;
    }
    if(galleryDeleteConfirmOverlay) galleryDeleteConfirmOverlay.classList.add("show");
    activeOverlay = "galleryDeleteConfirm";
  }

  function closeGalleryDeleteConfirm(){
    if(galleryDeleteConfirmOverlay) galleryDeleteConfirmOverlay.classList.remove("show");
    if(galleryOverlay && galleryOverlay.classList.contains("show")){
      activeOverlay = "gallery";
    } else if(activeOverlay === "galleryDeleteConfirm"){
      activeOverlay = "";
    }
  }

  async function renderGalleryView(){
    if(!galleryScrollBody) return;
    await ensureStarterGallerySeeded();
    const items = await getAllGalleryPhotos();
    const existingIds = new Set(items.map(it => it.id));
    Array.from(gallerySelectedIds).forEach(id => {
      if(!existingIds.has(id)) gallerySelectedIds.delete(id);
    });
    if(items.length === 0){
      gallerySelectionMode = false;
      gallerySelectedIds.clear();
    }

    const totalBytes = items.reduce((acc, it) => acc + (it.byteSize || estimateDataUrlBytes(it.dataUrl)), 0);
    if(galleryQuotaLabel){
      const mbUsed = (totalBytes / (1024 * 1024)).toFixed(1);
      galleryQuotaLabel.textContent = `${mbUsed} MB / 75 MB · ${items.length} foto`;
    }

    galleryScrollBody.innerHTML = "";
    if(items.length === 0){
      const empty = document.createElement("div");
      empty.className = "gallery-empty";
      empty.textContent = "Nessuna foto in galleria. Premi \"Aggiungi foto\" per caricare immagini dal tuo dispositivo.";
      galleryScrollBody.appendChild(empty);
      syncGallerySelectionUI();
      return;
    }

    // Raggruppa per data di aggiunta (dalla più recente alla meno recente)
    const groupsMap = new Map();
    items.forEach(item => {
      const key = item.dateKey || getDateKeyFromTs(item.addedAt);
      if(!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(item);
    });

    const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));
    sortedKeys.forEach(dateKey => {
      const groupWrap = document.createElement("div");
      groupWrap.className = "gallery-date-group";

      const labelEl = document.createElement("div");
      labelEl.className = "gallery-date-label";
      labelEl.textContent = formatGalleryDateHeading(dateKey);
      groupWrap.appendChild(labelEl);

      const gridEl = document.createElement("div");
      gridEl.className = "gallery-grid-3";

      groupsMap.get(dateKey).forEach(item => {
        const card = document.createElement("div");
        card.className = "gallery-thumb-card";
        card.dataset.photoId = item.id;
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", "Seleziona foto dalla galleria");

        const img = document.createElement("img");
        img.src = item.dataUrl;
        img.alt = "Anteprima galleria";
        img.loading = "lazy";
        img.draggable = false;
        card.appendChild(img);

        const checkBox = document.createElement("span");
        checkBox.className = "gallery-check-box";
        checkBox.setAttribute("role", "checkbox");
        checkBox.setAttribute("aria-checked", "false");
        checkBox.setAttribute("aria-label", "Seleziona foto per l'eliminazione");
        card.appendChild(checkBox);

        let pressStartX = 0;
        let pressStartY = 0;

        card.addEventListener("contextmenu", event => {
          event.preventDefault();
        });

        card.addEventListener("pointerdown", event => {
          if(event.pointerType === "mouse" && event.button !== 0) return;
          if(gallerySelectionMode) return;
          clearGalleryLongPressTimer();
          pressStartX = event.clientX;
          pressStartY = event.clientY;
          galleryLongPressTimer = setTimeout(() => {
            galleryLongPressTimer = null;
            suppressGalleryClickUntil = Date.now() + 500;
            enterGallerySelectionMode(item.id);
          }, 450);
        });

        card.addEventListener("pointermove", event => {
          if(!galleryLongPressTimer) return;
          if(Math.hypot(event.clientX - pressStartX, event.clientY - pressStartY) > 10){
            clearGalleryLongPressTimer();
          }
        });

        card.addEventListener("pointerup", clearGalleryLongPressTimer);
        card.addEventListener("pointercancel", clearGalleryLongPressTimer);

        const handlePick = () => {
          if(Date.now() < suppressGalleryClickUntil) return;
          if(gallerySelectionMode){
            toggleGalleryPhotoSelection(item.id);
            return;
          }
          closeGalleryModal(false);
          if(galleryMode === "nextLevel"){
            openNextLevelCropModal(item.dataUrl, galleryTargetLevel, galleryRestoreWinOnCancel);
          } else {
            applyHomePhotoFromDataUrl(item.dataUrl);
          }
        };
        card.addEventListener("click", handlePick);
        card.addEventListener("keydown", event => {
          if(event.key === "Enter" || event.key === " "){
            event.preventDefault();
            handlePick();
          }
        });

        gridEl.appendChild(card);
      });

      groupWrap.appendChild(gridEl);
      galleryScrollBody.appendChild(groupWrap);
    });

    syncGallerySelectionUI();
  }

  async function openGalleryModal(mode = "home", targetLvl = 0, restoreWin = false){
    galleryMode = mode;
    galleryTargetLevel = targetLvl;
    galleryRestoreWinOnCancel = restoreWin;
    exitGallerySelectionMode();
    showGalleryAlert("");
    if(mode === "nextLevel"){
      stopWinParticles();
      if(winOverlay) winOverlay.classList.remove("show");
    }
    if(galleryOverlay) galleryOverlay.classList.add("show");
    activeOverlay = "gallery";
    await renderGalleryView();
  }

  function closeGalleryModal(restoreWin = true){
    closeGalleryDeleteConfirm();
    exitGallerySelectionMode();
    if(galleryOverlay) galleryOverlay.classList.remove("show");
    if(restoreWin && galleryMode === "nextLevel" && galleryRestoreWinOnCancel){
      if(winOverlay) winOverlay.classList.add("show");
      activeOverlay = "win";
    } else if(activeOverlay === "gallery"){
      activeOverlay = "";
    }
  }

  function readFileAsDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Errore lettura file"));
      reader.readAsDataURL(file);
    });
  }

  async function addFilesToGallery(fileList){
    const files = Array.isArray(fileList) ? fileList : Array.from(fileList || []);
    if(files.length === 0 || galleryBusy) return;
    galleryBusy = true;
    showGalleryAlert("");
    try {
      const existing = await getAllGalleryPhotos();
      let currentBytes = existing.reduce((acc, it) => acc + (it.byteSize || estimateDataUrlBytes(it.dataUrl)), 0);
      let limitHit = false;
      let addedCount = 0;

      for(let i = 0; i < files.length; i++){
        const file = files[i];
        if(!file) continue;
        const hasImageMime = Boolean(file.type && file.type.startsWith("image/"));
        const hasImageExt = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|svg)$/i.test(file.name || "");
        if(file.type && !hasImageMime && !hasImageExt) continue;
        let objectUrl = "";
        try {
          let imgEl;
          if(typeof URL !== "undefined" && typeof URL.createObjectURL === "function"){
            objectUrl = URL.createObjectURL(file);
            try {
              imgEl = await loadImageFromUrl(objectUrl);
            } catch(_) {
              const rawUrl = await readFileAsDataUrl(file);
              imgEl = await loadImageFromUrl(rawUrl);
            }
          } else {
            const rawUrl = await readFileAsDataUrl(file);
            imgEl = await loadImageFromUrl(rawUrl);
          }
          const optimizedUrl = encodeImageToOptimizedDataUrl(imgEl, 1600, 0.85);
          const byteSize = estimateDataUrlBytes(optimizedUrl);
          if(currentBytes + byteSize > GALLERY_MAX_BYTES){
            limitHit = true;
            break;
          }
          const addedAt = Date.now() + i;
          await putGalleryPhoto({
            id: `photo_${addedAt}_${Math.random().toString(36).slice(2, 7)}`,
            dataUrl: optimizedUrl,
            byteSize,
            addedAt,
            dateKey: getDateKeyFromTs(addedAt)
          });
          currentBytes += byteSize;
          addedCount += 1;
        } catch(_) {
        } finally {
          if(objectUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function"){
            try { URL.revokeObjectURL(objectUrl); } catch(_) {}
          }
        }
      }

      await renderGalleryView();
      if(limitHit){
        showGalleryAlert("Limite massimo di 75 MB raggiunto! Elimina alcune foto esistenti per liberare spazio.");
      } else if(addedCount === 0){
        showGalleryAlert("Impossibile caricare la foto selezionata. Prova con un altro file immagine (JPG, PNG o WebP).");
      }
    } finally {
      galleryBusy = false;
    }
  }


  function shufflePieces(automatic=false){

    if(!photoData || locked)
      return;

    if(!automatic && moves>0)
      return;


    const arr=
      Array.from(
        {length:totalTiles()},
        (_,i)=>i
      );


    for(
      let i=arr.length-1;
      i>0;
      i--
    ){

      const j=
        Math.floor(
          Math.random()*(i+1)
        );

      [arr[i],arr[j]]=
        [arr[j],arr[i]];
    }


    if(
      arr.every(
        (piece,position)=>
          piece===position
      )
    ){

      [arr[0],arr[1]]=
        [arr[1],arr[0]];
    }


    pieces=arr;
    selectedTile=null;
    mixed=true;


    if(automatic || moves===0)
      moves=0;


    renderBoard();
    saveGame();


    if(!automatic){

      setHint(
        "Puzzle rimescolato! Da questo momento, " +
        "dopo la prima mossa MIX si disattiva."
      );
    }
  }


  function handleTileClick(position){

    if(
      Date.now()<suppressClickUntil ||
      locked ||
      !mixed ||
      !photoData
    ){
      return;
    }

    resumeFromPause();

    if(selectedTile===null){

      selectedTile=position;

      renderBoard();

      setHint(
        "Ora tocca il tassello con cui vuoi scambiarlo."
      );

      return;
    }


    if(selectedTile===position){

      selectedTile=null;

      renderBoard();

      return;
    }


    swapTiles(
      selectedTile,
      position
    );
  }


  function swapTiles(from,to){

    if(
      locked ||
      !mixed ||
      from===to ||
      from<0 ||
      to<0 ||
      from>=pieces.length ||
      to>=pieces.length
    ){
      return;
    }

    const wasFromCorrect = pieces[from] === from;
    const wasToCorrect = pieces[to] === to;

    [pieces[from],pieces[to]]=
      [pieces[to],pieces[from]];

    /* Rileva se uno o entrambi i tasselli scambiati sono appena andati in posizione corretta */
    const newlyCorrect = [];
    if(!wasFromCorrect && pieces[from] === from){
      newlyCorrect.push(from);
    }
    if(!wasToCorrect && pieces[to] === to){
      newlyCorrect.push(to);
    }

    moves++;
    selectedTile=null;

    resumeFromPause();

    if(!isSolved()){
      playSound(newlyCorrect.length > 0 ? "correct" : "swap");
    }

    if(typeof navigator !== "undefined" && typeof navigator.vibrate === "function"){
      try{
        if(newlyCorrect.length > 0){
          if(!navigator.vibrate([50, 35, 70])){
            navigator.vibrate(65);
          }
        }else{
          navigator.vibrate(20);
        }
      }catch(_){}
    }

    renderBoard(newlyCorrect);


    if(isSolved()){

      completeLevel();

    }else{

      setHint(
        "Continua: ogni scambio ti avvicina alla soluzione."
      );

      saveGame();
    }
  }


  function isSolved(){

    return pieces.every(
      (piece,position)=>
        piece===position
    );
  }


  function restartLevel(){

    if(!photoData || locked)
      return;

    clearPendingWinReveal();

    moves=0;
    mixed=false;
    selectedTile=null;

    resetTimer();


    createSolvedPieces();

    shufflePieces(true);

    resetPreviewZoom();

    setHint(
      "Livello ricominciato: i tasselli sono già mescolati."
    );


    saveGame();
  }


  /*
   * Grafiche vettoriali HD stile cartone animato dei quattro Supereroi (v. 1.10).
   */
  function heroSvg(hero,index){

    if(hero.type==="spiderman"){
      /* LIVELLO 1: SPIDER-MAN */
      return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 240 220"
        role="img"
        aria-label="Spider-Man, supereroe amichevole di quartiere">

        <!-- Ragnatela di sfondo ed effetti comic -->
        <g opacity=".4" stroke="#ef4444" stroke-width="1.8" fill="none">
          <circle cx="120" cy="85" r="38"/>
          <circle cx="120" cy="85" r="70"/>
          <path d="M120 15 L120 155 M50 85 L190 85 M70 35 L170 135 M170 35 L70 135"/>
        </g>

        <!-- Filo e anello di ragnatela -->
        <path d="M50 40 Q75 18 100 52 Q125 86 160 55" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M160 55 Q175 40 185 58 Q195 76 178 85 Q161 94 160 55" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Figure Spider-Man -->
        <g class="hero-figure" stroke-linecap="round" stroke-linejoin="round">

          <!-- Braccio sinistro (posa eroica) -->
          <path d="M84 108 L58 126 L69 138 L95 120" fill="#dc2626" stroke="#991b1b" stroke-width="3.5"/>
          <circle cx="56" cy="132" r="9" fill="#dc2626" stroke="#991b1b" stroke-width="3"/>

          <!-- Braccio destro con spara-ragnatele -->
          <path d="M156 108 L182 88 L194 99 L168 119" fill="#dc2626" stroke="#991b1b" stroke-width="3.5"/>
          <circle cx="188" cy="90" r="9" fill="#dc2626" stroke="#991b1b" stroke-width="3"/>

          <!-- Corpo/Busto (rosso e blu classico) -->
          <path d="M90 106 Q120 95 150 106 L144 166 Q120 178 96 166 Z" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="3.5"/>
          <path d="M102 104 Q120 97 138 104 L134 168 Q120 175 106 168 Z" fill="#dc2626" stroke="#991b1b" stroke-width="3"/>

          <!-- Ragnatele sul busto -->
          <path d="M120 104 L120 168 M106 122 Q120 128 134 122 M108 142 Q120 148 132 142" stroke="#111827" stroke-width="1.8" fill="none"/>

          <!-- Gambe -->
          <path d="M96 164 L90 192 L112 192 L120 172 L128 192 L150 192 L144 164" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="3.5"/>
          <!-- Stivali rossi -->
          <path d="M88 184 L114 184 L112 194 L88 194 Z M126 184 L152 184 L150 194 L126 194 Z" fill="#dc2626" stroke="#991b1b" stroke-width="2.5"/>

          <!-- Logo Ragno sul petto -->
          <circle cx="120" cy="132" r="4.5" fill="#111827"/>
          <path d="M120 128 L114 123 M120 128 L126 123 M120 134 L113 138 M120 134 L127 138" stroke="#111827" stroke-width="2.2"/>

          <!-- Testa/Maschera -->
          <ellipse cx="120" cy="66" rx="30" ry="34" fill="#dc2626" stroke="#991b1b" stroke-width="3.5"/>

          <!-- Motivo ragnatela sulla maschera -->
          <g stroke="#111827" stroke-width="1.6" fill="none">
            <path d="M120 32 L120 100 M90 66 L150 66"/>
            <path d="M99 43 L141 89 M141 43 L99 89"/>
            <ellipse cx="120" cy="66" rx="14" ry="16"/>
            <ellipse cx="120" cy="66" rx="24" ry="27"/>
          </g>

          <!-- Occhi iconici da fumetto (grandi, bianchi con bordo nero lucido) -->
          <path d="M100 58 Q114 55 117 73 Q109 77 98 67 Z" fill="#ffffff" stroke="#111827" stroke-width="3.8"/>
          <path d="M140 58 Q126 55 123 73 Q131 77 142 67 Z" fill="#ffffff" stroke="#111827" stroke-width="3.8"/>

          <!-- Riflessi lucidi negli occhi -->
          <ellipse cx="107" cy="64" rx="3.5" ry="5" fill="#f8fafc" opacity=".85"/>
          <ellipse cx="133" cy="64" rx="3.5" ry="5" fill="#f8fafc" opacity=".85"/>

          <!-- Stelle comic spark -->
          <polygon points="45,95 48,102 55,103 50,108 52,115 45,111 38,115 40,108 35,103 42,102" fill="#fbbf24"/>
          <polygon points="198,35 200,41 206,42 201,46 203,52 198,49 193,52 195,46 190,42 196,41" fill="#38bdf8"/>
        </g>
      </svg>`;
    }


    if(hero.type==="hulk"){
      /* LIVELLO 2: HULK */
      return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 240 220"
        role="img"
        aria-label="Hulk, il gigante verde più forte">

        <!-- Onde d'urto ed energia gamma -->
        <g opacity=".35" stroke="#22c55e" stroke-width="2.5" fill="none">
          <circle cx="120" cy="110" r="85"/>
          <circle cx="120" cy="110" r="105"/>
          <path d="M35 150 Q45 130 30 115 M205 150 Q195 130 210 115" stroke-width="3"/>
        </g>

        <!-- Figure Hulk Cartoon -->
        <g class="hero-figure" stroke-linecap="round" stroke-linejoin="round">

          <!-- Bicipite sinistro in flex -->
          <path d="M78 114 Q48 100 50 78 Q68 70 82 92" fill="#15803d" stroke="#14532d" stroke-width="4"/>
          <circle cx="54" cy="74" r="14" fill="#22c55e" stroke="#14532d" stroke-width="3.5"/>
          <path d="M48 70 L58 76 M46 76 L56 82" stroke="#14532d" stroke-width="2.5"/>

          <!-- Bicipite destro in flex -->
          <path d="M162 114 Q192 100 190 78 Q172 70 158 92" fill="#15803d" stroke="#14532d" stroke-width="4"/>
          <circle cx="186" cy="74" r="14" fill="#22c55e" stroke="#14532d" stroke-width="3.5"/>
          <path d="M182 70 L192 76 M184 76 L194 82" stroke="#14532d" stroke-width="2.5"/>

          <!-- Spalle e torace possente -->
          <path d="M74 100 Q120 86 166 100 L156 165 Q120 178 84 165 Z" fill="#22c55e" stroke="#14532d" stroke-width="4"/>

          <!-- Definizione pettorali cartoon -->
          <path d="M96 112 Q120 118 120 135 M144 112 Q120 118 120 135" stroke="#15803d" stroke-width="3.5" fill="none"/>
          <path d="M102 144 Q120 148 138 144 M106 156 Q120 160 134 156" stroke="#15803d" stroke-width="3" fill="none"/>

          <!-- Pantaloni strappati viola classici -->
          <path d="M84 162 L78 190 L98 185 L106 193 L120 170 L134 193 L142 185 L162 190 L156 162 Z" fill="#7e22ce" stroke="#581c87" stroke-width="3.5"/>
          <path d="M90 176 L94 186 M146 176 L150 186" stroke="#e9d5ff" stroke-width="2"/>

          <!-- Gambe possenti verdi -->
          <path d="M84 188 L80 206 L104 206 L108 192 M132 192 L136 206 L160 206 L156 188" fill="#15803d" stroke="#14532d" stroke-width="3.5"/>

          <!-- Testa Hulk: mascella squadrata e sorriso fiero -->
          <path d="M88 48 Q120 36 152 48 L148 88 Q120 102 92 88 Z" fill="#22c55e" stroke="#14532d" stroke-width="4"/>

          <!-- Capelli scuri scompigliati cartoon -->
          <path d="M86 52 Q92 28 120 28 Q148 28 154 52 L146 44 Q135 34 120 37 Q105 34 94 44 Z" fill="#14532d" stroke="#052e16" stroke-width="3.5"/>

          <!-- Sopracciglia decise -->
          <path d="M96 56 L112 60 M128 60 L144 56" stroke="#14532d" stroke-width="4.5"/>

          <!-- Occhi espressivi verdi -->
          <ellipse cx="106" cy="66" rx="4.5" ry="4" fill="#ffffff" stroke="#14532d" stroke-width="2.5"/>
          <circle cx="106" cy="66" r="2.5" fill="#14532d"/>
          <ellipse cx="134" cy="66" rx="4.5" ry="4" fill="#ffffff" stroke="#14532d" stroke-width="2.5"/>
          <circle cx="134" cy="66" r="2.5" fill="#14532d"/>

          <!-- Naso e sorriso eroico da gigante buono -->
          <path d="M116 72 Q120 75 124 72" stroke="#14532d" stroke-width="2.5" fill="none"/>
          <path d="M104 80 Q120 92 136 80" fill="#ffffff" stroke="#14532d" stroke-width="3"/>
          <path d="M112 84 L112 87 M120 85 L120 88 M128 84 L128 87" stroke="#14532d" stroke-width="2"/>

          <!-- Fulmini di energia gamma -->
          <path d="M36 50 L44 58 L38 60 L46 70" stroke="#facc15" stroke-width="3.5" fill="none"/>
          <path d="M204 50 L196 58 L202 60 L194 70" stroke="#facc15" stroke-width="3.5" fill="none"/>
        </g>
      </svg>`;
    }


    if(hero.type==="batman"){
      /* LIVELLO 3: BATMAN */
      return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 240 220"
        role="img"
        aria-label="Batman, il Cavaliere Oscuro">

        <!-- Bat-segnale luminoso sullo sfondo -->
        <circle cx="120" cy="80" r="54" fill="#fef08a" opacity=".4"/>
        <circle cx="120" cy="80" r="42" fill="#fef08a" opacity=".55"/>

        <!-- Pipistrelli in lontananza -->
        <path d="M42 36 Q47 30 52 36 Q47 42 42 36 M188 32 Q194 26 200 32 Q194 38 188 32" fill="#1e293b"/>
        <path d="M28 58 Q33 53 38 58 Q33 63 28 58 M198 55 Q203 50 208 55 Q203 60 198 55" fill="#1e293b"/>

        <!-- Figure Batman Cartoon -->
        <g class="hero-figure" stroke-linecap="round" stroke-linejoin="round">

          <!-- Mantello maestoso che scende ai lati -->
          <path d="M78 86 Q40 120 32 188 Q62 174 88 180 Q96 140 102 118" fill="#0f172a" stroke="#020617" stroke-width="4"/>
          <path d="M162 86 Q200 120 208 188 Q178 174 152 180 Q144 140 138 118" fill="#0f172a" stroke="#020617" stroke-width="4"/>

          <!-- Braccia in posa solenne -->
          <path d="M84 104 L60 132 L74 142 L98 120" fill="#334155" stroke="#1e293b" stroke-width="3.5"/>
          <!-- Guanti neri con punte iconiche -->
          <path d="M60 132 L50 144 L66 148 Z M54 135 L44 138 M58 141 L48 144" fill="#0f172a" stroke="#020617" stroke-width="2.5"/>

          <path d="M156 104 L180 132 L166 142 L142 120" fill="#334155" stroke="#1e293b" stroke-width="3.5"/>
          <path d="M180 132 L190 144 L174 148 Z M186 135 L196 138 M182 141 L192 144" fill="#0f172a" stroke="#020617" stroke-width="2.5"/>

          <!-- Corpo/Tuta grigio scuro -->
          <path d="M92 100 Q120 94 148 100 L142 165 Q120 172 98 165 Z" fill="#475569" stroke="#1e293b" stroke-width="3.5"/>

          <!-- Emblema pipistrello sul petto (ovale giallo con pipistrello nero) -->
          <ellipse cx="120" cy="126" rx="20" ry="12" fill="#facc15" stroke="#ca8a04" stroke-width="2.5"/>
          <!-- Sagoma pipistrello -->
          <path d="M112 126 Q116 120 120 123 Q124 120 128 126 Q125 128 123 125 L122 130 L120 128 L118 130 L117 125 Q115 128 112 126 Z" fill="#0f172a"/>

          <!-- Cintura multiuso dorata con capsule -->
          <rect x="94" y="156" width="52" height="11" rx="3" fill="#eab308" stroke="#a16207" stroke-width="2.5"/>
          <rect x="114" y="154" width="12" height="15" rx="3" fill="#fef08a" stroke="#a16207" stroke-width="2"/>
          <rect x="97" y="157" width="6" height="9" fill="#ca8a04"/>
          <rect x="105" y="157" width="6" height="9" fill="#ca8a04"/>
          <rect x="129" y="157" width="6" height="9" fill="#ca8a04"/>
          <rect x="137" y="157" width="6" height="9" fill="#ca8a04"/>

          <!-- Gambe -->
          <path d="M96 166 L90 196 L112 196 L120 174 L128 196 L150 196 L144 166" fill="#1e293b" stroke="#020617" stroke-width="3.5"/>

          <!-- Maschera con orecchie a punta iconiche -->
          <!-- Orecchie -->
          <polygon points="94,62 86,22 104,45" fill="#0f172a" stroke="#020617" stroke-width="3"/>
          <polygon points="146,62 154,22 136,45" fill="#0f172a" stroke="#020617" stroke-width="3"/>

          <!-- Cappuccio/Maschera -->
          <path d="M92 56 Q120 40 148 56 L145 92 Q120 102 95 92 Z" fill="#0f172a" stroke="#020617" stroke-width="3.5"/>

          <!-- Zona bocca/mento umano -->
          <path d="M105 76 Q120 72 135 76 L131 92 Q120 98 109 92 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="2"/>
          <!-- Sorriso fiducioso del Cavaliere Oscuro -->
          <path d="M113 86 Q120 90 127 86" stroke="#9a3412" stroke-width="2.5" fill="none"/>

          <!-- Occhi bianchi da cappuccio (tagli triangolari) -->
          <polygon points="102,64 114,68 104,71" fill="#ffffff"/>
          <polygon points="138,64 126,68 136,71" fill="#ffffff"/>
        </g>
      </svg>`;
    }


    /* LIVELLO 4: SUPERMAN */
    return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 220"
      role="img"
      aria-label="Superman, l'Uomo d'Acciaio">

      <!-- Raggi solari dorati di Metropolis -->
      <g opacity=".4" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round">
        <line x1="120" y1="12" x2="120" y2="3"/>
        <line x1="60" y1="35" x2="48" y2="25"/>
        <line x1="180" y1="35" x2="192" y2="25"/>
        <line x1="28" y1="85" x2="16" y2="85"/>
        <line x1="212" y1="85" x2="224" y2="85"/>
      </g>
      <circle cx="120" cy="75" r="65" fill="#fef08a" opacity=".3"/>

      <!-- Figure Superman Cartoon -->
      <g class="hero-figure" stroke-linecap="round" stroke-linejoin="round">

        <!-- Mantello rosso fiammeggiante dietro le spalle -->
        <path d="M78 88 Q35 125 32 192 Q68 180 94 186 Q100 144 104 116" fill="#dc2626" stroke="#991b1b" stroke-width="4"/>
        <path d="M162 88 Q205 125 208 192 Q172 180 146 186 Q140 144 136 116" fill="#dc2626" stroke="#991b1b" stroke-width="4"/>

        <!-- Braccia sui fianchi (posa classica del trionfo) -->
        <path d="M84 104 L58 132 L82 144 L96 122" fill="#2563eb" stroke="#1d4ed8" stroke-width="3.5"/>
        <circle cx="82" cy="144" r="8" fill="#fed7aa" stroke="#ea580c" stroke-width="2.5"/>

        <path d="M156 104 L182 132 L158 144 L144 122" fill="#2563eb" stroke="#1d4ed8" stroke-width="3.5"/>
        <circle cx="158" cy="144" r="8" fill="#fed7aa" stroke="#ea580c" stroke-width="2.5"/>

        <!-- Corpo/Tuta blu regale -->
        <path d="M88 100 Q120 92 152 100 L144 165 Q120 174 96 165 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="3.5"/>

        <!-- Scudo 'S' leggendario sul petto (diamante giallo e rosso) -->
        <polygon points="120,110 138,118 132,138 120,147 108,138 102,118" fill="#facc15" stroke="#dc2626" stroke-width="3.2"/>
        <!-- Disegno cartoon della 'S' -->
        <path d="M128 116 L113 116 Q108 122 114 127 L125 130 Q131 135 126 142 L112 142" stroke="#dc2626" stroke-width="3.8" stroke-linecap="square" fill="none"/>

        <!-- Cintura gialla con fibbia ovale -->
        <rect x="94" y="156" width="52" height="10" rx="3" fill="#facc15" stroke="#ca8a04" stroke-width="2.5"/>
        <ellipse cx="120" cy="161" rx="7" ry="5.5" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>

        <!-- Slip rossi classici -->
        <path d="M96 165 L106 178 L120 172 L134 178 L144 165 Z" fill="#dc2626" stroke="#991b1b" stroke-width="2.5"/>

        <!-- Gambe blu con stivali rossi -->
        <path d="M96 172 L90 196 L112 196 L120 176 L128 196 L150 196 L144 172" fill="#2563eb" stroke="#1d4ed8" stroke-width="3.5"/>
        <!-- Stivali rossi con punta a V -->
        <path d="M88 184 L100 188 L114 184 L112 198 L88 198 Z M126 184 L140 188 L152 184 L150 198 L126 198 Z" fill="#dc2626" stroke="#991b1b" stroke-width="2.5"/>

        <!-- Collo e Testa -->
        <path d="M108 88 L108 102 L132 102 L132 88 Z" fill="#fed7aa"/>
        <ellipse cx="120" cy="62" rx="26" ry="29" fill="#fed7aa" stroke="#ea580c" stroke-width="3"/>

        <!-- Capelli scuri con l'iconico ciuffo a 'S' sulla fronte -->
        <path d="M96 56 Q94 30 120 30 Q146 30 144 56 Q132 40 120 42 Q108 40 96 56 Z" fill="#0f172a" stroke="#020617" stroke-width="3"/>
        <!-- Ciuffo a 'S' -->
        <path d="M120 42 Q125 48 121 54 Q116 57 118 60" fill="none" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round"/>

        <!-- Occhi fieri celesti e sopracciglia decise -->
        <path d="M102 54 L114 56 M126 56 L138 54" stroke="#0f172a" stroke-width="3.5"/>
        <circle cx="108" cy="62" r="3.5" fill="#0284c7"/>
        <circle cx="109" cy="61" r="1.2" fill="#ffffff"/>
        <circle cx="132" cy="62" r="3.5" fill="#0284c7"/>
        <circle cx="133" cy="61" r="1.2" fill="#ffffff"/>

        <!-- Sorriso radioso da Uomo d'Acciaio -->
        <path d="M110 74 Q120 83 130 74" fill="#ffffff" stroke="#c2410c" stroke-width="2.8"/>

        <!-- Spille oro del mantello -->
        <circle cx="94" cy="100" r="4" fill="#facc15" stroke="#ca8a04" stroke-width="1.8"/>
        <circle cx="146" cy="100" r="4" fill="#facc15" stroke="#ca8a04" stroke-width="1.8"/>
      </g>
    </svg>`;
  }


  function showHero(index){
    if(index < 3){
      const trainingGlows = ["#86efac", "#93c5fd", "#fde047"];

      if(heroStage){
        heroStage.style.setProperty("--hero-glow", trainingGlows[index] || "#86efac");
      }

      if(heroName){
        heroName.textContent = "";
        heroName.style.display = "none";
      }

      if(heroTagline){
        heroTagline.textContent = "";
        heroTagline.style.display = "none";
      }

      if(heroPhoto) heroPhoto.style.display = "none";
      heroStageImgs.forEach(img => img.classList.remove("is-active"));

      const preloadedTrainReady = Boolean(
        trainingCelebrationImg &&
        trainingCelebrationImg.complete &&
        trainingCelebrationImg.naturalWidth > 0
      );
      if(trainingCelebrationImg){
        trainingCelebrationImg.classList.toggle("is-active", preloadedTrainReady);
      }

      if(heroArt){
        if(preloadedTrainReady){
          heroArt.style.display = "none";
        } else {
          heroArt.style.display = "flex";
          heroArt.style.alignItems = "center";
          heroArt.style.justifyContent = "center";
          heroArt.style.padding = "0";
          heroArt.style.width = "100%";
          heroArt.style.height = "100%";
          heroArt.innerHTML = "";

          const imgEl = document.createElement("img");
          imgEl.className = "hero-training-img";
          imgEl.alt = "Livello completato";
          imgEl.draggable = false;

          const candidates = getTrainingCandidateUrls();
          if(trainingCelebrationUrl && !candidates.includes(trainingCelebrationUrl)){
            candidates.unshift(trainingCelebrationUrl);
          }
          let candIdx = 0;
          const tryLoadTrainImg = () => {
            if(candIdx < candidates.length){
              imgEl.src = candidates[candIdx++];
            } else {
              // Fallback SVG di sicurezza se nessuna risorsa immagine è raggiungibile
              heroArt.innerHTML = `<svg viewBox="0 0 240 180" width="82%" height="82%" aria-hidden="true"><defs><radialGradient id="trBg" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="#fef08a" stop-opacity="0.9"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/></radialGradient></defs><circle cx="120" cy="90" r="78" fill="url(#trBg)"/><path d="M120 26 L136 66 L179 70 L146 98 L156 140 L120 118 L84 140 L94 98 L61 70 L104 66 Z" fill="#facc15" stroke="#ca8a04" stroke-width="5" stroke-linejoin="round"/><circle cx="72" cy="46" r="6" fill="#60a5fa"/><circle cx="170" cy="48" r="5" fill="#34d399"/><circle cx="64" cy="126" r="5" fill="#f472b6"/><circle cx="176" cy="124" r="6" fill="#fbbf24"/></svg>`;
            }
          };
          imgEl.addEventListener("error", tryLoadTrainImg);
          imgEl.addEventListener("load", () => {
            trainingCelebrationUrl = imgEl.currentSrc || imgEl.src;
          });
          heroArt.appendChild(imgEl);
          tryLoadTrainImg();
        }
      }
      return;
    }

    // Livelli 4, 5, 6, 7: Supereroi (Livello 4 -> Spiderman, 5 -> Venom, 6 -> Batman, 7 -> Superman)
    const heroIdx = index - 3;
    const hero = HEROES[heroIdx] || HEROES[0];

    if(heroStage){
      heroStage.style.setProperty(
        "--hero-glow",
        hero.glow || "#dcfce7"
      );
    }

    if(heroName){
      heroName.textContent = hero.name;
      heroName.style.display = "";
    }

    if(heroTagline){
      heroTagline.textContent = hero.tagline;
      heroTagline.style.display = "";
    }

    if(heroArt) heroArt.style.display = "none";
    if(trainingCelebrationImg) trainingCelebrationImg.classList.remove("is-active");

    // Mostra istantaneamente l'immagine già decodificata nello stage se disponibile
    let shownPreloaded = false;
    heroStageImgs.forEach((img, key) => {
      const match = key === heroIdx && img.complete && img.naturalWidth > 0;
      img.classList.toggle("is-active", match);
      if(match) shownPreloaded = true;
    });

    if(heroPhoto){
      if(shownPreloaded){
        heroPhoto.style.display = "none";
      } else {
        delete heroPhoto.dataset.retry;
        heroPhoto.decoding = "sync";
        heroPhoto.style.display = "block";
        const cachedUrl = heroBlobCache.get(heroIdx);
        const resolved = cachedUrl || ((hero.image && (hero.image.startsWith("data:") || hero.image.startsWith("blob:")))
          ? hero.image
          : (getHeroDataUrl(heroIdx, "") || resolveHeroUrl(hero.image)));

        heroPhoto.onerror = ()=>{
          if(!heroPhoto.dataset.retry){
            heroPhoto.dataset.retry = "1";
            const mem = getHeroDataUrl(heroIdx, "");
            if(mem) {
              heroPhoto.src = mem;
              return;
            }
            heroPhoto.src = hero.image;
          }else if(heroPhoto.dataset.retry === "1"){
            heroPhoto.dataset.retry = "2";
            heroPhoto.src = "/" + hero.image.replace(/^\.?\//, "");
          }else if(heroPhoto.dataset.retry === "2"){
            heroPhoto.dataset.retry = "3";
            heroPhoto.src = "./public/" + hero.image.replace(/^\.?\//, "");
          }
        };

        if(heroPhoto.getAttribute("src") !== resolved){
          heroPhoto.src = resolved;
        }
        heroPhoto.alt = hero.name;
        heroPhoto.style.objectFit = "cover";
        if(index === 3){
          heroPhoto.style.objectPosition = "center center";
        }else{
          heroPhoto.style.objectPosition = hero.objectPosition || "center top";
        }
      }
    }
  }


  function renderWinScoreWidget(scoreToShow, rank){
    if(!winScoreWidget) return;
    const medalIcons = { 1: "🥇", 2: "🥈", 3: "🥉" };
    const medalHtml = (rank === 1 || rank === 2 || rank === 3)
      ? `<div class="win-score-medal-badge rank-${rank}" aria-label="${rank}° posto in classifica">` +
        `<span class="win-score-medal-icon">${medalIcons[rank]}</span>` +
        `<span class="win-score-medal-rank">${rank}° posto</span>` +
        `</div>`
      : "";
    winScoreWidget.innerHTML =
      `<div class="win-score-main">` +
        `<span class="win-score-label">Punteggio</span>` +
        `<div class="win-score-value">${scoreToShow}<span class="win-score-unit">pt</span></div>` +
      `</div>` +
      medalHtml;
  }


  function showWinDialog(celebrate=true){

    showHero(levelIndex);

    const displayScore = typeof lastWinScore === "number"
      ? lastWinScore
      : calculateScore(levelIndex, moves, timerSeconds);

    if(winStatsSummary){
      winStatsSummary.innerHTML =
        `<span>🎯 Mosse: <strong>${moves}</strong></span>` +
        `<span>⏱️ Tempo: <strong>${formatTime(timerSeconds)}</strong></span>`;
    }

    renderWinScoreWidget(displayScore, lastWinRank);

    const winTitleEl = $("winTitle");
    const winMsgEl = $("winMessage");
    const nextBtnEl = $("nextLevelBtn");
    const newGameBtnEl = $("newGameBtn");
    const bottomRowEl = winExitBtn ? winExitBtn.parentElement : null;

    if(winTitleEl){
      winTitleEl.textContent = `Livello ${levelIndex + 1} completato!`;
    }

    if(levelIndex < 3){
      const remaining = 3 - levelIndex;
      if(winMsgEl){
        winMsgEl.classList.add("is-training-msg");
        winMsgEl.style.display = "";
        winMsgEl.textContent = `Completa ancora ${remaining} ${remaining === 1 ? "livello" : "livelli"} per incontrare i tuoi Supereroi!`;
      }
    } else if(levelIndex === LEVELS.length - 1){
      if(winMsgEl){
        winMsgEl.classList.remove("is-training-msg");
        winMsgEl.style.display = "";
        winMsgEl.textContent = "Superman ti applaude: hai completato tutti e sette i livelli!";
      }
    } else {
      if(winMsgEl){
        winMsgEl.classList.remove("is-training-msg");
        winMsgEl.style.display = "none";
        winMsgEl.textContent = "";
      }
    }

    if(levelIndex === LEVELS.length - 1){
      if(winActionsTop) winActionsTop.style.display = "none";
      if(winExitBtn) winExitBtn.style.display = "none";
      if(bottomRowEl) bottomRowEl.style.justifyContent = "center";
      if(nextBtnEl){
        nextBtnEl.textContent = "Riepilogo partita →";
        nextBtnEl.disabled = false;
      }
    } else {
      if(winActionsTop) winActionsTop.style.display = "";
      if(winExitBtn) winExitBtn.style.display = "";
      if(bottomRowEl) bottomRowEl.style.justifyContent = "space-between";
      if(newGameBtnEl) newGameBtnEl.textContent = "📷 Cambia foto";
      if(nextBtnEl){
        nextBtnEl.textContent = `Livello ${levelIndex + 2} →`;
        nextBtnEl.disabled = false;
      }
    }

    activeOverlay = "win";
    if(heroStage){
      heroStage.classList.remove("is-revealing");
      if(celebrate){
        void heroStage.offsetWidth;
        heroStage.classList.add("is-revealing");
        heroStage.addEventListener("animationend", () => {
          heroStage.classList.remove("is-revealing");
        }, { once: true });
      }
    }
    if(winOverlay) winOverlay.classList.add("show");

    if(celebrate){
      launchConfetti();
      launchWinParticleExplosion(levelIndex);
    }
  }


  function resetHomeSelectionAndCrop(){
    selectedLevel = 0;
    cropZoom = 1;
    cropPanX = 0;
    cropPanY = 0;
    cropPanRatioX = 0;
    cropPanRatioY = 0;
    updateLevelButtonsUI();
    updateCropZoomUI();
    updateCropFrameAndImage();
  }


  function openGameSummaryModal(celebrate=true, options={}){
    const skipExitReset = Boolean(options && options.skipExitReset);
    stopWinParticles();

    if(!skipExitReset){
      const needsFsSettle = Boolean(
        isFullscreen ||
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        (gamePanel && gamePanel.classList.contains("fs-layout-landscape"))
      );
      if(needsFsSettle){
        isExitingToSummary = true;
        if(screenTransitionCurtain){
          screenTransitionCurtain.classList.remove("is-top");
          screenTransitionCurtain.classList.add("is-active");
        }
        if(winOverlay) winOverlay.classList.remove("show");
        if(exitConfirmOverlay) exitConfirmOverlay.classList.remove("show", "is-transitioning", "is-busy");
        stopTimer();
        finalizeSessionScore();
        inGameSession = false;
        if(gamePanel){
          gamePanel.style.display = "none";
          gamePanel.classList.add("hidden-initial");
        }
        document.body.classList.remove("in-game");
        const fsSettle = toggleFullscreen(false);
        fsSettle.finally(() => {
          requestAnimationFrame(() => {
            if(cropSelectionFrame) cropSelectionFrame.classList.add("no-transition");
            showHomeView();
            resetHomeSelectionAndCrop();
            isExitingToSummary = false;
            openGameSummaryModal(celebrate, { skipExitReset: true });
            if(screenTransitionCurtain) screenTransitionCurtain.classList.remove("is-active", "is-top");
            requestAnimationFrame(() => {
              if(cropSelectionFrame) cropSelectionFrame.classList.remove("no-transition");
            });
          });
        });
        return;
      }
      if(winOverlay) winOverlay.classList.remove("show");
      if(exitConfirmOverlay) exitConfirmOverlay.classList.remove("show", "is-transitioning", "is-busy");
      stopTimer();
      finalizeSessionScore();
      inGameSession = false;
      toggleFullscreen(false);
      showHomeView();
      resetHomeSelectionAndCrop();
    } else {
      if(winOverlay) winOverlay.classList.remove("show");
    }

    const activeName = (currentPlayerName || savedPlayerName || "Giocatore").trim().slice(0, MAX_RECORD_NAME_LEN) || "Giocatore";
    const medalIcons = { 1: "🥇", 2: "🥈", 3: "🥉" };

    if(summaryTop3Banner){
      if(lastSessionRank === 1 || lastSessionRank === 2 || lastSessionRank === 3){
        summaryTop3Banner.style.display = "flex";
        summaryTop3Banner.innerHTML =
          `<div class="summary-top3-medal">${medalIcons[lastSessionRank]}</div>` +
          `<div class="summary-top3-title">Congratulazioni, ${activeName}!</div>` +
          `<div class="summary-top3-sub">Sei nella Top 3 della Classifica Generale<br>(${lastSessionRank}° posto)!</div>`;
      } else {
        summaryTop3Banner.style.display = "none";
        summaryTop3Banner.innerHTML = "";
      }
    }

    if(summaryPlayerSub){
      summaryPlayerSub.textContent = `Giocatore: ${activeName}`;
    }

    if(summaryStatsGrid){
      summaryStatsGrid.innerHTML =
        `<div class="summary-stat-card is-highlight">` +
          `<span class="summary-stat-lbl">Punteggio Finale</span>` +
          `<span class="summary-stat-val">${currentSessionScore} pt</span>` +
        `</div>` +
        `<div class="summary-stat-card">` +
          `<span class="summary-stat-lbl">Livelli</span>` +
          `<span class="summary-stat-val">${currentSessionLevelsCleared}</span>` +
        `</div>` +
        `<div class="summary-stat-card">` +
          `<span class="summary-stat-lbl">Mosse / Tempo</span>` +
          `<span class="summary-stat-val">${currentSessionMoves} · ${formatTime(currentSessionTime)}</span>` +
        `</div>`;
    }

    if(summaryMedalsList){
      summaryMedalsList.innerHTML = "";

      const createMedalCell = (labelText, rank, ariaLabel, isGeneral = false) => {
        const cell = document.createElement("div");
        cell.className = `summary-medal-cell has-medal rank-${rank}` + (isGeneral ? " is-general" : "");
        cell.setAttribute("aria-label", ariaLabel);

        const lvlSpan = document.createElement("span");
        lvlSpan.className = "summary-medal-cell-lvl";
        lvlSpan.textContent = labelText;

        const valSpan = document.createElement("span");
        valSpan.className = "summary-medal-cell-val";
        valSpan.textContent = medalIcons[rank];

        cell.append(lvlSpan, valSpan);
        return cell;
      };

      // Priorità da sinistra verso destra: medaglia Classifica Generale, poi singoli livelli
      if(lastSessionRank === 1 || lastSessionRank === 2 || lastSessionRank === 3){
        summaryMedalsList.appendChild(
          createMedalCell(
            "Generale",
            lastSessionRank,
            `Classifica Generale: ${lastSessionRank}° posto`,
            true
          )
        );
      }

      const rankByLevel = new Map();
      if(Array.isArray(currentSessionDetails)){
        currentSessionDetails.forEach(item => {
          if(item && Number.isInteger(item.levelIndex)){
            const prev = rankByLevel.get(item.levelIndex);
            const r = (item.rank === 1 || item.rank === 2 || item.rank === 3) ? item.rank : null;
            if(r !== null && (prev === undefined || prev === null || r < prev)){
              rankByLevel.set(item.levelIndex, r);
            } else if(prev === undefined){
              rankByLevel.set(item.levelIndex, r);
            }
          }
        });
      }

      for(let i = 0; i < LEVELS.length; i++){
        const rank = rankByLevel.get(i) ?? null;
        if(rank === 1 || rank === 2 || rank === 3){
          summaryMedalsList.appendChild(
            createMedalCell(
              `Livello ${i + 1}`,
              rank,
              `Livello ${i + 1}: ${rank}° posto`
            )
          );
        }
      }

      if(summaryMedalsList.children.length === 0){
        const emptyEl = document.createElement("div");
        emptyEl.className = "summary-medals-empty";
        emptyEl.textContent = "Nessuna medaglia ottenuta in questa partita";
        summaryMedalsList.appendChild(emptyEl);
      }
    }

    activeOverlay = "gameSummary";
    if(gameSummaryOverlay) gameSummaryOverlay.classList.add("show");
    if(exitConfirmOverlay) exitConfirmOverlay.classList.remove("show", "is-transitioning", "is-busy");
    saveGame();

    if(celebrate && (lastSessionRank === 1 || lastSessionRank === 2 || lastSessionRank === 3)){
      requestAnimationFrame(() => launchConfetti());
    }
  }


  function closeGameSummaryModal(){
    if(gameSummaryOverlay) gameSummaryOverlay.classList.remove("show");
    if(activeOverlay === "gameSummary") activeOverlay = "";
    saveGame();
  }


  function completeLevel(){

    locked = true;
    selectedTile = null;

    if(levelIndex >= LEVELS.length - 1){
      gameCompleted = true;
    }

    stopTimer();
    playSound("win");

    const earnedScore = calculateScore(levelIndex, moves, timerSeconds);
    lastWinScore = earnedScore;
    currentSessionScore += earnedScore;
    currentSessionLevelsCleared += 1;
    currentSessionMoves += moves;
    currentSessionTime += timerSeconds;

    const activeName = (currentPlayerName || savedPlayerName || "Giocatore").trim().slice(0, MAX_RECORD_NAME_LEN) || "Giocatore";
    const recResult = recordLevelScore(levelIndex, {
      score: earnedScore,
      name: activeName,
      date: formatShortDate(),
      timestamp: Date.now(),
      moves,
      time: timerSeconds
    });
    lastWinIsNewRecord = recResult.isNewTop;
    lastWinRank = recResult.rank;

    currentSessionDetails.push({
      levelIndex,
      score: earnedScore,
      moves,
      time: timerSeconds,
      rank: lastWinRank
    });

    if(levelIndex >= LEVELS.length - 1){
      finalizeSessionScore();
    }

    clearPendingWinReveal();
    renderBoard();
    if(board){
      board.classList.remove("is-solved-reveal");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if(locked && isSolved()){
            board.classList.add("is-solved-reveal");
          }
        });
      });
    }

    saveGame();

    setHint(
      levelIndex >= LEVELS.length - 1
        ? "Congratulazioni! Hai completato tutti i livelli!"
        : "Livello completato!"
    );

    pendingWinTimer = setTimeout(() => {
      pendingWinTimer = null;
      if(locked && inGameSession && isSolved() && activeOverlay !== "exitConfirm"){
        showWinDialog(true);
      }
    }, 800);
  }


  function showHomeView(){
    clearPendingWinReveal();
    if(homeView){
      homeView.classList.remove("is-hidden");
      homeView.style.display = "";
    }
    if(gamePanel){
      gamePanel.style.display = "none";
      gamePanel.classList.add("hidden-initial");
    }
    document.body.classList.remove("in-game");
    syncScreenOrientation(false, false);
    updateLevelButtonsUI();
    updateCropFrameAndImage();
    requestAnimationFrame(() => {
      updateLevelButtonsUI();
      updateCropFrameAndImage();
    });
  }

  function nextLevel(){
    clearPendingWinReveal();

    if(levelIndex >= LEVELS.length - 1){
      openGameSummaryModal(true);
      return;
    }

    stopWinParticles();
    winOverlay.classList.remove("show");
    activeOverlay = "";
    lastWinScore = null;
    lastWinIsNewRecord = false;
    lastWinRank = null;

    levelIndex++;
    selectedLevel = levelIndex;
    updateLevelButtonsUI();

    moves = 0;
    mixed = false;
    locked = false;
    selectedTile = null;

    resetTimer();

    const cropped = generateCroppedPhoto(levelIndex);
    if(cropped){
      photoData = cropped;
    }
    const imgEl = $("previewImage");
    if(imgEl && photoData) imgEl.src = photoData;
    const thumbEl = $("previewThumb");
    if(thumbEl && photoData) thumbEl.src = photoData;

    createSolvedPieces();
    shufflePieces(true);
    resetPreviewZoom();

    if(isFullscreen){
      toggleFullscreen(true);
    }

    setHint(
      `Livello ${levelIndex + 1}: tasselli mescolati. Buona fortuna!`
    );

    saveGame();
  }


  function launchConfetti(){

    if(
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ){
      return;
    }


    const symbols=[
      "🎉",
      "✨",
      "⭐",
      "🦸",
      "⚡",
      "💥"
    ];


    for(let i=0;i<35;i++){

      const item=
        document.createElement("div");

      item.className="confetti";

      item.textContent=
        symbols[
          Math.floor(
            Math.random()*symbols.length
          )
        ];


      item.style.left=
        `${Math.random()*100}%`;

      item.style.animationDelay=
        `${Math.random()*.5}s`;

      item.style.setProperty(
        "--drift",
        `${(Math.random()-.5)*180}px`
      );

      item.style.fontSize=
        `${12+Math.random()*10}px`;


      document.body.appendChild(item);


      item.addEventListener(
        "animationend",
        ()=>item.remove(),
        {once:true}
      );
    }
  }


  let winParticlesRafId = null;

  function stopWinParticles(){
    if(winParticlesRafId !== null){
      cancelAnimationFrame(winParticlesRafId);
      winParticlesRafId = null;
    }
    if(winParticlesCanvas){
      const ctx = winParticlesCanvas.getContext("2d");
      if(ctx){
        ctx.clearRect(0, 0, winParticlesCanvas.width, winParticlesCanvas.height);
      }
      winParticlesCanvas.classList.remove("is-active");
    }
  }

  function getWinParticlePalette(lvlIdx){
    if(lvlIdx >= 3){
      const hero = HEROES[lvlIdx - 3] || HEROES[0];
      return [
        hero.accent || "#5b6ee1",
        hero.glow || "#dbeafe",
        "#facc15",
        "#ffffff",
        hero.dark || "#1e3a8a"
      ];
    }
    return ["#facc15", "#34d399", "#60a5fa", "#f472b6", "#fb923c", "#ffffff"];
  }

  function launchWinParticleExplosion(lvlIdx){
    if(!winParticlesCanvas) return;
    if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      return;
    }

    stopWinParticles();

    const ctx = winParticlesCanvas.getContext("2d");
    if(!ctx) return;

    winParticlesCanvas.classList.add("is-active");

    const initAndRun = () => {
      const vw = window.innerWidth || document.documentElement.clientWidth || 360;
      const vh = window.innerHeight || document.documentElement.clientHeight || 640;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      winParticlesCanvas.width = Math.round(vw * dpr);
      winParticlesCanvas.height = Math.round(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      let originX = vw / 2;
      let originY = vh * 0.36;
      if(heroStage){
        const rect = heroStage.getBoundingClientRect();
        if(rect.width > 10 && rect.height > 10){
          originX = rect.left + rect.width / 2;
          originY = rect.top + rect.height / 2;
        }
      }

      const palette = getWinParticlePalette(lvlIdx);
      const maxSpeed = Math.min(17, Math.max(10, Math.min(vw, vh) * 0.025));
      const particles = [];
      const count = 88;

      for(let i = 0; i < count; i++){
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const speed = (0.32 + Math.random() * 0.78) * maxSpeed;
        const kindRoll = Math.random();
        const kind = kindRoll < 0.38 ? "spark" : (kindRoll < 0.72 ? "star" : "orb");
        const color = palette[Math.floor(Math.random() * palette.length)];

        particles.push({
          x: originX + (Math.random() - 0.5) * 18,
          y: originY + (Math.random() - 0.5) * 18,
          prevX: originX,
          prevY: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (1.2 + Math.random() * 2.2),
          drag: 0.942 + Math.random() * 0.026,
          gravity: 0.13 + Math.random() * 0.1,
          size: kind === "star" ? (3.5 + Math.random() * 4.5) : (2.2 + Math.random() * 3.8),
          alpha: 1,
          decay: 0.012 + Math.random() * 0.013,
          rotation: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.22,
          color,
          kind
        });
      }

      let shockwaveRadius = 14;
      const shockwaveMax = Math.min(vw, vh) * 0.42;
      let shockwaveAlpha = 0.78;
      let lastTime = performance.now();

      const drawStar = (cx, cy, r, rot, color, alpha) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        const inner = r * 0.38;
        for(let p = 0; p < 8; p++){
          const rad = p % 2 === 0 ? r : inner;
          const a = (p * Math.PI) / 4;
          if(p === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
          else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      const step = now => {
        const dtMs = Math.min(33, Math.max(8, now - lastTime));
        lastTime = now;
        const dt = dtMs / 16.6667;

        ctx.clearRect(0, 0, vw, vh);

        if(shockwaveAlpha > 0.015){
          shockwaveRadius += (shockwaveMax - shockwaveRadius) * 0.12 * dt;
          shockwaveAlpha *= Math.pow(0.89, dt);
          ctx.save();
          ctx.globalAlpha = shockwaveAlpha;
          ctx.strokeStyle = palette[0];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(originX, originY, shockwaveRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        let alive = 0;
        for(let i = 0; i < particles.length; i++){
          const p = particles[i];
          if(p.alpha <= 0.015) continue;
          alive++;

          p.prevX = p.x;
          p.prevY = p.y;
          p.vx *= Math.pow(p.drag, dt);
          p.vy = p.vy * Math.pow(p.drag, dt) + p.gravity * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rotation += p.spin * dt;
          p.alpha -= p.decay * dt;

          const a = Math.max(0, Math.min(1, p.alpha));
          if(a <= 0.015) continue;

          if(p.kind === "spark"){
            ctx.save();
            ctx.globalAlpha = a;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(1.5, p.size * 0.65);
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(p.prevX, p.prevY);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ctx.restore();
          } else if(p.kind === "star"){
            drawStar(p.x, p.y, p.size * 1.15, p.rotation, p.color, a);
          } else {
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.65, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        if(alive > 0 || shockwaveAlpha > 0.015){
          winParticlesRafId = requestAnimationFrame(step);
        } else {
          stopWinParticles();
        }
      };

      winParticlesRafId = requestAnimationFrame(step);
    };

    requestAnimationFrame(initAndRun);
  }


  /*
   * Trascinamento touch/mouse.
   */
  function onTilePointerDown(event){

    if(
      locked ||
      !mixed ||
      !photoData ||
      event.button!==0
    ){
      return;
    }

    resumeFromPause();


    const tile=
      event.currentTarget;

    const rect=
      tile.getBoundingClientRect();


    activeDrag={

      from:
        Number(tile.dataset.position),

      pointerId:
        event.pointerId,

      startX:
        event.clientX,

      startY:
        event.clientY,

      clientX:
        event.clientX,

      clientY:
        event.clientY,

      offsetX:
        event.clientX-rect.left,

      offsetY:
        event.clientY-rect.top,

      width:
        rect.width,

      height:
        rect.height,

      tile,

      ghost:null,
      target:null,
      dragging:false,
      raf:0

    };


    try{

      tile.setPointerCapture(
        event.pointerId
      );

    }catch(_){}
  }


  function startVisualDrag(drag){

    const ghost=
      document.createElement("div");

    ghost.className="drag-ghost";

    ghost.style.width=
      `${drag.width}px`;

    ghost.style.height=
      `${drag.height}px`;

    ghost.style.left=
      `${drag.clientX-drag.offsetX}px`;

    ghost.style.top=
      `${drag.clientY-drag.offsetY}px`;


    ghost.style.backgroundImage=
      drag.tile.style.backgroundImage;

    ghost.style.backgroundSize=
      drag.tile.style.backgroundSize;

    ghost.style.backgroundPosition=
      drag.tile.style.backgroundPosition;


    document.body.appendChild(
      ghost
    );


    drag.ghost=ghost;
    drag.dragging=true;


    drag.tile.classList.add(
      "drag-origin"
    );

    selectedTile=null;

    drag.tile.classList.remove(
      "selected"
    );
  }


  function onPointerMove(event){

    const drag=activeDrag;


    if(
      !drag ||
      event.pointerId!==drag.pointerId
    ){
      return;
    }


    const dx=
      event.clientX-drag.startX;

    const dy=
      event.clientY-drag.startY;


    drag.clientX=
      event.clientX;

    drag.clientY=
      event.clientY;


    if(
      !drag.dragging &&
      Math.hypot(dx,dy)>6
    ){

      startVisualDrag(drag);
    }


    if(!drag.dragging)
      return;


    event.preventDefault();


    if(!drag.raf){

      drag.raf=
        requestAnimationFrame(()=>{

          drag.raf=0;


          if(
            !activeDrag ||
            activeDrag!==drag ||
            !drag.ghost
          ){
            return;
          }


          drag.ghost.style.left=
            `${drag.clientX-drag.offsetX}px`;

          drag.ghost.style.top=
            `${drag.clientY-drag.offsetY}px`;


          const el=
            document.elementFromPoint(
              drag.clientX,
              drag.clientY
            );


          const under=
            el &&
            el.closest
              ? el.closest(".tile")
              : null;


          if(
            drag.target &&
            drag.target!==drag.tile
          ){

            drag.target.classList.remove(
              "drop-target"
            );
          }


          drag.target=
            under &&
            board.contains(under)
              ? under
              : null;


          if(
            drag.target &&
            drag.target!==drag.tile
          ){

            drag.target.classList.add(
              "drop-target"
            );
          }

        });
    }
  }


  function finishPointer(
    event,
    cancelled=false
  ){

    const drag=activeDrag;


    if(
      !drag ||
      event.pointerId!==drag.pointerId
    ){
      return;
    }


    activeDrag=null;


    if(drag.raf)
      cancelAnimationFrame(drag.raf);


    if(drag.target)
      drag.target.classList.remove(
        "drop-target"
      );


    drag.tile.classList.remove(
      "drag-origin"
    );


    let destination=null;


    if(
      drag.dragging &&
      !cancelled
    ){

      const el=
        document.elementFromPoint(
          event.clientX,
          event.clientY
        );


      const under=
        el &&
        el.closest
          ? el.closest(".tile")
          : null;


      if(
        under &&
        board.contains(under)
      ){

        destination=
          Number(
            under.dataset.position
          );
      }
    }


    if(drag.ghost)
      drag.ghost.remove();


    if(drag.dragging){

      suppressClickUntil=
        Date.now()+400;


      if(
        destination!==null &&
        destination!==drag.from
      ){

        swapTiles(
          drag.from,
          destination
        );

      }else{

        renderBoard();
      }
    }
  }


  document.addEventListener(
    "pointermove",
    onPointerMove,
    {passive:false}
  );


  document.addEventListener(
    "pointerup",
    event=>
      finishPointer(event,false)
  );


  document.addEventListener(
    "pointercancel",
    event=>
      finishPointer(event,true)
  );


  /*
   * NUOVA PARTITA
   */
  /*
   * CARICA / CAMBIA FOTO (v. 1.10)
   * Finestra elegante personalizzata senza alert di sistema del browser.
   */
  if(newPhotoBtn){
    newPhotoBtn.addEventListener(
      "click",
      ()=>{

        if(!photoData || isGameFinished()){
          openLevelChoice("newGame", 0);
          return;
        }

        activeOverlay="actionChoice";
        actionChoiceOverlay.classList.add("show");
        saveGame();
      }
    );
  }


  function closeActionChoice(){

    actionChoiceOverlay.classList.remove("show");
    activeOverlay="";
    saveGame();
  }


  if(actionNewPhotoBtn){
    actionNewPhotoBtn.addEventListener(
      "click",
      ()=>{

        closeActionChoice();
        openLevelChoice("newGame", 0);
      }
    );
  }


  if(actionCancelBtn){
    actionCancelBtn.addEventListener(
      "click",
      closeActionChoice
    );
  }


  if(actionChoiceOverlay){
    actionChoiceOverlay.addEventListener(
      "click",
      event=>{

        /*
         * La finestra Nuova partita non si chiude cliccando
         * sullo sfondo esterno: l'utente deve scegliere
         * esplicitamente "Nuova partita" o "Continua la partita".
         */
        if(event.target===actionChoiceOverlay){
          /* intenzionale: non chiudere */
        }
      }
    );
  }


  /*
   * CONTROLLO TIMER: PAUSA E RIPRESA (v. 1.11)
   */
  if(timerPauseBtn){
    timerPauseBtn.addEventListener(
      "click",
      ()=>{

        if(isPaused){
          resumeFromPause();
        }else{
          pauseGame();
        }
      }
    );
  }


  /*
   * CONTROLLI MODALITÀ SCHERMO INTERO (v. 1.10 / v. 1.11)
   */
  if(fullscreenToggleBtn){
    fullscreenToggleBtn.addEventListener(
      "click",
      ()=>{

        toggleFullscreen();
      }
    );
  }


  if(fullscreenExitBtn){
    fullscreenExitBtn.addEventListener(
      "click",
      ()=>toggleFullscreen(false)
    );
  }

  /*
   * CONTROLLI MODALITÀ SCHERMO INTERO VERTICALE & ORIZZONTALE (v. 1.18)
   */

  let exitConfirmReturnToWin = false;
  let isExitingToSummary = false;

  function requestExitGame(){
    if(isExitingToSummary) return;
    const isPendingReveal = Boolean(pendingWinTimer && locked && isSolved());
    clearPendingWinReveal();
    exitConfirmReturnToWin = isPendingReveal || Boolean(winOverlay && winOverlay.classList.contains("show"));
    activeOverlay = "exitConfirm";
    if(exitConfirmOverlay){
      exitConfirmOverlay.classList.remove("is-transitioning");
      exitConfirmOverlay.classList.add("show");
    }
  }

  function confirmExitGame(){
    if(isExitingToSummary) return;
    clearPendingWinReveal();
    exitConfirmReturnToWin = false;
    stopWinParticles();
    stopTimer();

    if(currentSessionLevelsCleared > 0){
      if(exitConfirmOverlay && exitConfirmOverlay.classList.contains("show")){
        isExitingToSummary = true;
        exitConfirmOverlay.classList.remove("is-transitioning");
        exitConfirmOverlay.classList.add("is-busy");
        if(screenTransitionCurtain){
          screenTransitionCurtain.classList.remove("is-top");
          screenTransitionCurtain.classList.add("is-active");
        }
        if(winOverlay) winOverlay.classList.remove("show");
        finalizeSessionScore();
        inGameSession = false;
        if(gamePanel){
          gamePanel.style.display = "none";
          gamePanel.classList.add("hidden-initial");
        }
        document.body.classList.remove("in-game");
        const fsSettle = toggleFullscreen(false);
        fsSettle.finally(() => {
          requestAnimationFrame(() => {
            if(cropSelectionFrame) cropSelectionFrame.classList.add("no-transition");
            showHomeView();
            resetHomeSelectionAndCrop();
            isExitingToSummary = false;
            openGameSummaryModal(true, { skipExitReset: true });
            if(screenTransitionCurtain) screenTransitionCurtain.classList.remove("is-active", "is-top");
            requestAnimationFrame(() => {
              if(cropSelectionFrame) cropSelectionFrame.classList.remove("no-transition");
            });
          });
        });
        return;
      }
      if(winOverlay) winOverlay.classList.remove("show");
      activeOverlay = "";
      openGameSummaryModal(true);
      return;
    }

    if(screenTransitionCurtain){
      screenTransitionCurtain.classList.add("is-active", "is-top");
    }
    if(exitConfirmOverlay) exitConfirmOverlay.classList.remove("show", "is-transitioning", "is-busy");
    if(winOverlay) winOverlay.classList.remove("show");
    activeOverlay = "";
    finalizeSessionScore();
    inGameSession = false;
    saveGame();
    if(gamePanel){
      gamePanel.style.display = "none";
      gamePanel.classList.add("hidden-initial");
    }
    document.body.classList.remove("in-game");
    const fsSettle = toggleFullscreen(false);
    fsSettle.finally(() => {
      if(cropSelectionFrame) cropSelectionFrame.classList.add("no-transition");
      showHomeView();
      resetHomeSelectionAndCrop();
      requestAnimationFrame(() => {
        updateCropFrameAndImage();
        requestAnimationFrame(() => {
          if(cropSelectionFrame) cropSelectionFrame.classList.remove("no-transition");
          if(screenTransitionCurtain) screenTransitionCurtain.classList.remove("is-active", "is-top");
        });
      });
    });
  }

  function cancelExitGame(){
    if(isExitingToSummary) return;
    if(exitConfirmOverlay) exitConfirmOverlay.classList.remove("show", "is-transitioning", "is-busy");
    if(exitConfirmReturnToWin || (winOverlay && winOverlay.classList.contains("show"))){
      exitConfirmReturnToWin = false;
      if(winOverlay && !winOverlay.classList.contains("show")){
        showWinDialog(false);
      } else {
        activeOverlay = "win";
      }
      return;
    }
    exitConfirmReturnToWin = false;
    activeOverlay = "";
  }

  if(confirmExitBtn){
    confirmExitBtn.addEventListener("click", confirmExitGame);
  }

  if(cancelExitBtn){
    cancelExitBtn.addEventListener("click", cancelExitGame);
  }

  if(exitConfirmOverlay){
    exitConfirmOverlay.addEventListener("click", event => {
      if(event.target === exitConfirmOverlay){
        /* intenzionale: clic esterno disattivato per non far sparire la finestra "Uscire?" */
      }
    });
  }

  /*
   * USCITA DALL'APPLICAZIONE (v. 1.37)
   */
  function requestAppExit(){
    activeOverlay = "appExitConfirm";
    if(appExitConfirmOverlay) appExitConfirmOverlay.classList.add("show");
  }

  function cancelAppExit(){
    if(appExitConfirmOverlay) appExitConfirmOverlay.classList.remove("show");
    if(activeOverlay === "appExitConfirm") activeOverlay = "";
  }

  function confirmAppExit(){
    saveGame();
    if(appExitConfirmOverlay) appExitConfirmOverlay.classList.remove("show");
    activeOverlay = "";
    if(Capacitor.isNativePlatform()){
      try { Promise.resolve(App.exitApp()).catch(() => {}); } catch(_) {}
      return;
    }
    try { window.close(); } catch(_) {}
    try { window.open("", "_self"); window.close(); } catch(_) {}
    setTimeout(() => {
      if(document.visibilityState !== "hidden"){
        activeOverlay = "appExited";
        if(appExitedOverlay) appExitedOverlay.classList.add("show");
      }
    }, 200);
  }

  if(appExitBtn){
    appExitBtn.addEventListener("click", requestAppExit);
  }
  if(cancelAppExitBtn){
    cancelAppExitBtn.addEventListener("click", cancelAppExit);
  }
  if(confirmAppExitBtn){
    confirmAppExitBtn.addEventListener("click", confirmAppExit);
  }
  if(reopenAppBtn){
    reopenAppBtn.addEventListener("click", () => {
      if(appExitedOverlay) appExitedOverlay.classList.remove("show");
      if(activeOverlay === "appExited") activeOverlay = "";
    });
  }
  if(appExitConfirmOverlay){
    appExitConfirmOverlay.addEventListener("click", event => {
      if(event.target === appExitConfirmOverlay){
        /* intenzionale: clic esterno disattivato */
      }
    });
  }
  if(appExitedOverlay){
    appExitedOverlay.addEventListener("click", event => {
      if(event.target === appExitedOverlay){
        /* intenzionale: clic esterno disattivato */
      }
    });
  }

  // Pulsante ESCI in top bar verticale a schermo intero
  if(fsPortraitExitBtn){
    fsPortraitExitBtn.addEventListener("click", requestExitGame);
  }

  // Pulsante ESCI in top bar orizzontale a schermo intero
  if(fsLandscapeExitBtn){
    fsLandscapeExitBtn.addEventListener("click", requestExitGame);
  }

  if(fullscreenExitBtn){
    fullscreenExitBtn.addEventListener("click", requestExitGame);
  }

  // Widget AIUTO in top bar verticale (stelline + ON/OFF)
  if(fsPortraitHelpBtn){
    fsPortraitHelpBtn.addEventListener("click", ()=>{
      showCorrect = !showCorrect;
      if(fsPortraitHelpToggleState){
        fsPortraitHelpToggleState.textContent = showCorrect ? "ON" : "OFF";
      }
      if(toggleStateLabel){
        toggleStateLabel.textContent = showCorrect ? "ON" : "OFF";
      }
      renderBoard();
      saveGame();
    });
  }

  // Pulsante MIX in top bar verticale
  if(fsPortraitMixBtn){
    fsPortraitMixBtn.addEventListener("click", ()=>{
      if(!locked){
        shufflePieces(false);
        playSound("swap");
      }
    });
  }

  // Pulsante pausa in HUD schermo intero (verticale e orizzontale)
  const fullscreenPauseBtn = $("fullscreenPauseBtn");
  if(fullscreenPauseBtn){
    fullscreenPauseBtn.addEventListener("click", ()=>{
      if(isPaused){
        resumeFromPause();
      }else{
        pauseGame();
      }
    });
  }

  if(boardPauseVeil){
    boardPauseVeil.addEventListener("click", ()=>{
      if(isPaused) resumeFromPause();
    });
    boardPauseVeil.addEventListener("keydown", event=>{
      if((event.key === "Enter" || event.key === " ") && isPaused){
        event.preventDefault();
        resumeFromPause();
      }
    });
  }

  // Controlli top bar a schermo intero orizzontale (identici al layout verticale)
  const fsHelpBtn = $("fsHelpBtn");
  if(fsHelpBtn){
    fsHelpBtn.addEventListener("click", ()=>{
      showCorrect = !showCorrect;
      if(fsPortraitHelpToggleState){
        fsPortraitHelpToggleState.textContent = showCorrect ? "ON" : "OFF";
      }
      if(toggleStateLabel){
        toggleStateLabel.textContent = showCorrect ? "ON" : "OFF";
      }
      renderBoard();
      saveGame();
    });
  }

  if(fsLandscapeMixBtn){
    fsLandscapeMixBtn.addEventListener("click", ()=>{
      if(!locked){
        shufflePieces(false);
        playSound("swap");
      }
    });
  }




  /*
   * Aggiunta foto nella Galleria Interna (v. 1.25)
   */
  if(photoInput){
    photoInput.addEventListener("change", event => {
      const selectedFiles = Array.from(event.target.files || []);
      photoInput.value = "";
      if(selectedFiles.length > 0){
        addFilesToGallery(selectedFiles);
      }
    });
  }


  if(mixBtn){
    mixBtn.addEventListener(
      "click",
      ()=>{
        shufflePieces(false);
        mixBtn.blur();
      }
    );
  }


  /*
   * SCELTA DEL LIVELLO
   */
  if(levelChoiceGrid){
    levelChoiceGrid
      .querySelectorAll(
        ".level-choice-option"
      )
    .forEach(button=>{

      button.addEventListener(
        "click",
        ()=>{

          selectedStartLevel=
            Number(
              button.dataset.level
            );


          levelChoiceGrid
            .querySelectorAll(
              ".level-choice-option"
            )
            .forEach(option=>{

              option.classList.toggle(
                "active",
                Number(option.dataset.level)===
                selectedStartLevel
              );

            });
        }
      );
    });
  }


  /*
   * SCELTA DEL FORMATO
   */
  if(formatChoiceGrid){
    formatChoiceGrid
      .querySelectorAll(".format-choice-option")
      .forEach(button=>{

        button.addEventListener(
          "click",
          ()=>{

            selectedFormat=
              button.dataset.format;

            formatChoiceGrid
              .querySelectorAll(".format-choice-option")
              .forEach(option=>{

                option.classList.toggle(
                  "active",
                  option.dataset.format===selectedFormat
                );

              });
          }
        );
      });
  }


  /*
   * ATTIVAZIONE / DISATTIVAZIONE AUDIO
   */
  if(soundToggleBtn){
    soundToggleBtn.addEventListener(
      "click",
      ()=>{

        soundEnabled=!soundEnabled;

        localStorage.setItem(
          "puzzleMagic_sound",
          soundEnabled ? "on" : "off"
        );

        updateSoundUI();

        if(soundEnabled){
          playSound("soundOn");
        }else{
          stopSplashMusic(0.08);
          stopVictorySound(0.08);
        }
      }
    );
  }


  /*
   * AIUTI VISIVI (POSIZIONE CORRETTA)
   */
  if(toggleCorrectBtn){
    toggleCorrectBtn.addEventListener(
      "click",
      ()=>{

        showCorrect=!showCorrect;

        renderBoard();

        saveGame();
      }
    );
  }


  if(confirmLevelBtn){
    confirmLevelBtn.addEventListener(
      "click",
      ()=>{

        photoInput.value="";

        if(levelChoiceOverlay) levelChoiceOverlay.classList.remove(
          "show"
        );

        activeOverlay="";

        /*
         * La partita corrente non viene modificata
         * finché una nuova foto non viene effettivamente
         * caricata.
         */
        photoInput.click();
      }
    );
  }


  if(cancelLevelChoiceBtn){
    cancelLevelChoiceBtn.addEventListener(
      "click",
      ()=>{

        if(levelChoiceOverlay) levelChoiceOverlay.classList.remove(
          "show"
        );

        activeOverlay="";
      }
    );
  }


  if(levelChoiceOverlay){
    levelChoiceOverlay.addEventListener(
      "click",
      event=>{

        if(
          event.target===levelChoiceOverlay
        ){

          levelChoiceOverlay.classList.remove(
            "show"
          );

          activeOverlay="";
        }
      }
    );
  }


  /*
   * ANTEPRIMA MODELLO FOTO FISSA (v. 1.29)
   * L'anteprima nelle schermate del Puzzle resta fissa senza zoom o ingrandimenti al click.
   */
  function resetPreviewZoom(){
    if(!previewZoomStage) return;
    previewZoomStage.classList.add("no-transition");
    previewZoomStage.style.transform = "translate(0px, 0px) scale(1)";
    if(previewTile){
      previewTile.classList.remove("is-zoomed", "is-panning");
    }
  }


  function closePreview(){

    if(previewOverlay) previewOverlay.classList.remove("show");

    activeOverlay="";

    saveGame();
  }


  if(closePreviewBtn){
    closePreviewBtn.addEventListener(
      "click",
      closePreview
    );
  }


  if(previewOverlay){
    previewOverlay.addEventListener("click", () => {
      closePreview();
    });
  }

  /*
   * RICOMINCIA LIVELLO (v. 1.14)
   */
  if(restartLevelBtn){
    restartLevelBtn.addEventListener("click", ()=>{
      if(!photoData || locked) return;
      activeOverlay="restartConfirm";
      if(restartConfirmOverlay) restartConfirmOverlay.classList.add("show");
    });
  }

  if(confirmRestartBtn){
    confirmRestartBtn.addEventListener("click", ()=>{
      if(restartConfirmOverlay) restartConfirmOverlay.classList.remove("show");
      activeOverlay="";
      restartLevel();
    });
  }

  if(cancelRestartBtn){
    cancelRestartBtn.addEventListener("click", ()=>{
      if(restartConfirmOverlay) restartConfirmOverlay.classList.remove("show");
      activeOverlay="";
    });
  }

  if(restartConfirmOverlay){
    restartConfirmOverlay.addEventListener("click", event=>{
      if(event.target===restartConfirmOverlay){
        restartConfirmOverlay.classList.remove("show");
        activeOverlay="";
      }
    });
  }

  /*
   * PROSSIMO LIVELLO (apre la finestra di ritaglio/zoom con griglia attiva, v. 1.25)
   */
  const nextLevelBtnEl = $("nextLevelBtn");
  if(nextLevelBtnEl){
    nextLevelBtnEl.addEventListener(
      "click",
      ()=>{
        if(levelIndex < LEVELS.length - 1){
          const currentPhotoUrl = rawPhotoUrl || photoData || resolveHeroUrl(DEFAULT_HOME_PHOTO);
          openNextLevelCropModal(currentPhotoUrl, levelIndex + 1, true);
        }else{
          openGameSummaryModal(true);
        }
      }
    );
  }

  if(winExitBtn){
    winExitBtn.addEventListener("click", requestExitGame);
  }

  if(summaryExitBtn){
    summaryExitBtn.addEventListener("click", () => {
      closeGameSummaryModal();
    });
  }

  if(summaryRecordsBtn){
    summaryRecordsBtn.addEventListener("click", () => {
      const targetLvl = Array.isArray(currentSessionDetails) && currentSessionDetails.length > 0
        ? currentSessionDetails[currentSessionDetails.length - 1].levelIndex
        : selectedLevel;
      closeGameSummaryModal();
      openRecordsModal(targetLvl);
    });
  }

  /*
   * CAMBIA FOTO DALLA SCHERMATA DI VITTORIA (v. 1.24)
   */
  const newGameBtnEl = $("newGameBtn");
  if(newGameBtnEl){
    newGameBtnEl.addEventListener(
      "click",
      ()=>{
        if(levelIndex >= LEVELS.length - 1){
          openGameSummaryModal(true);
          return;
        }

        const targetLevel = levelIndex + 1;
        openGalleryModal("nextLevel", targetLevel, true);
      }
    );
  }

  if(winOverlay){
    winOverlay.addEventListener(
      "click",
      event=>{
        if(event.target === winOverlay){
          /* intenzionale */
        }
      }
    );
  }

  /*
   * TASTIERA VIRTUALE NOME GIOCATORE ALL'AVVIO PARTITA (v. 1.27)
   */
  function createNameCaretEl(){
    const caret = document.createElement("span");
    caret.className = "name-display-caret";
    caret.setAttribute("aria-hidden", "true");
    return caret;
  }

  function updatePlayerNameModalUI(){
    playerNameCursorPos = Math.max(0, Math.min(playerNameBuffer.length, playerNameCursorPos));
    if(playerNameDisplay){
      playerNameDisplay.innerHTML = "";
      if(playerNameBuffer.length === 0 && !playerNameCaretVisible){
        const ph = document.createElement("span");
        ph.className = "name-display-placeholder";
        ph.textContent = "NOME";
        playerNameDisplay.appendChild(ph);
      } else {
        const charsWrap = document.createElement("span");
        charsWrap.className = "name-display-chars";
        for(let i = 0; i < playerNameBuffer.length; i++){
          if(playerNameCaretVisible && i === playerNameCursorPos){
            charsWrap.appendChild(createNameCaretEl());
          }
          const chSpan = document.createElement("span");
          chSpan.className = "name-display-char";
          chSpan.dataset.charIndex = String(i);
          chSpan.textContent = playerNameBuffer[i] === " " ? "\u00A0" : playerNameBuffer[i];
          charsWrap.appendChild(chSpan);
        }
        if(playerNameCaretVisible && playerNameCursorPos === playerNameBuffer.length){
          charsWrap.appendChild(createNameCaretEl());
        }
        playerNameDisplay.appendChild(charsWrap);
      }
    }
    const hasLetter = playerNameBuffer.trim().length > 0;
    if(playerNameTip){
      playerNameTip.classList.toggle("is-hidden", hasLetter);
    }
    if(vkOkBtn){
      vkOkBtn.disabled = !hasLetter;
    }
  }

  function insertCharAtPlayerNameCursor(ch){
    playerNameCaretVisible = true;
    if(playerNameBuffer.length >= MAX_RECORD_NAME_LEN) return;
    const pos = Math.max(0, Math.min(playerNameBuffer.length, playerNameCursorPos));
    playerNameBuffer = playerNameBuffer.slice(0, pos) + ch + playerNameBuffer.slice(pos);
    playerNameCursorPos = pos + ch.length;
    updatePlayerNameModalUI();
  }

  function deleteBeforePlayerNameCursor(){
    playerNameCaretVisible = true;
    const pos = Math.max(0, Math.min(playerNameBuffer.length, playerNameCursorPos));
    if(pos <= 0) return;
    playerNameBuffer = playerNameBuffer.slice(0, pos - 1) + playerNameBuffer.slice(pos);
    playerNameCursorPos = pos - 1;
    updatePlayerNameModalUI();
  }

  function deleteAtPlayerNameCursor(){
    playerNameCaretVisible = true;
    const pos = Math.max(0, Math.min(playerNameBuffer.length, playerNameCursorPos));
    if(pos >= playerNameBuffer.length) return;
    playerNameBuffer = playerNameBuffer.slice(0, pos) + playerNameBuffer.slice(pos + 1);
    updatePlayerNameModalUI();
  }

  function buildVirtualKeyboard(){
    if(!virtualKeyboardLetters) return;
    virtualKeyboardLetters.innerHTML = "";
    LATIN_LETTER_ROWS.forEach(rowLetters => {
      const rowEl = document.createElement("div");
      rowEl.className = "vk-row";
      rowLetters.forEach(letter => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vk-key";
        btn.textContent = letter;
        btn.setAttribute("aria-label", `Lettera ${letter}`);
        btn.addEventListener("click", () => {
          insertCharAtPlayerNameCursor(letter);
        });
        rowEl.appendChild(btn);
      });
      virtualKeyboardLetters.appendChild(rowEl);
    });
  }

  function openPlayerNameModal(){
    if(!hasLoadedHomePhoto()) return;
    buildVirtualKeyboard();
    playerNameBuffer = "";
    playerNameCursorPos = 0;
    playerNameCaretVisible = false;
    updatePlayerNameModalUI();
    activeOverlay = "playerName";
    if(playerNameOverlay) playerNameOverlay.classList.add("show");
  }

  function closePlayerNameModal(){
    playerNameBuffer = "";
    playerNameCursorPos = 0;
    playerNameCaretVisible = false;
    if(playerNameOverlay) playerNameOverlay.classList.remove("show");
    if(activeOverlay === "playerName") activeOverlay = "";
  }

  function confirmPlayerNameAndStart(){
    const trimmed = playerNameBuffer.trim().slice(0, MAX_RECORD_NAME_LEN);
    if(!trimmed) return;
    requestNativeFullscreen().catch(() => {});
    currentPlayerName = trimmed;
    savedPlayerName = trimmed;
    try { localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmed); } catch(_) {}

    currentSessionScore = 0;
    currentSessionLevelsCleared = 0;
    currentSessionMoves = 0;
    currentSessionTime = 0;
    currentSessionDetails = [];
    lastSessionRank = null;
    lastWinRank = null;
    sessionFinalized = false;

    if(playerNameOverlay) playerNameOverlay.classList.remove("show");
    activeOverlay = "";
    startGameFromHome();
  }

  if(playerNameCloseBtn){
    playerNameCloseBtn.addEventListener("click", closePlayerNameModal);
  }

  if(playerNameDisplay){
    playerNameDisplay.addEventListener("click", event => {
      playerNameCaretVisible = true;
      const charNodes = Array.from(playerNameDisplay.querySelectorAll(".name-display-char"));
      let nextPos = playerNameBuffer.length;
      if(charNodes.length > 0 && typeof event.clientX === "number"){
        nextPos = charNodes.length;
        for(let i = 0; i < charNodes.length; i++){
          const rect = charNodes[i].getBoundingClientRect();
          if(event.clientX < rect.left + rect.width / 2){
            nextPos = i;
            break;
          }
        }
      } else {
        nextPos = playerNameBuffer.length;
      }
      playerNameCursorPos = nextPos;
      updatePlayerNameModalUI();
      try { playerNameDisplay.focus(); } catch(_) {}
    });
  }

  if(vkBackspaceBtn){
    vkBackspaceBtn.addEventListener("click", () => {
      deleteBeforePlayerNameCursor();
    });
  }

  if(vkSpaceBtn){
    vkSpaceBtn.addEventListener("click", () => {
      if(playerNameBuffer.length > 0 && playerNameCursorPos > 0 && playerNameBuffer.length < MAX_RECORD_NAME_LEN){
        insertCharAtPlayerNameCursor(" ");
      } else {
        playerNameCaretVisible = true;
        updatePlayerNameModalUI();
      }
    });
  }

  if(vkOkBtn){
    vkOkBtn.addEventListener("click", confirmPlayerNameAndStart);
  }

  if(playerNameOverlay){
    playerNameOverlay.addEventListener("click", event => {
      if(event.target === playerNameOverlay){
        /* intenzionale: per annullare usare il pulsante X in alto a destra (evita chiusure accidentali durante la digitazione) */
      }
    });
  }

  /*
   * EVENTI FINESTRA CLASSIFICA RECORD, PIN E RESET (v. 1.26)
   */
  if(openRecordsBtn){
    openRecordsBtn.addEventListener("click", () => openRecordsModal(selectedLevel));
  }
  if(recordsInfoBtn){
    recordsInfoBtn.addEventListener("click", event => {
      event.stopPropagation();
      toggleRecordsInfoPopover();
    });
  }
  if(recordsCloseBtn){
    recordsCloseBtn.addEventListener("click", closeRecordsModal);
  }
  if(recordsOverlay){
    recordsOverlay.addEventListener("click", event => {
      if(recordsInfoPopover && recordsInfoPopover.classList.contains("show")){
        if(!recordsInfoPopover.contains(event.target) && event.target !== recordsInfoBtn){
          toggleRecordsInfoPopover(false);
        }
      }
      if(event.target === recordsOverlay){
        /* intenzionale: clic esterno disattivato per non chiudere la Sala dei Record */
      }
    });
  }

  if(recordsCrest){
    let crestStartX = 0;
    let crestStartY = 0;
    const clearCrestTimer = () => {
      if(recordsCrestLongPressTimer){
        clearTimeout(recordsCrestLongPressTimer);
        recordsCrestLongPressTimer = null;
      }
    };
    recordsCrest.addEventListener("contextmenu", event => event.preventDefault());
    recordsCrest.addEventListener("pointerdown", event => {
      if(event.pointerType === "mouse" && event.button !== 0) return;
      clearCrestTimer();
      crestStartX = event.clientX;
      crestStartY = event.clientY;
      recordsCrestLongPressTimer = setTimeout(() => {
        recordsCrestLongPressTimer = null;
        try { if(navigator.vibrate) navigator.vibrate(25); } catch(_) {}
        openRecordsPinModal();
      }, 1500);
    });
    recordsCrest.addEventListener("pointermove", event => {
      if(!recordsCrestLongPressTimer) return;
      if(Math.hypot(event.clientX - crestStartX, event.clientY - crestStartY) > 10){
        clearCrestTimer();
      }
    });
    const finishCrestPointer = () => {
      clearCrestTimer();
      if(recordsPinPendingFocus){
        recordsPinPendingFocus = false;
        const firstInput = getPinInputs()[0];
        if(firstInput){
          try { firstInput.focus(); } catch(_) {}
        }
      }
    };
    recordsCrest.addEventListener("pointerup", finishCrestPointer);
    recordsCrest.addEventListener("pointercancel", finishCrestPointer);
  }

  if(recordsPinBoxes){
    const pinInputs = getPinInputs();
    const verifyPinIfComplete = () => {
      const code = pinInputs.map(inp => inp.dataset.digit || "").join("");
      if(code.length < 6) return;
      if(code === getTodayPinGGMMAA()){
        closeRecordsPinModal();
        openRecordsResetModal();
      } else {
        if(recordsPinError) recordsPinError.textContent = "PIN errato. Riprova.";
        recordsPinBoxes.classList.remove("is-shake");
        void recordsPinBoxes.offsetWidth;
        recordsPinBoxes.classList.add("is-shake");
        clearPinInputs(true);
      }
    };

    pinInputs.forEach((inp, idx) => {
      inp.addEventListener("focus", () => {
        if(recordsPinError && recordsPinError.textContent) recordsPinError.textContent = "";
        try { inp.select(); } catch(_) {}
      });
      inp.addEventListener("input", () => {
        const digits = (inp.value || "").replace(/\D/g, "");
        if(digits.length > 1){
          for(let k = 0; k < digits.length && idx + k < pinInputs.length; k++){
            pinInputs[idx + k].dataset.digit = digits[k];
            pinInputs[idx + k].value = "*";
          }
          const nextIdx = Math.min(pinInputs.length - 1, idx + digits.length);
          pinInputs[nextIdx].focus();
          verifyPinIfComplete();
          return;
        }
        if(digits.length === 1){
          inp.dataset.digit = digits;
          inp.value = "*";
          if(idx < pinInputs.length - 1){
            pinInputs[idx + 1].focus();
          }
        } else {
          inp.dataset.digit = "";
          inp.value = "";
        }
        verifyPinIfComplete();
      });
      inp.addEventListener("keydown", event => {
        if(event.key === "Backspace"){
          if(inp.dataset.digit){
            event.preventDefault();
            inp.dataset.digit = "";
            inp.value = "";
          } else if(idx > 0){
            event.preventDefault();
            pinInputs[idx - 1].dataset.digit = "";
            pinInputs[idx - 1].value = "";
            pinInputs[idx - 1].focus();
          }
        } else if(event.key === "ArrowLeft" && idx > 0){
          event.preventDefault();
          pinInputs[idx - 1].focus();
        } else if(event.key === "ArrowRight" && idx < pinInputs.length - 1){
          event.preventDefault();
          pinInputs[idx + 1].focus();
        }
      });
    });

    recordsPinBoxes.addEventListener("click", event => {
      if(event.target && event.target.classList && event.target.classList.contains("pin-digit-input")) return;
      const firstEmpty = pinInputs.find(inp => !inp.dataset.digit) || pinInputs[pinInputs.length - 1];
      if(firstEmpty) firstEmpty.focus();
    });
  }

  if(recordsPinCancelBtn){
    recordsPinCancelBtn.addEventListener("click", closeRecordsPinModal);
  }
  if(recordsPinOverlay){
    recordsPinOverlay.addEventListener("click", event => {
      if(event.target === recordsPinOverlay) closeRecordsPinModal();
    });
  }

  if(resetLevelBtn){
    resetLevelBtn.addEventListener("click", () => showRecordsResetConfirm("level"));
  }
  if(resetAllLevelsBtn){
    resetAllLevelsBtn.addEventListener("click", () => showRecordsResetConfirm("allLevels"));
  }
  if(resetSessionBtn){
    resetSessionBtn.addEventListener("click", () => showRecordsResetConfirm("session"));
  }
  if(resetAllBtn){
    resetAllBtn.addEventListener("click", () => showRecordsResetConfirm("all"));
  }
  if(resetCancelBtn){
    resetCancelBtn.addEventListener("click", closeRecordsResetModal);
  }
  if(resetConfirmBackBtn){
    resetConfirmBackBtn.addEventListener("click", () => {
      pendingResetAction = "";
      if(recordsResetConfirmPanel) recordsResetConfirmPanel.style.display = "none";
      if(recordsResetMenuPanel) recordsResetMenuPanel.style.display = "";
    });
  }
  if(resetConfirmExecBtn){
    resetConfirmExecBtn.addEventListener("click", executeRecordsReset);
  }
  if(recordsResetOverlay){
    recordsResetOverlay.addEventListener("click", event => {
      if(event.target === recordsResetOverlay){
        /* intenzionale: chiusura consentita solo tramite le opzioni della finestra */
      }
    });
  }

  /*
   * EVENTI GALLERIA FOTO INTERNA (v. 1.26)
   */
  if(galleryAddPhotoBtn){
    galleryAddPhotoBtn.addEventListener("click", () => {
      if(photoInput){
        photoInput.value = "";
        photoInput.click();
      }
    });
  }
  if(galleryCancelSelectBtn){
    galleryCancelSelectBtn.addEventListener("click", exitGallerySelectionMode);
  }
  if(galleryDeleteSelectedBtn){
    galleryDeleteSelectedBtn.addEventListener("click", openGalleryDeleteConfirm);
  }
  if(cancelGalleryDeleteBtn){
    cancelGalleryDeleteBtn.addEventListener("click", closeGalleryDeleteConfirm);
  }
  if(confirmGalleryDeleteBtn){
    confirmGalleryDeleteBtn.addEventListener("click", async () => {
      const idsToDelete = Array.from(gallerySelectedIds);
      closeGalleryDeleteConfirm();
      if(idsToDelete.length === 0) return;
      showGalleryAlert("");
      for(const id of idsToDelete){
        try { await deleteGalleryPhotoById(id); } catch(_) {}
      }
      gallerySelectionMode = false;
      gallerySelectedIds.clear();
      await renderGalleryView();
    });
  }
  if(galleryDeleteConfirmOverlay){
    galleryDeleteConfirmOverlay.addEventListener("click", event => {
      if(event.target === galleryDeleteConfirmOverlay){
        closeGalleryDeleteConfirm();
      }
    });
  }
  if(galleryScrollBody){
    galleryScrollBody.addEventListener("scroll", clearGalleryLongPressTimer, { passive: true });
  }
  if(galleryCloseBtn){
    galleryCloseBtn.addEventListener("click", () => closeGalleryModal(true));
  }
  if(galleryOverlay){
    galleryOverlay.addEventListener("click", event => {
      if(event.target === galleryOverlay){
        /* intenzionale: clic esterno disattivato per non chiudere la Galleria Foto */
      }
    });
  }

  /*
   * EVENTI RITAGLIO / ZOOM NUOVO LIVELLO DOPO CAMBIA FOTO (v. 1.24)
   */
  if(nlCropPreviewBox){
    const nlPointers = new Map();
    let nlPinchDist = 0;
    let nlPinchZoom = 1;
    let nlPinchMidX = 0;
    let nlPinchMidY = 0;
    let nlPinchPanX = 0;
    let nlPinchPanY = 0;
    let isNlPanning = false;
    let startNlX = 0;
    let startNlY = 0;
    let initNlPanX = 0;
    let initNlPanY = 0;

    nlCropPreviewBox.addEventListener("pointerdown", event => {
      if(event.target && event.target.closest && event.target.closest("#nlCropCenterBtn")) return;
      if(!nlCropSourceImg || !nlCropSourceImg.complete || nlCropSourceImg.naturalWidth === 0) return;
      nlPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try { nlCropPreviewBox.setPointerCapture(event.pointerId); } catch(_){}
      if(nlPointers.size === 1){
        isNlPanning = true;
        startNlX = event.clientX;
        startNlY = event.clientY;
        initNlPanX = nlCropPanX;
        initNlPanY = nlCropPanY;
        nlCropPreviewBox.classList.add("is-dragging");
      } else if(nlPointers.size === 2){
        isNlPanning = false;
        const pts = Array.from(nlPointers.values());
        nlPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        nlPinchZoom = nlCropZoom;
        nlPinchMidX = (pts[0].x + pts[1].x) / 2;
        nlPinchMidY = (pts[0].y + pts[1].y) / 2;
        nlPinchPanX = nlCropPanX;
        nlPinchPanY = nlCropPanY;
      }
    });

    nlCropPreviewBox.addEventListener("pointermove", event => {
      if(!nlPointers.has(event.pointerId)) return;
      nlPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if(nlPointers.size === 2 && nlPinchDist > 0){
        const pts = Array.from(nlPointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const nextZoom = Math.max(1, Math.min(4, nlPinchZoom * (dist / nlPinchDist)));
        const factor = nlPinchZoom > 0 ? nextZoom / nlPinchZoom : 1;
        nlCropZoom = nextZoom;
        nlCropPanX = nlPinchPanX * factor + (midX - nlPinchMidX);
        nlCropPanY = nlPinchPanY * factor + (midY - nlPinchMidY);
        updateNlCropFrameAndImage(true);
        updateNlCropZoomUI();
      } else if(nlPointers.size === 1 && isNlPanning){
        nlCropPanX = initNlPanX + (event.clientX - startNlX);
        nlCropPanY = initNlPanY + (event.clientY - startNlY);
        updateNlCropFrameAndImage(true);
      }
    });

    const finishNlPan = event => {
      nlPointers.delete(event.pointerId);
      try { nlCropPreviewBox.releasePointerCapture(event.pointerId); } catch(_){}
      if(nlPointers.size === 1){
        const rem = Array.from(nlPointers.values())[0];
        isNlPanning = true;
        startNlX = rem.x;
        startNlY = rem.y;
        initNlPanX = nlCropPanX;
        initNlPanY = nlCropPanY;
      } else if(nlPointers.size === 0){
        isNlPanning = false;
        nlPinchDist = 0;
        nlCropPreviewBox.classList.remove("is-dragging");
        updateNlCropFrameAndImage(true);
      }
    };

    nlCropPreviewBox.addEventListener("pointerup", finishNlPan);
    nlCropPreviewBox.addEventListener("pointercancel", finishNlPan);
    nlCropPreviewBox.addEventListener("wheel", event => {
      if(!nlCropSourceImg || !nlCropSourceImg.complete || nlCropSourceImg.naturalWidth === 0) return;
      event.preventDefault();
      setNlCropZoom(nlCropZoom + (event.deltaY < 0 ? 0.2 : -0.2));
    }, { passive: false });
    nlCropPreviewBox.addEventListener("dblclick", event => {
      if(event.target && event.target.closest && event.target.closest("#nlCropCenterBtn")) return;
      if(!nlCropSourceImg || !nlCropSourceImg.complete || nlCropSourceImg.naturalWidth === 0) return;
      event.preventDefault();
      setNlCropZoom(nlCropZoom > 1.05 ? 1 : 2);
    });
  }

  function bindFluidDragZoomSlider(sliderEl, getZoom, setZoom, onCommit){
    if(!sliderEl) return;
    let activePointerId = null;
    let startX = 0;
    let anchorX = 0;
    let anchorZoom = 1;
    let hasDragged = false;
    let trackWidth = 100;
    const DRAG_THRESHOLD_PX = 4;

    sliderEl.addEventListener("touchstart", event => {
      event.preventDefault();
    }, { passive: false });

    sliderEl.addEventListener("mousedown", event => {
      event.preventDefault();
    });

    sliderEl.addEventListener("click", event => {
      event.preventDefault();
    });

    sliderEl.addEventListener("pointerdown", event => {
      if(sliderEl.disabled) return;
      if(event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      activePointerId = event.pointerId;
      startX = event.clientX;
      anchorX = event.clientX;
      anchorZoom = getZoom();
      hasDragged = false;
      const rect = sliderEl.getBoundingClientRect();
      trackWidth = Math.max(40, rect.width - 19);
      try { sliderEl.setPointerCapture(event.pointerId); } catch(_){}
    });

    sliderEl.addEventListener("pointermove", event => {
      if(activePointerId === null || event.pointerId !== activePointerId) return;
      const totalDx = event.clientX - startX;
      if(!hasDragged){
        if(Math.abs(totalDx) < DRAG_THRESHOLD_PX) return;
        hasDragged = true;
        anchorX = event.clientX;
        anchorZoom = getZoom();
      }
      event.preventDefault();
      const dx = event.clientX - anchorX;
      let nextZoom = anchorZoom + (dx / trackWidth) * 3;
      if(nextZoom <= 1){
        nextZoom = 1;
        anchorZoom = 1;
        anchorX = event.clientX;
      } else if(nextZoom >= 4){
        nextZoom = 4;
        anchorZoom = 4;
        anchorX = event.clientX;
      }
      setZoom(nextZoom);
    });

    const finishDrag = event => {
      if(activePointerId === null || event.pointerId !== activePointerId) return;
      try { sliderEl.releasePointerCapture(event.pointerId); } catch(_){}
      const didDrag = hasDragged;
      activePointerId = null;
      hasDragged = false;
      if(didDrag && typeof onCommit === "function"){
        onCommit();
      }
    };

    sliderEl.addEventListener("pointerup", finishDrag);
    sliderEl.addEventListener("pointercancel", finishDrag);

    sliderEl.addEventListener("input", () => {
      setZoom(parseFloat(sliderEl.value));
    });
    sliderEl.addEventListener("change", () => {
      setZoom(parseFloat(sliderEl.value));
      if(typeof onCommit === "function") onCommit();
    });
  }

  if(nlCropZoomSlider){
    bindFluidDragZoomSlider(nlCropZoomSlider, () => nlCropZoom, zoom => setNlCropZoom(zoom), null);
  }
  if(nlCropCenterBtn){
    nlCropCenterBtn.addEventListener("pointerdown", event => event.stopPropagation());
    nlCropCenterBtn.addEventListener("dblclick", event => event.stopPropagation());
    nlCropCenterBtn.addEventListener("click", event => {
      event.stopPropagation();
      centerNlCropImage();
    });
  }
  if(nlCropCancelBtn){
    nlCropCancelBtn.addEventListener("click", () => closeNextLevelCropModal(true));
  }
  if(nlCropConfirmBtn){
    nlCropConfirmBtn.addEventListener("click", () => {
      const cropped = generateCroppedPhotoFromImg(
        nlCropSourceImg,
        nlCropTargetLevel,
        nlCropZoom,
        nlCropPanRatioX,
        nlCropPanRatioY
      );
      if(cropped){
        photoData = cropped;
      }
      rawPhotoUrl = nlCropPhotoUrl;
      isPortraitPhoto = nlIsPortraitPhoto;
      cropZoom = nlCropZoom;
      cropPanRatioX = nlCropPanRatioX;
      cropPanRatioY = nlCropPanRatioY;
      if(cropSourceImg && rawPhotoUrl){
        cropSourceImg.onload = null;
        cropSourceImg.src = rawPhotoUrl;
      }

      closeNextLevelCropModal(false);
      lastWinScore = null;
      lastWinIsNewRecord = false;
      lastWinRank = null;

      levelIndex = nlCropTargetLevel;
      selectedLevel = levelIndex;
      updateLevelButtonsUI();

      moves = 0;
      mixed = false;
      locked = false;
      gameCompleted = false;
      selectedTile = null;
      resetTimer();

      const imgEl = $("previewImage");
      if(imgEl && photoData) imgEl.src = photoData;
      const thumbEl = $("previewThumb");
      if(thumbEl && photoData) thumbEl.src = photoData;

      createSolvedPieces();
      shufflePieces(true);
      resetPreviewZoom();
      renderBoard();
      if(isFullscreen) toggleFullscreen(true);
      setHint(`Livello ${levelIndex + 1}: nuova foto pronta. Buona fortuna!`);
      saveGame();
    });
  }

  /*
   * EVENTI SCHERMATA PRINCIPALE (HOME VIEW v. 1.24)
   */
  // 1. Selezione dei 7 livelli in formato 3D
  if(levelsGrid){
    levelsGrid.addEventListener("click", event => {
      const btn = event.target.closest(".level-btn-3d");
      if(!btn) return;
      const lvl = parseInt(btn.dataset.level, 10);
      if(lvl >= 0 && lvl < LEVELS.length){
        selectedLevel = lvl;
        updateLevelButtonsUI();
        updateCropFrameAndImage();
        saveGame();
      }
    });
  }

  // 2. Pulsante "Carica foto": apre la Galleria Interna (v. 1.24)
  if(uploadPhotoBtn){
    uploadPhotoBtn.addEventListener("click", () => {
      openGalleryModal("home", selectedLevel, false);
    });
  }

  // 3. Trascinamento e zoom della foto all'interno del riquadro di selezione
  if(cropPreviewBox){
    const cropPointers = new Map();
    let cropPinchDist = 0;
    let cropPinchZoom = 1;
    let cropPinchMidX = 0;
    let cropPinchMidY = 0;
    let cropPinchPanX = 0;
    let cropPinchPanY = 0;

    cropPreviewBox.addEventListener("pointerdown", event => {
      if(event.target && event.target.closest && event.target.closest("#cropCenterBtn")) return;
      if(!cropSourceImg || !cropSourceImg.complete || cropSourceImg.naturalWidth === 0) return;
      cropPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try { cropPreviewBox.setPointerCapture(event.pointerId); } catch(_){}

      if(cropPointers.size === 1){
        isPanningCrop = true;
        startCropPointerX = event.clientX;
        startCropPointerY = event.clientY;
        initialCropPanX = cropPanX;
        initialCropPanY = cropPanY;
        cropPreviewBox.classList.add("is-dragging");
      } else if(cropPointers.size === 2){
        isPanningCrop = false;
        const pts = Array.from(cropPointers.values());
        cropPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        cropPinchZoom = cropZoom;
        cropPinchMidX = (pts[0].x + pts[1].x) / 2;
        cropPinchMidY = (pts[0].y + pts[1].y) / 2;
        cropPinchPanX = cropPanX;
        cropPinchPanY = cropPanY;
      }
    });

    cropPreviewBox.addEventListener("pointermove", event => {
      if(!cropPointers.has(event.pointerId)) return;
      cropPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if(cropPointers.size === 2 && cropPinchDist > 0){
        const pts = Array.from(cropPointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const nextZoom = Math.max(1, Math.min(4, cropPinchZoom * (dist / cropPinchDist)));
        const scaleFactor = cropPinchZoom > 0 ? nextZoom / cropPinchZoom : 1;
        cropZoom = nextZoom;
        cropPanX = cropPinchPanX * scaleFactor + (midX - cropPinchMidX);
        cropPanY = cropPinchPanY * scaleFactor + (midY - cropPinchMidY);
        updateCropFrameAndImage(true);
        updateCropZoomUI();
      } else if(cropPointers.size === 1 && isPanningCrop){
        cropPanX = initialCropPanX + (event.clientX - startCropPointerX);
        cropPanY = initialCropPanY + (event.clientY - startCropPointerY);
        updateCropFrameAndImage(true);
      }
    });

    const finishCropPan = event => {
      cropPointers.delete(event.pointerId);
      try { cropPreviewBox.releasePointerCapture(event.pointerId); } catch(_){}

      if(cropPointers.size === 1){
        const remaining = Array.from(cropPointers.values())[0];
        isPanningCrop = true;
        startCropPointerX = remaining.x;
        startCropPointerY = remaining.y;
        initialCropPanX = cropPanX;
        initialCropPanY = cropPanY;
      } else if(cropPointers.size === 0){
        if(isPanningCrop || cropPinchDist > 0){
          isPanningCrop = false;
          cropPinchDist = 0;
          cropPreviewBox.classList.remove("is-dragging");
          updateCropFrameAndImage(true);
          saveGame();
        }
      }
    };

    cropPreviewBox.addEventListener("pointerup", finishCropPan);
    cropPreviewBox.addEventListener("pointercancel", finishCropPan);

    cropPreviewBox.addEventListener("wheel", event => {
      if(!cropSourceImg || !cropSourceImg.complete || cropSourceImg.naturalWidth === 0) return;
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.2 : -0.2;
      setCropZoom(cropZoom + delta, true);
    }, { passive: false });

    cropPreviewBox.addEventListener("dblclick", event => {
      if(event.target && event.target.closest && event.target.closest("#cropCenterBtn")) return;
      if(!cropSourceImg || !cropSourceImg.complete || cropSourceImg.naturalWidth === 0) return;
      event.preventDefault();
      setCropZoom(cropZoom > 1.05 ? 1 : 2, true);
    });
  }

  if(cropCenterBtn){
    cropCenterBtn.addEventListener("pointerdown", event => event.stopPropagation());
    cropCenterBtn.addEventListener("dblclick", event => event.stopPropagation());
    cropCenterBtn.addEventListener("click", event => {
      event.stopPropagation();
      centerCropImage(true);
    });
  }

  if(cropZoomSlider){
    bindFluidDragZoomSlider(cropZoomSlider, () => cropZoom, zoom => setCropZoom(zoom, false), () => saveGame());
  }

  // 4. Pulsante "GIOCA" in formato 3D: chiede prima il nome giocatore e poi avvia
  function startGameFromHome(){
    const proceed = () => {
      updateCropFrameAndImage();
      const cropped = generateCroppedPhoto(selectedLevel);
      if(cropped){
        photoData = cropped;
      }
      levelIndex = selectedLevel;
      moves = 0;
      mixed = false;
      locked = false;
      gameCompleted = false;
      showCorrect = true;
      selectedTile = null;
      activeDrag = null;
      inGameSession = true;

      const imgEl = $("previewImage");
      if(imgEl && photoData) imgEl.src = photoData;
      const thumbEl = $("previewThumb");
      if(thumbEl && photoData) thumbEl.src = photoData;

      if(homeView){
        homeView.classList.add("is-hidden");
        homeView.style.display = "none";
      }
      if(gamePanel){
        gamePanel.style.display = "";
        gamePanel.classList.remove("hidden-initial");
      }
      document.body.classList.add("in-game");

      resetTimer();
      createSolvedPieces();
      shufflePieces(true);
      resetPreviewZoom();
      renderBoard();
      updateUI();

      toggleFullscreen(true);
      saveGame();
    };

    if(!hasLoadedHomePhoto()) return;
    proceed();
  }

  if(homePlayBtn){
    homePlayBtn.addEventListener("click", () => {
      if(!hasLoadedHomePhoto()) return;
      openPlayerNameModal();
    });
  }

  /*
   * TASTO ESC e TASTIERA FISICA PER NOME GIOCATORE
   */
  document.addEventListener(
    "keydown",
    event=>{
      if(activeOverlay === "playerName"){
        if(event.key === "Escape"){
          event.preventDefault();
          closePlayerNameModal();
          return;
        }
        if(event.key === "Backspace"){
          event.preventDefault();
          deleteBeforePlayerNameCursor();
          return;
        }
        if(event.key === "Delete"){
          event.preventDefault();
          deleteAtPlayerNameCursor();
          return;
        }
        if(event.key === "ArrowLeft"){
          event.preventDefault();
          playerNameCaretVisible = true;
          if(playerNameCursorPos > 0) playerNameCursorPos--;
          updatePlayerNameModalUI();
          return;
        }
        if(event.key === "ArrowRight"){
          event.preventDefault();
          playerNameCaretVisible = true;
          if(playerNameCursorPos < playerNameBuffer.length) playerNameCursorPos++;
          updatePlayerNameModalUI();
          return;
        }
        if(event.key === "Home"){
          event.preventDefault();
          playerNameCaretVisible = true;
          playerNameCursorPos = 0;
          updatePlayerNameModalUI();
          return;
        }
        if(event.key === "End"){
          event.preventDefault();
          playerNameCaretVisible = true;
          playerNameCursorPos = playerNameBuffer.length;
          updatePlayerNameModalUI();
          return;
        }
        if(event.key === "Enter"){
          event.preventDefault();
          if(playerNameBuffer.trim().length > 0) confirmPlayerNameAndStart();
          return;
        }
        if(event.key === " "){
          event.preventDefault();
          if(playerNameBuffer.length > 0 && playerNameCursorPos > 0 && playerNameBuffer.length < MAX_RECORD_NAME_LEN){
            insertCharAtPlayerNameCursor(" ");
          }
          return;
        }
        if(/^[a-zA-Z]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey){
          event.preventDefault();
          insertCharAtPlayerNameCursor(event.key.toUpperCase());
          return;
        }
        return;
      }

      if(event.key !== "Escape") return;

      if(activeOverlay === "recordsReset"){
        closeRecordsResetModal();
        return;
      }

      if(activeOverlay === "recordsPin"){
        closeRecordsPinModal();
        return;
      }

      if(activeOverlay === "records"){
        closeRecordsModal();
        return;
      }

      if(activeOverlay === "galleryDeleteConfirm"){
        closeGalleryDeleteConfirm();
        return;
      }

      if(activeOverlay === "gallery"){
        if(gallerySelectionMode){
          exitGallerySelectionMode();
        } else {
          closeGalleryModal(true);
        }
        return;
      }

      if(activeOverlay === "nextCrop"){
        closeNextLevelCropModal(true);
        return;
      }

      if(activeOverlay === "appExited"){
        return;
      }

      if(activeOverlay === "appExitConfirm"){
        cancelAppExit();
        return;
      }

      if(activeOverlay === "exitConfirm"){
        cancelExitGame();
        return;
      }

      if(activeOverlay === "gameSummary"){
        closeGameSummaryModal();
        return;
      }

      if(activeOverlay === "preview"){
        closePreview();
        return;
      }

      if(activeOverlay === "restartConfirm"){
        if(restartConfirmOverlay) restartConfirmOverlay.classList.remove("show");
        activeOverlay = "";
        return;
      }

      if(isFullscreen){
        requestExitGame();
      }
    }
  );

  /*
   * SALVATAGGIO AUTOMATICO
   */
  window.addEventListener(
    "pagehide",
    saveGame
  );

  document.addEventListener(
    "visibilitychange",
    ()=>{
      if(document.visibilityState === "hidden"){
        saveGame();
      }
    }
  );

  const handleViewportUpdate = () => {
    updateCropFrameAndImage();
    if(activeOverlay === "nextCrop"){
      updateNlCropFrameAndImage();
    }
    if(inGameSession){
      if(isFullscreen){
        applyFullscreenLayoutClass(shouldUseLandscapeGameView(levelIndex));
      }
      renderBoard();
    }
  };

  window.addEventListener("resize", handleViewportUpdate);
  window.addEventListener("orientationchange", () => {
    setTimeout(handleViewportUpdate, 80);
  });

  if(typeof ResizeObserver === "function"){
    const fsBarSyncObserver = new ResizeObserver(() => {
      if(isFullscreen){
        syncFullscreenTopBarsAlignment();
      }
    });
    if(board){
      fsBarSyncObserver.observe(board);
      board.addEventListener("transitionend", () => {
        if(isFullscreen) syncFullscreenTopBarsAlignment();
      });
    }
    if(previewTile) fsBarSyncObserver.observe(previewTile);
  }

  /*
   * SCHERMATA DI AVVIO (SPLASH v. 1.42)
   */
  function initSplashScreen(){
    const splashEl = $("splashScreen");
    if(!splashEl) return;
    const skipBtn = $("splashSkipBtn");

    const SPLASH_DURATION_MS = 6000;
    const splashStartedAt = Date.now();
    let splashActive = true;
    let musicStarted = false;
    let autoHideTimer = null;

    const cleanupUnlockListeners = () => {
      document.removeEventListener("pointerdown", onFirstGesture, true);
      document.removeEventListener("touchstart", onFirstGesture, true);
      document.removeEventListener("touchend", onFirstGesture, true);
      document.removeEventListener("mousedown", onFirstGesture, true);
      document.removeEventListener("click", onFirstGesture, true);
      document.removeEventListener("keydown", onFirstGesture, true);
      window.removeEventListener("focus", onFirstGesture);
    };

    const unlockSilentBuffer = (ctx) => {
      try{
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }catch(_){}
    };

    const startSplashMusicForRemaining = (fromGesture = false) => {
      if(!splashActive || musicStarted || !soundEnabled) return;
      const ctx = getAudioContext();
      if(!ctx) return;
      if(fromGesture){
        unlockSilentBuffer(ctx);
      }
      const tryStart = () => {
        if(!splashActive || musicStarted || !soundEnabled) return;
        if(ctx.state === "running"){
          musicStarted = true;
          const rem = Math.max(0.4, (SPLASH_DURATION_MS - (Date.now() - splashStartedAt)) / 1000);
          playSplashMusic(rem);
          cleanupUnlockListeners();
        }
      };
      if(ctx.state === "running"){
        tryStart();
      } else {
        ctx.resume().then(tryStart).catch(() => {});
      }
    };

    const onFirstGesture = (event) => {
      if(event && event.target && event.target.closest && event.target.closest("#splashSkipBtn")) return;
      startSplashMusicForRemaining(true);
    };

    const dismissSplash = (fadeAudioSec = 0.75) => {
      if(!splashActive) return;
      splashActive = false;
      if(autoHideTimer){
        clearTimeout(autoHideTimer);
        autoHideTimer = null;
      }
      if(skipBtn){
        skipBtn.disabled = true;
      }
      cleanupUnlockListeners();
      stopSplashMusic(fadeAudioSec);
      splashEl.classList.add("is-fading-out");
      splashEl.setAttribute("aria-hidden", "true");
      setTimeout(() => {
        splashEl.classList.add("is-hidden");
      }, 900);
    };

    document.addEventListener("pointerdown", onFirstGesture, true);
    document.addEventListener("touchstart", onFirstGesture, true);
    document.addEventListener("touchend", onFirstGesture, true);
    document.addEventListener("mousedown", onFirstGesture, true);
    document.addEventListener("click", onFirstGesture, true);
    document.addEventListener("keydown", onFirstGesture, true);
    window.addEventListener("focus", onFirstGesture);

    if(skipBtn){
      skipBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        dismissSplash(0.25);
      });
    }

    startSplashMusicForRemaining(false);

    autoHideTimer = setTimeout(() => {
      dismissSplash(0.75);
    }, SPLASH_DURATION_MS);
  }

  /*
   * AVVIO DELL'APPLICAZIONE (v. 1.40)
   */
  if(Capacitor.isNativePlatform()){
    try { Promise.resolve(StatusBar.hide()).catch(() => {}); } catch(_) {}
  }
  updateSoundUI();
  updateTimerDisplay();
  ensureStarterGallerySeeded();

  const restored = restoreGame();

  if(!restored){
    // Inizializza la schermata principale (Home View) senza foto precaricata
    inGameSession = false;
    if(homeView) homeView.style.display = "";
    if(gamePanel) gamePanel.classList.add("hidden-initial");
    document.body.classList.remove("in-game");
    syncScreenOrientation(false, false);

    clearHomePhoto();
    updateLevelButtonsUI();
    setHint("Carica una foto e premi su GIOCA!");
  }else{
    syncHomePhotoEmptyUI();
  }

  initSplashScreen();

})();
