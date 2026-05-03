import Phaser from 'phaser'

export default class Player extends Phaser.GameObjects.Sprite {
  id: string

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string
  ) {
    // Start with the 'bunny_idle' texture
    super(scene, x, y, 'bunny_idle');
    this.id = id;

    // Add to the scene's display list so it's visible
    scene.add.existing(this);

    // Fix visibility issues
    this.setScale(2);   // Make it match the 2x world
    this.setDepth(10);  // Ensure it's above the grass

    // Keep origin at 0.5, 1 so the bunny stands on the grid line
    this.setOrigin(0.5, 0.9);

    // Start with the 'down' animation as default
    this.play('bunny-idle-down');
  }

  /**
   * Call this when the player moves to change the facing direction
   * @param direction 'up', 'down', 'left', or 'right'
   */
  updateDirection(direction: string) {
    const key = `bunny-idle-${direction}`;

    if (this.anims.exists(key) && this.anims.currentAnim?.key !== key) {
      this.play(key);
    }
  }
}