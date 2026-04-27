const socket = new WebSocket("ws://localhost:8080/ws")

let worldState = null
let playerId = null

socket.onmessage = (event) => {
  const data = JSON.parse(event.data)
  
  // Handle initialization message
  if (data.type === "init") {
    playerId = data.id
    return
  }
  
  worldState = data
}

function send(action) {
  socket.send(JSON.stringify(action))
}
