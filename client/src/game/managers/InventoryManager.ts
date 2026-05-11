import Phaser from 'phaser';
import Item from '../entities/Item';

export default class InventoryManager extends Phaser.Events.EventEmitter {
  private inventory: Item[] = [];
  private _selectedItemIndex: number = 0;

  get selectedItemIndex(): number {
    return this._selectedItemIndex;
  }

  constructor() {
    super();
    // Populate with some dummy items for now
    this.addItem(new Item('item_hoe', 'Hoe', 'A basic hoe.', { texture: 'tools', frame: 0 }));
    this.addItem(new Item('item_watering_can', 'Watering Can', 'Water your crops.', { texture: 'tools', frame: 1 }));
    this.addItem(new Item('item_carrot_seed', 'Carrot Seed', 'Plant to grow carrots.', { texture: 'seeds', frame: 0 }));
  }

  addItem(item: Item) {
    this.inventory.push(item);
    this.emit('inventoryChanged');
  }

  removeItem(itemId: string) {
    this.inventory = this.inventory.filter(item => item.id !== itemId);
    this.emit('inventoryChanged');
  }

  getInventory(): Item[] {
    return [...this.inventory];
  }

  selectItem(index: number) {
    if (index >= 0 && index < this.inventory.length) {
      this._selectedItemIndex = index;
      this.emit('itemSelected', this._selectedItemIndex);
    } else {
      this._selectedItemIndex = 0; // Default to first item if invalid selection
      this.emit('itemSelected', this._selectedItemIndex);
    }
  }

  getSelectedItem(): Item | null {
    return this.inventory[this._selectedItemIndex] || null;
  }
}