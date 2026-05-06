class NetworkManager {
  socket!: WebSocket
  
  worldState: any = null
  worldConfig: any = null
  isReady = false

  playerId: string = ''

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

        this.worldConfig = data.world

        console.log('[INIT] world:', this.worldConfig)

        this.isReady = true
      } else {
        // it's a world update
        this.worldState = data
      }
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  send(data: any) {
    this.socket.send(JSON.stringify(data))
  }
}

export default new NetworkManager()