const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d")

const TILE = 32

function draw(world) {
  if (!world) return

  for (let y = 0; y < world.Height; y++) {
    for (let x = 0; x < world.Width; x++) {
      const tile = world.Tiles[y][x]

      if (tile.Type === "grass") ctx.fillStyle = "green"
      if (tile.Type === "tilled") ctx.fillStyle = "brown"

      ctx.fillRect(x*TILE, y*TILE, TILE, TILE)

      if (tile.Crop) {
        ctx.fillStyle = "yellow"
        ctx.fillRect(x*TILE+8, y*TILE+8, 16, 16)
      }
    }
  }

   Object.values(world.Players).forEach(p => {
     ctx.fillStyle = p.color || "blue"
     ctx.fillRect(p.x*TILE, p.y*TILE, TILE, TILE)
   })

  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, 250, 100)

  ctx.fillStyle = "white"
  ctx.font = "12px monospace"

  if (world) {
  ctx.fillText("Players: " + Object.keys(world.Players).length, 10, 20)

  let y = 40
  Object.values(world.Players).forEach(p => {
      ctx.fillText(`P:${p.id.slice(0,4)} (${p.x},${p.y}) $${p.money}`, 10, y)
      y += 15
  })
  }
}
