package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"rootberry/server/game"

	"github.com/gorilla/websocket"
	"github.com/google/uuid"
)

const DEBUG = true
const WORLD_WIDTH = 50
const WORLD_HEIGHT = 40

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var manager = game.NewRoomManager()

type Message struct {
	Type string `json:"type"`
	X    int    `json:"x"`
	Y    int    `json:"y"`
}

func HandleConnection(w http.ResponseWriter, r *http.Request) {
	conn, _ := upgrader.Upgrade(w, r, nil)

	id := uuid.New().String()
	room := manager.GetOrCreateRoom()

	player := room.AddClient(id, conn)

	// Send the player their own ID
	initMsg := map[string]string{
		"type": "init",
		"id":   id,
	}
	initData, _ := json.Marshal(initMsg)
	conn.WriteMessage(websocket.TextMessage, initData)

	// Send initial world state
	room.Broadcast()

	defer func() {
		room.RemoveClient(id)
		conn.Close()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("disconnect:", err)
			return
		}

		log.Printf("[server] received message: %s", string(msg))

		var m Message
		json.Unmarshal(msg, &m)

		handleAction(room, player, m)
		
		log.Printf("[%s] state: %d, %d \n", m.Type, m.X, m.Y)
	}
}

func handleAction(room *game.Room, p *game.Player, m Message) {
	room.Mutex.Lock()
	defer room.Mutex.Unlock()

	switch m.Type {

	case "move":
		if DEBUG {
			log.Printf("[Move Request] Player %s to X:%d, Y:%d", p.ID, m.X, m.Y)
		}
		
		// Match the client: only allow tiles 1 through 98
		if m.X > 0 && m.X < WORLD_WIDTH-1 && m.Y > 0 && m.Y < WORLD_HEIGHT-1 {
			p.X = m.X
			p.Y = m.Y
			room.BroadcastLocked()
		}

	case "till":
		tile := room.World.Tiles[m.Y][m.X]
		tile.Type = "tilled"
		p.State = "hoe"
		room.BroadcastLocked()

	case "plant":
		tile := room.World.Tiles[m.Y][m.X]
		if tile.Type == "tilled" {
			tile.Crop = game.NewCrop("carrot")
		}
		p.State = "idle"
		room.BroadcastLocked()

	case "water":
		tile := room.World.Tiles[m.Y][m.X]
		tile.Watered = true
		p.State = "water"
		room.BroadcastLocked()

	case "harvest":
		tile := room.World.Tiles[m.Y][m.X]
		if tile.Crop != nil && tile.Crop.Growth >= tile.Crop.MaxGrowth {
			p.Money += 10
			tile.Crop = nil
			tile.Type = "grass"
		}
		p.State = "idle"
		room.BroadcastLocked()
	}
}
