import Phaser from 'phaser'
import InventoryManager from '../managers/InventoryManager'
import Item from '../entities/Item'

const ITEM_SLOT_SIZE = 52
const MAX_DISPLAY_ITEMS = 6
const DOCK_PADDING = 10

// Fallback colours for items without a spritesheet frame
const ITEM_COLOURS: Record<string, number> = {
  item_carrot_seed: 0xe07c24,
}
const DEFAULT_ITEM_COLOUR = 0x555555

export default class InventoryDock extends Phaser.GameObjects.Container {
  private inventoryManager: InventoryManager

  // Per-slot children (indexed by slot index)
  private itemSlots: Phaser.GameObjects.Graphics[] = []
  private itemSprites: Phaser.GameObjects.Sprite[] = []
  private seedIcons: Phaser.GameObjects.Graphics[] = []
  private keyLabels: Phaser.GameObjects.Text[] = []

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

    const inventory = this.inventoryManager.getInventory()
    const slotCount = Math.min(inventory.length, MAX_DISPLAY_ITEMS)
    const dockWidth = slotCount * ITEM_SLOT_SIZE + DOCK_PADDING * 2
    const dockHeight = ITEM_SLOT_SIZE + DOCK_PADDING * 2 + 24

    const dockX = (width - dockWidth) / 2
    const dockY = height - dockHeight - 8

    this.setPosition(dockX, dockY)

    // --- Background panel ---
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x000000, 0.75)
    bg.fillRect(0, 0, dockWidth, dockHeight)
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
    for (let i = 0; i < slotCount; i++) {
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

      // 3. Seed overlay graphics (rendered between sprite and border)
      const seedGfx = this.scene.add.graphics()
      this.add(seedGfx)
      this.seedIcons.push(seedGfx)

      // 4. Key label (1-indexed) above the slot
      const keyLabel = this.scene.add.text(
        cx,
        slotY - 14,
        `${i + 1}`,
        {
          fontSize: '11px',
          color: '#999999',
          fontFamily: 'monospace',
        }
      )
      keyLabel.setOrigin(0.5, 0)
      this.add(keyLabel)
      this.keyLabels.push(keyLabel)
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
      const seedGfx = this.seedIcons[index]

      // Hide all by default
      if (sprite) sprite.setVisible(false)
      if (seedGfx) seedGfx.clear()

      if (!item) return

      if (item.id === 'item_hoe') {
        // Frame 0 = hoe in the tools tileset
        if (sprite) {
          sprite.setFrame(0).setVisible(true)
        }
      } else if (item.id === 'item_watering_can') {
        // Frame 1 = watering can in the tools tileset
        if (sprite) {
          sprite.setFrame(1).setVisible(true)
        }
      } else if (item.id.includes('seed')) {
        // Draw seed icon with Graphics since no texture exists
        this.drawSeedIcon(seedGfx, index)
      }
    })

    // Update equipped label
    const selected = this.inventoryManager.getSelectedItem()
    if (selected) {
      this.equippedLabel.setText(selected.name)
    }
  }

  private drawSeedIcon(graphics: Phaser.GameObjects.Graphics, index: number) {
    const slotX = index * ITEM_SLOT_SIZE + DOCK_PADDING
    const slotY = DOCK_PADDING
    const cx = slotX + ITEM_SLOT_SIZE / 2
    const cy = slotY + ITEM_SLOT_SIZE / 2

    graphics.clear()
    graphics.fillStyle(0xe07c24, 1)
    graphics.fillCircle(cx - 4, cy - 2, 4)
    graphics.fillCircle(cx + 4, cy - 2, 4)
    graphics.fillCircle(cx, cy + 4, 4)
    graphics.lineStyle(2, 0x4caf50, 1)
    graphics.beginPath()
    graphics.moveTo(cx, cy + 4)
    graphics.lineTo(cx, cy - 8)
    graphics.strokePath()
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