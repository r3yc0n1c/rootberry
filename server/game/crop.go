package game

type Crop struct {
	Type      string `json:"type"`
	Growth    int    `json:"growth"`
	MaxGrowth int    `json:"maxGrowth"`
}

func NewCrop(t string) *Crop {
	return &Crop{
		Type: t,
		Growth: 0,
		MaxGrowth: 5,
	}
}
