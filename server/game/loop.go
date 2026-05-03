package game

import "time"

func StartRoomLoop(room *Room) {
	ticker := time.NewTicker(100 * time.Millisecond)

	for range ticker.C {
		room.Mutex.Lock()

		for y := 0; y < room.World.Height; y++ {
			for x := 0; x < room.World.Width; x++ {
				tile := room.World.Tiles[y][x]

				if tile.Crop != nil && tile.Watered {
					tile.Crop.Growth++
					tile.Watered = false
				}
			}
		}

		room.Mutex.Unlock()

		room.Broadcast()
	}
}
