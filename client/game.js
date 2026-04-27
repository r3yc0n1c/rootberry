document.addEventListener("keydown", (e) => {
  if (!worldState || !playerId) return

  let player = worldState.Players[playerId]
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
  draw(worldState)
}

loop()
