// Projectile and Ammo Module for Blocky TDS 2D

export class Bullet {
  constructor(x, y, target, stats) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.speed = stats.speed || 500;
    this.damage = stats.damage || 10;
    this.color = stats.color || '#f1c40f'; // Toy yellow
    this.radius = stats.radius || 4;
    this.damageType = stats.damageType || 'physical';

    this.targetLastX = target ? target.x : x;
    this.targetLastY = target ? target.y : y;

    this.trail = [];
    this.maxTrailLength = 4;
  }

  update(effectManager, enemies, dt) {
    // Save trail history
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    if (this.target && this.target.health > 0) {
      this.targetLastX = this.target.x;
      this.targetLastY = this.target.y;
    } else {
      this.target = null;
    }

    const dx = this.targetLastX - this.x;
    const dy = this.targetLastY - this.y;
    const dist = Math.hypot(dx, dy);
    
    const moveDist = this.speed * dt;

    if (dist <= moveDist) {
      this.x = this.targetLastX;
      this.y = this.targetLastY;
      this.onHit(this.target, effectManager, enemies);
      return true; // Destroy projectile
    } else {
      this.x += (dx / dist) * moveDist;
      this.y += (dy / dist) * moveDist;
      return false; // Keep projectile
    }
  }

  onHit(target, effectManager, enemies) {
    if (target && target.health > 0) {
      target.takeDamage(this.damage, this.damageType, effectManager);
      effectManager.spawnImpact(this.x, this.y, this.color, 4);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3.5;

    // Draw cartoon trail blocks
    ctx.fillStyle = this.color;
    for (let i = 0; i < this.trail.length; i++) {
      const pt = this.trail[i];
      const scale = (i / this.trail.length) * 0.8;
      const size = this.radius * 2 * scale;
      ctx.beginPath();
      ctx.rect(pt.x - size / 2, pt.y - size / 2, size, size);
      ctx.fill();
    }

    // Draw main projectile block (blocky Roblox bullet)
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.rect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

// 1. Minigunner Fast Tracer Bullet
export class MinigunnerBullet extends Bullet {
  constructor(x, y, target, damage) {
    super(x, y, target, {
      speed: 750,
      damage: damage,
      color: '#e67e22', // Orange tracer
      radius: 3,
      damageType: 'physical'
    });
  }
}

// 2. Pyromancer Flame Stream (slow travel, splash, inflicts Burning status)
export class FlameProjectile {
  constructor(x, y, angle, damage, burnDps, speed = 250, maxRange = 120) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.burnDps = burnDps;
    this.maxRange = maxRange;
    this.radius = 8;
    this.life = maxRange / speed; // Duration of flame flight
  }

  update(effectManager, enemies, dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;

    // Collision check against enemies along the way
    for (const enemy of enemies) {
      if (enemy.health > 0) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= this.radius + enemy.radius) {
          enemy.takeDamage(this.damage, 'fire', effectManager);
          enemy.applyBurn(this.burnDps, 3.5); // Apply burning for 3.5s
          // Particle effect on target
          effectManager.spawnImpact(enemy.x, enemy.y, '#e67e22', 2, 0.6);
        }
      }
    }

    return this.life <= 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#ff6700'; // Flame orange
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    // Draw blocky flame particles expanding slightly
    const scaleSize = this.radius * (1.2 - this.life * 0.5);
    ctx.beginPath();
    ctx.rect(this.x - scaleSize / 2, this.y - scaleSize / 2, scaleSize, scaleSize);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// 3. DJ Music Aura Ring (Renders expanding musical wave)
export class DJMusicWave {
  constructor(x, y, maxRadius) {
    this.x = x;
    this.y = y;
    this.maxRadius = maxRadius;
    this.radius = 0;
    this.speed = maxRadius * 1.5;
  }

  update(effectManager, enemies, dt) {
    this.radius += this.speed * dt;
    if (this.radius >= this.maxRadius) {
      return true; // Destroy wave when range reached
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(155, 89, 182, 0.4)'; // DJ Purple flat ring
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
