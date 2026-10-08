// Enemy Roblox Zombie Module for Blocky TDS 2D

export class Enemy {
  constructor(x, y, stats) {
    this.x = x;
    this.y = y;
    this.maxHealth = stats.maxHealth;
    this.health = stats.maxHealth;
    this.baseSpeed = stats.speed;
    this.speed = stats.speed;
    this.goldReward = stats.goldReward;
    this.radius = stats.radius || 12;
    this.color = stats.color || '#fff';
    this.name = stats.name || 'Zombie';

    // Path movement tracking
    this.targetNodeIndex = 1;

    // Visual timers
    this.hitFlashTimer = 0; // if > 0, draw bright red outline/silhouette
    
    // Status effects
    this.slowDuration = 0;
    this.slowFactor = 1.0;
    
    // Pyromancer burning DoT status
    this.burnDuration = 0;
    this.burnDamagePerSecond = 0;
    this.burnTimer = 0;

    // Boss attributes
    this.isFireImmune = stats.isFireImmune || false;
  }

  update(pixelPath, effectManager, dt, allEnemies, towers) {
    // 1. Update Slow status effect
    if (this.slowDuration > 0) {
      this.slowDuration -= dt;
      this.speed = this.baseSpeed * this.slowFactor;
      if (this.slowDuration <= 0) {
        this.slowFactor = 1.0;
        this.speed = this.baseSpeed;
      }
    } else {
      this.speed = this.baseSpeed;
    }

    // 2. Update Burning DoT status effect
    if (this.burnDuration > 0) {
      this.burnDuration -= dt;
      this.health -= this.burnDamagePerSecond * dt;
      
      // Spawn tiny flame sparks periodically
      this.burnTimer += dt;
      if (this.burnTimer >= 0.1) {
        this.burnTimer = 0;
        effectManager.spawnImpact(this.x + (Math.random() - 0.5) * 12, this.y + (Math.random() - 0.5) * 12, '#ff6700', 1, 0.4);
      }

      // Check death from burn
      if (this.health <= 0) {
        this.health = 0;
      }
    }

    // 3. Movement along path nodes
    if (this.health > 0 && this.targetNodeIndex < pixelPath.length) {
      const target = pixelPath[this.targetNodeIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      const moveDist = this.speed * dt;

      if (dist <= moveDist) {
        this.x = target.x;
        this.y = target.y;
        this.targetNodeIndex++;
      } else {
        this.x += (dx / dist) * moveDist;
        this.y += (dy / dist) * moveDist;
      }
    }

    // Update hit flash timer
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }
  }

  applySlow(factor, duration) {
    if (factor < this.slowFactor || (factor === this.slowFactor && duration > this.slowDuration)) {
      this.slowFactor = factor;
      this.slowDuration = duration;
    }
  }

  applyBurn(damagePerSecond, duration) {
    if (this.isFireImmune) return;
    // Apply burning DoT
    if (damagePerSecond >= this.burnDamagePerSecond || duration > this.burnDuration) {
      this.burnDamagePerSecond = damagePerSecond;
      this.burnDuration = duration;
    }
  }

  takeDamage(amount, damageType, effectManager) {
    this.health -= amount;
    this.hitFlashTimer = 0.08; // Flash red for 1 frame

    if (this.health <= 0) {
      this.health = 0;
      return true; // Dead
    }
    return false; // Alive
  }

  draw(ctx) {
    if (this.health <= 0) return;

    ctx.save();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3.5;

    // Red hit flash filter overlay or standard blocky shapes
    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#ff3131';
      ctx.strokeStyle = '#222';
      this.drawBlockyZombieBody(ctx);
    } else {
      this.drawBlockyZombieBody(ctx);
    }

