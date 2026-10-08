// Grid and Map Terrain Module for Blocky TDS 2D

export class Grid {
  constructor(width = 800, height = 600, cellSize = 40) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.floor(width / cellSize);
    this.rows = Math.floor(height / cellSize);

    // Current active map ID ('grassland', 'desert', 'tundra')
    this.mapId = 'grassland';

    // Grid checkpoints definitions for three maps
    this.paths = {
      grassland: [
        { col: -1, row: 3 },
        { col: 5, row: 3 },
        { col: 5, row: 9 },
        { col: 10, row: 9 },
        { col: 10, row: 2 },
        { col: 15, row: 2 },
        { col: 15, row: 12 },
        { col: 3, row: 12 },
        { col: 3, row: 14 },
        { col: 20, row: 14 }
      ],
      desert: [
        { col: -1, row: 5 },
        { col: 8, row: 5 },
        { col: 8, row: 11 },
        { col: 3, row: 11 },
        { col: 3, row: 2 },
        { col: 16, row: 2 },
        { col: 16, row: 8 },
        { col: 12, row: 8 },
        { col: 12, row: 14 },
        { col: 20, row: 14 }
      ],
      tundra: [
        { col: -1, row: 7 },
        { col: 12, row: 7 },
        { col: 12, row: 3 },
        { col: 4, row: 3 },
        { col: 4, row: 11 },
        { col: 16, row: 11 },
        { col: 16, row: 14 },
        { col: 20, row: 14 }
      ]
    };

    // Obstacle lists populated during setup
    this.obstacles = [];

    // Setup map state
    this.selectMap('grassland');

