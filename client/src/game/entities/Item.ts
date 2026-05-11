export default class Item {
  id: string
  name: string
  description: string
  spriteConfig: { texture: string; frame: number }
  color: number // fallback color for dock rendering when texture is unavailable

  constructor(
    id: string,
    name: string,
    description: string,
    spriteConfig: { texture: string; frame: number },
    color: number = 0x888888
  ) {
    this.id = id
    this.name = name
    this.description = description
    this.spriteConfig = spriteConfig
    this.color = color
  }
}