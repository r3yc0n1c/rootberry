import Phaser from 'phaser'
import NetworkManager from '../managers/NetworkManager'
import Player from '../entities/Player'

const TILE = 16
const SCALE = 2 // Define scale once to keep math consistent

export default class FarmScene extends Phaser.Scene {
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  players: Map<string, Player> = new Map()

  constructor() {
    super('FarmScene')
  }

  create() {
    NetworkManager.connect()
    this.cursors = this.input.keyboard!.createCursorKeys()

    // 1. Calculate how many 32px tiles fit in the current view
    // We use Math.ceil to ensure the grass fills the edges completely
    const tilesInWidth = Math.ceil(this.scale.width / (TILE * SCALE));
    const tilesInHeight = Math.ceil(this.scale.height / (TILE * SCALE));

    // 1. Setup the Map
    const map = this.make.tilemap({
      width: tilesInWidth,
      height: tilesInHeight,
      tileWidth: TILE,
      tileHeight: TILE
    })

    const grassTileset = map.addTilesetImage('grass', 'grass')

    if (grassTileset) {
      const grassLayer = map.createBlankLayer('ground', grassTileset)
      
      const width = map.width;  
      const height = map.height;

      // Fill with your border logic
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let tileIndex: number;
          if (x === 0 && y === 0) tileIndex = 36;
          else if (x === width - 1 && y === 0) tileIndex = 38;
          else if (x === 0 && y === height - 1) tileIndex = 78;
          else if (x === width - 1 && y === height - 1) tileIndex = 80;
          else if (y === 0) tileIndex = 37;
          else if (y === height - 1) tileIndex = 79;
          else if (x === 0) tileIndex = 57;
          else if (x === width - 1) tileIndex = 59;
          else tileIndex = 58;

          grassLayer?.putTileAt(tileIndex, x, y);
        }
      }
      
      // Scale the layer to 2x
      grassLayer?.setScale(SCALE);
      grassLayer?.setDepth(-1);

      // 2. Setup Camera Bounds (The scaled size: 1600x1600)
      const totalWorldWidth = map.widthInPixels * SCALE;
      const totalWorldHeight = map.heightInPixels * SCALE;

      // This is the ONLY setBounds call you need
      this.cameras.main.setBounds(0, 0, totalWorldWidth, totalWorldHeight);
      this.cameras.main.setBackgroundColor('#2d2d2d');
    }

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.syncWorld(),
    })
  }

  syncWorld() {
    const world = NetworkManager.worldState
    if (!world || !world.Players) return

    const localPlayerId = Object.keys(world.Players)[0]

    Object.values(world.Players).forEach((p: any) => {
      // Multiply server coordinates by TILE and SCALE
      const targetX = p.x * TILE * SCALE;
      const targetY = p.y * TILE * SCALE;

      if (!this.players.has(p.id)) {
        const player = new Player(this, targetX, targetY, p.id)
        this.add.existing(player)
        player.setDepth(10)
        player.setScale(SCALE) // Scale the player sprite too
        
        this.players.set(p.id, player)

        if (p.id === localPlayerId) {
          // startFollow will respect the 1600x1600 bounds we set in create()
          this.cameras.main.startFollow(player, true, 0.1, 0.1)
        }
      }

      const player = this.players.get(p.id)
      if (player) {
        player.setPosition(targetX, targetY)
      }
    })
  }

  update() {
    const world = NetworkManager.worldState
    if (!world || !world.Players || !this.cursors) return

    const players = Object.values(world.Players)
    if (players.length === 0) return

    // Identify local player (assuming index 0 is 'me')
    const me = players[0] as any
    let x = me.x
    let y = me.y
    let moved = false

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
      x--
      moved = true
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
      x++
      moved = true
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
      y--
      moved = true
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
      y++
      moved = true
    }

    if (moved) {
      NetworkManager.send({
        type: 'move',
        x,
        y,
      })
    }
  }
}
