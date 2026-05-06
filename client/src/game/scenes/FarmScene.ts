import Phaser from 'phaser'
import NetworkManager from '../managers/NetworkManager'
import Player from '../entities/Player'


const TILE = 16;
const SCALE = 2;

const KEY_CONFIG = {
  UP: Phaser.Input.Keyboard.KeyCodes.W,
  DOWN: Phaser.Input.Keyboard.KeyCodes.S,
  LEFT: Phaser.Input.Keyboard.KeyCodes.A,
  RIGHT: Phaser.Input.Keyboard.KeyCodes.D,
  ACTION: Phaser.Input.Keyboard.KeyCodes.E,
  INVENTORY: Phaser.Input.Keyboard.KeyCodes.I,
  RUN: Phaser.Input.Keyboard.KeyCodes.SHIFT
};

export default class FarmScene extends Phaser.Scene {
  private worldConfig: any;
  players: Map<string, Player> = new Map();
  private isMoving = false;
  private controls!: Record<keyof typeof KEY_CONFIG, Phaser.Input.Keyboard.Key>;

  private farmingLayer!: Phaser.Tilemaps.TilemapLayer;
  private cropLayer!: Phaser.Tilemaps.TilemapLayer;

  private lastSentPos = { x: -1, y: -1 };
  private lastWorldHash = '';

  constructor() {
    super('FarmScene');
  }

  init(data: any) {
    this.worldConfig = data.world;
  }

