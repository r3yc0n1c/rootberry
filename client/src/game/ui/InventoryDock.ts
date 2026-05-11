import Phaser from 'phaser'
import InventoryManager from '../managers/InventoryManager'
import Item from '../entities/Item'

const ITEM_SLOT_SIZE = 52
const MAX_DISPLAY_ITEMS = 6
const DOCK_PADDING = 10

// Item icon colours (fallback when no texture is available)
const ITEM_COLOURS: Record<string, number> = {
  item_hoe: 0x8b6914,
  item_watering_can: 0x4a90d9,
  item_carrot_seed: 0xe07c24,
}
const DEFAULT_ITEM_COLOUR = 0x555555

export default class InventoryDock extends Phaser.GameObjects.Container {
  private inventoryManager: InventoryManager
  private itemSlots: Phaser.GameObjects.Graphics[] = []
  private itemIcons: Phaser.GameObjects.Graphics[] = []
  private keyLabels: Phaser.GameObjects.Text[] = []
  private equippedLabel!: Phaser.GameObjects.Text
  private toolsTileset!: Phaser.GameObjects.Image

  constructor(scene: Phaser.Scene, inventoryManager: InventoryManager) {
    super(scene, 0, 0)
    this.inventoryManager = inventoryManager

    this.toolsTileset = this.scene.add.image(0, 0, 'tools').setVisible(false)

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

    // Semi-transparent dark background panel
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x000000, 0.75)
    bg.fillRect(0, 0, dockWidth, dockHeight)
    this.add(bg)

    // Selected item name display (bottom of dock)
    this.equippedLabel = this.scene.add.text(
      DOCK_PADDING,
      DOCK_PADDING + ITEM_SLOT_SIZE + 6,
      'Equipped: Hoe',
      {
        fontSize: '12px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }
    )
    this.add(this.equippedLabel)

    for (let i = 0; i < slotCount; i++) {
      const slotX = i * ITEM_SLOT_SIZE + DOCK_PADDING
      const slotY = DOCK_PADDING

      // Slot background + border
      const slot = this.scene.add.graphics()
      this.drawSlotBorder(slot, slotX, slotY, i === 0)
      this.add(slot)
      this.itemSlots.push(slot)

      // Icon drawn with Graphics (no texture dependency)
      const icon = this.scene.add.graphics()
      this.add(icon)
      this.itemIcons.push(icon)

      // Key label (1-indexed) above the slot
      const keyLabel = this.scene.add.text(
        slotX + ITEM_SLOT_SIZE / 2,
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
    // Clear previous icon drawings
    this.itemIcons.forEach((icon) => icon.clear())

    const inventory = this.inventoryManager.getInventory()
    const selectedIdx = this.inventoryManager.selectedItemIndex

    inventory.slice(0, MAX_DISPLAY_ITEMS).forEach((item, index) => {
      // Re-draw slot border with correct selection state
      const slot = this.itemSlots[index]
      if (slot) {
        const slotX = index * ITEM_SLOT_SIZE + DOCK_PADDING
        const slotY = DOCK_PADDING
        this.drawSlotBorder(slot, slotX, slotY, index === selectedIdx)
      }

      if (!item) return

      const icon = this.itemIcons[index]
      if (!icon) return

      const slotX = index * ITEM_SLOT_SIZE + DOCK_PADDING
      const slotY = DOCK_PADDING
      const cx = slotX + ITEM_SLOT_SIZE / 2
      const cy = slotY + ITEM_SLOT_SIZE / 2
      const iconSize = 24

      const color = ITEM_COLOURS[item.id] ?? DEFAULT_ITEM_COLOUR
      this.drawItemIcon(icon, item, cx, cy, iconSize, color)
    })

    // Update equipped label
    const selected = this.inventoryManager.getSelectedItem()
    if (selected) {
      this.equippedLabel.setText(`Equipped: ${selected.name}`)
    }
  }

  private drawItemIcon(
    graphics: Phaser.GameObjects.Graphics,
    item: Item,
    cx: number,
    cy: number,
    size: number,
    color: number
  ) {
    graphics.clear()
    const half = size / 2

    if (item.id.startsWith('item_hoe')) {
      // Simple hoe: handle (brown) + blade (metallic)
      graphics.fillStyle(0x8b6914, 1)
      graphics.fillRect(cx - 2, cy - half, 4, half * 1.5) // handle
      graphics.fillStyle(color, 1)
      graphics.fillRect(cx - half, cy - half + 4, half, 6) // blade head
    } else if (item.id.startsWith('item_watering_can')) {
      // Simple watering can: body + spout + inner
      graphics.fillStyle(color, 1)
      graphics.fillRect(cx - half + 4, cy - half, size - 8, size - 8) // body
      graphics.fillRect(cx + half - 4, cy - half + 6, 6, size / 2) // spout
      graphics.fillStyle(0x4a90d9, 1)
      graphics.fillRect(cx - half + 6, cy - half + 2, size - 12, size - 12) // inner
    } else if (item.id.startsWith('item_carrot_seed') || item.id.includes('seed')) {
      // Seed: three dots + sprout stem
      graphics.fillStyle(0xe07c24, 1)
      graphics.fillCircle(cx - 4, cy - 2, 3)
      graphics.fillCircle(cx + 4, cy - 2, 3)
      graphics.fillCircle(cx, cy + 4, 3)
      graphics.lineStyle(2, 0x4caf50, 1)
      graphics.beginPath()
      graphics.moveTo(cx, cy + 4)
      graphics.lineTo(cx, cy - 8)
      graphics.strokePath()
    } else {
      // Generic item: filled circle
      graphics.fillStyle(color, 1)
      graphics.fillCircle(cx, cy, half - 2)
      graphics.lineStyle(2, 0xffffff, 0.5)
      graphics.strokeCircle(cx, cy, half - 2)
    }
  }

  /** Called when the player selects a slot via hotkey */
  private onItemSelected(selectedIndex: number) {
    this.itemSlots.forEach((slot, index) => {
      const x = index * ITEM_SLOT_SIZE + DOCK_PADDING
      const y = DOCK_PADDING
      this.drawSlotBorder(slot, x, y, index === selectedIndex)

      // Re-draw icon on top of updated slot border
      const inventory = this.inventoryManager.getInventory()
      const item = inventory[index]
      if (item && this.itemIcons[index]) {
        const cx = x + ITEM_SLOT_SIZE / 2
        const cy = y + ITEM_SLOT_SIZE / 2
        const color = ITEM_COLOURS[item.id] ?? DEFAULT_ITEM_COLOUR
        this.drawItemIcon(this.itemIcons[index], item, cx, cy, 24, color)
      }
    })

    // Update equipped label
    const selected = this.inventoryManager.getSelectedItem()
    if (selected) {
      this.equippedLabel.setText(`Equipped: ${selected.name}`)

      // Flash the label colour briefly
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