    // Draw status effect ring indicators on ground
    if (this.slowDuration > 0) {
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + this.radius, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.burnDuration > 0) {
      ctx.strokeStyle = 'rgba(255, 100, 0, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + this.radius, this.radius + 2, (this.radius + 2) * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Health Bar
    const barW = this.radius * 2.2;
    const barH = 5;
    const barX = this.x - barW / 2;
    const barY = this.y - this.radius - 12;

    ctx.fillStyle = '#222';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    const healthPercent = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.2 ? '#f1c40f' : '#e74c3c';
    ctx.fillRect(barX, barY, barW * healthPercent, barH);

    ctx.restore();
  }

  // Draw flat vector Roblox style zombie
  drawBlockyZombieBody(ctx) {
    const r = this.radius;

    // Left Arm (raised forward in zombie style)
    ctx.fillStyle = '#2ecc71'; // Green skin
    ctx.fillRect(this.x - r - 6, this.y - 4, 8, 5);
    ctx.strokeRect(this.x - r - 6, this.y - 4, 8, 5);

    // Right Arm (raised forward)
    ctx.fillRect(this.x + r - 2, this.y - 4, 8, 5);
    ctx.strokeRect(this.x + r - 2, this.y - 4, 8, 5);

    // Blocky Torso (Shirt)
    ctx.fillStyle = this.color === '#ff3131' ? '#31859c' : '#8e44ad'; // Custom boss vs basic shirts
    ctx.fillRect(this.x - r, this.y - 6, r * 2, r * 1.5);
    ctx.strokeRect(this.x - r, this.y - 6, r * 2, r * 1.5);

    // Square Head
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(this.x - r * 0.6, this.y - r * 1.5, r * 1.2, r * 1.0);
    ctx.strokeRect(this.x - r * 0.6, this.y - r * 1.5, r * 1.2, r * 1.0);

    // Simple blocky facial details
    ctx.fillStyle = '#111';
    ctx.fillRect(this.x - r * 0.4, this.y - r * 1.2, 2, 2);
    ctx.fillRect(this.x + r * 0.2, this.y - r * 1.2, 2, 2);
  }
}

// 1. Basic Zombie
export class Runner extends Enemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 50,
      speed: 65,
      goldReward: 12,
      radius: 10,
      color: '#8e44ad', // Purple shirt
      name: 'Zombie'
    });
  }
}

// 2. Fast Zombie
export class Shifter extends Enemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 35,
      speed: 125,
      goldReward: 10,
      radius: 9,
      color: '#e74c3c', // Red shirt
      name: 'Fast Zombie'
    });
  }

  // Draw faster, slightly smaller legs or caps
  drawBlockyZombieBody(ctx) {
    super.drawBlockyZombieBody(ctx);
    // Draw red bandanna
    ctx.save();
    ctx.fillStyle = '#e74c3c';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.fillRect(this.x - this.radius * 0.7, this.y - this.radius * 1.6, this.radius * 1.4, 3);
    ctx.strokeRect(this.x - this.radius * 0.7, this.y - this.radius * 1.6, this.radius * 1.4, 3);
    ctx.restore();
  }
}

// 3. Toxic Mutant (High health, green glow, slower)
export class Goliath extends Enemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 380,
      speed: 40,
      goldReward: 35,
      radius: 17,
      color: '#27ae60', // Hazmat suit style
      name: 'Toxic Mutant'
    });
  }

  drawBlockyZombieBody(ctx) {
    const r = this.radius;

    // Heavy blocky body
    ctx.fillStyle = '#f1c40f'; // Yellow hazmat suit
    ctx.fillRect(this.x - r, this.y - 8, r * 2, r * 1.6);
    ctx.strokeRect(this.x - r, this.y - 8, r * 2, r * 1.6);

    // Dark green mutant arms
    ctx.fillStyle = '#145a32';
    ctx.fillRect(this.x - r - 8, this.y - 6, 10, 8);
    ctx.strokeRect(this.x - r - 8, this.y - 6, 10, 8);
    ctx.fillRect(this.x + r - 2, this.y - 6, 10, 8);
    ctx.strokeRect(this.x + r - 2, this.y - 6, 10, 8);

    // Square Hazmat helmet
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(this.x - r * 0.7, this.y - r * 1.5, r * 1.4, r * 1.1);
    ctx.strokeRect(this.x - r * 0.7, this.y - r * 1.5, r * 1.4, r * 1.1);

    // Black faceplate glass window
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(this.x - r * 0.4, this.y - r * 1.2, r * 0.8, r * 0.4);
    ctx.strokeRect(this.x - r * 0.4, this.y - r * 1.2, r * 0.8, r * 0.4);
  }
}

