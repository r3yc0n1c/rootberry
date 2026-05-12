import Phaser from 'phaser'
import NetworkManager from '../managers/NetworkManager'
import Player from '../entities/Player'
import InventoryManager from '../managers/InventoryManager'
import InventoryDock from '../ui/InventoryDock'

const TILE = 16
const SCALE = 2

const KEY_CONFIG = {
  UP: Phaser.Input.Keyboard.KeyCodes.W,
  DOWN: Phaser.Input.Keyboard.KeyCodes.S,
  LEFT: Phaser.Input.Keyboard.KeyCodes.A,
  RIGHT: Phaser.Input.Keyboard.KeyCodes.D,
  ACTION: Phaser.Input.Keyboard.KeyCodes.E,
  INVENTORY: Phaser.Input.Keyboard.KeyCodes.I,
  RUN: Phaser.Input.Keyboard.KeyCodes.SHIFT,
  ITEM_1: Phaser.Input.Keyboard.KeyCodes.ONE,
  ITEM_2: Phaser.Input.Keyboard.KeyCodes.TWO,
  ITEM_3: Phaser.Input.Keyboard.KeyCodes.THREE,
  ITEM_4: Phaser.Input.Keyboard.KeyCodes.FOUR,
  ITEM_5: Phaser.Input.Keyboard.KeyCodes.FIVE,
  ITEM_6: Phaser.Input.Keyboard.KeyCodes.SIX,
}

export default class FarmScene extends Phaser.Scene {
  private worldConfig: any
  players: Map<string, Player> = new Map()
  private isMoving = false
  private isActing = false
  private controls!: Record<keyof typeof KEY_CONFIG, Phaser.Input.Keyboard.Key>

  private farmingLayer!: Phaser.Tilemaps.TilemapLayer
  private cropLayer!: Phaser.Tilemaps.TilemapLayer
  private detailLayer!: Phaser.Tilemaps.TilemapLayer
  private obstacleLayer!: Phaser.Tilemaps.TilemapLayer
  private treeLayer!: Phaser.Tilemaps.TilemapLayer
  private houseLayer!: Phaser.Tilemaps.TilemapLayer
  private groundLayer!: Phaser.Tilemaps.TilemapLayer
  private backgroundLayer!: Phaser.Tilemaps.TilemapLayer

  private lastSentPos = { x: -1, y: -1 }
  private lastWorldHash = ''

  // Farm plot boundaries
  private farmPlot!: {
    x: number
    y: number
    width: number
    height: number
  }

  private farmTiles = new Set<string>()

  // === Inventory system (fixed HUD layer) ===
  private inventoryManager!: InventoryManager
  private inventoryDock!: InventoryDock

  constructor() {
    super('FarmScene')
  }

  init(data: any) {
    this.worldConfig = data.world
  }

