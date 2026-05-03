import Phaser from 'phaser'

export default class Player extends Phaser.GameObjects.Sprite {
  id: string

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string
  ) {
    super(scene, x, y, 'bunny_idle', 0)

    this.id = id

    scene.add.existing(this)

    this.setScale(2)
    this.setOrigin(0.5, 0.5)
    this.setDepth(1)
  }
}