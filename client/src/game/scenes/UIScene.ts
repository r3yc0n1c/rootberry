import Phaser from 'phaser'
import NetworkManager from '../managers/NetworkManager'

export default class UIScene extends Phaser.Scene {
  private moneyText!: Phaser.GameObjects.Text
  private berryText!: Phaser.GameObjects.Text
  private energyText!: Phaser.GameObjects.Text
  private uiBg!: Phaser.GameObjects.Rectangle

  constructor() {
    super('UIScene')
  }

  create() {
    const cam = this.cameras.main

    const panelWidth = 180
    const panelHeight = 90

    const panelX = cam.width - panelWidth
    const panelY = 0

    // =========================
    // PANEL BG
    // =========================
    const bg = this.add.rectangle(
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      0x000000,
      0.55
    )

    bg.setOrigin(0, 0)
    bg.setScrollFactor(0)
    bg.setDepth(100)

    // =========================
    // LEFT BORDER
    // =========================
    const leftBorder = this.add.rectangle(
      panelX,
      panelY,
      3,
      panelHeight,
      0xffffff,
      0.35
    )

    leftBorder.setOrigin(0, 0)
    leftBorder.setScrollFactor(0)
    leftBorder.setDepth(101)

    // =========================
    // BOTTOM BORDER
    // =========================
    const bottomBorder = this.add.rectangle(
      panelX,
      panelHeight - 3,
      panelWidth,
      3,
      0xffffff,
      0.35
    )

    bottomBorder.setOrigin(0, 0)
    bottomBorder.setScrollFactor(0)
    bottomBorder.setDepth(101)

    // =========================
    // MONEY TEXT
    // =========================
    const textStyle = {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }

    // MONEY
    this.moneyText = this.add.text(
      panelX + 18,
      10,
      '💰 Money: 0',
      textStyle
    )

    // BERRIES
    this.berryText = this.add.text(
      panelX + 18,
      32,
      '🫐 Berry: 0',
      textStyle
    )

    // ENERGY
    this.energyText = this.add.text(
      panelX + 18,
      52,
      '⚡ Energy: 100',
      textStyle
    )

    this.moneyText.setScrollFactor(0).setDepth(102)
    this.berryText.setScrollFactor(0).setDepth(102)
    this.energyText.setScrollFactor(0).setDepth(102)
  }

  update() {
    const world = NetworkManager.worldState

    if (!world || !world.players) return

    const myId = NetworkManager.playerId
    if (!myId) return

    const me = world.players[myId]
    if (!me) return

    this.moneyText.setText(`💰 Money: ${me.money ?? 0}`)
    this.berryText.setText(`🫐 Berry: ${me.berries ?? 0}`)
    this.energyText.setText(`⚡ Energy: ${me.energy ?? 100}`)
  }
}
