import Phaser from 'phaser'

export default class Player extends Phaser.GameObjects.Sprite {
  id: string
  public lastDir: string = 'down'

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
    this.setOrigin(0.5, 0.5);

    // Start with the 'down' animation as default
    this.play('bunny-idle-down');
  }

  /**
   * Call this when the player moves to change the facing direction
   * @param direction 'up', 'down', 'left', or 'right'
   */
  updateDirection(direction: string, isMoving: boolean) {
    // Determine if we use 'run' or 'idle' based on the boolean
    const state = isMoving ? 'run' : 'idle';
    const key = `bunny-${state}-${direction}`;

    if (this.scene.anims.exists(key)) {
      // currentAnim check prevents the animation from restarting every single frame
      if (this.anims.currentAnim?.key !== key) {
        console.log(`Switching to: ${key}`); // Debug log to see the switch in console
        this.play(key, true);
        this.lastDir = direction;
      }
    } else {
      console.error(`Animation key missing: ${key}`);
    }
  }

  // Player.ts
  getFacingTile() {
    // Convert current pixel position to tile coordinates
    let tx = Math.floor(this.x / (16 * 2)); // TILE * SCALE
    let ty = Math.floor(this.y / (16 * 2));

    // Shift target based on direction
    if (this.lastDir === 'left') tx -= 1;
    if (this.lastDir === 'right') tx += 1;
    if (this.lastDir === 'up') ty -= 1;
    if (this.lastDir === 'down') ty += 1;

    return { x: tx, y: ty };
  }
}