// 4. Boss Zombie (Giant size, golden crown, slow movement)
export class BossZombie extends Enemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 1100,
      speed: 28,
      goldReward: 120,
      radius: 24,
      color: '#ff3131',
      name: 'Boss Zombie'
    });
  }

  drawBlockyZombieBody(ctx) {
    const r = this.radius;

    // Left Arm (giant)
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(this.x - r - 10, this.y - 6, 12, 10);
    ctx.strokeRect(this.x - r - 10, this.y - 6, 12, 10);

    // Right Arm (giant)
    ctx.fillRect(this.x + r - 2, this.y - 6, 12, 10);
    ctx.strokeRect(this.x + r - 2, this.y - 6, 12, 10);

    // Royal Purple Torso
    ctx.fillStyle = '#4a235a';
    ctx.fillRect(this.x - r, this.y - 8, r * 2, r * 1.7);
    ctx.strokeRect(this.x - r, this.y - 8, r * 2, r * 1.7);

    // Giant head
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(this.x - r * 0.6, this.y - r * 1.4, r * 1.2, r * 1.0);
    ctx.strokeRect(this.x - r * 0.6, this.y - r * 1.4, r * 1.2, r * 1.0);

    // Crown on head
    ctx.fillStyle = '#f1c40f'; // Golden
    ctx.beginPath();
    ctx.moveTo(this.x - r * 0.5, this.y - r * 1.4);
    ctx.lineTo(this.x - r * 0.5, this.y - r * 1.8);
    ctx.lineTo(this.x - r * 0.25, this.y - r * 1.6);
    ctx.lineTo(this.x, this.y - r * 1.9); // Middle point
    ctx.lineTo(this.x + r * 0.25, this.y - r * 1.6);
    ctx.lineTo(this.x + r * 0.5, this.y - r * 1.8);
    ctx.lineTo(this.x + r * 0.5, this.y - r * 1.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red eyes
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(this.x - r * 0.3, this.y - r * 1.1, 4, 4);
    ctx.fillRect(this.x + r * 0.1, this.y - r * 1.1, 4, 4);
  }
}

// 5. Grave Digger (Wave 5 Boss)
export class GraveDigger extends Enemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 1500,
      speed: 35,
      goldReward: 150,
      radius: 26,
      color: '#34495e',
      name: 'Grave Digger'
    });
    this.spawnerTimer = 0;
  }

  update(pixelPath, effectManager, dt, allEnemies, towers) {
    super.update(pixelPath, effectManager, dt, allEnemies, towers);
    
    // Spawn 2 runners every 5 seconds
    this.spawnerTimer += dt;
    if (this.spawnerTimer >= 5.0 && this.health > 0) {
      this.spawnerTimer = 0;
      allEnemies.push(new Runner(this.x - 10, this.y));
      allEnemies.push(new Runner(this.x + 10, this.y));
      effectManager.spawnText(this.x, this.y - 20, "SUMMON!", '#bdc3c7');
    }
  }

  drawBlockyZombieBody(ctx) {
    const r = this.radius;
    // Dark brown/grey suit
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(this.x - r, this.y - 8, r * 2, r * 1.6);
    ctx.strokeRect(this.x - r, this.y - 8, r * 2, r * 1.6);

    // Giant spade shovel weapon
    ctx.fillStyle = '#7f8c8d'; // steel shovel head
    ctx.fillRect(this.x + r * 0.5, this.y - 22, 12, 10);
    ctx.strokeRect(this.x + r * 0.5, this.y - 22, 12, 10);
    ctx.fillStyle = '#784212'; // wooden handle
    ctx.fillRect(this.x + r * 0.6, this.y - 12, 4, 25);
    ctx.strokeRect(this.x + r * 0.6, this.y - 12, 4, 25);

    // Square Head
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(this.x - r * 0.6, this.y - r * 1.4, r * 1.2, r * 1.0);
    ctx.strokeRect(this.x - r * 0.6, this.y - r * 1.4, r * 1.2, r * 1.0);
  }
}

