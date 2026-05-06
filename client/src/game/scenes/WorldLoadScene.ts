import Phaser from "phaser";
import NetworkManager from "../managers/NetworkManager";

export default class WorldLoadScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private isTransitioning = false;

  constructor() {
    super("WorldLoadScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#1d212d");

    this.statusText = this.add.text(640, 360, "Connecting...", {
      fontSize: "28px",
      color: "#ffffff"
    }).setOrigin(0.5);

    NetworkManager.connect();
  }

  update() {
    if (NetworkManager.isReady && !this.isTransitioning) {
      this.isTransitioning = true;

      this.statusText.setText("Entering Farm...");

      this.time.delayedCall(500, () => {
        this.scene.start("FarmScene", {
          world: NetworkManager.worldConfig
        });
      });
    }
  }
}
