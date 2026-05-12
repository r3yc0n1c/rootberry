export default class Item {
  id: string
  name: string
  description: string
  spriteConfig: { texture: string; frame: number }
  color: number
  quantity: number

  constructor(
    id: string,
    name: string,
    description: string,
    spriteConfig: { texture: string; frame: number },
    color: number = 0x888888,
    quantity: number = 1
  ) {
    this.id = id
    this.name = name
    this.description = description
    this.spriteConfig = spriteConfig
    this.color = color
    this.quantity = quantity
  }
}