// 6. Molten Boss (Wave 8 Boss)
export class MoltenBoss extends Enemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 2800,
      speed: 30,
      goldReward: 250,
      radius: 28,
      color: '#d35400',
      name: 'Molten Boss',
      isFireImmune: true
    });
    this.raged = false;
  }

  update(pixelPath, effectManager, dt, allEnemies, towers) {
    // gains +40% speed boost ("Rage") when dropping below 40% health
    if (this.health < this.maxHealth * 0.40 && !this.raged) {
      this.raged = true;
      this.baseSpeed = 42; // 30 * 1.4
      effectManager.spawnText(this.x, this.y - 25, "RAGE!", '#e67e22');
    }
    super.update(pixelPath, effectManager, dt, allEnemies, towers);
  }

  drawBlockyZombieBody(ctx) {
    const r = this.radius;

    // Draw dark magma suit
    ctx.fillStyle = '#111';
    ctx.fillRect(this.x - r, this.y - 8, r * 2, r * 1.6);
    ctx.strokeRect(this.x - r, this.y - 8, r * 2, r * 1.6);

    // Orange lava crack patterns
    ctx.fillStyle = '#ff6700';
    ctx.fillRect(this.x - r * 0.5, this.y - 4, 3, 10);
    ctx.fillRect(this.x + r * 0.2, this.y - 6, 4, 8);

    // Molten stone shoulders
    ctx.fillStyle = '#d35400';
    ctx.fillRect(this.x - r - 6, this.y - 12, 8, 8);
    ctx.fillRect(this.x + r - 2, this.y - 12, 8, 8);

    // Giant flaming head
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(this.x - r * 0.6, this.y - r * 1.3, r * 1.2, r * 1.0);
    ctx.strokeRect(this.x - r * 0.6, this.y - r * 1.3, r * 1.2, r * 1.0);
  }
}

