class NetworkManager {
  socket!: WebSocket
  worldState: any = null
  playerId: string = '' // unique session ID

  connect() {
    this.socket = new WebSocket('ws://localhost:8080/ws')

    this.socket.onopen = () => {
      console.log('WS Connected')
    }

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      // initial ID assignment
      if (data.type === 'init') {
        this.playerId = data.id
        console.log('My Player ID assigned:', this.playerId)
      } else {
        // it's a world update
        this.worldState = data
      }
    }
  }

  send(data: any) {
    this.socket.send(JSON.stringify(data))
  }
}

export default new NetworkManager()