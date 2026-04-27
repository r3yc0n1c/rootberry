package game

type Tile struct {
	Type    string `json:"type"`
	Watered bool   `json:"watered"`
	Crop    *Crop  `json:"crop"`
}

type World struct {
	Width  int
	Height int
	Tiles  [][]*Tile
	Players map[string]*Player
}

func NewWorld(w, h int) *World {
	tiles := make([][]*Tile, h)
	for y := 0; y < h; y++ {
		tiles[y] = make([]*Tile, w)
		for x := 0; x < w; x++ {
			tiles[y][x] = &Tile{Type: "grass"}
		}
	}

	return &World{
		Width: w,
		Height: h,
		Tiles: tiles,
		Players: make(map[string]*Player),
	}
}
