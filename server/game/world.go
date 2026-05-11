package game

type Tile struct {
	Type    string `json:"type"`
	Watered bool   `json:"watered"`
	Crop    *Crop  `json:"crop"`
}

type World struct {
	Width   int                `json:"width"`
	Height  int                `json:"height"`
	Tiles   [][]*Tile          `json:"tiles"`
	Players map[string]*Player `json:"players"`
}

type FarmConfig struct {
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`
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
		Width:   w,
		Height:  h,
		Tiles:   tiles,
		Players: make(map[string]*Player),
	}
}

// InitializeFarmPlots sets farm tiles with 2-tile gaps (grid pattern)
func (w *World) InitializeFarmPlots() {
	// Farm plot area (matches client definition)
	farm := &FarmConfig{
		X:      4,
		Y:      9,
		Width:  9,
		Height: 7,
	}

	for y := farm.Y; y < farm.Y+farm.Height; y++ {
		for x := farm.X; x < farm.X+farm.Width; x++ {
			isFarmSpot := (x-farm.X)%2 == 0 && (y-farm.Y)%2 == 0
			if isFarmSpot && y >= 0 && y < w.Height && x >= 0 && x < w.Width {
				w.Tiles[y][x].Type = "farm"
			}
		}
	}
}
