const RootBerry = {
  playerId: null,
  worldState: null,
  socket: new WebSocket("ws://localhost:8080/ws"),
  connected: false
}

RootBerry.socket.onopen = () => {
  RootBerry.connected = true
}

RootBerry.socket.onmessage = (event) => {
  const data = JSON.parse(event.data)
  
  if (data.type === "init") {
    RootBerry.playerId = data.id
    return
  }
  
  RootBerry.worldState = data
}

function send(action) {
  RootBerry.socket.send(JSON.stringify(action))
}
