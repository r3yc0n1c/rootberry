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
}

func NewRoom(id string) *Room {
	return &Room{
		ID:      id,
		World:   NewWorld(20, 20),
		Clients: make(map[string]*Client),
	}
}

func (r *Room) AddClient(id string, conn *websocket.Conn) *Player {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	// Generate a random color for the player
	colors := []string{"#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080"}
	rand.Seed(time.Now().UnixNano())
	color := colors[rand.Intn(len(colors))]

	player := &Player{ID: id, X: 5, Y: 5, Color: color}
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

	data, _ := json.Marshal(r.World)

	for id, client := range r.Clients {
		err := client.Conn.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			client.Conn.Close()
			delete(r.Clients, id)
		}
	}
}
