package game

type Player struct {
	ID    string `json:"id"`
	X     int    `json:"x"`
	Y     int    `json:"y"`
	Money int    `json:"money"`
	Color string `json:"color"`
}
