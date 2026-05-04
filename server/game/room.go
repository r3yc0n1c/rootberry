package game

import (
	"encoding/json"
	"math/rand"
	"sync"
	"time"

	"github.com/gorilla/websocket"
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
	rng		*rand.Rand
}

func NewRoom(id string) *Room {
	return &Room{
		ID:      id,
		World:   NewWorld(100, 100),
		Clients: make(map[string]*Client),
		rng: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (r *Room) AddClient(id string, conn *websocket.Conn) *Player {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	// Generate a random color for the player
	colors := []string{"#420707", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080"}
	color := colors[r.rng.Intn(len(colors))]

	// Start near center of world
	startX := r.World.Width / 2
	startY := r.World.Height / 2
	
	// If center is occupied, find next available spot
	if len(r.World.Players) > 0 {
		for y := startY; y < r.World.Height; y++ {
			for x := startX; x < r.World.Width; x++ {
				occupied := false
				for _, p := range r.World.Players {
					if p.X == x && p.Y == y {
						occupied = true
						break
					}
				}
				if !occupied {
					startX, startY = x, y
					break
				}
			}
		}
	}

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
	data, _ := json.Marshal(r.World)

	for id, client := range r.Clients {
		err := client.Conn.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			client.Conn.Close()
			delete(r.Clients, id)
		}
	}
}