// 7. Fallen King (Wave 10 Boss)
export class FallenKing extends Enemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 4500,
      speed: 24,
      goldReward: 400,
      radius: 32,
      color: '#f1c40f',
      name: 'Fallen King'
    });
    this.slamTimer = 0;
  }

  update(pixelPath, effectManager, dt, allEnemies, towers) {
    super.update(pixelPath, effectManager, dt, allEnemies, towers);
    
    // Slams sword every 6 seconds to freeze agents in 120px
    this.slamTimer += dt;
    if (this.slamTimer >= 6.0 && this.health > 0) {
      this.slamTimer = 0;
      effectManager.spawnText(this.x, this.y - 30, "KING'S SLAM!", '#9b59b6');
      effectManager.spawnExplosion(this.x, this.y, 120);

      if (towers) {
        for (const tower of towers.values()) {
          const dist = Math.hypot(tower.x - this.x, tower.y - this.y);
          if (dist <= 125) {
            tower.fireCooldown = Math.max(tower.fireCooldown, 2.5); // stun for 2.5s
            effectManager.spawnText(tower.x, tower.y - 15, "STUNNED", '#9b59b6');
          }
        }
      }
    }
  }

  drawBlockyZombieBody(ctx) {
    const r = this.radius;

    // Gold plated armor plates
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(this.x - r, this.y - 8, r * 2, r * 1.7);
    ctx.strokeRect(this.x - r, this.y - 8, r * 2, r * 1.7);

    // Glowing purple greatsword weapon
    ctx.fillStyle = '#8e44ad';
    ctx.fillRect(this.x + r * 0.6, this.y - 30, 8, 26);
    ctx.strokeRect(this.x + r * 0.6, this.y - 30, 8, 26);
    ctx.fillStyle = '#bdc3c7'; // hilt
    ctx.fillRect(this.x + r * 0.4, this.y - 4, 12, 3);

    // Giant crown-topped head
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(this.x - r * 0.5, this.y - r * 1.4, r * 1.0, r * 0.9);
    ctx.strokeRect(this.x - r * 0.5, this.y - r * 1.4, r * 1.0, r * 0.9);

    ctx.fillStyle = '#f1c40f'; // Royal Gold Crown
    ctx.beginPath();
    ctx.moveTo(this.x - r * 0.4, this.y - r * 1.4);
    ctx.lineTo(this.x - r * 0.4, this.y - r * 1.7);
    ctx.lineTo(this.x - r * 0.2, this.y - r * 1.5);
    ctx.lineTo(this.x, this.y - r * 1.8);
    ctx.lineTo(this.x + r * 0.2, this.y - r * 1.5);
    ctx.lineTo(this.x + r * 0.4, this.y - r * 1.7);
    ctx.lineTo(this.x + r * 0.4, this.y - r * 1.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// 8. Void Reaver (Final Boss Wave 10)
export class VoidReaver extends Enemy {
  constructor(x, y) {
    super(x, y, {
      maxHealth: 8000,
      speed: 22,
      goldReward: 800,
      radius: 36,
      color: '#2c003e',
      name: 'Void Reaver'
    });
    this.summonTimer = 0;
    this.stunTimer = 0;
  }

  update(pixelPath, effectManager, dt, allEnemies, towers) {
    super.update(pixelPath, effectManager, dt, allEnemies, towers);

    if (this.health <= 0) return;

    // Summon fast Shifters
    this.summonTimer += dt;
    if (this.summonTimer >= 8.0) {
      this.summonTimer = 0;
      allEnemies.push(new Shifter(this.x - 15, this.y));
      allEnemies.push(new Shifter(this.x + 15, this.y));
      effectManager.spawnText(this.x, this.y - 30, "VOID SUMMON!", '#9b59b6');
    }

    // Stuns random targets
    this.stunTimer += dt;
    if (this.stunTimer >= 5.5) {
      this.stunTimer = 0;
      if (towers && towers.size > 0) {
        const list = Array.from(towers.values());
        const target = list[Math.floor(Math.random() * list.length)];
        target.fireCooldown = Math.max(target.fireCooldown, 2.5);
        effectManager.spawnText(target.x, target.y - 15, "VOID STUNNED", '#8e44ad');
        effectManager.spawnImpact(target.x, target.y, '#8e44ad', 6, 0.7);
      }
    }
  }

  drawBlockyZombieBody(ctx) {
    const r = this.radius;

    // Void-corrupted dark-purple body
    ctx.fillStyle = '#2c003e';
    ctx.fillRect(this.x - r, this.y - 8, r * 2, r * 1.8);
    ctx.strokeRect(this.x - r, this.y - 8, r * 2, r * 1.8);

    // Glowing pink dual swords
    ctx.fillStyle = '#ff0080';
    ctx.fillRect(this.x + r * 0.6, this.y - 32, 6, 26);
    ctx.strokeRect(this.x + r * 0.6, this.y - 32, 6, 26);
    ctx.fillRect(this.x - r * 0.8, this.y - 32, 6, 26);
    ctx.strokeRect(this.x - r * 0.8, this.y - 32, 6, 26);

    // Giant square void head with pink glowing eyes
    ctx.fillStyle = '#1b0024';
    ctx.fillRect(this.x - r * 0.5, this.y - r * 1.3, r * 1.0, r * 0.9);
    ctx.strokeRect(this.x - r * 0.5, this.y - r * 1.3, r * 1.0, r * 0.9);

    ctx.fillStyle = '#ff0080'; // Glowing pink eyes
    ctx.fillRect(this.x - r * 0.3, this.y - r * 1.0, 5, 4);
    ctx.fillRect(this.x + r * 0.1, this.y - r * 1.0, 5, 4);
  }
}
