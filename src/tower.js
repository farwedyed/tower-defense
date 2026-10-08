// Agent (Tower) Characters Module for Blocky TDS 2D

import { Bullet, MinigunnerBullet, FlameProjectile, DJMusicWave } from './bullet.js';
import { soundManager } from './sound.js';

export class Agent {
  constructor(gridX, gridY, cellSize, stats) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.cellSize = cellSize;

    // Pixel coordinates at cell center
    this.x = gridX * cellSize + cellSize / 2;
    this.y = gridY * cellSize + cellSize / 2;

    this.range = stats.range || 120;
    this.damage = stats.damage || 10;
    this.fireRate = stats.fireRate || 1.0;
    this.cost = stats.cost || 100;
    this.level = 1;
    this.type = stats.type || 'scout';
    this.color = stats.color || '#3498db';
    this.name = stats.name || 'Agent';

    this.fireCooldown = 0;
    this.angle = 0;
    this.equippedSkin = 'default';
    this.target = null;

    // Support Buff variables
    this.djRangeBuffed = false;
    this.commanderSpeedBuffed = false;
    this.commanderAbilityActive = false;

    // Targeting strategies: 'first', 'last', 'strongest', 'weakest'
    this.targetingStrategy = 'first';

    // Recoil offset
    this.recoilOffset = 0;
    this.muzzleFlashActive = false;

    // Time accumulator for idle animations
    this.timeAccumulator = 0;
  }

  // Roblox TDS Strategy Targeting Logic
  acquireTarget(enemies) {
    const inRange = enemies.filter(enemy => {
      if (enemy.health <= 0) return false;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      return dist <= (this.range * (this.djRangeBuffed ? 1.15 : 1.0));
    });

    if (inRange.length === 0) return null;

    if (this.targetingStrategy === 'first') {
      return inRange.reduce((best, curr) => {
        const bestVal = best.targetNodeIndex * 1000 - Math.hypot(best.x - this.x, best.y - this.y);
        const currVal = curr.targetNodeIndex * 1000 - Math.hypot(curr.x - this.x, curr.y - this.y);
        return currVal > bestVal ? curr : best;
      });
    }

    if (this.targetingStrategy === 'last') {
      return inRange.reduce((best, curr) => {
        const bestVal = best.targetNodeIndex * 1000 - Math.hypot(best.x - this.x, best.y - this.y);
        const currVal = curr.targetNodeIndex * 1000 - Math.hypot(curr.x - this.x, curr.y - this.y);
        return currVal < bestVal ? curr : best;
      });
    }

    if (this.targetingStrategy === 'strongest') {
      return inRange.reduce((best, curr) => curr.health > best.health ? curr : best);
    }

    if (this.targetingStrategy === 'weakest') {
      return inRange.reduce((best, curr) => curr.health < best.health ? curr : best);
    }

    return inRange[0];
  }

  update(enemies, effectManager, bullets, dt) {
    // Accumulate time for animation
    this.timeAccumulator += dt;

    // Decrement timers
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    } else {
      this.muzzleFlashActive = false;
    }

    if (this.recoilOffset > 0) {
      this.recoilOffset -= dt * 30;
      if (this.recoilOffset < 0) this.recoilOffset = 0;
    }

    // Dynamic fire rates and range
    let speedMultiplier = this.commanderSpeedBuffed ? 1.35 : 1.0;
    if (this.commanderAbilityActive) {
      speedMultiplier *= 1.40; // extra 40% active ability boost
    }
    const currentFireRate = this.fireRate * speedMultiplier;
    const currentRange = this.range * (this.djRangeBuffed ? 1.15 : 1.0);

    // Target checks
    if (this.target) {
      const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
      if (this.target.health <= 0 || dist > currentRange) {
        this.target = null;
      }
    }

    if (!this.target && this.fireRate > 0) {
      this.target = this.acquireTarget(enemies);
    }

    // Rotation heading towards target
    if (this.target) {
      const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += diff * Math.min(1.0, dt * 10);

      // Firing triggers
      if (this.fireCooldown <= 0 && this.fireRate > 0) {
        this.fire(effectManager, bullets);
        soundManager.playShoot();
        this.fireCooldown = 1.0 / currentFireRate;
      }
    }
  }

  fire(effectManager, bullets) {
    // Overwritten by subclasses
  }

  upgrade(effectManager) {
    this.level++;
    effectManager.spawnText(this.x, this.y - 25, "LEVEL UP", '#2ecc71');
    effectManager.spawnPlacementSparks(this.x, this.y, this.cellSize);
  }

  getUpgradeCost() {
    const baseCost = Math.floor(this.cost * 0.75 * this.level);
    return Math.floor(baseCost * (this.djRangeBuffed ? 0.9 : 1.0));
  }

  getSellValue() {
    let invested = this.cost;
    for (let l = 1; l < this.level; l++) {
      invested += Math.floor(this.cost * 0.75 * l);
    }
    return Math.floor(invested * 0.65);
  }

  draw(ctx) {
    // Beveled 3D Pedestal
    ctx.save();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3.5;
    
    // Shadow layer
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.rect(this.x - this.cellSize * 0.4, this.y - this.cellSize * 0.4 + 4, this.cellSize * 0.8, this.cellSize * 0.8);
    ctx.fill();
    ctx.stroke();

    // Top face
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.rect(this.x - this.cellSize * 0.4, this.y - this.cellSize * 0.4, this.cellSize * 0.8, this.cellSize * 0.8);
    ctx.fill();
    ctx.stroke();

    // Buff borders
    if (this.djRangeBuffed) {
      ctx.strokeStyle = '#9b59b6';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(this.x - this.cellSize * 0.43, this.y - this.cellSize * 0.43, this.cellSize * 0.86, this.cellSize * 0.86);
    }
    if (this.commanderSpeedBuffed) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(this.x - this.cellSize * 0.46, this.y - this.cellSize * 0.46, this.cellSize * 0.92, this.cellSize * 0.92);
    }

    ctx.restore();
  }

  // Common blocky agent top-down rendering
  drawBlockyAgent(ctx, hairColor, accessoryCallback) {
    // Idle bobbing offset
    const bob = Math.sin(this.timeAccumulator * 8.0) * 1.2;

    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.rotate(this.angle);

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;

    // Torso block color override based on skin
    let currentTorsoColor = this.color;
    if (this.equippedSkin && this.equippedSkin !== 'default') {
      if (this.equippedSkin.endsWith('_Golden')) {
        currentTorsoColor = '#f1c40f';
      } else if (this.equippedSkin.endsWith('_Cyber')) {
        currentTorsoColor = '#00ffe0';
      } else if (this.equippedSkin.endsWith('_Hazmat')) {
        currentTorsoColor = '#2ecc71';
      }
    }

    // Torso block
    ctx.fillStyle = currentTorsoColor;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeRect(-8, -8, 16, 16);

    // Torso Details (belt & straps)
    ctx.fillStyle = '#222';
    ctx.fillRect(-8, 5, 16, 3); // Belt
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(-6, -8, 3, 13); // Tactical straps
    ctx.fillRect(3, -8, 3, 13);

    // Left Arm (facing forward/aiming)
    ctx.fillStyle = currentTorsoColor;
    ctx.fillRect(4, -11, 5, 4);
    ctx.strokeRect(4, -11, 5, 4);

    // Right Arm
    ctx.fillStyle = currentTorsoColor;
    ctx.fillRect(4, 7, 5, 4);
    ctx.strokeRect(4, 7, 5, 4);

    // 3D Square Head shadow layer
    ctx.fillStyle = '#cca080';
    ctx.fillRect(-5.5, -5.5, 11, 11);

    // 3D Square Head
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeRect(-5, -5, 10, 10);

    // Pixelated face details facing right
    ctx.fillStyle = '#111';
    ctx.fillRect(2, -3, 2, 2);
    ctx.fillRect(2, 1, 2, 2);
    ctx.fillRect(3, -1, 1, 2); // nose/mouth details

    // Draw hair
    if (hairColor) {
      ctx.fillStyle = hairColor;
      ctx.fillRect(-6, -5, 2, 10);
    }

    if (accessoryCallback) {
      accessoryCallback(ctx);
    }

    ctx.restore();
  }
}