    // Map of placed towers (key: "col,row", value: Agent object)
    this.towers = new Map();
  }

  selectMap(mapId) {
    this.mapId = mapId;
    this.pathCheckpoints = this.paths[mapId] || this.paths.grassland;
    this.pixelPath = this.generatePixelPath();
    this.pathTiles = this.calculatePathTiles();

    // Reset and populate decorative background obstacles (trees, cacti, rocks)
    this.generateDecorations();
  }

  // Generate continuous pixel points along center of path
  generatePixelPath() {
    const points = [];
    for (const checkpoint of this.pathCheckpoints) {
      points.push({
        x: checkpoint.col * this.cellSize + this.cellSize / 2,
        y: checkpoint.row * this.cellSize + this.cellSize / 2
      });
    }
    return points;
  }

  // Calculate grid coordinates of the path
  calculatePathTiles() {
    const tiles = new Set();
    for (let i = 0; i < this.pathCheckpoints.length - 1; i++) {
      const start = this.pathCheckpoints[i];
      const end = this.pathCheckpoints[i + 1];

      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);

      for (let c = minCol; c <= maxCol; c++) {
        for (let r = minRow; r <= maxRow; r++) {
          if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
            tiles.add(`${c},${r}`);
          }
        }
      }
    }
    return tiles;
  }

  // Generate background decor items outside of paths
  generateDecorations() {
    this.obstacles = [];
    const count = 18; // Number of decorative assets on screen

    for (let i = 0; i < count; i++) {
      // Find a random cell that isn't on the path
      let col, row, key;
      let attempts = 0;
      do {
        col = Math.floor(Math.random() * this.cols);
        row = Math.floor(Math.random() * this.rows);
        key = `${col},${row}`;
        attempts++;
      } while ((this.pathTiles.has(key) || this.hasObstacleNear(col, row)) && attempts < 100);

      if (attempts < 100) {
        // Position at cell center
        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;
        
        let type = 'rock';
        if (this.mapId === 'grassland') {
          type = Math.random() < 0.7 ? 'tree' : 'rock';
        } else if (this.mapId === 'desert') {
          type = Math.random() < 0.6 ? 'cactus' : 'rock';
        } else if (this.mapId === 'tundra') {
          type = Math.random() < 0.75 ? 'snowtree' : 'icecrystal';
        }

        this.obstacles.push({ col, row, x, y, type });
      }
    }
  }

  hasObstacleNear(col, row) {
    return this.obstacles.some(obs => Math.abs(obs.col - col) <= 1 && Math.abs(obs.row - row) <= 1);
  }

  pixelToGrid(x, y) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return { col, row };
  }

  isCellValidForPlacement(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return false;
    }
    // Check if cell is path
    if (this.pathTiles.has(`${col},${row}`)) {
      return false;
    }
    // Check if tower occupies it
    if (this.towers.has(`${col},${row}`)) {
      return false;
    }
    // Check if background obstacles occupy it
    const hasObstacle = this.obstacles.some(o => o.col === col && o.row === row);
    if (hasObstacle) {
      return false;
    }
    return true;
  }

  placeTower(col, row, tower) {
    if (this.isCellValidForPlacement(col, row)) {
      this.towers.set(`${col},${row}`, tower);
      return true;
    }
    return false;
  }

  removeTower(col, row) {
    return this.towers.delete(`${col},${row}`);
  }

  clear() {
    this.towers.clear();
  }

  draw(ctx) {
    // 1. Draw Map Base Background (Flat Stylized colors)
    let terrainColor = '#7dcd40'; // Grassland
    let pathColor = '#dfc39e'; // Dirt path
    let borderOutlineColor = '#222222';

    if (this.mapId === 'desert') {
      terrainColor = '#f9e79f';
      pathColor = '#e5c494';
    } else if (this.mapId === 'tundra') {
      terrainColor = '#ebf5fb';
      pathColor = '#d4e6f1';
    }

    ctx.fillStyle = terrainColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle flat checkerboard details for toy feel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.025)';
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if ((c + r) % 2 === 0) {
          ctx.fillRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
        }
      }
    }

    // 2. Draw Dirt Path with Blocky outlines
    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    // Black path border outline
    ctx.strokeStyle = borderOutlineColor;
    ctx.lineWidth = this.cellSize + 6;
    ctx.beginPath();
    ctx.moveTo(this.pixelPath[0].x, this.pixelPath[0].y);
    for (let i = 1; i < this.pixelPath.length; i++) {
      ctx.lineTo(this.pixelPath[i].x, this.pixelPath[i].y);
    }
    ctx.stroke();

    // Actual path fill
    ctx.strokeStyle = pathColor;
    ctx.lineWidth = this.cellSize;
    ctx.beginPath();
    ctx.moveTo(this.pixelPath[0].x, this.pixelPath[0].y);
    for (let i = 1; i < this.pixelPath.length; i++) {
      ctx.lineTo(this.pixelPath[i].x, this.pixelPath[i].y);
    }
    ctx.stroke();

    ctx.restore();

    // 3. Draw Decorative Obstacles (Blocky/Flat Vector Style)
    for (const obs of this.obstacles) {
      this.drawObstacle(ctx, obs);
    }
  }

  drawObstacle(ctx, obs) {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;

    switch (obs.type) {
      case 'tree': // Grassland pine tree
        // Draw trunk
        ctx.fillStyle = '#784212';
        ctx.fillRect(-4, 6, 8, 10);
        ctx.strokeRect(-4, 6, 8, 10);

        // Draw blocky foliage triangles
        ctx.fillStyle = '#1e8449';
        
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(14, 0);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(16, 10);
        ctx.lineTo(-16, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'rock': // Flat blocky rock
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath();
        ctx.rect(-10, -6, 20, 16);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.rect(-4, -10, 10, 8);
        ctx.fill();
        ctx.stroke();
        break;

      case 'cactus': // Desert Cactus
        ctx.fillStyle = '#27ae60';
        // Main stem
        ctx.fillRect(-5, -12, 10, 26);
        ctx.strokeRect(-5, -12, 10, 26);
        // Left arm
        ctx.fillRect(-12, -4, 7, 5);
        ctx.strokeRect(-12, -4, 7, 5);
        ctx.fillRect(-12, -10, 5, 8);
        ctx.strokeRect(-12, -10, 5, 8);
        // Right arm
        ctx.fillRect(5, 2, 7, 5);
        ctx.strokeRect(5, 2, 7, 5);
        ctx.fillRect(8, -4, 5, 8);
        ctx.strokeRect(8, -4, 5, 8);
        break;

      case 'snowtree': // Tundra tree with snowy details
        // Trunk
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(-4, 6, 8, 10);
        ctx.strokeRect(-4, 6, 8, 10);

        // Lower foliage
        ctx.fillStyle = '#227093';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(16, 10);
        ctx.lineTo(-16, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Upper foliage (white snow caps)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(12, -2);
        ctx.lineTo(-12, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'icecrystal': // Cold crystals
        ctx.fillStyle = '#5dade2';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(8, -2);
        ctx.lineTo(4, 10);
        ctx.lineTo(-4, 10);
        ctx.lineTo(-8, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Inner highlights
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(3, -2);
        ctx.lineTo(1, 6);
        ctx.lineTo(-1, 6);
        ctx.lineTo(-3, -2);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }
}