  create() {
    if (!this.worldConfig) {
      console.error("Missing worldConfig!")
      return
    }

    this.controls = this.input.keyboard!.addKeys(KEY_CONFIG) as any

    // --- A. TILEMAP SETUP ---
    const MAP_SIZE_X = this.worldConfig.width
    const MAP_SIZE_Y = this.worldConfig.height
    const worldPx = MAP_SIZE_X * TILE * SCALE
    const worldPy = MAP_SIZE_Y * TILE * SCALE

    const map = this.make.tilemap({
      width: MAP_SIZE_X,
      height: MAP_SIZE_Y,
      tileWidth: TILE,
      tileHeight: TILE,
    })

    // --- ASSET LOADING ---
    const grassTileset = map.addTilesetImage('grass', 'grass')
    const natureTileset = map.addTilesetImage('nature', 'nature')
    const cropTileset = map.addTilesetImage('crops', 'crops')
    const exteriorTileset = map.addTilesetImage(
      'exterior',
      'exterior',
      16,
      16,
      0,
      0,
      natureTileset!.total
    )
    const houseTileset = map.addTilesetImage(
      'house',
      'house',
      16,
      16,
      0,
      0,
      natureTileset!.total + exteriorTileset!.total
    )
    const floorDetailsTileset = map.addTilesetImage(
      'floor_details',
      'floor_details',
      16,
      16,
      0,
      0,
      natureTileset!.total + exteriorTileset!.total
    )

    if (
      !grassTileset ||
      !exteriorTileset ||
      !natureTileset ||
      !cropTileset ||
      !houseTileset ||
      !floorDetailsTileset
    ) {
      console.error("Missing Tilesets! Check AssetManager.")
      return
    }

    // --- B. LAYER SETUP ---
    this.groundLayer =
      map.createBlankLayer('Ground', grassTileset)!.setScale(SCALE).setDepth(0)

    this.farmingLayer =
      map.createBlankLayer('Farming', cropTileset)!.setScale(SCALE).setDepth(1)
    this.cropLayer =
      map.createBlankLayer('Crops', cropTileset)!.setScale(SCALE).setDepth(2)

    this.backgroundLayer =
      map
        .createBlankLayer('BackgroundDecor', [natureTileset, exteriorTileset])!
        .setScale(SCALE)
        .setDepth(2.5)

    this.obstacleLayer =
      map
        .createBlankLayer('Obstacles', [exteriorTileset, houseTileset])!
        .setScale(SCALE)
        .setDepth(3)

    this.treeLayer =
      map
        .createBlankLayer('Trees', [natureTileset])!
        .setScale(SCALE)
        .setDepth(3.1)

    this.houseLayer =
      map
        .createBlankLayer('House', [houseTileset])!
        .setScale(SCALE)
        .setDepth(3.2)

    this.detailLayer =
      map
        .createBlankLayer('Details', [houseTileset, floorDetailsTileset])!
        .setScale(SCALE)
        .setDepth(3.3)

    // Helpers
    const NAT = (i: number) => natureTileset.firstgid + i
    const EXT = (i: number) => exteriorTileset.firstgid + i
    const HOUSE = (i: number) => houseTileset.firstgid + i
    const FLOOR = (i: number) => floorDetailsTileset.firstgid + i

    const details = {
      flower1: FLOOR(13),
      flower2: FLOOR(24),
      tillableDirt: FLOOR(37),
      grassTileSet: {
        grass: 73,
      },
      grassGroupL: [
        [FLOOR(17), FLOOR(18)],
        [FLOOR(28), FLOOR(29)],
      ],
      grassGroupS: [
        [FLOOR(19), FLOOR(20)],
        [FLOOR(30), FLOOR(31)],
      ],
      lampPost: [
        [EXT(39), EXT(40)],
        [EXT(64), EXT(65)],
      ],
      noticeBoard: [
        [EXT(47), EXT(48)],
        [EXT(72), EXT(73)],
      ],
    }

    // =========================================
    // --- E. GENERATE WORLD (procedural) ---
    // =========================================
    this.groundLayer.fill(details.grassTileSet.grass)

    const fenceTile = {
      verticalLeft: EXT(55),
      verticalRight: EXT(57),
      horizontal: EXT(81),
      topLeftCorner: EXT(30),
      topRightCorner: EXT(32),
      bottomLeftCorner: EXT(80),
      bottomRightCorner: EXT(82),
      horizontalBrokenUp: EXT(33),
      horizontalBrokendown: EXT(83),
    }

    this.obstacleLayer.putTileAt(fenceTile.topLeftCorner, 0, 0)
    for (let x = 1; x < MAP_SIZE_X; x++) {
      this.obstacleLayer.putTileAt(fenceTile.horizontal, x, 0)
    }
    for (let y = 1; y < MAP_SIZE_Y; y++) {
      this.obstacleLayer.putTileAt(fenceTile.verticalLeft, 0, y)
    }

    // THE HOUSE
    const houseX = 3
    const houseY = 1
    const roofTiles = [
      [51, 51, 42, 51, 51],
      [44, 53, 118, 54, 45],
      [82, 91, 81, 92, 83],
      [120, 129, 119, 130, 121],
      [115, 209, 111, 209, 116],
    ].map((row) => row.map(HOUSE))

    this.houseLayer.putTilesAt(roofTiles, houseX, houseY - 2)
    this.detailLayer.putTileAt(HOUSE(68), houseX + 2, houseY + 1)
    this.detailLayer.putTileAt(HOUSE(377), houseX + 2, houseY + 2)
    this.detailLayer.putTileAt(HOUSE(182), houseX + 1, houseY + 2)
    this.detailLayer.putTileAt(HOUSE(182), houseX + 3, houseY + 2)

    // trees
    const treeTiles = {
      pineGroup: [
        [90, 91, 92, 93],
        [111, 112, 113, 114],
        [132, 133, 134, 135],
      ].map((row) => row.map(NAT)),
      pineSingle: [
        [45, 46],
        [66, 67],
      ].map((row) => row.map(NAT)),
      bigTree: [
        [22, 23],
        [43, 44],
        [64, 65],
      ].map((row) => row.map(NAT)),
    }

    const wellTiles = [
      [135, 136],
      [160, 161],
    ].map((row) => row.map(EXT))

    this.treeLayer.putTilesAt(treeTiles.pineGroup, 0, 0)
    this.treeLayer.putTilesAt(treeTiles.pineSingle, 7, 0)
    this.backgroundLayer.putTilesAt(wellTiles, 8, MAP_SIZE_Y - 3)

    this.backgroundLayer.putTileAt(NAT(153), 1, 3)
    this.backgroundLayer.putTileAt(NAT(39), 1, 4)
    this.backgroundLayer.putTileAt(EXT(70), 2, 3)
    this.treeLayer.putTilesAt(treeTiles.bigTree, 1, 4)

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
    }

