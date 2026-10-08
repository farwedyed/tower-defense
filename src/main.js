// Main Orchestration Module for Blocky TDS 2D

import { Grid } from './grid.js';
import { UI } from './ui.js';
import { EffectManager } from './particle.js';
import { Runner, Goliath, Shifter, BossZombie, GraveDigger, MoltenBoss, FallenKing, VoidReaver } from './enemy.js';
import { Scout, Minigunner, Commander, DJUnit, Pyromancer, Farm, Gladiator, Soldier } from './tower.js';
import { soundManager } from './sound.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // 1. Meta Progression (loaded from localStorage or initialized defaults)
    this.playerLevel = 1;
    this.playerXp = 0;
    this.playerCoins = 150;
    this.unlockedAgents = ['scout'];
    this.equippedAgents = ['scout'];
    this.ownedSkins = [];
    this.equippedSkins = {};

    // Daily Quests structure:
    // Quest 1: Slay 50 Zombies
    // Quest 2: Spend $2,000 Cash
    // Quest 3: Place 5 Farms
    this.questGoals = {
      kills: 50,
      cashSpent: 2000,
      farmsPlaced: 5
    };
    this.questProgress = {
      kills: 0,
      cashSpent: 0,
      farmsPlaced: 0
    };
    this.questRewarded = {
      kills: false,
      cashSpent: false,
      farmsPlaced: false
    };

    // Speedrun matchmaking time tracker
    this.matchTime = 0;

    // Tutorial
    this.tutorialCompleted = false;
    this.tutorialStep = 0; // 0=lobby hint, 1=placement hint, 2=upgrade hint, 3=done

    this.loadStatsFromStorage();

    // Reset daily quests if they are done to start fresh or keep persisting
    // (We reload them inside loadStatsFromStorage)

    // 2. In-Match Stats
    this.lives = 20;
    this.gold = 400; // starting cash
    this.wave = 0;
    this.maxWaves = 10;
    this.state = 'lobby'; // 'lobby', 'playing', 'gameover', 'victory'
    this.selectedMap = 'grassland';
    this.waveInProgress = false;

    // Auto Wave Mode (default enabled)
    this.autoMode = true;
    this.autoStartTimer = 0; // counts down from 2.0 when a wave ends in autoMode

    // Speeds
    this.speedMultiplier = 1;

    // Match Selections
    this.selectedShopTower = 'scout';
    this.selectedPlacedTower = null;

    // Mouse grid
    this.mouseGrid = { col: -1, row: -1 };
    this.mousePos = { x: -1, y: -1 };
    this.isMouseOnCanvas = false;
    this.smoothHoverPos = { x: 0, y: 0 };
    this.targetHoverPos = { x: 0, y: 0 };

    // Play lists
    this.enemies = [];
    this.bullets = [];
    this.spawnQueue = [];
    this.spawnInterval = 0.8;
    this.spawnTimer = 0;

    // Instantiate engine components
    this.grid = new Grid(this.canvas.width, this.canvas.height, 40);
    this.effectManager = new EffectManager();
    this.ui = new UI(this);

    this.lastTime = 0;

    this.initWaveData();
    this.initEventListeners();
    
    // Sync Lobby displays immediately
    this.ui.updateLobbyMeta(this.playerLevel, this.playerXp, this.playerCoins);
    // Render daily quests and leaderboard for the default map on first load
    this.ui.renderDailyQuests();
    this.ui.renderLeaderboard(this.selectedMap);

    // Component 6: Show welcome tutorial hint for first-time players
    if (!this.tutorialCompleted) {
      this.ui.showTutorialHint(0);
    }

    // Run core animation frame
    requestAnimationFrame((t) => this.loop(t));
  }

  loadStatsFromStorage() {
    try {
      const level = localStorage.getItem('tds_level');
      const xp = localStorage.getItem('tds_xp');
      const coins = localStorage.getItem('tds_coins');
      const unlocked = localStorage.getItem('tds_unlocked');
      const equipped = localStorage.getItem('tds_equipped');
      const skins = localStorage.getItem('tds_skins');
      const eqSkins = localStorage.getItem('tds_equipped_skins');
      const quests = localStorage.getItem('tds_quests');
      const questRewarded = localStorage.getItem('tds_quest_rewarded');
      const tutorial = localStorage.getItem('tds_tutorial_completed');
      const leaderboard = localStorage.getItem('tds_leaderboard');

      if (level) this.playerLevel = parseInt(level);
      if (xp) this.playerXp = parseInt(xp);
      if (coins) this.playerCoins = parseInt(coins);
      if (unlocked) this.unlockedAgents = JSON.parse(unlocked);
      if (equipped) this.equippedAgents = JSON.parse(equipped);
      if (skins) this.ownedSkins = JSON.parse(skins);
      if (eqSkins) this.equippedSkins = JSON.parse(eqSkins);
      if (quests) {
        const parsedQuests = JSON.parse(quests);
        if (parsedQuests && typeof parsedQuests === 'object') {
          this.questProgress = { ...this.questProgress, ...parsedQuests };
        }
      }
      if (questRewarded) {
        const parsed = JSON.parse(questRewarded);
        if (parsed && typeof parsed === 'object') {
          this.questRewarded = { ...this.questRewarded, ...parsed };
        }
      }
      if (tutorial === 'true') this.tutorialCompleted = true;
      if (leaderboard) {
        const parsed = JSON.parse(leaderboard);
        if (parsed && typeof parsed === 'object') {
          this.leaderboard = parsed;
        }
      }
    } catch (e) {
      console.warn("Storage load failed, utilizing initial defaults.", e);
    }

    // Ensure safe defaults
    if (!Array.isArray(this.unlockedAgents) || this.unlockedAgents.length === 0) {
      this.unlockedAgents = ['scout'];
    }
    if (!Array.isArray(this.equippedAgents) || this.equippedAgents.length === 0) {
      this.equippedAgents = ['scout'];
    }
    if (!Array.isArray(this.ownedSkins)) {
      this.ownedSkins = [];
    }
    if (!this.equippedSkins || typeof this.equippedSkins !== 'object') {
      this.equippedSkins = {};
    }
    if (!this.leaderboard || typeof this.leaderboard !== 'object') {
      this.leaderboard = { grassland: [], desert: [], tundra: [] };
    }
  }

  saveStatsToStorage() {
    try {
      localStorage.setItem('tds_level', this.playerLevel.toString());
      localStorage.setItem('tds_xp', this.playerXp.toString());
      localStorage.setItem('tds_coins', this.playerCoins.toString());
      localStorage.setItem('tds_unlocked', JSON.stringify(this.unlockedAgents));
      localStorage.setItem('tds_equipped', JSON.stringify(this.equippedAgents));
      localStorage.setItem('tds_skins', JSON.stringify(this.ownedSkins));
      localStorage.setItem('tds_equipped_skins', JSON.stringify(this.equippedSkins));
      localStorage.setItem('tds_quests', JSON.stringify(this.questProgress));
      localStorage.setItem('tds_quest_rewarded', JSON.stringify(this.questRewarded));
      localStorage.setItem('tds_tutorial_completed', this.tutorialCompleted ? 'true' : 'false');
      localStorage.setItem('tds_leaderboard', JSON.stringify(this.leaderboard));
    } catch (e) {
      console.warn("Storage save failed.", e);
    }
  }

  // Component 4: Check if any quest goals were met and reward coins once
  checkQuestCompletion() {
    let anyCompleted = false;

    if (!this.questRewarded.kills && this.questProgress.kills >= this.questGoals.kills) {
      this.questRewarded.kills = true;
      this.playerCoins += 75;
      anyCompleted = true;
      this.effectManager && this.effectManager.spawnText
        && this.effectManager.spawnText(400, 260, 'QUEST COMPLETE! +🪙 75 Coins', '#f1c40f');
    }
    if (!this.questRewarded.cashSpent && this.questProgress.cashSpent >= this.questGoals.cashSpent) {
      this.questRewarded.cashSpent = true;
      this.playerCoins += 100;
      anyCompleted = true;
      this.effectManager && this.effectManager.spawnText
        && this.effectManager.spawnText(400, 240, 'QUEST COMPLETE! +🪙 100 Coins', '#f1c40f');
    }
    if (!this.questRewarded.farmsPlaced && this.questProgress.farmsPlaced >= this.questGoals.farmsPlaced) {
      this.questRewarded.farmsPlaced = true;
      this.playerCoins += 50;
      anyCompleted = true;
      this.effectManager && this.effectManager.spawnText
        && this.effectManager.spawnText(400, 220, 'QUEST COMPLETE! +🪙 50 Coins', '#f1c40f');
    }

    if (anyCompleted) {
      this.saveStatsToStorage();
      if (this.ui) this.ui.renderDailyQuests();
    }
  }

  // Component 5: Save speedrun record for the current map
  saveSpeedrunRecord() {
    const minutes = Math.floor(this.matchTime / 60);
    const seconds = Math.floor(this.matchTime % 60);
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const entry = {
      time: timeStr,
      timeRaw: this.matchTime,
      date: new Date().toLocaleDateString()
    };
    if (!Array.isArray(this.leaderboard[this.selectedMap])) {
      this.leaderboard[this.selectedMap] = [];
    }
    this.leaderboard[this.selectedMap].push(entry);
    // Sort by fastest time ascending
    this.leaderboard[this.selectedMap].sort((a, b) => a.timeRaw - b.timeRaw);
    // Keep only top 5
    this.leaderboard[this.selectedMap] = this.leaderboard[this.selectedMap].slice(0, 5);
    this.saveStatsToStorage();
  }

  initWaveData() {
    // 10 Wave Blueprint (Spawning matching Roblox Zombie Classes)
    this.waveBlueprints = [
      // Wave 1
      { runners: 6, shifters: 0, goliaths: 0, bosses: 0, graveDiggers: 0, moltenBosses: 0, fallenKings: 0, voidReavers: 0, rate: 1.0 },
      // Wave 2
      { runners: 10, shifters: 3, goliaths: 0, bosses: 0, graveDiggers: 0, moltenBosses: 0, fallenKings: 0, voidReavers: 0, rate: 0.9 },
      // Wave 3
      { runners: 8, shifters: 8, goliaths: 1, bosses: 0, graveDiggers: 0, moltenBosses: 0, fallenKings: 0, voidReavers: 0, rate: 0.8 },
      // Wave 4
      { runners: 12, shifters: 10, goliaths: 3, bosses: 0, graveDiggers: 0, moltenBosses: 0, fallenKings: 0, voidReavers: 0, rate: 0.7 },
      // Wave 5 (Grave Digger Boss)
      { runners: 10, shifters: 8, goliaths: 4, bosses: 0, graveDiggers: 1, moltenBosses: 0, fallenKings: 0, voidReavers: 0, rate: 0.8 },
      // Wave 6
      { runners: 10, shifters: 15, goliaths: 10, bosses: 0, graveDiggers: 0, moltenBosses: 0, fallenKings: 0, voidReavers: 0, rate: 0.55 },
      // Wave 7
      { runners: 20, shifters: 20, goliaths: 12, bosses: 1, graveDiggers: 0, moltenBosses: 0, fallenKings: 0, voidReavers: 0, rate: 0.55 },
      // Wave 8 (Molten Boss)
      { runners: 15, shifters: 25, goliaths: 12, bosses: 0, graveDiggers: 0, moltenBosses: 1, fallenKings: 0, voidReavers: 0, rate: 0.5 },
      // Wave 9
      { runners: 25, shifters: 30, goliaths: 18, bosses: 2, graveDiggers: 0, moltenBosses: 0, fallenKings: 0, voidReavers: 0, rate: 0.45 },
      // Wave 10 (Final Battle: Fallen King & Void Reaver)
      { runners: 30, shifters: 30, goliaths: 20, bosses: 2, graveDiggers: 0, moltenBosses: 0, fallenKings: 1, voidReavers: 1, rate: 0.4 }
    ];
  }

  // ── Unified coordinate helper (mouse + touch) ──────────────────────────
  _getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  _handleGridInteraction() {
    if (this.state !== 'playing') return;
    const col = this.mouseGrid.col;
    const row = this.mouseGrid.row;
    const key = `${col},${row}`;

    if (this.grid.towers.has(key)) {
      const agent = this.grid.towers.get(key);
      this.setSelectedPlacedTower(agent);
      this.selectedShopTower = null;
    } else {
      if (this.selectedShopTower) {
        this.placeShopAgent(col, row);
      } else {
        this.setSelectedPlacedTower(null);
      }
    }
  }

  initEventListeners() {
    // ── Mouse move ───────────────────────────────────────────────────────
    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this._getCanvasCoords(e.clientX, e.clientY);
      this.mousePos.x = x;
      this.mousePos.y = y;
      this.mouseGrid = this.grid.pixelToGrid(x, y);
      this.isMouseOnCanvas = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseOnCanvas = false;
      this.mouseGrid = { col: -1, row: -1 };
    });

    // ── Mouse click ──────────────────────────────────────────────────────
    this.canvas.addEventListener('click', () => {
      this._handleGridInteraction();
    });

    // ── Touch: touchstart (track position + prevent scroll) ──────────────
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const { x, y } = this._getCanvasCoords(touch.clientX, touch.clientY);
      this.mousePos.x = x;
      this.mousePos.y = y;
      this.mouseGrid = this.grid.pixelToGrid(x, y);
      this.isMouseOnCanvas = true;
    }, { passive: false });

    // ── Touch: touchmove (pan hover position) ────────────────────────────
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const { x, y } = this._getCanvasCoords(touch.clientX, touch.clientY);
      this.mousePos.x = x;
      this.mousePos.y = y;
      this.mouseGrid = this.grid.pixelToGrid(x, y);
    }, { passive: false });

    // ── Touch: touchend (trigger placement/selection) ────────────────────
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this._handleGridInteraction();
      // Keep hover visuals for a moment then clear
      setTimeout(() => {
        this.isMouseOnCanvas = false;
        this.mouseGrid = { col: -1, row: -1 };
      }, 250);
    }, { passive: false });
  }

  // Set active map selection
  setSelectedMap(mapId) {
    this.selectedMap = mapId;
  }

  setSelectedShopTower(type) {
    this.selectedShopTower = type;
  }

  setSelectedPlacedTower(agent) {
    this.selectedPlacedTower = agent;
    this.ui.updateSelectionPanel(agent);
  }

  // Check Agent Purchase Unlock
  buyAgentFromShop(type) {
    let price = 0;
    if (type === 'minigunner') price = 250;
    else if (type === 'commander') price = 350;
    else if (type === 'dj') price = 400;
    else if (type === 'pyromancer') price = 300;

    if (this.playerCoins >= price && !this.unlockedAgents.includes(type)) {
      this.playerCoins -= price;
      this.unlockedAgents.push(type);
      
      // Auto-equip if loadout has space
      if (this.equippedAgents.length < 5) {
        this.equippedAgents.push(type);
      }

      this.saveStatsToStorage();
      this.ui.updateLobbyMeta(this.playerLevel, this.playerXp, this.playerCoins);
    }
  }

  buyCrate(crateType) {
    let cost = 150;
    if (crateType === 'elite') cost = 350;
    else if (crateType === 'deluxe') cost = 500;

    if (this.playerCoins < cost) {
      alert("Not enough coins to buy this crate!");
      return;
    }

    // Deduct coins
    this.playerCoins -= cost;
    this.saveStatsToStorage();
    this.ui.updateLobbyMeta(this.playerLevel, this.playerXp, this.playerCoins);

    // Roll rarity & select agent based on crate type
    let chosenAgent = 'scout';
    let chosenRarity = 'common'; // 'common', 'rare', 'epic', 'legendary'

    const roll = Math.random();

    if (crateType === 'basic') {
      // Basic Toy Crate: Contains Scout (Common), Soldier (Common), Gladiator (Rare).
      // Rarity: Common (80%), Rare (20%)
      if (roll < 0.80) {
        chosenRarity = 'common';
        chosenAgent = Math.random() < 0.5 ? 'scout' : 'soldier';
      } else {
        chosenRarity = 'rare';
        chosenAgent = 'gladiator';
      }
    } else if (crateType === 'elite') {
      // Commander Elite Crate: Contains Pyromancer (Rare), Gladiator (Rare), Commander (Epic).
      // Rarity: Rare (60%), Epic (40%)
      if (roll < 0.60) {
        chosenRarity = 'rare';
        chosenAgent = Math.random() < 0.5 ? 'pyromancer' : 'gladiator';
      } else {
        chosenRarity = 'epic';
        chosenAgent = 'commander';
      }
    } else if (crateType === 'deluxe') {
      // Deluxe DJ Crate: Contains Minigunner (Epic), DJ Unit (Legendary).
      // Rarity: Epic (50%), Legendary (50%)
      if (roll < 0.50) {
        chosenRarity = 'epic';
        chosenAgent = 'minigunner';
      } else {
        chosenRarity = 'legendary';
        chosenAgent = 'dj';
      }
    }

    // Unlock agent or cosmetic skin if duplicate
    let revealedSkinName = null; // null means unlocked base unit
    if (!this.unlockedAgents.includes(chosenAgent)) {
      this.unlockedAgents.push(chosenAgent);
      // Auto-equip if space in loadout
      if (this.equippedAgents.length < 5 && !this.equippedAgents.includes(chosenAgent)) {
        this.equippedAgents.push(chosenAgent);
      }
      this.saveStatsToStorage();
    } else {
      // Duplicate! Award cosmetic skin variant
      const skinsList = ['Golden', 'Cyber', 'Hazmat'];
      const skinSuffix = skinsList[Math.floor(Math.random() * skinsList.length)];
      revealedSkinName = `${chosenAgent}_${skinSuffix}`;
      if (!this.ownedSkins.includes(revealedSkinName)) {
        this.ownedSkins.push(revealedSkinName);
        this.saveStatsToStorage();
      }
    }

    // Trigger the satisfying fullscreen unboxing overlay animation loop in UI
    this.ui.startUnboxingAnimation(crateType, chosenAgent, chosenRarity, revealedSkinName);
  }

  // Handle Loadout Toggling
  toggleLoadoutAgent(type) {
    const idx = this.equippedAgents.indexOf(type);
    if (idx !== -1) {
      // Unequip (must keep at least 1 agent)
      if (this.equippedAgents.length > 1) {
        this.equippedAgents.splice(idx, 1);
      }
    } else {
      // Equip (Max 5)
      if (this.equippedAgents.length < 5) {
        this.equippedAgents.push(type);
      }
    }
    this.saveStatsToStorage();
  }

  // Launch Match Deployments
  deployToMatch() {
    this.state = 'playing';
    
    // Set map details on grid board
    this.grid.selectMap(this.selectedMap);
    
    // Match resetting
    this.lives = 20;
    this.gold = 400;
    this.wave = 0;
    this.waveInProgress = false;
    this.speedMultiplier = 1;
    this.enemies = [];
    this.bullets = [];
    this.spawnQueue = [];
    this.matchTime = 0;
    
    this.grid.clear();
    this.effectManager.clear();
    this.setSelectedPlacedTower(null);
    this.selectedShopTower = this.equippedAgents[0]; // Select first loadout agent

    // Sync UI layouts
    let mapName = 'Grassland';
    if (this.selectedMap === 'desert') mapName = 'Desert Outpost';
    else if (this.selectedMap === 'tundra') mapName = 'Frost Tundra';

    this.ui.showGameLayout(mapName);
    this.ui.renderPlacementShop();
    this.ui.updateSpeedButton(1);
    this.ui.updateWaveButton(false);
    this.ui.updateHUD(this.lives, this.gold, this.wave, this.maxWaves);

    // Component 6: Show tutorial placement hint for first-time players
    if (!this.tutorialCompleted && this.tutorialStep === 0) {
      this.tutorialStep = 1;
      this.ui.showTutorialHint(1);
    }
  }

  // Quit to Main Lobby
  quitToLobby() {
    this.state = 'lobby';
    this.ui.showLobbyLayout();
    this.ui.updateLobbyMeta(this.playerLevel, this.playerXp, this.playerCoins);
    this.ui.renderDailyQuests();
    this.ui.renderLeaderboard(this.selectedMap);

    // Component 6: Show lobby tutorial hint for first-time players
    if (!this.tutorialCompleted && this.tutorialStep === 0) {
      this.ui.showTutorialHint(0);
    }
  }

  // Returns agent deployment cost
  getTowerCost(type) {
    switch (type) {
      case 'scout': return 100;
      case 'minigunner': return 250;
      case 'commander': return 350;
      case 'dj': return 400;
      case 'pyromancer': return 300;
      case 'farm': return 250;
      case 'gladiator': return 200;
      case 'soldier': return 150;
      default: return 0;
    }
  }

  placeShopAgent(col, row) {
    const cost = this.getTowerCost(this.selectedShopTower);
    if (this.gold < cost) {
      this.effectManager.spawnText(col * 40 + 20, row * 40 + 20, "CASH INSUFFICIENT", '#e74c3c');
      return;
    }

    if (this.grid.isCellValidForPlacement(col, row)) {
      let newAgent;
      const size = this.grid.cellSize;

      switch (this.selectedShopTower) {
        case 'scout':
          newAgent = new Scout(col, row, size);
          break;
        case 'minigunner':
          newAgent = new Minigunner(col, row, size);
          break;
        case 'commander':
          newAgent = new Commander(col, row, size);
          break;
        case 'dj':
          newAgent = new DJUnit(col, row, size);
          break;
        case 'pyromancer':
          newAgent = new Pyromancer(col, row, size);
          break;
        case 'farm':
          newAgent = new Farm(col, row, size);
          break;
        case 'gladiator':
          newAgent = new Gladiator(col, row, size);
          break;
        case 'soldier':
          newAgent = new Soldier(col, row, size);
          break;
      }

      if (newAgent) {
        newAgent.equippedSkin = this.equippedSkins[this.selectedShopTower] || 'default';
        this.grid.placeTower(col, row, newAgent);
        this.gold -= cost;
        soundManager.playPlace();

        // Daily Quest: farmsPlaced & cashSpent tracking
        if (this.selectedShopTower === 'farm') {
          this.questProgress.farmsPlaced++;
        }
        this.questProgress.cashSpent += cost;
        this.checkQuestCompletion();

        // Component 6: Tutorial – advance from placement hint to upgrade hint
        if (!this.tutorialCompleted && this.tutorialStep === 1) {
          this.tutorialStep = 2;
          this.ui.showTutorialHint(2);
        }

        this.effectManager.spawnPlacementSparks(newAgent.x, newAgent.y, size);
        this.ui.updateHUD(this.lives, this.gold, this.wave, this.maxWaves);
      }
    }
  }

  upgradeSelectedTower() {
    if (!this.selectedPlacedTower) return;
    const cost = this.selectedPlacedTower.getUpgradeCost();
    if (this.gold >= cost) {
      this.gold -= cost;

      // Daily Quest: cashSpent tracking
      this.questProgress.cashSpent += cost;
      this.checkQuestCompletion();

      this.selectedPlacedTower.upgrade(this.effectManager);
      soundManager.playUpgrade();
      this.ui.updateSelectionPanel(this.selectedPlacedTower);
      this.ui.updateHUD(this.lives, this.gold, this.wave, this.maxWaves);

      // Component 6: Tutorial – advance from upgrade hint to done
      if (!this.tutorialCompleted && this.tutorialStep === 2) {
        this.tutorialStep = 3;
        this.tutorialCompleted = true;
        this.saveStatsToStorage();
        this.ui.dismissTutorial();
      }
    }
  }

  sellSelectedTower() {
    if (!this.selectedPlacedTower) return;
    const refund = this.selectedPlacedTower.getSellValue();
    this.gold += refund;

    const col = this.selectedPlacedTower.gridX;
    const row = this.selectedPlacedTower.gridY;
    this.grid.removeTower(col, row);

    this.effectManager.spawnPlacementSparks(this.selectedPlacedTower.x, this.selectedPlacedTower.y, 40);
    this.setSelectedPlacedTower(null);
    this.ui.updateHUD(this.lives, this.gold, this.wave, this.maxWaves);
  }

  skipWave() {
    if (!this.waveInProgress || this.spawnQueue.length > 0 || this.wave >= this.maxWaves) return;
    const reward = 50 + this.wave * 15;
    this.gold += reward;
    this.effectManager.spawnText(400, 260, `WAVE SKIPPED! +$${reward}`, '#e67e22');
    this.waveInProgress = false;
    this.startNextWave();
  }

  toggleAutoMode() {
    this.autoMode = !this.autoMode;
    // If turning off, cancel any pending countdown
    if (!this.autoMode) this.autoStartTimer = 0;
    this.ui.updateAutoWaveButton(this.autoMode);
  }


  // Trigger Wave start
  startNextWave() {
    if (this.waveInProgress || this.state !== 'playing') return;

    this.wave++;
    this.waveInProgress = true;
    this.ui.updateWaveButton(true);
    this.ui.updateHUD(this.lives, this.gold, this.wave, this.maxWaves);

    const blueprint = this.waveBlueprints[this.wave - 1];
    this.spawnInterval = blueprint.rate;
    this.spawnQueue = [];

    // Construct spawning array
    const spawnList = [];
    for (let i = 0; i < blueprint.runners; i++) spawnList.push('runner');
    for (let i = 0; i < blueprint.shifters; i++) spawnList.push('shifter');
    for (let i = 0; i < blueprint.goliaths; i++) spawnList.push('goliath');
    for (let i = 0; i < blueprint.bosses; i++) spawnList.push('boss');
    for (let i = 0; i < blueprint.graveDiggers; i++) spawnList.push('grave_digger');
    for (let i = 0; i < blueprint.moltenBosses; i++) spawnList.push('molten_boss');
    for (let i = 0; i < blueprint.fallenKings; i++) spawnList.push('fallen_king');
    for (let i = 0; i < blueprint.voidReavers; i++) spawnList.push('void_reaver');

    // Shuffle slightly
    this.spawnQueue = spawnList.sort(() => Math.random() - 0.5);
    this.spawnTimer = 0;

    this.effectManager.spawnText(400, 300, `WAVE ${this.wave}`, '#f1c40f');
  }

  toggleSpeed() {
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
    this.ui.updateSpeedButton(this.speedMultiplier);
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000.0) * this.speedMultiplier;
    this.lastTime = timestamp;

    if (this.state === 'playing') {
      this.matchTime += dt;
      this.update(dt);
    }
    
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // Update smooth hover position
    if (this.isMouseOnCanvas) {
      this.targetHoverPos.x = this.mouseGrid.col * this.grid.cellSize;
      this.targetHoverPos.y = this.mouseGrid.row * this.grid.cellSize;

      this.smoothHoverPos.x += (this.targetHoverPos.x - this.smoothHoverPos.x) * 18 * dt;
      this.smoothHoverPos.y += (this.targetHoverPos.y - this.smoothHoverPos.y) * 18 * dt;
    }

    // 0. Auto Wave countdown
    if (this.autoMode && !this.waveInProgress && this.autoStartTimer > 0 && this.state === 'playing') {
      this.autoStartTimer -= dt;
      if (this.autoStartTimer <= 0) {
        this.autoStartTimer = 0;
        if (this.wave < this.maxWaves) {
          this.startNextWave();
        }
      }
    }

    // 1. Spawning
    if (this.spawnQueue.length > 0) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        const nextType = this.spawnQueue.shift();
        this.spawnZombie(nextType);
      }
    }

    // 2. Scan and evaluate support buffs (DJs and Commanders)
    this.evaluateSupportBuffs();

    // 3. Update Zombies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const zombie = this.enemies[i];
      zombie.update(this.grid.pixelPath, this.effectManager, dt, this.enemies, this.grid.towers);

      if (zombie.health <= 0) {
        this.questProgress.kills++;
        this.checkQuestCompletion();
        this.enemies.splice(i, 1);
        continue;
      }

      if (zombie.targetNodeIndex >= this.grid.pixelPath.length) {
        this.lives--;
        this.effectManager.spawnText(zombie.x, zombie.y, "-1 Life", '#e74c3c');
        this.enemies.splice(i, 1);
        this.ui.updateHUD(this.lives, this.gold, this.wave, this.maxWaves);

        if (this.lives <= 0) {
          this.state = 'gameover';
          this.ui.showOverlay("SYSTEM CRITICAL", "GRID OVERRUN. CLICK TO LOBBY");
        }
      }
    }

    // 4. Update Projectiles
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const projectile = this.bullets[i];
      const isDead = projectile.update(this.effectManager, this.enemies, dt);
      if (isDead) {
        this.bullets.splice(i, 1);
      }
    }

    // 5. Update Equipped Agents
    for (const agent of this.grid.towers.values()) {
      agent.update(this.enemies, this.effectManager, this.bullets, dt);
    }

    // 6. Fading visuals updates
    this.effectManager.update(dt);

    // 7. Check Wave secured
    if (this.waveInProgress && this.enemies.length === 0 && this.spawnQueue.length === 0) {
      this.waveInProgress = false;

      // Wave end income for Farms
      for (const agent of this.grid.towers.values()) {
        if (agent.type === 'farm') {
          const income = agent.getHarvestIncome();
          this.gold += income;
          this.effectManager.spawnText(agent.x, agent.y - 20, `+$${income}`, '#2ecc71');
          this.effectManager.spawnImpact(agent.x, agent.y, '#2ecc71', 6, 0.5);
        }
      }

      // Reward match Cash
      const cashBonus = 80 + this.wave * 10;
      this.gold += cashBonus;

      // Reward Meta Coins & XP (accumulated towards level progress)
      const multiplier = this.selectedMap === 'tundra' ? 1.5 : this.selectedMap === 'desert' ? 1.25 : 1.0;
      const coinReward = Math.round((10 + this.wave * 5) * multiplier);
      const xpReward = Math.round((15 + this.wave * 4) * multiplier);

      this.playerCoins += coinReward;
      this.playerXp += xpReward;

      // Level check
      const nextLevelXp = this.playerLevel * 100;
      if (this.playerXp >= nextLevelXp) {
        this.playerXp -= nextLevelXp;
        this.playerLevel++;
        this.effectManager.spawnText(400, 240, `LEVEL UP! REACHED LEVEL ${this.playerLevel}`, '#f1c40f');
      }

      this.saveStatsToStorage();
      
      this.effectManager.spawnText(400, 200, `WAVE SECURED! +🪙 ${coinReward} / +🌟 ${xpReward} XP`, '#2ecc71');

      if (this.wave >= this.maxWaves) {
        this.state = 'victory';
        // Component 5: Save speedrun leaderboard entry on victory
        this.saveSpeedrunRecord();
        this.ui.showOverlay("VICTORY!", "MAP SECURED. CLICK TO RETIRE TO LOBBY");
      } else {
        this.ui.updateWaveButton(false);
        // Auto Wave: arm the countdown for the next wave
        if (this.autoMode) {
          this.autoStartTimer = 2.0;
          this.ui.showAutoCountdown(2);
        }
      }

      this.ui.updateHUD(this.lives, this.gold, this.wave, this.maxWaves);
    }
  }

  evaluateSupportBuffs() {
    // Reset agent buffs
    for (const agent of this.grid.towers.values()) {
      agent.djRangeBuffed = false;
      agent.commanderSpeedBuffed = false;
      agent.commanderAbilityActive = false;
    }

    // Evaluate DJs
    for (const dj of this.grid.towers.values()) {
      if (dj.type === 'dj') {
        for (const agent of this.grid.towers.values()) {
          if (agent !== dj) {
            const dist = Math.hypot(agent.x - dj.x, agent.y - dj.y);
            if (dist <= dj.range) {
              agent.djRangeBuffed = true;
            }
          }
        }
      }
    }

    // Evaluate Commanders
    for (const cmd of this.grid.towers.values()) {
      if (cmd.type === 'commander') {
        const hasBuff = cmd.buffDurationLeft > 0 || cmd.isAbilityActive;
        for (const agent of this.grid.towers.values()) {
          if (agent !== cmd) {
            const dist = Math.hypot(agent.x - cmd.x, agent.y - cmd.y);
            if (dist <= cmd.range) {
              if (hasBuff) {
                agent.commanderSpeedBuffed = true;
              }
              if (cmd.isAbilityActive) {
                agent.commanderAbilityActive = true;
              }
            }
          }
        }
      }
    }
  }

  spawnZombie(type) {
    const startPoint = this.grid.pixelPath[0];
    let e;
    switch (type) {
      case 'runner':
        e = new Runner(startPoint.x, startPoint.y);
        break;
      case 'shifter':
        e = new Shifter(startPoint.x, startPoint.y);
        break;
      case 'goliath':
        e = new Goliath(startPoint.x, startPoint.y);
        break;
      case 'boss':
        e = new BossZombie(startPoint.x, startPoint.y);
        break;
      case 'grave_digger':
        e = new GraveDigger(startPoint.x, startPoint.y);
        break;
      case 'molten_boss':
        e = new MoltenBoss(startPoint.x, startPoint.y);
        break;
      case 'fallen_king':
        e = new FallenKing(startPoint.x, startPoint.y);
        break;
      case 'void_reaver':
        e = new VoidReaver(startPoint.x, startPoint.y);
        break;
    }
    if (e) this.enemies.push(e);
  }

  draw() {
    this.ctx.save();
    
    // Clear
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'playing') {
      this.effectManager.screenShake.apply(this.ctx);

      // 1. Draw Map & Paths
      this.grid.draw(this.ctx);

      // 2. Draw placed agents
      for (const agent of this.grid.towers.values()) {
        agent.draw(this.ctx);
      }

      // 3. Draw active zombies
      for (const zombie of this.enemies) {
        zombie.draw(this.ctx);
      }

      // 4. Draw active projectiles
      for (const bullet of this.bullets) {
        bullet.draw(this.ctx);
      }

      // 5. Previews range circles
      this.drawHoverVisuals();

      // 6. Draw visual particles
      this.effectManager.draw(this.ctx);
    } else {
      // Draw a neat cartoon wallpaper in Lobby background if canvas is visible
      this.ctx.fillStyle = '#2a3b5c';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = "900 36px 'Fredoka', sans-serif";
      this.ctx.textAlign = 'center';
      this.ctx.fillText("LOBBY ACTIVE", 400, 300);
      this.ctx.font = "400 18px 'Nunito', sans-serif";
      this.ctx.fillText("Manage loadout and map selection in your console sidebar", 400, 335);
    }

    this.ctx.restore();
  }

  drawHoverVisuals() {
    if (this.state !== 'playing' || !this.isMouseOnCanvas) return;

    // Placed agent range
    if (this.selectedPlacedTower) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.12;
      this.ctx.fillStyle = this.selectedPlacedTower.color;
      this.ctx.beginPath();
      // DJ buff scales current range indicator
      const currentRange = this.selectedPlacedTower.range * (this.selectedPlacedTower.djRangeBuffed ? 1.15 : 1.0);
      this.ctx.arc(this.selectedPlacedTower.x, this.selectedPlacedTower.y, currentRange, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.globalAlpha = 0.45;
      this.ctx.strokeStyle = this.selectedPlacedTower.color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Shop placement ranges
    if (this.selectedShopTower) {
      const col = this.mouseGrid.col;
      const row = this.mouseGrid.row;
      if (col < 0 || col >= this.grid.cols || row < 0 || row >= this.grid.rows) return;

      const size = this.grid.cellSize;
      const px = this.smoothHoverPos.x;
      const py = this.smoothHoverPos.y;
      const cx = px + size / 2;
      const cy = py + size / 2;

      const isValid = this.grid.isCellValidForPlacement(col, row);
      const color = isValid ? '#2ecc71' : '#e74c3c'; // Green or red flat

      this.ctx.save();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(px + 2, py + 2, size - 4, size - 4);
      this.ctx.fillStyle = isValid ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)';
      this.ctx.fillRect(px + 2, py + 2, size - 4, size - 4);

      // Theoretical range circle
      const range = this.getTowerRange(this.selectedShopTower);
      if (range > 0) {
        this.ctx.globalAlpha = 0.08;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, range, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.globalAlpha = 0.35;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, range, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      // Draw translucent character model preview
      let tempAgent;
      switch (this.selectedShopTower) {
        case 'scout': tempAgent = new Scout(0, 0, size); break;
        case 'minigunner': tempAgent = new Minigunner(0, 0, size); break;
        case 'commander': tempAgent = new Commander(0, 0, size); break;
        case 'dj': tempAgent = new DJUnit(0, 0, size); break;
        case 'pyromancer': tempAgent = new Pyromancer(0, 0, size); break;
        case 'farm': tempAgent = new Farm(0, 0, size); break;
        case 'gladiator': tempAgent = new Gladiator(0, 0, size); break;
        case 'soldier': tempAgent = new Soldier(0, 0, size); break;
      }
      if (tempAgent) {
        tempAgent.x = cx;
        tempAgent.y = cy;
        tempAgent.angle = Math.atan2(this.mousePos.y - cy, this.mousePos.x - cx);
        this.ctx.globalAlpha = 0.55;
        tempAgent.draw(this.ctx);
      }

      this.ctx.restore();
    }
  }

  getTowerRange(type) {
    switch (type) {
      case 'scout': return 135;
      case 'minigunner': return 155;
      case 'commander': return 120;
      case 'dj': return 140;
      case 'pyromancer': return 105;
      case 'farm': return 0;
      case 'gladiator': return 65;
      case 'soldier': return 125;
      default: return 0;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