// 1. SCOUT
export class Scout extends Agent {
  constructor(gridX, gridY, cellSize) {
    super(gridX, gridY, cellSize, {
      range: 135,
      damage: 10,
      fireRate: 1.5,
      cost: 100,
      type: 'scout',
      color: '#3498db',
      name: 'Scout'
    });
  }

  fire(effectManager, bullets) {
    this.recoilOffset = 4;
    this.muzzleFlashActive = true;
    
    const muzzleX = this.x + Math.cos(this.angle) * 18;
    const muzzleY = this.y + Math.sin(this.angle) * 18;
    effectManager.spawnMuzzleFlash(muzzleX, muzzleY, this.angle, 10);

    bullets.push(new Bullet(this.x, this.y, this.target, {
      speed: 600,
      damage: this.damage,
      color: '#f1c40f',
      radius: 3.5
    }));
  }

  upgrade(effectManager) {
    super.upgrade(effectManager);
    this.damage += 4;
    this.range += 10;
    this.fireRate += 0.25;
  }

  draw(ctx) {
    super.draw(ctx);

    this.drawBlockyAgent(ctx, '#7f8c8d', (c) => {
      if (this.level === 1) {
        // Lvl 1: Green Cap, basic pistol
        c.fillStyle = '#27ae60';
        c.fillRect(-6, -6, 12, 12);
        c.fillRect(3, -4, 5, 8); // Cap Brim

        c.fillStyle = '#34495e';
        c.fillRect(7 - this.recoilOffset, 2, 10, 4); // basic pistol
        c.fillStyle = '#111';
        c.fillRect(7 - this.recoilOffset, 4, 3, 4); // grip
      } else if (this.level === 2) {
        // Lvl 2: Camo cap, protective goggles, tactical chest plate
        c.fillStyle = '#556b2f'; // Camo cap
        c.fillRect(-6, -6, 12, 12);
        c.fillRect(3, -4, 5, 8); // Brim

        // Goggles
        c.fillStyle = '#f1c40f';
        c.fillRect(3, -4, 2, 8);
        c.fillStyle = '#111';
        c.fillRect(3, -4, 1, 8);

        // Tactical chest plate
        c.fillStyle = '#2c3e50';
        c.fillRect(-6, -6, 12, 12);

        c.fillStyle = '#34495e';
        c.fillRect(7 - this.recoilOffset, 2, 10, 4); // basic pistol
        c.fillStyle = '#111';
        c.fillRect(7 - this.recoilOffset, 4, 3, 4); // grip
      } else {
        // Lvl 3: Dual-wields gold-plated pistols, golden pilot headset
        c.fillStyle = '#f1c40f'; // Golden pilot headset band
        c.fillRect(-6, -6, 12, 12);
        c.fillRect(-7, -4, 2, 8); // Cups
        c.fillRect(5, -4, 2, 8);

        // Dual-wield golden pistols
        c.fillStyle = '#f1c40f';
        c.fillRect(7 - this.recoilOffset, -8, 10, 4); // Left pistol
        c.fillRect(7 - this.recoilOffset, 4, 10, 4); // Right pistol
        c.fillStyle = '#111';
        c.fillRect(7 - this.recoilOffset, -6, 3, 4);
        c.fillRect(7 - this.recoilOffset, 6, 3, 4);
      }
    });
  }
}

