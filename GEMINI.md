# Tower Defense - Modular Game Design & Architecture

This document describes the structure, architecture, and visual polish mechanics of our 2D Tower Defense game.

## File Structure

- `index.html`: Entry point & UI containers (Game board canvas, sidebar controls, Shop/HUD overlay).
- `style.css`: Sleek, dark-themed UI using modern fonts, neon borders, and dynamic animations.
- `src/main.js`: Main orchestration and game loop, state machine, inputs, and canvas setup.
- `src/grid.js`: Handles 2D grid structure, path definition, and placement eligibility checks.
- `src/tower.js`: Base `Tower` and specialized subclasses (`GatlingTurret`, `FrostSpire`, `TeslaCoil`, `PlasmaCannon`).
- `src/enemy.js`: Base `Enemy` and subclasses (`Runner`, `Goliath`, `Shifter`, `Regenerator`) with pathfinding navigation.
- `src/bullet.js`: Projectiles handling movements, collision detection, and effects.
- `src/particle.js`: Dynamic visual particle effects, screenshake control, and floating damage numbers.
- `src/ui.js`: DOM-based HUD displays and user shop panel interaction management.

## Module Details

### 1. Grid & Pathing (`src/grid.js`)
- The map is divided into a 2D tile grid.
- A custom pre-defined winding path guides enemies from start to finish.
- Placement system prevents placing towers on the path, on already occupied cells, or outside map boundaries.

### 2. Base & Specialized Towers (`src/tower.js`)
- **Base Tower**:
  - Properties: `x`, `y`, `range`, `damage`, `fireRate`, `cost`, `level`.
  - Methods: `update(enemies, particles, bullets, dt)`, `draw(ctx)`, `upgrade()`.
- **Specializations**:
  - `GatlingTurret`: Rapid rate of fire, single target, high physical damage.
  - `FrostSpire`: Emits a slowing pulse, freezing nearby enemies.
  - `TeslaCoil`: Chain-lightning hitting up to 3 targets with glowing electric particles.
  - `PlasmaCannon`: Heavy area-of-effect projectiles with splash damage.

### 3. Base & Specialized Enemies (`src/enemy.js`)
- **Base Enemy**:
  - Properties: `health`, `maxHealth`, `speed`, `goldReward`, `pathProgress`, `statusEffects`.
  - Methods: `update(dt)`, `draw(ctx)`, `takeDamage(amount, type)`.
- **Specializations**:
  - `Runner`: Fast speed, low health.
  - `Goliath`: Heavy armor, high health, slow movement.
  - `Shifter`: Random teleportations forward or velocity bursts when hit.
  - `Regenerator`: Self-heals and regenerates adjacent allies.

### 4. Particles & Polish (`src/particle.js`)
- **Impact Particles**: Emitted on projectile collisions, color-coded by projectile type.
- **Floating Text**: Renders damage numbers, health gains, and gold rewards with vertical drift and alpha fade.
- **Screenshake**: Managed globally via screenshake intensity decay. Applies translation offsets to the rendering context.
- **Hit Flash**: Sets a flash timer on enemies when hit, drawing them in bright white overlay using `ctx.fillStyle = '#fff'`.
