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
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%'
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