import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import FarmScene from './scenes/FarmScene'
import UIScene from './scenes/UIScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,

  width: 1280,
  height: 720,

  backgroundColor: '#1d212d',

  parent: 'app',

  pixelArt: true,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
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