// 2. MINIGUNNER
export class Minigunner extends Agent {
  constructor(gridX, gridY, cellSize) {
    super(gridX, gridY, cellSize, {
      range: 155,
      damage: 6,
      fireRate: 9.0,
      cost: 250,
      type: 'minigunner',
      color: '#e67e22',
      name: 'Minigunner'
    });
    this.spinUpTimer = 0.5;
    this.currentSpin = 0.0;
    this.idleTimer = 0;
  }

  update(enemies, effectManager, bullets, dt) {
    this.timeAccumulator += dt;
    const speedMultiplier = this.commanderSpeedBuffed ? 1.35 : 1.0;
    const currentFireRate = this.fireRate * speedMultiplier;
    const currentRange = this.range * (this.djRangeBuffed ? 1.15 : 1.0);

    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    if (this.target && (this.target.health <= 0 || Math.hypot(this.target.x - this.x, this.target.y - this.y) > currentRange)) {
      this.target = null;
    }

    if (!this.target) {
      this.target = this.acquireTarget(enemies);
    }

    if (this.target) {
      const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += diff * Math.min(1.0, dt * 8);

      this.idleTimer = 0;
      if (this.currentSpin < 1.0) {
        this.currentSpin = Math.min(1.0, this.currentSpin + dt / this.spinUpTimer);
      } else {
        if (this.fireCooldown <= 0) {
          this.fire(effectManager, bullets);
          this.fireCooldown = 1.0 / currentFireRate;
        }
      }
    } else {
      this.idleTimer += dt;
      if (this.idleTimer >= 0.6) {
        this.currentSpin = Math.max(0.0, this.currentSpin - dt * 2);
      }
    }
  }

  fire(effectManager, bullets) {
    this.recoilOffset = 2;
    const muzzleX = this.x + Math.cos(this.angle) * 22;
    const muzzleY = this.y + Math.sin(this.angle) * 22;
    effectManager.spawnMuzzleFlash(muzzleX, muzzleY, this.angle, 8);
    bullets.push(new MinigunnerBullet(this.x, this.y, this.target, this.damage));
  }

  upgrade(effectManager) {
    super.upgrade(effectManager);
    this.damage += 2;
    this.range += 8;
    this.fireRate += 1.0;
  }

  draw(ctx) {
    super.draw(ctx);

    this.drawBlockyAgent(ctx, '#2c3e50', (c) => {
      if (this.level === 1) {
        // Sunglasses, single barrel minigun
        c.fillStyle = '#000';
        c.fillRect(3, -4, 2, 3);
        c.fillRect(3, 1, 2, 3);

        c.fillStyle = '#2c3e50';
        c.fillRect(6 - this.recoilOffset, -3, 12, 6);
        c.fillStyle = '#7f8c8d';
        c.fillRect(18 - this.recoilOffset, -2, 10, 4);
      } else if (this.level === 2) {
        // Heavy steel helmet and metallic shoulder pauldrons
        c.fillStyle = '#7f8c8d'; // Steel helmet
        c.fillRect(-6, -6, 12, 12);
        c.fillStyle = '#2c3e50'; // Pauldrons
        c.fillRect(-9, -11, 4, 3);
        c.fillRect(-9, 8, 4, 3);

        // Minigun barrels
        c.fillStyle = '#2c3e50';
        c.fillRect(6 - this.recoilOffset, -4, 12, 8);
        c.fillStyle = '#7f8c8d';
        c.fillRect(18 - this.recoilOffset, -3, 12, 6);
      } else {
        // Advanced futuristic cyber-visor, giant dual-barrel spinning minigun
        c.fillStyle = '#00ffe0'; // Cyber-visor glowing light blue
        c.fillRect(3, -4, 2, 8);

        c.fillStyle = '#7f8c8d'; // Pauldrons & Body plates
        c.fillRect(-9, -11, 4, 3);
        c.fillRect(-9, 8, 4, 3);

        // Giant dual minigun barrels (spinning look)
        const spinAngle = this.timeAccumulator * 25.0;
        c.save();
        c.translate(12 - this.recoilOffset, 0);
        
        c.fillStyle = '#2c3e50';
        c.fillRect(0, -6, 8, 12);

        // Dual barrels
        c.fillStyle = '#555';
        c.fillRect(8, -5 + Math.sin(spinAngle) * 1.5, 12, 4);
        c.fillRect(8, 1 - Math.sin(spinAngle) * 1.5, 12, 4);
        c.restore();
      }
    });
  }
}

