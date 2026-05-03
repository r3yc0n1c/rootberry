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

    this.load.spritesheet(
      'bunny_idle',
      '/src/assets/bunny/IDLE/Bunny_Idle.png',
      {
        frameWidth: 48,
        frameHeight: 48,
      }
    ).on('fileerror', (file: any) => {
      console.error('Failed to load bunny_idle spritesheet:', file)
    })

    this.load.spritesheet(
      'bunny_run',
      '/src/assets/bunny/RUN/Bunny_Run.png',
      {
        frameWidth: 48,
        frameHeight: 48,
      }
    ).on('fileerror', (file: any) => {
      console.error('Failed to load bunny_run spritesheet:', file)
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
    // Row 0 = Up, Row 1 = Right, Row 2 = Left, Row 3 = Down
    const directions = ['up', 'right', 'left', 'down'];
    const framesPerDirection = 5;

    directions.forEach((dir, index) => {
      this.anims.create({
        key: `bunny-idle-${dir}`,
        frames: this.anims.generateFrameNumbers('bunny_idle', {
          start: index * framesPerDirection,
          end: (index * framesPerDirection) + (framesPerDirection - 1)
        }),
        frameRate: 6,
        repeat: -1
      });
    });

    this.scene.start('FarmScene')
    this.scene.launch('UIScene')
  }

  render() {
    // Debug rendering - can be enabled for troubleshooting
    // this.add.graphics().fillStyle(0xff0000).fillRect(0, 0, 32, 32)
  }
}