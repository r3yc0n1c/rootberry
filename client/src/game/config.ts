import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import FarmScene from './scenes/FarmScene'
import UIScene from './scenes/UIScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#1d212d',
  parent: 'app',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT, // Automatically scales the game to fit the window
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  render: {
    pixelArt: true, // Prevents blurring when scaling the assets
    antialias: false
  },

  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },

  scene: [BootScene, FarmScene, UIScene],
}

export default config