// 3. COMMANDER
export class Commander extends Agent {
  constructor(gridX, gridY, cellSize) {
    super(gridX, gridY, cellSize, {
      range: 120,
      damage: 0,
      fireRate: 0,
      cost: 350,
      type: 'commander',
      color: '#c0392b',
      name: 'Commander'
    });
    this.calloutTimer = 6.0;
    this.buffDurationLeft = 0;

    // Active Ability properties
    this.abilityCooldown = 45;
    this.abilityDuration = 6;
    this.abilityCooldownTimer = 0; // cooldown countdown
    this.abilityActiveTimer = 0;   // active countdown
    this.isAbilityActive = false;
  }

  activateAbility(effectManager) {
    if (this.abilityCooldownTimer > 0 || this.isAbilityActive) return false;
    this.isAbilityActive = true;
    this.abilityActiveTimer = this.abilityDuration;
    this.abilityCooldownTimer = this.abilityCooldown;
    effectManager.spawnText(this.x, this.y - 30, "CALL TO ARMS!", '#f1c40f');
    effectManager.spawnPlacementSparks(this.x, this.y, this.cellSize * 1.5);
    return true;
  }

  update(enemies, effectManager, bullets, dt) {
    this.timeAccumulator += dt;
    if (this.buffDurationLeft > 0) {
      this.buffDurationLeft -= dt;
    }

    this.calloutTimer -= dt;
    if (this.calloutTimer <= 0) {
      this.calloutTimer = 8.0;
      this.buffDurationLeft = 3.5;
      effectManager.spawnText(this.x, this.y - 20, "CALL TO ARMS!", '#f1c40f');
      effectManager.spawnPlacementSparks(this.x, this.y, this.cellSize);
    }

    // Update Ability timers
    if (this.isAbilityActive) {
      this.abilityActiveTimer -= dt;
      if (this.abilityActiveTimer <= 0) {
        this.isAbilityActive = false;
      }
      // Ability active effect sparks
      if (Math.random() < 0.15) {
        effectManager.spawnImpact(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, '#f1c40f', 2, 0.4);
      }
    }
    if (this.abilityCooldownTimer > 0) {
      this.abilityCooldownTimer -= dt;
    }
  }

  upgrade(effectManager) {
    super.upgrade(effectManager);
    this.range += 15;
    this.calloutTimer = Math.max(5.0, this.calloutTimer - 0.5);
  }

