package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"rootberry/server/game"

	"github.com/gorilla/websocket"
	"github.com/google/uuid"
)

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

		var m Message
		json.Unmarshal(msg, &m)

		log.Printf("[ROOM %s] Player %s → %+v\n", room.ID, player.ID, m)

		handleAction(room, player, m)
	}
}

func handleAction(room *game.Room, p *game.Player, m Message) {
	room.Mutex.Lock()
	defer room.Mutex.Unlock()

	switch m.Type {

	case "move":
		p.X = m.X
		p.Y = m.Y

	case "till":
		tile := room.World.Tiles[m.Y][m.X]
		tile.Type = "tilled"

	case "plant":
		tile := room.World.Tiles[m.Y][m.X]
		if tile.Type == "tilled" {
			tile.Crop = game.NewCrop("carrot")
		}

	case "water":
		tile := room.World.Tiles[m.Y][m.X]
		tile.Watered = true

	case "harvest":
		tile := room.World.Tiles[m.Y][m.X]
		if tile.Crop != nil && tile.Crop.Growth >= tile.Crop.MaxGrowth {
			p.Money += 10
			tile.Crop = nil
			tile.Type = "grass"
		}
	}
}
