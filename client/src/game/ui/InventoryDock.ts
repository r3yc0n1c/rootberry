import Phaser from 'phaser'
import InventoryManager from '../managers/InventoryManager'

const ITEM_SLOT_SIZE = 52
const MAX_DISPLAY_ITEMS = 6
const DOCK_PADDING = 10


export default class InventoryDock extends Phaser.GameObjects.Container {
  private inventoryManager: InventoryManager

  // Per-slot children (indexed by slot index)
  private itemSlots: Phaser.GameObjects.Graphics[] = []
  private itemSprites: Phaser.GameObjects.Sprite[] = []

  // label at bottom of dock
  private equippedLabel!: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, inventoryManager: InventoryManager) {
    super(scene, 0, 0)
    this.inventoryManager = inventoryManager

    // Fixed to camera — never scrolls with the world
    this.setScrollFactor(0)
    // Render above everything in the world (tilemap layers are depth 0-4)
    this.setDepth(1000)

    this.buildDock()
    this.refreshInventoryUI()
    this.setupEventListeners()

    this.inventoryManager.on('inventoryChanged', this.refreshInventoryUI, this)
    this.inventoryManager.on('itemSelected', this.onItemSelected, this)

    scene.add.existing(this)
  }

  private buildDock() {
    const { width, height } = this.scene.scale

    const dockWidth = MAX_DISPLAY_ITEMS * ITEM_SLOT_SIZE + DOCK_PADDING * 2
    const dockHeight = ITEM_SLOT_SIZE + DOCK_PADDING * 2 + 24

    const dockX = (width - dockWidth) / 2
    const dockY = height - dockHeight - 8

    this.setPosition(dockX, dockY)

    // --- Background panel ---
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x013220, 0.75)
    bg.fillRoundedRect(0, 0, dockWidth, dockHeight, 8)
    this.add(bg)

    // --- Equipped label ---
    this.equippedLabel = this.scene.add.text(
      DOCK_PADDING,
      DOCK_PADDING + ITEM_SLOT_SIZE + 6,
      'Hoe',
      {
        fontSize: '12px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }
    )
    this.add(this.equippedLabel)

    // --- Slots ---
    for (let i = 0; i < MAX_DISPLAY_ITEMS; i++) {
      const slotX = i * ITEM_SLOT_SIZE + DOCK_PADDING
      const slotY = DOCK_PADDING
      const cx = slotX + ITEM_SLOT_SIZE / 2
      const cy = slotY + ITEM_SLOT_SIZE / 2

      // 1. Slot border (rendered last → on top)
      const slot = this.scene.add.graphics()
      this.drawSlotBorder(slot, slotX, slotY, i === 0)
      this.add(slot)
      this.itemSlots.push(slot)

      // 2. Item sprite (rendered after bg, before border)
      const sprite = this.scene.add.sprite(cx, cy, 'tools', 0)
      sprite.setScale(2.2)
      sprite.setOrigin(0.5)
      sprite.setVisible(false)
      this.add(sprite)
      this.itemSprites.push(sprite)
    }
  }

  private drawSlotBorder(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    selected: boolean
  ) {
    graphics.clear()
    if (selected) {
      graphics.lineStyle(3, 0xf5d76e, 1)
      graphics.fillStyle(0x3a3520, 0.8)
    } else {
      graphics.lineStyle(2, 0x555555, 0.8)
      graphics.fillStyle(0x1a1a1a, 0.8)
    }
    graphics.fillRect(x, y, ITEM_SLOT_SIZE, ITEM_SLOT_SIZE)
    graphics.strokeRect(x, y, ITEM_SLOT_SIZE, ITEM_SLOT_SIZE)
  }

  private refreshInventoryUI() {
    const inventory = this.inventoryManager.getInventory()
    const selectedIdx = this.inventoryManager.selectedItemIndex

    inventory.slice(0, MAX_DISPLAY_ITEMS).forEach((item, index) => {
      // Update slot border (selection highlight)
      const slot = this.itemSlots[index]
      if (slot) {
        const slotX = index * ITEM_SLOT_SIZE + DOCK_PADDING
        const slotY = DOCK_PADDING
        this.drawSlotBorder(slot, slotX, slotY, index === selectedIdx)
      }

      const sprite = this.itemSprites[index]

      // Hide all by default
      if (sprite) sprite.setVisible(false)

      if (!item) return

      const isTool = item.id.startsWith('item_') && !item.id.includes('seed')
      const isSeed = item.id.includes('seed')

      if (isTool) {
        sprite.setTexture(item.spriteConfig.texture).setFrame(item.spriteConfig.frame).setVisible(true)
      } else if (isSeed) {
        sprite.setTexture(item.spriteConfig.texture).setFrame(item.spriteConfig.frame).setVisible(true)
      }
    })

    // Update equipped label
    const selected = this.inventoryManager.getSelectedItem()
    if (selected) {
      this.equippedLabel.setText(selected.name)
    }
  }

  /** Called when the player selects a slot via hotkey */
  private onItemSelected(selectedIndex: number) {
    // refreshInventoryUI re-draws all slot borders with the correct selection state
    this.refreshInventoryUI()

    // Flash the equipped label
    const selected = this.inventoryManager.getSelectedItem()
    if (selected) {
      this.equippedLabel.setText(selected.name)
      this.equippedLabel.setColor('#ffffff')
      this.scene.tweens.add({
        targets: this.equippedLabel,
        color: '#aaaaaa',
        duration: 500,
      })
    }
  }

  private setupEventListeners() {
    const hotkeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'] as const
    hotkeys.forEach((keyName, index) => {
      this.scene.input.keyboard!.on(`keydown-${keyName}`, () => {
        this.selectItem(index)
      })
    })
  }

  /** Public: select a slot by index (0-based) */
  selectItem(index: number) {
    if (index >= 0 && index < MAX_DISPLAY_ITEMS) {
      this.inventoryManager.selectItem(index)
    }
  }

  destroy() {
    this.inventoryManager.off('inventoryChanged', this.refreshInventoryUI, this)
    this.inventoryManager.off('itemSelected', this.onItemSelected, this)
    super.destroy()
  }
}