  draw(ctx) {
    super.draw(ctx);

    this.drawBlockyAgent(ctx, '#5c3a21', (c) => {
      if (this.level === 1) {
        // Officer cap, white megaphone
        c.fillStyle = '#2c3e50'; // Cap
        c.fillRect(-6, -6, 12, 12);
        c.fillStyle = '#111'; // brim
        c.fillRect(4, -5, 2, 10);

        c.fillStyle = '#f5f5f5'; // white megaphone
        c.fillRect(7, 1, 6, 4);
        c.fillStyle = '#e74c3c';
        c.fillRect(13, -1, 3, 8);
      } else if (this.level === 2) {
        // Camo officer uniform and body armor plates
        c.fillStyle = '#145a32'; // Camo cap/helmet
        c.fillRect(-6, -6, 12, 12);
        c.fillStyle = '#111';
        c.fillRect(4, -5, 2, 10);

        c.fillStyle = '#27ae60'; // Body armor
        c.fillRect(-6, -6, 12, 12);

        c.fillStyle = '#f5f5f5'; // megaphone
        c.fillRect(7, 1, 6, 4);
        c.fillStyle = '#e74c3c';
        c.fillRect(13, -1, 3, 8);
      } else {
        // Golden dress uniform with medals, megaphone with glowing neon decals
        c.fillStyle = '#f1c40f'; // Golden cap
        c.fillRect(-6, -6, 12, 12);
        c.fillStyle = '#111';
        c.fillRect(4, -5, 2, 10);

        c.fillStyle = '#d4ac0d'; // Gold uniform
        c.fillRect(-6, -6, 12, 12);
        c.fillStyle = '#ff3131'; // Medals red dot
        c.fillRect(-4, -2, 2, 2);
        c.fillStyle = '#00ffe0'; // Medals cyan dot
        c.fillRect(-4, 1, 2, 2);

        // Megaphone with neon glowing decals
        c.fillStyle = '#111';
        c.fillRect(7, 1, 6, 4);
        c.fillStyle = '#00ffe0'; // Cyan neon decal megaphone tip
        c.fillRect(13, -1, 3, 8);
        c.fillRect(10, 2, 2, 2);
      }
    });

    if (this.buffDurationLeft > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(241, 196, 15, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// 4. DJ UNIT
export class DJUnit extends Agent {
  constructor(gridX, gridY, cellSize) {
    super(gridX, gridY, cellSize, {
      range: 140,
      damage: 0,
      fireRate: 0,
      cost: 400,
      type: 'dj',
      color: '#9b59b6',
      name: 'DJ Unit'
    });
    this.noteSpawnTimer = 0;
  }

  update(enemies, effectManager, bullets, dt) {
    this.timeAccumulator += dt;
    this.noteSpawnTimer += dt;
    if (this.noteSpawnTimer >= 0.8) {
      this.noteSpawnTimer = 0;
      effectManager.spawnMusicNote(this.x, this.y);
      bullets.push(new DJMusicWave(this.x, this.y, this.range));
    }
  }

  upgrade(effectManager) {
    super.upgrade(effectManager);
    this.range += 15;
  }

  draw(ctx) {
    // Level 3 extra: draws subwoofers around pedestal
    if (this.level >= 3) {
      ctx.save();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      // Pulse size based on beat
      const pulse = Math.abs(Math.sin(this.timeAccumulator * 8.0)) * 4;

      // Left Speaker
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(this.x - 24, this.y - 8, 8, 16);
      ctx.strokeRect(this.x - 24, this.y - 8, 8, 16);
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(this.x - 20, this.y - 4, 3 + pulse * 0.3, 0, Math.PI*2);
      ctx.arc(this.x - 20, this.y + 4, 3 + pulse * 0.3, 0, Math.PI*2);
      ctx.fill();

      // Right Speaker
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(this.x + 16, this.y - 8, 8, 16);
      ctx.strokeRect(this.x + 16, this.y - 8, 8, 16);
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(this.x + 20, this.y - 4, 3 + pulse * 0.3, 0, Math.PI*2);
      ctx.arc(this.x + 20, this.y + 4, 3 + pulse * 0.3, 0, Math.PI*2);
      ctx.fill();

      // Pulse wave circle on beat
      ctx.strokeStyle = 'rgba(155, 89, 182, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.range * 0.4 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    super.draw(ctx);

    this.drawBlockyAgent(ctx, '#111', (c) => {
      if (this.level === 1) {
        // Purple headphones, plain black soundboard
        c.fillStyle = '#9b59b6';
        c.fillRect(-7, -9, 14, 2);
        c.fillRect(-8, -6, 2, 4);
        c.fillRect(6, -6, 2, 4);

        // Soundboard
        c.fillStyle = '#111';
        c.fillRect(8, -10, 8, 20);
        c.strokeRect(8, -10, 8, 20);
      } else if (this.level === 2) {
        // Bright LED glowing headphones, neon-streaked mixing deck
        c.fillStyle = '#00ffe0'; // LED headphones
        c.fillRect(-7, -9, 14, 2);
        c.fillRect(-8, -6, 2, 4);
        c.fillRect(6, -6, 2, 4);

        // Mixing deck
        c.fillStyle = '#1e293b';
        c.fillRect(8, -14, 10, 28);
        c.strokeRect(8, -14, 10, 28);
        c.fillStyle = '#e74c3c';
        c.fillRect(11, -6, 2, 2);
        c.fillStyle = '#2ecc71';
        c.fillRect(11, 4, 2, 2);
      } else {
        // Spawns massive subwoofers (already drawn above) beside his deck, LED headphones
        c.fillStyle = '#ff00aa'; // Magenta headphones
        c.fillRect(-7, -9, 14, 2);
        c.fillRect(-8, -6, 2, 4);
        c.fillRect(6, -6, 2, 4);

        // Mixing deck with records spinning
        c.fillStyle = '#1e293b';
        c.fillRect(8, -14, 10, 28);
        c.strokeRect(8, -14, 10, 28);

        // Turntables
        c.fillStyle = '#111';
        c.beginPath();
        c.arc(13, -7, 4, 0, Math.PI * 2);
        c.arc(13, 7, 4, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ff00aa';
        c.fillRect(12, -8, 2, 2);
        c.fillRect(12, 6, 2, 2);
      }
    });
  }
}

// 5. PYROMANCER
export class Pyromancer extends Agent {
  constructor(gridX, gridY, cellSize) {
    super(gridX, gridY, cellSize, {
      range: 105,
      damage: 5,
      fireRate: 4.5,
      cost: 300,
      type: 'pyromancer',
      color: '#e67e22',
      name: 'Pyromancer'
    });
  }

  fire(effectManager, bullets) {
    this.recoilOffset = 2;
    const burnDps = 15 + this.level * 4;
    // Spray dual flames if level 3
    if (this.level >= 3) {
      bullets.push(new FlameProjectile(
        this.x, this.y, this.angle - 0.15, 
        this.damage, burnDps, 
        250, this.range
      ));
      bullets.push(new FlameProjectile(
        this.x, this.y, this.angle + 0.15, 
        this.damage, burnDps, 
        250, this.range
      ));
    } else {
      bullets.push(new FlameProjectile(
        this.x, this.y, this.angle, 
        this.damage, burnDps, 
        250, this.range
      ));
    }
  }

  upgrade(effectManager) {
    super.upgrade(effectManager);
    this.damage += 3;
    this.range += 8;
    this.fireRate += 0.5;
  }

  draw(ctx) {
    super.draw(ctx);

    this.drawBlockyAgent(ctx, '#d35400', (c) => {
      if (this.level === 1) {
        // Orange suit, dark visor
        c.fillStyle = '#34495e';
        c.fillRect(2, -4, 3, 8);
        c.fillStyle = '#e67e22';
        c.fillRect(-6, -6, 11, 12);

        // Gas tank strapped to back
        c.fillStyle = '#d35400';
        c.fillRect(-12, -7, 4, 14);
        c.strokeRect(-12, -7, 4, 14);

        // Flamethrower
        c.fillStyle = '#7f8c8d';
        c.fillRect(6 - this.recoilOffset, 1, 12, 5);
      } else if (this.level === 2) {
        // Reinforced heavy metal gas mask with filter canisters
        c.fillStyle = '#2c3e50'; // Helmet visor
        c.fillRect(2, -5, 3, 10);
        c.fillStyle = '#bdc3c7'; // Canister filter on mask sides
        c.fillRect(1, -7, 3, 3);
        c.fillRect(1, 4, 3, 3);

        c.fillStyle = '#d35400';
        c.fillRect(-12, -7, 4, 14);
        c.strokeRect(-12, -7, 4, 14);

        c.fillStyle = '#7f8c8d';
        c.fillRect(6 - this.recoilOffset, 1, 12, 5);
      } else {
        // Radiant magma suit, holding dual heavy flamethrowers spraying wider flames
        c.fillStyle = '#ff3c00'; // Magma suit glow visor
        c.fillRect(2, -5, 3, 10);

        c.fillStyle = '#111'; // Dark armor
        c.fillRect(-6, -6, 12, 12);

        // Magma backpacks
        c.fillStyle = '#e67e22';
        c.fillRect(-12, -10, 4, 8);
        c.fillRect(-12, 2, 4, 8);

        // Dual heavy flamethrowers
        c.fillStyle = '#7f8c8d';
        c.fillRect(6 - this.recoilOffset, -7, 12, 4);
        c.fillRect(6 - this.recoilOffset, 3, 12, 4);
        c.fillStyle = '#e67e22';
        c.fillRect(18 - this.recoilOffset, -8, 2, 6);
        c.fillRect(18 - this.recoilOffset, 2, 2, 6);
      }
    });
  }
}

// 6. FARM (Generates Wave End Revenue)
export class Farm extends Agent {
  constructor(gridX, gridY, cellSize) {
    super(gridX, gridY, cellSize, {
      range: 0,
      damage: 0,
      fireRate: 0, // Does not attack
      cost: 250,
      type: 'farm',
      color: '#8d6e63',
      name: 'Farm'
    });
  }

  getHarvestIncome() {
    return 50 + this.level * 40;
  }

  draw(ctx) {
    super.draw(ctx);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;

    if (this.level === 1) {
      // Dirt patch with small crop sprouts
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeRect(-12, -12, 24, 24);

      // sprouts
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(-6, -6, 3, 3);
      ctx.fillRect(4, 3, 3, 3);
    } else if (this.level === 2) {
      // Fully matured tall corn crops with a wooden fence
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeRect(-12, -12, 24, 24);

      // Wooden fence borders
      ctx.strokeStyle = '#784212';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-14, -14, 28, 28);

      // Corn crops
      ctx.fillStyle = '#f1c40f'; // yellow corn
      ctx.fillRect(-5, -6, 4, 5);
      ctx.fillRect(3, 2, 4, 5);
      ctx.fillStyle = '#27ae60'; // green husk
      ctx.fillRect(-6, -4, 1, 3);
      ctx.fillRect(2, 4, 1, 3);
    } else {
      // Golden grain crops with a fully built barn house and a spinning windmill
      ctx.fillStyle = '#d4ac0d'; // Golden ground
      ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeRect(-14, -14, 28, 28);

      // Tiny Red Barn house
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-10, -10, 8, 12);
      ctx.strokeRect(-10, -10, 8, 12);
      ctx.fillStyle = '#f5f5f5'; // Roof
      ctx.fillRect(-11, -12, 10, 3);

      // Spinning Windmill
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(4, -8, 6, 16);
      ctx.strokeRect(4, -8, 6, 16);

      const rotateSpeed = this.timeAccumulator * 4.0;
      ctx.save();
      ctx.translate(7, -8);
      ctx.rotate(rotateSpeed);
      ctx.strokeStyle = '#bdc3c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 10);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}

// 7. GLADIATOR (Melee attacker)
export class Gladiator extends Agent {
  constructor(gridX, gridY, cellSize) {
    super(gridX, gridY, cellSize, {
      range: 65,
      damage: 25,
      fireRate: 1.25,
      cost: 200,
      type: 'gladiator',
      color: '#7f8c8d',
      name: 'Gladiator'
    });

    // Active Ability properties
    this.abilityCooldown = 45;
    this.abilityDuration = 6;
    this.abilityCooldownTimer = 0; // cooldown countdown
    this.abilityActiveTimer = 0;   // active countdown
    this.isAbilityActive = false;
  }

  activateAbility(effectManager) {
    if (this.abilityCooldownTimer > 0 || this.isAbilityActive) return false;
    this.isAbilityActive = true;
    this.abilityActiveTimer = this.abilityDuration;
    this.abilityCooldownTimer = this.abilityCooldown;
    effectManager.spawnText(this.x, this.y - 30, "WARRIOR'S RAGE!", '#e74c3c');
    effectManager.spawnPlacementSparks(this.x, this.y, this.cellSize * 1.5);
    return true;
  }

  update(enemies, effectManager, bullets, dt) {
    this.timeAccumulator += dt;

    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    } else {
      this.muzzleFlashActive = false;
    }

    if (this.recoilOffset > 0) {
      this.recoilOffset -= dt * 30;
      if (this.recoilOffset < 0) this.recoilOffset = 0;
    }

    // Active Ability modifies fireRate/damage dynamically
    const abilitySpeedMult = this.isAbilityActive ? 1.5 : 1.0;
    const speedMultiplier = (this.commanderSpeedBuffed ? 1.35 : 1.0) * abilitySpeedMult;
    const currentFireRate = this.fireRate * speedMultiplier;
    const currentRange = this.range * (this.djRangeBuffed ? 1.15 : 1.0);

    // Target checks
    if (this.target) {
      const dist = Math.hypot(this.target.x - this.x, this.target.y - this.y);
      if (this.target.health <= 0 || dist > currentRange) {
        this.target = null;
      }
    }

    if (!this.target && this.fireRate > 0) {
      this.target = this.acquireTarget(enemies);
    }

    if (this.target) {
      const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += diff * Math.min(1.0, dt * 10);

      if (this.fireCooldown <= 0 && this.fireRate > 0) {
        this.fire(effectManager, bullets);
        this.fireCooldown = 1.0 / currentFireRate;
      }
    }

    // Update Ability timers
    if (this.isAbilityActive) {
      this.abilityActiveTimer -= dt;
      if (this.abilityActiveTimer <= 0) {
        this.isAbilityActive = false;
      }
      // Red trail particles
      if (Math.random() < 0.25) {
        effectManager.spawnImpact(this.x + (Math.random() - 0.5) * 16, this.y + (Math.random() - 0.5) * 16, '#e74c3c', 2, 0.4);
      }
    }
    if (this.abilityCooldownTimer > 0) {
      this.abilityCooldownTimer -= dt;
    }
  }

  fire(effectManager, bullets) {
    this.recoilOffset = 5;
    
    // Active Ability increases damage by 50%
    const dmg = this.isAbilityActive ? this.damage * 1.5 : this.damage;
    
    // Melee swing deals instant damage to target
    if (this.target && this.target.health > 0) {
      this.target.takeDamage(dmg, 'physical', effectManager);
      if (this.level >= 3 || this.isAbilityActive) {
        // Apply tiny fire particles if glowing flames sword
        effectManager.spawnImpact(this.target.x, this.target.y, '#e67e22', 3, 0.4);
      }
    }
    
    // Spawn broadsword sweep arc
    effectManager.spawnSwingArc(this.x, this.y, this.angle, this.range);
  }

  upgrade(effectManager) {
    super.upgrade(effectManager);
    this.damage += 8;
    this.range += 5;
    this.fireRate += 0.15;
  }

  draw(ctx) {
    super.draw(ctx);

    this.drawBlockyAgent(ctx, '#7f8c8d', (c) => {
      if (this.level === 1) {
        // Bronze centurion helmet, wooden training shield
        c.fillStyle = '#d35400'; // Bronze helmet
        c.fillRect(-6, -6, 12, 12);
        c.fillStyle = '#c0392b'; // Crest Plume
        c.fillRect(-8, -2, 2, 4);

        // Wooden shield
        c.fillStyle = '#8d6e63';
        c.fillRect(4, 8, 4, 8);
        c.strokeRect(4, 8, 4, 8);

        // Wooden sword
        c.fillStyle = '#8d6e63';
        c.fillRect(5 - this.recoilOffset, 1, 10, 3);
      } else if (this.level === 2) {
        // High-polished steel breastplate and a massive steel shield
        c.fillStyle = '#bdc3c7'; // Steel helmet
        c.fillRect(-6, -6, 12, 12);
        c.fillStyle = '#c0392b'; // Crest plume
        c.fillRect(-8, -2, 2, 4);
        c.fillRect(-6, -9, 12, 3);

        c.fillStyle = '#ecf0f1'; // Breastplate torso override
        c.fillRect(-8, -8, 16, 16);
        c.strokeRect(-8, -8, 16, 16);

        // Massive steel shield
        c.fillStyle = '#bdc3c7';
        c.fillRect(3, 8, 5, 11);
        c.strokeRect(3, 8, 5, 11);
        c.fillStyle = '#c0392b'; // Red cross
        c.fillRect(5, 8, 1, 11);
        c.fillRect(3, 13, 5, 1);

        // Steel sword
        c.fillStyle = '#bdc3c7';
        c.fillRect(5 - this.recoilOffset, 1, 15, 4);
        c.fillStyle = '#f39c12';
        c.fillRect(5 - this.recoilOffset, -1, 2, 8);
      } else {
        // Golden armor with glowing visual flames engulfing his sword
        c.fillStyle = '#f1c40f'; // Golden helmet
        c.fillRect(-6, -6, 12, 12);
        c.fillStyle = '#ff0055'; // Pink/red crest
        c.fillRect(-8, -2, 2, 4);
        c.fillRect(-6, -9, 12, 3);

        c.fillStyle = '#f39c12'; // Golden armor torso
        c.fillRect(-8, -8, 16, 16);
        c.strokeRect(-8, -8, 16, 16);

        // Golden Shield
        c.fillStyle = '#f1c40f';
        c.fillRect(3, 8, 5, 11);
        c.strokeRect(3, 8, 5, 11);

        // Flame glowing sword (drawn with orange-red accents)
        c.fillStyle = '#e67e22'; // Orange blade center
        c.fillRect(5 - this.recoilOffset, 1, 17, 4);
        c.fillStyle = '#ff3131'; // Fire outline
        c.fillRect(8 - this.recoilOffset, -1, 14, 1);
        c.fillRect(8 - this.recoilOffset, 5, 14, 1);
      }
    });
  }
}

// 8. SOLDIER (Burst rifle unit)
export class Soldier extends Agent {
  constructor(gridX, gridY, cellSize) {
    super(gridX, gridY, cellSize, {
      range: 125,
      damage: 8,
      fireRate: 3.2,
      cost: 150,
      type: 'soldier',
      color: '#27ae60',
      name: 'Soldier'
    });
    this.burstCount = 0;
  }

  fire(effectManager, bullets) {
    this.muzzleFlashActive = true;
    this.recoilOffset = 3;

    const muzzleX = this.x + Math.cos(this.angle) * 18;
    const muzzleY = this.y + Math.sin(this.angle) * 18;
    effectManager.spawnMuzzleFlash(muzzleX, muzzleY, this.angle, 9);

    bullets.push(new Bullet(this.x, this.y, this.target, {
      speed: 620,
      damage: this.damage,
      color: '#f39c12',
      radius: 3
    }));

    // Handle 3-round burst
    this.burstCount++;
    if (this.burstCount >= 3) {
      this.burstCount = 0;
      this.fireCooldown = 0.8; // 0.8s reload duration
    } else {
      this.fireCooldown = 0.12; // 120ms between burst bullets
    }
  }

  upgrade(effectManager) {
    super.upgrade(effectManager);
    this.damage += 3;
    this.range += 10;
  }

  draw(ctx) {
    super.draw(ctx);

    // Level 3 laser sight line
    if (this.level >= 3 && this.target && this.target.health > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 49, 49, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.target.x, this.target.y);
      ctx.stroke();
      ctx.restore();
    }

    this.drawBlockyAgent(ctx, '#27ae60', (c) => {
      if (this.level === 1) {
        // Camo helmet, standard rifle
        c.fillStyle = '#27ae60';
        c.fillRect(-6, -6, 12, 12);
        c.fillRect(3, -5, 3, 10); // visor

        // standard rifle
        c.fillStyle = '#111';
        c.fillRect(6 - this.recoilOffset, 1, 14, 4);
      } else if (this.level === 2) {
        // Camo vest, advanced goggles, tactical backpack
        c.fillStyle = '#27ae60'; // helmet
        c.fillRect(-6, -6, 12, 12);
        
        // Goggles
        c.fillStyle = '#00ffe0';
        c.fillRect(3, -4, 2, 8);

        // Tactical backpack
        c.fillStyle = '#1e293b';
        c.fillRect(-12, -6, 4, 12);

        // Camo vest straps
        c.fillStyle = '#556b2f';
        c.fillRect(-8, -8, 3, 3);
        c.fillRect(-8, 5, 3, 3);

        c.fillStyle = '#111';
        c.fillRect(6 - this.recoilOffset, 1, 14, 4);
      } else {
        // Futuristic laser-rifle
        c.fillStyle = '#34495e'; // Heavy combat helmet
        c.fillRect(-6, -6, 12, 12);
        c.fillStyle = '#ff3131'; // Red glowing visor strip
        c.fillRect(3, -4, 2, 8);

        c.fillStyle = '#1e293b'; // backpack
        c.fillRect(-12, -6, 4, 12);

        // Laser rifle
        c.fillStyle = '#111';
        c.fillRect(6 - this.recoilOffset, 1, 15, 4);
        c.fillStyle = '#ff3131'; // glowing red battery / laser module on top
        c.fillRect(9 - this.recoilOffset, -1, 4, 2);
      }
    });
  }
}
