import Phaser from 'phaser'
import NetworkManager from '../managers/NetworkManager'

export default class UIScene extends Phaser.Scene {
  moneyText!: Phaser.GameObjects.Text

  constructor() {
    super('UIScene')
  }

  create() {
    this.moneyText = this.add.text(20, 20, 'Money: 0', {
      fontSize: '20px',
      color: '#ffffff',
    })
    this.moneyText.setScrollFactor(0)
  }

  update() {
    const world = NetworkManager.worldState

    if (!world || !world.Players) return

    const players = Object.values(world.Players)
    if (players.length === 0) return

    const myId = NetworkManager.playerId;
    const me = players[myId];

    this.moneyText.setText(`Money: ${me.money}`)
  }
}