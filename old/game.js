document.addEventListener("keydown", (e) => {
  if (!RootBerry.worldState || !RootBerry.playerId) return

  let player = RootBerry.worldState.players[RootBerry.playerId]
  if (!player) return

  let x = player.x
  let y = player.y

  if (e.key === "w") y--
  if (e.key === "s") y++
  if (e.key === "a") x--
  if (e.key === "d") x++

  send({ type: "move", x, y })

  if (e.key === "1") send({ type: "till", x, y })
  if (e.key === "2") send({ type: "plant", x, y })
  if (e.key === "3") send({ type: "water", x, y })
  if (e.key === "4") send({ type: "harvest", x, y })
})

function loop() {
  requestAnimationFrame(loop)
  
  if (RootBerry.worldState && RootBerry.worldState.players) {
    Object.values(RootBerry.worldState.players).forEach(p => {
      if ((p.State || p.state) !== "idle") {
        p.animFrame = (p.animFrame || 0) + 0.1
      } else {
        p.animFrame = 0
      }
    })
  }
  
  draw(RootBerry.worldState)
}

async function start() {
  await loadAssets()
  
  // Wait for connection and playerId
  let waitCount = 0
  while (!RootBerry.connected || !RootBerry.playerId) {
    await new Promise(r => setTimeout(r, 100))
    waitCount++
    if (waitCount > 50) {
      return
    }
  }
  
  loop()
}

start()