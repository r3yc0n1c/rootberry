package game

import (
	"sync"

	"github.com/google/uuid"
)

type RoomManager struct {
	Rooms map[string]*Room
	Mutex sync.Mutex
}

func NewRoomManager() *RoomManager {
	return &RoomManager{
		Rooms: make(map[string]*Room),
	}
}

func (rm *RoomManager) GetOrCreateRoom() *Room {
	rm.Mutex.Lock()
	defer rm.Mutex.Unlock()

	// simple matchmaking: max 5 players per room
	for _, room := range rm.Rooms {
		if len(room.Clients) < 5 {
			return room
		}
	}

	id := uuid.New().String()
	room := NewRoom(id)
	rm.Rooms[id] = room

	go StartRoomLoop(room)

	return room
}