    this.groundLayer.putTileAt(57, 5, 4)
    this.groundLayer.putTileAt(78, 5, 5)
    this.groundLayer.putTileAt(60, 6, 4)

    let x: number, y: number
    for (x = 7; x < 18; x++) {
      this.groundLayer.putTileAt(groundTiles.top, x, 4)
      this.groundLayer.putTileAt(groundTiles.bottom, x - 1, 5)
    }

    this.groundLayer.putTileAt(groundTiles.topRightCorner, x, 4)
    this.groundLayer.putTileAt(groundTiles.right, x, 5)
    this.groundLayer.putTileAt(groundTiles.bottomLeftEdge, --x, 5)

    for (y = 6; y < 20; y++) {
      this.groundLayer.putTileAt(groundTiles.left, x, y)
      this.groundLayer.putTileAt(groundTiles.right, x + 1, y)
    }

    this.groundLayer.putTileAt(groundTiles.left, x, y++)
    this.groundLayer.putTileAt(groundTiles.bottomLeftCorner, x++, y)
    this.groundLayer.putTileAt(groundTiles.topRightEdge, x, y - 1)

    for (; x < 40; x++) {
      this.groundLayer.putTileAt(groundTiles.top, x + 1, y - 1)
      this.groundLayer.putTileAt(groundTiles.bottom, x, y)
    }

    // =========================================
    // Farming Area (Center)
    // =========================================
    const DIRT = 58
    this.farmPlot = {
      x: 4,
      y: 9,
      width: 9,
      height: 7,
    }

    const startX = this.farmPlot.x
    const startY = this.farmPlot.y
    const endX = startX + this.farmPlot.width - 1
    const endY = startY + this.farmPlot.height - 1

