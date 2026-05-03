import Phaser from 'phaser'
import NetworkManager from '../managers/NetworkManager'
import Player from '../entities/Player'

const TILE = 16

export default class FarmScene extends Phaser.Scene {
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  players: Map<string, Player> = new Map()

  constructor() {
    super('FarmScene')
  }

  create() {
    NetworkManager.connect()
    this.cursors = this.input.keyboard!.createCursorKeys()

    // 1. Setup the Map
    const map = this.make.tilemap({
      width: 50,
      height: 50,
      tileWidth: TILE,
      tileHeight: TILE
    })

    const grassTileset = map.addTilesetImage('grass', 'grass')

    if (grassTileset) {
      const grassLayer = map.createBlankLayer('ground', grassTileset)
      
      const width = map.width;  // 50
      const height = map.height; // 50

      for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
              let tileIndex: number;

              // 1. Corners
              if (x === 0 && y === 0) {
                  tileIndex = 36; // Top Left
              } else if (x === width - 1 && y === 0) {
                  tileIndex = 38; // Top Right
              } else if (x === 0 && y === height - 1) {
                  tileIndex = 78; // Bottom Left
              } else if (x === width - 1 && y === height - 1) {
                  tileIndex = 80; // Bottom Right
              }
              // 2. Edges
              else if (y === 0) {
                  tileIndex = 37; // Top Edge
              } else if (y === height - 1) {
                  tileIndex = 79; // Bottom Edge
              } else if (x === 0) {
                  tileIndex = 57; // Left Edge
              } else if (x === width - 1) {
                  tileIndex = 59; // Right Edge
              }
              // 3. Center Fill
              else {
                  tileIndex = 58; // Center Fill
              }

              grassLayer?.putTileAt(tileIndex, x, y);
          }
      }
      
      // Scale the ground to 2x
      grassLayer?.setScale(2);
      grassLayer?.setDepth(-1);

      // map.widthInPixels is 800. We need 1600.
      const totalWorldWidth = map.widthInPixels * 2;
      const totalWorldHeight = map.heightInPixels * 2;

      // Apply these bounds to the camera
      this.cameras.main.setBounds(0, 0, totalWorldWidth, totalWorldHeight);
      
      // Optional: Ensure the camera starts centered
      this.cameras.main.centerOn(totalWorldWidth / 2, totalWorldHeight / 2);
    }

    // 2. Camera setup
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    
    // Add a dark background color so you can distinguish the world from "void"
    this.cameras.main.setBackgroundColor('#2d2d2d')

    // Scales everything the camera sees by 2x
    // this.cameras.main.setZoom(2);

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
      if (!this.players.has(p.id)) {
        const spawnX = p.x * TILE
        const spawnY = p.y * TILE
        
        const player = new Player(this, spawnX, spawnY, p.id)
        
        // CRITICAL: Ensure the player is added to the display list
        this.add.existing(player)
        player.setDepth(10)
        
        this.players.set(p.id, player)

        if (p.id === localPlayerId) {
          this.cameras.main.startFollow(player, true, 0.1, 0.1)
        }
      }

      const player = this.players.get(p.id)
      if (player) {
        player.setPosition(p.x * TILE, p.y * TILE)
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
