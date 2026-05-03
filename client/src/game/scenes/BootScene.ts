import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload() {
    // Load tilesets
    this.load.image(
      'grass',
      '/src/assets/tiles/Autotile_Grass_and_Dirt_Path_Tileset.png'
    )

    this.load.image(
      'crops',
      '/src/assets/crops/Crops_Tileset.png'
    )

    // Load bunny spritesheets
    this.load.spritesheet(
      'bunny_idle',
      '/src/assets/bunny/IDLE/Bunny_Idle.png',
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    ).on('fileerror', (file: any) => {
      console.error('Failed to load bunny_idle spritesheet:', file)
    }).on('load', () => {
      console.log('Bunny idle spritesheet loaded successfully')
    })

    this.load.spritesheet(
      'bunny_run',
      '/src/assets/bunny/RUN/Bunny_Run.png',
      {
        frameWidth: 32,
        frameHeight: 32,
      }
    ).on('fileerror', (file: any) => {
      console.error('Failed to load bunny_run spritesheet:', file)
    }).on('load', () => {
      console.log('Bunny run spritesheet loaded successfully')
    })

    // Error handling
    this.load.on('fileerror', (file: any) => {
      console.error('Asset load error:', file)
    })
    
    this.load.on('complete', () => {
      console.log('All assets loaded successfully')
    })
  }

  create() {
    this.scene.start('FarmScene')
    this.scene.launch('UIScene')
  }

  render() {
    // Debug rendering - can be enabled for troubleshooting
    // this.add.graphics().fillStyle(0xff0000).fillRect(0, 0, 32, 32)
  }
}