    for (let y2 = startY; y2 <= endY; y2++) {
      for (let x2 = startX; x2 <= endX; x2++) {
        const isFarmSpot =
          (x2 - startX) % 2 === 0 && (y2 - startY) % 2 === 0
        if (isFarmSpot) {
          this.detailLayer.putTileAt(details.tillableDirt, x2, y2)
        }
        this.groundLayer.putTileAt(DIRT, x2, y2)
        if (isFarmSpot) {
          this.farmTiles.add(`${x2},${y2}`)
        }
      }
    }

    this.farmPlot = {
      x: startX,
      y: startY,
      width: this.farmPlot.width,
      height: this.farmPlot.height,
    }

    // Borders
    for (let x2 = startX; x2 <= endX; x2++) {
      this.groundLayer.putTileAt(groundTiles.top, x2, startY - 1)
      this.groundLayer.putTileAt(groundTiles.bottom, x2, endY + 1)
    }
    for (let y2 = startY; y2 <= endY; y2++) {
      this.groundLayer.putTileAt(groundTiles.left, startX - 1, y2)
      this.groundLayer.putTileAt(groundTiles.right, endX + 1, y2)
    }
    this.groundLayer.putTileAt(groundTiles.topLeftCorner, startX - 1, startY - 1)
    this.groundLayer.putTileAt(groundTiles.topRightCorner, endX + 1, startY - 1)
    this.groundLayer.putTileAt(groundTiles.bottomLeftCorner, startX - 1, endY + 1)
    this.groundLayer.putTileAt(
      groundTiles.bottomRightCorner,
      endX + 1,
      endY + 1
    )

    // Top Fence
    for (let x2 = startX - 1; x2 <= endX + 1; x2++) {
      this.obstacleLayer.putTileAt(fenceTile.horizontalBrokenUp, x2, startY - 2)
    }
    // Bottom Fence
    for (let x2 = startX - 1; x2 <= endX + 1; x2++) {
      this.obstacleLayer.putTileAt(fenceTile.horizontalBrokenUp, x2, endY + 2)
    }

    // Pond
    const pondTiles = [
      [175, 199, 199, 199, 199, 199, 199, 199, 199, 199, 199, 199, 199, 174],
      [180, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 156],
      [180, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 156],
    ].map((row) => row.map(NAT))

    const pondEco = {
      lotus: NAT(162),
      lilyPad: NAT(161),
      waterStoneXS: NAT(122),
      waterStoneL: NAT(124),
      bubbles: NAT(163),
      waterStoneWithMossXL: [
        [NAT(119), NAT(120)],
        [NAT(140), NAT(141)],
      ],
      waterBamboo: NAT(74),
    }

    const bridgeTiles = [
      [183, 184, 184, 185],
      [208, 209, 209, 210],
      [233, 234, 234, 235],
    ].map((row) => row.map(EXT))

    this.groundLayer.putTilesAt(pondTiles, 1, MAP_SIZE_Y - 3)
    this.backgroundLayer.putTilesAt(
      bridgeTiles,
      pondTiles[0].length - 3,
      MAP_SIZE_Y - 2
    )
    this.backgroundLayer.putTileAt(pondEco.bubbles, 4, MAP_SIZE_Y - 2)
    this.backgroundLayer.putTileAt(pondEco.lilyPad, 2, MAP_SIZE_Y - 1)
    this.backgroundLayer.putTileAt(pondEco.lotus, 3, MAP_SIZE_Y - 1)
    this.backgroundLayer.putTilesAt(
      pondEco.waterStoneWithMossXL,
      2,
      MAP_SIZE_Y - 3
    )
    this.backgroundLayer.putTileAt(pondEco.lotus, 8, MAP_SIZE_Y - 2)
    this.backgroundLayer.putTileAt(pondEco.waterBamboo, 10, MAP_SIZE_Y - 2)

    this.treeLayer.putTilesAt(treeTiles.pineSingle, 14, MAP_SIZE_Y - 6)
    this.treeLayer.putTilesAt(treeTiles.pineSingle, 1, MAP_SIZE_Y - 6)

