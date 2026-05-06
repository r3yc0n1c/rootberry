package game

import (
	"encoding/json"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"rootberry/server/config"
)

type Client struct {
	Conn   *websocket.Conn
	Player *Player
}

type Room struct {
	ID      string
	World   *World
	Clients map[string]*Client
	Mutex   sync.Mutex
	rng     *rand.Rand
}

const VISIBILITY_RADIUS = 25.0 // Tiles

func NewRoom(id string) *Room {
	return &Room{
		ID:      id,
		World:   NewWorld(
			config.FarmWorld.Size.Width, 
			config.FarmWorld.Size.Height,
		),
		Clients: make(map[string]*Client),
		rng:     rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (r *Room) AddClient(id string, conn *websocket.Conn) *Player {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	// Generate a random color for the player
	colors := []string{"#420707", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080"}
	color := colors[r.rng.Intn(len(colors))]

	// Start near center of world
	startX := config.FarmWorld.Spawn.X
	startY := config.FarmWorld.Spawn.Y

	// Add a small random offset (e.g., -2 to +2 tiles)
	// so they aren't all exactly on top of each other but still near the center
	startX += r.rng.Intn(5) - 2
	startY += r.rng.Intn(5) - 2

	player := &Player{ID: id, X: startX, Y: startY, Color: color, State: "idle", Direction: "down"}
	r.World.Players[id] = player

	r.Clients[id] = &Client{
		Conn:   conn,
		Player: player,
	}

	return player
}

func (r *Room) RemoveClient(id string) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	delete(r.World.Players, id)
	delete(r.Clients, id)
}

func (r *Room) Broadcast() {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()
	r.BroadcastLocked()
}

func (r *Room) BroadcastLocked() {
	for id, client := range r.Clients {
		nearbyState := World{
			Width:   r.World.Width,
			Height:  r.World.Height,
			Tiles:   r.World.Tiles,
			Players: make(map[string]*Player),
		}

		for _, other := range r.World.Players {
			// Calculate distance between recipient and other players
			dx := float64(client.Player.X - other.X)
			dy := float64(client.Player.Y - other.Y)
			distance := math.Sqrt(dx*dx + dy*dy)

			// Only add to the packet if they are nearby
			if distance <= config.FarmWorld.PlayerVisibility {
				nearbyState.Players[other.ID] = other
			}
		}

		data, _ := json.Marshal(nearbyState)
		err := client.Conn.WriteMessage(websocket.TextMessage, data)

		if err != nil {
			client.Conn.Close()
			delete(r.Clients, id)
		}
	}
}
