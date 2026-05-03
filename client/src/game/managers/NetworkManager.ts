class NetworkManager {
  socket!: WebSocket

  worldState: any = null

  connect() {
    this.socket = new WebSocket('ws://localhost:8080/ws')

    this.socket.onopen = () => {
      console.log('WS Connected')
    }

    this.socket.onmessage = (event) => {
      this.worldState = JSON.parse(event.data)
    }
  }

  send(data: any) {
    this.socket.send(JSON.stringify(data))
  }
}

export default new NetworkManager()