    this.detailLayer.putTileAt(details.flower2, 14, MAP_SIZE_Y - 3)
    this.detailLayer.putTilesAt(details.grassGroupS, 15, MAP_SIZE_Y - 2)
    this.obstacleLayer.putTilesAt(details.lampPost, 15, MAP_SIZE_Y - 4)
    this.obstacleLayer.putTilesAt(details.noticeBoard, 19, MAP_SIZE_Y - 4)

    // --- G. FINALIZE SETUP ---
    this.cameras.main.setBounds(0, 0, worldPx, worldPy)
    this.cameras.main.setZoom(1)

    const spawnPxX = this.worldConfig.spawn.x * TILE * SCALE
    const spawnPxY = this.worldConfig.spawn.y * TILE * SCALE
    this.cameras.main.centerOn(spawnPxX, spawnPxY)

    // Start network synchronization loop
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.syncWorld(),
    })

    // =============================================
    // H. INVENTORY HUD — Fixed overlay on camera
    // =============================================
    this.inventoryManager = new InventoryManager()
    this.inventoryDock = new InventoryDock(this, this.inventoryManager)

    // The dock container is already set with setScrollFactor(0) so it stays
    // fixed on screen while the camera pans the world below it.
    // Depth 1000 ensures it renders above all world layers.
  }

  syncWorld() {
    const world = NetworkManager.worldState
    const myId = NetworkManager.playerId

    if (!world || !world.players) return

    const hash = JSON.stringify(world.tiles)
    if (hash !== this.lastWorldHash) {
      this.renderWorldFromServer(world)
      this.lastWorldHash = hash
    }

    const activeIds = new Set(Object.keys(world.players))

    this.players.forEach((sprite, id) => {
      if (!activeIds.has(id) && id !== myId) {
        sprite.destroy()
        this.players.delete(id)
      }
    })

    Object.values(world.players).forEach((p: any) => {
      const targetX = p.x * TILE * SCALE
      const targetY = p.y * TILE * SCALE

      if (!this.players.has(p.id)) {
        let spawnX = p.x
        let spawnY = p.y

        if (!spawnX || !spawnY) {
          spawnX = this.worldConfig.spawn.x
          spawnY = this.worldConfig.spawn.y
        }

        const newPlayerTargetX = spawnX * TILE * SCALE
        const newPlayerTargetY = spawnY * TILE * SCALE

        const playerInstance = new Player(
          this,
          newPlayerTargetX,
          newPlayerTargetY,
          p.id
        )
        this.players.set(p.id, playerInstance)

        if (p.id === myId) {
          this.cameras.main.startFollow(playerInstance, true, 0.2, 0.2)
          this.cameras.main.setDeadzone(50, 50)
          this.lastSentPos = { x: p.x, y: p.y }
        }
      }

      const sprite = this.players.get(p.id)
      if (!sprite) return

      if (p.id === myId) {
        if (!this.isMoving) {
          const dist = Phaser.Math.Distance.Between(
            sprite.x,
            sprite.y,
            targetX,
            targetY
          )
          if (dist > TILE * SCALE * 1.5) {
            sprite.setPosition(targetX, targetY)
            this.lastSentPos = { x: p.x, y: p.y }
          }
        }
        return
      }

      const isMoving =
        Math.abs(sprite.x - targetX) > 2 || Math.abs(sprite.y - targetY) > 2

      let dir = sprite.lastDir
      if (targetX > sprite.x) dir = 'right'
      else if (targetX < sprite.x) dir = 'left'
      else if (targetY > sprite.y) dir = 'up'
      else if (targetY < sprite.y) dir = 'down'

      sprite.updateDirection(dir, isMoving)

      this.tweens.killTweensOf(sprite)

      if (isMoving) {
        this.tweens.killTweensOf(sprite)

        this.tweens.add({
          targets: sprite,
          x: targetX,
          y: targetY,
          duration: 100,
          onStart: () => sprite.updateDirection(dir, true),
          onComplete: () => sprite.updateDirection(dir, false),
        })
      } else {
        sprite.setPosition(targetX, targetY)
        sprite.updateDirection(sprite.lastDir, false)
      }
    })
  }

  update() {
    const world = NetworkManager.worldState
    const playerId = NetworkManager.playerId

    if (
      !world ||
      !world.players ||
      !playerId ||
      this.isMoving ||
      this.isActing
    )
      return

    const me = world.players[playerId]
    const mySprite = this.players.get(playerId)
    if (!me || !mySprite || this.isMoving) return

    // --- Hotkeys 1-6 → inventory dock forwards to InventoryManager ---
    // (handled by InventoryDock.setupEventListeners in the constructor)

    // --- Action (E key) ---
    if (Phaser.Input.Keyboard.JustDown(this.controls.ACTION)) {
      this.handleAction(mySprite)
      return
    }

    // --- Movement ---
    let { x, y } = this.lastSentPos
    let moved = false
    let direction = mySprite.lastDir

    if (this.controls.LEFT.isDown) {
      x--
      moved = true
      direction = 'left'
    } else if (this.controls.RIGHT.isDown) {
      x++
      moved = true
      direction = 'right'
    } else if (this.controls.UP.isDown) {
      y--
      moved = true
      direction = 'up'
    } else if (this.controls.DOWN.isDown) {
      y++
      moved = true
      direction = 'down'
    }

    if (moved) {
      if (this.canMoveTo(x, y)) {
        this.lastSentPos = { x, y }
        this.handleMovement(x, y, direction, mySprite)
      } else {
        mySprite.updateDirection(direction, false)
      }
    }
  }

  private canMoveTo(tx: number, ty: number): boolean {
    return tx > 0 && tx < this.worldConfig.width && ty > 0 && ty < this.worldConfig.height
  }

  private handleMovement(nextX: number, nextY: number, direction: string, sprite: Player) {
    this.isMoving = true

    const targetPxX = nextX * TILE * SCALE
    const targetPxY = nextY * TILE * SCALE

    const isRunning = this.controls.RUN.isDown
    const duration = isRunning ? 80 : 200

    this.tweens.add({
      targets: sprite,
      x: targetPxX,
      y: targetPxY,
      duration,
      ease: 'Linear',
      onStart: () => sprite.updateDirection(direction, true),
      onComplete: () => {
        this.isMoving = false
        const anyKeyDown =
          this.controls.LEFT.isDown ||
          this.controls.RIGHT.isDown ||
          this.controls.UP.isDown ||
          this.controls.DOWN.isDown
        if (!anyKeyDown) sprite.updateDirection(direction, false)
      },
    })

    NetworkManager.send({ type: 'move', x: nextX, y: nextY })
  }

  private isFarmTile(x: number, y: number): boolean {
    return this.farmTiles.has(`${x},${y}`)
  }

  /**
   * Return the id of the currently selected inventory item, or null.
   */
  private getSelectedItemId(): string | null {
    return this.inventoryManager.getSelectedItem()?.id ?? null
  }

  private handleAction(player: Player) {
    const targetTile = player.getFacingTile()

    if (!this.isFarmTile(targetTile.x, targetTile.y)) {
      return
    }

    const world = NetworkManager.worldState
    if (!world) return

    const tile = world.tiles[targetTile.y]?.[targetTile.x]
    if (!tile) return

    const equipped = this.getSelectedItemId()

    // =====================================
    // HOE (till) — default or explicit
    // =====================================
    if (
      (equipped === 'item_hoe' || equipped === null) &&
      tile.type === 'farm'
    ) {
      console.log(`[Action] Tilling tile at (${targetTile.x}, ${targetTile.y})`)
      this.isActing = true
      player.play(`bunny-hoe-${player.lastDir}`)

      player.once(
        Phaser.Animations.Events.ANIMATION_COMPLETE,
        () => {
          player.play(`bunny-idle-${player.lastDir}`)
          this.isActing = false
        }
      )

      this.time.delayedCall(250, () => {
        NetworkManager.send({
          type: 'till',
          x: targetTile.x,
          y: targetTile.y,
        })
      })

      return
    }

    // =====================================
    // WATER
    // =====================================
    if (equipped === 'item_watering_can' && tile.type === 'tilled' && !tile.watered) {
      console.log(`[Action] Watering tile at (${targetTile.x}, ${targetTile.y})`)
      this.isActing = true
      player.play(`bunny-wateringcan-${player.lastDir}`)

      player.once(
        Phaser.Animations.Events.ANIMATION_COMPLETE,
        () => {
          player.play(`bunny-idle-${player.lastDir}`)
          this.isActing = false
        }
      )

      this.time.delayedCall(250, () => {
        NetworkManager.send({
          type: 'water',
          x: targetTile.x,
          y: targetTile.y,
        })
      })

      return
    }

    // =====================================
    // PLANT (seed)
    // =====================================
    if (
      equipped &&
      equipped.includes('seed') &&
      tile.type === 'tilled' &&
      !tile.crop
    ) {
      console.log(`[Action] Planting ${equipped} at (${targetTile.x}, ${targetTile.y})`)
      this.isActing = true

      NetworkManager.send({
        type: 'plant',
        x: targetTile.x,
        y: targetTile.y,
        cropType: equipped,
      })

      // Consume the seed after successful action
      this.time.delayedCall(200, () => {
        this.isActing = false
        this.inventoryManager.consumeItem(equipped)
      })

      return
    }

    // =====================================
    // HARVEST (no tool required)
    // =====================================
    if (tile.crop && tile.crop.growth >= tile.crop.maxGrowth) {
      console.log(`[Action] Harvesting crop at (${targetTile.x}, ${targetTile.y})`)
      this.isActing = true

      NetworkManager.send({
        type: 'harvest',
        x: targetTile.x,
        y: targetTile.y,
      })

      this.time.delayedCall(200, () => {
        this.isActing = false
      })
    } else if (equipped && equipped.includes('seed') && tile.type === 'tilled' && tile.crop) {
      console.log(`[Action] Cannot plant: tile already has crop at (${targetTile.x}, ${targetTile.y})`)
    } else if (equipped && equipped.includes('seed') && tile.type !== 'tilled') {
      console.log(`[Action] Cannot plant: tile not tilled at (${targetTile.x}, ${targetTile.y})`)
    }
  }

  private renderWorldFromServer(world: any) {
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.tiles[y][x]

        if (tile.type === 'tilled') {
          this.detailLayer.removeTileAt(x, y)
          this.farmingLayer.putTileAt(
            tile.watered ? 158 : 157,
            x,
            y
          )
        } else {
          this.farmingLayer.removeTileAt(x, y)
        }

        if (tile.crop) {
          const cropType = tile.crop.type
          const isWatered = tile.watered
          const growth = tile.crop.growth
          let tileId: number

          // Show sapling if growth > 0 (has been watered at least once)
          if (growth > 0) {
            // Sapling grown (watered)
            switch (cropType) {
              case 'carrot': tileId = 25; break
              case 'cabbage': tileId = 26; break
              case 'pumpkin': tileId = 27; break
              case 'strawberry': tileId = 28; break
              default: tileId = 1
            }
          } else {
            // Seed planted (not yet watered)
            switch (cropType) {
              case 'carrot': tileId = 13; break
              case 'cabbage': tileId = 14; break
              case 'pumpkin': tileId = 15; break
              case 'strawberry': tileId = 16; break
              default: tileId = 1
            }
          }
          this.cropLayer.putTileAt(tileId, x, y)
        } else {
          this.cropLayer.removeTileAt(x, y)
        }
      }
    }
  }
}