package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"rootberry/server/config"
	"rootberry/server/game"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const DEBUG = true

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var manager = game.NewRoomManager()

type Message struct {
  Type      string `json:"type"`
  X         int    `json:"x"`
  Y         int    `json:"y"`
  CropType  string `json:"cropType"`
}

func HandleConnection(w http.ResponseWriter, r *http.Request) {
	conn, _ := upgrader.Upgrade(w, r, nil)

	config.LoadWorldConfig()

	id := uuid.New().String()
	room := manager.GetOrCreateRoom()

	player := room.AddClient(id, conn)

	// Send init config with the player ID
	initMsg := map[string]interface{}{
		"type": "init",
		"id":   id,
		"world": map[string]interface{}{
			"key":    config.FarmWorld.Key,
			"width":  config.FarmWorld.Size.Width,
			"height": config.FarmWorld.Size.Height,
			"spawn":  config.FarmWorld.Spawn,
		},
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

	isValidTile := func(x, y int) bool {
		return x >= 0 &&
			y >= 0 &&
			x < config.FarmWorld.Size.Width &&
			y < config.FarmWorld.Size.Height
	}

	switch m.Type {

	case "move":
		if DEBUG {
			log.Printf("[Move Request] Player %s to X:%d, Y:%d", p.ID, m.X, m.Y)
		}

		// Match the client movement logic
		if (m.X > 0 && m.X < config.FarmWorld.Size.Width) &&
			(m.Y > 0 && m.Y < config.FarmWorld.Size.Height) {
			p.X = m.X
			p.Y = m.Y
		}

case "till":
 		if !isValidTile(m.X, m.Y) {
 			return
 		}

 		tile := room.World.Tiles[m.Y][m.X]

 		// only farm tiles can be tilled
 		if tile.Type == "farm" {
 			tile.Type = "tilled"
 			tile.Watered = false
 			log.Printf("[SERVER] Player %s tilled tile (%d, %d)", p.ID, m.X, m.Y)
 		}

 		p.State = "hoe"
 		room.BroadcastLocked()

case "water":
 		if !isValidTile(m.X, m.Y) {
 			return
 		}

 		tile := room.World.Tiles[m.Y][m.X]

 		// only tilled soil can be watered
 		if tile.Type == "tilled" {
 			tile.Watered = true
 			log.Printf("[SERVER] Player %s watered tile (%d, %d)", p.ID, m.X, m.Y)
 		}

 		p.State = "water"
 		room.BroadcastLocked()

case "plant":
 		if !isValidTile(m.X, m.Y) {
 			return
 		}

 		tile := room.World.Tiles[m.Y][m.X]

 		// must be tilled (no water required for planting)
 		if tile.Type == "tilled" && tile.Crop == nil {

 			// Reset watered state so growth doesn't immediately increment
 			tile.Watered = false

 			// Map client item id to crop type
 			cropType := "carrot"
 			switch m.CropType {
 			case "item_carrot_seed":
 				cropType = "carrot"
 			case "item_cabbage_seed":
 				cropType = "cabbage"
 			case "item_pumpkin_seed":
 				cropType = "pumpkin"
 			case "item_strawberry_seed":
 				cropType = "strawberry"
 			}
 			tile.Crop = game.NewCrop(cropType)
 			log.Printf("[SERVER] Player %s planted %s at (%d, %d)", p.ID, cropType, m.X, m.Y)
 		}

 		p.State = "idle"
 		room.BroadcastLocked()

case "harvest":
 		if !isValidTile(m.X, m.Y) {
 			return
 		}

 		tile := room.World.Tiles[m.Y][m.X]

 		if tile.Crop != nil &&
 			tile.Crop.Growth >= tile.Crop.MaxGrowth {

 			log.Printf("[SERVER] Player %s harvested %s at (%d, %d)", p.ID, tile.Crop.Type, m.X, m.Y)
 			p.Money += 10

 			tile.Crop = nil
 			tile.Watered = false
 			tile.Type = "tilled"
 		}

 		p.State = "idle"
 		room.BroadcastLocked()
	}
}
