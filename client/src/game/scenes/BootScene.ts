import Phaser from 'phaser';
import AssetManager from '../managers/AssetManager';

export default class BootScene extends Phaser.Scene {
  private assetManager!: AssetManager;

  constructor() {
    super('BootScene');
  }

  preload() {
    this.assetManager = new AssetManager(this);
    this.assetManager.loadAll();

    // Standard progress logging
    // this.load.on('progress', (value: number) => {
    //   console.log(`Loading: ${Math.floor(value * 100)}%`);
    // });
  }

  create() {
    // Check if texture was loaded to prevent "duration of undefined" error
    if (this.textures.exists('bunny_idle')) {
      this.assetManager.createAnimations();

      this.scene.start('WorldLoadScene');      
    } else {
      console.error("Bunny textures missing! Check file paths in AssetManager.");
    }
  }
}
