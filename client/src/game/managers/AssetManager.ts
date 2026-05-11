import Phaser from 'phaser';

export default class AssetManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Centralized method to load all game assets
   */
  public loadAll(): void {

    // Load tilesets
    this.scene.load.image(
      'grass',
      '/src/assets/tiles/Autotile_Grass_and_Dirt_Path_Tileset.png'
    )
    this.scene.load.image('nature', '/src/assets/tiles/Nature_Tileset.png')
    this.scene.load.image('exterior', '/src/assets/tiles/Exterior_Tileset.png')
    this.scene.load.image('house', '/src/assets/tiles/House_Tileset.png')
    this.scene.load.image(
      'floor_details',
      '/src/assets/tiles/Tileset_Floor_Detail.png'
    )

    this.scene.load.spritesheet(
      'crops',
      '/src/assets/crops/Crops_Tileset.png',
      {
        frameWidth: 16,
        frameHeight: 16
      }
    )

    this.scene.load.spritesheet(
      'bunny_idle',
      '/src/assets/bunny/IDLE/Bunny_Idle.png',
      {
        frameWidth: 48,
        frameHeight: 48,
      }
    ).on('fileerror', (file: any) => {
      console.error('Failed to load bunny_idle spritesheet:', file)
    })

    this.scene.load.spritesheet(
      'bunny_run',
      '/src/assets/bunny/RUN/Bunny_Run.png',
      {
        frameWidth: 48,
        frameHeight: 48,
      }
    ).on('fileerror', (file: any) => {
      console.error('Failed to load bunny_run spritesheet:', file)
    })

    this.scene.load.spritesheet(
      'bunny_hoe',
      '/src/assets/bunny/HOE/Bunny_Hoe.png',
      {
        frameWidth: 48,
        frameHeight: 48,
      }
    ).on('fileerror', (file: any) => {
      console.error('Failed to load bunny_hoe spritesheet:', file)
    })

    this.scene.load.spritesheet(
      'bunny_wateringcan',
      '/src/assets/bunny/WATERING CAN/Bunny_WateringCan.png',
      {
        frameWidth: 48,
        frameHeight: 48,
      }
    ).on('fileerror', (file: any) => {
      console.error('Failed to load bunny_wateringcan spritesheet:', file)
    })

    // Error handling
    this.scene.load.on('fileerror', (file: any) => {
      console.error('Asset load error:', file)
    })

    // // Progress tracking (Optional)
    // this.scene.load.on('progress', (value: number) => {
    //   console.log(`Loading: ${Math.floor(value * 100)}%`);
    // });

    this.scene.load.on('complete', () => {
      console.log('All assets loaded successfully.');
    });
  }

  /**
   * Helper to initialize animations based on your specific frame IDs:
   * Right movement row starts at ID 45 (15 frames per row)
   */
  public createAnimations(): void {
    const anims = this.scene.anims;

    // Based on your grid:
    // One row of "48px frames" contains 5 frames of animation.
    // Row 0 = Up, Row 1 = Right (based on your earlier info), Row 2 = Left, Row 3 = Down
    const directions = ['up', 'right', 'left', 'down'];
    const framesPerAnim = 5;

    directions.forEach((dir, index) => {
      const idleKey = `bunny-idle-${dir}`;
      const runKey = `bunny-run-${dir}`;
      const startFrame = index * framesPerAnim;
      const endFrame = startFrame + (framesPerAnim - 1);

      // Idle Animations
      if (!anims.exists(idleKey)) {
        anims.create({
          key: idleKey,
          frames: anims.generateFrameNumbers('bunny_idle', { start: startFrame, end: endFrame }),
          frameRate: 6,
          repeat: -1
        });
      }

      const runFramesPerAnim = 8;
      const runStartFrame = index * runFramesPerAnim;
      const runEndFrame = runStartFrame + (runFramesPerAnim - 1);

      // Run Animations
      if (!anims.exists(runKey)) {
        anims.create({
          key: runKey,
          frames: anims.generateFrameNumbers('bunny_run', { start: runStartFrame, end: runEndFrame }),
          frameRate: 12,
          repeat: -1
        });
      }

      // Hoe animations
      const hoeFramesPerAnim = 9;
      const hoeStartFrame = index * hoeFramesPerAnim;
      const hoeEndFrame = hoeStartFrame + (hoeFramesPerAnim - 1);
      const hoeKey = `bunny-hoe-${dir}`;

      if (!anims.exists(hoeKey)) {
        anims.create({
          key: hoeKey,
          frames: anims.generateFrameNumbers('bunny_hoe', { start: hoeStartFrame, end: hoeEndFrame }),
          frameRate: 12,
          repeat: 0
        });
      }

      // Watering can animations
      const waterFramesPerAnim = 8;
      const waterStartFrame = index * waterFramesPerAnim;
      const waterEndFrame = waterStartFrame + (waterFramesPerAnim - 1);
      const waterKey = `bunny-wateringcan-${dir}`;

      if (!anims.exists(waterKey)) {
        anims.create({
          key: waterKey,
          frames: anims.generateFrameNumbers('bunny_wateringcan', { start: waterStartFrame, end: waterEndFrame }),
          frameRate: 12,
          repeat: 0
        });
      }
    });
  }
}
