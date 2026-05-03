const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d")

function resizeCanvas() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

window.addEventListener('resize', resizeCanvas)
resizeCanvas()

const TILE = 32

const camera = {
  x: 0,
  y: 0
}

const bunnyAnimations = {
  idle: { img: "bunny_idle", frames: 4 },
  run: { img: "bunny_run", frames: 4 },
  hoe: { img: "bunny_hoe", frames: 4 },
  water: { img: "bunny_water", frames: 4 }
}

function drawBunny(player, x, y) {
  const state = player.State || player.state || "idle"
  const anim = bunnyAnimations[state] || bunnyAnimations.idle
  
    const img = assets[anim.img]
    
    if (!img || !(img instanceof HTMLImageElement)) {
      console.error(`Bunny image not loaded or invalid for state ${state}:`, img);
      ctx.fillStyle = player.Color || player.color || "#00FF00"
      ctx.fillRect(x - camera.x, y - camera.y, TILE, TILE)
      return
    }

  const frame = Math.floor((player.animFrame || 0) % anim.frames)
  const frameSize = 16

  ctx.drawImage(
    img,
    frame * frameSize, 0,
    frameSize, frameSize,
    x - camera.x,
    y - camera.y,
    TILE,
    TILE
  )
}

function draw(world) {
  if (!world) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const me = RootBerry.playerId && world.players[RootBerry.playerId]
    ? world.players[RootBerry.playerId]
    : Object.values(world.players)[0]
  
  if (me) {
    camera.x = me.x * TILE - canvas.width / 2
    camera.y = me.y * TILE - canvas.height / 2
  }

for (let y = 0; y < world.height; y++) {
		for (let x = 0; x < world.width; x++) {
			const tile = world.tiles[y][x]

       if (tile.type === "grass") {
         const grassImg = assets.grass;
         if (!grassImg || !(grassImg instanceof HTMLImageElement)) {
           console.error("Grass image not loaded or invalid:", grassImg);
           ctx.fillStyle = "#00FF00";
           ctx.fillRect(
             x * TILE - camera.x,
             y * TILE - camera.y,
             TILE,
             TILE
           );
           return;
         }
         ctx.drawImage(
           grassImg,

           0, 0,
           16, 16,

           x * TILE - camera.x,
           y * TILE - camera.y,
           TILE,
           TILE
         )
       }
      if (tile.type === "tilled") {
        ctx.fillStyle = tile.watered ? "#5a3a1a" : "#7a4f2a"

        ctx.fillRect(
          x * TILE - camera.x,
          y * TILE - camera.y,
          TILE,
          TILE
        )
      }

      // ctx.fillRect(x*TILE, y*TILE, TILE, TILE)

       if (tile.crop) {
         const cropsImg = assets.crops;
         if (!cropsImg || !(cropsImg instanceof HTMLImageElement)) {
           console.error("Crops image not loaded or invalid:", cropsImg);
           // Draw a placeholder for the crop
           ctx.fillStyle = "#FFFF00";
           ctx.fillRect(
             x * TILE - camera.x,
             y * TILE - camera.y,
             TILE,
             TILE
           );
         } else {
           let cropX = 0

           if (tile.crop.growth >= 1) cropX = 16
           if (tile.crop.growth >= 3) cropX = 32
           if (tile.crop.growth >= 5) cropX = 48

           ctx.drawImage(
             cropsImg,

             cropX, 0,
             16, 16,

             x * TILE - camera.x,
             y * TILE - camera.y,
             TILE,
             TILE
           )
         }
       }
    }
  }

   Object.values(world.players).forEach(p => {
      drawBunny(p, p.x * TILE, p.y * TILE)
    })

  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, 250, 100)

  ctx.fillStyle = "white"
  ctx.font = "12px monospace"

  if (world) {
    ctx.fillText("Players: " + Object.keys(world.players).length, 10, 20)

    let y = 40
    Object.values(world.players).forEach(p => {
      ctx.fillText(`P:${p.id.slice(0,4)} (${p.x},${p.y}) $${p.money || 0}`, 10, y)
      y += 15
    })
  }
}
