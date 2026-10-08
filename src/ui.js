// UI and Lobby Module for Blocky TDS 2D
import { soundManager } from './sound.js';

export class UI {
  constructor(game) {
    this.game = game;

    // Cache Lobby Elements
    this.lobbyView = document.getElementById('lobby-view');
    this.gameView = document.getElementById('game-view');

    this.playerLevel = document.getElementById('player-level');
    this.playerCoins = document.getElementById('player-coins');
    this.playerCoinsVal = document.getElementById('player-coins-val');
    this.playerXpFill = document.getElementById('player-xp-fill');
    this.playerXpText = document.getElementById('player-xp-text');

    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.lobbyPanels = document.querySelectorAll('.lobby-panel');
    this.mapCards = document.querySelectorAll('.map-card');
    this.shopCards = document.querySelectorAll('.shop-card');

    this.btnDeploy = document.getElementById('btn-deploy');
    this.loadoutGrid = document.getElementById('loadout-selection-grid');

    // Cache Match HUD Elements
    this.hudLives = document.getElementById('hud-lives');
    this.hudGold = document.getElementById('hud-gold');
    this.hudWave = document.getElementById('hud-wave');
    this.hudMapName = document.getElementById('hud-map-name');

    this.btnNextWave = document.getElementById('btn-next-wave');
    this.btnSkipWave = document.getElementById('btn-skip-wave');
    this.btnSpeed = document.getElementById('btn-speed');
    this.btnAutoWave = document.getElementById('btn-auto-wave');
    this.btnReturnLobby = document.getElementById('btn-return-lobby');
    this.equippedAgentsList = document.getElementById('equipped-agents-list');

    // Selection controls
    this.selectionPanel = document.getElementById('selection-panel');
    this.selectionInfo = document.getElementById('selection-info');
    this.selectTargeting = document.getElementById('select-targeting');
    this.btnUpgrade = document.getElementById('btn-upgrade');
    this.btnSell = document.getElementById('btn-sell');

    this.overlay = document.getElementById('game-overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlaySubtitle = document.getElementById('overlay-subtitle');

    this.initEventListeners();
    this.drawAllStaticPreviews();
  }

  initEventListeners() {
    // 1. Lobby Navigation Tabs
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetPanelId = btn.getAttribute('data-target');
        this.lobbyPanels.forEach(panel => {
          panel.classList.remove('active');
          if (panel.id === targetPanelId) {
            panel.classList.add('active');
          }
        });

        if (targetPanelId === 'panel-loadout') {
          this.renderLoadoutConfig();
        }
      });
    });

    // 2. Map Selector Cards
    this.mapCards.forEach(card => {
      card.addEventListener('click', () => {
        this.mapCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const mapId = card.getAttribute('data-map-id');
        this.game.setSelectedMap(mapId);
        // Component 5: Refresh leaderboard when map selection changes
        this.renderLeaderboard(mapId);
      });
    });

    // 3. Shop Purchase Recruit Clickers (Replaced by unboxing, but let's wire crate clicks)
    const btnBuyCrates = document.querySelectorAll('.btn-buy-crate');
    btnBuyCrates.forEach(btn => {
      btn.addEventListener('click', () => {
        const crateType = btn.getAttribute('data-crate');
        this.game.buyCrate(crateType);
      });
    });

    const btnCloseReveal = document.getElementById('btn-close-reveal');
    if (btnCloseReveal) {
      btnCloseReveal.addEventListener('click', () => {
        // Part 3: Sync shop card lock/unlock state immediately after unboxing
        this.updateLobbyMeta(this.game.playerLevel, this.game.playerXp, this.game.playerCoins);
        this.drawAllStaticPreviews();

        const overlay = document.getElementById('crate-opening-overlay');
        if (overlay) overlay.classList.add('hidden');
        const revealCard = document.getElementById('crate-reveal-card');
        if (revealCard) revealCard.classList.add('hidden');
      });
    }

    // 4. Lobby Deployment
    this.btnDeploy.addEventListener('click', () => {
      this.game.deployToMatch();
    });

    // 5. Quit Match
    this.btnReturnLobby.addEventListener('click', () => {
      this.game.quitToLobby();
    });

    // 6. Next Wave, Skip Wave and Game Speed
    this.btnNextWave.addEventListener('click', () => {
      this.game.startNextWave();
    });

    if (this.btnSkipWave) {
      this.btnSkipWave.addEventListener('click', () => {
        this.game.skipWave();
      });
    }

    this.btnSpeed.addEventListener('click', () => {
      this.game.toggleSpeed();
    });

    // Auto Wave toggle
    if (this.btnAutoWave) {
      this.btnAutoWave.addEventListener('click', () => {
        this.game.toggleAutoMode();
      });
    }

    // 7. Targeting Dropdown Selection Change
    this.selectTargeting.addEventListener('change', (e) => {
      if (this.game.selectedPlacedTower) {
        this.game.selectedPlacedTower.targetingStrategy = e.target.value;
      }
    });

    // 8. In-game upgrade and sell buttons
    this.btnUpgrade.addEventListener('click', () => {
      this.game.upgradeSelectedTower();
    });

    this.btnSell.addEventListener('click', () => {
      this.game.sellSelectedTower();
    });

    // 9. Overlay reboot click
    this.overlay.addEventListener('click', () => {
      if (this.game.state === 'gameover' || this.game.state === 'victory') {
        this.game.quitToLobby();
        this.hideOverlay();
      }
    });
  }

  // Redraw Lobby panels (credits/level badges)
  updateLobbyMeta(level, xp, coins) {
    if (this.playerLevel) this.playerLevel.textContent = level;
    if (this.playerCoinsVal) {
      this.playerCoinsVal.textContent = coins;
    } else if (this.playerCoins) {
      const valEl = document.getElementById('player-coins-val');
      if (valEl) {
        valEl.textContent = coins;
      } else {
        this.playerCoins.textContent = `🪙 ${coins}`;
      }
    }

    const nextLevelXp = level * 100;
    const percent = Math.min(100, (xp / nextLevelXp) * 100);
    if (this.playerXpFill) this.playerXpFill.style.width = `${percent}%`;
    if (this.playerXpText) this.playerXpText.textContent = `${xp} / ${nextLevelXp}`;

    // Sync recruit buttons and locked labels
    this.shopCards.forEach(card => {
      const type = card.getAttribute('data-agent-type');
      if (!type) return;
      const isUnlocked = this.game.unlockedAgents.includes(type);
      const btn = card.querySelector('.btn-shop-action');
      const costText = card.querySelector('.cost-text');

      if (isUnlocked) {
        card.classList.remove('locked');
        card.classList.add('purchased');
        if (costText) {
          costText.textContent = "UNLOCKED";
          costText.style.color = "var(--primary-green-dark)";
        }
        if (btn) {
          btn.textContent = "UNLOCKED";
          btn.disabled = true;
          btn.style.opacity = '1.0';
        }
      } else {
        card.classList.add('locked');
        card.classList.remove('purchased');
        if (costText) {
          costText.textContent = "LOCKED - UNBOX TO UNLOCK";
          costText.style.color = "#e74c3c";
        }
        if (btn) {
          btn.textContent = "LOCKED";
          btn.disabled = true;
          btn.style.opacity = '0.5';
        }
      }
    });

    // Disable unbox buttons if coins insufficient
    const crateButtons = document.querySelectorAll('.btn-buy-crate');
    crateButtons.forEach(btn => {
      const crateType = btn.getAttribute('data-crate');
      let cost = 150;
      if (crateType === 'elite') cost = 350;
      else if (crateType === 'deluxe') cost = 500;

      if (coins < cost) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
      } else {
        btn.disabled = false;
        btn.style.opacity = '1.0';
      }
    });
  }

  // Draw Loadout cards setup tab
  renderLoadoutConfig() {
    this.loadoutGrid.innerHTML = '';
    const allAgentTypes = ['scout', 'minigunner', 'commander', 'dj', 'pyromancer', 'farm', 'soldier', 'gladiator'];

    allAgentTypes.forEach(type => {
      const isUnlocked = this.game.unlockedAgents.includes(type);
      if (!isUnlocked) return; // Hide locked cards

      const isEquipped = this.game.equippedAgents.includes(type);
      const card = document.createElement('div');
      card.className = `loadout-card ${isEquipped ? 'equipped' : ''}`;

      // Find owned skins for this agent type
      const prefix = type + '_';
      const skins = this.game.ownedSkins.filter(s => s.startsWith(prefix));
      const currentEquippedSkin = this.game.equippedSkins[type] || 'default';

      let selectHtml = '';
      if (skins.length > 0) {
        selectHtml = `<div class="skin-select-container" style="margin-top: 8px;">
          <span style="font-size: 0.7rem; color: #7f8c8d;">SKIN: </span>
          <select class="skin-select styled-select" style="font-size: 0.75rem; font-weight: 800;">
            <option value="default" ${currentEquippedSkin === 'default' ? 'selected' : ''}>Default</option>
            ${skins.map(s => {
              const displayName = s.substring(prefix.length);
              return `<option value="${s}" ${currentEquippedSkin === s ? 'selected' : ''}>${displayName}</option>`;
            }).join('')}
          </select>
        </div>`;
      }

      card.innerHTML = `
        <div class="agent-avatar"><canvas width="60" height="60"></canvas></div>
        <span class="name" style="margin-top: 6px">${type.toUpperCase()}</span>
        ${isEquipped ? '<span class="equipped-indicator">EQUIPPED</span>' : ''}
        ${selectHtml}
      `;

      const cvs = card.querySelector('canvas');
      this.drawAgentPreview(cvs, type);

      // Bind equip toggle on card click
      card.addEventListener('click', (e) => {
        // Prevent click if select element was target
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
        this.game.toggleLoadoutAgent(type);
        this.renderLoadoutConfig();
      });

      // Bind skin selection dropdown change
      const selector = card.querySelector('.skin-select');
      if (selector) {
        selector.addEventListener('change', (e) => {
          this.game.equippedSkins[type] = e.target.value;
          this.game.saveStatsToStorage();
          // Redraw preview
          this.drawAgentPreview(cvs, type);
        });
      }

      this.loadoutGrid.appendChild(card);
    });
  }

  // Render Equipped Sidebar selection buttons during match play
  renderPlacementShop() {
    this.equippedAgentsList.innerHTML = '';

    this.game.equippedAgents.forEach(type => {
      const btn = document.createElement('button');
      btn.className = `placement-btn ${this.game.selectedShopTower === type ? 'active' : ''}`;
      btn.setAttribute('data-type', type);

      let name = 'Scout';
      let cost = 100;
      if (type === 'minigunner') { name = 'Minigunner'; cost = 250; }
      else if (type === 'commander') { name = 'Commander'; cost = 350; }
      else if (type === 'dj') { name = 'DJ Unit'; cost = 400; }
      else if (type === 'pyromancer') { name = 'Pyromancer'; cost = 300; }
      else if (type === 'farm') { name = 'Farm'; cost = 250; }
      else if (type === 'gladiator') { name = 'Gladiator'; cost = 200; }
      else if (type === 'soldier') { name = 'Soldier'; cost = 150; }

      btn.innerHTML = `
        <div class="icon"><canvas width="45" height="45"></canvas></div>
        <div class="info">
          <span class="name">${name}</span>
          <span class="cost">$${cost}</span>
        </div>
      `;

      const cvs = btn.querySelector('canvas');
      this.drawAgentPreview(cvs, type);

      btn.addEventListener('click', () => {
        document.querySelectorAll('.placement-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.game.setSelectedShopTower(type);
        this.game.setSelectedPlacedTower(null);
      });

      this.equippedAgentsList.appendChild(btn);
    });
  }

  // Update in-game values
  updateHUD(lives, gold, wave, maxWaves) {
    if (this.hudLives) {
      const valEl = document.getElementById('hud-lives-val');
      if (valEl) {
        valEl.textContent = Math.max(0, lives);
      } else {
        this.hudLives.textContent = `❤️ ${Math.max(0, lives)}`;
      }
    }
    if (this.hudGold) {
      const valEl = document.getElementById('hud-gold-val');
      if (valEl) {
        valEl.textContent = `$${gold}`;
      } else {
        this.hudGold.textContent = `💵 $${gold}`;
      }
    }
    if (this.hudWave) {
      const valEl = document.getElementById('hud-wave-val');
      if (valEl) {
        valEl.textContent = `${wave} / ${maxWaves}`;
      } else {
        this.hudWave.textContent = `🌊 ${wave} / ${maxWaves}`;
      }
    }

    // Highlight placement buttons based on gold
    const placementBtns = document.querySelectorAll('.placement-btn');
    placementBtns.forEach(btn => {
      const type = btn.getAttribute('data-type');
      const cost = this.game.getTowerCost(type);
      if (gold < cost) {
        btn.style.opacity = '0.4';
      } else {
        btn.style.opacity = '1.0';
      }
    });

    // Toggle Skip Wave button visibility
    if (this.btnSkipWave) {
      const showSkip = this.game.waveInProgress && this.game.spawnQueue.length === 0 && this.game.wave < this.game.maxWaves;
      if (showSkip) {
        this.btnSkipWave.classList.remove('hidden');
      } else {
        this.btnSkipWave.classList.add('hidden');
      }
    }

    if (this.game.selectedPlacedTower) {
      this.updateSelectionPanel(this.game.selectedPlacedTower);
    }
  }

  // Show selected placed Agent panel
  updateSelectionPanel(agent) {
    if (!agent) {
      this.selectionPanel.classList.add('hidden');
      return;
    }

    this.selectionPanel.classList.remove('hidden');
    document.querySelectorAll('.placement-btn').forEach(b => b.classList.remove('active'));

    // Set targeting dropdown option to match agent's strategy
    this.selectTargeting.value = agent.targetingStrategy;

    const upgradeCost = agent.getUpgradeCost();
    const sellValue = agent.getSellValue();

    let detailsHtml = `
      <p class="unit-name">${agent.name} <span style="color: #f39c12">Lvl ${agent.level}</span></p>
      <p class="unit-stats">Damage: ${Math.round(agent.damage)} | Range: ${Math.round(agent.range * (agent.djRangeBuffed ? 1.15 : 1.0))}px | Rate: ${(agent.fireRate * (agent.commanderSpeedBuffed ? 1.35 : 1.0)).toFixed(1)}/s</p>
    `;

    // Supporting details
    if (agent.type === 'commander') {
      detailsHtml += `<p class="unit-stats" style="color: #e74c3c">Call to Arms: +35% Shoot Speed</p>`;
    } else if (agent.type === 'dj') {
      detailsHtml += `<p class="unit-stats" style="color: #9b59b6">Plays Tracks: +15% Range & -10% Upgrades</p>`;
    } else if (agent.type === 'pyromancer') {
      const burnDps = 15 + agent.level * 4;
      detailsHtml += `<p class="unit-stats" style="color: #e67e22">Fire Spray DoT: ${burnDps} Dmg/sec</p>`;
    } else if (agent.type === 'farm') {
      const income = agent.getHarvestIncome();
      detailsHtml += `<p class="unit-stats" style="color: #2ecc71">Wave Harvest Income: +$${income}</p>`;
    } else if (agent.type === 'gladiator') {
      detailsHtml += `<p class="unit-stats" style="color: #7f8c8d"> centurion Centurion Plume: Fast Centurion Sword swing</p>`;
    } else if (agent.type === 'soldier') {
      detailsHtml += `<p class="unit-stats" style="color: #27ae60">Assault Rifle: Rapid 3-round bursts</p>`;
    }

    // Hide or show targeting selector based on Farm type
    const targetingContainer = document.querySelector('.targeting-container');
    if (targetingContainer) {
      if (agent.type === 'farm') {
        targetingContainer.classList.add('hidden');
      } else {
        targetingContainer.classList.remove('hidden');
      }
    }

    this.selectionInfo.innerHTML = detailsHtml;

    this.btnUpgrade.textContent = `UPGRADE ($${upgradeCost})`;
    if (this.game.gold < upgradeCost) {
      this.btnUpgrade.disabled = true;
      this.btnUpgrade.style.opacity = '0.5';
    } else {
      this.btnUpgrade.disabled = false;
      this.btnUpgrade.style.opacity = '1.0';
    }

    this.btnSell.textContent = `SELL ($${sellValue})`;

    // Active Ability Button Rendering
    let btnAbility = document.getElementById('btn-ability');
    if (!btnAbility) {
      btnAbility = document.createElement('button');
      btnAbility.id = 'btn-ability';
      btnAbility.className = 'btn btn-secondary';
      btnAbility.style.marginTop = '8px';
      btnAbility.style.width = '100%';
      this.selectionPanel.appendChild(btnAbility);
    }

    if (agent.type === 'commander' || agent.type === 'gladiator') {
      btnAbility.classList.remove('hidden');
      if (agent.isAbilityActive) {
        btnAbility.textContent = `ACTIVE (${Math.ceil(agent.abilityActiveTimer)}s)`;
        btnAbility.disabled = true;
        btnAbility.style.opacity = '0.7';
        btnAbility.style.background = '#e74c3c';
      } else if (agent.abilityCooldownTimer > 0) {
        btnAbility.textContent = `COOLDOWN (${Math.ceil(agent.abilityCooldownTimer)}s)`;
        btnAbility.disabled = true;
        btnAbility.style.opacity = '0.5';
        btnAbility.style.background = '#7f8c8d';
      } else {
        btnAbility.textContent = agent.type === 'commander' ? "ACTIVATE: CALL TO ARMS" : "ACTIVATE: WARRIOR'S RAGE";
        btnAbility.disabled = false;
        btnAbility.style.opacity = '1.0';
        btnAbility.style.background = 'var(--primary-blue)';
      }

      // Re-bind click handler
      btnAbility.onclick = () => {
        const success = agent.activateAbility(this.game.effectManager);
        if (success) {
          // Increment quests if active
          if (this.game.questProgress) {
            // Spend Cash or place agent or ability activations aren't in daily quests directly, but standard track
          }
          this.updateSelectionPanel(agent);
        }
      };
    } else {
      btnAbility.classList.add('hidden');
    }
  }

  hideSelectionPanel() {
    this.selectionPanel.classList.add('hidden');
  }

  updateWaveButton(waveInProgress) {
    if (waveInProgress) {
      this.btnNextWave.textContent = "DEFENDING...";
      this.btnNextWave.disabled = true;
      this.btnNextWave.style.opacity = '0.5';
    } else {
      this.btnNextWave.textContent = "START WAVE";
      this.btnNextWave.disabled = false;
      this.btnNextWave.style.opacity = '1.0';
    }
  }

  updateSpeedButton(multiplier) {
    this.btnSpeed.textContent = `SPEED x${multiplier}`;
  }

  // Component 1: Update Auto Wave toggle button state
  updateAutoWaveButton(isOn) {
    if (!this.btnAutoWave) return;
    if (isOn) {
      this.btnAutoWave.textContent = 'AUTO WAVE: ON';
      this.btnAutoWave.style.background = '#27ae60';
      this.btnAutoWave.style.color = '#fff';
      this.btnAutoWave.style.opacity = '1.0';
    } else {
      this.btnAutoWave.textContent = 'AUTO WAVE: OFF';
      this.btnAutoWave.style.background = '#7f8c8d';
      this.btnAutoWave.style.color = '#fff';
      this.btnAutoWave.style.opacity = '0.85';
    }
  }

  // Component 1: Show a brief countdown toast when auto wave armed
  showAutoCountdown(seconds) {
    if (!this.btnNextWave) return;
    let remaining = seconds;
    this.btnNextWave.textContent = `NEXT WAVE IN ${remaining}s...`;
    this.btnNextWave.disabled = true;
    this.btnNextWave.style.opacity = '0.7';
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        // The wave will have been started by the game loop — no need to touch text here
      } else {
        this.btnNextWave.textContent = `NEXT WAVE IN ${remaining}s...`;
      }
    }, 1000);
  }

  showOverlay(title, subtitle) {
    this.overlayTitle.textContent = title;
    this.overlaySubtitle.textContent = subtitle;
    this.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  // Swap layouts
  showGameLayout(mapName) {
    this.lobbyView.classList.add('hidden');
    this.gameView.classList.remove('hidden');
    this.hudMapName.textContent = mapName.toUpperCase();
  }

  showLobbyLayout() {
    this.gameView.classList.add('hidden');
    this.lobbyView.classList.remove('hidden');
    // Redraw static previews when returning to lobby
    this.drawAllStaticPreviews();
    // Refresh daily quests and leaderboard
    this.renderDailyQuests();
    this.renderLeaderboard(this.game.selectedMap);
  }

  // Previews Drawing Routines
  drawAllStaticPreviews() {
    this.mapCards.forEach(card => {
      const canvas = card.querySelector('.map-preview-canvas');
      const mapId = card.getAttribute('data-map-id');
      if (canvas && mapId) {
        this.drawMapPreview(canvas, mapId);
      }
    });

    this.shopCards.forEach(card => {
      const canvas = card.querySelector('.agent-preview-canvas');
      const type = card.getAttribute('data-agent-type');
      if (canvas && type) {
        this.drawAgentPreview(canvas, type);
      }
    });
  }

  drawMapPreview(canvas, mapId) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;

    let terrainColor = '#7dcd40';
    let pathColor = '#dfc39e';
    if (mapId === 'desert') {
      terrainColor = '#f9e79f';
      pathColor = '#e5c494';
    } else if (mapId === 'tundra') {
      terrainColor = '#ebf5fb';
      pathColor = '#d4e6f1';
    }

    // Base ground
    ctx.fillStyle = terrainColor;
    ctx.fillRect(0, 0, w, h);

    // Draw winding path
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.35);
    ctx.lineTo(w * 0.4, h * 0.35);
    ctx.lineTo(w * 0.4, h * 0.7);
    ctx.lineTo(w * 0.75, h * 0.7);
    ctx.lineTo(w * 0.75, h * 0.25);
    ctx.lineTo(w, h * 0.25);
    ctx.stroke();

    ctx.strokeStyle = pathColor;
    ctx.lineWidth = 12;
    ctx.stroke();

    // Draw decor
    ctx.lineWidth = 2.5;
    if (mapId === 'grassland') {
      // Tree 1
      ctx.fillStyle = '#784212';
      ctx.fillRect(20, 48, 3, 6);
      ctx.fillStyle = '#1e8449';
      ctx.beginPath();
      ctx.moveTo(21.5, 38);
      ctx.lineTo(27, 48);
      ctx.lineTo(16, 48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tree 2
      ctx.fillStyle = '#784212';
      ctx.fillRect(95, 74, 3, 6);
      ctx.fillStyle = '#1e8449';
      ctx.beginPath();
      ctx.moveTo(96.5, 64);
      ctx.lineTo(102, 74);
      ctx.lineTo(91, 74);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (mapId === 'desert') {
      // Cactus
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(95, 38, 4, 12);
      ctx.strokeRect(95, 38, 4, 12);
      ctx.fillRect(91, 42, 4, 3);
      ctx.fillRect(91, 39, 3, 4);
      ctx.fillRect(99, 44, 4, 3);
      ctx.fillRect(101, 41, 3, 4);
    } else if (mapId === 'tundra') {
      // Snow tree
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(20, 48, 3, 6);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(21.5, 36);
      ctx.lineTo(27, 48);
      ctx.lineTo(16, 48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);

    ctx.restore();
  }

  drawAgentPreview(canvas, agentType) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    
    // Scale drawings to fit preview size
    const scale = w / 60;
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;

    // Torso Color
    let torsoColor = '#3498db';
    if (agentType === 'minigunner') torsoColor = '#e67e22';
    else if (agentType === 'commander') torsoColor = '#c0392b';
    else if (agentType === 'dj') torsoColor = '#9b59b6';
    else if (agentType === 'pyromancer') torsoColor = '#e67e22';
    else if (agentType === 'gladiator') torsoColor = '#7f8c8d';
    else if (agentType === 'soldier') torsoColor = '#27ae60';
    else if (agentType === 'farm') torsoColor = '#8d6e63';

    // Equip skin adjustments
    const equippedSkin = this.game.equippedSkins[agentType] || 'default';
    if (equippedSkin.endsWith('_Golden')) {
      torsoColor = '#f1c40f';
    } else if (equippedSkin.endsWith('_Cyber')) {
      torsoColor = '#00ffe0';
    } else if (equippedSkin.endsWith('_Hazmat')) {
      torsoColor = '#2ecc71';
    }

    // Torso block
    ctx.fillStyle = torsoColor;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeRect(-8, -8, 16, 16);

    // Special bypass for Farm preview (renders soil block directly)
    if (agentType === 'farm') {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      // Soil brown patch
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-15, -15, 30, 30);
      ctx.strokeRect(-15, -15, 30, 30);
      // Sprouts
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(-5, -6, 4, 4);
      ctx.fillRect(4, 2, 4, 4);
      // Red Silo
      ctx.fillStyle = '#e53935';
      ctx.fillRect(-11, -11, 7, 9);
      ctx.strokeRect(-11, -11, 7, 9);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-11, -14, 7, 3);
      ctx.strokeRect(-11, -14, 7, 3);
      ctx.restore();
      return;
    }

    // Torso block
    ctx.fillStyle = torsoColor;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeRect(-8, -8, 16, 16);

    // Torso Details (belt & straps)
    ctx.fillStyle = '#222';
    ctx.fillRect(-8, 5, 16, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(-6, -8, 3, 13);
    ctx.fillRect(3, -8, 3, 13);

    // Arms
    ctx.fillStyle = torsoColor;
    ctx.fillRect(4, -11, 5, 4);
    ctx.strokeRect(4, -11, 5, 4);
    ctx.fillRect(4, 7, 5, 4);
    ctx.strokeRect(4, 7, 5, 4);

    // 3D Square Head shadow layer
    ctx.fillStyle = '#cca080';
    ctx.fillRect(-5.5, -5.5, 11, 11);

    // 3D Square Head
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeRect(-5, -5, 10, 10);

    // Face details
    ctx.fillStyle = '#111';
    ctx.fillRect(2, -3, 2, 2);
    ctx.fillRect(2, 1, 2, 2);

    // Accessories & Weapons
    if (agentType === 'scout') {
      ctx.fillStyle = '#27ae60'; // Green cap
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillRect(3, -4, 5, 8); // brim
      ctx.fillStyle = '#34495e'; // pistol
      ctx.fillRect(7, 2, 10, 4);
      ctx.fillStyle = '#ff3131'; // laser
      ctx.fillRect(17, 3, 1.5, 1.5);
    } else if (agentType === 'minigunner') {
      ctx.fillStyle = '#000'; // sunglasses
      ctx.fillRect(3, -4, 2, 3);
      ctx.fillRect(3, 1, 2, 3);
      ctx.fillStyle = '#f1c40f'; // ammo belt
      ctx.fillRect(-6, -11, 4, 3);
      ctx.fillRect(-2, -12, 4, 3);
      ctx.fillStyle = '#2c3e50'; // minigun
      ctx.fillRect(6, -4, 12, 8);
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(18, -3, 12, 6);
    } else if (agentType === 'commander') {
      ctx.fillStyle = '#2c3e50'; // visor cap
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#f1c40f'; // badge
      ctx.fillRect(3, -2, 2, 4);
      ctx.fillStyle = '#fff'; // megaphone
      ctx.fillRect(7, 1, 6, 4);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(13, -1, 3, 8);
    } else if (agentType === 'dj') {
      ctx.fillStyle = '#9b59b6'; // headphones
      ctx.fillRect(-7, -9, 14, 2);
      ctx.fillRect(-8, -6, 2, 4);
      ctx.fillRect(6, -6, 2, 4);
      ctx.fillStyle = '#1e293b'; // turntable table
      ctx.fillRect(8, -14, 10, 28);
      ctx.strokeRect(8, -14, 10, 28);
    } else if (agentType === 'pyromancer') {
      ctx.fillStyle = '#34495e'; // mask visor
      ctx.fillRect(2, -4, 3, 8);
      ctx.fillStyle = '#d35400'; // backpack
      ctx.fillRect(-12, -7, 4, 14);
      ctx.fillStyle = '#7f8c8d'; // flamethrower
      ctx.fillRect(6, 1, 12, 5);
    } else if (agentType === 'gladiator') {
      ctx.fillStyle = '#bdc3c7'; // steel helmet
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#c0392b'; // Plume
      ctx.fillRect(-8, -2, 2, 4);
      ctx.fillRect(-6, -9, 12, 3);
      ctx.fillStyle = '#bdc3c7'; // sword
      ctx.fillRect(5, 1, 15, 4);
      ctx.fillStyle = '#f39c12'; // Hilt guard
      ctx.fillRect(5, -1, 2, 8);
    } else if (agentType === 'soldier') {
      ctx.fillStyle = '#27ae60'; // helmet
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillRect(3, -5, 3, 10);
      ctx.fillStyle = '#111'; // rifle
      ctx.fillRect(6, 1, 14, 4);
    }

    ctx.restore();
  }

  startUnboxingAnimation(crateType, chosenAgent, chosenRarity) {
    const overlay = document.getElementById('crate-opening-overlay');
    const canvas = document.getElementById('crate-opening-canvas');
    const revealCard = document.getElementById('crate-reveal-card');
    const revealRarity = document.getElementById('crate-reveal-rarity');
    const revealAgentCanvas = document.getElementById('crate-reveal-agent-canvas');
    const revealName = document.getElementById('crate-reveal-name');

    if (!overlay || !canvas) return;

    // Show overlay, hide card initially
    overlay.classList.remove('hidden');
    revealCard.classList.add('hidden');

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Animation timeline variables
    let startTime = null;
    let particles = [];
    let state = 'dropping'; // 'dropping', 'shaking', 'bursting', 'revealed'
    let crateY = -100;
    let crateVelocity = 0;
    const gravity = 800; // px/sec^2
    const targetY = h / 2 + 20;
    const bounceCount = 2;
    let currentBounce = 0;
    let shakeTimer = 0;
    let shakeOffset = { x: 0, y: 0 };
    let burstTriggered = false;

    // Splinters and Confetti particles helper
    function spawnConfetti(x, y, colorCode) {
      const colors = colorCode === 'legendary' ? ['#f1c40f', '#f39c12', '#fff'] :
                     colorCode === 'epic' ? ['#9b59b6', '#8e44ad', '#fff'] :
                     colorCode === 'rare' ? ['#3498db', '#2980b9', '#fff'] :
                     ['#bdc3c7', '#7f8c8d', '#fff'];
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 250;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 100, // burst upwards
          color: colors[Math.floor(Math.random() * colors.length)],
          radius: 3 + Math.random() * 6,
          life: 1.2 + Math.random() * 0.8,
          alpha: 1.0,
          rotation: Math.random() * Math.PI,
          spinSpeed: (Math.random() - 0.5) * 10
        });
      }
    }

    function spawnSplinters(x, y) {
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 150;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 50,
          color: '#8d6e63', // Wood color
          radius: 2 + Math.random() * 4,
          life: 0.8 + Math.random() * 0.5,
          alpha: 1.0,
          rotation: Math.random() * Math.PI,
          spinSpeed: (Math.random() - 0.5) * 5
        });
      }
    }

    const loop = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const dt = Math.min(0.1, (timestamp - startTime) / 1000.0);
      startTime = timestamp;

      // 1. Clear Canvas
      ctx.clearRect(0, 0, w, h);

      // 2. Physics & State machine updates
      if (state === 'dropping') {
        crateVelocity += gravity * dt;
        crateY += crateVelocity * dt;

        if (crateY >= targetY) {
          crateY = targetY;
          if (currentBounce < bounceCount) {
            crateVelocity = -crateVelocity * 0.45; // Bounce back
            if (currentBounce === 0) soundManager.playCrateDrop(); // Impact sound on first hit
            currentBounce++;
          } else {
            state = 'shaking';
            shakeTimer = 0;
          }
        }
      } else if (state === 'shaking') {
        shakeTimer += dt;
        // violent shaking 3 times in 1.5s
        if (shakeTimer < 1.5) {
          const shakeFreq = 35; // shaking speed
          const intensity = 8;
          shakeOffset.x = Math.sin(shakeTimer * shakeFreq) * intensity;
          shakeOffset.y = Math.cos(shakeTimer * shakeFreq * 0.8) * intensity;

          // Emit dust puffs / wood splinters occasionally during shaking
          if (Math.random() < 0.15) {
            spawnSplinters(w / 2 + shakeOffset.x, crateY + shakeOffset.y);
          }
        } else {
          state = 'bursting';
          shakeOffset = { x: 0, y: 0 };
        }
      } else if (state === 'bursting') {
        if (!burstTriggered) {
          burstTriggered = true;
          soundManager.playCrateReveal(); // Magical reveal chime
          spawnConfetti(w / 2, targetY, chosenRarity);
          spawnSplinters(w / 2, targetY);

          // Reveal card after confetti burst starts
          setTimeout(() => {
            state = 'revealed';
            revealCard.classList.remove('hidden');
            revealRarity.textContent = chosenRarity.toUpperCase();
            revealRarity.className = `rarity-${chosenRarity}`;
            revealName.textContent = chosenAgent.toUpperCase();
            
            // Draw agent avatar in card preview
            if (revealAgentCanvas) {
              const prevCtx = revealAgentCanvas.getContext('2d');
              prevCtx.clearRect(0, 0, revealAgentCanvas.width, revealAgentCanvas.height);
              this.drawAgentPreview(revealAgentCanvas, chosenAgent);
            }
          }, 400);
        }
      }

      // 3. Update & Draw Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 300 * dt; // gravity drag
        p.life -= dt;
        p.rotation += p.spinSpeed * dt;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.strokeRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
        ctx.restore();
      }

      // 4. Draw Roblox Voxel Crate if not burst
      if (state === 'dropping' || state === 'shaking') {
        ctx.save();
        ctx.translate(w / 2 + shakeOffset.x, crateY + shakeOffset.y);

        // Voxel Crate box
        let crateColor = '#8d6e63'; // Basic Basic brown
        let bandColor = '#784212';
        if (crateType === 'elite') {
          crateColor = '#2980b9'; // Elite blue
          bandColor = '#1f3a52';
        } else if (crateType === 'deluxe') {
          crateColor = '#9b59b6'; // Deluxe purple
          bandColor = '#f1c40f'; // golden bands
        }

        ctx.fillStyle = crateColor;
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 4;
        ctx.fillRect(-40, -40, 80, 80);
        ctx.strokeRect(-40, -40, 80, 80);

        // Heavy wrapping bands
        ctx.fillStyle = bandColor;
        ctx.fillRect(-10, -40, 20, 80);
        ctx.strokeRect(-10, -40, 20, 80);
        ctx.fillRect(-40, -10, 80, 20);
        ctx.strokeRect(-40, -10, 80, 20);

        // Voxel iron lock details
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(-8, -8, 16, 16);
        ctx.strokeRect(-8, -8, 16, 16);
        ctx.fillStyle = '#222';
        ctx.fillRect(-2, -2, 4, 8);

        ctx.restore();
      }

      // Continue frame if not in final state or particles still flying
      if (state !== 'revealed' || particles.length > 0) {
        requestAnimationFrame(loop);
      }
    };

    requestAnimationFrame(loop);
  }

  // ─── Component 4: Daily Quests Rendering ─────────────────────────────────
  renderDailyQuests() {
    const listEl = document.getElementById('quests-list');
    if (!listEl) return;

    const { questProgress, questGoals, questRewarded } = this.game;

    const quests = [
      {
        key: 'kills',
        label: '<img src="https://img.icons8.com/color/48/skull.png" class="quest-icon" /> Slay Zombies',
        current: questProgress.kills,
        goal: questGoals.kills,
        reward: 75,
        rewarded: questRewarded.kills
      },
      {
        key: 'cashSpent',
        label: '<img src="https://img.icons8.com/color/48/stack-of-money.png" class="quest-icon" /> Spend $2,000 Cash',
        current: questProgress.cashSpent,
        goal: questGoals.cashSpent,
        reward: 100,
        rewarded: questRewarded.cashSpent
      },
      {
        key: 'farmsPlaced',
        label: '<img src="https://img.icons8.com/color/48/wheat.png" class="quest-icon" /> Place 5 Farms',
        current: questProgress.farmsPlaced,
        goal: questGoals.farmsPlaced,
        reward: 50,
        rewarded: questRewarded.farmsPlaced
      }
    ];

    listEl.innerHTML = quests.map(q => {
      const pct = Math.min(100, Math.round((q.current / q.goal) * 100));
      const done = q.rewarded || q.current >= q.goal;
      const barColor = done ? '#27ae60' : '#3498db';
      return `
        <div class="quest-item" style="
          background: ${done ? 'rgba(39,174,96,0.08)' : 'rgba(52,152,219,0.06)'};
          border: 2px solid ${done ? '#27ae60' : '#3498db'};
          border-radius: 10px;
          padding: 8px 10px;
          position: relative;
          overflow: hidden;
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:900;font-size:0.82rem;">${q.label}</span>
            <span style="font-weight:800;font-size:0.78rem;color:${done ? '#27ae60' : '#f39c12'};">
              ${done ? '✅ DONE' : `${Math.min(q.current, q.goal)} / ${q.goal}`}
            </span>
          </div>
          <div style="margin-top:5px;height:7px;background:#e0e0e0;border-radius:6px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${barColor};border-radius:6px;transition:width 0.4s;"></div>
          </div>
          <div style="margin-top:4px;font-size:0.7rem;color:#7f8c8d;text-align:right;">
            Reward: <img src="https://img.icons8.com/color/48/coins.png" class="quest-icon" /> ${q.reward} Coins
          </div>
        </div>
      `;
    }).join('');
  }

  // ─── Component 5: Speedrun Leaderboard Rendering ───────────────────────
  renderLeaderboard(mapId) {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    const mapLabel = mapId === 'desert' ? 'Desert Outpost' : mapId === 'tundra' ? 'Frost Tundra' : 'Grassland';
    const records = (this.game.leaderboard && this.game.leaderboard[mapId]) || [];

    if (records.length === 0) {
      listEl.innerHTML = `<div style="color:#7f8c8d;font-size:0.82rem;">
        No records yet for <strong>${mapLabel}</strong>.<br>Complete the map to set one!
      </div>`;
      return;
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    listEl.innerHTML = `
      <div style="font-size:0.72rem;color:#7f8c8d;margin-bottom:4px;">📍 ${mapLabel}</div>
      ${records.map((entry, i) => `
        <div style="
          display:flex;justify-content:space-between;align-items:center;
          padding:5px 8px;
          border-radius:8px;
          background:${i === 0 ? 'rgba(241,196,15,0.12)' : 'transparent'};
          border-bottom:1px dashed #e0e0e0;
          font-weight:800;
          font-size:0.82rem;
        ">
          <span>${medals[i] || `#${i + 1}`} ${entry.time}</span>
          <span style="color:#95a5a6;font-size:0.7rem;">${entry.date}</span>
        </div>
      `).join('')}
    `;
  }

  // ─── Component 6: Tutorial Hint System ────────────────────────────────
  showTutorialHint(step) {
    // Remove any existing hint box first
    const existing = document.getElementById('tutorial-hint-box');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    const tutorialEl = document.createElement('div');
    tutorialEl.id = 'tutorial-hint-box';
    tutorialEl.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9000;
      background: rgba(20, 30, 50, 0.97);
      border: 2.5px solid #f1c40f;
      border-radius: 14px;
      padding: 14px 22px;
      max-width: 480px;
      width: 90vw;
      box-shadow: 0 6px 30px rgba(0,0,0,0.6);
      display: flex;
      gap: 14px;
      align-items: flex-start;
      animation: tutorialSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
      font-family: var(--font-body, 'Nunito', sans-serif);
    `;
    document.body.appendChild(tutorialEl);

    // Inject keyframe once
    if (!document.getElementById('tutorial-keyframe-style')) {
      const style = document.createElement('style');
      style.id = 'tutorial-keyframe-style';
      style.textContent = `
        @keyframes tutorialSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(30px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    const messages = [
      {
        icon: '👋',
        title: 'Welcome to Blocky TDS!',
        body: 'Open <strong>Crates</strong> in the CRATES tab to unlock Agents. Equip them in <strong>LOADOUT</strong>, pick a map, then hit <strong>DEPLOY TO MATCH</strong>!'
      },
      {
        icon: '🏗️',
        title: 'Place Your First Agent!',
        body: 'Click any <strong>green tile</strong> on the map canvas to place the selected agent from the sidebar. Avoid placing on the enemy path!'
      },
      {
        icon: '⬆️',
        title: 'Upgrade Your Agent!',
        body: 'Click a placed agent to select it, then press <strong>UPGRADE</strong> in the sidebar. Each level visually transforms your agent and boosts its stats!'
      }
    ];

    const msg = messages[step];
    if (!msg) return;

    tutorialEl.innerHTML = `
      <div style="font-size:2rem;line-height:1;flex-shrink:0;">${msg.icon}</div>
      <div style="flex:1;">
        <div style="font-weight:900;font-size:1rem;color:#f1c40f;margin-bottom:4px;">${msg.title}</div>
        <div style="font-size:0.85rem;color:#ecf0f1;line-height:1.5;">${msg.body}</div>
        <button id="btn-dismiss-tutorial" style="
          margin-top: 10px;
          background: #f1c40f;
          color: #1a1a2e;
          border: none;
          border-radius: 8px;
          font-weight: 900;
          font-size: 0.82rem;
          padding: 5px 14px;
          cursor: pointer;
          letter-spacing: 0.04em;
        ">GOT IT ✓</button>
      </div>
    `;

    const dismissBtn = document.getElementById('btn-dismiss-tutorial');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.dismissTutorial();
        // If dismissed during lobby step 0, fully mark tutorial complete
        if (!this.game.tutorialCompleted && this.game.tutorialStep === 0) {
          this.game.tutorialCompleted = true;
          this.game.saveStatsToStorage();
        }
      });
    }
  }

  dismissTutorial() {
    const tutorialEl = document.getElementById('tutorial-hint-box');
    if (tutorialEl) {
      tutorialEl.style.opacity = '0';
      tutorialEl.style.transform = 'translateX(-50%) translateY(20px)';
      tutorialEl.style.transition = 'opacity 0.3s, transform 0.3s';
      setTimeout(() => {
        if (tutorialEl.parentNode) tutorialEl.parentNode.removeChild(tutorialEl);
      }, 320);
    }
  }
}
