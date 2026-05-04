import Phaser from 'phaser'
import NetworkManager from '../managers/NetworkManager'
import Player from '../entities/Player'

const MAP_SIZE = 100;
const TILE = 16;
const SCALE = 2;
const KEY_CONFIG = {
  UP: Phaser.Input.Keyboard.KeyCodes.W,
  DOWN: Phaser.Input.Keyboard.KeyCodes.S,
  LEFT: Phaser.Input.Keyboard.KeyCodes.A,
  RIGHT: Phaser.Input.Keyboard.KeyCodes.D,
  ACTION: Phaser.Input.Keyboard.KeyCodes.E,
  INVENTORY: Phaser.Input.Keyboard.KeyCodes.I,
  RUN: Phaser.Input.Keyboard.KeyCodes.SHIFT
};

export default class FarmScene extends Phaser.Scene {
  players: Map<string, Player> = new Map();
  private isMoving = false;
  private controls!: Record<keyof typeof KEY_CONFIG, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('FarmScene');
  }

  create() {
    NetworkManager.connect();
    this.controls = this.input.keyboard!.addKeys(KEY_CONFIG) as any;

    const worldPx = MAP_SIZE * TILE * SCALE; // 3200px

    const map = this.make.tilemap({
      width: MAP_SIZE,
      height: MAP_SIZE,
      tileWidth: TILE,
      tileHeight: TILE
    });

    const grassTileset = map.addTilesetImage('grass', 'grass');

    if (grassTileset) {
      const grassLayer = map.createBlankLayer('ground', grassTileset);
      grassLayer?.setPosition(0, 0);
      grassLayer?.setScale(SCALE);
      grassLayer?.setDepth(-1);

      for (let y = 0; y < MAP_SIZE; y++) {
        for (let x = 0; x < MAP_SIZE; x++) {
          let tileIndex: number;
          if (x === 0 && y === 0) tileIndex = 36;
          else if (x === MAP_SIZE - 1 && y === 0) tileIndex = 38;
          else if (x === 0 && y === MAP_SIZE - 1) tileIndex = 78;
          else if (x === MAP_SIZE - 1 && y === MAP_SIZE - 1) tileIndex = 80;
          else if (y === 0) tileIndex = 37;
          else if (y === MAP_SIZE - 1) tileIndex = 79;
          else if (x === 0) tileIndex = 57;
          else if (x === MAP_SIZE - 1) tileIndex = 59;
          else tileIndex = 58;

          grassLayer?.putTileAt(tileIndex, x, y);
        }
      }
    }

    // LOCK CAMERA TO WORLD: This stops the "brown void"
    this.cameras.main.setBounds(0, 0, worldPx, worldPx);

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.syncWorld(),
    });
  }

  syncWorld() {
    const world = NetworkManager.worldState;
    const myId = NetworkManager.playerId;

    if (!world || !world.players) return;

    Object.values(world.players).forEach((p: any) => {
      const targetX = p.x * TILE * SCALE;
      const targetY = p.y * TILE * SCALE;

      if (!this.players.has(p.id)) {
        const playerInstance = new Player(this, targetX, targetY, p.id);
        this.players.set(p.id, playerInstance);

        // POKEMON STYLE: Follow ONLY when near center of world
        if (p.id === myId) {
          // true = roundPixels to prevent blurry bunny
          this.cameras.main.startFollow(playerInstance, true, 0.2, 0.2);
          // Small deadzone so bunny moves a bit before camera follows
          this.cameras.main.setDeadzone(50, 50);
        }
      }

      const sprite = this.players.get(p.id);

      if (sprite) {
        // Calculate if remote player is moving
        const isMoving = Math.abs(sprite.x - targetX) > 2 || Math.abs(sprite.y - targetY) > 2;

        // Only update animations for OTHER players
        if (p.id !== myId) {
          let dir = sprite.lastDir;
          if (targetX > sprite.x) dir = 'right';
          else if (targetX < sprite.x) dir = 'left';
          else if (targetY > sprite.y) dir = 'up';
          else if (targetY < sprite.y) dir = 'down';

          sprite.updateDirection(dir, isMoving);
        }

        this.tweens.add({
          targets: sprite,
          x: targetX,
          y: targetY,
          duration: 120,
          onComplete: () => {
            // When remote players stop, make them idle
            if (p.id !== myId) sprite.updateDirection(sprite.lastDir, false);
          }
        });
      }
    });
  }

  update() {
    const world = NetworkManager.worldState;
    const playerId = NetworkManager.playerId;

    // Ensure we have world data, our ID, and aren't mid-animation
    if (!world || !world.players || !playerId || this.isMoving) return;

    const me = world.players[playerId];
    const mySprite = this.players.get(playerId);
    if (!me || !mySprite || this.isMoving) return;


    let { x, y } = me;
    let moved = false;
    let direction = '';

    if (this.controls.LEFT.isDown) {
      x--; moved = true; direction = 'left';
    } else if (this.controls.RIGHT.isDown) {
      x++; moved = true; direction = 'right';
    } else if (this.controls.UP.isDown) {
      y--; moved = true; direction = 'up';
    } else if (this.controls.DOWN.isDown) {
      y++; moved = true; direction = 'down';
    }

    if (moved) {
      // IMMEDIATELY tell the sprite it is moving
      console.log('moved', direction)
      mySprite.updateDirection(direction, true);
      this.handleMovement(x, y, direction, playerId);
    } else {
      // IDLE LOCALLY
      mySprite.updateDirection(mySprite.lastDir, false);
    }
  }

  private handleMovement(nextX: number, nextY: number, dir: string, id: string) {
    // 1. Define "Illegal" tiles (the border indices from your create loop)
    // We want the bunny to stay within the inner grass area (tile index 58)
    const BOTTOM_BOUND = MAP_SIZE - 2;
    const RIGHT_BOUND = MAP_SIZE - 5;
    const TOP_BOUND = 1;
    const LEFT_BOUND = 0;

    const isInsideBounds = nextX > LEFT_BOUND && nextX < RIGHT_BOUND &&
      nextY > TOP_BOUND && nextY < BOTTOM_BOUND;

    if (isInsideBounds) {
      this.isMoving = true;

      NetworkManager.send({
        type: 'move',
        x: nextX,
        y: nextY,
      });

      this.time.delayedCall(150, () => {
        this.isMoving = false;
      });
    }
  }
}