  create() {
    if (!this.worldConfig) {
      console.error("Missing worldConfig!");
      return;
    }

    this.controls = this.input.keyboard!.addKeys(KEY_CONFIG) as any;

    const MAP_SIZE_X = this.worldConfig.width;
    const MAP_SIZE_Y = this.worldConfig.height;
    const worldPx = MAP_SIZE_X * TILE * SCALE;
    const worldPy = MAP_SIZE_Y * TILE * SCALE;

    const map = this.make.tilemap({
      width: MAP_SIZE_X,
      height: MAP_SIZE_Y,
      tileWidth: TILE,
      tileHeight: TILE
    });

    // --- ASSET LOADING ---
    const grassTileset = map.addTilesetImage('grass', 'grass');
    const natureTileset = map.addTilesetImage('nature', 'nature');
    const cropTileset = map.addTilesetImage('crops', 'crops');
    const exteriorTileset = map.addTilesetImage('exterior', 'exterior');

    if (!grassTileset || !exteriorTileset || !natureTileset || !cropTileset) {
      console.error("Missing Tilesets! Check AssetManager.");
      return;
    }

    // --- B. LAYER SETUP ---
    // LAYER 1: BASE (Solid Grass & Dirt Paths) - Depth 0
    const groundLayer = map.createBlankLayer('Ground', grassTileset)!.setScale(SCALE).setDepth(0);

    // LAYER 2: FARMING (Tilled Plots & Wet Soil) - Depth 1, 2 (Separate layer for crops to appear above tilled soil)
    this.farmingLayer = map.createBlankLayer('Farming', grassTileset)!.setScale(SCALE).setDepth(1);
    this.cropLayer = map.createBlankLayer('Crops', cropTileset)!.setScale(SCALE).setDepth(2);

    // LAYER 3: OBSTACLES (Fences, House Base, Bottom of Trees) - Depth 3
    const obstacleLayer = map.createBlankLayer('Obstacles', exteriorTileset)!.setScale(SCALE).setDepth(3);

    // [cite: LAYER 4: ENTITIES] (Player sprite, Cow, Chicken) - Depth 4 (Set in entity class)

    // LAYER 5: OVERHEAD (Roofs, Top of Trees) - Depth 5
    const overheadLayer = map.createBlankLayer('Overhead', natureTileset)!.setScale(SCALE).setDepth(5);


    // =========================================
    // --- E. GENERATE WORLD ( procedural) ---
    // =========================================
    // This replaces the simple loop and map.fill(0).

    // Fill the entire world with Grass (Index 58) 
    groundLayer.fill(58);

    // Draw the "U-Shaped" Path
    const pathTile = 177;
    // Horizontal path from house to right
    for (let x = 4; x < 18; x++) groundLayer.putTileAt(pathTile, x, 5);
    // Vertical path down the right side
    for (let y = 5; y < 22; y++) groundLayer.putTileAt(pathTile, 18, y);
    // Horizontal path back left at the bottom
    for (let x = 0; x < 18; x++) groundLayer.putTileAt(pathTile, x, 22);

    // Draw a 5x5 Tilled Dirt Plot in the center
    const dirtTile = 176;
    for (let y = 8; y < 13; y++) {
      for (let x = 10; x < 15; x++) {
        this.farmingLayer.putTileAt(dirtTile, x, y);
      }
    }

    // =========================================
    // --- F. PLACE SPECIFIC STRUCTURES ---
    // =========================================

    // Choose a starting position for the "farm area"
    const farmStartX = 10;
    const farmStartY = 10;

    // --- 1. Place the "Starter Tilled Field" (RECTANGLE) ---
    // This fixes your "Strip" field.
    const fieldWidth = 8;
    const fieldHeight = 5;
    const dirtTileIndex = 176; // Index of tilled soil in grass sheet

    for (let h = 0; h < fieldHeight; h++) {
      for (let w = 0; w < fieldWidth; w++) {
        this.farmingLayer.putTileAt(dirtTileIndex, farmStartX + w, farmStartY + h);
      }
    }

    // --- 2. Create the "Fence Perimeter" ( procedural) ---
    // Use indices from Exterior_Tileset. These might need adjustment.
    const fenceTopIndex = 100; // Example indices
    const fenceSideIndex = 101;
    const perimeterWidth = 20;
    const perimeterHeight = 15;

    for (let x = farmStartX - 2; x < farmStartX + perimeterWidth; x++) {
      obstacleLayer.putTileAt(fenceTopIndex, x, farmStartY - 3); // Top Fence
      obstacleLayer.putTileAt(fenceTopIndex, x, farmStartY + perimeterHeight + 2); // Bottom
    }
    for (let y = farmStartY - 3; y < farmStartY + perimeterHeight + 2; y++) {
      obstacleLayer.putTileAt(fenceSideIndex, farmStartX - 2, y); // Left Fence
      obstacleLayer.putTileAt(fenceSideIndex, farmStartX + perimeterWidth, y); // Right Fence
    }

    // --- 3. Place the "House" (Procedural or Tiled JSON) ---
    // In code, you manually place tiles:
    // Bottom layer (collidable wall)
    obstacleLayer.putTileAt(200, 25, 8); // House indices from exteriorTileset
    obstacleLayer.putTileAt(201, 26, 8);
    // Overhead layer (roof, not collidable)
    overheadLayer.putTileAt(210, 25, 7);
    overheadLayer.putTileAt(211, 26, 7);

    // --- G. FINALIZE SETUP ---
    this.cameras.main.setBounds(0, 0, worldPx, worldPy);
    this.cameras.main.setZoom(1);
    // this.cameras.main.centerOn(worldPx / 2, worldPy / 2);

    // Center camera on world spawn
    const spawnPxX = this.worldConfig.spawn.x * TILE * SCALE;
    const spawnPxY = this.worldConfig.spawn.y * TILE * SCALE;
    this.cameras.main.centerOn(spawnPxX, spawnPxY);

    // Start network synchronization loop (same as before)
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.syncWorld(),
    });
  }

  syncWorld() {
    const world = NetworkManager.worldState;
    const myId = NetworkManager.playerId;

    if (!world || !world.players) return;

    // prevent re-render spam
    const hash = JSON.stringify(world.tiles);
    if (hash !== this.lastWorldHash) {
      this.renderWorldFromServer(world);
      this.lastWorldHash = hash;
    }

    // Create a set of IDs currently sent by the server
    const activeIds = new Set(Object.keys(world.players));

    // Remove players who are no longer "nearby"
    this.players.forEach((sprite, id) => {
      if (!activeIds.has(id) && id !== myId) {
        sprite.destroy(); // Remove the Bunny from the screen
        this.players.delete(id);
      }
    });

    // Update or Add the nearby players
    Object.values(world.players).forEach((p: any) => {
      const targetX = p.x * TILE * SCALE;
      const targetY = p.y * TILE * SCALE;

      if (!this.players.has(p.id)) {
        let spawnX = p.x;
        let spawnY = p.y;

        // fallback if server sends nothing (future-proof)
        if (!spawnX || !spawnY) {
          spawnX = this.worldConfig.spawn.x;
          spawnY = this.worldConfig.spawn.y;
        }

        const newPlayerTargetX = spawnX * TILE * SCALE;
        const newPlayerTargetY = spawnY * TILE * SCALE;

        const playerInstance = new Player(this, newPlayerTargetX, newPlayerTargetY, p.id);
        this.players.set(p.id, playerInstance);

        // POKEMON STYLE: Follow ONLY when near center of world
        if (p.id === myId) {
          // true = roundPixels to prevent blurry bunny
          this.cameras.main.startFollow(playerInstance, true, 0.2, 0.2);
          // Small deadzone so bunny moves a bit before camera follows
          this.cameras.main.setDeadzone(50, 50);

          this.lastSentPos = { x: p.x, y: p.y };
        }
      }

      const sprite = this.players.get(p.id);
      if (!sprite) return;

      // LOCAL PLAYER: Only sync state, don't tween position (prevents fighting with controls)
      if (p.id === myId) {
        // We only snap if we are WAY off (like a collision failed)
        if (!this.isMoving) {
          const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, targetX, targetY);
          if (dist > (TILE * SCALE * 1.5)) {
            sprite.setPosition(targetX, targetY);
            this.lastSentPos = { x: p.x, y: p.y }; // Reset tracker to server state
          }
        }
        return;
      }

      // REMOTE PLAYERS: Handle smooth interpolation
      const isMoving = Math.abs(sprite.x - targetX) > 2 || Math.abs(sprite.y - targetY) > 2;

      // Calculate direction for animation
      let dir = sprite.lastDir;
      if (targetX > sprite.x) dir = 'right';
      else if (targetX < sprite.x) dir = 'left';
      else if (targetY > sprite.y) dir = 'up';
      else if (targetY < sprite.y) dir = 'down';

      sprite.updateDirection(dir, isMoving);

      // FIX: Stop existing tweens for this specific sprite to prevent jitter
      this.tweens.killTweensOf(sprite);

      if (isMoving) {
        this.tweens.killTweensOf(sprite); // Stop current movement before starting new one

        this.tweens.add({
          targets: sprite,
          x: targetX,
          y: targetY,
          duration: 100, // Match your sync interval (100ms)
          onStart: () => sprite.updateDirection(dir, true),
          onComplete: () => sprite.updateDirection(dir, false)
        });
      } else {
        // Snap to position if the distance is negligible
        sprite.setPosition(targetX, targetY);
        sprite.updateDirection(sprite.lastDir, false);
      }
    });
  }

  update() {
    const world = NetworkManager.worldState;
    const playerId = NetworkManager.playerId;

    // Ensure we have world data, our ID, and aren't mid-animation
    if (!world || !world.players || !playerId || this.isMoving) return;

    const me = world.players[playerId];
    const mySprite = this.players.get(playerId);
    if (!me || !mySprite || this.isMoving) return;

    // --- Action Logic (Farming) ---
    if (Phaser.Input.Keyboard.JustDown(this.controls.ACTION)) {
      this.handleAction(mySprite);
      return;
    }

    // --- Movement Logic ---

    let { x, y } = this.lastSentPos; // Start from last sent position, not sprite position
    let moved = false;
    let direction = mySprite.lastDir; // Default to last direction if no input

    if (this.controls.LEFT.isDown) {
      x--; moved = true; direction = 'left';
    } else if (this.controls.RIGHT.isDown) {
      x++; moved = true; direction = 'right';
    } else if (this.controls.UP.isDown) {
      y--; moved = true; direction = 'up';
    } else if (this.controls.DOWN.isDown) {
      y++; moved = true; direction = 'down';
    }

    if (moved) {
      // IMMEDIATELY tell the sprite it is moving
      if (this.canMoveTo(x, y)) {
        this.lastSentPos = { x, y };
        this.handleMovement(x, y, direction, mySprite);
      } else {
        // IDLE LOCALLY
        mySprite.updateDirection(direction, false);
      }
    }
  }

  private canMoveTo(tx: number, ty: number): boolean {
    return tx > 0 && tx < this.worldConfig.width && ty > 0 && ty < this.worldConfig.height;
  }

  private handleMovement(nextX: number, nextY: number, direction: string, sprite: Player) {
    this.isMoving = true;

    const targetPxX = nextX * TILE * SCALE;
    const targetPxY = nextY * TILE * SCALE;

    // Move instantly on screen
    this.tweens.add({
      targets: sprite,
      x: targetPxX,
      y: targetPxY,
      duration: 120, // Duration of the walk animation
      ease: 'Linear',
      onStart: () => sprite.updateDirection(direction, true),
      onComplete: () => {
        this.isMoving = false;
        // Check for idle
        const anyKeyDown = this.controls.LEFT.isDown || this.controls.RIGHT.isDown || this.controls.UP.isDown || this.controls.DOWN.isDown;
        if (!anyKeyDown) sprite.updateDirection(direction, false);
      }
    });

    // Send intended move to server
    NetworkManager.send({ type: 'move', x: nextX, y: nextY });
  }

  private handleAction(player: Player) {
    // 1. Get the tile coordinates in front of the player
    const targetTile = player.getFacingTile();

    // 2. Logic: What are we hitting?
    const hasDirt = this.farmingLayer.getTileAt(targetTile.x, targetTile.y);
    const hasCrop = this.cropLayer.getTileAt(targetTile.x, targetTile.y);

    if (!hasDirt) {
      // Action: HOE (Grass -> Dirt)
      player.play(`bunny-hoe-${player.lastDir}`);

      // Wait for the animation "swing" frame to update tile
      this.time.delayedCall(200, () => {
        this.farmingLayer.putTileAt(176, targetTile.x, targetTile.y);
        // Sync with server
        NetworkManager.send({ type: 'till', x: targetTile.x, y: targetTile.y });
      });
    }
    else if (hasDirt && !hasCrop) {
      // Action: PLANT (Dirt -> Seed)
      player.play(`bunny-wateringcan-${player.lastDir}`); // Using watering can as placeholder for "planting"

      this.cropLayer.putTileAt(0, targetTile.x, targetTile.y); // Index 0 of Crops_Tileset
      NetworkManager.send({ type: 'plant', x: targetTile.x, y: targetTile.y });
    }
  }

  private renderWorldFromServer(world: any) {
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.tiles[y][x];

        // --- Farming layer ---
        if (tile.type === "tilled") {
          this.farmingLayer.putTileAt(176, x, y);
        } else {
          this.farmingLayer.removeTileAt(x, y);
        }

        // --- Crop layer ---
        if (tile.crop) {
          this.cropLayer.putTileAt(0, x, y);
        } else {
          this.cropLayer.removeTileAt(x, y);
        }
      }
    }
  }
}
