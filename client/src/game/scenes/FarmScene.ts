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
    const exteriorTileset = map.addTilesetImage('exterior', 'exterior', 16, 16, 0, 0, natureTileset!.total);
    // House tileset uses "exterior" image but different GIDs, so we add it as a separate tileset to get its own firstgid
    const houseTileset = map.addTilesetImage('house', 'house', 16, 16, 0, 0, natureTileset!.total + exteriorTileset!.total);

    const floorDetailsTileset = map.addTilesetImage('floor_details', 'floor_details', 16, 16, 0, 0, natureTileset!.total + exteriorTileset!.total);

    if (!grassTileset || !exteriorTileset || !natureTileset || !cropTileset || !houseTileset || !floorDetailsTileset) {
      console.error("Missing Tilesets! Check AssetManager.");
      return;
    }

    // --- B. LAYER SETUP ---
    // LAYER 1: BASE (Solid Grass & Dirt Paths) - Depth 0
    const groundLayer = map.createBlankLayer('Ground', grassTileset)!.setScale(SCALE).setDepth(0);

    // LAYER 2: FARMING (Tilled Plots & Wet Soil) - Depth 1, 2 (Separate layer for crops to appear above tilled soil)
    this.farmingLayer = map.createBlankLayer('Farming', grassTileset)!.setScale(SCALE).setDepth(1);
    this.cropLayer = map.createBlankLayer('Crops', cropTileset)!.setScale(SCALE).setDepth(2);

    const backgroundLayer = map.createBlankLayer(
      'BackgroundDecor',
      [natureTileset, exteriorTileset]
    )!
      .setScale(SCALE)
      .setDepth(2.5);

    // LAYER 3: OBSTACLES (Fences, House Base, Bottom of Trees) - Depth 3
    const obstacleLayer = map.createBlankLayer(
      'Obstacles',
      [exteriorTileset, houseTileset] // multiple tilesets
    )!
      .setScale(SCALE)
      .setDepth(3);

    const treeLayer = map.createBlankLayer(
      'Trees',
      [natureTileset]
    )!
      .setScale(SCALE)
      .setDepth(3.1);

    const houseLayer = map.createBlankLayer(
      'House',
      [houseTileset]
    )!
      .setScale(SCALE)
      .setDepth(3.2);

    const detailLayer = map.createBlankLayer('Details', [houseTileset, floorDetailsTileset])!
      .setScale(SCALE)
      .setDepth(3.3); // For things like windows that should be above obstacles but below players

    console.log('natureTileset.firstgid:', natureTileset.firstgid);
    console.log('exteriorTileset.firstgid:', exteriorTileset.firstgid);
    console.log('houseTileset.firstgid:', houseTileset.firstgid);

    // [cite: LAYER 4: ENTITIES] (Player sprite, Cow, Chicken) - Depth 4 (Set in entity class)

    // LAYER 5: OVERHEAD (Roofs, Top of Trees) - Depth 5
    const overheadLayer = map.createBlankLayer('Overhead', natureTileset)!.setScale(SCALE).setDepth(5);

    // Helpers
    const NAT = (i: number) => natureTileset.firstgid + i;
    const EXT = (i: number) => exteriorTileset.firstgid + i;
    const HOUSE = (i: number) => houseTileset.firstgid + i;
    const FLOOR = (i: number) => floorDetailsTileset.firstgid + i;

    const details = {
      flower1: FLOOR(13),
      flower2: FLOOR(24),
      grassGroupL: [
        [FLOOR(17), FLOOR(18)],
        [FLOOR(28), FLOOR(29)]
      ],
      grassGroupS: [
        [FLOOR(19), FLOOR(20)],
        [FLOOR(30), FLOOR(31)]
      ],
      lampPost: [
        [EXT(39), EXT(40)], 
        [EXT(64), EXT(65)]
      ],
      noticeBoard: [
        [EXT(47), EXT(48)],
        [EXT(72), EXT(73)]
       ]
    }

    // =========================================
    // --- E. GENERATE WORLD ( procedural) ---
    // =========================================

    // Fill the entire world with Ground (Index 58)
    groundLayer.fill(73);

    // draw fence
    const fenceTile = {
      verticalLeft: EXT(55),
      verticalRight: EXT(57),
      horizontal: EXT(81),
      topLeftCorner: EXT(30),
      topRightCorner: EXT(32),
      bottomLeftCorner: EXT(80),
      bottomRightCorner: EXT(82),
      horizontalBrokenUp: EXT(33),
      horizontalBrokendown: EXT(83)
    };

    obstacleLayer.putTileAt(fenceTile.topLeftCorner, 0, 0);
    // obstacleLayer.putTileAt(fenceTile.topRightCorner, MAP_SIZE_X - 1, 0);

    for (let x = 1; x < MAP_SIZE_X; x++) {
      obstacleLayer.putTileAt(fenceTile.horizontal, x, 0);
      // obstacleLayer.putTileAt(fenceTile.horizontal, x, MAP_SIZE_Y - 1);
    }

    // obstacleLayer.putTileAt(fenceTile.bottomLeftCorner, 0, MAP_SIZE_Y - 1);
    // obstacleLayer.putTileAt(fenceTile.bottomRightCorner, MAP_SIZE_X - 1, MAP_SIZE_Y - 1);

    for (let y = 1; y < MAP_SIZE_Y; y++) {
      obstacleLayer.putTileAt(fenceTile.verticalLeft, 0, y);
      // obstacleLayer.putTileAt(fenceTile.verticalRight, MAP_SIZE_X - 1, y);
    }

    // THE HOUSE (Top Center-Left)
    const houseX = 3;
    const houseY = 1;

    const roofTiles = [
      [51, 51, 42, 51, 51],
      [44, 53, 118, 54, 45],
      [82, 91, 81, 92, 83],
      [120, 129, 119, 130, 121],
      [115, 209, 111, 209, 116]
    ].map(row => row.map(HOUSE));

    houseLayer.putTilesAt(roofTiles, houseX, houseY - 2);
    detailLayer.putTileAt(HOUSE(68), houseX + 2, houseY + 1);    // top window
    detailLayer.putTileAt(HOUSE(377), houseX + 2, houseY + 2);   // main door shed
    detailLayer.putTileAt(HOUSE(182), houseX + 1, houseY + 2);   // left window
    detailLayer.putTileAt(HOUSE(182), houseX + 3, houseY + 2);   // right window

    // trees
    const treeTiles = {
      pineGroup: [
        [90, 91, 92, 93],
        [111, 112, 113, 114],
        [132, 133, 134, 135],
      ].map(row => row.map(NAT)),

      pineSingle: [
        [45, 46],
        [66, 67],
      ].map(row => row.map(NAT)),

      bigTree: [
        [22, 23],
        [43, 44],
        [64, 65]
      ].map(row => row.map(NAT))
    }

    const wellTiles = [
      [135, 136],
      [160, 161],
    ].map(row => row.map(EXT))

    treeLayer.putTilesAt(treeTiles.pineGroup, 0, 0);
    treeLayer.putTilesAt(treeTiles.pineSingle, 7, 0);
    backgroundLayer.putTilesAt(wellTiles, 8, 2);

    backgroundLayer.putTileAt(NAT(153), 1, 3);
    backgroundLayer.putTileAt(NAT(39), 1, 4);
    backgroundLayer.putTileAt(EXT(70), 2, 3);

    treeLayer.putTilesAt(treeTiles.bigTree, 1, 4);


    // Draw the "z-Shaped" Path
    const groundTiles = {
      topLeftCorner: 36,
      topRightCorner: 38,
      top: 37,
      left: 57,
      right: 59,
      bottomLeftCorner: 78,
      bottomRightCorner: 80,
      bottom: 79,
      bottomRightEdge: 39,
      bottomLeftEdge: 40,
      topRightEdge: 60,
      topLeftEdge: 61,
    };


    groundLayer.putTileAt(57, 5, 4);
    groundLayer.putTileAt(78, 5, 5);
    groundLayer.putTileAt(60, 6, 4);
    // Horizontal path from house to right
    let x;
    for (x = 7; x < 18; x++) {
      groundLayer.putTileAt(groundTiles.top, x, 4);
      groundLayer.putTileAt(groundTiles.bottom, x - 1, 5);
    }

    groundLayer.putTileAt(groundTiles.topRightCorner, x, 4);
    groundLayer.putTileAt(groundTiles.right, x, 5);
    groundLayer.putTileAt(groundTiles.bottomLeftEdge, --x, 5);

    // Vertical path down the right side
    let y;
    for (y = 6; y < 20; y++) {
      groundLayer.putTileAt(groundTiles.left, x, y);
      groundLayer.putTileAt(groundTiles.right, x + 1, y);
    }

    groundLayer.putTileAt(groundTiles.left, x, y++);
    groundLayer.putTileAt(groundTiles.bottomLeftCorner, x++, y);
    groundLayer.putTileAt(groundTiles.topRightEdge, x, y - 1);

    // Horizontal path back left at the bottom
    for (; x < 40; x++) {
      groundLayer.putTileAt(groundTiles.top, x + 1, y - 1);
      groundLayer.putTileAt(groundTiles.bottom, x, y);
    }

    // =========================================
    // Farming Area (Center)
    // =========================================
    const dirtTile = 58;
    const farmPlot = {
      x: 2,
      y: 9,
      width: 10,
      height: 8
    };

    const startX = farmPlot.x;
    const startY = farmPlot.y;

    const endX = startX + farmPlot.width - 1;
    const endY = startY + farmPlot.height - 1;

    // =========================================
    // Fill Dirt
    // =========================================

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        groundLayer.putTileAt(dirtTile, x, y);
      }
    }

    // =========================================
    // Ground Border Top + Bottom
    // =========================================

    for (let x = startX; x <= endX; x++) {
      groundLayer.putTileAt(
        groundTiles.top,
        x,
        startY - 1
      );

      groundLayer.putTileAt(
        groundTiles.bottom,
        x,
        endY + 1
      );
    }

    // =========================================
    // Ground Border Left + Right
    // =========================================

    for (let y = startY; y <= endY; y++) {
      groundLayer.putTileAt(
        groundTiles.left,
        startX - 1,
        y
      );

      groundLayer.putTileAt(
        groundTiles.right,
        endX + 1,
        y
      );
    }

    // =========================================
    // Corners
    // =========================================

    groundLayer.putTileAt(
      groundTiles.topLeftCorner,
      startX - 1,
      startY - 1
    );

    groundLayer.putTileAt(
      groundTiles.topRightCorner,
      endX + 1,
      startY - 1
    );

    groundLayer.putTileAt(
      groundTiles.bottomLeftCorner,
      startX - 1,
      endY + 1
    );

    groundLayer.putTileAt(
      groundTiles.bottomRightCorner,
      endX + 1,
      endY + 1
    );

    // Top Fence

    for (let x = startX - 1; x <= endX + 1; x++) {
      obstacleLayer.putTileAt(
        fenceTile.horizontalBrokenUp,
        x,
        startY - 2
      );
    }

    // Bottom Fence

    for (let x = startX - 1; x <= endX + 1; x++) {
      obstacleLayer.putTileAt(
        fenceTile.horizontalBrokenUp,
        x,
        endY + 2
      );
    }


    // Pond
    const pondTiles = [
      [175, 199, 199, 199, 199, 199, 199, 199, 199, 199, 199, 199, 199, 174],
      [180, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 156],
      [180, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 156],
    ].map(row => row.map(NAT));

    const pondEco = {
      lotus: NAT(162),
      lilyPad: NAT(161),
      waterStoneXS: NAT(122),
      waterStoneL: NAT(124),
      bubbles: NAT(163),
      waterStoneWithMossXL: [
        [NAT(119), NAT(120)],
        [NAT(140), NAT(141)]
      ],
      waterBamboo: NAT(74),
    }

    const bridgeTiles = [
      [183, 184, 184, 185],
      [208, 209, 209, 210],
      [233, 234, 234, 235]
    ].map(row => row.map(EXT));

    groundLayer.putTilesAt(pondTiles, 1, MAP_SIZE_Y - 3);
    backgroundLayer.putTilesAt(bridgeTiles, pondTiles[0].length - 3, MAP_SIZE_Y - 2);
    backgroundLayer.putTileAt(pondEco.bubbles, 4, MAP_SIZE_Y - 2);
    backgroundLayer.putTileAt(pondEco.lilyPad, 2, MAP_SIZE_Y - 1);
    backgroundLayer.putTileAt(pondEco.lotus, 3, MAP_SIZE_Y - 1);
    backgroundLayer.putTilesAt(
      pondEco.waterStoneWithMossXL,
      2,
      MAP_SIZE_Y - 3
    );
    backgroundLayer.putTileAt(pondEco.lotus, 8, MAP_SIZE_Y - 2);
    backgroundLayer.putTileAt(pondEco.waterBamboo, 10, MAP_SIZE_Y - 2);

    treeLayer.putTilesAt(treeTiles.pineSingle, 13, MAP_SIZE_Y - 5);
    detailLayer.putTileAt(details.flower2, 14, MAP_SIZE_Y - 3);

    detailLayer.putTilesAt(details.grassGroupS, 15, MAP_SIZE_Y - 2);

    obstacleLayer.putTilesAt(details.lampPost, 15, MAP_SIZE_Y - 4);

    obstacleLayer.putTilesAt(details.noticeBoard, 19, MAP_SIZE_Y - 4);


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
